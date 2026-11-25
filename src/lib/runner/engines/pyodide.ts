"use client";
// Python no navegador: Pyodide num Web Worker dedicado.
//
// - preload() sobe o Worker e o Pyodide uma vez (memoizado); o CodeRunner
//   espera por ele antes de abrir o prazo de 5 s.
// - Cada teste tem um kill switch: passou do limite (+ folga), a página mata o
//   Worker com terminate(). É o único jeito de parar um `while True:` sem
//   travar a aba. Logo depois sobe outro em segundo plano, a partir do cache.
// - Os pedidos são servidos um de cada vez (um Worker, uma fila).
import { MAX_OUTPUT_BYTES } from "../code-runner";
import type { Engine, EngineRequest, EngineResult, RawRun } from "../types";
import { PYODIDE_INDEX_URL } from "./pyodide-assets";
import type { PyReply, PyRequest } from "./pyodide-protocol";

/** Folga do kill switch sobre o limite medido no Worker (postMessage, GC). */
const KILL_SLACK_MS = 250;

export type EngineStatus = "idle" | "loading" | "ready" | "error";

export class PyodideEngine implements Engine {
  readonly name = "pyodide";
  private worker: Worker | null = null;
  private booting: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;
  private listeners = new Set<(s: EngineStatus) => void>();
  private stageListeners = new Set<(text: string) => void>();
  status: EngineStatus = "idle";
  /** etapa da subida, para quem chegar no meio ("iniciando o interpretador"...) */
  stage = "";

  /** Espera o que for preciso antes de subir o Worker (ex.: o Service Worker assumir a página). */
  constructor(private readonly beforeBoot: () => Promise<unknown> = async () => {}) {}

  onStatus(fn: (s: EngineStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  /** Etapas da subida e da execução, em texto. */
  onStage(fn: (text: string) => void): () => void {
    this.stageListeners.add(fn);
    return () => this.stageListeners.delete(fn);
  }

  private setStage(text: string) {
    this.stage = text;
    for (const fn of this.stageListeners) fn(text);
  }

  private setStatus(s: EngineStatus) {
    this.status = s;
    for (const fn of this.listeners) fn(s);
  }

  preload(onStage?: (text: string) => void): Promise<void> {
    if (onStage && this.status !== "ready") {
      if (this.stage) onStage(this.stage);
      const off = this.onStage(onStage);
      void this.preloadInner().finally(off).catch(() => {});
    }
    return this.preloadInner();
  }

  private preloadInner(): Promise<void> {
    if (!this.booting) {
      this.setStatus("loading");
      this.booting = this.boot().then(
        () => this.setStatus("ready"),
        (e) => {
          this.booting = null; // a próxima tentativa recomeça do zero
          this.kill();
          this.setStatus("error");
          throw e;
        },
      );
    }
    return this.booting;
  }

  private async boot() {
    this.setStage("preparando o cache");
    await this.beforeBoot().catch(() => {});
    // Arquivo estático (fora do bundler): o Pyodide exige module worker de verdade.
    const w = new Worker("/runtime/pyodide-worker.mjs", { type: "module", name: "korin-python" });
    this.worker = w;
    await new Promise<void>((resolve, reject) => {
      w.onmessage = (e: MessageEvent<PyReply>) => {
        if (e.data.type === "stage") this.setStage(e.data.text);
        else if (e.data.type === "booted") resolve();
        else if (e.data.type === "bootError") reject(new Error(`o Python não subiu: ${e.data.error}`));
      };
      w.onerror = (e) => reject(new Error(`o Python não subiu: ${e.message || "erro no Worker"}`));
      w.postMessage({ type: "boot", indexURL: PYODIDE_INDEX_URL } satisfies PyRequest);
    });
  }

  private kill() {
    this.worker?.terminate();
    this.worker = null;
  }

  /** Mata o Worker atual e já sobe outro em segundo plano. */
  private recycle() {
    this.kill();
    this.booting = null;
    void this.preload().catch(() => {});
  }

  execute(req: EngineRequest): Promise<EngineResult> {
    const job = this.queue.then(() => this.run(req));
    this.queue = job.catch(() => {});
    return job;
  }

  private async run(req: EngineRequest): Promise<EngineResult> {
    await this.preload();
    const w = this.worker!;
    const id = this.nextId++;
    const runs: (RawRun | null)[] = req.stdins.map(() => null);
    let compile = { ok: true, output: "" };
    req.onPhase?.("compiling", "compilando (checando a sintaxe)");

    return new Promise<EngineResult>((resolve, reject) => {
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      let current = -1;
      const finish = (recycle: boolean) => {
        clearTimeout(killTimer);
        req.signal.removeEventListener("abort", onAbort);
        if (recycle) this.recycle();
        resolve({ compile, runs: compile.ok ? runs : [] });
      };
      // Kill switch do teste atual: loop infinito, recursão sem fim, input() esperando para sempre.
      // O teste que estava rodando estourou (o seguintes ficam null: "não rodou").
      const markCurrent = () => {
        if (current >= 0 && !runs[current]) runs[current] = { stdout: "", stderr: "", exitCode: null, timeMs: req.timeLimitMs, timedOut: true, outputTruncated: false };
      };
      const timedOut = () => {
        markCurrent();
        finish(true);
      };
      const onAbort = () => {
        markCurrent(); // prazo global de 5 s
        finish(true);
      };
      req.signal.addEventListener("abort", onAbort, { once: true });
      if (req.signal.aborted) return onAbort();

      w.onerror = (e) => {
        clearTimeout(killTimer);
        this.recycle();
        reject(new Error(`o Worker do Python caiu: ${e.message || "erro desconhecido"}`));
      };
      w.onmessage = (e: MessageEvent<PyReply>) => {
        const m = e.data;
        if (m.type === "stage") return req.onPhase?.(m.text.startsWith("compilando") ? "compiling" : "running", m.text);
        if (!("id" in m) || m.id !== id) return;
        if (m.type === "compiled") compile = { ok: m.ok, output: m.output };
        else if (m.type === "start") {
          current = m.index;
          clearTimeout(killTimer);
          killTimer = setTimeout(timedOut, req.timeLimitMs + KILL_SLACK_MS);
        } else if (m.type === "run") {
          runs[m.index] = m.run;
          clearTimeout(killTimer);
        } else if (m.type === "done") finish(false);
        else if (m.type === "fatal") {
          clearTimeout(killTimer);
          this.recycle();
          reject(new Error(`erro interno do Python: ${m.error}`));
        }
      };
      w.postMessage({ type: "exec", id, source: req.source, stdins: req.stdins, timeLimitMs: req.timeLimitMs, maxOutputBytes: MAX_OUTPUT_BYTES } satisfies PyRequest);
    });
  }
}

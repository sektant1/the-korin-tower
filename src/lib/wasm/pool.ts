// Um worker reaproveitado para todos os testes de um lote (navegador ou Node).
//
// Antes cada teste subia um worker novo e recompilava o .wasm: num :submit com
// 20 testes eram 20 boots de isolate + 20 compilações. Agora o módulo é
// compilado uma vez, vai por postMessage (WebAssembly.Module é clonável sem
// recompilar) e o mesmo worker roda um teste depois do outro. Só no estouro de
// tempo o worker é morto, e o próximo teste sobe outro.
import type { WasiRunRequest, WasiRunResult } from "./wasi-core.mjs";
import type { ExecResult } from "@/lib/runner/types";

export type WasiReply = { ok: true; result: WasiRunResult } | { ok: false; error: string };

export interface WasiWorker {
  post(req: WasiRunRequest): void;
  terminate(): void;
}

/** Cria um worker; `onReply`/`onCrash` recebem as mensagens dele. */
export type SpawnWasiWorker = (onReply: (r: WasiReply) => void, onCrash: (message: string) => void) => WasiWorker;

/** Folga sobre o limite antes de matar o worker (o relógio de dentro só conta a execução). */
const KILL_SLACK_MS = 1500;

const failure = (signal: string, extra: Partial<ExecResult> = {}): ExecResult => ({
  stdout: "",
  stderr: "",
  exitCode: null,
  signal,
  timeMs: null,
  memoryKb: null,
  timedOut: false,
  outputTruncated: false,
  ...extra,
});

export function toExecResult(m: WasiReply, timeLimitMs: number): ExecResult {
  if (!m.ok) return failure(`executor: ${m.error}`);
  const r = m.result;
  return {
    stdout: r.stdout,
    stderr: r.stderr,
    exitCode: r.exitCode,
    signal: r.signal,
    timeMs: r.timeMs,
    memoryKb: Math.round(r.memoryBytes / 1024),
    timedOut: r.timeMs > timeLimitMs,
    outputTruncated: r.outputTruncated,
  };
}

export class WasiPool {
  private worker: WasiWorker | null = null;
  private pending: ((r: WasiReply | { crash: string }) => void) | null = null;

  constructor(
    private readonly spawn: SpawnWasiWorker,
    private readonly maxOutputBytes: number,
  ) {}

  private ensure(): WasiWorker {
    if (this.worker) return this.worker;
    // Mensagens de um worker já descartado não podem resolver o teste seguinte.
    const self = this;
    const w: WasiWorker = this.spawn(
      (r) => self.worker === w && self.pending?.(r),
      (message) => {
        if (self.worker !== w) return;
        self.worker = null;
        self.pending?.({ crash: message });
      },
    );
    this.worker = w;
    return w;
  }

  /** Um teste por vez (o juiz é sequencial). */
  run(wasm: WebAssembly.Module | Uint8Array, stdin: string, timeLimitMs: number): Promise<ExecResult> {
    const worker = this.ensure();
    return new Promise<ExecResult>((resolve) => {
      const killAt = timeLimitMs * 2 + KILL_SLACK_MS;
      const timer = setTimeout(() => {
        this.pending = null;
        this.worker = null;
        worker.terminate();
        resolve(failure("SIGKILL", { timeMs: killAt, timedOut: true }));
      }, killAt);
      this.pending = (r) => {
        clearTimeout(timer);
        this.pending = null;
        resolve("crash" in r ? failure(`worker: ${r.crash}`) : toExecResult(r, timeLimitMs));
      };
      worker.post({ wasm, stdin, maxOutputBytes: this.maxOutputBytes });
    });
  }

  /** Libera o worker (e a memória do último programa). */
  close(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending = null;
  }
}

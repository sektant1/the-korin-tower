// C, C++ e Rust no Compiler Explorer (godbolt.org): API pública, gratuita, sem
// chave, com CORS liberado (o navegador chama direto, sem passar pela Vercel) e
// execução em sandbox. Medido em nov/2026: C++ ~0,9 s; Rust 1,3–3,3 s no
// primeiro teste. Os demais testes reaproveitam a compilação do cache deles e
// saem em paralelo (8 testes de Rust em ~2,2 s no total).
//
// Limites do serviço que o motor contorna:
// - o sandbox só mata o processo em ~20 s: aqui vale o nosso limite, pelo
//   execTime medido e pelo AbortSignal do prazo global (5 s);
// - stdout cortado em ~32 KB: devolvemos `partial` e o checker confere o prefixo;
// - sem medição de memória.
import { LANGUAGES } from "@/lib/languages";
import { MAX_OUTPUT_BYTES } from "../code-runner";
import type { Engine, EngineRequest, EngineResult, Language, RawRun } from "../types";
import { encodeBatch, parseBatch, prefixBytes, wrapForBatch } from "./batch";

type Compiled = Exclude<Language, "python">;

/** Compilador e flags fixas por linguagem. Ids em https://godbolt.org/api/compilers/<lang>. */
export const CE_COMPILERS: Record<Compiled, { id: string; args: string[]; label: string }> = {
  c: { id: "cg162", args: ["-std=c17", "-O2", "-lm"], label: "gcc 16.2" },
  cpp: { id: "g162", args: ["-std=c++20", "-O2"], label: "g++ 16.2" },
  rust: { id: "r1990", args: ["--edition", "2021", "-C", "opt-level=2"], label: "rustc 1.99" },
};

/** Requisições simultâneas por lote, depois da primeira (que compila). */
const PARALLEL = 6;
/** O execTime inclui ~15 ms de spawn do processo. */
const SPAWN_SLACK_MS = 150;
export const CE_OUTPUT_LIMIT = "32 KB";
const ANSI = /\x1b\[[0-9;]*[a-zA-Z]/g;

interface CeLine {
  text: string;
}
interface CeResponse {
  code?: number;
  didExecute?: boolean;
  timedOut?: boolean;
  truncated?: boolean;
  execTime?: number | string;
  stdout?: CeLine[];
  stderr?: CeLine[];
  buildResult?: { code?: number; stdout?: CeLine[]; stderr?: CeLine[] };
}

const text = (ls: CeLine[] | undefined) => (ls ?? []).map((l) => l.text).join("\n");

function toRun(j: CeResponse, limitMs: number): RawRun {
  const t = Number(j.execTime);
  const timeMs = Number.isFinite(t) ? Math.round(t) : null;
  let stdout = text(j.stdout);
  if (j.truncated) {
    // O CE corta o stdout e mata o programa: exit code e tempo não valem.
    stdout = stdout.replace(/\n?\[Truncated\]\s*$/, "");
    const note = `[korin] saída cortada em ${CE_OUTPUT_LIMIT} pelo Compiler Explorer; só o começo foi conferido`;
    return { stdout, stderr: [text(j.stderr), note].filter(Boolean).join("\n"), exitCode: 0, timeMs, timedOut: false, outputTruncated: false, partial: true };
  }
  return {
    stdout: stdout.length > MAX_OUTPUT_BYTES ? stdout.slice(0, MAX_OUTPUT_BYTES) : stdout,
    stderr: text(j.stderr),
    exitCode: j.code ?? null,
    timeMs,
    timedOut: j.timedOut === true || (timeMs != null && timeMs > limitMs + SPAWN_SLACK_MS),
    outputTruncated: stdout.length > MAX_OUTPUT_BYTES,
  };
}

export class GodboltEngine implements Engine {
  readonly name = "godbolt";
  private readonly base: string;

  constructor(base = "https://godbolt.org") {
    this.base = base.replace(/\/+$/, "");
  }

  private async call(req: EngineRequest, stdin: string, source = req.source): Promise<CeResponse> {
    const ce = CE_COMPILERS[req.language as Compiled];
    if (!ce) throw new Error(`${LANGUAGES[req.language].label} não roda no Compiler Explorer`);
    const res = await fetch(`${this.base}/api/compiler/${ce.id}/compile`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        source,
        options: {
          userArguments: [...ce.args, ...req.flags].join(" "),
          executeParameters: { args: [], stdin },
          compilerOptions: { executorRequest: true },
          filters: { execute: true },
        },
      }),
      signal: req.signal,
    });
    if (!res.ok) throw new Error(`o Compiler Explorer respondeu HTTP ${res.status}`);
    return (await res.json()) as CeResponse;
  }

  private compileOutput(req: EngineRequest, j: CeResponse): string {
    const b = j.buildResult;
    return [text(b?.stderr), text(b?.stdout)].filter(Boolean).join("\n").replace(ANSI, "").replaceAll("<source>", LANGUAGES[req.language].file);
  }

  /**
   * Todos os testes num request: compila uma vez, o driver (batch.ts) roda cada
   * teste num processo filho e devolve o hash da saída. `null` = não deu para
   * usar o lote (Rust sem main, driver sem memfd...): cai para um por teste.
   */
  private async executeBatch(req: EngineRequest): Promise<EngineResult | null> {
    const wrapped = wrapForBatch(req.language, req.source);
    if (!wrapped) return null;
    req.onPhase?.("compiling");
    let j: CeResponse;
    try {
      j = await this.call(req, encodeBatch(req.stdins, req.timeLimitMs, MAX_OUTPUT_BYTES), wrapped);
    } catch (e) {
      if (req.signal.aborted) throw req.signal.reason ?? e;
      throw new Error(`não consegui falar com o Compiler Explorer: ${(e as Error).message}`);
    }
    const output = this.compileOutput(req, j);
    if (j.didExecute === false || (j.buildResult?.code ?? 0) !== 0) return { compile: { ok: false, output: output || "o compilador falhou sem mensagem" }, runs: [] };
    const runs = parseBatch(text(j.stdout), req.stdins.length, prefixBytes(req.stdins.length));
    return runs ? { compile: { ok: true, output }, runs } : null;
  }

  async execute(req: EngineRequest): Promise<EngineResult> {
    const r = await this.executeRaw(req);
    // Em tempo de execução o CE chama o fonte de /app/example.<ext> (panic, assert): vira main.<ext>.
    const file = LANGUAGES[req.language].file;
    for (const run of r.runs) if (run) run.stderr = run.stderr.replace(/\/app\/example\.\w+|<source>/g, file);
    return r;
  }

  private async executeRaw(req: EngineRequest): Promise<EngineResult> {
    if (req.hashOutput && req.stdins.length > 1) {
      const batch = await this.executeBatch(req);
      if (batch) return batch;
    }
    const runs: (RawRun | null)[] = req.stdins.map(() => null);
    req.onPhase?.("compiling");
    let first: CeResponse;
    try {
      // O primeiro compila e roda sozinho: se não compilar, nem gastamos o resto.
      first = await this.call(req, req.stdins[0] ?? "");
    } catch (e) {
      if (req.signal.aborted) throw req.signal.reason ?? e;
      throw new Error(`não consegui falar com o Compiler Explorer: ${(e as Error).message}`);
    }
    // "<source>:3:5: error" -> "main.c:3:5: error" (link clicável no painel).
    const compileOutput = this.compileOutput(req, first);
    if (first.didExecute === false || (first.buildResult?.code ?? 0) !== 0) {
      return { compile: { ok: false, output: compileOutput || "o compilador falhou sem mensagem" }, runs: [] };
    }
    runs[0] = toRun(first, req.timeLimitMs);
    req.onPhase?.("running");

    // Estourou o tempo no primeiro: os outros dariam o mesmo e cada um custa o prazo inteiro.
    if (!runs[0].timedOut) {
      let next = 1;
      let stop = false;
      const lane = async () => {
        while (!stop && next < req.stdins.length && !req.signal.aborted) {
          const i = next++;
          try {
            runs[i] = toRun(await this.call(req, req.stdins[i]), req.timeLimitMs);
            if (runs[i]!.timedOut) stop = true;
          } catch (e) {
            if (req.signal.aborted) return; // prazo: fica null ("não rodou")
            throw e;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL, req.stdins.length - 1) }, lane));
    }
    return { compile: { ok: true, output: compileOutput }, runs };
  }
}

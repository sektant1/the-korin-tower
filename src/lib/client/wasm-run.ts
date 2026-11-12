"use client";

// Executa um .wasm WASI (compilado no navegador por compileStdio) num Web
// Worker, com stdin em memória e limite de tempo. Um worker por lote de testes
// (ver src/lib/wasm/pool.ts): no estouro de tempo a página o mata e sobe
// outro, e a toolchain do Emception (outro worker) nem percebe.
import { WasiPool, type SpawnWasiWorker, type WasiReply } from "@/lib/wasm/pool";
import { MAX_OUTPUT_BYTES, type BatchRequest, type BatchResult, type ExecResult, type Runner } from "@/lib/runner/types";
import { compileStdio, type StdioCompileResult, type StdioLanguage } from "./emception";
import type { CanvasCompilePhase } from "./emception";

const spawnBrowser: SpawnWasiWorker = (onReply, onCrash) => {
  const worker = new Worker(new URL("../wasm/wasi.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<WasiReply>) => onReply(e.data);
  worker.onerror = (e) => onCrash(e.message);
  return { post: (req) => worker.postMessage(req), terminate: () => worker.terminate() };
};

/** Executa um .wasm uma vez (worker próprio, descartado no fim). */
export async function runWasmInBrowser(wasm: Uint8Array | WebAssembly.Module, stdin: string, timeLimitMs: number): Promise<ExecResult> {
  const pool = new WasiPool(spawnBrowser, MAX_OUTPUT_BYTES);
  try {
    return await pool.run(wasm, stdin, timeLimitMs);
  } finally {
    pool.close();
  }
}

export type BrowserPhase = CanvasCompilePhase | "running";

/** Texto do painel enquanto o navegador trabalha. */
export const PHASE_LABEL: Record<BrowserPhase, string> = {
  loading: "carregando o compilador no navegador (a 1ª vez baixa a toolchain)...",
  compiling: "compilando no navegador (clang)...",
  linking: "linkando (wasm-ld)...",
  running: "executando no navegador...",
};

/** .wasm -> base64 para ir no JSON do :submit (em pedaços: spread de 1 MB estoura a pilha). */
export function wasmToBase64(wasm: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < wasm.length; i += 0x8000) bin += String.fromCharCode(...wasm.subarray(i, i + 0x8000));
  return btoa(bin);
}

let cache: { key: string; result: StdioCompileResult; module?: Promise<WebAssembly.Module> } | null = null;

/** compileStdio com memória do último resultado: :run, :test e :submit seguidos compilam uma vez só. */
export async function compileStdioCached(opts: Parameters<typeof compileStdio>[0]): Promise<StdioCompileResult> {
  const key = JSON.stringify([opts.language, opts.flags ?? [], opts.memoryLimitMb, opts.source]);
  if (cache?.key === key) return cache.result;
  const result = await compileStdio(opts);
  // Erro de compilação também vale cache (o mesmo código daria o mesmo erro), mas não falha da toolchain.
  cache = { key, result };
  return result;
}

/** WebAssembly.Module do último binário (compilado uma vez e reaproveitado pelos testes). */
function moduleFor(result: StdioCompileResult): Promise<WebAssembly.Module> {
  if (cache?.result === result) return (cache.module ??= WebAssembly.compile(result.wasm!.slice()));
  return WebAssembly.compile(result.wasm!.slice());
}

/**
 * Runner para o `judge` rodar no navegador: compila uma vez (clang + wasm-ld no
 * Emception) e executa cada entrada num worker. Serve para :run e :test; o
 * :submit manda o mesmo .wasm ao servidor, que roda os testes ocultos.
 */
export class BrowserWasmRunner implements Runner {
  readonly name = "navegador";
  /** último binário compilado (reaproveitado pelo :submit) */
  last: StdioCompileResult | null = null;

  constructor(
    private readonly onPhase?: (phase: BrowserPhase) => void,
  ) {}

  async runBatch(req: BatchRequest): Promise<BatchResult> {
    const language = req.language as StdioLanguage;
    const compiled = await compileStdioCached({ language, source: req.source, flags: req.flags, memoryLimitMb: req.memoryLimitMb, onPhase: this.onPhase });
    this.last = compiled;
    if (!compiled.ok || !compiled.wasm) return { compile: { ok: false, output: compiled.output }, runs: [], warnings: compiled.warnings };
    this.onPhase?.("running");
    const module = await moduleFor(compiled);
    // Um worker para o lote inteiro; morre no fim e leva a memória do programa junto.
    const pool = new WasiPool(spawnBrowser, MAX_OUTPUT_BYTES);
    const runs: ExecResult[] = [];
    try {
      for (const input of req.inputs) runs.push(await pool.run(module, input, req.timeLimitMs));
    } finally {
      pool.close();
    }
    return { compile: { ok: true, output: compiled.output }, runs, warnings: compiled.warnings };
  }
}

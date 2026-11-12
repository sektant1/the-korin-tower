import path from "node:path";
import { Worker } from "node:worker_threads";
import { WasiPool, type SpawnWasiWorker } from "@/lib/wasm/pool";
import { MAX_OUTPUT_BYTES, type BatchRequest, type BatchResult, type ExecResult, type Runner } from "./types";

// Runner do :submit sem compilador no servidor: o navegador compila C/C++ para
// um .wasm WASI (Emception) e manda o binário; aqui só EXECUTAMOS, com os
// testes ocultos que nunca saem do servidor. O executor
// (src/lib/wasm/wasi-core.mjs) é o mesmo que roda no navegador.
//
// Recursos: o módulo é compilado uma vez por submit e um único worker_thread
// roda os testes em sequência (só é recriado se um teste estourar o tempo).
//
// Segurança: o binário já passou por `wasmProblem` (só imports WASI, memória
// própria com teto dentro do limite do desafio). O worker não tem acesso a
// nada além de stdin/stdout em memória; estourar o tempo mata a thread.

/** Lido do disco em tempo de execução; na Vercel entra pelo outputFileTracingIncludes. */
const WORKER_PATH = path.join(process.cwd(), "src", "lib", "wasm", "wasi-worker.node.mjs");

export const spawnNodeWasiWorker: SpawnWasiWorker = (onReply, onCrash) => {
  const worker = new Worker(WORKER_PATH, {
    // Pilha maior que o padrão (4 MB): recursão funda em C vira frames do V8, não da pilha do wasm.
    // O heap do JS fica pequeno: a memória do programa é a linear do wasm, com teto no próprio binário.
    resourceLimits: { stackSizeMb: 64, maxOldGenerationSizeMb: 64 },
    stdout: true,
    stderr: true,
  });
  worker.on("message", onReply);
  worker.once("error", (e: Error) => onCrash(e.message));
  worker.once("exit", (code) => onCrash(`saiu com código ${code}`));
  return { post: (req) => worker.postMessage(req), terminate: () => void worker.terminate() };
};

/** Runner de um binário já compilado: `source` e `flags` são ignorados. */
export class WasmModuleRunner implements Runner {
  readonly name = "wasm";
  constructor(private readonly wasm: Uint8Array) {}

  async runBatch(req: BatchRequest): Promise<BatchResult> {
    const module = await WebAssembly.compile(this.wasm.slice());
    const pool = new WasiPool(spawnNodeWasiWorker, MAX_OUTPUT_BYTES);
    const runs: ExecResult[] = [];
    try {
      for (const input of req.inputs) runs.push(await pool.run(module, input, req.timeLimitMs));
    } finally {
      pool.close();
    }
    return { compile: { ok: true, output: "" }, runs };
  }
}

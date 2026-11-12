// Tipos de wasi-core.mjs (o executor é JS puro para rodar igual no navegador e no Node).

export interface WasiRunRequest {
  /** bytes do .wasm, ou o módulo já compilado (vai por postMessage sem recompilar) */
  wasm: Uint8Array | WebAssembly.Module;
  stdin?: string | Uint8Array;
  /** Teto de stdout; passar disso encerra o programa com `outputTruncated`. Padrão 2 MB. */
  maxOutputBytes?: number;
  args?: string[];
  /** Só se o binário importar a memória (os nossos exportam a própria). Páginas de 64 KB. */
  memoryLimitPages?: number;
}

export interface WasiRunResult {
  /** null quando morreu por trap, estouro de saída ou falha do executor */
  exitCode: number | null;
  /** descrição do trap ("SIGSEGV (...)", "stack overflow (...)", "executor: ...") */
  signal: string | null;
  stdout: string;
  stderr: string;
  /** tempo só da execução (sem compilar o módulo) */
  timeMs: number;
  /** tamanho final da memória linear (ela nunca encolhe, então é o pico) */
  memoryBytes: number;
  outputTruncated: boolean;
}

export interface WasmMemoryInfo {
  min: number;
  max: number | null;
  shared: boolean;
  is64: boolean;
  imported: boolean;
}

export interface WasmInfo {
  imports: { module: string; name: string; kind: "function" | "table" | "memory" | "global" | "tag" }[];
  memories: WasmMemoryInfo[];
}

export const WASM_PAGE: number;
/** imports de `env` que o executor implementa (o resto é recusado) */
export const ENV_IMPORTS: string[];
export function runWasi(req: WasiRunRequest): Promise<WasiRunResult>;
export function inspectWasm(wasm: Uint8Array): WasmInfo;
export function wasmProblem(wasm: Uint8Array, memoryLimitMb: number): string | null;

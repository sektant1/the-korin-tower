// Versão e arquivos do Pyodide. Mudar a versão muda o nome do cache, e o cache
// antigo é apagado na próxima visita (cacheRuntime).
export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
/** Mesmo padrão que public/runtime-sw.js deriva da URL: korin-runtime-pyodide-<versão>. */
export const RUNTIME_CACHE = `korin-runtime-pyodide-${PYODIDE_VERSION}`;
export const RUNTIME_CACHE_PREFIX = "korin-runtime-";

/**
 * O que o loadPyodide baixa para subir (sem pacotes extras). `bytes` é o
 * tamanho descomprimido, que é o que o ReadableStream entrega: o
 * Content-Length do CDN vem comprimido (brotli) e não serve de total.
 */
export const PYODIDE_CORE_FILES = [
  { file: "pyodide.mjs", bytes: 17_931 },
  { file: "pyodide.asm.mjs", bytes: 1_250_344 },
  { file: "pyodide.asm.wasm", bytes: 9_598_218 },
  { file: "python_stdlib.zip", bytes: 2_545_637 },
  { file: "pyodide-lock.json", bytes: 119_077 },
] as const;

export const PYODIDE_CORE_BYTES = PYODIDE_CORE_FILES.reduce((n, f) => n + f.bytes, 0);

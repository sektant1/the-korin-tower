"use client";
// Cache persistente do runtime do Pyodide (Cache API + Service Worker).
//
// Primeira visita: `cacheRuntime` baixa o core com progresso real (bytes lidos
// do ReadableStream) e guarda tudo num cache versionado. Daí em diante, o
// public/runtime-sw.js serve esses arquivos do disco para o Worker do Pyodide.
// Sem Service Worker (navegador antigo, aba anônima restrita) tudo continua
// funcionando, só que pelo cache HTTP normal (o CDN manda max-age de 1 ano).
import { PYODIDE_CORE_BYTES, PYODIDE_CORE_FILES, PYODIDE_INDEX_URL, RUNTIME_CACHE, RUNTIME_CACHE_PREFIX } from "./engines/pyodide-assets";

export interface CacheProgress {
  loaded: number;
  total: number;
  file: string;
}

const hasCacheApi = () => typeof caches !== "undefined";

let swReady: Promise<boolean> | null = null;

/** Registra o SW e espera ele controlar a página (para o Worker já nascer controlado). */
export function registerRuntimeSW(): Promise<boolean> {
  if (swReady) return swReady;
  swReady = (async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
    try {
      await navigator.serviceWorker.register("/runtime-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return true;
      // Primeira instalação: o clients.claim() do SW dispara controllerchange.
      return await new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(false), 3000);
        navigator.serviceWorker.addEventListener("controllerchange", () => (clearTimeout(t), resolve(true)), { once: true });
      });
    } catch {
      return false;
    }
  })();
  return swReady;
}

/** Todos os arquivos do core já estão no cache desta versão? (Rápido: só consulta o disco.) */
export async function isRuntimeCached(): Promise<boolean> {
  if (!hasCacheApi()) return false;
  try {
    if (!(await caches.has(RUNTIME_CACHE))) return false;
    const cache = await caches.open(RUNTIME_CACHE);
    const hits = await Promise.all(PYODIDE_CORE_FILES.map((f) => cache.match(PYODIDE_INDEX_URL + f.file, { ignoreVary: true })));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

/** Apaga caches de versões antigas do runtime. */
async function dropOldCaches() {
  for (const name of await caches.keys()) {
    if (name.startsWith(RUNTIME_CACHE_PREFIX) && name !== RUNTIME_CACHE) await caches.delete(name);
  }
}

/** Baixa o que faltar do core para o cache, com progresso real. Idempotente. */
export async function cacheRuntime(onProgress?: (p: CacheProgress) => void, signal?: AbortSignal): Promise<void> {
  if (!hasCacheApi()) return;
  await dropOldCaches().catch(() => {});
  const cache = await caches.open(RUNTIME_CACHE);
  let loaded = 0;
  const report = (file: string) => onProgress?.({ loaded: Math.min(loaded, PYODIDE_CORE_BYTES), total: PYODIDE_CORE_BYTES, file });
  for (const f of PYODIDE_CORE_FILES) {
    const url = PYODIDE_INDEX_URL + f.file;
    if (await cache.match(url, { ignoreVary: true })) {
      loaded += f.bytes;
      report(f.file);
      continue;
    }
    const res = await fetch(url, { signal, mode: "cors" });
    if (!res.ok || !res.body) throw new Error(`${f.file}: HTTP ${res.status}`);
    const reader = res.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.byteLength;
      loaded += value.byteLength;
      report(f.file);
    }
    // Acerta a conta se o arquivo veio diferente do tamanho conhecido.
    loaded += f.bytes - got;
    const type = res.headers.get("content-type") ?? (f.file.endsWith(".wasm") ? "application/wasm" : "application/octet-stream");
    await cache.put(url, new Response(new Blob(chunks, { type }), { headers: { "content-type": type } }));
    report(f.file);
  }
}

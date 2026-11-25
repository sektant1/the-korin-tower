// Service Worker do motor de execução: cache-first para o runtime do Pyodide.
//
// Só intercepta https://cdn.jsdelivr.net/pyodide/v<versão>/...; todo o resto
// passa direto para a rede, sem respondWith. Os arquivos são versionados na
// URL, então nunca mudam: o cache se chama korin-runtime-pyodide-<versão> e o
// site apaga os caches de versões antigas (src/lib/runner/runtime-cache.ts).
// Assim o Worker do Pyodide (que também é controlado por este SW) sobe do
// disco a partir da segunda visita, sem rede.
const PYODIDE = /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v([^/]+)\//;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const m = PYODIDE.exec(req.url);
  if (!m) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(`korin-runtime-pyodide-${m[1]}`);
      const hit = await cache.match(req.url, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) await cache.put(req.url, res.clone()).catch(() => {});
      return res;
    })(),
  );
});

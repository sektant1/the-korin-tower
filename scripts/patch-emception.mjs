// Acelera o compilador do navegador (@gameguild/emception-browser) com dois
// remendos pequenos no pacote instalado. Roda no postinstall; é idempotente.
//
// Medido no Chrome (2026-11-12), por compilação:
//   1. Antes de cada clang/wasm-ld, o runner lê o binário inteiro da ferramenta
//      do IndexedDB (clang.wasm 115 MB, lld.wasm 57 MB) só para saber se ele
//      existe, e joga fora: ~8 s no link. O módulo de verdade vem de outro cache
//      ("CACHE HIT"). Trocamos por uma consulta ao manifest.
//   2. O LazyFS não tem cache em memória: os 2445 headers e as ~75 bibliotecas
//      voltam do IndexedDB a cada execução (~2,5 s). Guardamos os arquivos
//      pequenos (até 16 MB cada, 160 MB no total, LRU) na memória do worker,
//      que é descartado depois de 5 min parado (src/lib/client/emception.ts).
//
//   3. A cada boot, uma varredura de todo o IndexedDB (lendo os bytes de cada
//      arquivo) para invalidar cache velho; agora só quando o manifest muda.
//   4. Todo worker novo baixava e regravava bundles inteiros no IndexedDB;
//      agora um marcador por bundle lembra o que já foi extraído.
//   5. Uma transação do IndexedDB por arquivo lido: os pedidos do mesmo tick
//      agora vão juntos numa só.
//
// Se uma versão nova do pacote mudar esse código, o remendo só avisa: a
// compilação continua funcionando, só mais devagar.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "@gameguild", "emception-browser", "dist");
const MARK = "/* korin-patch */";

const patches = [
  {
    file: "tool-runner.js",
    find: "const wasmExists = await this.vfs.fetchFile(descriptor.modulePath);",
    replace: `${MARK} const wasmExists = this.vfs.getBundleForFile(descriptor.modulePath) || this.vfs.existsSync(descriptor.modulePath) || (await this.vfs.fetchFile(descriptor.modulePath));`,
  },
  {
    file: "vfs/lazy.js",
    find: `        if (entry.symlink) {
            const target = this.resolveSymlink(normalized, entry.symlink);
            //console.log(\`\${P} readFile: \${normalized} — symlink → \${target}\`);
            return this.readFile(target);
        }
        const idbCached = await this.idbGet(normalized);
        if (idbCached && idbCached.hash === entry.hash) {
            //console.log(\`\${P} readFile: \${normalized} — IDB CACHE HIT (\${fmtSize(idbCached.data.length)})\`);
            return idbCached.data;
        }`,
    replace: `        if (entry.symlink) {
            const target = this.resolveSymlink(normalized, entry.symlink);
            //console.log(\`\${P} readFile: \${normalized} — symlink → \${target}\`);
            return this.readFile(target);
        }
        ${MARK}
        const KORIN_MAX_FILE = 16 * 1024 * 1024, KORIN_BUDGET = 160 * 1024 * 1024;
        const mem = (this.korinMem ??= { map: new Map(), bytes: 0 });
        const hot = mem.map.get(normalized);
        if (hot) {
            mem.map.delete(normalized);
            // Quem recebeu o buffer pode tê-lo transferido (fica com 0 bytes): aí descarta.
            if (hot.byteLength === entry.size) {
                mem.map.set(normalized, hot);
                return hot;
            }
            mem.bytes -= entry.size;
        }
        const korinKeep = (data) => {
            if (!data || data.byteLength > KORIN_MAX_FILE || data.byteLength !== entry.size) return data;
            mem.map.set(normalized, data);
            mem.bytes += data.byteLength;
            for (const [k, v] of mem.map) {
                if (mem.bytes <= KORIN_BUDGET) break;
                mem.map.delete(k);
                mem.bytes -= v.byteLength;
            }
            return data;
        };
        const idbCached = await this.idbGet(normalized);
        if (idbCached && idbCached.hash === entry.hash) {
            //console.log(\`\${P} readFile: \${normalized} — IDB CACHE HIT (\${fmtSize(idbCached.data.length)})\`);
            return korinKeep(idbCached.data);
        }`,
  },
  {
    // 3. A cada boot do worker, invalidateStaleCache() varre o IndexedDB inteiro
    //    com um cursor readwrite que carrega os bytes de todo arquivo (centenas
    //    de MB) só para comparar hashes, e trava o resto do IndexedDB por
    //    segundos. Guardamos a "impressão" do manifest e só varremos quando ela muda.
    file: "vfs/lazy.js",
    find: `    async invalidateStaleCache() {
        if (!this.idb)
            return;
        const tx = this.idb.transaction('files', 'readwrite');`,
    replace: `    async invalidateStaleCache() {
        if (!this.idb)
            return;
        ${MARK}
        const korinPrint = Object.values(this.manifest.bundles).map((b) => b.hash).join(',');
        const korinSeen = await this.idbGet('__korin__/manifest');
        if (korinSeen && korinSeen.hash === korinPrint)
            return;
        this.korinPrintPending = korinPrint;
        const tx = this.idb.transaction('files', 'readwrite');`,
  },
  {
    file: "vfs/lazy.js",
    find: `            request.onerror = () => resolve();
        });
    }
    openDatabase() {`,
    replace: `            request.onerror = () => resolve();
        });
        ${MARK}
        if (this.korinPrintPending)
            await this.idbPutBatch([{ path: '__korin__/manifest', data: new Uint8Array(0), hash: this.korinPrintPending }]);
    }
    openDatabase() {`,
  },
  {
    // 4. loadBundle só lembra em memória o que já extraiu: todo worker novo baixa
    //    e regrava no IndexedDB bundles inteiros (lld 55 MB, cache-misc 57 MB...).
    //    Um marcador por bundle (com o hash) no próprio IndexedDB evita isso.
    file: "vfs/lazy.js",
    find: `        if (this.loadedBundles.has(bundleName)) {
            return;
        }
        // Coalesce concurrent requests for the same bundle`,
    replace: `        if (this.loadedBundles.has(bundleName)) {
            return;
        }
        ${MARK}
        if (!this.pendingBundles.has(bundleName)) {
            const korinMark = await this.idbGet(\`__korin__/bundle/\${bundleName}\`);
            if (korinMark && korinMark.hash === bundle.hash) {
                // A extração também criava os blob URLs das ferramentas (.wasm/.mjs/.js),
                // que o loader usa de forma síncrona: recria a partir do IndexedDB. Se
                // faltar algum arquivo, cai na extração normal.
                let korinOk = true;
                for (const f of bundle.files ?? []) {
                    if (!/\\.(wasm|mjs|js)$/.test(f) || this.blobUrls.has(f))
                        continue;
                    const rec = await this.idbGet(f);
                    if (!rec?.data) {
                        korinOk = false;
                        break;
                    }
                    this.createBlobUrl(f, rec.data);
                }
                if (korinOk) {
                    this.loadedBundles.add(bundleName);
                    return;
                }
            }
        }
        // Coalesce concurrent requests for the same bundle`,
  },
  {
    file: "vfs/lazy.js",
    find: `        this.loadedBundles.add(bundleName);
        console.log(\`\${P}   loadBundle: "\${bundleName}" extracted`,
    replace: `        this.loadedBundles.add(bundleName);
        ${MARK} await this.idbPutBatch([{ path: \`__korin__/bundle/\${bundleName}\`, data: new Uint8Array(0), hash: bundle.hash }]);
        console.log(\`\${P}   loadBundle: "\${bundleName}" extracted`,
  },
  {
    // 4b. As ferramentas (clang.wasm, lld.wasm, glue .mjs) carregam por blob URL,
    //     que só nascia durante a extração do bundle. Com o marcador (4) a
    //     extração é pulada: criamos o blob a partir do IndexedDB, uma vez por worker.
    file: "vfs/lazy.js",
    find: `        if (entry.bundle) {
            await this.loadBundle(entry.bundle);
        }
        return this.getUrl(path);`,
    replace: `        if (entry.bundle) {
            await this.loadBundle(entry.bundle);
        }
        ${MARK}
        if (!this.blobUrls.has(normalized) && /\\.(wasm|mjs|js)$/.test(normalized)) {
            const korinData = await this.readFile(normalized);
            if (korinData)
                this.createBlobUrl(normalized, korinData);
        }
        return this.getUrl(path);`,
  },
  {
    // 5. Cada idbGet abria a sua própria transação: os 2445 headers que o clang
    //    pré-aquece levavam ~4,5 s num worker novo. Juntamos todos os pedidos do
    //    mesmo tick numa transação só.
    file: "vfs/lazy.js",
    find: `    async idbGet(path) {
        if (!this.idb)
            return null;
        return new Promise((resolve) => {
            const tx = this.idb.transaction('files', 'readonly');
            const request = tx.objectStore('files').get(path);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => resolve(null);
        });
    }`,
    replace: `    async idbGet(path) {
        if (!this.idb)
            return null;
        ${MARK}
        return new Promise((resolve) => {
            const queue = (this.korinGets ??= []);
            queue.push({ path, resolve });
            if (queue.length > 1)
                return;
            queueMicrotask(() => {
                const batch = this.korinGets;
                this.korinGets = [];
                let tx;
                try {
                    tx = this.idb.transaction('files', 'readonly');
                }
                catch {
                    for (const item of batch)
                        item.resolve(null);
                    return;
                }
                const store = tx.objectStore('files');
                for (const item of batch) {
                    const request = store.get(item.path);
                    request.onsuccess = () => item.resolve(request.result ?? null);
                    request.onerror = () => item.resolve(null);
                }
            });
        });
    }`,
  },
];

if (!existsSync(dist)) {
  console.log("[patch-emception] pacote não instalado; nada a fazer");
  process.exit(0);
}
for (const p of patches) {
  const path = join(dist, p.file);
  const src = readFileSync(path, "utf8");
  if (src.includes(p.replace)) continue; // já remendado
  if (!src.includes(p.find)) {
    console.warn(`[patch-emception] AVISO: ${p.file} mudou nesta versão; remendo não aplicado (compila, mas mais devagar)`);
    continue;
  }
  writeFileSync(path, src.replace(p.find, p.replace));
  console.log(`[patch-emception] ${p.file} remendado`);
}

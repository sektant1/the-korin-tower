// Serviço HTTP do construtor WASM (Fase 4). POST /build { language, source } -> { ok, output, js? }
//
// Compila código de usuário, mas NÃO o executa: quem roda o resultado é o navegador de quem
// escreveu, num iframe isolado. Ainda assim, trate como o Piston: só na rede interna, ou atrás
// de um proxy que exija token. Este processo não guarda segredo nenhum de propósito
// (o compilador consegue ler arquivos do container via #include).
import { createServer } from "node:http";
import { build, MAX_SOURCE } from "./build.mjs";

const PORT = Number(process.env.PORT) || 2100;
const MAX_PARALLEL = Number(process.env.BUILD_MAX_CONCURRENCY) || 2;
const MAX_QUEUE = 8;
const MAX_BODY = MAX_SOURCE * 4 + 1024; // JSON pode escapar cada caractere

let active = 0;
const queue = [];

async function limited(fn) {
  if (active >= MAX_PARALLEL) {
    if (queue.length >= MAX_QUEUE) return null;
    await new Promise((r) => queue.push(r));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(json) });
  res.end(json);
}

createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true, active, queued: queue.length });
  if (req.method !== "POST" || req.url !== "/build") return send(res, 404, { ok: false, output: "use POST /build" });

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) return send(res, 413, { ok: false, output: "pedido grande demais" });
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return send(res, 400, { ok: false, output: "JSON inválido" });
  }
  try {
    const result = await limited(() => build(body));
    if (!result) return send(res, 503, { ok: false, output: "construtor ocupado; tente de novo em instantes" });
    send(res, 200, result);
  } catch (e) {
    console.error("[build]", e);
    send(res, 500, { ok: false, output: "erro interno do construtor" });
  }
}).listen(PORT, () => console.log(`wasm-builder ouvindo na porta ${PORT}`));

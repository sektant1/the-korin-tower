// Worker thread do Node que roda .wasm WASI (ver wasi-core.mjs). Fica vivo
// entre os testes de um :submit e recebe o módulo já compilado em cada
// mensagem; quem cria o worker (src/lib/runner/wasm.ts) mata a thread no
// estouro de tempo, então aqui não há timeout. Este arquivo é lido do disco em
// tempo de execução; na Vercel entra pelo outputFileTracingIncludes.
import { parentPort } from "node:worker_threads";
import { runWasi } from "./wasi-core.mjs";

parentPort.on("message", (req) => {
  runWasi(req).then(
    (result) => parentPort.postMessage({ ok: true, result }),
    (e) => parentPort.postMessage({ ok: false, error: e instanceof Error ? e.message : String(e) }),
  );
});

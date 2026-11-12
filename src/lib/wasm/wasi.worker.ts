// Web Worker que roda .wasm WASI no navegador (:run e :test dos desafios stdio
// em C/C++). Fica vivo entre os testes de um lote e recebe o módulo já
// compilado; a página o mata (e sobe outro) no estouro de tempo.
import { runWasi, type WasiRunRequest } from "./wasi-core.mjs";

self.onmessage = (e: MessageEvent<WasiRunRequest>) => {
  runWasi(e.data).then(
    (result) => self.postMessage({ ok: true, result }),
    (err: unknown) => self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) }),
  );
};

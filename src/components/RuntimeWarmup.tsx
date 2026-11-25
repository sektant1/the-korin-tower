"use client";
// Primeira visita: baixa o runtime do Python (Pyodide) para o cache do navegador.
//
// - Cache já cheio: nada aparece; a checagem só consulta o disco.
// - Cache vazio: overlay "loading" com o medidor de Ki (progresso real, em
//   bytes) e um botão para seguir navegando enquanto o download termina.
// - Só no cliente e depois da hidratação (requestIdleCallback): o HTML do SSR
//   continua igual para SEO, e robôs e "economia de dados" nem baixam.
// C, C++ e Rust não têm o que baixar (rodam no Compiler Explorer).
import { useEffect, useState } from "react";
import { onWarmup, startWarmup, type WarmupState } from "@/lib/runner/browser";
import { GIFS } from "@/lib/gifs";
import { Gif } from "./Gif";

const DISMISSED = "korin:warmup-dismissed";

/** O que cada arquivo do core é, para a etapa do overlay. */
const STAGE: Record<string, string> = {
  "pyodide.mjs": "carregador do Python",
  "pyodide.asm.mjs": "runtime do Python",
  "pyodide.asm.wasm": "interpretador Python (WebAssembly)",
  "python_stdlib.zip": "biblioteca padrão do Python",
  "pyodide-lock.json": "índice de pacotes",
};
const mb = (b: number) => (b / 1024 / 1024).toFixed(1);
const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview/i;

function shouldWarm(): boolean {
  if (BOT.test(navigator.userAgent) || navigator.webdriver) return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !c?.saveData;
}

export function RuntimeWarmup() {
  const [state, setState] = useState<WarmupState>({ phase: "checking" });
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!shouldWarm()) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED) === "1";
    } catch {}
    setHidden(dismissed);
    const off = onWarmup(setState);
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 800));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const h = idle(() => void startWarmup(), { timeout: 2000 });
    return () => {
      off();
      cancel(h);
    };
  }, []);

  if (hidden || state.phase !== "downloading") return null;
  const { loaded, total, file } = state.progress;
  const pct = Math.round((loaded / total) * 100);
  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISSED, "1");
    } catch {}
  };

  return (
    <div className="warmup-backdrop" role="presentation">
      <div className="window98 warmup" role="dialog" aria-modal="false" aria-labelledby="warmup-title">
        <h2 className="title-bar" id="warmup-title">
          loading
        </h2>
        <div className="window-body warmup-body">
          <Gif gif={GIFS.powerUp} height={96} />
          <div className="ki-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="loading">
            <div className="ki-fill" style={{ width: `${pct}%` }} />
            <span className="ki-pct">{pct}%</span>
          </div>
          <p className="warmup-stage" aria-live="polite">
            baixando {STAGE[file] ?? file}
            <br />
            <span className="out-dim">
              {mb(loaded)} de {mb(total)} MB · só na primeira visita; depois carrega do disco
            </span>
          </p>
          <button type="button" className="btn98 small warmup-skip" onClick={dismiss}>
            Continuar em segundo plano ►
          </button>
        </div>
      </div>
    </div>
  );
}

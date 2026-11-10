"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Roda o JS gerado pelo emcc (WASM embutido) num iframe com sandbox="allow-scripts":
// origem opaca, sem cookies nem acesso ao DOM do site. O programa é do próprio jogador,
// mas o iframe garante que um laço infinito ou um bug não derruba o editor ao lado.

interface Props {
  /** saída do emcc (-sSINGLE_FILE); null = nada compilado ainda */
  js: string | null;
  /** muda a cada execução, para reiniciar mesmo com o JS igual */
  version: number;
}

const MAX_LINES = 300;

// Dentro de <script>, "</script" fecharia a tag e "<!--" muda o modo do parser.
const inlineSafe = (js: string) => js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

function page(js: string, token: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
canvas{display:block;margin:auto;max-width:100%;max-height:100%;image-rendering:pixelated;outline:none}
</style></head><body><canvas id="canvas" tabindex="0" oncontextmenu="event.preventDefault()"></canvas>
<script>
var say=function(kind,text){parent.postMessage({korin:${JSON.stringify(token)},kind:kind,text:String(text)},"*")};
var Module={canvas:document.getElementById("canvas"),
print:function(t){say("out",t)},printErr:function(t){say("err",t)},
onExit:function(c){say("exit",c)},onAbort:function(w){say("err","abortado: "+w)}};
window.onerror=function(m){say("err",m)};
window.onunhandledrejection=function(e){say("err",e.reason)};
Module.canvas.addEventListener("click",function(){Module.canvas.focus()});
</script><script>${inlineSafe(js)}</script></body></html>`;
}

export function WasmCanvas({ js, version }: Props) {
  const [lines, setLines] = useState<{ kind: string; text: string }[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  // O token separa as mensagens desta execução das de uma anterior ainda fechando.
  const token = useMemo(() => `${version}-${Math.random().toString(36).slice(2)}`, [version]);
  const srcDoc = useMemo(() => (js ? page(js, token) : null), [js, token]);

  useEffect(() => {
    setLines([]);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.korin !== token) return;
      const { kind, text } = e.data as { kind: string; text: string };
      setLines((l) => [...l.slice(-MAX_LINES + 1), kind === "exit" ? { kind: "exit", text: `programa terminou (exit ${text})` } : { kind, text }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [token]);

  return (
    <div className="shader-box wasm-box">
      {srcDoc ? (
        <iframe
          key={token}
          ref={frame}
          className="shader-canvas wasm-frame"
          sandbox="allow-scripts allow-pointer-lock"
          srcDoc={srcDoc}
          title="Programa em execução (clique para dar foco ao teclado)"
        />
      ) : (
        <div className="shader-canvas wasm-idle">
          <p>
            INSERT COIN
            <br />
            <small>:run compila e roda aqui</small>
          </p>
        </div>
      )}
      {srcDoc && <p className="dim small wasm-tip">Clique no canvas para ele receber o teclado. Executar de novo reinicia o programa.</p>}
      {lines.length > 0 && (
        <div className="crt" aria-live="polite">
          <div className="crt-inner">
            <pre className="out-pre">
              {lines.map((l, i) => (
                <span key={i} className={l.kind === "err" ? "out-err" : l.kind === "exit" ? "out-note" : undefined}>
                  {l.text}
                  {"\n"}
                </span>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

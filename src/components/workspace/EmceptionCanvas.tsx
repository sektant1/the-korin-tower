"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasLanguage } from "@/lib/languages";
import { compileCanvas, startCanvas, type CanvasCompilePhase } from "@/lib/client/emception";

// Compila no navegador (Emception + clang/wasm-ld num Worker) e desenha o
// resultado no canvas. O servidor não participa: em produção a toolchain vem
// do manifest.json versionado, com cache no IndexedDB do navegador.

interface Props {
  source: string;
  language: CanvasLanguage;
  /** muda a cada :run; 0 = nada compilado ainda */
  version: number;
  /** resultado do clang/wasm-ld para o painel de saída (avisos e erros) */
  onCompile: (result: { ok: boolean; output: string }) => void;
  /**
   * :test/:submit: quando `capture` for igual a `version`, o programa roda e
   * dois frames do canvas (em CAPTURE_AT_MS) voltam como PPM P3 128x128.
   * `null` = o programa não chegou a rodar (a mensagem vem junto).
   */
  capture?: number;
  onFrames?: (frames: string[] | null, error?: string) => void;
}

/** Quando fotografar o canvas depois que o programa começa (ms). */
export const CAPTURE_AT_MS = [1000, 3000];
const CAPTURE_SIZE = 128;

/** Reduz o canvas para 128x128 e devolve PPM P3 (o formato que o servidor confere). */
function canvasPpm(canvas: HTMLCanvasElement): string {
  const small = document.createElement("canvas");
  small.width = CAPTURE_SIZE;
  small.height = CAPTURE_SIZE;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("sem canvas 2D para capturar o frame");
  ctx.drawImage(canvas, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
  const px = ctx.getImageData(0, 0, CAPTURE_SIZE, CAPTURE_SIZE).data;
  const lines = ["P3", `${CAPTURE_SIZE} ${CAPTURE_SIZE}`, "255"];
  for (let i = 0; i < px.length; i += 4) lines.push(`${px[i]} ${px[i + 1]} ${px[i + 2]}`);
  return lines.join("\n") + "\n";
}

/**
 * Sem preserveDrawingBuffer, o WebGL limpa o buffer depois de cada composição
 * e o drawImage fora do rAF lê preto. Forçamos a opção só neste canvas.
 */
function preserveDrawing(canvas: HTMLCanvasElement) {
  if ((canvas as { __korinPreserve?: boolean }).__korinPreserve) return;
  const original = canvas.getContext.bind(canvas) as (type: string, attrs?: Record<string, unknown>) => RenderingContext | null;
  (canvas as unknown as { getContext: typeof original }).getContext = (type, attrs) =>
    original(type, type.startsWith("webgl") || type === "experimental-webgl" ? { ...attrs, preserveDrawingBuffer: true } : attrs);
  (canvas as { __korinPreserve?: boolean }).__korinPreserve = true;
}

type Phase = "idle" | CanvasCompilePhase | "running" | "error";
const MAX_LINES = 300;

const PHASE_LABEL: Record<Exclude<Phase, "idle" | "running" | "error">, string> = {
  loading: "carregando a toolchain no navegador (o primeiro run baixa os bundles)...",
  compiling: "compilando com clang...",
  linking: "ligando com wasm-ld...",
};

export function EmceptionCanvas({ source, language, version, onCompile, capture, onFrames }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<{ stop(): void } | null>(null);
  const runRef = useRef(0);
  const sourceRef = useRef(source);
  const languageRef = useRef(language);
  const onCompileRef = useRef(onCompile);
  const captureRef = useRef(capture);
  const onFramesRef = useRef(onFrames);
  const [lines, setLines] = useState<{ kind: string; text: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  sourceRef.current = source;
  languageRef.current = language;
  onCompileRef.current = onCompile;
  captureRef.current = capture;
  onFramesRef.current = onFrames;

  const append = useCallback((kind: string, text: string) => {
    setLines((l) => [...l.slice(-MAX_LINES + 1), { kind, text }]);
  }, []);

  useEffect(() => {
    if (version === 0) return;
    const run = ++runRef.current;
    let cancelled = false;
    const capturing = captureRef.current === version;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let reported = false;
    const framesDone = (frames: string[] | null, err?: string) => {
      if (!capturing || reported) return;
      reported = true;
      onFramesRef.current?.(frames, err);
    };
    sessionRef.current?.stop();
    sessionRef.current = null;
    setLines([]);
    setError(null);
    setPhase("loading");

    void (async () => {
      try {
        const result = await compileCanvas({
          source: sourceRef.current,
          language: languageRef.current,
          onPhase: (p) => {
            if (!cancelled && run === runRef.current) setPhase(p);
          },
        });
        if (cancelled || run !== runRef.current) return;
        onCompileRef.current({ ok: result.ok, output: result.output });
        if (!result.ok || !result.artifact) {
          setError(result.output || "falha na compilação");
          setPhase("error");
          framesDone(null, "não compilou");
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("canvas não encontrado na página");
        preserveDrawing(canvas);
        setPhase("running");
        const session = await startCanvas(result.artifact, canvas, {
          onStdout: (text) => {
            if (!cancelled && run === runRef.current) append("out", text);
          },
          onStderr: (text) => {
            if (!cancelled && run === runRef.current) append("err", text);
          },
        });
        if (cancelled || run !== runRef.current) {
          session.stop();
          return;
        }
        sessionRef.current = session;
        if (capturing) {
          const frames: string[] = [];
          for (const at of CAPTURE_AT_MS) {
            timers.push(
              setTimeout(() => {
                if (cancelled || run !== runRef.current) return;
                try {
                  frames.push(canvasPpm(canvas));
                } catch (e) {
                  return framesDone(null, (e as Error).message);
                }
                if (frames.length === CAPTURE_AT_MS.length) framesDone(frames);
              }, at),
            );
          }
        }
      } catch (e) {
        if (cancelled || run !== runRef.current) return;
        setError((e as Error).message);
        setPhase("error");
        framesDone(null, (e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      framesDone(null, "interrompido por outra execução");
    };
  }, [append, version]);

  // Ao desmontar (troca de página), encerra o programa e o loop de animação.
  useEffect(
    () => () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    },
    [],
  );

  return (
    <div className="shader-box wasm-box">
      <div className="wasm-stage">
        <canvas
          ref={canvasRef}
          // raylib/GLFW do Emscripten acham o canvas por "#" + id: sem id viraria o seletor "#", inválido.
          id="canvas"
          className="shader-canvas wasm-frame"
          tabIndex={0}
          onClick={(e) => e.currentTarget.focus()}
          onContextMenu={(e) => e.preventDefault()}
          title="Clique para dar foco ao teclado"
        />
        {phase !== "running" && (
          <div className="wasm-overlay">
            {phase === "idle" && (
              <p>
                NADA COMPILADO
                <br />
                <small>:run compila e roda aqui, no seu navegador</small>
              </p>
            )}
            {(phase === "loading" || phase === "compiling" || phase === "linking") && <p>{PHASE_LABEL[phase]}</p>}
            {phase === "error" && (
              <p>
                NÃO RODOU
                <br />
                <small>{error}</small>
              </p>
            )}
          </div>
        )}
      </div>
      {phase === "running" && (
        <p className="dim small wasm-tip">Clique no canvas para usar o teclado. Executar de novo reinicia o programa.</p>
      )}
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

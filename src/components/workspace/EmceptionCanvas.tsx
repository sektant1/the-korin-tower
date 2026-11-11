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
}

type Phase = "idle" | CanvasCompilePhase | "running" | "error";
const MAX_LINES = 300;

const PHASE_LABEL: Record<Exclude<Phase, "idle" | "running" | "error">, string> = {
  loading: "carregando a toolchain no navegador (o primeiro run baixa os bundles)...",
  compiling: "compilando com clang...",
  linking: "ligando com wasm-ld...",
};

export function EmceptionCanvas({ source, language, version, onCompile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<{ stop(): void } | null>(null);
  const runRef = useRef(0);
  const sourceRef = useRef(source);
  const languageRef = useRef(language);
  const onCompileRef = useRef(onCompile);
  const [lines, setLines] = useState<{ kind: string; text: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  sourceRef.current = source;
  languageRef.current = language;
  onCompileRef.current = onCompile;

  const append = useCallback((kind: string, text: string) => {
    setLines((l) => [...l.slice(-MAX_LINES + 1), { kind, text }]);
  }, []);

  useEffect(() => {
    if (version === 0) return;
    const run = ++runRef.current;
    let cancelled = false;
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
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("canvas não encontrado na página");
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
      } catch (e) {
        if (cancelled || run !== runRef.current) return;
        setError((e as Error).message);
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
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

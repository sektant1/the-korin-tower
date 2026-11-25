"use client";
// O CodeRunner do navegador (um por aba) e o preload em segundo plano.
//
//   python         -> PyodideEngine (Web Worker, cache no Service Worker)
//   c / cpp / rust -> GodboltEngine (fetch direto para godbolt.org)
import { useEffect, useState } from "react";
import { createCodeRunner } from "./code-runner";
import { CE_COMPILERS, GodboltEngine } from "./engines/godbolt";
import { PyodideEngine, type EngineStatus } from "./engines/pyodide";
import { cacheRuntime, isRuntimeCached, registerRuntimeSW, type CacheProgress } from "./runtime-cache";
import type { CodeRunner, Language } from "./types";

let python: PyodideEngine | null = null;
let runner: CodeRunner | null = null;

function pythonEngine(): PyodideEngine {
  // O Worker só nasce depois que o SW assume a página: assim os arquivos do
  // Pyodide passam pelo cache-first dele já na primeira vez.
  python ??= new PyodideEngine(() => registerRuntimeSW());
  return python;
}

export function getBrowserRunner(): CodeRunner {
  runner ??= createCodeRunner({
    c: new GodboltEngine(),
    cpp: new GodboltEngine(),
    rust: new GodboltEngine(),
    python: pythonEngine(),
  });
  return runner;
}

/**
 * Aquece os motores de uma página com editor. A linguagem selecionada sobe já;
 * as outras do desafio, quando o navegador ficar ocioso.
 */
export function preloadLanguages(selected: Language, others: readonly Language[] = []): () => void {
  if (typeof window === "undefined") return () => {};
  const r = getBrowserRunner();
  // C/C++/Rust não têm o que baixar: o <link rel="preconnect"> do layout já abriu a conexão com o godbolt.org.
  r.preload(selected);
  if (!others.includes("python") || selected === "python") return () => {};
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
  const cancel = window.cancelIdleCallback ?? window.clearTimeout;
  const h = idle(() => r.preload("python"), { timeout: 4000 });
  return () => cancel(h);
}

/** Status do motor, para o indicador do editor ("loading" / pronto). */
export function useEngineStatus(language: Language): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>(language === "python" ? "idle" : "ready");
  useEffect(() => {
    if (language !== "python") {
      setStatus("ready");
      return;
    }
    return pythonEngine().onStatus(setStatus);
  }, [language]);
  return status;
}

/** Etapa atual da subida do motor ("iniciando o interpretador"...), "" se não está subindo. */
export function useEngineStage(language: Language): string {
  const [stage, setStage] = useState("");
  useEffect(() => {
    if (language !== "python") {
      setStage("");
      return;
    }
    const e = pythonEngine();
    setStage(e.stage);
    return e.onStage(setStage);
  }, [language]);
  return stage;
}

/** Como o painel descreve o motor de cada linguagem enquanto trabalha. */
export function engineLabel(language: Language): string {
  if (language === "python") return "Python (Pyodide, no seu navegador)";
  return `${CE_COMPILERS[language].label} no Compiler Explorer`;
}

// ---- primeira visita ---------------------------------------------------------

export type WarmupState =
  | { phase: "checking" }
  | { phase: "cached" }
  | { phase: "downloading"; progress: CacheProgress }
  | { phase: "done" }
  | { phase: "failed"; error: string };

let warmup: Promise<void> | null = null;
const warmupListeners = new Set<(s: WarmupState) => void>();
let warmupState: WarmupState = { phase: "checking" };

function setWarmup(s: WarmupState) {
  warmupState = s;
  for (const fn of warmupListeners) fn(s);
}

/**
 * Confere o cache e, se faltar algo, baixa o runtime com progresso. Só baixa:
 * subir o Worker (dezenas de MB de RAM) fica para as páginas com editor
 * (preloadLanguage). Roda uma vez por aba; nunca rejeita.
 */
export function startWarmup(): Promise<void> {
  warmup ??= (async () => {
    try {
      await registerRuntimeSW();
      if (await isRuntimeCached()) {
        setWarmup({ phase: "cached" });
      } else {
        await cacheRuntime((progress) => setWarmup({ phase: "downloading", progress }));
        setWarmup({ phase: "done" });
      }
    } catch (e) {
      setWarmup({ phase: "failed", error: (e as Error).message });
    }
  })();
  return warmup;
}

export function onWarmup(fn: (s: WarmupState) => void): () => void {
  warmupListeners.add(fn);
  fn(warmupState);
  return () => warmupListeners.delete(fn);
}

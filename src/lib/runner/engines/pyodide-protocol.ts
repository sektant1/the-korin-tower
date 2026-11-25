// Mensagens entre a página e o Worker do Pyodide (public/runtime/pyodide-worker.mjs).
import type { RawRun } from "../types";

export type PyRequest =
  | { type: "boot"; indexURL: string }
  | { type: "exec"; id: number; source: string; stdins: string[]; timeLimitMs: number; maxOutputBytes: number };

export type PyReply =
  | { type: "booted"; ms: number }
  /** etapa atual, para o painel ("iniciando o interpretador", "rodando o teste 2 de 7"...) */
  | { type: "stage"; text: string }
  | { type: "bootError"; error: string }
  | { type: "compiled"; id: number; ok: boolean; output: string }
  | { type: "start"; id: number; index: number }
  | { type: "run"; id: number; index: number; run: RawRun }
  | { type: "done"; id: number }
  | { type: "fatal"; id: number; error: string };

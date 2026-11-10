import type { LanguageId } from "@/lib/languages";

export interface BatchRequest {
  language: LanguageId;
  source: string;
  /** Um stdin por execução. O código é compilado uma vez (quando o backend permite). */
  inputs: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  /** Flags extras de compilação (já validadas por `sanitizeFlags`). */
  flags: string[];
}

export interface CompileResult {
  ok: boolean;
  output: string; // stdout + stderr do compilador
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timeMs: number | null;
  memoryKb: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
}

export interface BatchResult {
  compile: CompileResult;
  /** Vazio se a compilação falhou. */
  runs: ExecResult[];
}

export interface Runner {
  readonly name: string;
  runBatch(req: BatchRequest): Promise<BatchResult>;
}

export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

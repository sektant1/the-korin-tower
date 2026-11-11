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
  /**
   * O runner só capturou o começo da saída (limite dele, não do programa: o
   * Compiler Explorer corta em ~32 KB e mata o processo). O judge confere só
   * o prefixo em vez de dar OLE.
   */
  partial?: boolean;
}

export interface BatchResult {
  compile: CompileResult;
  /** Vazio se a compilação falhou. */
  runs: ExecResult[];
  /** Avisos para o usuário (ex.: caiu para o runner reserva). */
  warnings?: string[];
}

export interface Runner {
  readonly name: string;
  runBatch(req: BatchRequest): Promise<BatchResult>;
}

export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

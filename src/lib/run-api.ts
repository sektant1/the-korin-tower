// Formato de resposta de POST /api/run, compartilhado entre servidor e cliente.
import type { TestOutcome } from "@/lib/judge/judge";
import type { CompileResult } from "@/lib/runner/types";

export type RunResponse =
  | { mode: "run"; compile: CompileResult; run: TestOutcome | null; warnings: string[] }
  | {
      mode: "test" | "submit";
      compile: CompileResult;
      tests: TestOutcome[];
      allPassed: boolean;
      warnings: string[];
      /** submit aprovado: pontos ganhos agora (0 = já resolvido ou desistiu antes); ausente sem login */
      awarded?: number;
    };

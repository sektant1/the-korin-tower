// Formato de resposta de POST /api/run (e do motor no navegador), compartilhado entre servidor e cliente.
import type { CompileResult, TestOutcome } from "@/lib/runner/types";

export type RunResponse =
  | { mode: "run"; compile: CompileResult; run: TestOutcome | null; warnings: string[]; wallMs?: number }
  | {
      mode: "test" | "submit";
      compile: CompileResult;
      tests: TestOutcome[];
      allPassed: boolean;
      warnings: string[];
      /** tempo de parede de compilar e rodar tudo */
      wallMs?: number;
      /** submit aprovado: pontos ganhos agora (0 = já resolvido ou desistiu antes); ausente sem login */
      awarded?: number;
    };

/** Quanto de cada campo (entrada, esperado, stdout, stderr) vai para o painel. */
export const DISPLAY_BYTES = 8 * 1024;

function clip(s: string): string {
  return s.length > DISPLAY_BYTES ? `${s.slice(0, DISPLAY_BYTES)}\n… (cortado: ${Math.round(s.length / 1024)} KB no total)` : s;
}

/**
 * Prepara um resultado para o painel. Testes ocultos também mostram entrada e
 * saídas (só rodam no :submit, mas não são segredo); tudo cortado em
 * DISPLAY_BYTES para a resposta não carregar MBs de entrada de volta.
 */
export function forDisplay(t: TestOutcome): TestOutcome {
  return { ...t, input: clip(t.input), expected: clip(t.expected), stdout: clip(t.stdout), stderr: clip(t.stderr) };
}

import type { Checker, LanguageId } from "@/lib/languages";
import type { CompileResult, Runner } from "@/lib/runner";
import { check } from "./checker";
import { outputSha256 } from "./hash";

export type Verdict = "AC" | "WA" | "TLE" | "RE" | "OLE";

export interface JudgeTest {
  name: string;
  input: string;
  expected: string;
  hidden: boolean;
  /**
   * Teste oculto julgado no navegador: em vez de `expected` (vazio), vem o
   * SHA-256 da saída esperada normalizada. Só vale para o checker exact.
   */
  expectedSha256?: string;
}

export interface TestOutcome {
  name: string;
  hidden: boolean;
  verdict: Verdict;
  message?: string;
  timeMs: number | null;
  memoryKb: number | null;
  exitCode: number | null;
  input: string;
  expected: string;
  stdout: string;
  stderr: string;
}

export interface JudgeResult {
  compile: CompileResult;
  tests: TestOutcome[];
  allPassed: boolean;
  /** Avisos do runner (ex.: caiu para o reserva). */
  warnings: string[];
}

export interface JudgeLimits {
  checker: Checker;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export async function judge(
  runner: Runner,
  limits: JudgeLimits,
  language: LanguageId,
  source: string,
  tests: JudgeTest[],
  flags: string[] = [],
): Promise<JudgeResult> {
  const batch = await runner.runBatch({
    language,
    source,
    inputs: tests.map((t) => t.input),
    timeLimitMs: limits.timeLimitMs,
    memoryLimitMb: limits.memoryLimitMb,
    flags,
  });
  const warnings = batch.warnings ?? [];
  if (!batch.compile.ok) return { compile: batch.compile, tests: [], allPassed: false, warnings };

  const outcomes = tests.map((t, i): TestOutcome => {
    const r = batch.runs[i];
    let verdict: Verdict;
    let message: string | undefined;
    if (r.timedOut) {
      verdict = "TLE";
      message = `passou de ${limits.timeLimitMs} ms`;
    } else if (r.outputTruncated) {
      verdict = "OLE";
      message = "saída grande demais";
    } else if (r.exitCode !== 0) {
      verdict = "RE";
      message = r.signal ? `morto por ${r.signal}` : `exit code ${r.exitCode}`;
    } else {
      const c = check(limits.checker, t.expected, r.stdout, { partial: r.partial });
      verdict = c.passed ? "AC" : "WA";
      message = c.message;
    }
    return {
      name: t.name,
      hidden: t.hidden,
      verdict,
      message,
      timeMs: r.timeMs,
      memoryKb: r.memoryKb,
      exitCode: r.exitCode,
      input: t.input,
      expected: t.expected,
      stdout: r.stdout,
      stderr: r.stderr,
    };
  });
  // Testes com hash: a execução foi limpa (AC/WA vieram da comparação com ""), então refaz a comparação pelo hash.
  await Promise.all(
    tests.map(async (t, i) => {
      const o = outcomes[i];
      if (!t.expectedSha256 || (o.verdict !== "AC" && o.verdict !== "WA")) return;
      const ok = (await outputSha256(o.stdout)) === t.expectedSha256;
      o.verdict = ok ? "AC" : "WA";
      o.message = ok ? undefined : "saída diferente da esperada";
    }),
  );
  return { compile: batch.compile, tests: outcomes, allPassed: outcomes.every((o) => o.verdict === "AC"), warnings };
}

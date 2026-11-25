// CodeRunner: a única porta de entrada para compilar, rodar e julgar código.
// Não sabe COMO cada linguagem roda (isso é do Engine); sabe montar o programa
// (código + harness dos testes unitários), impor o prazo global e dar o veredito.
import { check } from "@/lib/judge/checker";
import { outputSha256 } from "@/lib/judge/hash";
import { LANGUAGES, type Checker } from "@/lib/languages";
import type {
  CodeRunner,
  Engine,
  EngineResult,
  ExecutionResult,
  IoTestCase,
  Language,
  RawRun,
  RunOptions,
  TestCase,
  TestOutcome,
  UnitTestCase,
  Verdict,
} from "./types";

/** Teto de parede de um runAndTest inteiro: compilar + todos os testes. */
export const DEADLINE_MS = 5000;
/** Saída máxima por execução; passou disso é OLE. */
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const DEFAULT_TIME_LIMIT_MS = 2000;
/**
 * Multiplicador do limite por teste. Os limites dos desafios foram calibrados
 * em C; Python interpretado (e no WASM) é bem mais lento. Juízes como o
 * Codeforces usam algo parecido.
 */
export const TIME_FACTOR: Record<Language, number> = { c: 1, cpp: 1, rust: 1, python: 3 };

export class DeadlineError extends Error {
  constructor(what: string, ms = DEADLINE_MS) {
    super(`${what} passou do prazo de ${ms / 1000} s`);
    this.name = "DeadlineError";
  }
}

/** Limite por execução: o do desafio vezes o fator da linguagem, nunca acima do prazo global. */
export function perTestLimit(language: Language, timeLimitMs = DEFAULT_TIME_LIMIT_MS): number {
  return Math.min(Math.round(timeLimitMs * TIME_FACTOR[language]), DEADLINE_MS);
}

/** Código do jogador + harness de um teste unitário. */
export function withHarness(language: Language, code: string, harness: string): string {
  const body = code.endsWith("\n") ? code : code + "\n";
  // C/C++: #line faz os erros do harness apontarem para tests.<ext>, não para main.<ext>.
  if (language === "c" || language === "cpp") return `${body}#line 1 "tests.${LANGUAGES[language].ext}"\n${harness}`;
  return body + harness;
}

const isUnit = (t: TestCase): t is UnitTestCase => t.kind === "unit";

/** Status de saída de um assert que falhou (e não de um crash). */
function assertionFailed(language: Language, r: RawRun): boolean {
  if (language === "c" || language === "cpp") return r.exitCode === 134 || r.exitCode === -6; // abort() do assert
  if (language === "rust") return r.exitCode === 101; // panic!
  return r.exitCode === 1 && /AssertionError/.test(r.stderr);
}

function lastLines(s: string, n = 4): string {
  return s.trimEnd().split("\n").slice(-n).join("\n");
}

const NOT_RUN: RawRun = { stdout: "", stderr: "", exitCode: null, timeMs: null, timedOut: true, outputTruncated: false };

function baseVerdict(r: RawRun, limitMs: number): { verdict: Verdict; message?: string } | null {
  if (r === NOT_RUN) return { verdict: "TLE", message: "não rodou: um teste anterior estourou o tempo ou o prazo do lote acabou" };
  if (r.timedOut) return { verdict: "TLE", message: `passou de ${limitMs} ms` };
  if (r.outputTruncated) return { verdict: "OLE", message: "saída grande demais" };
  return null;
}

async function gradeIo(t: IoTestCase, r: RawRun, checker: Checker, limitMs: number): Promise<TestOutcome> {
  let v = baseVerdict(r, limitMs);
  if (!v && r.exitCode !== 0) v = { verdict: "RE", message: `exit code ${r.exitCode}` };
  if (!v) {
    if (checker.type === "exact" && (t.expectedSha256 || r.stdoutSha256)) {
      // Hash dos dois lados: oculto que veio sem a resposta, ou motor que só devolveu o hash.
      const want = t.expectedSha256 ?? (await outputSha256(t.expected));
      const got = r.stdoutSha256 ?? (await outputSha256(r.stdout));
      v = want === got ? { verdict: "AC" } : { verdict: "WA", message: r.partial ? "saída diferente da esperada (o painel mostra só o começo)" : "saída diferente da esperada" };
    } else {
      const c = check(checker, t.expected, r.stdout, { partial: r.partial });
      v = { verdict: c.passed ? "AC" : "WA", message: c.message };
    }
  }
  return {
    name: t.name,
    hidden: t.hidden,
    ...v,
    timeMs: r.timeMs,
    memoryKb: null,
    exitCode: r.exitCode,
    input: t.input,
    expected: t.expected,
    stdout: r.stdout,
    stderr: r.stderr,
  };
}

function gradeUnit(language: Language, t: UnitTestCase, r: RawRun, limitMs: number): TestOutcome {
  let v = baseVerdict(r, limitMs);
  if (!v) {
    if (r.exitCode === 0) v = { verdict: "AC" };
    else if (assertionFailed(language, r)) v = { verdict: "WA", message: lastLines(r.stderr) || "um assert falhou" };
    else v = { verdict: "RE", message: `exit code ${r.exitCode}${r.stderr ? `: ${lastLines(r.stderr, 2)}` : ""}` };
  }
  return {
    name: t.name,
    hidden: t.hidden,
    ...v,
    timeMs: r.timeMs,
    memoryKb: null,
    exitCode: r.exitCode,
    input: "",
    expected: "",
    stdout: r.stdout,
    stderr: r.stderr,
  };
}

export interface CodeRunnerConfig {
  /** Prazo de parede de cada runAndTest. Só o `verify` (compila local, sem cache) muda isso. */
  deadlineMs?: number;
}

export function createCodeRunner(engines: Partial<Record<Language, Engine>>, config: CodeRunnerConfig = {}): CodeRunner {
  const deadlineMs = config.deadlineMs ?? DEADLINE_MS;
  const engineFor = (language: Language): Engine => {
    const e = engines[language];
    if (!e) throw new Error(`${LANGUAGES[language].label} não roda aqui`);
    return e;
  };

  async function runAndTest(code: string, language: Language, testCases: TestCase[], opts: RunOptions = {}): Promise<ExecutionResult> {
    const engine = engineFor(language);
    const checker = opts.checker ?? { type: "exact" };
    const limitMs = perTestLimit(language, opts.timeLimitMs);
    const flags = language === "c" || language === "cpp" ? (opts.flags ?? []) : [];

    // Motor ainda subindo (ex.: Pyodide na primeira visita): o clique espera aqui,
    // fora do prazo. O prazo de 5 s vale para compilar e rodar, não para baixar o runtime.
    if (engine.preload) {
      opts.onPhase?.("loading");
      await engine.preload((stage) => opts.onPhase?.("loading", stage));
    }

    // Prazo global: ao estourar, o motor para (Worker morto, fetch abortado).
    const started = performance.now();
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(new DeadlineError("a execução", deadlineMs)), deadlineMs);
    const onOuterAbort = () => deadline.abort(opts.signal?.reason);
    opts.signal?.addEventListener("abort", onOuterAbort, { once: true });

    const io = testCases.map((t, i) => [t, i] as const).filter(([t]) => !isUnit(t)) as (readonly [IoTestCase, number])[];
    const units = testCases.map((t, i) => [t, i] as const).filter(([t]) => isUnit(t)) as (readonly [UnitTestCase, number])[];
    const common = { language, timeLimitMs: limitMs, flags, hashOutput: checker.type === "exact", signal: deadline.signal, onPhase: opts.onPhase };

    try {
      // Os de entrada/saída compartilham um binário; cada unitário é um programa próprio.
      const jobs: Promise<EngineResult>[] = [];
      if (io.length) jobs.push(engine.execute({ ...common, source: code, stdins: io.map(([t]) => t.input) }));
      for (const [t] of units) jobs.push(engine.execute({ ...common, source: withHarness(language, code, t.harness), stdins: [""] }));
      const results = await Promise.all(jobs);

      const failed = results.find((r) => !r.compile.ok);
      if (failed) return { compile: failed.compile, tests: [], allPassed: false, warnings: [], engine: engine.name, wallMs: Math.round(performance.now() - started) };

      const outcomes: TestOutcome[] = new Array(testCases.length);
      const graded: Promise<void>[] = [];
      let k = 0;
      if (io.length) {
        const runs = results[k++].runs;
        io.forEach(([t, i], j) => graded.push(gradeIo(t, runs[j] ?? NOT_RUN, checker, limitMs).then((o) => void (outcomes[i] = o))));
      }
      for (const [t, i] of units) outcomes[i] = gradeUnit(language, t, results[k++].runs[0] ?? NOT_RUN, limitMs);
      await Promise.all(graded);

      const warnings: string[] = [];
      if (deadline.signal.aborted && outcomes.some((o) => o.message?.startsWith("não rodou"))) {
        warnings.push(`o lote passou de ${deadlineMs / 1000} s; os testes que sobraram não rodaram`);
      }
      const compileOutput = results.map((r) => r.compile.output.trim()).find(Boolean) ?? "";
      return {
        compile: { ok: true, output: compileOutput },
        tests: outcomes,
        allPassed: outcomes.every((o) => o.verdict === "AC"),
        warnings,
        engine: engine.name,
        wallMs: Math.round(performance.now() - started),
      };
    } catch (e) {
      if (deadline.signal.aborted && deadline.signal.reason instanceof DeadlineError) throw new DeadlineError("compilar e rodar os testes", deadlineMs);
      throw e;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuterAbort);
    }
  }

  return {
    runAndTest,
    run(code, language, stdin, opts) {
      return runAndTest(code, language, [{ name: "stdin", input: stdin, expected: "", hidden: false }], opts);
    },
    preload(language) {
      void engines[language]?.preload?.().catch(() => {});
    },
  };
}

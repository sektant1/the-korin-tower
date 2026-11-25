// Contrato do motor de execução. Uma interface (CodeRunner) e um motor por
// linguagem (Engine): Pyodide num Web Worker para Python, Compiler Explorer
// (godbolt.org) para C, C++ e Rust. Veja src/lib/runner/README.md.
import type { Checker, LanguageId } from "@/lib/languages";

export type Language = LanguageId;

/** Teste de entrada e saída: stdin -> stdout comparado com o esperado. */
export interface IoTestCase {
  kind?: "io";
  name: string;
  input: string;
  /** Saída esperada. Vazia quando o teste é oculto e vem só o hash. */
  expected: string;
  /** SHA-256 da saída esperada normalizada (testes ocultos julgados no navegador). */
  expectedSha256?: string;
  hidden: boolean;
}

/**
 * Teste unitário estilo Boot.dev: `harness` é código na mesma linguagem,
 * anexado depois do código do jogador, com o próprio `main` e asserts. Passa
 * se o programa terminar com exit 0; a mensagem do assert vira o motivo.
 */
export interface UnitTestCase {
  kind: "unit";
  name: string;
  harness: string;
  hidden: boolean;
}

export type TestCase = IoTestCase | UnitTestCase;

export type Verdict = "AC" | "WA" | "TLE" | "RE" | "OLE";

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

export interface CompileResult {
  ok: boolean;
  /** stdout + stderr do compilador (avisos ou erros), já com `main.<ext>` no lugar do nome interno */
  output: string;
}

export interface ExecutionResult {
  compile: CompileResult;
  /** Um por TestCase, na mesma ordem. Vazio se não compilou. */
  tests: TestOutcome[];
  allPassed: boolean;
  /** Avisos para o jogador (flags ignoradas, prazo global estourado...). */
  warnings: string[];
  /** Qual motor rodou ("pyodide", "godbolt", "local"). */
  engine: string;
  /** Tempo de parede do runAndTest inteiro, em ms. */
  wallMs: number;
}

export type Phase = "loading" | "compiling" | "running";

export interface RunOptions {
  checker?: Checker;
  /** Limite por teste do desafio (antes do fator da linguagem). Padrão: 2000 ms. */
  timeLimitMs?: number;
  /** Flags de compilação já validadas por `sanitizeFlags` (só C/C++). */
  flags?: string[];
  signal?: AbortSignal;
  /** `detail`: a etapa em texto, quando o motor sabe ("iniciando o interpretador", "rodando o teste 3 de 7") */
  onPhase?: (phase: Phase, detail?: string) => void;
}

export interface CodeRunner {
  runAndTest(code: string, language: Language, testCases: TestCase[], opts?: RunOptions): Promise<ExecutionResult>;
  /** :run: executa uma vez com o stdin dado, sem gabarito. */
  run(code: string, language: Language, stdin: string, opts?: RunOptions): Promise<ExecutionResult>;
  /** Começa a baixar/aquecer o motor da linguagem em segundo plano. Nunca falha. */
  preload(language: Language): void;
}

// ---- motores ----------------------------------------------------------------

/** Uma execução do programa. `null` no lote = não chegou a rodar (prazo). */
export interface RawRun {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeMs: number | null;
  timedOut: boolean;
  /** passou de MAX_OUTPUT_BYTES */
  outputTruncated: boolean;
  /** o motor só devolveu o começo da saída (Compiler Explorer corta em ~32 KB) */
  partial?: boolean;
  /**
   * SHA-256 (hex) da saída inteira normalizada, calculado pelo próprio motor
   * (driver em lote). Quando existe, o veredito vem dele e `stdout` pode ser só o começo.
   */
  stdoutSha256?: string;
}

export interface EngineRequest {
  language: Language;
  /** código completo (com o harness, se houver) */
  source: string;
  /** um stdin por execução; o código é compilado uma vez */
  stdins: string[];
  /** limite por execução, já com o fator da linguagem */
  timeLimitMs: number;
  flags: string[];
  /** o checker é o exact: o motor pode devolver só o hash da saída (lote num request) */
  hashOutput: boolean;
  signal: AbortSignal;
  onPhase?: (phase: Phase, detail?: string) => void;
}

export interface EngineResult {
  compile: CompileResult;
  runs: (RawRun | null)[];
}

export interface Engine {
  readonly name: string;
  execute(req: EngineRequest): Promise<EngineResult>;
  /** Sobe o motor (memoizado). `onStage` recebe as etapas enquanto sobe. */
  preload?(onStage?: (text: string) => void): Promise<void>;
}

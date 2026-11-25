// Erros do jogador em formato legível: diagnósticos de compilação (gcc/g++,
// rustc, SyntaxError do Python) e explicação dos erros de execução (sinais,
// panic, exceção). Puro: o OutputPanel só desenha o que sai daqui.
import type { LanguageId } from "@/lib/languages";

export type Severity = "error" | "warning" | "note";

export interface Diagnostic {
  severity: Severity;
  message: string;
  /** "main.c", "main.rs", "main.py", "tests.c"... */
  file?: string;
  line?: number;
  col?: number;
  /** linhas de contexto que o compilador mostrou (código + ^~~~) */
  snippet: string[];
  /** código do erro, quando há (E0308 do rustc, -Wunused-variable do gcc) */
  code?: string;
}

const SEVERITY: Record<string, Severity> = {
  error: "error",
  "fatal error": "error",
  erro: "error",
  warning: "warning",
  aviso: "warning",
  note: "note",
  help: "note",
  nota: "note",
};

// gcc/g++: "main.c:12:5: error: 'x' undeclared (first use in this function)"
const GCC = /^([\w./-]+\.(?:c|cpp|h|hpp)):(\d+):(\d+): (fatal error|error|warning|note): (.*?)(?: \[(-W[\w=-]+)\])?$/;
// gcc sem coluna: "main.c: In function 'main':" (cabeçalho de contexto, vira nota)
const GCC_CONTEXT = /^([\w./-]+\.(?:c|cpp)): (In function|In member function|At top level|In instantiation of)/;
// rustc: "error[E0308]: mismatched types" e depois " --> main.rs:1:25"
const RUST_HEAD = /^(error|warning|note|help)(?:\[(E\d+)\])?: (.*)$/;
const RUST_LOC = /^\s*--> ([\w./-]+\.rs):(\d+):(\d+)/;

function parseGccLike(text: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  let cur: Diagnostic | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const m = GCC.exec(line);
    if (m) {
      cur = { severity: SEVERITY[m[4]], file: m[1], line: Number(m[2]), col: Number(m[3]), message: m[5], code: m[6], snippet: [] };
      out.push(cur);
      continue;
    }
    if (GCC_CONTEXT.test(line)) {
      cur = null;
      continue;
    }
    // "   12 |   int x = y;" e "      |       ^"
    if (cur && /^\s*\d*\s*\|/.test(line)) cur.snippet.push(line);
  }
  return out;
}

function parseRust(text: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  let cur: Diagnostic | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = RUST_HEAD.exec(line);
    if (h && !/^(error|warning): aborting due to|^(error|warning): \d+ (warning|error)s? emitted|could not compile/.test(line)) {
      // "help:" e "note:" soltos (sem -->) são continuação do erro anterior.
      if ((h[1] === "help" || h[1] === "note") && cur) {
        cur.snippet.push(line);
        continue;
      }
      cur = { severity: SEVERITY[h[1]], code: h[2], message: h[3], snippet: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const loc = RUST_LOC.exec(line);
    if (loc && cur.line === undefined) {
      cur.file = loc[1];
      cur.line = Number(loc[2]);
      cur.col = Number(loc[3]);
      continue;
    }
    if (line.trim() === "" && cur.snippet.length) {
      cur = null; // linha em branco fecha o bloco
      continue;
    }
    if (/^\s*(\d+\s*)?\||^\s*=|^\s*\.\.\.|^\s*::: /.test(line)) cur.snippet.push(line);
  }
  return out.filter((d) => !/^aborting due to/.test(d.message));
}

// Python: format_exception_only do SyntaxError
//   File "main.py", line 3
//     print(x
//          ^
// SyntaxError: '(' was never closed
const PY_FILE = /^\s*File "([^"]+)", line (\d+)(?:, in (.*))?$/;
const PY_EXC = /^([A-Za-z_][\w.]*(?:Error|Exception|Warning|Exit|Interrupt|Iteration)|[A-Z]\w*Error): ?(.*)$/;

function parsePythonSyntax(text: string): Diagnostic[] {
  const lines = text.split("\n");
  let file: string | undefined;
  let line: number | undefined;
  const snippet: string[] = [];
  for (const raw of lines) {
    const f = PY_FILE.exec(raw);
    if (f) {
      file = f[1];
      line = Number(f[2]);
      snippet.length = 0;
      continue;
    }
    const e = PY_EXC.exec(raw.trim());
    if (e) return [{ severity: "error", message: e[2] ? `${e[1]}: ${e[2]}` : e[1], file, line, snippet: [...snippet] }];
    if (raw.trim()) snippet.push(raw.replace(/^ {4}/, ""));
  }
  return [];
}

/** Diagnósticos de compilação. Vazio = não deu para entender (o painel mostra o texto cru). */
export function parseDiagnostics(language: LanguageId, output: string): Diagnostic[] {
  if (!output.trim()) return [];
  if (language === "python") return parsePythonSyntax(output);
  if (language === "rust") return parseRust(output);
  return parseGccLike(output);
}

// ---- erros de execução ---------------------------------------------------------

export interface RuntimeExplanation {
  /** resumo curto: "Segmentation fault", "ZeroDivisionError: division by zero", "panic" */
  title: string;
  /** o que costuma causar, em uma frase */
  hint?: string;
  /** onde o erro aconteceu no código do jogador, se o stderr disser */
  file?: string;
  line?: number;
  col?: number;
}

const SIGNALS: Record<number, [string, string]> = {
  4: ["instrução ilegal (SIGILL)", "costuma ser um caminho que não retorna valor numa função que deveria, ou __builtin_unreachable alcançado"],
  6: ["abortado (SIGABRT)", "um assert falhou ou a libc detectou corrupção de memória (double free, free inválido)"],
  7: ["erro de barramento (SIGBUS)", "acesso a memória desalinhada ou mapeamento inválido"],
  8: ["exceção aritmética (SIGFPE)", "divisão inteira por zero (ou INT_MIN / -1)"],
  9: ["processo morto (SIGKILL)", "memória demais ou o tempo acabou"],
  11: ["segmentation fault (SIGSEGV)", "acesso inválido à memória: ponteiro nulo ou solto, índice fora do vetor, ou recursão profunda demais (estouro de pilha)"],
  13: ["pipe quebrado (SIGPIPE)", "escreveu num pipe que ninguém lê"],
  25: ["saída grande demais (SIGXFSZ)", "o programa escreveu mais do que o limite"],
};

/** Por que o programa terminou com erro, em português. */
export function explainRuntime(language: LanguageId, exitCode: number | null, stderr: string): RuntimeExplanation | null {
  if (exitCode === 0 || exitCode === null) return null;

  if (language === "python") {
    const lines = stderr.trimEnd().split("\n");
    const last = [...lines].reverse().find((l) => PY_EXC.test(l.trim()));
    // O frame mais fundo dentro do código do jogador.
    let file: string | undefined;
    let line: number | undefined;
    for (const l of lines) {
      const f = PY_FILE.exec(l);
      if (f && /main\.py$/.test(f[1])) {
        file = f[1];
        line = Number(f[2]);
      }
    }
    if (last) {
      const name = PY_EXC.exec(last.trim())![1];
      return { title: last.trim(), hint: PY_HINTS[name], file, line };
    }
    return { title: `saiu com código ${exitCode}`, file, line };
  }

  if (language === "rust") {
    // thread 'main' panicked at main.rs:5:9:
    // index out of bounds: the len is 3 but the index is 7
    const m = /panicked at ([\w./-]+\.rs):(\d+):(\d+):\n(.*)/.exec(stderr);
    if (m) return { title: `panic: ${m[4]}`, hint: RUST_HINT(m[4]), file: m[1], line: Number(m[2]), col: Number(m[3]) };
    if (/stack overflow/.test(stderr)) return { title: "estouro de pilha", hint: "recursão profunda demais (ou sem caso base)" };
  }

  if (exitCode > 128 && SIGNALS[exitCode - 128]) {
    const [title, hint] = SIGNALS[exitCode - 128];
    // C/C++: o assert diz onde foi. "main: main.c:12: soma: Assertion `x > 0' failed."
    const a = /([\w./-]+\.(?:c|cpp)):(\d+): .*Assertion `(.*)' failed/.exec(stderr);
    if (a) return { title: `assert falhou: ${a[3]}`, file: a[1], line: Number(a[2]) };
    if (/free\(\): |double free|malloc\(\): |corrupted/.test(stderr)) return { title, hint: "a libc detectou corrupção do heap: double free, free de ponteiro inválido ou escrita fora do bloco alocado" };
    return { title, hint };
  }
  return { title: `saiu com código ${exitCode}`, hint: language === "c" || language === "cpp" ? "o main retornou diferente de 0 (ou exit() com erro)" : undefined };
}

const PY_HINTS: Record<string, string> = {
  ZeroDivisionError: "divisão (ou %) por zero",
  IndexError: "índice fora da lista: confira os limites do laço",
  KeyError: "chave que não existe no dicionário: use .get() ou confira antes",
  ValueError: "conversão inválida, ex.: int() de um texto que não é número (sobrou espaço ou linha vazia?)",
  TypeError: "operação entre tipos incompatíveis, ex.: somar str com int",
  NameError: "nome não definido: erro de digitação ou variável usada antes de existir",
  AttributeError: "o objeto não tem esse método ou atributo",
  RecursionError: "recursão profunda demais: falta caso base, ou troque por um laço",
  EOFError: "input() sem mais linhas: o programa leu mais do que a entrada tem",
  UnboundLocalError: "variável local usada antes da atribuição (faltou global/nonlocal?)",
  MemoryError: "memória demais",
  OverflowError: "número grande demais para a operação (float)",
};

function RUST_HINT(msg: string): string | undefined {
  if (/index out of bounds/.test(msg)) return "índice fora do vetor: confira os limites (use .get() para checar)";
  if (/called `Option::unwrap\(\)` on a `None`/.test(msg)) return "unwrap() num None: o valor não existia";
  if (/called `Result::unwrap\(\)` on an `Err`/.test(msg)) return "unwrap() num Err: a operação falhou (parse de número? linha vazia?)";
  if (/attempt to (add|subtract|multiply).*overflow/.test(msg)) return "overflow aritmético (em debug o Rust confere): use um tipo maior ou wrapping_*";
  if (/attempt to divide by zero/.test(msg)) return "divisão por zero";
  return undefined;
}

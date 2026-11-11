import type { Checker } from "@/lib/languages";
import { parsePpm } from "@/lib/ppm";

export interface CheckResult {
  passed: boolean;
  message?: string;
}

/** CRLF -> LF, remove espaços no fim das linhas e linhas vazias no final. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

export interface CheckOptions {
  /**
   * `actual` é só o começo da saída (o runner cortou; ver ExecResult.partial).
   * Confere o prefixo: a última linha (ou o último valor do PPM) é descartada,
   * porque pode ter sido cortada no meio.
   */
  partial?: boolean;
}

/** Mensagem anexada quando só o prefixo foi conferido. */
export const PARTIAL_NOTE = "saída cortada pelo runner: só o começo foi conferido";

function prefixPassed(expected: string, actual: string): boolean {
  const exp = normalizeOutput(expected);
  let got = normalizeOutput(actual);
  // A última linha pode estar incompleta: fica de fora da comparação.
  got = got.includes("\n") ? got.slice(0, got.lastIndexOf("\n")) : "";
  if (!got) return true; // nada inteiro para comparar; o runner não deixou
  return exp.startsWith(got) && (exp.length === got.length || exp[got.length] === "\n");
}

export function check(checker: Checker, expected: string, actual: string, opts: CheckOptions = {}): CheckResult {
  if (checker.type === "exact") {
    if (opts.partial) return { passed: prefixPassed(expected, actual), message: PARTIAL_NOTE };
    return { passed: normalizeOutput(expected) === normalizeOutput(actual) };
  }
  // ppm: compara pixel a pixel com tolerância por canal (float varia entre compiladores).
  let exp, act;
  try {
    exp = parsePpm(expected);
  } catch (e) {
    return { passed: false, message: `saída esperada inválida: ${(e as Error).message}` };
  }
  try {
    act = opts.partial ? parsePpm(actual, { partial: true }) : parsePpm(actual);
  } catch (e) {
    return { passed: false, message: `sua saída não é um PPM válido: ${(e as Error).message}` };
  }
  if (exp.width !== act.width || exp.height !== act.height) {
    return {
      passed: false,
      message: `dimensões diferentes: esperado ${exp.width}x${exp.height}, obtido ${act.width}x${act.height}`,
    };
  }
  // Com saída parcial só existem `act.pixels` pixels inteiros; o resto fica de fora.
  const total = Math.min(exp.width * exp.height, act.pixels);
  let bad = 0;
  for (let p = 0; p < total; p++) {
    for (let c = 0; c < 3; c++) {
      if (Math.abs(exp.data[p * 3 + c] - act.data[p * 3 + c]) > checker.tolerance) {
        bad++;
        break;
      }
    }
  }
  const ratio = total ? bad / total : 0;
  if (ratio > checker.maxBadRatio) {
    return {
      passed: false,
      message: `${bad} pixel(s) fora da tolerância (±${checker.tolerance}); máximo permitido ${(checker.maxBadRatio * 100).toFixed(2)}%`,
    };
  }
  const notes = [bad ? `${bad} pixel(s) levemente diferentes (dentro do limite)` : "", opts.partial ? `${PARTIAL_NOTE} (${total} de ${exp.width * exp.height} pixels)` : ""].filter(Boolean);
  return { passed: true, message: notes.length ? notes.join("; ") : undefined };
}

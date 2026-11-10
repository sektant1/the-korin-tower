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

export function check(checker: Checker, expected: string, actual: string): CheckResult {
  if (checker.type === "exact") {
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
    act = parsePpm(actual);
  } catch (e) {
    return { passed: false, message: `sua saída não é um PPM válido: ${(e as Error).message}` };
  }
  if (exp.width !== act.width || exp.height !== act.height) {
    return {
      passed: false,
      message: `dimensões diferentes: esperado ${exp.width}x${exp.height}, obtido ${act.width}x${act.height}`,
    };
  }
  let bad = 0;
  for (let p = 0; p < exp.width * exp.height; p++) {
    for (let c = 0; c < 3; c++) {
      if (Math.abs(exp.data[p * 3 + c] - act.data[p * 3 + c]) > checker.tolerance) {
        bad++;
        break;
      }
    }
  }
  const ratio = bad / (exp.width * exp.height);
  if (ratio > checker.maxBadRatio) {
    return {
      passed: false,
      message: `${bad} pixel(s) fora da tolerância (±${checker.tolerance}); máximo permitido ${(checker.maxBadRatio * 100).toFixed(2)}%`,
    };
  }
  return { passed: true, message: bad ? `${bad} pixel(s) levemente diferentes (dentro do limite)` : undefined };
}

import path from "node:path";
import { GodboltRunner } from "./godbolt";
import { LocalRunner } from "./local";
import { PistonRunner } from "./piston";
import type { Runner } from "./types";

export * from "./types";
export { sanitizeFlags } from "./flags";

let instance: Runner | undefined;

export function getRunner(): Runner {
  if (instance) return instance;
  const kind = process.env.RUNNER || "piston";
  if (kind === "local") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_UNSAFE_LOCAL_RUNNER !== "1") {
      throw new Error("RUNNER=local executa código sem sandbox e está bloqueado em produção. Use RUNNER=piston.");
    }
    instance = new LocalRunner(process.env.RUNNER_TMP ?? path.join(process.cwd(), ".runner-tmp"));
  } else if (kind === "godbolt") {
    // Sem servidor para manter: API pública do Compiler Explorer (veja godbolt.ts).
    instance = new GodboltRunner(process.env.GODBOLT_URL || "https://godbolt.org");
  } else if (kind === "piston") {
    // PISTON_URL: raiz do Piston (http://piston:2000) ou URL completa do execute.
    // Sem ela, produção falha na hora com erro claro em vez de "fetch failed" no localhost.
    const url = process.env.PISTON_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:2000");
    if (!url) throw new Error("PISTON_URL não configurado; suba um Piston (README → Deploy) e defina a URL dele");
    instance = new PistonRunner(url);
  } else {
    throw new Error(`RUNNER desconhecido: ${kind}`);
  }
  return instance;
}

/** Avisos que valem para /api/run e /api/playground. */
export function flagWarnings(runner: Runner, flags: string[], rejected: string[]): string[] {
  const warnings: string[] = [];
  if (rejected.length) warnings.push(`flags ignoradas (não permitidas): ${rejected.join(" ")}`);
  if (flags.length && runner.name === "piston") warnings.push("o runner Piston usa flags fixas; suas flags foram ignoradas");
  return warnings;
}

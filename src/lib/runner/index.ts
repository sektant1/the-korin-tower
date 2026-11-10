import path from "node:path";
import { LocalRunner } from "./local";
import { PistonRunner } from "./piston";
import type { Runner } from "./types";

export * from "./types";
export { sanitizeFlags } from "./flags";

let instance: Runner | undefined;

export function getRunner(): Runner {
  if (instance) return instance;
  const kind = process.env.RUNNER ?? "piston";
  if (kind === "local") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_UNSAFE_LOCAL_RUNNER !== "1") {
      throw new Error("RUNNER=local executa código sem sandbox e está bloqueado em produção. Use RUNNER=piston.");
    }
    instance = new LocalRunner(process.env.RUNNER_TMP ?? path.join(process.cwd(), ".runner-tmp"));
  } else if (kind === "piston") {
    instance = new PistonRunner(process.env.PISTON_URL ?? "http://localhost:2000");
  } else {
    throw new Error(`RUNNER desconhecido: ${kind}`);
  }
  return instance;
}

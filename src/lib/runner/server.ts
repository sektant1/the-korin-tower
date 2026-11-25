import "server-only";
// CodeRunner do servidor: atende a CLI (`korin test`/`korin submit` sem --local),
// que não tem navegador. Mesmo motor do navegador para C/C++/Rust (o Compiler
// Explorer); Python não roda no servidor (a CLI usa o python3 da máquina com --local).
import { createCodeRunner } from "./code-runner";
import { GodboltEngine } from "./engines/godbolt";
import type { CodeRunner, Language } from "./types";

let runner: CodeRunner | null = null;

export const SERVER_LANGUAGES: readonly Language[] = ["c", "cpp", "rust"];

export function getServerRunner(): CodeRunner {
  if (!runner) {
    const ce = new GodboltEngine(process.env.GODBOLT_URL || "https://godbolt.org");
    runner = createCodeRunner({ c: ce, cpp: ce, rust: ce });
  }
  return runner;
}

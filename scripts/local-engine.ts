// Motor local para `npm run verify` (CI e dev): gcc, g++, rustc e python3 da
// própria máquina. ATENÇÃO: executa código sem sandbox. Só roda as soluções de
// referência do repositório, nunca código de jogador; não é usado pelo site.
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LANGUAGES } from "@/lib/languages";
import { MAX_OUTPUT_BYTES } from "@/lib/runner/code-runner";
import type { Engine, EngineRequest, EngineResult, Language, RawRun } from "@/lib/runner/types";

const EXE = process.platform === "win32" ? "main.exe" : "main";
// rustc -O passa de 30 s em máquina lenta (runner do GitHub Actions).
const COMPILE_TIMEOUT_MS = Number(process.env.VERIFY_COMPILE_TIMEOUT_MS) || 180_000;
const PYTHON = process.env.PYTHON || "python3";

function compileCmd(language: Language, flags: string[]): string[] | null {
  switch (language) {
    case "c":
      return ["gcc", "-std=c17", "-O2", ...flags, "-o", EXE, "main.c", "-lm"];
    case "cpp":
      return ["g++", "-std=c++20", "-O2", ...flags, "-o", EXE, "main.cpp"];
    case "rust":
      return ["rustc", "--edition", "2021", "-C", "opt-level=2", "-o", EXE, "main.rs"];
    case "python":
      return [PYTHON, "-m", "py_compile", "main.py"];
  }
}

const runCmd = (language: Language, dir: string) => (language === "python" ? [PYTHON, "main.py"] : [path.join(dir, EXE)]);

interface Proc {
  stdout: string;
  stderr: string;
  code: number | null;
  timeMs: number;
  timedOut: boolean;
  truncated: boolean;
}

function proc(cmd: string[], cwd: string, stdin: string, timeoutMs: number, signal?: AbortSignal): Promise<Proc> {
  return new Promise((resolve) => {
    const start = performance.now();
    const child = spawn(cmd[0], cmd.slice(1), { cwd, windowsHide: true });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let truncated = false;
    let timedOut = false;
    const kill = () => child.kill("SIGKILL");
    const collect = (buf: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        truncated = true;
        return kill();
      }
      buf.push(chunk);
    };
    child.stdout.on("data", collect(out));
    child.stderr.on("data", collect(err));
    const timer = setTimeout(() => ((timedOut = true), kill()), timeoutMs);
    signal?.addEventListener("abort", kill, { once: true });
    let done = false;
    const finish = (code: number | null, extra = "") => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", kill);
      resolve({
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8") + extra,
        code,
        timeMs: Math.round(performance.now() - start),
        timedOut,
        truncated,
      });
    };
    child.on("error", (e) => finish(null, `\n[korin] falha ao iniciar '${cmd[0]}': ${e.message}`));
    child.on("close", (code, sig) => finish(code ?? (sig === "SIGABRT" ? 134 : null)));
    child.stdin.on("error", () => {});
    child.stdin.end(stdin);
  });
}

export class LocalEngine implements Engine {
  readonly name = "local";

  async execute(req: EngineRequest): Promise<EngineResult> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "korin-verify-"));
    try {
      await writeFile(path.join(dir, LANGUAGES[req.language].file), req.source);
      const c = await proc(compileCmd(req.language, req.flags)!, dir, "", COMPILE_TIMEOUT_MS);
      const output = (c.stdout + c.stderr).trim();
      if (c.timedOut || c.code !== 0) return { compile: { ok: false, output: output || `compilador saiu com ${c.code}` }, runs: [] };
      const runs: (RawRun | null)[] = [];
      for (const stdin of req.stdins) {
        if (req.signal.aborted) {
          runs.push(null);
          continue;
        }
        const r = await proc(runCmd(req.language, dir), dir, stdin, req.timeLimitMs, req.signal);
        runs.push({ stdout: r.stdout, stderr: r.stderr, exitCode: r.code, timeMs: r.timeMs, timedOut: r.timedOut, outputTruncated: r.truncated });
      }
      return { compile: { ok: true, output }, runs };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { MAX_OUTPUT_BYTES, type BatchRequest, type BatchResult, type ExecResult, type Runner } from "./types";

// ATENÇÃO: executa código arbitrário direto na máquina, SEM SANDBOX.
// Existe só para desenvolver sem Docker. Limite de memória não é aplicado.

const EXE = process.platform === "win32" ? "main.exe" : "main";

function compileCommands(lang: LanguageId, flags: string[]): string[][] {
  switch (lang) {
    case "c":
      return [["gcc", "-std=c17", "-O2", "-Wall", ...flags, "-o", EXE, "main.c", "-lm"]];
    case "cpp":
      return [["g++", "-std=c++20", "-O2", "-Wall", ...flags, "-o", EXE, "main.cpp"]];
    case "rust":
      return [["rustc", "--edition", "2021", "-O", "-o", EXE, "main.rs"]];
    case "glsl":
      throw new Error("GLSL roda no navegador");
  }
}

interface ProcResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
  timeMs: number;
  timedOut: boolean;
  truncated: boolean;
}

// rustc -O pode passar de 30s em máquinas lentas (ex.: runner do GitHub Actions).
const COMPILE_TIMEOUT_MS = Number(process.env.RUNNER_COMPILE_TIMEOUT_MS) || 30_000;

function run(cmd: string[], cwd: string, stdin: string, timeoutMs: number): Promise<ProcResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const child = spawn(cmd[0], cmd.slice(1), { cwd, windowsHide: true });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    let truncated = false;
    let timedOut = false;
    const collect = (buf: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        truncated = true;
        child.kill("SIGKILL");
        return;
      }
      buf.push(chunk);
    };
    child.stdout.on("data", collect(out));
    child.stderr.on("data", collect(err));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    let done = false;
    const finish = (code: number | null, signal: string | null, extraErr = "") => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8") + extraErr,
        code,
        signal,
        timeMs: Math.round(performance.now() - start),
        timedOut,
        truncated,
      });
    };
    child.on("error", (e) => finish(null, null, `\n[korin] falha ao iniciar '${cmd[0]}': ${e.message}`));
    child.on("close", (code, signal) => finish(code, signal));
    child.stdin.on("error", () => {}); // o processo pode sair antes de ler todo o stdin
    child.stdin.end(stdin);
  });
}

export class LocalRunner implements Runner {
  readonly name = "local";
  constructor(private tmpRoot: string) {}

  async runBatch(req: BatchRequest): Promise<BatchResult> {
    await mkdir(this.tmpRoot, { recursive: true });
    const dir = await mkdtemp(path.join(this.tmpRoot, "run-"));
    try {
      await writeFile(path.join(dir, LANGUAGES[req.language].file), req.source);
      let compileOutput = "";
      for (const cmd of compileCommands(req.language, req.flags)) {
        const r = await run(cmd, dir, "", COMPILE_TIMEOUT_MS);
        compileOutput += r.stdout + r.stderr;
        if (r.timedOut) {
          compileOutput += `\n[korin] compilação passou de ${COMPILE_TIMEOUT_MS / 1000}s e foi interrompida (RUNNER_COMPILE_TIMEOUT_MS)`;
          return { compile: { ok: false, output: compileOutput.trim() }, runs: [] };
        }
        if (r.code !== 0) {
          return { compile: { ok: false, output: compileOutput || `compilador saiu com código ${r.code}${r.signal ? ` (${r.signal})` : ""}` }, runs: [] };
        }
      }
      const runs: ExecResult[] = [];
      for (const input of req.inputs) {
        const r = await run([path.join(dir, EXE)], dir, input, req.timeLimitMs);
        runs.push({
          stdout: r.stdout,
          stderr: r.stderr,
          exitCode: r.code,
          signal: r.signal,
          timeMs: r.timeMs,
          memoryKb: null,
          timedOut: r.timedOut,
          outputTruncated: r.truncated,
        });
      }
      return { compile: { ok: true, output: compileOutput }, runs };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

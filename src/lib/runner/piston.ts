import { LANGUAGES } from "@/lib/languages";
import type { BatchRequest, BatchResult, ExecResult, Runner } from "./types";

// Piston v2: POST /api/v2/execute. Ele compila a cada chamada (não há
// "compila uma vez, roda N"), então paralelizamos um pouco os testes.
// Limitação: o Piston usa flags de compilação fixas; req.flags é ignorado.

interface PistonStage {
  stdout: string;
  stderr: string;
  output: string;
  code: number | null;
  signal: string | null;
  status?: string; // versões novas: "TO" = timeout, "RE", "SG", "OL"...
  memory?: number; // bytes (versões novas)
  wall_time?: number; // ms (versões novas)
  cpu_time?: number;
}

interface PistonResponse {
  compile?: PistonStage;
  run?: PistonStage;
  message?: string;
}

const PARALLEL = 3;

export class PistonRunner implements Runner {
  readonly name = "piston";
  constructor(private baseUrl: string) {}

  private async execute(req: BatchRequest, stdin: string): Promise<PistonResponse> {
    const lang = LANGUAGES[req.language];
    if (!lang.piston) throw new Error(`${lang.label} não roda no servidor`);
    const res = await fetch(`${this.baseUrl}/api/v2/execute`, {
      method: "POST",
      // PISTON_TOKEN: para um Piston remoto atrás de um proxy que exige token (ex.: app na Vercel).
      headers: {
        "content-type": "application/json",
        ...(process.env.PISTON_TOKEN ? { authorization: `Bearer ${process.env.PISTON_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        language: lang.piston,
        version: "*",
        files: [{ name: lang.file, content: req.source }],
        stdin,
        compile_timeout: 15000,
        run_timeout: req.timeLimitMs,
        compile_memory_limit: 512 * 1024 * 1024,
        run_memory_limit: req.memoryLimitMb * 1024 * 1024,
      }),
      signal: AbortSignal.timeout(req.timeLimitMs + 30000),
    });
    const body = (await res.json().catch(() => ({}))) as PistonResponse;
    if (!res.ok) throw new Error(`Piston respondeu ${res.status}: ${body.message ?? "erro desconhecido"}`);
    return body;
  }

  async runBatch(req: BatchRequest): Promise<BatchResult> {
    const responses: PistonResponse[] = new Array(req.inputs.length);

    // Primeiro teste sozinho: se não compilar, não gastamos o resto.
    responses[0] = await this.execute(req, req.inputs[0] ?? "");
    const compile = responses[0].compile;
    if (compile && compile.code !== 0) {
      return { compile: { ok: false, output: compile.output || compile.stderr }, runs: [] };
    }

    let next = 1;
    const worker = async () => {
      while (next < req.inputs.length) {
        const i = next++;
        responses[i] = await this.execute(req, req.inputs[i]);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));

    return {
      compile: { ok: true, output: compile?.output ?? "" },
      runs: responses.map((r) => toExec(r.run, req.timeLimitMs)),
    };
  }
}

function toExec(run: PistonStage | undefined, limitMs: number): ExecResult {
  if (!run) {
    return {
      stdout: "",
      stderr: "Piston não retornou etapa de execução",
      exitCode: null,
      signal: null,
      timeMs: null,
      memoryKb: null,
      timedOut: false,
      outputTruncated: false,
    };
  }
  const timedOut = run.status === "TO" || (run.signal === "SIGKILL" && (run.wall_time ?? 0) >= limitMs);
  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.code,
    signal: run.signal,
    timeMs: run.wall_time ?? null,
    memoryKb: run.memory != null ? Math.round(run.memory / 1024) : null,
    timedOut,
    outputTruncated: run.status === "OL",
  };
}

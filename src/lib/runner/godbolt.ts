import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { MAX_OUTPUT_BYTES } from "./types";
import type { BatchRequest, BatchResult, ExecResult, Runner } from "./types";

// Compiler Explorer (godbolt.org): API pública, gratuita e sem chave, com
// execução em sandbox. Virou a opção sem servidor próprio porque a API pública
// do Piston passou a ser só para whitelist (fev/2026) e a do Wandbox está
// quebrada. Veja README → Deploy para as limitações e para subir um Piston
// próprio quando o tráfego crescer.
//
// Limitações (comparado ao Piston):
// - sem relatório de memória (memoryKb sempre null);
// - o sandbox deles mata o processo em ~20 s, não no nosso timeLimitMs,
//   então o TLE é decidido pelo tempo medido (com folga para o spawn);
// - um TLE no primeiro teste já marca os demais (não gastamos 20 s por teste).

/** Compilers x86-64 do godbolt.org, um por linguagem da torre. */
export const CE_COMPILERS = {
  c: "cg132", // gcc 13.2
  cpp: "g132", // g++ 13.2
  rust: "r1820", // rustc 1.82.0
  go: "gl1238", // go 1.23.8
  zig: "z0141", // zig 0.14.1
  nasm: "nasm301", // nasm 3.01
  d: "ldc190", // LDC
  pascal: "fpc322", // fpc 3.2.2
  fortran: "gfortran143", // gfortran 14.3
} as const;

type CeLanguage = keyof typeof CE_COMPILERS;

interface CeLine {
  text: string;
}
interface CeResponse {
  code?: number; // exit code do programa; 128+N quando morreu por sinal N
  didExecute?: boolean;
  timedOut?: boolean; // o sandbox matou (~20 s)
  truncated?: boolean;
  execTime?: number; // ms, inclui ~15 ms de spawn
  stdout?: CeLine[];
  stderr?: CeLine[];
  buildResult?: { code?: number; stdout?: CeLine[]; stderr?: CeLine[] };
}

/** Folga sobre o limite do desafio: o execTime inclui o spawn do processo. */
const OVERHEAD_MS = 150;
/** gcc manda diagnóstico colorido; o painel de saída quer texto puro. */
const ANSI = /\x1b\[[0-9;]*[a-zA-Z]/g;

function lines(ls: CeLine[] | undefined): string {
  // Cada chunk é uma linha sem o \n final.
  return (ls ?? []).map((l) => l.text).join("\n");
}

function toSignal(code: number | undefined): string | null {
  if (code == null || code < 128 || code > 128 + 15) return null;
  return ["INT", "QUIT", "ILL", "TRAP", "ABRT", "BUS", "FPE", "KILL", "USR1", "SEGV", "USR2", "PIPE", "ALRM", "TERM", "STKFLT"][code - 128] ?? null;
}

function toExec(j: CeResponse, timeLimitMs: number): ExecResult {
  const stdout = lines(j.stdout);
  const truncated = j.truncated === true || stdout.length > MAX_OUTPUT_BYTES;
  const timeMs = typeof j.execTime === "number" ? j.execTime : null;
  return {
    stdout: truncated ? stdout.slice(0, MAX_OUTPUT_BYTES) : stdout,
    stderr: lines(j.stderr),
    exitCode: j.code ?? null,
    signal: toSignal(j.code),
    timeMs,
    memoryKb: null,
    timedOut: j.timedOut === true || (timeMs != null && timeMs > timeLimitMs + OVERHEAD_MS),
    outputTruncated: truncated,
  };
}

export class GodboltRunner implements Runner {
  readonly name = "godbolt";
  private readonly endpoint: string;

  constructor(url = "https://godbolt.org") {
    this.endpoint = url.replace(/\/+$/, "");
  }

  private compiler(language: LanguageId): string {
    const id = (CE_COMPILERS as Record<string, string | undefined>)[language];
    if (!id) throw new Error(`${LANGUAGES[language].label} não roda no Compiler Explorer`);
    return id;
  }

  private async execute(req: BatchRequest, stdin: string): Promise<CeResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.endpoint}/api/compiler/${this.compiler(req.language)}/compile`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          source: req.source,
          options: {
            // Flags do usuário (c/cpp) viram argumentos do compilador de verdade.
            userArguments: req.flags.join(" "),
            executeParameters: { args: [], stdin },
            compilerOptions: { executorRequest: true },
            filters: { execute: true },
          },
        }),
        // O sandbox deles corta em ~20 s; compile + exec + fila cabem folgado.
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      throw new Error(`não consegui falar com o Compiler Explorer em ${this.endpoint}: ${(e as Error).message}`);
    }
    const body = (await res.json().catch(() => ({}))) as CeResponse;
    if (!res.ok) throw new Error(`Compiler Explorer em ${this.endpoint} respondeu ${res.status}`);
    return body;
  }

  async runBatch(req: BatchRequest): Promise<BatchResult> {
    // Compila (e executa) o primeiro teste sozinho: se não compilar, não
    // gastamos o resto; se estourar o tempo, marcamos tudo de uma vez.
    const first = await this.execute(req, req.inputs[0] ?? "");
    const build = first.buildResult;
    if (first.didExecute === false || (build && build.code !== 0)) {
      // "<source>:3:5: error" -> "main.c:3:5: error" (link clicável no painel).
      const file = LANGUAGES[req.language].file;
      const output = [lines(build?.stderr), lines(build?.stdout)].filter(Boolean).join("\n").replace(ANSI, "").replaceAll("<source>", file);
      return { compile: { ok: false, output }, runs: [] };
    }

    const responses: (CeResponse | null)[] = new Array(req.inputs.length);
    responses[0] = first;
    const timedOutAll = (): ExecResult => ({
      stdout: "",
      stderr: "",
      exitCode: null,
      signal: null,
      timeMs: null,
      memoryKb: null,
      timedOut: true,
      outputTruncated: false,
    });
    if (toExec(first, req.timeLimitMs).timedOut) {
      // Estourou no primeiro: os demais dariam o mesmo resultado (20 s cada).
      return {
        compile: { ok: true, output: "" },
        runs: [toExec(first, req.timeLimitMs), ...Array.from({ length: req.inputs.length - 1 }, timedOutAll)],
      };
    }

    // Restante dos testes; a compilação fica no cache deles (okToCache).
    let next = 1;
    let aborted = false;
    const worker = async () => {
      while (next < req.inputs.length) {
        if (aborted) return;
        const i = next++;
        responses[i] = await this.execute(req, req.inputs[i]);
        if (toExec(responses[i]!, req.timeLimitMs).timedOut) aborted = true; // TLE: não gastamos 20 s por teste
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker));

    return {
      compile: { ok: true, output: "" },
      runs: responses.map((r) => (r ? toExec(r, req.timeLimitMs) : timedOutAll())),
    };
  }
}

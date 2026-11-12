import { NextResponse } from "next/server";
import { getChallenge, type FullChallenge } from "@/lib/challenges";
import { isLanguageId, type LanguageId } from "@/lib/languages";
import { FRAME_TEST_NAME, framesOutcome } from "@/lib/judge/frames";
import { judge, type TestOutcome } from "@/lib/judge/judge";
import { getRunner, flagWarnings, sanitizeFlags, type Runner } from "@/lib/runner";
import { WasmModuleRunner } from "@/lib/runner/wasm";
import { wasmProblem } from "@/lib/wasm/wasi-core.mjs";
import { getCurrentUser } from "@/lib/auth/session";
import { getDaily } from "@/lib/daily";
import { getProgressSummary, recordSolve } from "@/lib/progress";
import { lockInfo } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";
import { recordSubmission } from "@/lib/records";
import { clientKey, rateLimit, Semaphore } from "@/lib/rate-limit";
import type { RunResponse } from "@/lib/run-api";
import { submitVerify } from "@/lib/submit-mode";

export const runtime = "nodejs";
// Vercel: o padrão de uma função é 10 s no plano Hobby; com o runner Godbolt um
// submit com vários testes passa disso. 60 s é o teto do Hobby (Pro aceita mais).
export const maxDuration = 60;

const MAX_SOURCE = 64 * 1024;
const MAX_STDIN = 256 * 1024;
/** .wasm compilado no navegador (base64). Um C++ com iostream fica em ~1 MB; folga de sobra. */
const MAX_WASM_BYTES = 12 * 1024 * 1024;
const semaphore = new Semaphore(Number(process.env.RUN_MAX_CONCURRENCY ?? 4));

function bad(status: number, error: string, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers });
}

// Testes ocultos: o aluno só vê nome, veredito e tempo, nunca entrada/saída.
function redact(t: TestOutcome): TestOutcome {
  if (!t.hidden) return t;
  return { ...t, input: "", expected: "", stdout: "", stderr: "", message: t.verdict === "AC" ? undefined : t.message };
}

/**
 * Desafios que desenham (shader e canvas): o navegador já compilou, rodou e deu
 * o veredito; aqui só reconferimos os dois frames (PPM P3 pequeno) com o mesmo
 * código e registramos a solução. Nenhum código roda no servidor.
 */
async function framesRun(challenge: FullChallenge, mode: "test" | "submit", language: LanguageId, frames: unknown, source: string) {
  let test: TestOutcome;
  try {
    test = framesOutcome(frames, FRAME_TEST_NAME[challenge.kind === "canvas" ? "canvas" : "shader"]);
  } catch (e) {
    return bad(400, `frame inválido: ${(e as Error).message}`);
  }
  const pass = test.verdict === "AC";
  const response: RunResponse = { mode, compile: { ok: true, output: "" }, tests: [test], allPassed: pass, warnings: [] };
  const user = await getCurrentUser();
  if (mode === "submit" && pass && user) {
    const daily = await getDaily();
    response.awarded = (await recordSolve(user.id, challenge, daily?.challengeId === challenge.id)) ?? 0;
    await recordSubmission(user.id, challenge.id, language, source, [null]);
  }
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad(400, "JSON inválido");
  }
  const { slug, language, source, stdin, mode, flags } = body;
  if (typeof slug !== "string" || typeof source !== "string") return bad(400, "slug e source são obrigatórios");
  if (mode !== "run" && mode !== "test" && mode !== "submit") return bad(400, "mode deve ser run, test ou submit");
  if (!isLanguageId(language)) return bad(400, "linguagem inválida");
  if (source.length > MAX_SOURCE) return bad(413, `código maior que ${MAX_SOURCE / 1024} KB`);
  if (stdin !== undefined && (typeof stdin !== "string" || stdin.length > MAX_STDIN)) return bad(413, "stdin inválido ou grande demais");

  const challenge = await getChallenge(slug);
  if (!challenge) return bad(404, "desafio não encontrado");
  if (!challenge.languages.includes(language)) return bad(400, `${language} não é permitida neste desafio`);

  const user = await getCurrentUser();
  // A torre tranca por andar. Convidado é travado só no navegador (o progresso dele mora lá).
  if (user) {
    const [tower, progress] = await Promise.all([getTowerData(), getProgressSummary(user.id)]);
    const lock = lockInfo(tower, progress.map, slug);
    if (lock) return bad(403, `andar ${lock.floor} trancado: resolva mais ${lock.missing} desafio(s) do andar ${lock.from}`);
  }
  const limit = rateLimit(user ? `user:${user.id}` : `ip:${clientKey(req.headers)}`, Number(process.env.RUN_RATE_PER_MINUTE ?? 20));
  if (!limit.ok) {
    return bad(429, `muitas execuções; tente de novo em ${limit.retryAfterS}s`, { "retry-after": String(limit.retryAfterS) });
  }

  const { flags: okFlags, rejected } = sanitizeFlags(flags);

  // Shader e canvas: o navegador roda e manda os frames; nada de runner aqui.
  if (challenge.kind === "shader" || challenge.kind === "canvas") {
    if (mode === "run") return bad(400, "rode :run direto no navegador");
    return framesRun(challenge, mode, language, body.frames, source);
  }

  // Veredito do navegador (modo "client"): ele compilou e rodou todos os testes,
  // inclusive os ocultos; o servidor não executa nada, só registra a solução.
  if (body.verdict !== undefined) {
    if (submitVerify() === "server") return bad(400, "este servidor confere os testes ocultos: mande o .wasm");
    if (mode !== "submit") return bad(400, "veredito só vale no submit");
    if (language !== "c" && language !== "cpp") return bad(400, "veredito do navegador só vale para C e C++");
    const v = body.verdict as { allPassed?: unknown; timesMs?: unknown };
    const times = Array.isArray(v?.timesMs) ? v.timesMs.slice(0, 200).map((t) => (typeof t === "number" && Number.isFinite(t) && t >= 0 ? Math.round(t) : null)) : [];
    if (v?.allPassed !== true || times.length !== challenge.tests.length) return bad(400, "veredito inválido");
    const response: RunResponse = { mode: "submit", compile: { ok: true, output: "" }, tests: [], allPassed: true, warnings: [] };
    if (user) {
      const daily = await getDaily();
      response.awarded = (await recordSolve(user.id, challenge, daily?.challengeId === challenge.id)) ?? 0;
      await recordSubmission(user.id, challenge.id, language, source, times);
    }
    return NextResponse.json(response);
  }

  // C/C++ compilado no navegador: o servidor não compila nada, só executa o .wasm.
  // Sem `wasm` (CLI, navegador sem SharedArrayBuffer) cai no runner de sempre.
  let runner: Runner;
  if (body.wasm !== undefined) {
    if (language !== "c" && language !== "cpp") return bad(400, "wasm só vale para C e C++");
    if (typeof body.wasm !== "string" || body.wasm.length > (MAX_WASM_BYTES * 4) / 3 + 4) return bad(413, "wasm inválido ou grande demais");
    const wasm = new Uint8Array(Buffer.from(body.wasm, "base64"));
    const problem = wasmProblem(wasm, challenge.memoryLimitMb);
    if (problem) return bad(400, `binário recusado: ${problem}`);
    runner = new WasmModuleRunner(wasm);
  } else {
    try {
      runner = getRunner();
    } catch (e) {
      return bad(502, `runner indisponível: ${(e as Error).message}`);
    }
  }

  // `publicPassed`: o navegador já rodou os públicos no mesmo .wasm, então o
  // servidor executa só os ocultos (os únicos que o cliente não pode ver).
  // Sem ocultos, roda tudo: algum teste o servidor precisa ver antes de pontuar.
  const hiddenOnly = runner instanceof WasmModuleRunner && mode === "submit" && body.publicPassed === true && challenge.tests.some((t) => t.hidden);
  const tests =
    mode === "run"
      ? [{ name: "stdin", input: stdin ?? "", expected: "", hidden: false }]
      : challenge.tests.filter((t) => (hiddenOnly ? t.hidden : mode === "submit" || !t.hidden));

  try {
    const result = await semaphore.run(() => judge(runner, challenge, language, source, tests, okFlags));
    const warnings = [...result.warnings, ...flagWarnings(runner, okFlags, rejected)];

    const response: RunResponse =
      mode === "run"
        ? { mode, compile: result.compile, run: result.tests[0] ?? null, warnings }
        : { mode, compile: result.compile, tests: result.tests.map(redact), allPassed: result.allPassed, warnings };
    if (mode === "submit" && result.allPassed && user && response.mode === "submit") {
      const daily = await getDaily();
      response.awarded = (await recordSolve(user.id, challenge, daily?.challengeId === challenge.id)) ?? 0;
      // Guarda o código aprovado: "soluções dos outros" e recordes de tamanho e tempo.
      await recordSubmission(user.id, challenge.id, language, source, result.tests.map((t) => t.timeMs));
    }
    return NextResponse.json(response);
  } catch (e) {
    console.error("[run]", e);
    return bad(502, `runner indisponível: ${(e as Error).message}`);
  }
}

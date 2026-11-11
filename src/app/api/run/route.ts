import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import { isLanguageId } from "@/lib/languages";
import { parsePpm, type PpmImage } from "@/lib/ppm";
import { judge, type TestOutcome } from "@/lib/judge/judge";
import { getRunner, flagWarnings, sanitizeFlags } from "@/lib/runner";
import { getCurrentUser } from "@/lib/auth/session";
import { getDaily } from "@/lib/daily";
import { recordSolve } from "@/lib/progress";
import { recordSubmission } from "@/lib/records";
import { clientKey, rateLimit, Semaphore } from "@/lib/rate-limit";
import type { RunResponse } from "@/lib/run-api";

export const runtime = "nodejs";

const MAX_SOURCE = 64 * 1024;
const MAX_STDIN = 256 * 1024;
const semaphore = new Semaphore(Number(process.env.RUN_MAX_CONCURRENCY ?? 4));

function bad(status: number, error: string, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers });
}

// Testes ocultos: o aluno só vê nome, veredito e tempo, nunca entrada/saída.
function redact(t: TestOutcome): TestOutcome {
  if (!t.hidden) return t;
  return { ...t, input: "", expected: "", stdout: "", stderr: "", message: t.verdict === "AC" ? undefined : t.message };
}

/** Quantas cores distintas a imagem tem (para no limite dado). */
function distinctColors(img: PpmImage, stopAt = 2): number {
  const seen = new Set<number>();
  for (let i = 0; i < img.data.length && seen.size <= stopAt; i += 3) {
    seen.add((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]);
  }
  return seen.size;
}

/**
 * Desafios de shader: rodam no navegador, então o :test/:submit manda os frames
 * renderizados (PPM P3, iTime fixo). O servidor confere que o shader desenha
 * algo — não aceitamos uma tela de cor única — e registra a solução como nos
 * desafios stdio.
 */
async function shaderRun(challenge: NonNullable<Awaited<ReturnType<typeof getChallenge>>>, mode: string, frames: unknown, source: string) {
  const parsed = (Array.isArray(frames) ? frames : []).slice(0, 2).map((f) => (typeof f === "string" ? f : null));
  if (!parsed.length || parsed.some((f) => f === null || f.length > 512 * 1024)) return bad(400, "frames ausentes ou grandes demais");
  let images: PpmImage[];
  try {
    images = parsed.map((f) => parsePpm(f as string));
  } catch (e) {
    return bad(400, `frame inválido: ${(e as Error).message}`);
  }
  const pass = images.some((img) => distinctColors(img) >= 2);
  const test: TestOutcome = {
    name: "frame 128x128 em t=0 e t=3",
    hidden: false,
    verdict: pass ? "AC" : "WA",
    message: pass ? undefined : "compila, mas desenha uma tela de cor única — o efeito pedido não aparece",
    timeMs: null,
    memoryKb: null,
    exitCode: 0,
    input: "",
    expected: "",
    stdout: parsed[0] as string,
    stderr: "",
  };
  const response: RunResponse = { mode: mode as "test" | "submit", compile: { ok: true, output: "" }, tests: [test], allPassed: pass, warnings: [] };
  const user = await getCurrentUser();
  if (mode === "submit" && pass && user) {
    const daily = await getDaily();
    response.awarded = (await recordSolve(user.id, challenge, daily?.challengeId === challenge.id)) ?? 0;
    await recordSubmission(user.id, challenge.id, "glsl", source, [null]);
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
  if (challenge.kind === "canvas") return bad(400, "este desafio roda no navegador (WASM)");
  if (!challenge.languages.includes(language)) return bad(400, `${language} não é permitida neste desafio`);

  const user = await getCurrentUser();
  const limit = rateLimit(user ? `user:${user.id}` : `ip:${clientKey(req.headers)}`, Number(process.env.RUN_RATE_PER_MINUTE ?? 20));
  if (!limit.ok) {
    return bad(429, `muitas execuções; tente de novo em ${limit.retryAfterS}s`, { "retry-after": String(limit.retryAfterS) });
  }

  const { flags: okFlags, rejected } = sanitizeFlags(flags);

  // Shader: o cliente renderiza os frames e manda o PPM; nada de runner aqui.
  if (challenge.kind === "shader") {
    if (mode === "run") return bad(400, "rode :run direto no navegador");
    return shaderRun(challenge, mode, body.frames, source);
  }

  const tests =
    mode === "run"
      ? [{ name: "stdin", input: stdin ?? "", expected: "", hidden: false }]
      : challenge.tests.filter((t) => mode === "submit" || !t.hidden);

  try {
    const runner = getRunner();
    const result = await semaphore.run(() => judge(runner, challenge, language, source, tests, okFlags));
    const warnings = flagWarnings(runner, okFlags, rejected);

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

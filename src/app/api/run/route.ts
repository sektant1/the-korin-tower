import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import { isLanguageId } from "@/lib/languages";
import { judge, type TestOutcome } from "@/lib/judge/judge";
import { getRunner, sanitizeFlags } from "@/lib/runner";
import { getCurrentUser } from "@/lib/auth/session";
import { recordSolve } from "@/lib/progress";
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
  if (challenge.kind !== "stdio") return bad(400, "este desafio roda no navegador");
  if (!challenge.languages.includes(language)) return bad(400, `${language} não é permitida neste desafio`);

  const user = await getCurrentUser();
  const limit = rateLimit(user ? `user:${user.id}` : `ip:${clientKey(req.headers)}`, Number(process.env.RUN_RATE_PER_MINUTE ?? 20));
  if (!limit.ok) {
    return bad(429, `muitas execuções; tente de novo em ${limit.retryAfterS}s`, { "retry-after": String(limit.retryAfterS) });
  }

  const { flags: okFlags, rejected } = sanitizeFlags(flags);
  const tests =
    mode === "run"
      ? [{ name: "stdin", input: stdin ?? "", expected: "", hidden: false }]
      : challenge.tests.filter((t) => mode === "submit" || !t.hidden);

  try {
    const runner = getRunner();
    const result = await semaphore.run(() => judge(runner, challenge, language, source, tests, okFlags));
    const warnings: string[] = [];
    if (rejected.length) warnings.push(`flags ignoradas (não permitidas): ${rejected.join(" ")}`);
    if (okFlags.length && runner.name === "piston") warnings.push("o runner Piston usa flags fixas; suas flags foram ignoradas");

    const response: RunResponse =
      mode === "run"
        ? { mode, compile: result.compile, run: result.tests[0] ?? null, warnings }
        : { mode, compile: result.compile, tests: result.tests.map(redact), allPassed: result.allPassed, warnings };
    if (mode === "submit" && result.allPassed && user && response.mode === "submit") {
      response.awarded = (await recordSolve(user.id, challenge)) ?? 0;
    }
    return NextResponse.json(response);
  } catch (e) {
    console.error("[run]", e);
    return bad(502, `runner indisponível: ${(e as Error).message}`);
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { judge } from "@/lib/judge/judge";
import { LANGUAGES, isLanguageId } from "@/lib/languages";
import { clientKey, rateLimit, Semaphore } from "@/lib/rate-limit";
import { flagWarnings, getRunner, sanitizeFlags } from "@/lib/runner";
import type { RunResponse } from "@/lib/run-api";

export const runtime = "nodejs";

// Compilador livre (/compilador): compila e executa um fonte solto, sem desafio.
// Mesmo runner, mesmo rate limit e mesmo formato de resposta do mode "run"
// (o painel de saída do cliente é reusado por cima).
const MAX_SOURCE = 64 * 1024; // igual a /api/run
const MAX_STDIN = 256 * 1024;
const TIME_LIMIT_MS = 5000; // folga maior que nos desafios: aqui ninguém está competindo
const semaphore = new Semaphore(Number(process.env.RUN_MAX_CONCURRENCY ?? 4));

function bad(status: number, error: string, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad(400, "JSON inválido");
  }
  const { language, source, stdin, flags } = body;
  if (!isLanguageId(language)) return bad(400, "linguagem inválida");
  if (!LANGUAGES[language].piston) return bad(400, "GLSL roda no navegador; escolha outra linguagem");
  if (typeof source !== "string") return bad(400, "source é obrigatório");
  if (source.length > MAX_SOURCE) return bad(413, `código maior que ${MAX_SOURCE / 1024} KB`);
  if (stdin !== undefined && (typeof stdin !== "string" || stdin.length > MAX_STDIN)) return bad(413, "stdin inválido ou grande demais");

  // Mesmo limite por minuto de /api/run (por usuário logado ou IP), com chave própria.
  const user = await getCurrentUser();
  const limit = rateLimit(user ? `pg:user:${user.id}` : `pg:ip:${clientKey(req.headers)}`, Number(process.env.RUN_RATE_PER_MINUTE ?? 20));
  if (!limit.ok) {
    return bad(429, `muitas execuções; tente de novo em ${limit.retryAfterS}s`, { "retry-after": String(limit.retryAfterS) });
  }

  const { flags: okFlags, rejected } = sanitizeFlags(flags);
  try {
    const runner = getRunner();
    const result = await semaphore.run(() =>
      judge(
        runner,
        { checker: { type: "exact" }, timeLimitMs: TIME_LIMIT_MS, memoryLimitMb: 256 },
        language,
        source,
        [{ name: "stdin", input: typeof stdin === "string" ? stdin : "", expected: "", hidden: false }],
        okFlags,
      ),
    );
    const response: RunResponse = {
      mode: "run",
      compile: result.compile,
      run: result.tests[0] ?? null,
      warnings: flagWarnings(runner, okFlags, rejected),
    };
    return NextResponse.json(response);
  } catch (e) {
    console.error("[playground]", e);
    return bad(502, `runner indisponível: ${(e as Error).message}`);
  }
}

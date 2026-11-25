import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import { acceptsFlags, isLanguageId, LANGUAGES } from "@/lib/languages";
import { getCurrentUser } from "@/lib/auth/session";
import { getDaily } from "@/lib/daily";
import { getProgressSummary, recordSolve } from "@/lib/progress";
import { lockInfo } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";
import { recordSubmission } from "@/lib/records";
import { syncAchievementsQuietly } from "@/lib/achievements-server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { forDisplay, type RunResponse } from "@/lib/run-api";
import { DeadlineError, withHarness } from "@/lib/runner/code-runner";
import { sanitizeFlags } from "@/lib/runner/flags";
import { getServerRunner, SERVER_LANGUAGES } from "@/lib/runner/server";
import type { TestCase } from "@/lib/runner/types";

// Quem roda o quê (src/lib/runner/README.md):
//   C, C++, Rust -> aqui, no Compiler Explorer. O navegador manda só o código; os
//                   testes (até MBs de entrada) e os ocultos nunca saem do servidor.
//   Python       -> no navegador (Pyodide). Aqui só chega o veredito, para registrar.
export const runtime = "nodejs";
// O motor tem prazo de 5 s; o resto é banco. Folga para a fila do Compiler Explorer.
export const maxDuration = 30;

const MAX_SOURCE = 64 * 1024;
const MAX_STDIN = 256 * 1024;

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
  const { slug, language, source, stdin, mode, flags } = body;
  if (typeof slug !== "string" || typeof source !== "string") return bad(400, "slug e source são obrigatórios");
  if (mode !== "run" && mode !== "test" && mode !== "submit") return bad(400, "mode deve ser run, test ou submit");
  if (!isLanguageId(language)) return bad(400, "linguagem inválida");
  if (source.length > MAX_SOURCE) return bad(413, `código maior que ${MAX_SOURCE / 1024} KB`);
  if (stdin !== undefined && (typeof stdin !== "string" || stdin.length > MAX_STDIN)) return bad(413, "stdin inválido ou grande demais");

  const challenge = await getChallenge(slug);
  if (!challenge) return bad(404, "desafio não encontrado");
  if (!challenge.languages.includes(language)) return bad(400, `${LANGUAGES[language].label} não é permitida neste desafio`);

  const user = await getCurrentUser();
  // A torre tranca por andar. Convidado é travado só no navegador (o progresso dele mora lá).
  if (user) {
    const [tower, progress] = await Promise.all([getTowerData(), getProgressSummary(user.id)]);
    const lock = lockInfo(tower, progress.map, slug);
    if (lock) return bad(403, `andar ${lock.floor} trancado: resolva mais ${lock.missing} desafio(s) do andar ${lock.from}`);
  }
  const limit = rateLimit(user ? `user:${user.id}` : `ip:${clientKey(req.headers)}`, Number(process.env.RUN_RATE_PER_MINUTE ?? 20));
  if (!limit.ok) return bad(429, `muitas execuções; tente de novo em ${limit.retryAfterS}s`, { "retry-after": String(limit.retryAfterS) });

  const award = async (times: (number | null)[]) => {
    if (!user) return undefined;
    const daily = await getDaily();
    const pts = (await recordSolve(user.id, challenge, daily?.challengeId === challenge.id)) ?? 0;
    // Guarda o código aprovado: "soluções dos outros" e recordes de tamanho e tempo.
    await recordSubmission(user.id, challenge.id, language, source, times);
    await syncAchievementsQuietly(user.id);
    return pts;
  };

  // Python: o navegador julgou todos os testes (ocultos pelo hash) e manda o veredito.
  if (body.verdict !== undefined) {
    if (language !== "python") return bad(400, "veredito do navegador só vale para Python");
    if (mode !== "submit") return bad(400, "veredito só vale no submit");
    const v = body.verdict as { allPassed?: unknown; timesMs?: unknown };
    const times = Array.isArray(v?.timesMs) ? v.timesMs.slice(0, 200).map((t) => (typeof t === "number" && Number.isFinite(t) && t >= 0 ? Math.round(t) : null)) : [];
    if (v?.allPassed !== true || times.length !== challenge.tests.length) return bad(400, "veredito inválido");
    const response: RunResponse = { mode: "submit", compile: { ok: true, output: "" }, tests: [], allPassed: true, warnings: [] };
    response.awarded = await award(times);
    return NextResponse.json(response);
  }

  if (!SERVER_LANGUAGES.includes(language)) return bad(400, `${LANGUAGES[language].label} roda no navegador (na CLI: korin test --local)`);

  const { flags: okFlags, rejected } = acceptsFlags(language) ? sanitizeFlags(flags) : { flags: [], rejected: [] };
  const driver = challenge.drivers[language];
  const code = driver ? withHarness(language, source, driver) : source;
  const tests: TestCase[] =
    mode === "run"
      ? [{ name: "stdin", input: stdin ?? "", expected: "", hidden: false }]
      : challenge.tests.filter((t) => mode === "submit" || !t.hidden).map((t) => ({ name: t.name, input: t.input, expected: t.expected, hidden: t.hidden }));

  try {
    const result = await getServerRunner().runAndTest(code, language, tests, { checker: challenge.checker, timeLimitMs: challenge.timeLimitMs, flags: okFlags });
    const warnings = [...result.warnings, ...(rejected.length ? [`flags ignoradas (não permitidas): ${rejected.join(" ")}`] : [])];
    if (mode === "run") return NextResponse.json({ mode, compile: result.compile, run: result.tests[0] ? forDisplay(result.tests[0]) : null, warnings, wallMs: result.wallMs } satisfies RunResponse);
    const response: RunResponse = { mode, compile: result.compile, tests: result.tests.map(forDisplay), allPassed: result.compile.ok && result.allPassed, warnings, wallMs: result.wallMs };
    if (mode === "submit" && response.allPassed) response.awarded = await award(result.tests.map((t) => t.timeMs));
    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof DeadlineError) return bad(504, `${e.message}; tente de novo (o Compiler Explorer pode estar com fila)`);
    console.error("[run]", e);
    return bad(502, (e as Error).message);
  }
}

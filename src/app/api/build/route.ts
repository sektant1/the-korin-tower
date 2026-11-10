import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { isCanvasLanguage } from "@/lib/languages";
import { clientKey, rateLimit, Semaphore } from "@/lib/rate-limit";
import { BuilderUnavailable, buildWasm, type WasmBuild } from "@/lib/wasm-builder";

export const runtime = "nodejs";

// Fase 4: compila um desafio "canvas" (C/C++ com raylib/SDL2) para WASM.
// O JS devolvido roda no navegador de quem pediu, dentro de um iframe isolado.
const MAX_SOURCE = 64 * 1024;
const semaphore = new Semaphore(Number(process.env.BUILD_MAX_CONCURRENCY ?? 2));

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
  const { slug, language, source } = body;
  if (typeof slug !== "string" || typeof source !== "string") return bad(400, "slug e source são obrigatórios");
  if (!isCanvasLanguage(language)) return bad(400, "linguagem inválida (use c ou cpp)");
  if (source.length > MAX_SOURCE) return bad(413, `código maior que ${MAX_SOURCE / 1024} KB`);

  const challenge = await getChallenge(slug);
  if (!challenge) return bad(404, "desafio não encontrado");
  if (challenge.kind !== "canvas") return bad(400, "este desafio não roda no canvas");
  if (!challenge.languages.includes(language)) return bad(400, `${language} não é permitida neste desafio`);

  // Mesmo balde do /api/run: compilar é tão caro quanto executar.
  const user = await getCurrentUser();
  const limit = rateLimit(user ? `user:${user.id}` : `ip:${clientKey(req.headers)}`, Number(process.env.RUN_RATE_PER_MINUTE ?? 20));
  if (!limit.ok) {
    return bad(429, `muitas execuções; tente de novo em ${limit.retryAfterS}s`, { "retry-after": String(limit.retryAfterS) });
  }

  try {
    const result: WasmBuild = await semaphore.run(() => buildWasm(language, source));
    return NextResponse.json(result);
  } catch (e) {
    if (!(e instanceof BuilderUnavailable)) console.error("[build]", e);
    return bad(502, `construtor indisponível: ${(e as Error).message}`);
  }
}

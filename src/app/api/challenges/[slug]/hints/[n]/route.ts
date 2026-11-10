import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { renderMarkdown } from "@/lib/markdown";
import { recordHint } from "@/lib/progress";

// Dicas saem uma por vez, para não estarem no HTML da página.
// Com login, cada dica revelada antes de resolver reduz os pontos (src/lib/scoring.ts).
// POST (e não GET) porque registra no progresso: um link não consegue gastar dicas de ninguém.
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await ctx.params;
  const c = await getChallenge(slug);
  if (!c) return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  const i = Number(n);
  if (!Number.isInteger(i) || i < 0 || i >= c.hints.length) {
    return NextResponse.json({ error: "dica inexistente" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (user) await recordHint(user.id, c.id, i);
  return NextResponse.json({ index: i, total: c.hints.length, html: await renderMarkdown(c.hints[i]) });
}

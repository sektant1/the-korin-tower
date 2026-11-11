import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { getDaily } from "@/lib/daily";
import { LANGUAGES } from "@/lib/languages";
import { getChallengeProgress } from "@/lib/progress";

// `korin pick`/`korin show`: enunciado em Markdown cru, templates, testes públicos
// e, com token, o rascunho salvo na conta. Testes ocultos nunca saem daqui.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const c = await getChallenge(slug);
  if (!c) return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  const [user, daily] = await Promise.all([getCurrentUser(), getDaily()]);
  const progress = user ? await getChallengeProgress(user.id, c.id) : null;
  return NextResponse.json({
    slug: c.slug,
    title: c.title,
    category: c.categoryId,
    difficulty: c.difficulty,
    kind: c.kind,
    tags: c.tags,
    languages: c.languages,
    files: Object.fromEntries(c.languages.map((l) => [l, LANGUAGES[l].file])),
    timeLimitMs: c.timeLimitMs,
    memoryLimitMb: c.memoryLimitMb,
    hintsTotal: c.hints.length,
    statement: c.statement,
    templates: c.templates,
    publicTests: c.tests.filter((t) => !t.hidden).map((t) => ({ name: t.name, input: t.input, expected: t.expected })),
    hiddenTests: c.tests.filter((t) => t.hidden).length,
    isDaily: daily?.slug === c.slug,
    state: progress?.state ?? null,
    hintsRevealed: progress?.hintsRevealed ?? 0,
    drafts: progress?.drafts ?? {},
  });
}

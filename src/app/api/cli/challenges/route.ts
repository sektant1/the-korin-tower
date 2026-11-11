import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories, listChallenges } from "@/lib/challenges";
import { getDaily } from "@/lib/daily";
import { getProgressSummary } from "@/lib/progress";
import { FLOOR_NAMES, floorOf, floors, isOpen } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";

// `korin list`: todos os desafios, com o estado do jogador quando há token.
// Público sem token (a lista já aparece no site sem login).
export async function GET(req: Request) {
  const category = new URL(req.url).searchParams.get("category") ?? undefined;
  const [challenges, categories, daily, user, tower] = await Promise.all([listChallenges(category), listCategories(), getDaily(), getCurrentUser(), getTowerData()]);
  const progress = user ? (await getProgressSummary(user.id)).map : {};
  return NextResponse.json({
    daily: daily?.slug ?? null,
    floors: floors(tower, progress).map((f) => ({ n: f.n, name: FLOOR_NAMES[f.n], open: f.open, solved: f.solved, scored: f.scored, total: f.total, missingForNext: f.missingForNext })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, count: c.count })),
    challenges: challenges.map((c) => ({
      slug: c.slug,
      title: c.title,
      category: c.categoryId,
      difficulty: c.difficulty,
      floor: floorOf(c),
      // sem token não há progresso: nada aparece trancado
      locked: user ? !isOpen(tower, progress, c.slug) : false,
      kind: c.kind,
      languages: c.languages,
      tags: c.tags,
      state: progress[c.slug] ?? null,
    })),
  });
}

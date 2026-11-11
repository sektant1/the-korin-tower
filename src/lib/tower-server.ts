import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getDaily } from "@/lib/daily";
import type { ChallengeKind } from "@/lib/languages";
import type { TowerData } from "@/lib/tower";

/** Manifesto da torre: tudo que as regras de progressão precisam, memoizado por requisição. */
export const getTowerData = cache(async (): Promise<TowerData> => {
  const [challenges, tracks, daily] = await Promise.all([
    prisma.challenge.findMany({
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }, { difficulty: "asc" }, { title: "asc" }],
      select: { slug: true, title: true, difficulty: true, kind: true, categoryId: true, category: { select: { name: true } } },
    }),
    prisma.track.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true, steps: true } }),
    getDaily(),
  ]);
  return {
    challenges: challenges.map((c) => ({
      slug: c.slug,
      title: c.title,
      difficulty: c.difficulty,
      kind: c.kind as ChallengeKind,
      categoryId: c.categoryId,
      categoryName: c.category.name,
    })),
    tracks: tracks.map((t) => ({ id: t.id, title: t.title, steps: t.steps as string[] })),
    daily: daily?.slug ?? null,
  };
});

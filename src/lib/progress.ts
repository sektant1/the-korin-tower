import "server-only";
import { prisma } from "@/lib/db";
import { isLanguageId, type LanguageId } from "@/lib/languages";
import { pointsFor } from "@/lib/scoring";

// Progresso e rascunhos por usuário (Fase 2). O servidor é a fonte da verdade:
// só /api/run marca "solved", e a solução só sai para quem resolveu ou desistiu.
export type ProgressState = "solved" | "gaveup";

const key = (userId: string, challengeId: string) => ({ userId_challengeId: { userId, challengeId } });

export async function getProgressSummary(userId: string) {
  const rows = await prisma.progress.findMany({
    where: { userId, state: { not: null } },
    select: { state: true, points: true, challenge: { select: { slug: true } } },
  });
  const map: Record<string, ProgressState> = {};
  let points = 0;
  for (const r of rows) {
    map[r.challenge.slug] = r.state as ProgressState;
    points += r.points;
  }
  return { map, points };
}

/** Estado do usuário num desafio, para montar a página (rascunhos, dicas, status). */
export async function getChallengeProgress(userId: string, challengeId: string) {
  const [p, drafts] = await Promise.all([
    prisma.progress.findUnique({ where: key(userId, challengeId) }),
    prisma.draft.findMany({ where: { userId, challengeId }, select: { language: true, code: true } }),
  ]);
  const codes: Partial<Record<LanguageId, string>> = {};
  for (const d of drafts) if (isLanguageId(d.language)) codes[d.language] = d.code;
  return { state: (p?.state ?? null) as ProgressState | null, hintsRevealed: p?.hintsRevealed ?? 0, drafts: codes };
}

/** Marca como resolvido. Retorna os pontos ganhos, ou null se já estava resolvido. */
export async function recordSolve(userId: string, challenge: { id: string; difficulty: number }): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    const p = await tx.progress.findUnique({ where: key(userId, challenge.id) });
    if (p?.state === "solved") return null;
    const points = pointsFor(challenge.difficulty, p?.hintsRevealed ?? 0, p?.gaveUp ?? false);
    const data = { state: "solved", points, solvedAt: new Date() };
    await tx.progress.upsert({ where: key(userId, challenge.id), create: { userId, challengeId: challenge.id, ...data }, update: data });
    return points;
  });
}

/** Desistir libera a solução e zera os pontos daquele desafio (se ainda não resolvido). */
export async function recordGiveUp(userId: string, challengeId: string) {
  const p = await prisma.progress.findUnique({ where: key(userId, challengeId) });
  if (p?.state === "solved") return;
  await prisma.progress.upsert({
    where: key(userId, challengeId),
    create: { userId, challengeId, state: "gaveup", gaveUp: true },
    update: { state: "gaveup", gaveUp: true },
  });
}

/** Dica n (0-based) revelada. Depois de resolver não conta mais (não tira pontos). */
export async function recordHint(userId: string, challengeId: string, index: number) {
  const p = await prisma.progress.findUnique({ where: key(userId, challengeId) });
  if (p?.state === "solved" || (p && p.hintsRevealed > index)) return;
  await prisma.progress.upsert({
    where: key(userId, challengeId),
    create: { userId, challengeId, hintsRevealed: index + 1 },
    update: { hintsRevealed: index + 1 },
  });
}

export async function canSeeSolution(user: { id: string; isAdmin: boolean }, challengeId: string) {
  if (user.isAdmin) return true;
  const p = await prisma.progress.findUnique({ where: key(user.id, challengeId), select: { state: true } });
  return p?.state === "solved" || p?.state === "gaveup";
}

export async function saveDraft(userId: string, challengeId: string, language: LanguageId, code: string) {
  await prisma.draft.upsert({
    where: { userId_challengeId_language: { userId, challengeId, language } },
    create: { userId, challengeId, language, code },
    update: { code },
  });
}

export async function deleteDraft(userId: string, challengeId: string, language: LanguageId) {
  await prisma.draft.deleteMany({ where: { userId, challengeId, language } });
}

export interface HallEntry {
  username: string;
  points: number;
  solved: number;
}

/** Ranking: mais pontos primeiro; empate fica com quem chegou lá antes. */
export async function hallOfFame(limit: number): Promise<HallEntry[]> {
  const groups = await prisma.progress.groupBy({
    by: ["userId"],
    where: { state: "solved" },
    _sum: { points: true },
    _count: { _all: true },
    _max: { solvedAt: true },
    orderBy: [{ _sum: { points: "desc" } }, { _max: { solvedAt: "asc" } }],
    take: limit,
  });
  const users = await prisma.user.findMany({ where: { id: { in: groups.map((g) => g.userId) } }, select: { id: true, username: true } });
  const names = new Map(users.map((u) => [u.id, u.username]));
  return groups.map((g) => ({ username: names.get(g.userId) ?? "???", points: g._sum.points ?? 0, solved: g._count._all }));
}

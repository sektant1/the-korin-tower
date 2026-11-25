import "server-only";
import { getAchievement, earnedAchievementIds, isEventAchievement, type AchievementStats } from "@/lib/achievements";
import { computeStreak, siteDay, siteHour, type Streak } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { countRecordsHeld } from "@/lib/records";
import { countTracksDone } from "@/lib/tracks";
import { currentFloor } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";

// Conquistas persistidas: calcula o que o jogador já merece, grava o que é novo e guarda
// quem ainda não viu o aviso (seenAt = null). O layout lê os pendentes e o cliente mostra
// o toast. Chame syncAchievements depois de qualquer coisa que possa liberar uma conquista.

export interface PlayerStats extends AchievementStats {
  streak: Streak;
}

/** Tudo que as regras de conquista olham, a partir do banco. */
export async function collectStats(userId: string): Promise<PlayerStats> {
  const [solved, guestbook, comments, records, tower, all] = await Promise.all([
    prisma.progress.findMany({
      where: { userId, state: "solved" },
      select: { points: true, hintsRevealed: true, dailyBonus: true, solvedAt: true, challenge: { select: { slug: true, difficulty: true, categoryId: true } } },
    }),
    prisma.guestbookEntry.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
    countRecordsHeld(userId),
    getTowerData(),
    prisma.progress.findMany({ where: { userId, state: { not: null } }, select: { state: true, challenge: { select: { slug: true } } } }),
  ]);
  const streak = computeStreak(solved.flatMap((p) => (p.solvedAt ? [siteDay(p.solvedAt)] : [])), siteDay());
  const tracksDone = await countTracksDone(new Set(solved.map((p) => p.challenge.slug)));
  return {
    solved: solved.map((p) => ({
      categoryId: p.challenge.categoryId,
      difficulty: p.challenge.difficulty,
      hintsRevealed: p.hintsRevealed,
      dailyBonus: p.dailyBonus,
      hour: p.solvedAt ? siteHour(p.solvedAt) : null,
    })),
    points: solved.reduce((n, p) => n + p.points, 0),
    tracksDone,
    guestbookSigned: guestbook > 0,
    comments,
    bestStreak: streak.best,
    records,
    floorsOpen: currentFloor(tower, Object.fromEntries(all.map((p) => [p.challenge.slug, p.state as "solved" | "gaveup"]))),
    streak,
  };
}

/**
 * Grava as conquistas novas e devolve os ids delas. Na primeira conferência de uma conta
 * anterior ao sistema (achievementsSyncedAt nulo) grava tudo já como visto: ninguém
 * merece 15 toasts de uma vez por coisas que fez meses atrás.
 */
export async function syncAchievements(userId: string, stats?: AchievementStats): Promise<string[]> {
  const [user, have] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { achievementsSyncedAt: true } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  if (!user) return [];
  const owned = new Set(have.map((h) => h.achievementId));
  const earned = earnedAchievementIds(stats ?? (await collectStats(userId)));
  const fresh = earned.filter((id) => !owned.has(id));
  const silent = user.achievementsSyncedAt === null;
  const now = new Date();
  if (fresh.length) {
    await prisma.userAchievement.createMany({
      data: fresh.map((achievementId) => ({ userId, achievementId, unlockedAt: now, seenAt: silent ? now : null })),
      skipDuplicates: true, // duas abas resolvendo ao mesmo tempo
    });
  }
  await prisma.user.update({ where: { id: userId }, data: { achievementsSyncedAt: now } });
  return silent ? [] : fresh;
}

/** Conquista de evento (sem regra calculável). Devolve true se foi desbloqueada agora. */
export async function unlockEventAchievement(userId: string, achievementId: string): Promise<boolean> {
  if (!isEventAchievement(achievementId)) return false;
  const r = await prisma.userAchievement.createMany({ data: [{ userId, achievementId }], skipDuplicates: true });
  return r.count > 0;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: Date;
}

/** Conquistas gravadas, mais antigas primeiro. Ignora ids que saíram do código. */
export async function listUnlocked(userId: string): Promise<UnlockedAchievement[]> {
  const rows = await prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: "asc" }, select: { achievementId: true, unlockedAt: true } });
  return rows.filter((r) => getAchievement(r.achievementId)).map((r) => ({ id: r.achievementId, unlockedAt: r.unlockedAt }));
}

/** Ids com aviso pendente, na ordem em que foram ganhos. */
export async function listUnseen(userId: string): Promise<string[]> {
  const rows = await prisma.userAchievement.findMany({ where: { userId, seenAt: null }, orderBy: { unlockedAt: "asc" }, select: { achievementId: true } });
  return rows.map((r) => r.achievementId).filter((id) => getAchievement(id));
}

export async function markSeen(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await prisma.userAchievement.updateMany({ where: { userId, achievementId: { in: ids }, seenAt: null }, data: { seenAt: new Date() } });
}

/** Para depois de uma ação que já deu certo: erro aqui vai para o log, não para o jogador. */
export async function syncAchievementsQuietly(userId: string): Promise<string[]> {
  try {
    return await syncAchievements(userId);
  } catch (e) {
    console.error("[achievements]", e);
    return [];
  }
}

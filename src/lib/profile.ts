import "server-only";
import { collectStats, listUnlocked, syncAchievements, type UnlockedAchievement } from "@/lib/achievements-server";
import type { Streak } from "@/lib/dates";
import { prisma } from "@/lib/db";

// Cartão do jogador: perfil público (/jogador/<nome>) e Minha conta.
export interface PlayerProfile {
  username: string;
  avatar: string | null;
  isAdmin: boolean;
  createdAt: Date;
  points: number;
  gaveUp: number;
  floorsOpen: number;
  streak: Streak;
  achievements: UnlockedAchievement[];
  solved: { slug: string; title: string; difficulty: number; points: number; dailyBonus: boolean; solvedAt: Date | null }[];
}

export async function getPlayerProfile(username: string): Promise<PlayerProfile | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, avatar: true, isAdmin: true, createdAt: true, achievementsSyncedAt: true },
  });
  if (!user) return null;
  const [progress, stats] = await Promise.all([
    prisma.progress.findMany({
      where: { userId: user.id, state: { not: null } },
      orderBy: { solvedAt: "desc" },
      select: { state: true, points: true, dailyBonus: true, solvedAt: true, challenge: { select: { slug: true, title: true, difficulty: true } } },
    }),
    collectStats(user.id),
  ]);
  // Conta de antes das conquistas: registra o que ela já tem (sem toast) antes de mostrar.
  if (user.achievementsSyncedAt === null) await syncAchievements(user.id, stats);
  const solved = progress.filter((p) => p.state === "solved");

  return {
    username: user.username,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    points: stats.points,
    gaveUp: progress.length - solved.length,
    floorsOpen: stats.floorsOpen,
    streak: stats.streak,
    achievements: await listUnlocked(user.id),
    solved: solved.map((p) => ({
      slug: p.challenge.slug,
      title: p.challenge.title,
      difficulty: p.challenge.difficulty,
      points: p.points,
      dailyBonus: p.dailyBonus,
      solvedAt: p.solvedAt,
    })),
  };
}

import "server-only";
import { earnedBadges, type Badge } from "@/lib/badges";
import { computeStreak, siteDay, type Streak } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { countRecordsHeld } from "@/lib/records";
import { countTracksDone } from "@/lib/tracks";

// Cartão do jogador: perfil público (/jogador/<nome>) e Minha conta.
export interface PlayerProfile {
  username: string;
  createdAt: Date;
  points: number;
  gaveUp: number;
  streak: Streak;
  badges: Badge[];
  solved: { slug: string; title: string; difficulty: number; points: number; dailyBonus: boolean; solvedAt: Date | null }[];
}

export async function getPlayerProfile(username: string): Promise<PlayerProfile | null> {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, createdAt: true } });
  if (!user) return null;
  const [progress, guestbook, comments, records] = await Promise.all([
    prisma.progress.findMany({
      where: { userId: user.id, state: { not: null } },
      orderBy: { solvedAt: "desc" },
      select: {
        state: true,
        points: true,
        hintsRevealed: true,
        dailyBonus: true,
        solvedAt: true,
        challenge: { select: { slug: true, title: true, difficulty: true, categoryId: true } },
      },
    }),
    prisma.guestbookEntry.count({ where: { userId: user.id } }),
    prisma.comment.count({ where: { userId: user.id } }),
    countRecordsHeld(user.id),
  ]);
  const solved = progress.filter((p) => p.state === "solved");
  const points = solved.reduce((n, p) => n + p.points, 0);
  const streak = computeStreak(solved.flatMap((p) => (p.solvedAt ? [siteDay(p.solvedAt)] : [])), siteDay());
  const tracksDone = await countTracksDone(new Set(solved.map((p) => p.challenge.slug)));

  return {
    username: user.username,
    createdAt: user.createdAt,
    points,
    gaveUp: progress.length - solved.length,
    streak,
    badges: earnedBadges({
      solved: solved.map((p) => ({ categoryId: p.challenge.categoryId, difficulty: p.challenge.difficulty, hintsRevealed: p.hintsRevealed, dailyBonus: p.dailyBonus })),
      points,
      tracksDone,
      guestbookSigned: guestbook > 0,
      comments,
      bestStreak: streak.best,
      records,
    }),
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

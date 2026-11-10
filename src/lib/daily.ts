import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { siteDay } from "@/lib/dates";

// Desafio do dia (Fase 5). Sorteado na primeira visita de cada dia e gravado, para não mudar
// se um desafio novo entrar no meio do dia. Resolver no próprio dia vale bônus (src/lib/scoring.ts).
const NO_REPEAT_DAYS = 7;

export interface Daily {
  day: string;
  challengeId: string;
  slug: string;
  title: string;
  difficulty: number;
}

const select = { day: true, challenge: { select: { id: true, slug: true, title: true, difficulty: true } } } as const;

/** Memoizado por requisição (layout, home e página do desafio pedem o mesmo dia). */
export const getDaily = cache(async (): Promise<Daily | null> => {
  const day = siteDay();
  let row = await prisma.dailyChallenge.findUnique({ where: { day }, select });
  if (!row) {
    // Só desafios com testes: os de navegador (shader, canvas) não têm "resolvido" automático.
    const recent = await prisma.dailyChallenge.findMany({ orderBy: { day: "desc" }, take: NO_REPEAT_DAYS, select: { challengeId: true } });
    const all = await prisma.challenge.findMany({ where: { kind: "stdio" }, select: { id: true } });
    if (!all.length) return null;
    const skip = new Set(recent.map((r) => r.challengeId));
    const fresh = all.filter((c) => !skip.has(c.id));
    const pool = fresh.length ? fresh : all;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // Duas visitas ao mesmo tempo: a segunda perde a corrida e lê o que a primeira gravou.
    await prisma.dailyChallenge.createMany({ data: [{ day, challengeId: pick.id }], skipDuplicates: true });
    row = await prisma.dailyChallenge.findUnique({ where: { day }, select });
    if (!row) return null;
  }
  const { id, ...c } = row.challenge;
  return { day: row.day, challengeId: id, ...c };
});

import "server-only";
import { prisma } from "@/lib/db";
import { isLanguageId, type LanguageId } from "@/lib/languages";

// Códigos aprovados dos jogadores. Cada submit aprovado substitui o anterior da mesma
// linguagem, então "soluções dos outros" e os recordes mostram sempre o último código aceito.

export async function recordSubmission(userId: string, challengeId: string, language: LanguageId, code: string, times: (number | null)[]) {
  const bytes = Buffer.byteLength(code, "utf8");
  // O pior teste é o que conta; se o runner não mediu algum, o tempo fica de fora do ranking.
  const timeMs = times.length && times.every((t) => t != null) ? Math.max(...(times as number[])) : null;
  await prisma.submission.upsert({
    where: { userId_challengeId_language: { userId, challengeId, language } },
    create: { userId, challengeId, language, code, bytes, timeMs },
    update: { code, bytes, timeMs },
  });
}

export interface PlayerSolution {
  username: string;
  language: LanguageId;
  code: string;
  bytes: number;
  timeMs: number | null;
  updatedAt: Date;
}

/** Só chame depois de `canSeeSolution`: isto entrega código que resolve o desafio. */
export async function listPlayerSolutions(challengeId: string): Promise<PlayerSolution[]> {
  const rows = await prisma.submission.findMany({
    where: { challengeId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { language: true, code: true, bytes: true, timeMs: true, updatedAt: true, user: { select: { username: true } } },
  });
  return rows.flatMap(({ user, language, ...r }) => (isLanguageId(language) ? [{ ...r, language, username: user.username }] : []));
}

export interface RecordRow {
  username: string;
  language: LanguageId;
  value: number;
}

export interface Records {
  shortest: RecordRow[]; // bytes
  fastest: RecordRow[]; // ms
}

const TOP = 5;

/** Placar público do desafio: nomes e números, nunca o código. Uma linha por jogador (a melhor). */
export async function getRecords(challengeId: string): Promise<Records> {
  const rows = await prisma.submission.findMany({
    where: { challengeId },
    select: { language: true, bytes: true, timeMs: true, updatedAt: true, user: { select: { username: true } } },
  });
  const top = (value: (r: (typeof rows)[number]) => number | null): RecordRow[] => {
    const best = new Map<string, RecordRow & { at: Date }>();
    for (const r of rows) {
      const v = value(r);
      if (v == null || !isLanguageId(r.language)) continue;
      const cur = best.get(r.user.username);
      if (!cur || v < cur.value) best.set(r.user.username, { username: r.user.username, language: r.language, value: v, at: r.updatedAt });
    }
    // Empate: fica na frente quem chegou primeiro.
    return [...best.values()]
      .sort((a, b) => a.value - b.value || a.at.getTime() - b.at.getTime())
      .slice(0, TOP)
      .map(({ at: _at, ...r }) => r);
  };
  return { shortest: top((r) => r.bytes), fastest: top((r) => r.timeMs) };
}

/** Em quantos desafios o jogador é o 1º em tamanho ou em tempo (medalha "Recordista"). */
export async function countRecordsHeld(userId: string): Promise<number> {
  const mine = await prisma.submission.findMany({ where: { userId }, select: { challengeId: true, bytes: true, timeMs: true } });
  if (!mine.length) return 0;
  const mins = await prisma.submission.groupBy({
    by: ["challengeId"],
    where: { challengeId: { in: [...new Set(mine.map((m) => m.challengeId))] } },
    _min: { bytes: true, timeMs: true },
  });
  const min = new Map(mins.map((m) => [m.challengeId, m._min]));
  const held = new Set<string>();
  for (const m of mine) {
    const best = min.get(m.challengeId);
    if (best && (m.bytes === best.bytes || (m.timeMs != null && m.timeMs === best.timeMs))) held.add(m.challengeId);
  }
  return held.size;
}

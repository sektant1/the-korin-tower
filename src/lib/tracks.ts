import "server-only";
import { isScored } from "@/lib/tower";
import { prisma } from "@/lib/db";
import type { ChallengeKind } from "@/lib/languages";

// Trilhas ("detonados"): vêm de challenges/tracks.yml pelo seed.
// Todo passo conta para zerar (stdio pelos testes; shader e canvas pelos frames).
export interface TrackStep {
  slug: string;
  title: string;
  difficulty: number;
  categoryName: string;
  /** conta para o progresso da trilha */
  scored: boolean;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  steps: TrackStep[];
}

async function withSteps(rows: { id: string; title: string; description: string; steps: unknown }[]): Promise<Track[]> {
  const slugs = [...new Set(rows.flatMap((r) => r.steps as string[]))];
  const challenges = await prisma.challenge.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, title: true, difficulty: true, kind: true, category: { select: { name: true } } },
  });
  const bySlug = new Map(challenges.map((c) => [c.slug, c]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    // Um desafio apagado depois do seed some da trilha em vez de quebrar a página.
    steps: (r.steps as string[]).flatMap((slug) => {
      const c = bySlug.get(slug);
      return c ? [{ slug, title: c.title, difficulty: c.difficulty, categoryName: c.category.name, scored: isScored({ kind: c.kind as ChallengeKind }) }] : [];
    }),
  }));
}

export async function listTracks(): Promise<Track[]> {
  return withSteps(await prisma.track.findMany({ orderBy: { order: "asc" } }));
}

export async function getTrack(id: string): Promise<Track | null> {
  const row = await prisma.track.findUnique({ where: { id } });
  return row ? (await withSteps([row]))[0] : null;
}

/** Quantas trilhas o conjunto de desafios resolvidos completa. */
export async function countTracksDone(solvedSlugs: Set<string>): Promise<number> {
  const tracks = await listTracks();
  return tracks.filter((t) => {
    const scored = t.steps.filter((s) => s.scored);
    return scored.length > 0 && scored.every((s) => solvedSlugs.has(s.slug));
  }).length;
}

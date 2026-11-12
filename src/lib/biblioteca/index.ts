import "server-only";
// Lê /biblioteca do disco (fonte de verdade versionada no git, como /challenges).
// Em produção lê uma vez por processo; em dev relê a cada pedido para o texto aparecer ao salvar.
import { getCurrentUser } from "@/lib/auth/session";
import { siteDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { loadLibrary, type Library } from "./load";
import { groupSeries, isPublished, meta, recentOrder, seriesOrder, type Doc, type DocMeta, type Series, type SeriesWithDocs } from "./parse";

export { LIBRARY_DIR } from "./load";

let cached: Promise<Library> | null = null;
function library(): Promise<Library> {
  if (process.env.NODE_ENV !== "production") return loadLibrary();
  cached ??= loadLibrary().catch((e) => {
    cached = null; // não guarda o erro: o próximo pedido tenta de novo
    throw e;
  });
  return cached;
}

/** Admin (e qualquer um em dev) vê rascunhos e posts agendados, marcados como tal. */
export async function canSeeDrafts(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  return (await getCurrentUser())?.isAdmin ?? false;
}

async function visible(drafts?: boolean): Promise<{ docs: Doc[]; series: Series[] }> {
  const [lib, all] = await Promise.all([library(), drafts ?? canSeeDrafts()]);
  const today = siteDay();
  return { docs: all ? lib.docs : lib.docs.filter((d) => isPublished(d, today)), series: lib.series };
}

export async function listDocs(opts: { drafts?: boolean } = {}): Promise<DocMeta[]> {
  return (await visible(opts.drafts)).docs.map(meta).sort(recentOrder);
}

export async function listSeries(): Promise<SeriesWithDocs[]> {
  const { docs, series } = await visible();
  return groupSeries(series, docs.map(meta));
}

export async function getSeries(id: string): Promise<SeriesWithDocs | null> {
  return (await listSeries()).find((s) => s.id === id) ?? null;
}

export interface DocPage {
  doc: Doc;
  series: SeriesWithDocs | null;
  /** posição (0-based) do post na série */
  index: number;
  prev: DocMeta | null;
  next: DocMeta | null;
  /** mesma tag, fora da série: "leia também" */
  related: DocMeta[];
}

export async function getDocPage(slug: string): Promise<DocPage | null> {
  const { docs, series } = await visible();
  const doc = docs.find((d) => d.slug === slug);
  if (!doc) return null;
  const metas = docs.map(meta);
  const s = doc.series ? (groupSeries(series, metas).find((x) => x.id === doc.series) ?? null) : null;
  const parts = s?.docs ?? [];
  const index = parts.findIndex((d) => d.slug === slug);

  const tags = new Set(doc.tags);
  const related = metas
    .filter((d) => d.slug !== slug && (!s || d.series !== s.id))
    .map((d) => ({ d, score: d.tags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || recentOrder(a.d, b.d))
    .slice(0, 4)
    .map((x) => x.d);

  return { doc, series: s, index, prev: parts[index - 1] ?? null, next: parts[index + 1] ?? null, related };
}

/** Posts que citam um desafio em `challenges:` (para "leitura recomendada" na página do desafio). */
export async function docsForChallenge(slug: string): Promise<DocMeta[]> {
  try {
    return (await listDocs()).filter((d) => d.challenges.includes(slug)).sort(seriesOrder);
  } catch {
    return []; // biblioteca com erro não pode derrubar a página do desafio
  }
}

/** Título/dificuldade dos desafios citados; slugs inexistentes são ignorados. */
export async function challengeCards(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await prisma.challenge.findMany({ where: { slug: { in: slugs } }, select: { slug: true, title: true, difficulty: true } });
  const by = new Map(rows.map((r) => [r.slug, r]));
  return slugs.flatMap((s) => by.get(s) ?? []);
}

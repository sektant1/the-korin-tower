import "server-only";
import { prisma } from "@/lib/db";
import type { ChallengeKind, Checker, LanguageId } from "@/lib/languages";

// Os campos Json do Prisma chegam como `JsonValue`; aqui ficam tipados.
export interface ChallengeSummary {
  slug: string;
  title: string;
  categoryId: string;
  difficulty: number;
  tags: string[];
  kind: ChallengeKind;
  languages: LanguageId[];
  createdAt: Date;
}

const summarySelect = {
  slug: true,
  title: true,
  categoryId: true,
  difficulty: true,
  tags: true,
  kind: true,
  languages: true,
  createdAt: true,
} as const;

type SummaryRow = { [K in keyof typeof summarySelect]: unknown };

function toSummary(r: SummaryRow): ChallengeSummary {
  return {
    ...(r as ChallengeSummary),
    tags: r.tags as string[],
    languages: r.languages as LanguageId[],
  };
}

export async function listCategories() {
  const cats = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { challenges: true } } },
  });
  return cats.map(({ _count, ...c }) => ({ ...c, count: _count.challenges }));
}

export async function getCategory(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export async function listChallenges(categoryId?: string): Promise<ChallengeSummary[]> {
  const rows = await prisma.challenge.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }, { difficulty: "asc" }, { title: "asc" }],
    select: summarySelect,
  });
  return rows.map(toSummary);
}

export async function latestChallenges(n: number): Promise<ChallengeSummary[]> {
  const rows = await prisma.challenge.findMany({ orderBy: { createdAt: "desc" }, take: n, select: summarySelect });
  return rows.map(toSummary);
}

export async function getChallenge(slug: string) {
  const c = await prisma.challenge.findUnique({
    where: { slug },
    include: { category: true, tests: { orderBy: [{ hidden: "asc" }, { order: "asc" }] } },
  });
  if (!c) return null;
  return {
    ...c,
    kind: c.kind as ChallengeKind,
    tags: c.tags as string[],
    hints: c.hints as string[],
    languages: c.languages as LanguageId[],
    templates: c.templates as Partial<Record<LanguageId, string>>,
    solutions: c.solutions as Partial<Record<LanguageId, string>>,
    checker: c.checker as unknown as Checker,
  };
}

export type FullChallenge = NonNullable<Awaited<ReturnType<typeof getChallenge>>>;

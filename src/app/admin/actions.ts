"use server";
// Toda Server Function aqui é um endpoint público: cada uma confere admin por conta própria.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ChallengeInput, SaveState } from "@/lib/admin-challenges";
import { createInvite } from "@/lib/auth/invites";
import { requireAdmin } from "@/lib/auth/session";
import { ChallengeError, parseMeta } from "@/lib/challenge-loader";
import { prisma } from "@/lib/db";
import { LANGUAGES } from "@/lib/languages";

export async function createInviteAction(form: FormData) {
  const me = await requireAdmin();
  const days = Number(form.get("days"));
  await createInvite({ isAdmin: form.get("isAdmin") === "on", createdById: me.id, days: days > 0 ? days : undefined });
  revalidatePath("/admin");
}

export async function revokeInvite(code: string) {
  await requireAdmin();
  await prisma.invite.deleteMany({ where: { code, usedById: null } });
  revalidatePath("/admin");
}

export async function setAdmin(userId: string, isAdmin: boolean) {
  const me = await requireAdmin();
  if (userId === me.id) return; // não dá para se rebaixar (evita ficar sem admin)
  await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
  if (!isAdmin) await prisma.session.deleteMany({ where: { userId } });
  revalidatePath("/admin");
}

export async function deleteUser(userId: string, form: FormData) {
  const me = await requireAdmin();
  if (userId === me.id || form.get("confirm") !== "on") return;
  await prisma.user.delete({ where: { id: userId } }); // cascata: sessões, progresso, rascunhos
  revalidatePath("/admin");
  revalidatePath("/hall-da-fama");
}

const MAX_TEXT = 512 * 1024;

function check(input: ChallengeInput, categories: Set<string>) {
  const meta = parseMeta(
    {
      slug: input.slug.trim(),
      title: input.title,
      category: input.category,
      difficulty: input.difficulty,
      kind: input.kind,
      languages: input.languages,
      tags: input.tags.split(",").map((t) => t.trim()).filter(Boolean),
      checker: input.checker === "ppm" ? { type: "ppm", tolerance: input.tolerance, maxBadRatio: input.maxBadRatio } : "exact",
      timeLimitMs: input.timeLimitMs,
      memoryLimitMb: input.memoryLimitMb,
      order: input.order,
      hints: input.hints.map((h) => h.trim()).filter(Boolean),
    },
    "desafio",
    categories,
    { slug: "", category: "" },
  );
  if (meta.checker.type === "ppm") {
    const { tolerance, maxBadRatio } = meta.checker;
    if (!(tolerance >= 0 && tolerance <= 255) || !(maxBadRatio >= 0 && maxBadRatio <= 1)) {
      throw new ChallengeError("checker ppm: tolerância de 0 a 255 e proporção de 0 a 1");
    }
  }
  if (!input.statement.trim()) throw new ChallengeError("enunciado obrigatório");

  const templates: Record<string, string> = {};
  const solutions: Record<string, string> = {};
  for (const l of meta.languages) {
    const t = input.templates[l] ?? "";
    if (!t.trim()) throw new ChallengeError(`falta o template de ${LANGUAGES[l].label}`);
    templates[l] = t.replace(/\r\n/g, "\n");
    const s = input.solutions[l] ?? "";
    if (s.trim()) solutions[l] = s.replace(/\r\n/g, "\n");
  }

  const tests = meta.kind === "stdio" ? input.tests : [];
  if (meta.kind === "stdio" && !tests.length) throw new ChallengeError("desafio stdio precisa de pelo menos um teste");
  const names = new Set<string>();
  for (const t of tests) {
    const name = t.name.trim();
    if (!name || names.has(name)) throw new ChallengeError(`nome de teste vazio ou repetido: '${name}'`);
    names.add(name);
  }
  const size = JSON.stringify(input).length;
  if (size > MAX_TEXT) throw new ChallengeError(`desafio grande demais (${Math.round(size / 1024)} KB; máximo ${MAX_TEXT / 1024} KB)`);

  // Mesma ordem do loader: públicos primeiro.
  const ordered = [...tests.filter((t) => !t.hidden), ...tests.filter((t) => t.hidden)];
  return {
    meta,
    templates,
    solutions,
    tests: ordered.map((t, i) => ({
      name: t.name.trim(),
      input: t.input.replace(/\r\n/g, "\n"),
      expected: t.expected.replace(/\r\n/g, "\n"),
      hidden: t.hidden,
      order: i,
    })),
  };
}

/** Cria/edita desafios feitos pela web (sourceDir null). Os de /challenges são editados no git. */
export async function saveChallenge(_prev: SaveState, input: ChallengeInput): Promise<SaveState> {
  await requireAdmin();
  const categories = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
  let parsed: ReturnType<typeof check>;
  try {
    parsed = check(input, categories);
  } catch (e) {
    if (e instanceof ChallengeError) return { error: e.message.replace(/^desafio: /, "") };
    throw e;
  }
  const { meta, templates, solutions, tests } = parsed;
  const { category, ...rest } = meta;
  const data = {
    ...rest,
    categoryId: category,
    statement: input.statement.replace(/\r\n/g, "\n").trim(),
    notes: input.notes.trim() ? input.notes.replace(/\r\n/g, "\n").trim() : null,
    templates,
    solutions,
  };

  const original = input.originalSlug
    ? await prisma.challenge.findUnique({ where: { slug: input.originalSlug }, select: { id: true, sourceDir: true } })
    : null;
  if (input.originalSlug && !original) return { error: "desafio não existe mais" };
  if (original?.sourceDir) return { error: "este desafio vem de /challenges; edite no repositório e rode npm run seed" };
  if (meta.slug !== input.originalSlug && (await prisma.challenge.findUnique({ where: { slug: meta.slug }, select: { id: true } }))) {
    return { error: `já existe um desafio com o slug '${meta.slug}'` };
  }

  await prisma.$transaction(async (tx) => {
    const saved = original
      ? await tx.challenge.update({ where: { id: original.id }, data })
      : await tx.challenge.create({ data: { ...data, sourceDir: null } });
    await tx.testCase.deleteMany({ where: { challengeId: saved.id } });
    await tx.testCase.createMany({ data: tests.map((t) => ({ ...t, challengeId: saved.id })) });
  });
  revalidatePath("/", "layout");
  redirect(`/admin?salvo=${meta.slug}`);
}

export async function deleteChallenge(slug: string, form: FormData) {
  await requireAdmin();
  if (form.get("confirm") !== "on") return;
  // Só os da web: os de /challenges voltariam no próximo seed.
  await prisma.challenge.deleteMany({ where: { slug, sourceDir: null } });
  revalidatePath("/", "layout");
  redirect("/admin");
}

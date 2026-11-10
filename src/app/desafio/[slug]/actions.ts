"use server";
import { revalidatePath } from "next/cache";
import type { PostState } from "@/components/PostForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { COMMENT_MAX, postingLimit } from "@/lib/social";
import { cleanUserText } from "@/lib/user-text";

export async function addComment(_prev: PostState, form: FormData): Promise<PostState> {
  const me = await getCurrentUser();
  if (!me) return { error: "entre na sua conta para comentar" };
  const slug = form.get("slug");
  const challenge = typeof slug === "string" ? await prisma.challenge.findUnique({ where: { slug }, select: { id: true } }) : null;
  if (!challenge) return { error: "desafio não encontrado" };
  const clean = cleanUserText(form.get("text"), COMMENT_MAX);
  if (!clean.ok) return { error: clean.error };
  const wait = await postingLimit(me.id);
  if (wait) return { error: wait };
  await prisma.comment.create({ data: { challengeId: challenge.id, userId: me.id, body: clean.text } });
  revalidatePath(`/desafio/${slug}`);
  return { ok: Date.now() };
}

/** O autor apaga o próprio comentário; admin apaga qualquer um. */
export async function deleteComment(id: string) {
  const me = await getCurrentUser();
  if (!me) return;
  const where = me.isAdmin ? { id } : { id, userId: me.id };
  const found = await prisma.comment.findFirst({ where, select: { challenge: { select: { slug: true } } } });
  if (!found) return;
  await prisma.comment.deleteMany({ where });
  revalidatePath(`/desafio/${found.challenge.slug}`);
}

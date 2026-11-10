"use server";
import { revalidatePath } from "next/cache";
import type { PostState } from "@/components/PostForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { GUESTBOOK_MAX, postingLimit } from "@/lib/social";
import { cleanUserText } from "@/lib/user-text";

export async function signGuestbook(_prev: PostState, form: FormData): Promise<PostState> {
  const me = await getCurrentUser();
  if (!me) return { error: "entre na sua conta para assinar" };
  const clean = cleanUserText(form.get("text"), GUESTBOOK_MAX);
  if (!clean.ok) return { error: clean.error };
  const wait = await postingLimit(me.id);
  if (wait) return { error: wait };
  await prisma.guestbookEntry.create({ data: { userId: me.id, message: clean.text } });
  revalidatePath("/guestbook");
  return { ok: Date.now() };
}

/** O autor apaga o próprio recado; admin apaga qualquer um. */
export async function deleteGuestbookEntry(id: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.guestbookEntry.deleteMany({ where: me.isAdmin ? { id } : { id, userId: me.id } });
  revalidatePath("/guestbook");
}

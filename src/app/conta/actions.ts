"use server";
import { checkCredentials, hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export type PasswordState = { error?: string; ok?: boolean } | undefined;

// Trocar (ou criar, para quem entrou só com GitHub) a senha. Derruba as outras sessões.
export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const me = await getCurrentUser();
  if (!me) return { error: "sessão expirada; entre de novo" };
  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  const current = form.get("current");
  const next = form.get("password");
  if (user?.passwordHash && (typeof current !== "string" || !(await verifyPassword(current, user.passwordHash)))) {
    return { error: "senha atual incorreta" };
  }
  const bad = checkCredentials(me.username, next);
  if (bad) return { error: bad };
  if (next !== form.get("password2")) return { error: "as senhas não conferem" };

  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next as string) } });
  await prisma.session.deleteMany({ where: { userId: me.id } });
  await startSession(me.id);
  return { ok: true };
}

"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUserWithInvite, InviteError, normalizeInvite } from "@/lib/auth/invites";
import { checkCredentials, dummyHash, hashPassword, normalizeUsername, verifyPassword } from "@/lib/auth/password";
import { endSession, safeNext, startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string } | undefined;

async function limited(kind: string): Promise<string | null> {
  const r = rateLimit(`${kind}:${clientKey(await headers())}`, 10);
  return r.ok ? null : `muitas tentativas; espere ${r.retryAfterS}s`;
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const wait = await limited("login");
  if (wait) return { error: wait };
  const username = normalizeUsername(form.get("username"));
  const password = form.get("password");
  if (typeof password !== "string" || !username) return { error: "preencha usuário e senha" };

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, passwordHash: true } });
  // Sempre roda o scrypt, exista o usuário ou não (mesmo tempo de resposta).
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user?.passwordHash || !ok) return { error: "usuário ou senha incorretos" };

  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const wait = await limited("register");
  if (wait) return { error: wait };
  const username = normalizeUsername(form.get("username"));
  const password = form.get("password");
  const invite = normalizeInvite(form.get("invite"));
  if (!invite) return { error: "o cadastro precisa de um código de convite" };
  const bad = checkCredentials(username, password);
  if (bad) return { error: bad };
  if (password !== form.get("password2")) return { error: "as senhas não conferem" };

  let userId: string;
  try {
    userId = (await createUserWithInvite(invite, { username, passwordHash: await hashPassword(password as string) })).id;
  } catch (e) {
    if (e instanceof InviteError) return { error: e.message };
    throw e;
  }
  await startSession(userId);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/");
}

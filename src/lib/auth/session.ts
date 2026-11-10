import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";

// Sessão em banco: o cookie leva um token aleatório; o banco guarda só o sha256 dele.
export const SESSION_COOKIE = "korin_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface SessionUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

/** Só em Server Functions e Route Handlers (é onde dá para escrever cookies). */
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { id: sha256(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  // Faxina barata: sessões vencidas de todo mundo.
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Usuário logado nesta requisição (memoizado por requisição), ou null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({
    where: { id: sha256(token) },
    select: { expiresAt: true, user: { select: { id: true, username: true, isAdmin: true } } },
  });
  if (!s || s.expiresAt < new Date()) return null;
  return s.user;
});

/** Destino pós-login: só caminhos internos ("/x"); nunca "//host" nem "/\host" (o navegador trata como outro site). */
export function safeNext(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}

/** Páginas e Server Functions do painel: quem não é admin vê um 404 (o painel nem "existe"). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  return user;
}

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { SessionUser } from "./session";

// Tokens pessoais da CLI (Fase 6). Mesma ideia da sessão: o token só existe
// no cliente (~/.config/korin/config.json); o banco guarda o sha256.
// Formato: "korin_" + 40 caracteres base64url, para o grep de vazamento achar.
export const TOKEN_PREFIX = "korin_";
export const MAX_TOKENS_PER_USER = 10;
const TOKEN_RE = /^korin_[A-Za-z0-9_-]{40,}$/;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function looksLikeToken(s: string): boolean {
  return TOKEN_RE.test(s);
}

/** Cria um token. Devolve o segredo em claro: é a única vez que ele aparece. */
export async function createApiToken(userId: string, name: string): Promise<{ token: string } | { error: string }> {
  const clean = name.trim().slice(0, 40);
  if (!clean) return { error: "dê um nome ao token (ex.: notebook)" };
  const count = await prisma.apiToken.count({ where: { userId } });
  if (count >= MAX_TOKENS_PER_USER) return { error: `limite de ${MAX_TOKENS_PER_USER} tokens; revogue algum` };
  const token = TOKEN_PREFIX + randomBytes(30).toString("base64url");
  await prisma.apiToken.create({ data: { id: sha256(token), userId, name: clean, prefix: token.slice(0, TOKEN_PREFIX.length + 6) } });
  return { token };
}

export async function listApiTokens(userId: string) {
  return prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
  });
}

/** Só o dono revoga (o where leva userId). */
export async function revokeApiToken(userId: string, id: string) {
  await prisma.apiToken.deleteMany({ where: { id, userId } });
}

export async function revokeAllApiTokens(userId: string) {
  await prisma.apiToken.deleteMany({ where: { userId } });
}

/** Resolve `Authorization: Bearer korin_...` para o usuário, ou null. */
export async function userFromBearer(header: string | null): Promise<SessionUser | null> {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!m || !looksLikeToken(m[1])) return null;
  const id = sha256(m[1]);
  const t = await prisma.apiToken.findUnique({
    where: { id },
    select: { lastUsedAt: true, user: { select: { id: true, username: true, isAdmin: true } } },
  });
  if (!t) return null;
  // "usado por último" com granularidade de hora, para não escrever a cada requisição.
  if (!t.lastUsedAt || Date.now() - t.lastUsedAt.getTime() > 3_600_000) {
    await prisma.apiToken.update({ where: { id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return t.user;
}

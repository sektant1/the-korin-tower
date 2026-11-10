import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

// Guestbook e comentários (Fase 3). Só quem tem conta escreve: o site é por convite,
// então isso já barra spam. O texto é puro (src/lib/user-text.ts).
export const GUESTBOOK_MAX = 500;
export const COMMENT_MAX = 2000;
export const GUESTBOOK_PAGE = 30;

export interface Post {
  id: string;
  username: string;
  text: string;
  createdAt: Date;
  /** quem está vendo pode apagar (autor ou admin) */
  mine: boolean;
}

type Viewer = { id: string; isAdmin: boolean } | null;
const canDelete = (viewer: Viewer, authorId: string) => !!viewer && (viewer.isAdmin || viewer.id === authorId);

export async function listGuestbook(viewer: Viewer, page: number): Promise<{ entries: Post[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.guestbookEntry.findMany({
      orderBy: { createdAt: "desc" },
      skip: page * GUESTBOOK_PAGE,
      take: GUESTBOOK_PAGE,
      select: { id: true, message: true, createdAt: true, userId: true, user: { select: { username: true } } },
    }),
    prisma.guestbookEntry.count(),
  ]);
  return {
    total,
    entries: rows.map((r) => ({ id: r.id, username: r.user.username, text: r.message, createdAt: r.createdAt, mine: canDelete(viewer, r.userId) })),
  };
}

export async function listComments(viewer: Viewer, challengeId: string): Promise<Post[]> {
  const rows = await prisma.comment.findMany({
    where: { challengeId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, body: true, createdAt: true, userId: true, user: { select: { username: true } } },
  });
  return rows.map((r) => ({ id: r.id, username: r.user.username, text: r.body, createdAt: r.createdAt, mine: canDelete(viewer, r.userId) }));
}

/** 5 mensagens por minuto por usuário (e por IP, para quem tem várias contas). */
export async function postingLimit(userId: string): Promise<string | null> {
  for (const key of [`post:user:${userId}`, `post:ip:${clientKey(await headers())}`]) {
    const r = rateLimit(key, 5);
    if (!r.ok) return `calma! espere ${r.retryAfterS}s para escrever de novo`;
  }
  return null;
}

// Convites: só entra quem tem um código. Usado pelo site e pelo script `npm run invite`.
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

// Sem 0/O/1/I/L para não confundir ao digitar.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export function normalizeInvite(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

export async function createInvite(opts: { isAdmin?: boolean; createdById?: string; days?: number } = {}) {
  return prisma.invite.create({
    data: {
      code: `KORIN-${block()}-${block()}`,
      isAdmin: opts.isAdmin ?? false,
      createdById: opts.createdById,
      expiresAt: opts.days ? new Date(Date.now() + opts.days * 86_400_000) : null,
    },
  });
}

export class InviteError extends Error {}

/**
 * Cria o usuário e consome o convite na mesma transação.
 * O updateMany condicional garante que dois cadastros simultâneos não usem o mesmo código.
 */
export async function createUserWithInvite(code: string, data: { username: string; passwordHash?: string; githubId?: string }) {
  try {
    return await consume(code, data);
  } catch (e) {
    // Corrida entre dois cadastros com o mesmo nome: a constraint unique decide.
    if ((e as { code?: string }).code === "P2002") throw new InviteError("esse nome de usuário já existe");
    throw e;
  }
}

function consume(code: string, data: { username: string; passwordHash?: string; githubId?: string }) {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({ where: { code } });
    if (!invite || invite.usedById || (invite.expiresAt && invite.expiresAt < new Date())) {
      throw new InviteError("convite inválido, vencido ou já usado");
    }
    if (await tx.user.findUnique({ where: { username: data.username }, select: { id: true } })) {
      throw new InviteError("esse nome de usuário já existe");
    }
    const user = await tx.user.create({ data: { ...data, isAdmin: invite.isAdmin } });
    const { count } = await tx.invite.updateMany({
      where: { code, usedById: null },
      data: { usedById: user.id, usedAt: new Date() },
    });
    if (count !== 1) throw new InviteError("convite já usado");
    return user;
  });
}

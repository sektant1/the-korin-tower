import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordGiveUp } from "@/lib/progress";

// Desistir: libera a solução, e o desafio deixa de valer pontos.
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "entre na sua conta para desistir e ver a solução" }, { status: 401 });
  const c = await prisma.challenge.findUnique({ where: { slug }, select: { id: true } });
  if (!c) return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  await recordGiveUp(user.id, c.id);
  return NextResponse.json({ ok: true });
}

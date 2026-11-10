import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isLanguageId } from "@/lib/languages";
import { deleteDraft, saveDraft } from "@/lib/progress";

const MAX_SOURCE = 64 * 1024; // igual a /api/run

async function target(slug: string, language: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "sem login" }, { status: 401 }) };
  if (!isLanguageId(language)) return { error: NextResponse.json({ error: "linguagem inválida" }, { status: 400 }) };
  const c = await prisma.challenge.findUnique({ where: { slug }, select: { id: true, languages: true } });
  if (!c || !(c.languages as string[]).includes(language)) {
    return { error: NextResponse.json({ error: "desafio ou linguagem não encontrados" }, { status: 404 }) };
  }
  return { userId: user.id, challengeId: c.id, language };
}

// PUT { language, code }: salva o rascunho na conta.
export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.code !== "string") return NextResponse.json({ error: "code é obrigatório" }, { status: 400 });
  if (body.code.length > MAX_SOURCE) return NextResponse.json({ error: `código maior que ${MAX_SOURCE / 1024} KB` }, { status: 413 });
  const t = await target((await ctx.params).slug, body.language);
  if ("error" in t) return t.error;
  await saveDraft(t.userId, t.challengeId, t.language, body.code);
  return NextResponse.json({ ok: true });
}

// DELETE ?language=c: volta ao template.
export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const t = await target((await ctx.params).slug, new URL(req.url).searchParams.get("language"));
  if ("error" in t) return t.error;
  await deleteDraft(t.userId, t.challengeId, t.language);
  return NextResponse.json({ ok: true });
}

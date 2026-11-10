import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const MAX_BYTES = 16 * 1024;

// PUT {...}: preferências do editor na conta. O cliente mescla com os padrões ao ler.
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sem login" }, { status: 401 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "preferências grandes demais" }, { status: 413 });
  let settings: unknown;
  try {
    settings = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return NextResponse.json({ error: "esperado um objeto" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { settings: settings as object } });
  return NextResponse.json({ ok: true });
}

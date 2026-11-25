import { NextResponse } from "next/server";
import { unlockEventAchievement } from "@/lib/achievements-server";
import { isEventAchievement } from "@/lib/achievements";
import { getCurrentUser } from "@/lib/auth/session";

// POST { id }: conquista de evento que só o navegador percebe (ex.: o código Konami).
// Só aceita ids sem regra calculável; as outras saem das estatísticas no servidor.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unlocked: false });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!isEventAchievement(id)) return NextResponse.json({ error: "conquista desconhecida" }, { status: 400 });
  return NextResponse.json({ unlocked: await unlockEventAchievement(user.id, id) });
}

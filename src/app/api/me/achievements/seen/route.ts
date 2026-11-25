import { NextResponse } from "next/server";
import { markSeen } from "@/lib/achievements-server";
import { getCurrentUser } from "@/lib/auth/session";

// POST { ids: string[] }: o toast dessas conquistas já apareceu.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sem login" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 100) : null;
  if (!ids) return NextResponse.json({ error: "esperado { ids: string[] }" }, { status: 400 });
  await markSeen(user.id, ids);
  return NextResponse.json({ ok: true });
}

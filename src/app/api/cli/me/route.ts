import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProgressSummary } from "@/lib/progress";

// `korin whoami`: confere o token e devolve o resumo do jogador.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "token inválido ou ausente (korin login)" }, { status: 401 });
  const summary = await getProgressSummary(user.id);
  const states = Object.values(summary.map);
  return NextResponse.json({
    username: user.username,
    isAdmin: user.isAdmin,
    points: summary.points,
    solved: states.filter((s) => s === "solved").length,
    gaveUp: states.filter((s) => s === "gaveup").length,
  });
}

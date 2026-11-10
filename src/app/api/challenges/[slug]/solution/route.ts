import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { canSeeSolution } from "@/lib/progress";

// A solução só sai para quem passou em todos os testes (registrado por /api/run)
// ou desistiu (POST .../giveup). Admins sempre podem ver.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "entre na sua conta para ver a solução" }, { status: 401 });
  const c = await getChallenge(slug);
  if (!c) return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  if (!(await canSeeSolution(user, c.id))) {
    return NextResponse.json({ error: "resolva ou desista para ver a solução" }, { status: 403 });
  }
  return NextResponse.json({ solutions: c.solutions });
}

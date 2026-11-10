import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { canSeeSolution } from "@/lib/progress";
import { listPlayerSolutions } from "@/lib/records";

// Soluções dos outros jogadores (Fase 3). Mesma regra da solução de referência:
// só para quem resolveu ou desistiu, e para admins.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "entre na sua conta para ver as soluções" }, { status: 401 });
  const c = await getChallenge(slug);
  if (!c) return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  if (!(await canSeeSolution(user, c.id))) {
    return NextResponse.json({ error: "resolva ou desista para ver as soluções" }, { status: 403 });
  }
  return NextResponse.json({ solutions: await listPlayerSolutions(c.id) });
}

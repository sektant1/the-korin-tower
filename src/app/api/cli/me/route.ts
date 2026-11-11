import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProgressSummary } from "@/lib/progress";
import { FLOORS, FLOOR_NAMES, currentFloor, floors, tracksDone } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";

// `korin whoami` / `korin status`: confere o token e devolve o resumo do jogador na torre.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "token inválido ou ausente (korin login)" }, { status: 401 });
  const [summary, tower] = await Promise.all([getProgressSummary(user.id), getTowerData()]);
  const states = Object.values(summary.map);
  return NextResponse.json({
    username: user.username,
    isAdmin: user.isAdmin,
    points: summary.points,
    solved: states.filter((s) => s === "solved").length,
    gaveUp: states.filter((s) => s === "gaveup").length,
    floor: currentFloor(tower, summary.map),
    floorsTotal: FLOORS,
    floors: floors(tower, summary.map).map((f) => ({ n: f.n, name: FLOOR_NAMES[f.n], open: f.open, solved: f.solved, scored: f.scored, missingForNext: f.missingForNext })),
    balls: tracksDone(tower, summary.map),
    ballsTotal: tower.tracks.length,
  });
}

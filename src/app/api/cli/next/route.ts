import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProgressSummary } from "@/lib/progress";
import { floorOf, nextStep } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";

// `korin next`: o mesmo "continuar" da home. Sem token, é o primeiro passo da torre.
export async function GET(req: Request) {
  const trackId = new URL(req.url).searchParams.get("track");
  const [user, tower] = await Promise.all([getCurrentUser(), getTowerData()]);
  const progress = user ? (await getProgressSummary(user.id)).map : {};
  const next = nextStep(tower, progress, { trackId });
  if (!next) return NextResponse.json({ next: null });
  const c = tower.challenges.find((x) => x.slug === next.slug)!;
  const track = next.trackId ? tower.tracks.find((t) => t.id === next.trackId) : null;
  return NextResponse.json({
    next: { slug: c.slug, title: c.title, difficulty: c.difficulty, floor: floorOf(c), category: c.categoryName, reason: next.reason, track: track ? { id: track.id, title: track.title } : null },
  });
}

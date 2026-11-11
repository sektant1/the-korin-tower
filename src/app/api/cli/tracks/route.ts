import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProgressSummary } from "@/lib/progress";
import { isScored, trackNextStep } from "@/lib/tower";
import { getTowerData } from "@/lib/tower-server";
import { listTracks } from "@/lib/tracks";

// `korin tracks`: os detonados, com o progresso de quem tem token.
export async function GET() {
  const [user, tower, tracks] = await Promise.all([getCurrentUser(), getTowerData(), listTracks()]);
  const progress = user ? (await getProgressSummary(user.id)).map : {};
  const bySlug = new Map(tower.challenges.map((c) => [c.slug, c]));
  return NextResponse.json({
    tracks: tracks.map((t) => {
      const scored = t.steps.filter((s) => bySlug.get(s.slug) && isScored(bySlug.get(s.slug)!));
      const done = scored.filter((s) => progress[s.slug] === "solved").length;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        steps: t.steps.map((s) => ({ slug: s.slug, title: s.title, difficulty: s.difficulty, scored: s.scored, state: progress[s.slug] ?? null })),
        done,
        total: scored.length,
        next: trackNextStep(tower, progress, t.id),
      };
    }),
  });
}

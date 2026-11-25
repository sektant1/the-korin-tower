import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner, Window } from "@/components/Retro";
import { TracksUnderConstruction } from "@/components/TracksUnderConstruction";
import { TRACKS_ENABLED } from "@/lib/features";
import { TrackProgress } from "@/components/TrackProgress";
import { listTracks } from "@/lib/tracks";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Trilhas" };

export default async function TracksPage() {
  if (!TRACKS_ENABLED) return <TracksUnderConstruction />;
  const tracks = await listTracks();
  return (
    <>
      <PageBanner
        title="TRILHAS"
        image={PAGE_SCENES.detonados}
        lead="Listas de desafios para fazer em ordem, um assunto por trilha."
        stats={[
          {
            n: tracks.length,
            label: tracks.length === 1 ? "trilha" : "trilhas",
          },
        ]}
      />
      {tracks.length === 0 && <p className="dim">Nenhuma trilha ainda.</p>}
      {tracks.map((t) => (
        <Window key={t.id} title={`${t.title}.txt`}>
          <h2 className="track-title">
            <Link href={`/trilhas/${t.id}`}>{t.title}</Link>
          </h2>
          <p>{t.description}</p>
          <TrackProgress
            slugs={t.steps.filter((s) => s.scored).map((s) => s.slug)}
          />
          <p>
            <Link href={`/trilhas/${t.id}`} className="btn98 play">
              ABRIR{" "}
              <span className="arrow" aria-hidden="true">
                ►
              </span>
            </Link>
          </p>
        </Window>
      ))}
    </>
  );
}

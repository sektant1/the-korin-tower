import type { Metadata } from "next";
import Link from "next/link";
import { FlameTitle, PageBanner, Window } from "@/components/Retro";
import { TrackProgress } from "@/components/TrackProgress";
import { GIFS } from "@/lib/gifs";
import { listTracks } from "@/lib/tracks";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Detonados" };

export default async function TracksPage() {
  const tracks = await listTracks();
  return (
    <>
      <FlameTitle>DETONADOS</FlameTitle>
      <PageBanner
        image={PAGE_SCENES.detonados}
        lead="Sequências de desafios em ordem, como um detonado de revista."
        stats={[{ n: tracks.length, label: tracks.length === 1 ? "detonado" : "detonados" }]}
        gif={GIFS.gokuDuo}
        gifHeight={90}
      />
      {tracks.length === 0 && <p className="dim">Nenhuma trilha ainda.</p>}
      {tracks.map((t) => (
        <Window key={t.id} title={`${t.title}.txt`}>
          <h2 className="track-title">
            <Link href={`/trilhas/${t.id}`}>{t.title}</Link>
          </h2>
          <p>{t.description}</p>
          <TrackProgress slugs={t.steps.filter((s) => s.scored).map((s) => s.slug)} />
          <p>
            <Link href={`/trilhas/${t.id}`} className="btn98 play">
              ABRIR <span className="arrow" aria-hidden="true">►</span>
            </Link>
          </p>
        </Window>
      ))}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Gif } from "@/components/Gif";
import { FlameTitle, Window } from "@/components/Retro";
import { TrackProgress } from "@/components/TrackProgress";
import { GIFS } from "@/lib/gifs";
import { listTracks } from "@/lib/tracks";

export const metadata: Metadata = { title: "Detonados" };

export default async function TracksPage() {
  const tracks = await listTracks();
  return (
    <>
      <FlameTitle>DETONADOS</FlameTitle>
      <p className="center">
        <Gif gif={GIFS.gokuDuo} height={90} />
      </p>
      <p className="center dim">Sequências de desafios em ordem, como um detonado de revista.</p>
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

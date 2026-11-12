import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressBadge } from "@/components/ClientEffects";
import { Difficulty, FlameTitle, PageBanner, Window } from "@/components/Retro";
import { TrackNext, TrackProgress } from "@/components/TrackProgress";
import { getTrack } from "@/lib/tracks";
import { PAGE_SCENES } from "@/lib/scenes";
import { GIFS } from "@/lib/gifs";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: (await getTrack((await params).id))?.title ?? "Detonado" };
}

export default async function TrackPage({ params }: Params) {
  const track = await getTrack((await params).id);
  if (!track) notFound();

  return (
    <>
      <FlameTitle>DETONADO</FlameTitle>
      <PageBanner
        image={PAGE_SCENES.detonado}
        kicker="DETONADO"
        lead={track.title}
        sub={track.description}
        stats={[{ n: track.steps.length, label: track.steps.length === 1 ? "passo" : "passos" }]}
        gif={GIFS.gokuElectric}
      />
      <Window title={`${track.title}.txt`}>
        <nav className="crumbs" aria-label="Você está em">
          <Link href="/trilhas">Detonados</Link> » {track.title}
        </nav>
        <TrackProgress slugs={track.steps.filter((s) => s.scored).map((s) => s.slug)} />
        <TrackNext trackId={track.id} steps={track.steps.filter((s) => s.scored)} />
        <ol className="track-steps">
          {track.steps.map((s, i) => (
            <li key={s.slug}>
              <span className="floor-n">PASSO {String(i + 1).padStart(2, "0")}</span>
              <Link href={`/desafio/${s.slug}?trilha=${track.id}`}>{s.title}</Link>
              <span className="dim small">{s.categoryName}</span>
              <Difficulty level={s.difficulty} />
              {s.scored ? (
                <ProgressBadge slug={s.slug} />
              ) : (
                <span className="tag" title="Roda no navegador, sem testes; não conta para zerar o detonado">
                  livre
                </span>
              )}
            </li>
          ))}
        </ol>
      </Window>
    </>
  );
}

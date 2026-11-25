import Link from "next/link";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { getFanart } from "@/lib/fanart";
import { Marquee, BallDivider, Window } from "@/components/Retro";
import { TRACKS_ENABLED } from "@/lib/features";
import { ContinueCard, FloorBackdrop, TowerMap } from "@/components/Tower";
import { NEED_PER_FLOOR } from "@/lib/tower";
import { TrackProgress } from "@/components/TrackProgress";
import { latestChallenges } from "@/lib/challenges";
import { getDaily } from "@/lib/daily";
import { renderMarkdown } from "@/lib/markdown";
import { listTracks } from "@/lib/tracks";
import { FACTS, NEWS } from "@/lib/site-content";

export default async function Home() {
  const [latest, daily, tracks, { mascot }] = await Promise.all([
    latestChallenges(3),
    getDaily(),
    listTracks(),
    getFanart(),
  ]);
  const fact = await renderMarkdown(
    FACTS[Math.floor(Math.random() * FACTS.length)],
  );

  return (
    <>
      <Marquee label="Novidades">
        {latest.map((c) => (
          <span key={c.slug}>
            <Gif gif={GIFS.sphere} height={18} className="marquee-gif" /> NOVO
            DESAFIO: {c.title} &nbsp;&nbsp;&nbsp;
          </span>
        ))}
        {daily && (
          <span>
            <Gif gif={GIFS.sphere} height={18} className="marquee-gif" />{" "}
            DESAFIO DO DIA: {daily.title} &nbsp;&nbsp;&nbsp;
          </span>
        )}
      </Marquee>

      <section className="hero">
        <FloorBackdrop />
        {mascot && (
          // eslint-disable-next-line @next/next/no-img-element -- GIF animado do dono do site
          <img src={mascot} alt="" className="hero-mascot" />
        )}
        <div className="hero-stage">
          <Gif gif={GIFS.gokuElectric} height={170} className="hero-fighter" />
          <ContinueCard />
          <Gif gif={GIFS.piccolo} height={170} className="hero-fighter" />
        </div>
      </section>

      <BallDivider />

      <Window title="dica.txt" className="fact-window">
        <div className="fact markdown" dangerouslySetInnerHTML={{ __html: fact }} />
      </Window>

      {/* Mapa e mural lado a lado, com a mesma altura: o mapa define a linha e o mural rola por dentro. */}
      <div className="home-grid">
        <div className="home-news">
          <Window title="mural.txt" className="news-window">
            <ul className="news">
              {NEWS.map((n, k) => (
                <li key={k}>
                  <p className="news-head">
                    <span className="news-date">{n.date}</span>
                    {k === 0 && <span className="new-badge">NEW!</span>}
                  </p>
                  <p className="news-text">{n.text}</p>
                </li>
              ))}
            </ul>
          </Window>
        </div>

        <Window title="mapa.bmp" className="map-window">
          <p className="dim small">Resolva {NEED_PER_FLOOR} desafios de um andar para liberar o próximo.</p>
          <TowerMap />
        </Window>
      </div>

      {TRACKS_ENABLED && (
        <Window title="Trilhas">
          <p className="dim small">Cada trilha concluída vale uma Esfera do Dragão.</p>
          <ul className="track-list">
            {tracks.map((t) => (
              <li key={t.id}>
                <Link href={`/trilhas/${t.id}`}>{t.title}</Link>
                <TrackProgress slugs={t.steps.filter((s) => s.scored).map((s) => s.slug)} />
              </li>
            ))}
          </ul>
        </Window>
      )}
    </>
  );
}

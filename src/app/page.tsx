import Link from "next/link";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { getFanart } from "@/lib/fanart";
import { Marquee, RainbowHr, Window } from "@/components/Retro";
import { ContinueCard, FloorBackdrop, TowerMap } from "@/components/Tower";
import { NEED_PER_FLOOR } from "@/lib/tower";
import { TrackProgress } from "@/components/TrackProgress";
import { latestChallenges } from "@/lib/challenges";
import { getDaily } from "@/lib/daily";
import { renderMarkdown } from "@/lib/markdown";
import { listTracks } from "@/lib/tracks";
import { FACTS, NEWS } from "@/lib/site-content";

export default async function Home() {
  const [latest, daily, tracks, { mascot }] = await Promise.all([latestChallenges(3), getDaily(), listTracks(), getFanart()]);
  const fact = await renderMarkdown(FACTS[Math.floor(Math.random() * FACTS.length)]);

  return (
    <>
      <Marquee label="Novidades">
        {latest.map((c) => (
          <span key={c.slug}>
            <Gif gif={GIFS.sphere} height={18} className="marquee-gif" /> NOVO DESAFIO: {c.title} &nbsp;&nbsp;&nbsp;
          </span>
        ))}
        {daily && (
          <span>
            <Gif gif={GIFS.sphere} height={18} className="marquee-gif" /> DESAFIO DO DIA: {daily.title} &nbsp;&nbsp;&nbsp;
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

      <RainbowHr />

      <div className="two-col home-grid">
        <Window title="Mapa da Torre">
          <p className="dim small">Cada andar é uma dificuldade. {NEED_PER_FLOOR} desafios resolvidos abrem o andar de cima.</p>
          <TowerMap />
        </Window>

        <div>
          <Window title="Detonados">
            <p className="dim small">Roteiros em ordem, de um tema só. Zerar um detonado vale uma Esfera do Dragão.</p>
            <ul className="track-list">
              {tracks.map((t) => (
                <li key={t.id}>
                  <Link href={`/trilhas/${t.id}`}>{t.title}</Link>
                  <TrackProgress slugs={t.steps.filter((s) => s.scored).map((s) => s.slug)} />
                </li>
              ))}
            </ul>
          </Window>
        </div>
      </div>

      <div className="two-col">
        <Window title="Mural">
          <ul className="news">
            {NEWS.map((n, k) => (
              <li key={k}>
                <span className="news-date">{n.date}</span> {k === 0 && <span className="new-badge">NEW!</span>} {n.text}
              </li>
            ))}
          </ul>
        </Window>
        <Window title="Você sabia?">
          <div className="fact markdown" dangerouslySetInnerHTML={{ __html: fact }} />
        </Window>
      </div>
    </>
  );
}

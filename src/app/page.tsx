import Link from "next/link";
import { ChallengeList } from "@/components/ChallengeList";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { getFanart } from "@/lib/fanart";
import { Blink, Difficulty, FlameTitle, Marquee, RainbowHr, Window } from "@/components/Retro";
import { latestChallenges, listCategories } from "@/lib/challenges";
import { getDaily } from "@/lib/daily";
import { DAILY_BONUS } from "@/lib/scoring";
import { renderMarkdown } from "@/lib/markdown";
import { FACTS, NEWS } from "@/lib/site-content";

export default async function Home() {
  const [categories, latest, daily] = await Promise.all([listCategories(), latestChallenges(6), getDaily()]);
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const { mascot } = await getFanart();
  const fact = await renderMarkdown(FACTS[Math.floor(Math.random() * FACTS.length)]);

  return (
    <>
      <Marquee label="Novidades">
        {latest.slice(0, 3).map((c) => (
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
        {mascot && (
          // eslint-disable-next-line @next/next/no-img-element -- GIF animado do dono do site
          <img src={mascot} alt="" className="hero-mascot" />
        )}
        <div className="hero-stage">
          <Gif gif={GIFS.gokuElectric} height={170} className="hero-fighter" />
          <div className="hero-center">
            <FlameTitle>BEM-VINDO À TORRE</FlameTitle>
            <p className="hero-text">C, C++, Rust, assembly e shaders. Editor com Vim, compilador de verdade, testes automáticos.</p>
            <p className="press-start">
              <Link href="/desafios" className="btn-start">
                <Blink>
                  <span className="arrow" aria-hidden="true">►</span> PRESS START <span className="arrow" aria-hidden="true">◄</span>
                </Blink>
              </Link>
            </p>
          </div>
          <Gif gif={GIFS.piccolo} height={170} className="hero-fighter" />
        </div>
      </section>

      <RainbowHr />

      {daily && (
        <Window title="Desafio do dia" className="daily">
          <div className="daily-row">
            <Gif gif={GIFS.trunks} height={70} />
            <div className="daily-body">
              <h2 className="daily-title">
                <Link href={`/desafio/${daily.slug}`}>{daily.title}</Link>
              </h2>
              <Difficulty level={daily.difficulty} />
              <p className="dim">Resolvido hoje vale +{DAILY_BONUS * 100}% de pontos. Troca à meia-noite, horário de Brasília.</p>
            </div>
            <Link href={`/desafio/${daily.slug}`} className="btn98 play" aria-label={`Jogar o desafio do dia: ${daily.title}`}>
              JOGAR <span className="arrow" aria-hidden="true">►</span>
            </Link>
          </div>
        </Window>
      )}

      <Window title="Novos desafios">
        <ChallengeList items={latest} categoryNames={names} />
      </Window>

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

      <div className="two-col">
        <Window title="Mapa da Torre">
          <div className="fighters" aria-hidden="true">
            <Gif gif={GIFS.gokuKick} height={70} />
            <Gif gif={GIFS.cellMeteor} height={70} />
          </div>
          <ol className="tower-map" reversed>
            <li className="floor top">
              <span className="floor-n">TOPO</span> Mestre Karin
            </li>
            {[...categories].reverse().map((c, k) => (
              <li key={c.id} className={c.count ? "floor" : "floor empty"}>
                <span className="floor-n">ANDAR {String(categories.length - k).padStart(2, "0")}</span>{" "}
                <Link href={`/categoria/${c.id}`} className="floor-name">
                  {c.name}
                </Link>
                <span className="floor-count">{c.count ? `${c.count} desafio${c.count === 1 ? "" : "s"}` : "fechado"}</span>
              </li>
            ))}
            <li className="floor ground">
              <span className="floor-n">TÉRREO</span> você está aqui
            </li>
          </ol>
        </Window>

        <Window title="Como jogar">
          <p className="center">
            <Gif gif={GIFS.powerUp} height={90} />
          </p>
          <ol className="howto">
            <li>Escolha um desafio e leia o enunciado.</li>
            <li>
              Escreva o código no editor. Ele abre em modo Vim; <kbd>i</kbd> insere, <kbd>Esc</kbd> volta ao normal. Dá para desligar.
            </li>
            <li>
              <kbd>:run</kbd> executa com a sua entrada. <kbd>:test</kbd> roda os testes públicos.
            </li>
            <li>
              <kbd>:submit</kbd> roda também os ocultos. Passou em todos, desafio resolvido.
            </li>
            <li>
              Travou? <kbd>:hint</kbd> abre uma dica. Cada dica custa pontos.
            </li>
          </ol>
        </Window>
      </div>
    </>
  );
}

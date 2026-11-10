import Link from "next/link";
import { ChallengeList } from "@/components/ChallengeList";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { getFanart } from "@/lib/fanart";
import { Blink, Difficulty, FlameTitle, RainbowHr, Window } from "@/components/Retro";
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
      <section className="hero">
        {mascot && (
          // eslint-disable-next-line @next/next/no-img-element -- GIF animado do dono do site
          <img src={mascot} alt="" className="hero-mascot" />
        )}
        <div className="hero-balls" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <Gif key={i} gif={GIFS.sphere} height={30} />
          ))}
        </div>
        <div className="hero-stage">
          <Gif gif={GIFS.gokuElectric} height={170} className="hero-fighter" />
          <div className="hero-center">
            <FlameTitle>BEM-VINDO À TORRE!</FlameTitle>
            <p className="hero-text">
              Suba andar por andar: <b>C</b>, <b>C++</b>, <b>Rust</b>, ray tracers, shaders, alocadores e emuladores. Tudo com editor{" "}
              <b>Vim</b>, compilador de verdade e testes automáticos.
            </p>
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

      <div className="two-col">
        <Window title="Mural de Novidades">
          <ul className="news">
            {NEWS.map((n, k) => (
              <li key={k}>
                <span className="news-date">{n.date}</span> {k === 0 && <span className="new-badge">NEW!</span>} {n.text}
              </li>
            ))}
          </ul>
          <p className="dim small">Última atualização: {NEWS[0]?.date}</p>
        </Window>
        <Window title="Você sabia?">
          <div className="fact markdown" dangerouslySetInnerHTML={{ __html: fact }} />
          <p className="dim small">Recarregue a página para outra curiosidade.</p>
        </Window>
      </div>

      {daily && (
        <Window title="Desafio do dia" className="daily">
          <div className="daily-row">
            <Gif gif={GIFS.trunks} height={70} />
            <div className="daily-body">
              <h2 className="daily-title">
                <Link href={`/desafio/${daily.slug}`}>{daily.title}</Link>
              </h2>
              <Difficulty level={daily.difficulty} />
              <p>
                Resolva <b>hoje</b> e leve <b>+{DAILY_BONUS * 100}% de pontos</b>. Um por dia, sorteado à meia-noite (horário de Brasília). Dias
                seguidos resolvendo qualquer desafio viram sequência no seu perfil.
              </p>
            </div>
            <Link href={`/desafio/${daily.slug}`} className="btn98 play" aria-label={`Jogar o desafio do dia: ${daily.title}`}>
              LUTAR <span className="arrow" aria-hidden="true">►</span>
            </Link>
          </div>
        </Window>
      )}

      <Window title="Últimos lançamentos">
        <ChallengeList items={latest} categoryNames={names} />
      </Window>

      <div className="two-col">
        <Window title="Mapa da Torre">
          <div className="fighters" aria-hidden="true">
            <Gif gif={GIFS.gokuKick} height={70} />
            <Gif gif={GIFS.cellMeteor} height={70} />
          </div>
          <ol className="tower-map" reversed>
            <li className="floor top">
              <span className="floor-n">TOPO</span> Mestre Karin e os feijões senzu
            </li>
            {[...categories].reverse().map((c, k) => (
              <li key={c.id} className={c.count ? "floor" : "floor empty"}>
                <span className="floor-n">ANDAR {String(categories.length - k).padStart(2, "0")}</span>{" "}
                <Gif gif={GIFS.sphere} height={14} />
                <Link href={`/categoria/${c.id}`} className="floor-name">
                  {c.name}
                </Link>
                <span className="floor-count">{c.count ? `${c.count} desafio(s)` : "fechado"}</span>
              </li>
            ))}
            <li className="floor ground">
              <span className="floor-n">TERREO</span> ▲ você está aqui. Boa escalada!
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
              Codifique no editor. Ele começa em modo <b>Vim</b> (aperte <kbd>i</kbd> para inserir, <kbd>Esc</kbd> para sair).
            </li>
            <li>
              <kbd>:run</kbd> executa com seu stdin, <kbd>:test</kbd> roda os testes públicos.
            </li>
            <li>
              <kbd>:submit</kbd> roda também os testes ocultos. Passou em tudo? <b>STAGE CLEAR!</b>
            </li>
            <li>
              Travou? <kbd>:hint</kbd> revela um cheat code por vez.
            </li>
          </ol>
          <p className="dim small">Psiu... dizem que existe um código secreto que libera um golpe especial... (fora do editor)</p>
          <p className="small">
            Zerou? Compare seu código com o dos outros, comente (com <code>||spoiler||</code>) e{" "}
            <Link href="/guestbook">assine o guestbook</Link>.
          </p>
        </Window>
      </div>
    </>
  );
}

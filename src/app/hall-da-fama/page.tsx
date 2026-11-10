import type { Metadata } from "next";
import Link from "next/link";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { Blink, FlameTitle } from "@/components/Retro";
import { getCurrentUser } from "@/lib/auth/session";
import { hallOfFame } from "@/lib/progress";
import { HINT_PENALTY } from "@/lib/scoring";

export const metadata: Metadata = { title: "Hall of Fame" };

const SIZE = 10;
const ordinal = (n: number) => `${n}${n === 1 ? "ST" : n === 2 ? "ND" : n === 3 ? "RD" : "TH"}`;

export default async function HallOfFamePage() {
  const [entries, me] = await Promise.all([hallOfFame(SIZE), getCurrentUser()]);
  const rows = [...entries, ...Array.from({ length: Math.max(0, 5 - entries.length) }, () => null)];

  return (
    <>
      <FlameTitle>
        <Gif gif={GIFS.sphere} height={34} /> HALL OF FAME <Gif gif={GIFS.sphere} height={34} />
      </FlameTitle>
      <p className="center tournament">-=[ TORNEIO DE ARTES MARCIAIS DA TORRE ]=-</p>
      {/* Campeão no centro, ladeado por dois guerreiros carregando ki (nenhum golpe cruza a cena). */}
      <div className="arena" aria-hidden="true">
        <Gif gif={GIFS.powerUp} height={110} className="arena-left" />
        <Gif gif={GIFS.gokuWon} height={130} className="arena-champion" />
        <Gif gif={GIFS.gotenksPowerUp} height={110} className="arena-right" />
      </div>
      <div className="highscores">
        <p className="hs-title">
          <Blink>HIGH SCORES</Blink>
        </p>
        <table className="hs-table">
          <thead>
            <tr>
              <th scope="col">RANK</th>
              <th scope="col">SCORE</th>
              <th scope="col">NAME</th>
              <th scope="col">STAGES</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={i} className={e && e.username === me?.username ? "hs-me" : undefined}>
                <td>{ordinal(i + 1)}</td>
                <td>{String(e?.points ?? 0).padStart(6, "0")}</td>
                <td>{e ? e.username.toUpperCase() : "---"}</td>
                <td>{e?.solved ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hs-foot">
          {entries.length === 0 ? "SEJA O PRIMEIRO A ENTRAR AQUI!" : me ? "CONTINUE SUBINDO A TORRE!" : "INSERT COIN TO CONTINUE"}
        </p>
      </div>
      <p className="center dim small">
        Cada desafio vale 100 × dificuldade. Cada dica revelada antes de resolver tira {HINT_PENALTY * 100}% (até sobrar 20%). Quem desiste não
        pontua naquele desafio.{" "}
        {!me && (
          <>
            <Link href="/entrar?next=/hall-da-fama">Entre</Link> para aparecer aqui.
          </>
        )}
      </p>
    </>
  );
}

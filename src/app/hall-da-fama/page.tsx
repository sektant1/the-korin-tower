import type { Metadata } from "next";
import Link from "next/link";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { Blink, FlameTitle } from "@/components/Retro";
import { getCurrentUser } from "@/lib/auth/session";
import { hallOfFame } from "@/lib/progress";
import { DAILY_BONUS, HINT_PENALTY } from "@/lib/scoring";

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
      {/* Campeão no centro; de um lado quem treina, do outro o rival de braços cruzados. */}
      <div className="arena" aria-hidden="true">
        <Gif gif={GIFS.powerUp} height={110} className="arena-left" />
        <Gif gif={GIFS.gokuWon} height={130} className="arena-champion" />
        <Gif gif={GIFS.vegeta} height={110} className="arena-right" />
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
                <td>{e ? <Link href={`/jogador/${e.username}`}>{e.username.toUpperCase()}</Link> : "---"}</td>
                <td>{e?.solved ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hs-foot">
          {entries.length === 0 ? "NINGUÉM AINDA" : me ? "CONTINUE SUBINDO" : "ENTRE PARA APARECER AQUI"}
        </p>
      </div>
      <p className="center dim small">
        Cada desafio vale 100 × dificuldade. Dica revelada tira {HINT_PENALTY * 100}%. Desistir zera. Desafio do dia resolvido no dia vale +
        {DAILY_BONUS * 100}%.{" "}
        {!me && (
          <>
            <Link href="/entrar?next=/hall-da-fama">Entre</Link> para aparecer aqui.
          </>
        )}
      </p>
    </>
  );
}

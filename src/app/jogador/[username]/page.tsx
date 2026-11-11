import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeShelf } from "@/components/Badges";
import { Gif } from "@/components/Gif";
import { Difficulty, FlameTitle, Window, arcade } from "@/components/Retro";
import { normalizeUsername } from "@/lib/auth/password";
import { GIFS } from "@/lib/gifs";
import { getPlayerProfile } from "@/lib/profile";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Jogador ${(await params).username}` };
}

// Perfil público (Fase 5): pontos, sequência, medalhas e desafios resolvidos. Nunca mostra código.
export default async function PlayerPage({ params }: Params) {
  const profile = await getPlayerProfile(normalizeUsername((await params).username));
  if (!profile) notFound();

  return (
    <>
      <FlameTitle>{arcade(profile.username.toUpperCase())}</FlameTitle>
      <div className="two-col">
        <Window title="Ficha do lutador">
          <p className="center">
            <Gif gif={GIFS.goku} alt="" />
          </p>
          <dl className="stats98">
            <dt>Pontos</dt>
            <dd>{profile.points}</dd>
            <dt>Resolvidos</dt>
            <dd>{profile.solved.length}</dd>
            <dt>Sequência atual</dt>
            <dd>{profile.streak.current} dia(s)</dd>
            <dt>Melhor sequência</dt>
            <dd>{profile.streak.best} dia(s)</dd>
            <dt>Na torre desde</dt>
            <dd>{profile.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</dd>
          </dl>
          <p>
            <Link href="/hall-da-fama">Ver o Hall of Fame</Link>
          </p>
        </Window>
        <Window title={`Medalhas (${profile.badges.length})`}>
          <BadgeShelf earned={profile.badges} />
        </Window>
      </div>
      <Window title="Desafios resolvidos">
        {profile.solved.length === 0 ? (
          <p className="dim">Nenhum desafio resolvido ainda.</p>
        ) : (
          <div className="table-scroll">
            <table className="table98">
              <thead>
                <tr>
                  <th scope="col">Desafio</th>
                  <th scope="col">Dificuldade</th>
                  <th scope="col">Pontos</th>
                  <th scope="col">Quando</th>
                </tr>
              </thead>
              <tbody>
                {profile.solved.map((s) => (
                  <tr key={s.slug}>
                    <td>
                      <Link href={`/desafio/${s.slug}`}>{s.title}</Link>
                    </td>
                    <td>
                      <Difficulty level={s.difficulty} />
                    </td>
                    <td className="num">
                      {s.points}
                      {s.dailyBonus && <span title="Bônus do desafio do dia"> ★</span>}
                    </td>
                    <td>{s.solvedAt?.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Window>
    </>
  );
}

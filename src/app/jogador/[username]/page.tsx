import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { achievementCount, AchievementShelf } from "@/components/Achievements";
import { Avatar } from "@/components/Avatar";
import {
  Difficulty,
  PageBanner,
  Window,
  arcade,
} from "@/components/Retro";
import { normalizeUsername } from "@/lib/auth/password";
import { getPlayerProfile } from "@/lib/profile";
import { FLOORS } from "@/lib/tower";
import { PAGE_SCENES } from "@/lib/scenes";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Jogador ${(await params).username}` };
}

// Perfil público (Fase 5): avatar, pontos, sequência, conquistas e desafios resolvidos. Nunca mostra código.
export default async function PlayerPage({ params }: Params) {
  const profile = await getPlayerProfile(
    normalizeUsername((await params).username),
  );
  if (!profile) notFound();
  const count = achievementCount(profile.achievements);

  return (
    <>
      <PageBanner
        title={arcade(profile.username.toUpperCase())}
        image={PAGE_SCENES.jogador}
        kicker="Perfil"
        stats={[
          { n: profile.points, label: "pontos" },
          {
            n: profile.solved.length,
            label: profile.solved.length === 1 ? "resolvido" : "resolvidos",
          },
          {
            n: count.got,
            label: count.got === 1 ? "conquista" : "conquistas",
          },
        ]}
      />
      <div className="account-grid">
        <Window title="Perfil">
          <div className="profile-head">
            <Avatar id={profile.avatar} size="lg" />
          </div>
          <dl className="stats98">
            <dt>Andar</dt>
            <dd>
              {profile.floorsOpen} de {FLOORS}
            </dd>
            <dt>Sequência</dt>
            <dd>
              {profile.streak.current} {profile.streak.current === 1 ? "dia" : "dias"} (melhor: {profile.streak.best})
            </dd>
            <dt>Na torre desde</dt>
            <dd>
              {profile.createdAt.toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </dd>
          </dl>
          <div className="profile-actions">
            <Link href="/hall-da-fama">Ver o Hall of Fame</Link>
          </div>
        </Window>
        <Window title={`Conquistas (${count.got}/${count.total})`}>
          <AchievementShelf unlocked={profile.achievements} />
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
                      {s.dailyBonus && (
                        <span title="Bônus do desafio do dia"> ★</span>
                      )}
                    </td>
                    <td>
                      {s.solvedAt?.toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      }) ?? "-"}
                    </td>
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

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/entrar/actions";
import { PageBanner, Window } from "@/components/Retro";
import { githubConfig } from "@/lib/auth/github";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { achievementCount, AchievementShelf } from "@/components/Achievements";
import { Avatar } from "@/components/Avatar";
import { AVATARS, DEFAULT_AVATAR_ID, isAvatarUnlocked, unlockHint } from "@/lib/avatars";
import { AvatarDialog } from "./AvatarDialog";
import { getPlayerProfile } from "@/lib/profile";
import { getProgressSummary } from "@/lib/progress";
import { listApiTokens } from "@/lib/auth/tokens";
import { FLOORS } from "@/lib/tower";
import { siteUrl } from "@/lib/site-url";
import { dropApiToken } from "./actions";
import { PasswordForm } from "./PasswordForm";
import { TokenForm } from "./TokenForm";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/conta");
  const [user, summary, profile, tokens] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { passwordHash: true, githubId: true, createdAt: true },
    }),
    getProgressSummary(me.id),
    getPlayerProfile(me.username),
    listApiTokens(me.id),
  ]);
  const solved = Object.values(summary.map).filter(
    (s) => s === "solved",
  ).length;
  const gaveUp = Object.values(summary.map).filter(
    (s) => s === "gaveup",
  ).length;
  const unlocked = profile?.achievements ?? [];
  const count = achievementCount(unlocked);
  const owned = { achievements: new Set(unlocked.map((u) => u.id)), isAdmin: me.isAdmin };
  const avatarOptions = AVATARS.map((a) => {
    const open = isAvatarUnlocked(a, owned);
    return { id: a.id, name: a.name, unlocked: open, how: open ? undefined : unlockHint(a) };
  });

  return (
    <>
      <PageBanner
        title="MINHA CONTA"
        image={PAGE_SCENES.conta}
        focus="center 40%"
        kicker="JOGADOR"
        lead={me.username}
        stats={[
          { n: summary.points, label: "pontos" },
          { n: solved, label: solved === 1 ? "resolvido" : "resolvidos" },
          { n: profile?.floorsOpen ?? 1, label: `de ${FLOORS} andares` },
        ]}
      >
        <p className="page-banner-extra">
          <Link href={`/jogador/${me.username}`}>Ver perfil público ►</Link>
        </p>
      </PageBanner>
      <div className="account-grid">
        <Window title="Perfil">
          <div className="profile-head">
            <AvatarDialog options={avatarOptions} current={profile?.avatar ?? DEFAULT_AVATAR_ID}>
              <Avatar id={profile?.avatar} size="lg" />
            </AvatarDialog>
          </div>
          <dl className="stats98">
            <dt>Sequência</dt>
            <dd>
              {profile?.streak.current ?? 0} {(profile?.streak.current ?? 0) === 1 ? "dia" : "dias"} (melhor:{" "}
              {profile?.streak.best ?? 0})
            </dd>
            <dt>Desistências</dt>
            <dd>{gaveUp}</dd>
            <dt>Na torre desde</dt>
            <dd>{user.createdAt.toLocaleDateString("pt-BR")}</dd>
            <dt>GitHub</dt>
            <dd>
              {user.githubId ? (
                "ligado"
              ) : githubConfig() ? (
                <a href="/api/auth/github" className="btn98 small">
                  Ligar conta GitHub
                </a>
              ) : (
                "não configurado no site"
              )}
            </dd>
          </dl>
          <div className="profile-actions">
            {me.isAdmin && <Link href="/admin">Painel admin</Link>}
            <form action={logout}>
              <button type="submit" className="btn98">
                Sair
              </button>
            </form>
          </div>
        </Window>
        <Window title={`Conquistas (${count.got}/${count.total})`}>
          <AchievementShelf unlocked={unlocked} />
        </Window>
        <Window title={user.passwordHash ? "Trocar senha" : "Criar senha"}>
          {!user.passwordHash && (
            <p className="dim small">
              Você entra pelo GitHub. Com uma senha, entra também por usuário e
              senha.
            </p>
          )}
          <PasswordForm hasPassword={!!user.passwordHash} />
        </Window>
        <Window title="Tokens da CLI (korin)">
          <p className="small">
            Para a <Link href="/cli">CLI</Link>. Um token vale como a sua senha,
            quem o tiver envia código em seu nome.
          </p>
          {tokens.length > 0 && (
            <table className="table98 tokens-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Prefixo</th>
                  <th>Criado</th>
                  <th>Último uso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>
                      <code>{t.prefix}…</code>
                    </td>
                    <td>{t.createdAt.toLocaleDateString("pt-BR")}</td>
                    <td>
                      {t.lastUsedAt
                        ? t.lastUsedAt.toLocaleDateString("pt-BR")
                        : "nunca"}
                    </td>
                    <td>
                      <form action={dropApiToken}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="btn98 small">
                          Revogar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <TokenForm loginUrl={await siteUrl()} />
        </Window>
      </div>
    </>
  );
}

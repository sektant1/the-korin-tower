import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/entrar/actions";
import { FlameTitle, Window } from "@/components/Retro";
import { githubConfig } from "@/lib/auth/github";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getProgressSummary } from "@/lib/progress";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar?next=/conta");
  const [user, summary] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true, githubId: true, createdAt: true } }),
    getProgressSummary(me.id),
  ]);
  const solved = Object.values(summary.map).filter((s) => s === "solved").length;
  const gaveUp = Object.values(summary.map).filter((s) => s === "gaveup").length;

  return (
    <>
      <FlameTitle>MEMORY CARD</FlameTitle>
      <div className="two-col">
        <Window title={`Jogador: ${me.username}`}>
          <dl className="stats98">
            <dt>Pontos</dt>
            <dd>{summary.points}</dd>
            <dt>Resolvidos</dt>
            <dd>{solved}</dd>
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
          <p>
            <Link href="/hall-da-fama">Ver o Hall of Fame</Link>
            {me.isAdmin && (
              <>
                {" · "}
                <Link href="/admin">Painel admin</Link>
              </>
            )}
          </p>
          <form action={logout}>
            <button type="submit" className="btn98">
              Sair (logout)
            </button>
          </form>
        </Window>
        <Window title={user.passwordHash ? "Trocar senha" : "Criar senha"}>
          {!user.passwordHash && <p className="dim small">Você entra pelo GitHub. Crie uma senha para entrar também com usuário e senha.</p>}
          <PasswordForm hasPassword={!!user.passwordHash} />
        </Window>
      </div>
    </>
  );
}

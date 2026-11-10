import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlameTitle, Window } from "@/components/Retro";
import { githubConfig } from "@/lib/auth/github";
import { getCurrentUser, safeNext } from "@/lib/auth/session";
import { LoginForm, RegisterForm } from "./AuthForms";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ next?: string; erro?: string; convite?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, erro, convite } = await searchParams;
  const target = safeNext(next);
  if (await getCurrentUser()) redirect(target);
  const github = githubConfig() !== null;

  return (
    <>
      <FlameTitle>INSERT COIN</FlameTitle>
      <p className="center">
        Entre para salvar progresso e rascunhos na sua conta, liberar soluções e aparecer no <Link href="/hall-da-fama">Hall of Fame</Link>.
        Sem conta você ainda pode jogar tudo; o progresso fica só neste navegador.
      </p>
      {erro && (
        <p className="out-warn center" role="alert">
          (!) {erro}
        </p>
      )}
      <div className="two-col">
        <Window title="Continuar jogo (login)">
          <LoginForm next={target} />
          {github && (
            <p className="auth-alt">
              <a href="/api/auth/github" className="btn98">
                Entrar com GitHub
              </a>
            </p>
          )}
        </Window>
        <Window title="Novo jogador (cadastro)">
          <p className="dim small">A torre é só para convidados. Peça um código de convite a quem administra o site.</p>
          <RegisterForm next={target} invite={convite ?? ""} />
          {github && (
            <form action="/api/auth/github" method="get" className="auth-alt">
              <label htmlFor="gh-invite" className="dim small">
                Ou cadastre com GitHub (também precisa do convite):
              </label>
              <span className="auth-inline">
                <input id="gh-invite" name="invite" className="input98" defaultValue={convite ?? ""} placeholder="KORIN-XXXX-XXXX" required />
                <button type="submit" className="btn98">
                  GitHub
                </button>
              </span>
            </form>
          )}
        </Window>
      </div>
    </>
  );
}

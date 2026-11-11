import type { Metadata } from "next";
import Link from "next/link";
import { FlameTitle, Window } from "@/components/Retro";
import { getCurrentUser } from "@/lib/auth/session";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "CLI (korin)" };

const COMMANDS: [string, string][] = [
  ["korin next [--pick]", "o próximo desafio da torre; --pick já baixa"],
  ["korin status", "seu andar, pontos, esferas e o que falta para subir"],
  ["korin list [-a andar] [-c cat] [--todo]", "os desafios, andar por andar"],
  ["korin tracks", "os detonados e seu progresso"],
  ["korin daily [--pick]", "desafio do dia"],
  ["korin pick slug [-l ling] [-d pasta]", "baixa enunciado, template e testes públicos"],
  ["korin run [-i entrada]", "executa com a entrada do pipe, de um arquivo ou do 1º teste"],
  ["korin test [--local]", "testes públicos, no servidor ou com o seu compilador"],
  ["korin submit", "todos os testes, inclusive os ocultos"],
  ["korin push", "salva o código como rascunho na conta"],
  ["korin hint · solution · giveup", "as mesmas regras do site"],
  ["korin open · show", "abre no navegador · imprime o enunciado"],
  ["korin doctor", "confere Node, token, servidor e compiladores"],
  ["korin update", "baixa a versão mais nova"],
];

// Fase 6: a CLI é um único arquivo Node servido pelo próprio site em /cli/korin.mjs.
export default async function CliPage() {
  const [url, me] = await Promise.all([siteUrl(), getCurrentUser()]);
  const dl = `${url}/cli/korin.mjs`;
  return (
    <>
      <FlameTitle>KORIN CLI</FlameTitle>
      <p className="center dim">Resolva no seu editor e envie pelo terminal. Um arquivo, sem dependências, Node 22.7 ou mais novo.</p>
      <div className="two-col">
        <Window title="instalar.txt">
          <p className="small">Linux e macOS:</p>
          <pre className="code-block">
            <code>{`curl -fsSL ${url}/install.sh | bash`}</code>
          </pre>
          <p className="small">Windows (PowerShell):</p>
          <pre className="code-block">
            <code>{`irm ${url}/install.ps1 | iex`}</code>
          </pre>
          <p className="small dim">
            O instalador baixa <code>korin.mjs</code> para <code>~/.local/bin</code> (ou <code>%LOCALAPPDATA%\korin</code>) e avisa se faltar algo no
            PATH. Sem instalador: <code>{`curl -fsSL ${dl} -o korin && chmod +x korin`}</code>.
          </p>
          <ol className="cli-steps">
            <li>
              Gere um token em <Link href={me ? "/conta" : "/entrar?next=/conta"}>Minha conta</Link> e entre:
              <pre className="code-block">
                <code>{`korin login`}</code>
              </pre>
            </li>
            <li>
              Deixe a torre escolher e resolva no seu editor:
              <pre className="code-block">
                <code>{`korin next --pick
cd fizzbuzz && vim main.c
korin test
korin submit`}</code>
              </pre>
            </li>
          </ol>
          <p className="small dim">
            O token fica em <code>~/.config/korin/config.json</code> e pode ser revogado em Minha conta. Em scripts, use{" "}
            <code>KORIN_TOKEN</code> e <code>KORIN_URL</code>.
          </p>
        </Window>
        <Window title="comandos.txt">
          <table className="table98">
            <tbody>
              {COMMANDS.map(([cmd, what]) => (
                <tr key={cmd}>
                  <td>
                    <code>{cmd}</code>
                  </td>
                  <td>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small dim">
            A categoria <Link href="/categoria/leetcode">LeetCode</Link> foi feita para a CLI: os clássicos em stdin/stdout.
          </p>
        </Window>
      </div>
    </>
  );
}

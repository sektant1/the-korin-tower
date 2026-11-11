import type { Metadata } from "next";
import Link from "next/link";
import { FlameTitle, RainbowHr, Window } from "@/components/Retro";
import { getCurrentUser } from "@/lib/auth/session";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "CLI (korin)" };

// Fase 6: a CLI é um único arquivo Node servido pelo próprio site em /cli/korin.mjs.
export default async function CliPage() {
  const [url, me] = await Promise.all([siteUrl(), getCurrentUser()]);
  const dl = `${url}/cli/korin.mjs`;
  return (
    <>
      <FlameTitle>KORIN CLI</FlameTitle>
      <div className="two-col">
        <Window title="leiame.txt">
          <p>
            Prefere o seu editor ao do site? A <b>korin</b> é uma CLI no estilo das do LeetCode: baixa o enunciado, o template e os testes públicos
            para uma pasta, e depois testa e envia direto do terminal. Os testes ocultos continuam no servidor; os pontos, as dicas e os rascunhos
            são os mesmos da sua conta.
          </p>
          <p className="small dim">Um arquivo, sem dependências. Precisa do Node 22.7 ou mais novo. Funciona em Linux, macOS e Windows.</p>
          <ol className="cli-steps">
            <li>
              Instale (Linux/macOS):
              <pre className="out-pre small">
                <code>{`mkdir -p ~/.local/bin && curl -fsSL ${dl} -o ~/.local/bin/korin && chmod +x ~/.local/bin/korin`}</code>
              </pre>
              <span className="small dim">
                No Windows (PowerShell): <code>{`iwr ${dl} -OutFile korin.mjs`}</code> e use <code>node korin.mjs ...</code>. Garanta que{" "}
                <code>~/.local/bin</code> está no PATH.
              </span>
            </li>
            <li>
              Gere um token em {me ? <Link href="/conta">Minha conta</Link> : <Link href="/entrar?next=/conta">Minha conta</Link>} e faça login:
              <pre className="out-pre small">
                <code>{`korin login --url ${url}`}</code>
              </pre>
            </li>
            <li>
              Escolha um desafio e resolva no seu editor:
              <pre className="out-pre small">
                <code>{`korin list --todo
korin pick fizzbuzz -l c      # cria ./fizzbuzz/ com README.md, main.c e tests/
cd fizzbuzz && vim main.c
korin test                    # testes públicos (ou: korin test --local, com o seu gcc)
korin submit                  # todos os testes; marca como resolvido e pontua`}</code>
              </pre>
            </li>
          </ol>
        </Window>
        <Window title="comandos.txt">
          <table className="table98">
            <tbody>
              <tr>
                <td>
                  <code>korin list [-c cat] [--todo]</code>
                </td>
                <td>lista os desafios, com CLEAR nos resolvidos</td>
              </tr>
              <tr>
                <td>
                  <code>korin daily [--pick]</code>
                </td>
                <td>desafio do dia (+50% se resolver hoje)</td>
              </tr>
              <tr>
                <td>
                  <code>korin pick slug [-l ling] [-d pasta]</code>
                </td>
                <td>baixa enunciado, template (ou seu rascunho) e testes públicos</td>
              </tr>
              <tr>
                <td>
                  <code>korin run [-i entrada]</code>
                </td>
                <td>executa com stdin do pipe, de um arquivo ou do 1º teste</td>
              </tr>
              <tr>
                <td>
                  <code>korin test [--local]</code>
                </td>
                <td>testes públicos no servidor, ou na sua máquina</td>
              </tr>
              <tr>
                <td>
                  <code>korin submit</code>
                </td>
                <td>todos os testes, inclusive os ocultos</td>
              </tr>
              <tr>
                <td>
                  <code>korin push</code>
                </td>
                <td>salva o código como rascunho na conta (aparece no site)</td>
              </tr>
              <tr>
                <td>
                  <code>korin hint</code> · <code>solution</code> · <code>giveup</code>
                </td>
                <td>as mesmas regras do site: dica desconta, desistir zera</td>
              </tr>
              <tr>
                <td>
                  <code>korin open</code> · <code>show</code>
                </td>
                <td>abre no navegador · imprime o enunciado</td>
              </tr>
              <tr>
                <td>
                  <code>korin config lang=rust</code>
                </td>
                <td>linguagem padrão do <code>pick</code></td>
              </tr>
              <tr>
                <td>
                  <code>korin update</code>
                </td>
                <td>baixa a versão mais nova daqui</td>
              </tr>
            </tbody>
          </table>
          <p className="small dim">
            O token vale como senha: fica em <code>~/.config/korin/config.json</code> (modo 600) e pode ser revogado em Minha conta. Também dá para
            passar por <code>KORIN_TOKEN</code> e <code>KORIN_URL</code>, útil em scripts. O fonte está em <code>cli/korin.mjs</code> no repositório.
          </p>
        </Window>
      </div>
      <RainbowHr />
      <Window title="Estilo LeetCode">
        <p>
          Com a CLI veio a categoria <Link href="/categoria/leetcode">Estilo LeetCode</Link>: os clássicos de entrevista reescritos em
          stdin/stdout, com enunciado próprio e link para o problema original para quem quiser comparar. É a maneira de treinar para entrevista
          sem sair do fluxo da torre.
        </p>
      </Window>
    </>
  );
}

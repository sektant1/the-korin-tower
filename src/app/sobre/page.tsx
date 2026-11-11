import type { Metadata } from "next";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { ALL_BUTTONS, Blink, Button88, ButtonWall, FlameTitle, RainbowHr, Window } from "@/components/Retro";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Sobre" };

export default async function AboutPage() {
  const url = await siteUrl();
  const snippet = `<a href="${url}"><img src="${url}/korin-88x31.svg" width="88" height="31" alt="The Korin Tower"></a>`;
  return (
    <>
      <FlameTitle>SOBRE</FlameTitle>
      <div className="two-col">
        <Window title="me.bmp">
          <div className="photo-frame">
            <Gif gif={GIFS.gokuStand} height={170} alt="Foto do webmaster" />
          </div>
          <p className="center small">
            <Blink>★ WEBMASTER ★</Blink>
          </p>
        </Window>
        <Window title="leiame.txt">
          <p>Esta é a minha homepage. Fiz a torre para treinar programação de baixo nível com os amigos.</p>
          <p>Cada andar é um tema. Cada desafio compila de verdade e passa por testes. O editor é Vim porque sim.</p>
          <p>Coisas que eu curto:</p>
          <ul className="star-list">
            <li>ponteiros que apontam para onde deveriam</li>
            <li>ray tracers que demoram a noite toda</li>
            <li>emuladores de CHIP-8</li>
          </ul>
        </Window>
      </div>
      <RainbowHr />
      <div className="two-col">
        <Window title="botao.txt">
          <div id="botao" className="link-back">
            <Button88 kind="korin" />
            <p className="small">Linke para a torre com este botão:</p>
            <textarea className="stdin98 snippet" readOnly rows={3} defaultValue={snippet} aria-label="HTML do botão" />
          </div>
        </Window>
        <Window title="links.txt">
        <ul className="star-list">
          <li>
            <a href="https://raytracing.github.io/" rel="noopener noreferrer">
              Ray Tracing in One Weekend
            </a>
          </li>
          <li>
            <a href="https://doc.rust-lang.org/nomicon/" rel="noopener noreferrer">
              The Rustonomicon
            </a>
          </li>
          <li>
            <a href="https://craftinginterpreters.com/" rel="noopener noreferrer">
              Crafting Interpreters
            </a>
          </li>
          <li>
            <a href="https://iquilezles.org/articles/" rel="noopener noreferrer">
              Artigos do Inigo Quilez
            </a>
          </li>
        </ul>
        </Window>
      </div>
      <Window title="botoes.txt">
        <ButtonWall kinds={ALL_BUTTONS} />
        <p className="dim small center">
          Botões resgatados de sites pessoais antigos. Fonte dos títulos: Saiyan Sans, de{" "}
          <a href="https://www.tboyonline.com" rel="noopener noreferrer">
            Ben Palmer
          </a>
          .
        </p>
      </Window>
    </>
  );
}

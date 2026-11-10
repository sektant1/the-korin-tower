import type { Metadata } from "next";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { Blink, FlameTitle, RainbowHr, Window } from "@/components/Retro";

export const metadata: Metadata = { title: "Sobre mim" };

export default function AboutPage() {
  return (
    <>
      <FlameTitle>SOBRE MIM</FlameTitle>
      <div className="two-col">
        <Window title="me.bmp">
          <div className="photo-frame">
            <Gif gif={GIFS.trunks} height={170} alt="Foto do webmaster" />
          </div>
          <p className="center small">
            <Blink>★ WEBMASTER ★</Blink>
          </p>
        </Window>
        <Window title="leiame.txt">
          <p>
            Oi! Bem-vindo à minha homepage. Montei esta torre para aprender programação de baixo nível e para ensinar meus amigos.
          </p>
          <p>Coisas que eu curto:</p>
          <ul className="star-list">
            <li>ponteiros que apontam para onde deveriam</li>
            <li>ray tracers que demoram a noite toda</li>
            <li>emuladores de CHIP-8</li>
            <li>Vim (obviamente)</li>
          </ul>
          <p className="center">
            <Gif gif={GIFS.gokuSsj} height={220} />
          </p>
          <p className="dim small">Edite esta página em src/app/sobre/page.tsx.</p>
        </Window>
      </div>
      <RainbowHr />
      <Window title="Páginas favoritas">
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
    </>
  );
}

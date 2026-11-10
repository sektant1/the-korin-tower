import type { Metadata } from "next";
import { Gif } from "@/components/Gif";
import { FlameTitle, UnderConstruction, Window } from "@/components/Retro";
import { GIFS } from "@/lib/gifs";

export const metadata: Metadata = { title: "Detonados" };

// Fase 3: trilhas definidas em /challenges/tracks.yml.
const PLANNED = ["Do zero ao Ray Tracer", "Escreva seu próprio malloc", "Emulador CHIP-8 em 10 passos"];

export default function TracksPage() {
  return (
    <>
      <FlameTitle>DETONADOS</FlameTitle>
      <p className="center">
        <Gif gif={GIFS.gokuDuo} height={90} /> <Gif gif={GIFS.friezaDisc} height={70} />
      </p>
      <p>Trilhas são sequências de desafios, como um detonado de revista: siga passo a passo até zerar.</p>
      <Window title="Em breve">
        <ul className="star-list">
          {PLANNED.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <UnderConstruction what="Trilhas chegam na Fase 3" />
      </Window>
    </>
  );
}

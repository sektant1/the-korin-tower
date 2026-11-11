import type { Metadata } from "next";
import { FlameTitle } from "@/components/Retro";
import { Playground } from "@/components/workspace/Playground";

export const metadata: Metadata = { title: "Compilador" };

// Compilador livre: a mesma sala de treino dos desafios, sem desafio. Não há
// testes nem pontos; rascunhos ficam no navegador. PPM P3 renderiza na saída.
export default function CompiladorPage() {
  return (
    <div className="playground-page">
      <div>
        <FlameTitle>COMPILADOR</FlameTitle>
        <p className="dim small">
          Sala de treino: escreva em qualquer linguagem da torre e execute com o stdin ao lado. Sem testes, sem pontos — e se o programa
          imprimir um PPM <b>P3</b>, a imagem aparece na saída. Rascunhos ficam neste navegador.
        </p>
      </div>
      <Playground />
    </div>
  );
}

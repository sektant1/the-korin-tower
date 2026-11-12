import type { Metadata } from "next";
import { FlameTitle, PageBanner } from "@/components/Retro";
import { Playground } from "@/components/workspace/Playground";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Compilador" };

// Compilador livre: a mesma sala de treino dos desafios, sem desafio. Não há
// testes nem pontos; rascunhos ficam no navegador. PPM P3 renderiza na saída.
export default function CompiladorPage() {
  return (
    <div className="playground-page">
      <div>
        <FlameTitle>COMPILADOR</FlameTitle>
        <PageBanner
          image={PAGE_SCENES.compilador}
          compact
          lead="Qualquer linguagem da torre, sem testes nem pontos. Se a saída for um PPM P3, vira imagem."
        />
      </div>
      <Playground />
    </div>
  );
}

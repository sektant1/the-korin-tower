import type { Metadata } from "next";
import { PageBanner } from "@/components/Retro";
import { Playground } from "@/components/workspace/Playground";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Sandbox" };

// Compilador livre: a mesma sala de treino dos desafios, sem desafio. Não há
// testes nem pontos; rascunhos ficam no navegador. PPM P3 renderiza na saída.
export default function CompiladorPage() {
  return (
    <div className="playground-page">
      <div>
        <PageBanner
          title="COMPILADOR"
          image={PAGE_SCENES.compilador}
          compact
          lead="Escreva e rode código, sem desafio e sem pontos."
        />
      </div>
      <Playground />
    </div>
  );
}

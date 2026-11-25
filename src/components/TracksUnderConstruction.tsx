import Link from "next/link";
import { PageBanner, UnderConstruction, Window } from "@/components/Retro";
import { PAGE_SCENES } from "@/lib/scenes";

/** Trilhas desligadas: a página fica no ar, em obras. */
export function TracksUnderConstruction() {
  return (
    <>
      <PageBanner
        title="TRILHAS"
        image={PAGE_SCENES.detonados}
        lead="Listas de desafios para fazer em ordem, um assunto por trilha."
      />
      <Window title="trilhas.txt">
        <UnderConstruction what="As trilhas estão sendo refeitas. Volte depois!" />
        <p>
          Enquanto isso, suba pela <Link href="/desafios">Torre</Link>.
        </p>
      </Window>
    </>
  );
}

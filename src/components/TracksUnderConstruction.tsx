import Link from "next/link";
import { FlameTitle, UnderConstruction, Window } from "@/components/Retro";

/** Detonados desligados: a página fica no ar, em obras. */
export function TracksUnderConstruction() {
  return (
    <>
      <FlameTitle>Learning Paths</FlameTitle>
      <Window title="detonados.txt">
        <UnderConstruction what="Os detonados estão sendo refeitos. Volte depois!" />
        <p>
          Enquanto isso, suba pela <Link href="/desafios">Torre</Link>.
        </p>
      </Window>
    </>
  );
}

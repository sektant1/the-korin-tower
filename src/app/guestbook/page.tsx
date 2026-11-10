import type { Metadata } from "next";
import { Gif } from "@/components/Gif";
import { FlameTitle, UnderConstruction, Window } from "@/components/Retro";
import { GIFS } from "@/lib/gifs";

export const metadata: Metadata = { title: "Guestbook" };

// Fase 3: guestbook persistido no banco.
export default function GuestbookPage() {
  return (
    <>
      <FlameTitle>LIVRO DE VISITAS</FlameTitle>
      <Window title="Assine meu guestbook!">
        <p className="center">
          <Gif gif={GIFS.guestbookButton} alt="Guestbook" /> <Gif gif={GIFS.navCommunity} alt="Community" />
        </p>
        <p>Deixe seu recado, seu ICQ e seu desafio favorito! (Quando a Fase 3 chegar…)</p>
        <UnderConstruction what="Guestbook chega na Fase 3" />
      </Window>
    </>
  );
}

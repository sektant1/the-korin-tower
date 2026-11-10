import Link from "next/link";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { Blink, FlameTitle } from "@/components/Retro";

export default function NotFound() {
  return (
    <div className="center">
      <Gif gif={GIFS.cellKick} height={160} />
      <FlameTitle>404 · VOCÊ CAIU DA TORRE!</FlameTitle>
      <p>Esta página foi devorada por um bug. Respire, coma um feijão senzu e suba de novo.</p>
      <p>
        <Link href="/" className="btn-start">
          <Blink>CONTINUE? ► HOME</Blink>
        </Link>
      </p>
    </div>
  );
}

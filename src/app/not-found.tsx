import Link from "next/link";
import { GIFS } from "@/lib/gifs";
import { PAGE_SCENES } from "@/lib/scenes";
import { Blink, FlameTitle, PageBanner } from "@/components/Retro";

export default function NotFound() {
  return (
    <>
      <FlameTitle>404 · VOCÊ CAIU DA TORRE</FlameTitle>
      <PageBanner image={PAGE_SCENES.naoEncontrado} kicker="ERRO 404" lead="Esta página não existe." gif={GIFS.cellKick} gifHeight={130}>
        <p className="page-banner-extra">
          <Link href="/" className="btn-start">
            <Blink>► VOLTAR AO INÍCIO</Blink>
          </Link>
        </p>
      </PageBanner>
    </>
  );
}

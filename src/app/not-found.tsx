import Link from "next/link";
import { PAGE_SCENES } from "@/lib/scenes";
import { Blink, PageBanner } from "@/components/Retro";

export default function NotFound() {
  return (
    <>
      <PageBanner
        title="VOCÊ CAIU DA TORRE"
        image={PAGE_SCENES.naoEncontrado}
        kicker="ERRO 404"
        lead="Esta página não existe."
      >
        <p className="page-banner-extra">
          <Link href="/" className="btn-start">
            <Blink>► VOLTAR AO INÍCIO</Blink>
          </Link>
        </p>
      </PageBanner>
    </>
  );
}

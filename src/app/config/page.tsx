import type { Metadata } from "next";
import { FlameTitle, PageBanner, Window } from "@/components/Retro";
import { SettingsForm } from "./SettingsForm";
import { PAGE_SCENES } from "@/lib/scenes";
import { GIFS } from "@/lib/gifs";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfigPage() {
  return (
    <>
      <FlameTitle>OPÇÕES</FlameTitle>
      <PageBanner
        image={PAGE_SCENES.opcoes}
        lead="Editor, tema e animações."
        sub="Vale neste navegador. Com login, acompanha a conta."
        gif={GIFS.cellMeteor}
      />
      <Window title="Painel de Controle">
        <SettingsForm />
      </Window>
    </>
  );
}

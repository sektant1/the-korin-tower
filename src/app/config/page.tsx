import type { Metadata } from "next";
import { PageBanner, Window } from "@/components/Retro";
import { SettingsForm } from "./SettingsForm";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfigPage() {
  return (
    <>
      <PageBanner
        title="OPÇÕES"
        image={PAGE_SCENES.opcoes}
        lead="Editor, tema e animações."
        sub="Vale neste navegador. Com login, acompanha a conta."
      />
      <Window title="Painel de Controle">
        <SettingsForm />
      </Window>
    </>
  );
}

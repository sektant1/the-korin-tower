import type { Metadata } from "next";
import { FlameTitle, Window } from "@/components/Retro";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfigPage() {
  return (
    <>
      <FlameTitle>OPÇÕES</FlameTitle>
      <Window title="Painel de Controle">
        <p className="dim small">Vale neste navegador. Com login, acompanha a conta.</p>
        <SettingsForm />
      </Window>
    </>
  );
}

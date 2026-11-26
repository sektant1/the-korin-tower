// Ícones de texto das cartas e espaços do HUD: um símbolo por comportamento de técnica, mais os
// tipos especiais de carta. Só caracteres comuns, para não depender de imagem.
import type { TechKind } from "../data/techniques";

export const KIND_ICON: Record<TechKind, string> = {
  beam: "≋",
  bolt: "●",
  fan: "⋰",
  lance: "➹",
  disc: "◎",
  flash: "✺",
  aura: "◌",
  bomb: "✹",
  slash: "⚔",
  blast: "✸",
  ghost: "☁",
  punch: "✊",
  orbit: "⟲",
  nova: "◉",
  converge: "⊛",
  barrage: "⁂",
  chain: "ϟ",
  vortex: "@",
  trail: "≈",
};

export const ICON = {
  passive: "✚",
  union: "⊕",
  pact: "☠",
  item: "✦",
  scroll: "§",
  set: "◆",
  senzu: "♥",
  zeni: "Ƶ",
  evolve: "▲",
  lock: "🔒",
} as const;

/** Formata número para a interface (separador de milhar em inglês). */
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

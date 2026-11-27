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

/** Nome curto do comportamento, mostrado embaixo do nome da técnica na carta. */
export const KIND_LABEL: Record<TechKind, string> = {
  beam: "Beam",
  bolt: "Projectile",
  fan: "Spread",
  lance: "Piercing ray",
  disc: "Boomerang",
  flash: "Stun flash",
  aura: "Aura",
  bomb: "Bomb",
  blast: "Explosions",
  slash: "Melee slash",
  ghost: "Seeker",
  punch: "Melee punch",
  orbit: "Orbit",
  nova: "Shockwave",
  converge: "Encircle",
  barrage: "Barrage",
  chain: "Chain",
  vortex: "Whirlwind",
  trail: "Trail",
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

/** Cor fixa de cada tipo de carta (faixa, borda e pips). A cor própria da técnica/passiva fica só
 *  no ícone, para o tipo ser reconhecível de relance. */
export const TYPE_COLOR = {
  tech: "#3aa8ff",
  passive: "#4ad86a",
  union: "#b46aff",
  pact: "#ff3a4a",
  item: "#ffb02a",
  gold: "#ffd21f",
} as const;

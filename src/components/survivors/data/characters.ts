// Personagens jogáveis (GDD §5). Cada um tem técnica inicial, passiva própria e uma escada de
// transformação. Passivas que dependem do estado da run (Orgulho, Fúria Oculta, riso do Hercule)
// são aplicadas em sim/world.ts pelo id do personagem.
import type { Stats } from "./stats";
import type { TechId } from "./techniques";

export type CharId = "goku" | "vegeta" | "gohan" | "piccolo" | "trunks" | "gotenks" | "hercule" | "vegetto";

export interface FormDef {
  name: string;
  aura: string; // cor da aura e do clarão
  sprite: string; // chave da animação no atlas (cai no sprite base se não existir)
  hair?: string; // cor do cabelo do placeholder
}

export interface CharDef {
  id: CharId;
  name: string;
  start: TechId;
  passive: string;
  color: string; // cor do placeholder até o atlas chegar
  hair: string;
  sprite: string;
  /** Degraus de transformação: liberados nos níveis 10, 25 e 40. */
  forms: FormDef[];
  apply(s: Stats): void;
  /** Como desbloquear (texto da seleção de personagem). */
  unlock: string;
}

export const CHARACTERS: Record<CharId, CharDef> = {
  goku: {
    id: "goku",
    name: "Goku",
    start: "kamehameha",
    passive: "Saiyan Blood: +10% XP",
    color: "#ff8a1f",
    hair: "#1a1a1a",
    sprite: "goku",
    forms: [
      { name: "Super Saiyan", aura: "#ffd21f", sprite: "goku_ssj", hair: "#ffe14a" },
      { name: "Super Saiyan 2", aura: "#ffe85a", sprite: "goku_ssj2", hair: "#ffe14a" },
      { name: "Super Saiyan 3", aura: "#ffb000", sprite: "goku_ssj2", hair: "#ffc400" },
    ],
    apply: (s) => void (s.growth += 0.1),
    unlock: "Starter",
  },
  vegeta: {
    id: "vegeta",
    name: "Vegeta",
    start: "rajada",
    passive: "Pride: +1% damage per 10 kills (max +30%)",
    color: "#2b4bd8",
    hair: "#1a1a1a",
    sprite: "vegeta",
    forms: [
      { name: "Super Saiyan", aura: "#ffd21f", sprite: "vegeta_ssj", hair: "#ffe14a" },
      { name: "Super Vegeta", aura: "#ffe85a", sprite: "vegeta_ssj", hair: "#ffe14a" },
    ],
    apply: () => {},
    unlock: "Reach 10:00 with Goku",
  },
  gohan: {
    id: "gohan",
    name: "Gohan",
    start: "masenko",
    passive: "Hidden Rage: up to +50% damage at low HP",
    color: "#6a3ad8",
    hair: "#1a1a1a",
    sprite: "gohan",
    forms: [
      { name: "Super Saiyan", aura: "#ffd21f", sprite: "gohan_ssj", hair: "#ffe14a" },
      { name: "Super Saiyan 2", aura: "#ffe85a", sprite: "gohan_ssj", hair: "#ffe14a" },
    ],
    apply: () => {},
    unlock: "Clear the Cell Saga",
  },
  piccolo: {
    id: "piccolo",
    name: "Piccolo",
    start: "makankosappo",
    passive: "Regeneration: +0.5 HP/s",
    color: "#3aa83a",
    hair: "#f0f0f0",
    sprite: "piccolo",
    forms: [{ name: "Fused with Kami", aura: "#e8f0ff", sprite: "piccolo" }],
    apply: (s) => void (s.recovery += 0.5),
    unlock: "Clear the Frieza Saga",
  },
  trunks: {
    id: "trunks",
    name: "Trunks",
    start: "espada",
    passive: "Future Training: -13% cooldown",
    color: "#4a7ad8",
    hair: "#b898e8",
    sprite: "trunks",
    forms: [
      { name: "Super Saiyan", aura: "#ffd21f", sprite: "trunks", hair: "#ffe14a" },
      { name: "Super Trunks", aura: "#ffe85a", sprite: "trunks", hair: "#ffe14a" },
    ],
    apply: (s) => void (s.cooldown *= 0.87),
    unlock: "Defeat 500 Cell Jr.",
  },
  gotenks: {
    id: "gotenks",
    name: "Gotenks",
    start: "fantasmas",
    passive: "Fusion: +1 projectile",
    color: "#d8a03a",
    hair: "#7a4ad8",
    sprite: "gotenks",
    forms: [
      { name: "Super Saiyan", aura: "#ffd21f", sprite: "gotenks", hair: "#ffe14a" },
      { name: "Super Saiyan 3", aura: "#ffb000", sprite: "gotenks", hair: "#ffc400" },
    ],
    apply: (s) => void (s.amount += 1),
    unlock: "Clear the Majin Buu Saga",
  },
  hercule: {
    id: "hercule",
    name: "Hercule",
    start: "socoDinamite",
    passive: "Champ's Luck: double luck; enemies sometimes faint laughing",
    color: "#f0f0f0",
    hair: "#2a1a0a",
    sprite: "hercule",
    forms: [{ name: "Champion Pose", aura: "#ff5a3a", sprite: "hercule" }],
    apply: (s) => void (s.luck *= 2),
    unlock: "Secret: die before 1:00 three times",
  },
  vegetto: {
    id: "vegetto",
    name: "Vegito",
    start: "espadaKi",
    passive: "Potara Fusion: +20% to all stats",
    color: "#ff7a1a",
    hair: "#1a1a1a",
    sprite: "vegetto",
    forms: [{ name: "Super Vegito", aura: "#ffd21f", sprite: "vegetto_ssj", hair: "#ffe14a" }],
    apply: (s) => {
      s.maxHp *= 1.2;
      s.might *= 1.2;
      s.moveSpeed *= 1.2;
      s.area *= 1.2;
      s.cooldown *= 0.83;
      s.magnet *= 1.2;
      s.growth *= 1.2;
    },
    unlock: "Secret: clear all 4 sagas with both Goku and Vegeta",
  },
};

export const CHAR_ORDER: CharId[] = ["goku", "vegeta", "gohan", "piccolo", "trunks", "gotenks", "hercule", "vegetto"];

/** Nível do herói que libera cada degrau de transformação. */
export const FORM_LEVELS = [10, 25, 40];

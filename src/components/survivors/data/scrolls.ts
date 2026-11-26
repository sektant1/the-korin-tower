// Pergaminhos Secretos: modificadores da run inteira, escolhidos 1 de 3 em SCROLL_TIMES (sim/core).
// Os que mexem só em atributos usam `apply`; os outros são lidos pela simulação pelo id.
import type { Stats } from "./stats";

export type ScrollId =
  | "instinto"
  | "oozaru"
  | "multiplicacao"
  | "pacto"
  | "kaiokenX20"
  | "zanzoken"
  | "absorcao"
  | "meteoros"
  | "gravidade100"
  | "fusaoInstavel"
  | "tartaruga"
  | "sorteOolong"
  | "espirito"
  | "kiai";

export interface ScrollDef {
  id: ScrollId;
  name: string;
  desc: string;
  color: string;
  apply?(s: Stats): void;
}

const S = (d: ScrollDef) => d;

export const SCROLLS: Record<ScrollId, ScrollDef> = {
  instinto: S({ id: "instinto", name: "Ultra Instinct", desc: "+15% dodge, +10% move speed.", color: "#c8d8ff", apply: (s) => {
      s.dodge += 0.15;
      s.moveSpeed += 0.1;
    } }),
  oozaru: S({ id: "oozaru", name: "Great Ape Rage", desc: "+35% damage, but -25% max HP.", color: "#a0522d", apply: (s) => {
      s.might += 0.35;
      s.maxHp *= 0.75;
    } }),
  multiplicacao: S({ id: "multiplicacao", name: "Multi-Form", desc: "+1 projectile on everything, -10% damage.", color: "#ff8a5a", apply: (s) => {
      s.amount += 1;
      s.might -= 0.1;
    } }),
  pacto: S({ id: "pacto", name: "Babidi's Bargain", desc: "+40% Curse: tougher, more numerous enemies. +40% XP and Zeni.", color: "#ff3a8a", apply: (s) => {
      s.curse += 0.4;
      s.growth += 0.4;
      s.greed += 0.4;
    } }),
  kaiokenX20: S({ id: "kaiokenX20", name: "Kaioken x20", desc: "+2% damage for every second without getting hit (up to +60%)." , color: "#ff2a2a" }),
  zanzoken: S({ id: "zanzoken", name: "Afterimage", desc: "When hit, release a ki burst and become untouchable for 1s.", color: "#7ad7ff" }),
  absorcao: S({ id: "absorcao", name: "Cell's Absorption", desc: "Every kill heals 0.2 HP.", color: "#5fd13a" }),
  meteoros: S({ id: "meteoros", name: "Meteor Shower", desc: "Every 3s, a ki meteor strikes the horde.", color: "#ff7a1a" }),
  gravidade100: S({ id: "gravidade100", name: "100x Gravity", desc: "-12% move speed, +40% XP, +15% damage.", color: "#8a8aff", apply: (s) => {
      s.moveSpeed -= 0.12;
      s.growth += 0.4;
      s.might += 0.15;
    } }),
  fusaoInstavel: S({ id: "fusaoInstavel", name: "Unstable Fusion", desc: "Transformations last twice as long; ki fills 50% faster.", color: "#ffd21f" }),
  tartaruga: S({ id: "tartaruga", name: "Turtle School Training", desc: "+2 armor, +30% max HP, -8% move speed.", color: "#ff9a1f", apply: (s) => {
      s.armor += 2;
      s.maxHp *= 1.3;
      s.moveSpeed -= 0.08;
    } }),
  sorteOolong: S({ id: "sorteOolong", name: "Oolong's Luck", desc: "+50% luck. Crates spawn twice as often.", color: "#ffb0d8", apply: (s) => void (s.luck += 0.5) }),
  espirito: S({ id: "espirito", name: "Saiyan Spirit", desc: "Below 35% HP: +50% damage and +2 HP/s regen.", color: "#ffe14a" }),
  kiai: S({ id: "kiai", name: "Kiai", desc: "Every 5s, a ki shout damages and repels nearby enemies.", color: "#fffbd0" }),
};

export const SCROLL_IDS = Object.keys(SCROLLS) as ScrollId[];

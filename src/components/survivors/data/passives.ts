// Passivas: cada nível soma o mesmo efeito. Ver GDD §7.
import type { CharId } from "./characters";
import type { Stats } from "./stats";

export type PassiveId =
  | "kaioken"
  | "salaTempo"
  | "gravidade"
  | "armadura"
  | "cauda"
  | "scouter"
  | "aguaDivina"
  | "potara"
  | "kaiohBencao"
  | "kiControlado"
  | "grandeKaioh"
  | "casco"
  | "terceiroOlho"
  | "nyoibo"
  | "nuvem"
  | "radar"
  | "marcaMajin"
  | "orgulho"
  | "pesos"
  | "poseGinyu"
  | "jarro"
  | "escolaGrou"
  | "telecinese"
  | "lenco"
  | "coroa"
  | "chocolate"
  | "chipGero"
  | "torreKorin"
  | "instintoLuta"
  | "principe"
  | "poderOculto"
  | "bracos"
  | "futuro"
  | "egoFusao"
  | "faClube"
  | "arrogancia";

export interface PassiveDef {
  id: PassiveId;
  name: string;
  desc: string;
  max: number;
  color: string;
  /** Só este personagem recebe a carta. */
  owner?: CharId;
  apply(s: Stats, level: number): void;
}

const P = (d: PassiveDef) => d;

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  kaioken: P({ id: "kaioken", name: "Kaioken", desc: "+10% damage", max: 5, color: "#ff3b3b", apply: (s, n) => void (s.might += 0.1 * n) }),
  salaTempo: P({ id: "salaTempo", name: "Hyperbolic Time Chamber", desc: "-8% cooldown", max: 5, color: "#e8e8ff", apply: (s, n) => void (s.cooldown *= 1 - 0.08 * n) }),
  gravidade: P({ id: "gravidade", name: "Gravity Training", desc: "+10% move speed", max: 5, color: "#8a8aff", apply: (s, n) => void (s.moveSpeed += 0.1 * n) }),
  armadura: P({ id: "armadura", name: "Saiyan Armor", desc: "+1 armor", max: 5, color: "#c9d2dc", apply: (s, n) => void (s.armor += n) }),
  cauda: P({ id: "cauda", name: "Saiyan Tail", desc: "+20% max HP", max: 5, color: "#a0522d", apply: (s, n) => void (s.maxHp *= 1 + 0.2 * n) }),
  scouter: P({
    id: "scouter",
    name: "Scouter",
    desc: "+25% pickup range, +5% crit chance",
    max: 5,
    color: "#5aff5a",
    apply: (s, n) => {
      s.magnet *= 1 + 0.25 * n;
      s.crit += 0.05 * n;
    },
  }),
  aguaDivina: P({ id: "aguaDivina", name: "Ultra Divine Water", desc: "+10% duration", max: 5, color: "#7ad7ff", apply: (s, n) => void (s.duration += 0.1 * n) }),
  potara: P({ id: "potara", name: "Potara Earring", desc: "+1 projectile", max: 2, color: "#ffd21f", apply: (s, n) => void (s.amount += n) }),
  kaiohBencao: P({ id: "kaiohBencao", name: "King Kai's Blessing", desc: "+10% luck", max: 5, color: "#3a86e8", apply: (s, n) => void (s.luck += 0.1 * n) }),
  kiControlado: P({
    id: "kiControlado",
    name: "Ki Control",
    desc: "+10% area, +10% projectile speed",
    max: 5,
    color: "#ffe08a",
    apply: (s, n) => {
      s.area += 0.1 * n;
      s.projSpeed += 0.1 * n;
    },
  }),
  grandeKaioh: P({ id: "grandeKaioh", name: "Grand Kai", desc: "+8% XP", max: 5, color: "#2fbf6a", apply: (s, n) => void (s.growth += 0.08 * n) }),
  casco: P({ id: "casco", name: "Turtle Shell", desc: "+0.3 HP/s regen", max: 5, color: "#3a9a5a", apply: (s, n) => void (s.recovery += 0.3 * n) }),
  terceiroOlho: P({ id: "terceiroOlho", name: "Third Eye", desc: "+25% crit damage, +3% crit chance", max: 5, color: "#ff6a8a", apply: (s, n) => {
      s.critMult += 0.25 * n;
      s.crit += 0.03 * n;
    } }),
  nyoibo: P({ id: "nyoibo", name: "Power Pole", desc: "+1 pierce, +15% knockback", max: 3, color: "#d84a3a", apply: (s, n) => {
      s.pierce += n;
      s.knockback += 0.15 * n;
    } }),
  nuvem: P({ id: "nuvem", name: "Flying Nimbus", desc: "+6% move speed, +4% dodge", max: 5, color: "#ffd84a", apply: (s, n) => {
      s.moveSpeed += 0.06 * n;
      s.dodge += 0.04 * n;
    } }),
  radar: P({ id: "radar", name: "Dragon Radar", desc: "+15% Zeni, +30% pickup range", max: 5, color: "#9aff7a", apply: (s, n) => {
      s.greed += 0.15 * n;
      s.magnet *= 1 + 0.3 * n;
    } }),
  marcaMajin: P({ id: "marcaMajin", name: "Majin Mark", desc: "+12% damage. +10% Curse: tougher, more numerous enemies (more XP)", max: 5, color: "#ff3a8a", apply: (s, n) => {
      s.might += 0.12 * n;
      s.curse += 0.1 * n;
    } }),
  orgulho: P({ id: "orgulho", name: "Saiyan Pride", desc: "+8% damage, +4% crit chance", max: 5, color: "#b05aff", apply: (s, n) => {
      s.might += 0.08 * n;
      s.crit += 0.04 * n;
    } }),
  pesos: P({ id: "pesos", name: "Weighted Clothing", desc: "+12% max HP, +10% knockback", max: 5, color: "#8a6a4a", apply: (s, n) => {
      s.maxHp *= 1 + 0.12 * n;
      s.knockback += 0.1 * n;
    } }),
  poseGinyu: P({ id: "poseGinyu", name: "Ginyu Pose", desc: "+10% XP, +5% luck", max: 5, color: "#ff4ad8", apply: (s, n) => {
      s.growth += 0.1 * n;
      s.luck += 0.05 * n;
    } }),
  jarro: P({ id: "jarro", name: "Electric Rice Cooker", desc: "+10% duration, +5% area", max: 5, color: "#7affc8", apply: (s, n) => {
      s.duration += 0.1 * n;
      s.area += 0.05 * n;
    } }),
  escolaGrou: P({ id: "escolaGrou", name: "Crane School Gi", desc: "+6% damage, +4% crit chance", max: 5, color: "#ffe85a", apply: (s, n) => {
      s.might += 0.06 * n;
      s.crit += 0.04 * n;
    } }),
  telecinese: P({ id: "telecinese", name: "Chiaotzu's Telekinesis", desc: "+15% knockback, +6% area", max: 5, color: "#e8f4ff", apply: (s, n) => {
      s.knockback += 0.15 * n;
      s.area += 0.06 * n;
    } }),
  lenco: P({ id: "lenco", name: "Desert Bandit Scarf", desc: "+7% move speed, +3% dodge", max: 5, color: "#9ad0ff", apply: (s, n) => {
      s.moveSpeed += 0.07 * n;
      s.dodge += 0.03 * n;
    } }),
  coroa: P({ id: "coroa", name: "Control Crown", desc: "+10% area, +5% damage", max: 5, color: "#7aff5a", apply: (s, n) => {
      s.area += 0.1 * n;
      s.might += 0.05 * n;
    } }),
  chocolate: P({ id: "chocolate", name: "Buu's Chocolate", desc: "+8% max HP, +0.25 HP/s regen", max: 5, color: "#ff8ad8", apply: (s, n) => {
      s.maxHp *= 1 + 0.08 * n;
      s.recovery += 0.25 * n;
    } }),
  chipGero: P({ id: "chipGero", name: "Dr. Gero's Chip", desc: "+1 armor, -4% cooldown", max: 5, color: "#ff5a5a", apply: (s, n) => {
      s.armor += n;
      s.cooldown *= 1 - 0.04 * n;
    } }),
  torreKorin: P({ id: "torreKorin", name: "Korin Tower Climb", desc: "+8% duration, +5% move speed", max: 5, color: "#c8b0ff", apply: (s, n) => {
      s.duration += 0.08 * n;
      s.moveSpeed += 0.05 * n;
    } }),
  // exclusivas de personagem
  instintoLuta: P({ id: "instintoLuta", owner: "goku", name: "Fighting Spirit", desc: "+6% damage, +5% move speed", max: 3, color: "#ff8a1f", apply: (s, n) => {
      s.might += 0.06 * n;
      s.moveSpeed += 0.05 * n;
    } }),
  principe: P({ id: "principe", owner: "vegeta", name: "Prince of All Saiyans", desc: "+6% crit chance, +20% crit damage", max: 3, color: "#2b4bd8", apply: (s, n) => {
      s.crit += 0.06 * n;
      s.critMult += 0.2 * n;
    } }),
  poderOculto: P({ id: "poderOculto", owner: "gohan", name: "Hidden Potential", desc: "+8% damage, +8% area", max: 3, color: "#6a3ad8", apply: (s, n) => {
      s.might += 0.08 * n;
      s.area += 0.08 * n;
    } }),
  bracos: P({ id: "bracos", owner: "piccolo", name: "Stretchy Arms", desc: "+12% area, +0.3 HP/s regen", max: 3, color: "#3aa83a", apply: (s, n) => {
      s.area += 0.12 * n;
      s.recovery += 0.3 * n;
    } }),
  futuro: P({ id: "futuro", owner: "trunks", name: "Hope of the Future", desc: "-6% cooldown, +6% move speed", max: 3, color: "#b898e8", apply: (s, n) => {
      s.cooldown *= 1 - 0.06 * n;
      s.moveSpeed += 0.06 * n;
    } }),
  egoFusao: P({ id: "egoFusao", owner: "gotenks", name: "Fusion Ego", desc: "+12% duration, +6% damage", max: 3, color: "#d8a03a", apply: (s, n) => {
      s.duration += 0.12 * n;
      s.might += 0.06 * n;
    } }),
  faClube: P({ id: "faClube", owner: "hercule", name: "Champ's Fan Club", desc: "+20% Zeni, +10% luck, +1 armor", max: 3, color: "#f0f0f0", apply: (s, n) => {
      s.greed += 0.2 * n;
      s.luck += 0.1 * n;
      s.armor += n;
    } }),
  arrogancia: P({ id: "arrogancia", owner: "vegetto", name: "Potara Arrogance", desc: "+8% damage, +5% crit chance", max: 3, color: "#ff7a1a", apply: (s, n) => {
      s.might += 0.08 * n;
      s.crit += 0.05 * n;
    } }),
};

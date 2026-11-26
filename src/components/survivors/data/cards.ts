// Mecânicas extras de carta (ver GDD §20): conjuntos de passivas, pactos (cartas amaldiçoadas) e
// itens (cartas de uso imediato). As uniões de técnicas ficam em techniques.ts (campo `union`).
import type { PassiveId } from "./passives";
import type { Stats } from "./stats";

/* ---------- conjuntos: ter todas as passivas do conjunto liga um bônus ---------- */

export type SetId = "kaioh" | "saiyajin" | "kame" | "divino" | "cacador" | "sombrio" | "ginyu" | "elite" | "grou" | "fitaVermelha" | "casaBuu" | "bandido" | "muralha" | "yajirobe";

export interface SetDef {
  id: SetId;
  name: string;
  parts: PassiveId[];
  desc: string;
  color: string;
  apply(s: Stats): void;
}

export const SETS: SetDef[] = [
  { id: "kaioh", name: "King Kai's Training", parts: ["kaioken", "gravidade", "grandeKaioh"], desc: "+20% damage, +10% move speed", color: "#ff3b3b", apply: (s) => {
      s.might += 0.2;
      s.moveSpeed += 0.1;
    } },
  { id: "saiyajin", name: "Saiyan Gear", parts: ["armadura", "cauda", "scouter"], desc: "+2 armor, +8% crit chance", color: "#c9d2dc", apply: (s) => {
      s.armor += 2;
      s.crit += 0.08;
    } },
  { id: "kame", name: "Master Roshi's Treasures", parts: ["casco", "nyoibo", "nuvem"], desc: "+0.6 HP/s regen, +10% dodge", color: "#3a9a5a", apply: (s) => {
      s.recovery += 0.6;
      s.dodge += 0.1;
    } },
  { id: "divino", name: "Divine Wisdom", parts: ["aguaDivina", "salaTempo", "kaiohBencao"], desc: "-10% cooldown, +15% duration", color: "#e8e8ff", apply: (s) => {
      s.cooldown *= 0.9;
      s.duration += 0.15;
    } },
  { id: "cacador", name: "Dragon Ball Hunter", parts: ["radar", "kiControlado", "potara"], desc: "+20% XP, +15% area", color: "#9aff7a", apply: (s) => {
      s.growth += 0.2;
      s.area += 0.15;
    } },
  { id: "sombrio", name: "Dark Side", parts: ["marcaMajin", "terceiroOlho"], desc: "+40% crit damage, +10% damage", color: "#ff3a8a", apply: (s) => {
      s.critMult += 0.4;
      s.might += 0.1;
    } },
  { id: "ginyu", name: "Ginyu Force", parts: ["poseGinyu", "scouter", "pesos"], desc: "+25% XP, +1 projectile", color: "#ff4ad8", apply: (s) => {
      s.growth += 0.25;
      s.amount += 1;
    } },
  { id: "elite", name: "Saiyan Elite", parts: ["orgulho", "cauda", "jarro"], desc: "+15% damage, +20% max HP", color: "#b05aff", apply: (s) => {
      s.might += 0.15;
      s.maxHp *= 1.2;
    } },
  { id: "grou", name: "Crane School", parts: ["escolaGrou", "telecinese", "terceiroOlho"], desc: "+15% damage, +20% knockback", color: "#ffe85a", apply: (s) => {
      s.might += 0.15;
      s.knockback += 0.2;
    } },
  { id: "fitaVermelha", name: "Red Ribbon Lab", parts: ["chipGero", "pesos", "armadura"], desc: "+3 armor, -8% cooldown", color: "#ff5a5a", apply: (s) => {
      s.armor += 3;
      s.cooldown *= 0.92;
    } },
  { id: "casaBuu", name: "Buu's House", parts: ["chocolate", "marcaMajin"], desc: "+0.8 HP/s regen, +15% damage", color: "#ff8ad8", apply: (s) => {
      s.recovery += 0.8;
      s.might += 0.15;
    } },
  { id: "bandido", name: "Desert Bandit", parts: ["lenco", "nuvem", "torreKorin"], desc: "+12% move speed, +8% dodge, +10% duration", color: "#9ad0ff", apply: (s) => {
      s.moveSpeed += 0.12;
      s.dodge += 0.08;
      s.duration += 0.1;
    } },
  { id: "muralha", name: "Iron Wall", parts: ["barreiraAndroide", "espinhos", "armadura"], desc: "+1 Ki Shield charge, +15 thorns, +2 armor", color: "#7ae8ff", apply: (s) => {
      s.barrier += 1;
      s.thorns += 15;
      s.armor += 2;
    } },
  { id: "yajirobe", name: "Yajirobe's Lunch Break", parts: ["katana", "apetite"], desc: "+20% damage to elites and bosses, +50% food healing", color: "#ff9a5a", apply: (s) => {
      s.bossDmg += 0.2;
      s.foodHeal += 0.5;
    } },
];

/* ---------- pactos: muito poder com um custo, uma vez por run ---------- */

export type PactId = "freeza" | "oozaru" | "dabura" | "majin" | "shenlongNegro" | "gero" | "sacrificio" | "babidi" | "broly" | "velhoKaioshin" | "cell" | "zamasu" | "hit";

export interface PactDef {
  id: PactId;
  name: string;
  gain: string;
  cost: string;
  apply?(s: Stats): void; // parte que é atributo (reaplicada a cada recálculo)
}

export const PACTS: Record<PactId, PactDef> = {
  freeza: { id: "freeza", name: "Emperor's Pact", gain: "All your techniques gain 1 level.", cost: "-20% max HP.", apply: (s) => void (s.maxHp *= 0.8) },
  oozaru: { id: "oozaru", name: "Great Ape Blood", gain: "+40% damage.", cost: "+30% Curse (tougher, more numerous enemies).", apply: (s) => {
      s.might += 0.4;
      s.curse += 0.3;
    } },
  dabura: { id: "dabura", name: "Demon King's Contract", gain: "+1 projectile on everything.", cost: "-3 armor.", apply: (s) => {
      s.amount += 1;
      s.armor -= 3;
    } },
  majin: { id: "majin", name: "Majin Energy", gain: "Full heal and +30% XP.", cost: "+25% Curse.", apply: (s) => {
      s.growth += 0.3;
      s.curse += 0.25;
    } },
  shenlongNegro: { id: "shenlongNegro", name: "Black Star Dragon Balls", gain: "+3 rerolls, +2 banishes, +2 locks.", cost: "-10% damage.", apply: (s) => void (s.might -= 0.1) },
  gero: { id: "gero", name: "Android Body", gain: "+4 armor, +30% max HP.", cost: "+12% cooldown.", apply: (s) => {
      s.armor += 4;
      s.maxHp *= 1.3;
      s.cooldown *= 1.12;
    } },
  sacrificio: { id: "sacrificio", name: "Prince's Sacrifice", gain: "+30% damage, +25% area.", cost: "-35% max HP.", apply: (s) => {
      s.might += 0.3;
      s.area += 0.25;
      s.maxHp *= 0.65;
    } },
  babidi: { id: "babidi", name: "Babidi's Spell", gain: "Open a 3-reward Capsule right now.", cost: "-15% move speed.", apply: (s) => void (s.moveSpeed -= 0.15) },
  broly: { id: "broly", name: "Legendary Rage", gain: "+50% damage, +15% move speed.", cost: "+40% Curse, -2 armor.", apply: (s) => {
      s.might += 0.5;
      s.moveSpeed += 0.15;
      s.curse += 0.4;
      s.armor -= 2;
    } },
  velhoKaioshin: { id: "velhoKaioshin", name: "Elder Kai's Ritual", gain: "All your passives gain 1 level.", cost: "+15% cooldown.", apply: (s) => void (s.cooldown *= 1.15) },
  cell: { id: "cell", name: "Perfect Absorption", gain: "+20% area, +20% duration, +1 pierce.", cost: "-20% XP, -20% luck.", apply: (s) => {
      s.area += 0.2;
      s.duration += 0.2;
      s.pierce += 1;
      s.growth -= 0.2;
      s.luck -= 0.2;
    } },
  zamasu: { id: "zamasu", name: "Immortal Body", gain: "+2 Ki Shield charges, +1 HP/s regen.", cost: "-15% damage, +20% Curse.", apply: (s) => {
      s.barrier += 2;
      s.recovery += 1;
      s.might -= 0.15;
      s.curse += 0.2;
    } },
  hit: { id: "hit", name: "Assassin's Contract", gain: "+40% damage to elites and bosses, +10% crit chance.", cost: "-25% pickup range, -10% max HP.", apply: (s) => {
      s.bossDmg += 0.4;
      s.crit += 0.1;
      s.magnet *= 0.75;
      s.maxHp *= 0.9;
    } },
};
export const PACT_IDS = Object.keys(PACTS) as PactId[];

/* ---------- itens: cartas de uso imediato ---------- */

export type ItemId = "ki" | "capsula" | "ima" | "radar" | "agua" | "bomba" | "treino" | "dende" | "baba" | "salaUmDia" | "furia" | "escudo" | "genki";

export const ITEMS: Record<ItemId, { name: string; desc: string; color: string }> = {
  ki: { name: "Ki Surge", desc: "Fills your ki meter.", color: "#5ad7ff" },
  capsula: { name: "Hoi-Poi Capsule", desc: "Open a Capsule right now.", color: "#3a86e8" },
  ima: { name: "Scanning Scouter", desc: "Pulls every XP orb on the map to you.", color: "#5aff5a" },
  radar: { name: "Dragon Radar", desc: "The next Dragon Ball appears near you.", color: "#ffb21f" },
  agua: { name: "Sacred Water", desc: "Untouchable for 8s, heals 20% HP.", color: "#c8f0ff" },
  bomba: { name: "Capsule Corp Bomb", desc: "Destroys every enemy on screen (bosses and elites take 10% HP).", color: "#ff5a1a" },
  treino: { name: "Crash Course", desc: "Gain half a level of XP right now.", color: "#2fbf6a" },
  dende: { name: "Dende's Healing", desc: "Fully restores your HP.", color: "#5aff9a" },
  baba: { name: "Fortuneteller Baba's Ball", desc: "+2 rerolls, +1 banish, +1 lock.", color: "#b07aff" },
  salaUmDia: { name: "A Day in the Time Chamber", desc: "A random technique of yours gains 1 level.", color: "#e8e8ff" },
  furia: { name: "Kaioken Burst", desc: "+40% damage and +15% move speed for 20s.", color: "#ff3b3b" },
  escudo: { name: "Ki Shield", desc: "+2 Ki Shield charges right now (each blocks one hit).", color: "#7ae8ff" },
  genki: { name: "Spirit Bomb Fragment", desc: "A Spirit Bomb hits every enemy on screen.", color: "#9ad8ff" },
};

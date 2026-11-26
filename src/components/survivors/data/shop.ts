// Treino na Torre Korin (GDD §10): upgrades permanentes comprados com Zeni.
import type { Stats } from "./stats";

export type ShopId =
  | "vida"
  | "forca"
  | "defesa"
  | "velocidade"
  | "area"
  | "recarga"
  | "coleta"
  | "sorte"
  | "crescimento"
  | "ganancia"
  | "reviver"
  | "reroll"
  | "pular"
  | "banir"
  | "lendarios"
  | "regen"
  | "critico"
  | "potara"
  | "maldicao"
  | "travar";

export interface ShopDef {
  id: ShopId;
  name: string;
  desc: string;
  max: number;
  base: number; // preço do 1º nível
  apply?(s: Stats, n: number): void;
}

const S = (d: ShopDef) => d;

export const SHOP: ShopDef[] = [
  S({ id: "vida", name: "Endurance Training", desc: "+10% max HP", max: 5, base: 200, apply: (s, n) => void (s.maxHp *= 1 + 0.1 * n) }),
  S({ id: "forca", name: "Punching Bag", desc: "+5% damage", max: 5, base: 300, apply: (s, n) => void (s.might += 0.05 * n) }),
  S({ id: "defesa", name: "Turtle Shell Training", desc: "+1 armor", max: 3, base: 600, apply: (s, n) => void (s.armor += n) }),
  S({ id: "velocidade", name: "Snake Way Run", desc: "+5% move speed", max: 3, base: 300, apply: (s, n) => void (s.moveSpeed += 0.05 * n) }),
  S({ id: "area", name: "Ki Control", desc: "+5% area", max: 3, base: 300, apply: (s, n) => void (s.area += 0.05 * n) }),
  S({ id: "recarga", name: "Meditate with Kami", desc: "-3% cooldown", max: 3, base: 900, apply: (s, n) => void (s.cooldown *= 1 - 0.03 * n) }),
  S({ id: "coleta", name: "Upgraded Radar", desc: "+20% pickup range", max: 3, base: 200, apply: (s, n) => void (s.magnet *= 1 + 0.2 * n) }),
  S({ id: "sorte", name: "Elder Kai's Blessing", desc: "+5% luck", max: 3, base: 600, apply: (s, n) => void (s.luck += 0.05 * n) }),
  S({ id: "crescimento", name: "Study with Gohan", desc: "+3% XP", max: 5, base: 900, apply: (s, n) => void (s.growth += 0.03 * n) }),
  S({ id: "ganancia", name: "Capsule Corp Sponsorship", desc: "+10% Zeni", max: 5, base: 200, apply: (s, n) => void (s.greed += 0.1 * n) }),
  S({ id: "reviver", name: "Korin's Spare Senzu", desc: "+1 extra life per run", max: 1, base: 10000 }),
  S({ id: "reroll", name: "Fresh Start", desc: "+1 reroll per run (R)", max: 3, base: 500 }),
  S({ id: "pular", name: "Skip Day", desc: "+1 skip per run (X)", max: 3, base: 300 }),
  S({ id: "banir", name: "Forbidden Technique", desc: "+1 banish per run (B)", max: 3, base: 500 }),
  S({ id: "lendarios", name: "Legendary Dragon Balls", desc: "Unlocks Shenron's legendary wishes", max: 1, base: 5000 }),
  S({ id: "travar", name: "Supreme Kai's Seal", desc: "+1 card lock per run (T)", max: 2, base: 600 }),
  S({ id: "regen", name: "Korin Tower Water", desc: "+0.2 HP/s regen", max: 3, base: 800, apply: (s, n) => void (s.recovery += 0.2 * n) }),
  S({ id: "critico", name: "Precision Training", desc: "+3% crit chance", max: 3, base: 700, apply: (s, n) => void (s.crit += 0.03 * n) }),
  S({ id: "potara", name: "Ancient Potara Earring", desc: "+1 projectile on everything", max: 1, base: 12000, apply: (s, n) => void (s.amount += n) }),
  S({ id: "maldicao", name: "King Kai's Challenge", desc: "+10% Curse: tougher, more numerous enemies; +10% XP and Zeni", max: 5, base: 100, apply: (s, n) => {
      s.curse += 0.1 * n;
      s.growth += 0.1 * n;
      s.greed += 0.1 * n;
    } }),
];

/** Preço do próximo nível: sobe com o nível do item e com o total de compras já feitas. */
export function shopPrice(def: ShopDef, level: number, totalBought: number) {
  return Math.round(def.base * (1 + level) * (1 + 0.1 * totalBought));
}

/** O que a run recebe da loja. */
export interface MetaBonus {
  shop: Partial<Record<ShopId, number>>;
}

export function applyShop(s: Stats, shop: Partial<Record<ShopId, number>>) {
  for (const def of SHOP) {
    const n = shop[def.id] ?? 0;
    if (n && def.apply) def.apply(s, n);
  }
}

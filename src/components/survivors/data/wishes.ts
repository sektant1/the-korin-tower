// Desejos do Shenlong (GDD §8.2). Os lendários só aparecem com a compra "Desejos Lendários".
export type WishId = "reviver" | "imortal" | "forte" | "rico" | "destruir" | "tempo";

export interface WishDef {
  id: WishId;
  quote: string;
  desc: string;
  legendary: boolean;
}

export const WISHES: Record<WishId, WishDef> = {
  reviver: { id: "reviver", quote: "Bring me back to life", desc: "+1 extra life this run.", legendary: false },
  imortal: { id: "imortal", quote: "Grant me immortality", desc: "Invulnerable for 60s.", legendary: false },
  rico: { id: "rico", quote: "Make me rich", desc: "+1500 Zeni.", legendary: false },
  tempo: { id: "tempo", quote: "Give me more time", desc: "The boss arrives 2 min later, and you get +20% XP.", legendary: false },
  forte: { id: "forte", quote: "Make me the strongest", desc: "Evolves a ready technique, or +2 levels to all of them.", legendary: true },
  destruir: { id: "destruir", quote: "Destroy my enemies", desc: "Clears the screen and takes 30% of the boss's HP.", legendary: true },
};

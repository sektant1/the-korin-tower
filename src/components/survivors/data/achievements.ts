// Conquistas internas (GDD §10). Conferidas no fim de cada run com o resumo da run e o save já
// atualizado; cada uma rende um pouco de Zeni.
import type { SaveData } from "../save";
import type { CharId } from "./characters";
import type { SagaId } from "./enemies";
import { SAGA_ORDER } from "./enemies";
import { TECHNIQUES, type TechId } from "./techniques";

const EVO_COUNT = Object.values(TECHNIQUES).filter((d) => d.from).length;

export interface RunSummary {
  saga: SagaId;
  char: CharId;
  won: boolean;
  time: number;
  kills: number;
  level: number;
  zeni: number;
  killsBy: Record<string, number>;
  evolved: string[];
  maxForm: number;
  wished: string | null;
  ballsFound: number;
  revivesUsed: number;
  scrolls: string[];
  nightmare: boolean;
  dodges: number;
  unions: string[];
  pacts: string[];
  sets: string[];
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  zeni: number;
  check(r: RunSummary, s: SaveData): boolean;
}

const A = (d: AchievementDef) => d;
const wonWith = (s: SaveData, c: CharId) => SAGA_ORDER.some((g) => s.wins[g]?.includes(c));

export const ACHIEVEMENTS: AchievementDef[] = [
  A({ id: "primeiroSangue", name: "First Training", desc: "Finish a run.", zeni: 50, check: () => true }),
  A({ id: "cem", name: "A Hundred Down", desc: "Defeat 100 enemies in one run.", zeni: 50, check: (r) => r.kills >= 100 }),
  A({ id: "mil", name: "A Thousand Down", desc: "Defeat 1,000 enemies in one run.", zeni: 150, check: (r) => r.kills >= 1000 }),
  A({ id: "cincoMil", name: "Army of One", desc: "Defeat 5,000 enemies in one run.", zeni: 400, check: (r) => r.kills >= 5000 }),
  A({ id: "dezMil", name: "Over 9000!", desc: "Defeat over 9,000 enemies in one run.", zeni: 900, check: (r) => r.kills > 9000 }),
  A({ id: "veterano", name: "Veteran", desc: "Defeat 50,000 enemies in total.", zeni: 500, check: (_, s) => s.totalKills >= 50000 }),
  A({ id: "cincoMin", name: "Warm-Up", desc: "Survive 5 minutes.", zeni: 80, check: (r) => r.time >= 300 }),
  A({ id: "dezMin", name: "Warrior", desc: "Survive 10 minutes.", zeni: 150, check: (r) => r.time >= 600 }),
  A({ id: "chefe", name: "To the End", desc: "Reach a saga's boss.", zeni: 200, check: (r) => r.time >= 900 }),
  A({ id: "vFreeza", name: "Namek Is Saved", desc: "Clear the Frieza Saga.", zeni: 300, check: (r) => r.won && r.saga === "freeza" }),
  A({ id: "vCell", name: "The Cell Games", desc: "Clear the Cell Saga.", zeni: 400, check: (r) => r.won && r.saga === "cell" }),
  A({ id: "vFilmes", name: "Movie Night", desc: "Clear The Movies.", zeni: 500, check: (r) => r.won && r.saga === "filmes" }),
  A({ id: "vBuu", name: "Earth's Spirit Bomb", desc: "Clear the Majin Buu Saga.", zeni: 700, check: (r) => r.won && r.saga === "buu" }),
  A({ id: "nivel25", name: "Rising Power", desc: "Reach level 25.", zeni: 100, check: (r) => r.level >= 25 }),
  A({ id: "nivel50", name: "Legendary Power", desc: "Reach level 50.", zeni: 300, check: (r) => r.level >= 50 }),
  A({ id: "evolucao", name: "Beyond the Limit", desc: "Evolve a technique.", zeni: 150, check: (r) => r.evolved.length > 0 }),
  A({ id: "tresEvolucoes", name: "Technique Master", desc: "Evolve 3 techniques in one run.", zeni: 400, check: (r) => r.evolved.length >= 3 }),
  A({ id: "todasEvolucoes", name: "Saiyan Encyclopedia", desc: `Evolve all ${EVO_COUNT} techniques (across runs).`, zeni: 2500, check: (_, s) => s.evolved.filter((id) => TECHNIQUES[id as TechId]?.from).length >= EVO_COUNT }),
  A({ id: "ssj", name: "Legend Awakened", desc: "Transform.", zeni: 100, check: (r) => r.maxForm >= 1 }),
  A({ id: "ssj3", name: "Long Hair", desc: "Reach the third transformation.", zeni: 400, check: (r) => r.maxForm >= 3 }),
  A({ id: "radar", name: "Dragon Ball Hunter", desc: "Gather all 7 Dragon Balls.", zeni: 300, check: (r) => r.ballsFound >= 7 }),
  A({ id: "desejo", name: "Eternal Dragon", desc: "Make a wish to Shenron.", zeni: 200, check: (r) => !!r.wished }),
  A({ id: "tresDesejos", name: "Loyal Customer", desc: "Make 3 wishes (across runs).", zeni: 400, check: (_, s) => s.wishes >= 3 }),
  A({ id: "senzu", name: "Second Chance", desc: "Come back to life in a run.", zeni: 100, check: (r) => r.revivesUsed > 0 }),
  A({ id: "hercule", name: "I Beat Cell!", desc: "Clear a saga with Hercule.", zeni: 1000, check: (r) => r.won && r.char === "hercule" }),
  A({ id: "vegetto", name: "Perfect Fusion", desc: "Unlock Vegito.", zeni: 500, check: (_, s) => s.chars.includes("vegetto") }),
  A({ id: "elenco", name: "Z Fighters", desc: "Unlock 6 characters.", zeni: 400, check: (_, s) => s.chars.length >= 6 }),
  A({ id: "todosVencem", name: "Everyone's a Hero", desc: "Clear a saga with 4 different characters.", zeni: 600, check: (_, s) => ["goku", "vegeta", "gohan", "piccolo", "trunks", "gotenks", "hercule", "vegetto"].filter((c) => wonWith(s, c as CharId)).length >= 4 }),
  A({ id: "rico", name: "Capsule Corp", desc: "Have 10,000 Zeni saved.", zeni: 0, check: (_, s) => s.zeni >= 10000 }),
  A({ id: "torre", name: "Top of Korin Tower", desc: "Buy 20 trainings.", zeni: 500, check: (_, s) => s.bought >= 20 }),
  A({ id: "pergaminho", name: "Scroll Reader", desc: "Pick 2 Secret Scrolls in one run.", zeni: 150, check: (r) => r.scrolls.length >= 2 }),
  A({ id: "pacto", name: "Sold Soul", desc: "Clear a saga with Babidi's Bargain.", zeni: 600, check: (r) => r.won && r.scrolls.includes("pacto") }),
  A({ id: "pesadelo", name: "Nightmare", desc: "Clear a saga on Nightmare.", zeni: 1500, check: (r) => r.won && r.nightmare }),
  A({ id: "pesadeloTodas", name: "Strongest in the Universe", desc: "Clear all 4 sagas on Nightmare.", zeni: 4000, check: (_, s) => SAGA_ORDER.every((g) => s.nightmareWins?.includes(g)) }),
  A({ id: "instinto", name: "Ultra Instinct", desc: "Dodge 50 hits in one run.", zeni: 300, check: (r) => r.dodges >= 50 }),
  A({ id: "kamikaze", name: "Friendly Fire", desc: "Defeat 200 kamikazes (across runs).", zeni: 300, check: (_, s) => ["saibamanBomba", "roboBomba", "minaGete", "majinBomba"].reduce((a, id) => a + (s.bestiary[id] ?? 0), 0) >= 200 }),
  A({ id: "reiCold", name: "Family Business", desc: "Defeat King Cold.", zeni: 200, check: (r) => (r.killsBy.reiCold ?? 0) > 0 }),
  A({ id: "evoNova", name: "New Moves", desc: "Evolve Spirit Ball, Tri-Beam, Hellzone Grenade, Energy Barrage, Kai Lightning or Galactic Donut.", zeni: 300, check: (r) => r.evolved.some((e) => ["sokidanGalactico", "shinKikoho", "hellzoneSupremo", "chuvaInfinita", "trovaoDivino", "superRosquinha"].includes(e)) }),
  A({ id: "uniao", name: "Technique Fusion", desc: "Make a Union.", zeni: 250, check: (r) => r.unions.length > 0 }),
  A({ id: "duasUnioes", name: "Fusion Dance", desc: "Make 2 Unions in one run.", zeni: 600, check: (r) => r.unions.length >= 2 }),
  A({ id: "pacto1", name: "Deal Sealed", desc: "Accept a Pact.", zeni: 150, check: (r) => r.pacts.length > 0 }),
  A({ id: "pacto3", name: "Demon Soul", desc: "Clear a saga with 3 Pacts.", zeni: 1000, check: (r) => r.won && r.pacts.length >= 3 }),
  A({ id: "conjunto", name: "Collector", desc: "Complete a passive Set.", zeni: 200, check: (r) => r.sets.length > 0 }),
  A({ id: "doisConjuntos", name: "Full Wardrobe", desc: "Complete 2 Sets in one run.", zeni: 500, check: (r) => r.sets.length >= 2 }),
  A({ id: "celljr", name: "Cell Jr. Babysitter", desc: "Defeat 500 Cell Jr. (across runs).", zeni: 300, check: (_, s) => (s.bestiary.celljr ?? 0) >= 500 }),
];

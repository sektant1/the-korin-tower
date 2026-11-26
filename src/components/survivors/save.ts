// Save no navegador (meta-progressão): Zeni, loja da Torre Korin, desbloqueios, conquistas,
// bestiário e recordes. Versionado: um save da versão 1 (M1) é migrado sem perder Zeni nem recorde.
import { ACHIEVEMENTS, type RunSummary } from "./data/achievements";
import { CHARACTERS, CHAR_ORDER, type CharId } from "./data/characters";
import { SAGAS, SAGA_ORDER, type SagaId } from "./data/enemies";
import { SHOP, shopPrice, type ShopId } from "./data/shop";

const KEY = "korin:survivors-save";

export interface RunRecord {
  time: number;
  kills: number;
  level: number;
  won: boolean;
}

export interface SaveData {
  version: 2;
  zeni: number;
  best: { time: number; kills: number; level: number };
  runs: number;
  totalKills: number;
  earlyDeaths: number; // mortes antes de 1:00 (Hercule)
  shop: Partial<Record<ShopId, number>>;
  bought: number; // compras feitas (encarece a próxima)
  spent: number;
  chars: CharId[];
  sagas: SagaId[];
  wins: Partial<Record<SagaId, CharId[]>>;
  records: Record<string, RunRecord>; // "saga:char"
  bestiary: Record<string, number>; // derrotas por inimigo
  evolved: string[];
  achievements: string[];
  wishes: number;
  muted: boolean;
  nightmareWins: SagaId[]; // sagas vencidas no Modo Pesadelo
}

export const fresh = (): SaveData => ({
  version: 2,
  zeni: 0,
  best: { time: 0, kills: 0, level: 0 },
  runs: 0,
  totalKills: 0,
  earlyDeaths: 0,
  shop: {},
  bought: 0,
  spent: 0,
  chars: ["goku"],
  sagas: ["freeza"],
  wins: {},
  records: {},
  bestiary: {},
  evolved: [],
  achievements: [],
  wishes: 0,
  muted: false,
  nightmareWins: [],
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as Omit<Partial<SaveData>, "version"> & { version?: number };
    if (data.version === 1) {
      // M1: só tinha Zeni, recorde e número de runs
      const s = fresh();
      s.zeni = data.zeni ?? 0;
      s.best = { ...s.best, ...data.best };
      s.runs = data.runs ?? 0;
      return s;
    }
    if (data.version !== 2) return fresh();
    const base = fresh();
    return { ...base, ...data, best: { ...base.best, ...data.best } } as SaveData;
  } catch {
    return fresh();
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* modo privado / cota: o jogo segue sem salvar */
  }
}

/** Quanto de Zeni a run rende ao terminar (o que foi coletado + bônus). */
export function runReward(r: RunSummary) {
  const sagaBonus = r.won ? 500 * (SAGA_ORDER.indexOf(r.saga) + 1) : 0;
  const base = r.zeni + Math.floor(r.kills / 25) + Math.floor(r.time / 60) * 10 + sagaBonus;
  return r.nightmare ? Math.round(base * 2) : base;
}

/** Desbloqueios de personagem e saga conferidos depois de cada run. */
function unlocks(s: SaveData, r: RunSummary): string[] {
  const got: string[] = [];
  const unlockChar = (c: CharId) => {
    if (!s.chars.includes(c)) {
      s.chars.push(c);
      got.push(`Character unlocked: ${CHARACTERS[c].name}`);
    }
  };
  const unlockSaga = (g: SagaId) => {
    if (!s.sagas.includes(g)) {
      s.sagas.push(g);
      got.push(`Saga unlocked: ${SAGAS[g].name}`);
    }
  };
  const won = (g: SagaId) => (s.wins[g]?.length ?? 0) > 0;
  if (r.char === "goku" && r.time >= 600) unlockChar("vegeta");
  if (won("freeza")) {
    unlockChar("piccolo");
    unlockSaga("cell");
  }
  if (won("cell")) {
    unlockChar("gohan");
    unlockSaga("filmes");
  }
  if (won("filmes")) unlockSaga("buu");
  if (won("buu")) unlockChar("gotenks");
  if ((s.bestiary.celljr ?? 0) >= 500) unlockChar("trunks");
  if (s.earlyDeaths >= 3) unlockChar("hercule");
  if (SAGA_ORDER.every((g) => s.wins[g]?.includes("goku") && s.wins[g]?.includes("vegeta"))) unlockChar("vegetto");
  return got;
}

/** Registra o fim de uma run: Zeni, recordes, bestiário, desbloqueios e conquistas. */
export function recordRun(r: RunSummary): { save: SaveData; reward: number; news: string[] } {
  const s = loadSave();
  const reward = runReward(r);
  s.runs++;
  s.zeni += reward;
  s.totalKills += r.kills;
  if (!r.won && r.time < 60) s.earlyDeaths++;
  if (r.time > s.best.time) s.best.time = r.time;
  if (r.kills > s.best.kills) s.best.kills = r.kills;
  if (r.level > s.best.level) s.best.level = r.level;
  const key = `${r.saga}:${r.char}`;
  const rec = s.records[key];
  s.records[key] = { time: Math.max(r.time, rec?.time ?? 0), kills: Math.max(r.kills, rec?.kills ?? 0), level: Math.max(r.level, rec?.level ?? 0), won: r.won || !!rec?.won };
  for (const [id, n] of Object.entries(r.killsBy)) s.bestiary[id] = (s.bestiary[id] ?? 0) + n;
  for (const e of [...r.evolved, ...r.unions]) if (!s.evolved.includes(e)) s.evolved.push(e);
  if (r.wished) s.wishes++;
  if (r.won) {
    const list = (s.wins[r.saga] ??= []);
    if (!list.includes(r.char)) list.push(r.char);
    if (r.nightmare && !s.nightmareWins.includes(r.saga)) s.nightmareWins.push(r.saga);
  }
  const news = unlocks(s, r);
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (a.check(r, s)) {
      s.achievements.push(a.id);
      s.zeni += a.zeni;
      news.push(a.zeni ? `Achievement: ${a.name} (+${a.zeni} Ƶ)` : `Achievement: ${a.name}`);
    }
  }
  writeSave(s);
  return { save: s, reward, news };
}

/* ---------- loja ---------- */

export function buy(s: SaveData, id: ShopId): SaveData | null {
  const def = SHOP.find((d) => d.id === id)!;
  const level = s.shop[id] ?? 0;
  if (level >= def.max) return null;
  const price = shopPrice(def, level, s.bought);
  if (s.zeni < price) return null;
  const next: SaveData = { ...s, zeni: s.zeni - price, spent: s.spent + price, bought: s.bought + 1, shop: { ...s.shop, [id]: level + 1 } };
  writeSave(next);
  return next;
}

/** Devolve todo o Zeni gasto na loja. */
export function refund(s: SaveData): SaveData {
  const next: SaveData = { ...s, zeni: s.zeni + s.spent, spent: 0, bought: 0, shop: {} };
  writeSave(next);
  return next;
}

export function setMuted(s: SaveData, muted: boolean): SaveData {
  const next = { ...s, muted };
  writeSave(next);
  return next;
}

export const isUnlocked = (s: SaveData, c: CharId) => s.chars.includes(c);
export { CHAR_ORDER };

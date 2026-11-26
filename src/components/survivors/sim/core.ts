// Estado da run e as mutações compartilhadas (dano, morte, XP, itens, cartas, cápsulas, desejos,
// transformação). Lógica pura, sem DOM. techs.ts (golpes do herói), boss.ts (ataques inimigos) e
// world.ts (laço do passo) importam daqui; este arquivo não importa nenhum deles.
import { CHARACTERS, FORM_LEVELS, type CharId } from "../data/characters";
import { ENEMY_INDEX, ENEMY_LIST, SAGAS, SAGA_LENGTH, hpScale, sagaWaves, type EnemyDef, type SagaId, type WaveDef } from "../data/enemies";
import { PASSIVES, type PassiveId } from "../data/passives";
import { applyShop, type ShopId } from "../data/shop";
import { BASE_STATS, SHIELD_REGEN, type Stats } from "../data/stats";
import { BASE_TECHS, TECHNIQUES, UNIONS, techParams, type TechId, type TechParams } from "../data/techniques";
import { PACTS, PACT_IDS, SETS, ITEMS, type ItemId, type PactId, type SetId } from "../data/cards";
import { SCROLLS, SCROLL_IDS, type ScrollId } from "../data/scrolls";
import { WISHES, type WishId } from "../data/wishes";
import { Grid } from "./grid";
import { makeRng, type Rng } from "./rng";

export const STEP = 1 / 60;
export const MAX_ENEMIES = 700;
export const MAX_PROJ = 600;
export const MAX_GEMS = 700;
export const MAX_BULLETS = 400;
export const MAX_SLOTS = 6;
export const PLAYER_R = 12;
export const BALL_TIMES = [70, 170, 280, 390, 500, 610, 720];
/** Quando aparecem os Pergaminhos Secretos (escolha de um modificador da run). */
export const SCROLL_TIMES = [240, 540];
export const MAX_FX = 512;
/** Nível mínimo das duas técnicas para a carta de União aparecer. */
export const UNION_LEVEL = 5;

export type Phase = "playing" | "levelup" | "chest" | "wish" | "scroll" | "dead" | "won";

export interface Input {
  mx: number; // -1..1
  my: number;
  transform?: boolean; // apertou Espaço neste tick
}

export interface TechSlot {
  id: TechId;
  level: number;
  timer: number;
  p: TechParams;
  flip: number; // alterna lados (espada, soco)
  burst: number; // s restantes da saraivada (Renzoku)
  burstAcc: number;
}
export interface PassiveSlot {
  id: PassiveId;
  level: number;
}

export type Offer =
  | { type: "tech"; id: TechId; level: number; gold?: boolean }
  | { type: "passive"; id: PassiveId; level: number }
  | { type: "union"; id: TechId }
  | { type: "pact"; id: PactId }
  | { type: "item"; id: ItemId }
  | { type: "senzu" }
  | { type: "zeni" };

export type ZoneKind = "beam" | "aura" | "blast" | "lance" | "flash" | "slash" | "bomb" | "pool" | "shock" | "nova" | "chain" | "vortex";
export interface Zone {
  alive: boolean;
  kind: ZoneKind;
  slot: number;
  x: number;
  y: number;
  angle: number;
  len: number;
  width: number;
  r: number;
  life: number;
  max: number;
  anchored: boolean; // segue o herói (feixes)
  color: string;
}

/** carne: cura; furia: Kaioken temporário; barreira: +1 carga de escudo; genki: Genki Dama na tela; bolsa: muito Zeni. */
export type PickupKind = "senzu" | "capsula" | "zeni" | "scouter" | "luz" | "ki" | "carne" | "furia" | "barreira" | "genki" | "bolsa";
export interface Pickup {
  alive: boolean;
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
}

export interface DamageNumber {
  alive: boolean;
  x: number;
  y: number;
  v: number;
  t: number;
  crit: boolean;
}

export interface Notice {
  text: string;
  t: number;
}

/** Ataque de área de chefe/elite com aviso: o chão marca, depois acerta. */
export interface Hazard {
  alive: boolean;
  kind: "laser" | "meteor";
  x: number;
  y: number;
  angle: number;
  len: number;
  r: number; // raio (meteoro) ou meia largura (laser)
  warn: number; // s de aviso restantes
  warnMax: number;
  life: number; // s ativo depois do aviso
  dmg: number;
  done: boolean; // já acertou o herói
  color: string;
}

/** Efeito visual pedido pela simulação (o renderizador consome; não afeta o jogo). */
export const enum Fx {
  Death = 1,
  Explosion = 2,
  Sparks = 3,
  LevelUp = 4,
  Dodge = 5,
  Pickup = 6,
  Telegraph = 7,
  Ring = 8,
}

export interface DragonBall {
  stars: number;
  x: number;
  y: number;
  taken: boolean;
}

export interface RunOptions {
  char?: CharId;
  saga?: SagaId;
  shop?: Partial<Record<ShopId, number>>;
  view?: { w: number; h: number };
  nightmare?: boolean;
}

export type SfxEvent =
  | "hit"
  | "kill"
  | "gem"
  | "levelup"
  | "beam"
  | "shot"
  | "blast"
  | "slash"
  | "flash"
  | "hurt"
  | "transform"
  | "chest"
  | "boss"
  | "ball"
  | "wish"
  | "senzu"
  | "elite"
  | "revive"
  | "enemyShot"
  | "victory"
  | "death"
  | "zap"
  | "boom"
  | "scroll"
  | "dodge"
  | "warn"
  | "gold";

export interface World {
  seed: number;
  rng: Rng;
  t: number;
  ticks: number;
  phase: Phase;
  char: CharId;
  saga: SagaId;
  waves: WaveDef[];
  shop: Partial<Record<ShopId, number>>;
  view: { w: number; h: number };
  nightmare: boolean;
  player: {
    x: number;
    y: number;
    px: number;
    py: number;
    hp: number;
    faceX: number;
    faceY: number;
    moving: boolean;
    invuln: number;
    hurt: number; // s desde o último golpe (para piscar)
    level: number;
    xp: number;
    xpNext: number;
    kills: number;
    zeni: number;
    calm: number; // s sem levar golpe (Kaioken x20)
    shield: number; // cargas do Escudo de Ki agora
    shieldT: number; // s até recuperar uma carga
    rage: number; // s restantes do Kaioken temporário (item/drop)
  };
  stats: Stats;
  techs: TechSlot[];
  passives: PassiveSlot[];
  offers: Offer[];
  pendingLevels: number;
  rerolls: number;
  skips: number;
  banishes: number;
  banished: string[];
  revives: number;
  locks: number;
  locked: Offer | null; // carta travada: volta na próxima tela de nível
  pacts: PactId[];
  unions: TechId[];
  setsDone: SetId[];

  // transformação
  ki: number; // 0..1
  form: number; // 0 = base, 1..3 = degrau
  formTime: number;
  formMax: number;
  transformCd: number;
  maxForm: number;

  // inimigos (SoA)
  ex: Float32Array;
  ey: Float32Array;
  epx: Float32Array;
  epy: Float32Array;
  evx: Float32Array; // empurrão (knockback), decai
  evy: Float32Array;
  ehp: Float32Array;
  emax: Float32Array;
  eflash: Float32Array;
  estun: Float32Array; // s paralisado
  eatk: Float32Array; // s até o próximo ataque (elites e chefes)
  eaux: Float32Array; // estado do padrão (espiral)
  eang: Float32Array;
  epat: Uint8Array;
  efuse: Float32Array; // s até explodir (kamikaze) ou até a investida (aviso)
  edash: Float32Array; // s restantes da investida
  eborn: Float32Array; // quando nasceu (animação de entrada)
  eflag: Uint8Array; // 1 = debandada (corre reto, ignora o herói)
  ekind: Uint8Array; // índice em ENEMY_LIST
  ealive: Uint8Array;
  enemyCount: number;
  hitAt: Float64Array; // [slot * MAX_ENEMIES + e]: quando aquele golpe pode acertar de novo

  // projéteis do herói (SoA)
  qx: Float32Array;
  qy: Float32Array;
  qpx: Float32Array;
  qpy: Float32Array;
  qvx: Float32Array;
  qvy: Float32Array;
  qlife: Float32Array;
  qmax: Float32Array;
  qr: Float32Array;
  qpierce: Int16Array;
  qslot: Uint8Array;
  qmode: Uint8Array; // 0 reto, 1 vai e volta, 2 teleguiado, 3 fantasma, 4 bola de fogo, 5 cerco
  qdelay: Float32Array; // s parado antes de partir (Hellzone)
  qlast: Int16Array;
  qalive: Uint8Array;

  // tiros inimigos (SoA)
  bx: Float32Array;
  by: Float32Array;
  bpx: Float32Array;
  bpy: Float32Array;
  bvx: Float32Array;
  bvy: Float32Array;
  br: Float32Array;
  bdmg: Float32Array;
  blife: Float32Array;
  bhome: Float32Array;
  balive: Uint8Array;

  // orbs de ki (XP)
  gx: Float32Array;
  gy: Float32Array;
  gval: Float32Array;
  gpull: Uint8Array;
  galive: Uint8Array;
  gemCount: number;

  zones: Zone[];
  hazards: Hazard[];
  pickups: Pickup[];
  numbers: DamageNumber[];
  notices: Notice[];
  events: SfxEvent[];
  shake: number;
  flash: number; // clarão de tela (s)
  flashColor: string;
  hitstop: number;
  immortal: number;

  // efeitos visuais (fila circular lida pelo renderizador)
  fxHead: number;
  fxKind: Uint8Array;
  fxX: Float32Array;
  fxY: Float32Array;
  fxA: Float32Array;
  fxColor: string[];

  grid: Grid;
  spawnAcc: number;
  nextElite: number;
  eliteIdx: number;
  ringsDone: number;
  stampedesDone: number;
  nextCrate: number;
  nextMeteor: number;
  nextKiai: number;

  // Pergaminhos Secretos
  scrolls: ScrollId[];
  scrollOptions: ScrollId[];
  scrollsOffered: number;

  // Radar e Shenlong
  balls: DragonBall[];
  ballsFound: number;
  wishOptions: WishId[];
  wished: WishId | null;
  legendary: boolean;

  // chefe
  bossAt: number;
  boss: number; // índice do inimigo chefe, -1 sem chefe
  bossDefeated: boolean;
  bossPreDamage: number; // fração tirada pelo desejo "Destrua meus inimigos"
  arena: { x: number; y: number; r: number } | null;
  victoryAt: number;
  growthBonus: number;

  chest: { items: string[]; evolved: boolean } | null;
  techDamage: number[]; // dano total por slot de técnica (tela de resultado)
  dodges: number;
  dmgBy: Record<string, number>; // dano recebido por origem (balanceamento)
  killsBy: Uint32Array;
  evolved: TechId[];
  // eventos do mapa e contadores da run (conquistas)
  nextBarrel: number;
  thievesDone: number;
  thievesCaught: number;
  shieldBlocks: number;
  foodEaten: number;
  bestChain: number; // mais inimigos derrubados por uma explosão de tanque
}

/** Quando aparece um ladrão (foge com Zeni; derrotá-lo solta tesouro). */
export const THIEF_AT = [150, 390, 630, 810];

/* ---------- criação ---------- */

export function xpForLevel(level: number) {
  // começo rápido (+7 por nível até o 20), depois +13 até o 40 e +16 depois, com um degrau em cada faixa
  if (level < 20) return 5 + (level - 1) * 7;
  if (level < 40) return 240 + (level - 20) * 15;
  const k = level - 40;
  return 600 + k * 30 + k * k * 1.2; // depois do 40 cada nível pesa bem mais

}

export function newWorld(seed: number, opts: RunOptions = {}): World {
  const char = opts.char ?? "goku";
  const saga = opts.saga ?? "freeza";
  const shop = opts.shop ?? {};
  const w: World = {
    seed,
    rng: makeRng(seed),
    t: 0,
    ticks: 0,
    phase: "playing",
    char,
    saga,
    waves: sagaWaves(SAGAS[saga]),
    shop,
    view: opts.view ?? { w: 1280, h: 720 },
    nightmare: !!opts.nightmare,
    player: { x: 0, y: 0, px: 0, py: 0, hp: 0, faceX: 1, faceY: 0, moving: false, invuln: 0, hurt: 99, level: 1, xp: 0, xpNext: xpForLevel(1), kills: 0, zeni: 0, calm: 0, shield: 0, shieldT: 0, rage: 0 },
    stats: { ...BASE_STATS },
    techs: [],
    passives: [],
    offers: [],
    pendingLevels: 0,
    rerolls: shop.reroll ?? 0,
    skips: shop.pular ?? 0,
    banishes: shop.banir ?? 0,
    banished: [],
    revives: shop.reviver ?? 0,
    locks: 1 + (shop.travar ?? 0),
    locked: null,
    pacts: [],
    unions: [],
    setsDone: [],

    ki: 0,
    form: 0,
    formTime: 0,
    formMax: 1,
    transformCd: 0,
    maxForm: 0,

    ex: new Float32Array(MAX_ENEMIES),
    ey: new Float32Array(MAX_ENEMIES),
    epx: new Float32Array(MAX_ENEMIES),
    epy: new Float32Array(MAX_ENEMIES),
    evx: new Float32Array(MAX_ENEMIES),
    evy: new Float32Array(MAX_ENEMIES),
    ehp: new Float32Array(MAX_ENEMIES),
    emax: new Float32Array(MAX_ENEMIES),
    eflash: new Float32Array(MAX_ENEMIES),
    estun: new Float32Array(MAX_ENEMIES),
    eatk: new Float32Array(MAX_ENEMIES),
    eaux: new Float32Array(MAX_ENEMIES),
    eang: new Float32Array(MAX_ENEMIES),
    epat: new Uint8Array(MAX_ENEMIES),
    efuse: new Float32Array(MAX_ENEMIES),
    edash: new Float32Array(MAX_ENEMIES),
    eborn: new Float32Array(MAX_ENEMIES),
    eflag: new Uint8Array(MAX_ENEMIES),
    ekind: new Uint8Array(MAX_ENEMIES),
    ealive: new Uint8Array(MAX_ENEMIES),
    enemyCount: 0,
    hitAt: new Float64Array(MAX_SLOTS * MAX_ENEMIES),

    qx: new Float32Array(MAX_PROJ),
    qy: new Float32Array(MAX_PROJ),
    qpx: new Float32Array(MAX_PROJ),
    qpy: new Float32Array(MAX_PROJ),
    qvx: new Float32Array(MAX_PROJ),
    qvy: new Float32Array(MAX_PROJ),
    qlife: new Float32Array(MAX_PROJ),
    qmax: new Float32Array(MAX_PROJ),
    qr: new Float32Array(MAX_PROJ),
    qpierce: new Int16Array(MAX_PROJ),
    qslot: new Uint8Array(MAX_PROJ),
    qmode: new Uint8Array(MAX_PROJ),
    qdelay: new Float32Array(MAX_PROJ),
    qlast: new Int16Array(MAX_PROJ),
    qalive: new Uint8Array(MAX_PROJ),

    bx: new Float32Array(MAX_BULLETS),
    by: new Float32Array(MAX_BULLETS),
    bpx: new Float32Array(MAX_BULLETS),
    bpy: new Float32Array(MAX_BULLETS),
    bvx: new Float32Array(MAX_BULLETS),
    bvy: new Float32Array(MAX_BULLETS),
    br: new Float32Array(MAX_BULLETS),
    bdmg: new Float32Array(MAX_BULLETS),
    blife: new Float32Array(MAX_BULLETS),
    bhome: new Float32Array(MAX_BULLETS),
    balive: new Uint8Array(MAX_BULLETS),

    gx: new Float32Array(MAX_GEMS),
    gy: new Float32Array(MAX_GEMS),
    gval: new Float32Array(MAX_GEMS),
    gpull: new Uint8Array(MAX_GEMS),
    galive: new Uint8Array(MAX_GEMS),
    gemCount: 0,

    zones: Array.from({ length: 192 }, () => ({ alive: false, kind: "blast" as ZoneKind, slot: 0, x: 0, y: 0, angle: 0, len: 0, width: 0, r: 0, life: 0, max: 0, anchored: false, color: "#fff" })),
    hazards: Array.from({ length: 48 }, () => ({ alive: false, kind: "meteor" as const, x: 0, y: 0, angle: 0, len: 0, r: 0, warn: 0, warnMax: 1, life: 0, dmg: 0, done: false, color: "#f00" })),
    pickups: Array.from({ length: 64 }, () => ({ alive: false, kind: "zeni" as PickupKind, x: 0, y: 0, value: 0 })),
    numbers: Array.from({ length: 96 }, () => ({ alive: false, x: 0, y: 0, v: 0, t: 0, crit: false })),
    notices: [],
    events: [],
    shake: 0,
    flash: 0,
    flashColor: "#fff",
    hitstop: 0,
    immortal: 0,

    fxHead: 0,
    fxKind: new Uint8Array(MAX_FX),
    fxX: new Float32Array(MAX_FX),
    fxY: new Float32Array(MAX_FX),
    fxA: new Float32Array(MAX_FX),
    fxColor: new Array<string>(MAX_FX).fill("#fff"),

    grid: new Grid(64, MAX_ENEMIES),
    spawnAcc: 0,
    nextElite: 120, // o primeiro chega aos 2:00
    eliteIdx: 0,
    ringsDone: 0,
    stampedesDone: 0,
    nextCrate: 20,
    nextMeteor: 4,
    nextKiai: 6,

    scrolls: [],
    scrollOptions: [],
    scrollsOffered: 0,

    balls: [],
    ballsFound: 0,
    wishOptions: [],
    wished: null,
    legendary: (shop.lendarios ?? 0) > 0,

    bossAt: SAGA_LENGTH,
    boss: -1,
    bossDefeated: false,
    bossPreDamage: 0,
    arena: null,
    victoryAt: 0,
    growthBonus: 0,

    chest: null,
    techDamage: [0, 0, 0, 0, 0, 0],
    dodges: 0,
    dmgBy: {},
    killsBy: new Uint32Array(ENEMY_LIST.length),
    evolved: [],
    nextBarrel: 45,
    thievesDone: 0,
    thievesCaught: 0,
    shieldBlocks: 0,
    foodEaten: 0,
    bestChain: 0,
  };
  recomputeStats(w);
  w.player.hp = w.stats.maxHp;
  w.player.shield = w.stats.barrier;
  addTech(w, CHARACTERS[char].start);
  // Largada (loja): a run começa com níveis para escolher
  const head = shop.inicio ?? 0;
  if (head > 0) {
    for (let k = 0; k < head; k++) {
      w.player.level++;
      w.pendingLevels++;
    }
    w.player.xpNext = xpForLevel(w.player.level);
    w.phase = "levelup";
    rollOffers(w);
  }
  return w;
}

/* ---------- atributos, técnicas, passivas ---------- */

/** Multiplicador de dano da transformação ativa. */
export const FORM_MIGHT = [1, 1.4, 1.6, 1.85];

export function recomputeStats(w: World) {
  const before = w.stats.maxHp;
  const s: Stats = { ...BASE_STATS };
  CHARACTERS[w.char].apply(s);
  applyShop(s, w.shop);
  for (const p of w.passives) PASSIVES[p.id].apply(s, p.level);
  for (const id of w.scrolls) SCROLLS[id].apply?.(s);
  for (const id of w.pacts) PACTS[id].apply?.(s);
  for (const set of activeSets(w)) {
    set.apply(s);
    if (!w.setsDone.includes(set.id)) {
      w.setsDone.push(set.id);
      w.flash = 0.3;
      w.flashColor = set.color;
      w.events.push("gold");
      notice(w, `SET COMPLETE: ${set.name}!`);
    }
  }
  if (w.nightmare) s.curse += 0.5;
  s.growth += w.growthBonus;
  s.dodge = Math.min(0.6, s.dodge);
  if (w.player.rage > 0) {
    s.might *= 1.4;
    s.moveSpeed *= 1.15;
  }
  if (w.form > 0) {
    s.might *= FORM_MIGHT[w.form];
    s.moveSpeed *= 1.2;
    if (w.char === "piccolo") s.area *= 1.3; // Fusão com Kami: alcance maior
  }
  w.stats = s;
  // HP máximo subiu: o ganho também entra no HP atual
  if (s.maxHp > before && w.player.hp > 0) w.player.hp += s.maxHp - before;
  w.player.hp = Math.min(w.player.hp, s.maxHp);
}

export function addTech(w: World, id: TechId) {
  const slot = w.techs.find((t) => t.id === id);
  if (slot) {
    slot.level = Math.min(TECHNIQUES[id].max, slot.level + 1);
    slot.p = techParams(TECHNIQUES[id], slot.level);
  } else {
    w.techs.push({ id, level: 1, timer: 0.4, p: techParams(TECHNIQUES[id], 1), flip: 0, burst: 0, burstAcc: 0 });
  }
}

export function addPassive(w: World, id: PassiveId) {
  const slot = w.passives.find((p) => p.id === id);
  if (slot) slot.level = Math.min(PASSIVES[id].max, slot.level + 1);
  else w.passives.push({ id, level: 1 });
  recomputeStats(w);
}

/** Técnicas que podem evoluir agora: no nível máximo e com a passiva certa. */
export function evolvable(w: World) {
  return w.techs.filter((t) => {
    const d = TECHNIQUES[t.id];
    return d.evolvesTo && t.level >= d.max && w.passives.some((p) => p.id === d.evolvesWith);
  });
}

export function evolve(w: World, slot: TechSlot) {
  const to = TECHNIQUES[slot.id].evolvesTo!;
  slot.id = to;
  slot.level = 1;
  slot.p = techParams(TECHNIQUES[to], 1);
  slot.timer = 0.2;
  if (!w.evolved.includes(to)) w.evolved.push(to);
  w.flash = 0.25;
  w.flashColor = TECHNIQUES[to].color;
  notice(w, `EVOLUTION: ${TECHNIQUES[to].name}!`);
}

/* ---------- nível e cartas ---------- */

function techAllowed(w: World, id: TechId) {
  const d = TECHNIQUES[id];
  if (d.from || d.union) return false; // evoluções só por Cápsula; uniões têm carta própria
  if (d.owner && d.owner !== w.char) return false;
  return !w.banished.includes(id);
}

/** Uniões possíveis agora: as duas técnicas da receita no nível 5 ou mais. */
export function unionsAvailable(w: World) {
  return UNIONS.filter((d) => {
    if (w.banished.includes(d.id)) return false;
    return d.union!.every((part) => (w.techs.find((t) => t.id === part)?.level ?? 0) >= UNION_LEVEL);
  }).map((d) => d.id);
}

/** Conjuntos de passivas completos. */
export function activeSets(w: World) {
  return SETS.filter((set) => set.parts.every((id) => w.passives.some((p) => p.id === id)));
}

export function candidates(w: World): Offer[] {
  const out: Offer[] = [];
  const ids = [...BASE_TECHS];
  for (const id of ids) {
    if (!techAllowed(w, id)) continue;
    const owned = w.techs.find((t) => t.id === id);
    if (owned) {
      if (owned.level < TECHNIQUES[id].max) {
        // carta dourada: sobe dois níveis de uma vez (rara; a sorte ajuda)
        const gold = owned.level + 1 < TECHNIQUES[id].max && w.rng.chance(0.05 * w.stats.luck);
        out.push({ type: "tech", id, level: owned.level + (gold ? 2 : 1), gold });
      }
    } else if (w.techs.length < MAX_SLOTS) out.push({ type: "tech", id, level: 1 });
  }
  for (const id of Object.keys(PASSIVES) as PassiveId[]) {
    if (w.banished.includes(id)) continue;
    const def = PASSIVES[id];
    if (def.owner && def.owner !== w.char) continue;
    const owned = w.passives.find((p) => p.id === id);
    if (owned) {
      if (owned.level < def.max) out.push({ type: "passive", id, level: owned.level + 1 });
    } else if (w.passives.length < MAX_SLOTS) out.push({ type: "passive", id, level: 1 });
  }
  return out;
}

/** A carta travada, atualizada para o estado de agora (null se não vale mais). */
function refreshLocked(w: World): Offer | null {
  const o = w.locked;
  if (!o) return null;
  if (o.type === "tech") {
    const owned = w.techs.find((t) => t.id === o.id);
    if (owned) return owned.level < TECHNIQUES[o.id].max ? { type: "tech", id: o.id, level: owned.level + 1 } : null;
    return w.techs.length < MAX_SLOTS ? { type: "tech", id: o.id, level: 1 } : null;
  }
  if (o.type === "passive") {
    const owned = w.passives.find((p) => p.id === o.id);
    if (owned) return owned.level < PASSIVES[o.id].max ? { type: "passive", id: o.id, level: owned.level + 1 } : null;
    return w.passives.length < MAX_SLOTS ? { type: "passive", id: o.id, level: 1 } : null;
  }
  if (o.type === "union") return unionsAvailable(w).includes(o.id) ? o : null;
  if (o.type === "pact") return w.pacts.includes(o.id) ? null : o;
  return o;
}

const sameCard = (a: Offer, b: Offer) => a.type === b.type && (a as { id?: string }).id === (b as { id?: string }).id;

function itemsAvailable(w: World): ItemId[] {
  const out: ItemId[] = ["ki", "capsula", "ima", "agua", "bomba", "treino", "baba"];
  if (w.balls.length < 7 || w.balls.some((b) => !b.taken)) out.push("radar");
  if (w.player.hp < w.stats.maxHp * 0.7) out.push("dende");
  if (w.techs.some((t) => t.level < TECHNIQUES[t.id].max)) out.push("salaUmDia");
  out.push("furia", "genki");
  if (w.player.shield < w.stats.barrier + 2) out.push("escudo");
  if (w.form > 0 || w.transformCd > 0) out.shift(); // ki não serve agora
  return out;
}

export function rollOffers(w: World) {
  const pool = candidates(w);
  // o que você já tem pesa mais: a build fecha em vez de espalhar. A passiva que evolui uma
  // técnica sua também pesa mais, e a que avança um conjunto começado.
  const wantPassive = new Set(w.techs.map((t) => TECHNIQUES[t.id].evolvesWith).filter(Boolean));
  const setPart = new Set(SETS.filter((set) => set.parts.some((id) => w.passives.some((p) => p.id === id))).flatMap((set) => set.parts));
  const weight = (o: Offer) => {
    if (o.type === "tech") return o.level > 1 ? 3 : TECHNIQUES[o.id].owner ? 2.5 : 1.5;
    if (o.type === "passive") return (o.level > 1 ? 2.5 : PASSIVES[o.id].owner ? 2.2 : 1) * (wantPassive.has(o.id) ? 1.6 : 1) * (o.level === 1 && setPart.has(o.id) ? 1.5 : 1);
    return 1;
  };
  const count = w.rng.chance(Math.min(0.5, (w.stats.luck - 1) * 0.5 + 0.1)) ? 4 : 3;
  const picked: Offer[] = [];
  // carta travada volta primeiro
  const locked = refreshLocked(w);
  w.locked = locked;
  if (locked) {
    picked.push(locked);
    const k = pool.findIndex((o) => sameCard(o, locked));
    if (k >= 0) pool.splice(k, 1);
  }
  // união disponível quase sempre aparece
  const unions = unionsAvailable(w).filter((id) => !picked.some((o) => o.type === "union" && o.id === id));
  if (unions.length && w.rng.chance(0.75)) picked.push({ type: "union", id: w.rng.pick(unions) });
  // pacto: a partir do nível 8, às vezes, até 3 por run
  if (w.player.level >= 8 && w.pacts.length < 3 && picked.length < count && w.rng.chance(0.12)) {
    const free = PACT_IDS.filter((id) => !w.pacts.includes(id) && !picked.some((o) => o.type === "pact" && o.id === id));
    if (free.length) picked.push({ type: "pact", id: w.rng.pick(free) });
  }
  // item de uso imediato: a partir do nível 3, às vezes
  if (w.player.level >= 3 && picked.length < count && w.rng.chance(0.15)) picked.push({ type: "item", id: w.rng.pick(itemsAvailable(w)) });
  while (picked.length < count && pool.length) {
    let total = 0;
    for (const o of pool) total += weight(o);
    let r = w.rng.next() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= weight(pool[i]);
      if (r <= 0) break;
    }
    picked.push(pool.splice(i, 1)[0]);
  }
  if (!picked.some((o) => o.type === "tech" || o.type === "passive" || o.type === "union")) picked.push({ type: "senzu" }, { type: "zeni" });
  w.offers = picked;
}

function afterLevel(w: World) {
  w.pendingLevels--;
  if (w.pendingLevels > 0) rollOffers(w);
  else {
    w.offers = [];
    w.phase = "playing";
  }
}

/** Aplica a carta escolhida na tela de nível. */
export function choose(w: World, index: number) {
  if (w.phase !== "levelup") return;
  const o = w.offers[index];
  if (!o) return;
  if (w.locked && sameCard(w.locked, o)) w.locked = null;
  applyOffer(w, o);
  // a carta abriu uma Cápsula: a tela dela vem antes; ao fechar, os níveis restantes seguem
  if ((w.phase as Phase) === "chest") {
    w.pendingLevels--;
    return;
  }
  afterLevel(w);
}

/** Trava uma carta: ela volta na próxima tela de nível (gasta uma trava). Travar de novo destrava. */
export function lockOffer(w: World, index: number) {
  const o = w.offers[index];
  if (w.phase !== "levelup" || !o || o.type === "senzu" || o.type === "zeni") return false;
  if (w.locked && sameCard(w.locked, o)) {
    w.locked = null;
    return true;
  }
  if (w.locks <= 0) return false;
  w.locks--;
  w.locked = o;
  return true;
}

/** Sorteia outras cartas (gasta um reroll). */
export function reroll(w: World) {
  if (w.phase !== "levelup" || w.rerolls <= 0) return false;
  w.rerolls--;
  rollOffers(w);
  return true;
}

/** Pula este nível sem escolher (gasta um pulo). */
export function skip(w: World) {
  if (w.phase !== "levelup" || w.skips <= 0) return false;
  w.skips--;
  afterLevel(w);
  return true;
}

/** Bane a carta da run e sorteia de novo (gasta um banimento). */
export function banish(w: World, index: number) {
  const o = w.offers[index];
  if (w.phase !== "levelup" || w.banishes <= 0 || !o || (o.type !== "tech" && o.type !== "passive" && o.type !== "union")) return false;
  if (o.type === "tech" && w.techs.some((t) => t.id === o.id)) return false; // não bane o que você já tem
  if (o.type === "passive" && w.passives.some((p) => p.id === o.id)) return false;
  w.banishes--;
  w.banished.push(o.id);
  if (w.locked && sameCard(w.locked, o)) w.locked = null;
  rollOffers(w);
  return true;
}

/** Tira uma técnica do espaço `idx` e reajusta quem apontava para os espaços seguintes. */
function removeTechSlot(w: World, idx: number) {
  w.techs.splice(idx, 1);
  w.techDamage.splice(idx, 1);
  w.techDamage.push(0);
  for (let q = 0; q < MAX_PROJ; q++) {
    if (!w.qalive[q]) continue;
    if (w.qslot[q] === idx) w.qalive[q] = 0;
    else if (w.qslot[q] > idx) w.qslot[q]--;
  }
  for (const z of w.zones) {
    if (!z.alive || z.kind === "shock") continue;
    if (z.slot === idx) z.alive = false;
    else if (z.slot > idx) z.slot--;
  }
  w.hitAt.fill(0);
}

/** União: a primeira técnica da receita vira a união; a segunda sai e libera o espaço. */
export function applyUnion(w: World, id: TechId) {
  const def = TECHNIQUES[id];
  const [a, b] = def.union!;
  const ia = w.techs.findIndex((t) => t.id === a),
    ib = w.techs.findIndex((t) => t.id === b);
  if (ia < 0 || ib < 0) return;
  const t = w.techs[ia];
  t.id = id;
  t.level = 1;
  t.p = techParams(def, 1);
  t.timer = 0.2;
  t.burst = 0;
  w.techDamage[ia] += w.techDamage[ib];
  removeTechSlot(w, ib);
  if (!w.unions.includes(id)) w.unions.push(id);
  w.flash = 0.35;
  w.flashColor = def.color;
  w.shake = Math.max(w.shake, 0.3);
  w.events.push("transform");
  fx(w, Fx.Ring, w.player.x, w.player.y, 160, def.color);
  notice(w, `UNION: ${def.name}!`);
}

function applyPact(w: World, id: PactId) {
  if (w.pacts.includes(id)) return;
  w.pacts.push(id);
  recomputeStats(w);
  switch (id) {
    case "freeza":
      for (const t of w.techs) if (t.level < TECHNIQUES[t.id].max) addTech(w, t.id);
      break;
    case "majin":
      w.player.hp = w.stats.maxHp;
      break;
    case "shenlongNegro":
      w.rerolls += 3;
      w.banishes += 2;
      w.locks += 2;
      break;
    case "babidi":
      openCapsule(w, 3);
      break;
    case "velhoKaioshin":
      for (const p of w.passives) if (p.level < PASSIVES[p.id].max) p.level++;
      recomputeStats(w);
      break;
  }
  w.flash = 0.3;
  w.flashColor = "#8a0a2a";
  w.events.push("boss");
  notice(w, `${PACTS[id].name}: ${PACTS[id].gain}`);
}

function applyItem(w: World, id: ItemId) {
  const p = w.player;
  switch (id) {
    case "ki":
      gainKi(w, 1);
      break;
    case "capsula":
      openCapsule(w, capsuleRoll(w));
      break;
    case "ima":
      for (let i = 0; i < MAX_GEMS; i++) if (w.galive[i]) w.gpull[i] = 1;
      notice(w, "Every orb comes to you!");
      break;
    case "agua":
      w.immortal = Math.max(w.immortal, 8);
      p.hp = Math.min(w.stats.maxHp, p.hp + w.stats.maxHp * 0.2);
      notice(w, "Untouchable for 8s!");
      break;
    case "bomba":
      for (let i = 0; i < MAX_ENEMIES; i++) {
        if (!w.ealive[i] || !onScreen(w, i)) continue;
        const tier = enemyDef(w, i).tier;
        if (tier === "boss" || tier === "elite") hurt(w, i, w.emax[i] * 0.1, 0, 0, 0, -1);
        else killEnemy(w, i, -1);
      }
      w.flash = 0.5;
      w.flashColor = "#ff8a3a";
      w.shake = 0.6;
      w.events.push("boom");
      break;
    case "treino":
      gainXp(w, p.xpNext * 0.5 / w.stats.growth);
      break;
    case "dende":
      p.hp = w.stats.maxHp;
      notice(w, "Fully healed!");
      break;
    case "baba":
      w.rerolls += 2;
      w.banishes += 1;
      w.locks += 1;
      break;
    case "salaUmDia": {
      const open = w.techs.filter((t) => t.level < TECHNIQUES[t.id].max);
      if (open.length) {
        const t = w.rng.pick(open);
        addTech(w, t.id);
        notice(w, `${TECHNIQUES[t.id].name} reached level ${t.level}!`);
      }
      break;
    }
    case "furia":
      startRage(w, 20);
      break;
    case "escudo":
      addShield(w, 2);
      break;
    case "genki":
      spiritBomb(w);
      break;
    case "radar": {
      // a esfera pendente (ou a próxima) aparece a uns passos do herói
      let b = w.balls.find((q) => !q.taken);
      if (!b && w.balls.length < 7) {
        b = { stars: w.balls.length + 1, x: 0, y: 0, taken: false };
        w.balls.push(b);
      }
      if (b) {
        const a = w.rng.range(0, Math.PI * 2);
        b.x = p.x + Math.cos(a) * 180;
        b.y = p.y + Math.sin(a) * 180;
        notice(w, `${b.stars}-Star Ball detected nearby!`);
      }
      break;
    }
  }
}

export function applyOffer(w: World, o: Offer) {
  if (o.type === "tech") {
    addTech(w, o.id);
    if (o.gold) {
      addTech(w, o.id);
      w.events.push("gold");
    }
  } else if (o.type === "passive") addPassive(w, o.id);
  else if (o.type === "union") applyUnion(w, o.id);
  else if (o.type === "pact") applyPact(w, o.id);
  else if (o.type === "item") applyItem(w, o.id);
  else if (o.type === "senzu") w.player.hp = Math.min(w.stats.maxHp, w.player.hp + w.stats.maxHp * 0.3);
  else w.player.zeni += Math.round(25 * w.stats.greed);
}

export function offerName(o: Offer) {
  if (o.type === "tech" || o.type === "union") return TECHNIQUES[o.id].name;
  if (o.type === "passive") return PASSIVES[o.id].name;
  if (o.type === "pact") return PACTS[o.id].name;
  if (o.type === "item") return ITEMS[o.id].name;
  return o.type === "senzu" ? "Senzu Bean" : "Bag of Zeni";
}

export function offerText(o: Offer) {
  if (o.type === "tech") {
    if (o.level === 1) return TECHNIQUES[o.id].desc;
    const lv = TECHNIQUES[o.id].levels;
    return o.gold ? `${lv[o.level - 3].text}, ${lv[o.level - 2].text}` : lv[o.level - 2].text;
  }
  if (o.type === "union") {
    const [a, b] = TECHNIQUES[o.id].union!;
    return `${TECHNIQUES[a].name} + ${TECHNIQUES[b].name}: ${TECHNIQUES[o.id].desc} Frees a slot.`;
  }
  if (o.type === "passive") return PASSIVES[o.id].desc;
  if (o.type === "pact") return `${PACTS[o.id].gain} Cost: ${PACTS[o.id].cost}`;
  if (o.type === "item") return ITEMS[o.id].desc;
  return o.type === "senzu" ? "Recover 30% HP." : "+25 Zeni.";
}

/** Ao sair de uma tela (cápsula, desejo): volta ao jogo ou abre os níveis acumulados. */
function resume(w: World) {
  if (w.pendingLevels > 0) {
    w.phase = "levelup";
    rollOffers(w);
  } else w.phase = "playing";
}

export function gainXp(w: World, v: number) {
  const p = w.player;
  p.xp += v * w.stats.growth;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = xpForLevel(p.level);
    w.pendingLevels++;
    w.events.push("levelup");
    fx(w, Fx.LevelUp, p.x, p.y, p.level, "#5ad7ff");
  }
  if (w.pendingLevels > 0 && w.phase === "playing") {
    w.phase = "levelup";
    rollOffers(w);
  }
}

/* ---------- Cápsula (o baú do gênero) ---------- */

/** Abre uma Cápsula com até `n` prêmios: evolução primeiro, depois níveis do que você tem. */
export function openCapsule(w: World, n: number) {
  const items: string[] = [];
  let evolved = false;
  for (let k = 0; k < n; k++) {
    const evo = evolvable(w);
    if (evo.length) {
      evolve(w, evo[0]);
      items.push(`EVOLUTION: ${TECHNIQUES[evo[0].id].name}`);
      evolved = true;
      continue;
    }
    const owned = candidates(w).filter((o) => (o.type === "tech" || o.type === "passive") && o.level > 1);
    if (!owned.length) {
      const z = Math.round(100 * w.stats.greed);
      w.player.zeni += z;
      items.push(`+${z} Zeni`);
      continue;
    }
    const o = w.rng.pick(owned);
    applyOffer(w, o);
    items.push(`${offerName(o)} Lv ${(o as { level: number }).level}`);
  }
  w.chest = { items, evolved };
  w.events.push("chest");
  if (w.phase === "playing" || w.phase === "levelup") w.phase = "chest";
}

export function closeChest(w: World) {
  if (w.phase !== "chest") return;
  w.chest = null;
  resume(w);
}

/** Quantos prêmios uma Cápsula de elite dá (sorte ajuda). */
export function capsuleRoll(w: World) {
  const r = w.rng.next() / w.stats.luck;
  return r < 0.06 ? 5 : r < 0.3 ? 3 : 1;
}

/* ---------- Shenlong ---------- */

export function rollWishes(w: World) {
  const pool = (Object.keys(WISHES) as WishId[]).filter((id) => w.legendary || !WISHES[id].legendary);
  const out: WishId[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(w.rng.int(pool.length), 1)[0]);
  w.wishOptions = out;
}

export function chooseWish(w: World, index: number) {
  if (w.phase !== "wish") return;
  const id = w.wishOptions[index];
  if (!id) return;
  w.wished = id;
  w.wishOptions = [];
  w.events.push("wish");
  switch (id) {
    case "reviver":
      w.revives++;
      notice(w, "An extra life!");
      break;
    case "imortal":
      w.immortal = 60;
      notice(w, "Immortal for 60s!");
      break;
    case "rico":
      w.player.zeni += 1500;
      notice(w, "+1500 Zeni!");
      break;
    case "tempo":
      w.bossAt += 120;
      w.growthBonus += 0.2;
      recomputeStats(w);
      notice(w, "The boss will arrive 2 min later!");
      break;
    case "forte": {
      const evo = evolvable(w);
      if (evo.length) evolve(w, evo[0]);
      else
        for (const t of w.techs) {
          addTech(w, t.id);
          addTech(w, t.id);
        }
      notice(w, "You are the strongest!");
      break;
    }
    case "destruir":
      for (let i = 0; i < MAX_ENEMIES; i++) {
        if (!w.ealive[i]) continue;
        const tier = enemyDef(w, i).tier;
        if (tier === "boss") {
          w.ehp[i] -= w.emax[i] * 0.3;
          continue;
        }
        if (tier !== "crate") killEnemy(w, i, -1);
      }
      if (w.boss < 0) w.bossPreDamage = 0.3;
      w.flash = 0.6;
      w.flashColor = "#ffffff";
      w.shake = 0.6;
      notice(w, "Your enemies have been destroyed!");
      break;
  }
  resume(w);
}

/* ---------- Pergaminhos Secretos ---------- */

export function hasScroll(w: World, id: ScrollId) {
  return w.scrolls.includes(id);
}

/** Abre a escolha de pergaminho (3 opções que você ainda não tem). */
export function offerScrolls(w: World) {
  const pool = SCROLL_IDS.filter((id) => !w.scrolls.includes(id));
  const out: ScrollId[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(w.rng.int(pool.length), 1)[0]);
  if (!out.length) return;
  w.scrollOptions = out;
  w.phase = "scroll";
  w.events.push("scroll");
}

export function chooseScroll(w: World, index: number) {
  if (w.phase !== "scroll") return;
  const id = w.scrollOptions[index];
  if (!id) return;
  w.scrolls.push(id);
  w.scrollOptions = [];
  recomputeStats(w);
  w.flash = 0.25;
  w.flashColor = SCROLLS[id].color;
  notice(w, `${SCROLLS[id].name}!`);
  resume(w);
}

/* ---------- transformação ---------- */

/** Degrau mais alto que o nível atual libera para este personagem. */
export function formAvailable(w: World) {
  let tier = 0;
  for (let k = 0; k < FORM_LEVELS.length; k++) if (w.player.level >= FORM_LEVELS[k]) tier = k + 1;
  return Math.min(tier, CHARACTERS[w.char].forms.length);
}

export function canTransform(w: World) {
  return w.form === 0 && w.ki >= 1 && w.transformCd <= 0 && formAvailable(w) > 0;
}

export function transform(w: World) {
  if (!canTransform(w)) return false;
  const tier = formAvailable(w);
  w.form = tier;
  w.formMax = w.formTime = (12 + tier * 3) * (hasScroll(w, "fusaoInstavel") ? 2 : 1);
  w.maxForm = Math.max(w.maxForm, tier);
  w.player.invuln = Math.max(w.player.invuln, 0.5);
  recomputeStats(w);
  const form = CHARACTERS[w.char].forms[tier - 1];
  w.flash = 0.35;
  w.flashColor = form.aura;
  w.shake = 0.4;
  w.hitstop = 0.12;
  w.events.push("transform");
  notice(w, `${form.name}!`);
  // onda de choque: empurra e fere quem está perto; o Hercule faz todo mundo parar para olhar
  const p = w.player;
  const r = 180 + 40 * tier;
  addZone(w, { kind: "shock", slot: 0, x: p.x, y: p.y, angle: 0, len: 0, width: 0, r, life: 0.45, max: 0.45, anchored: true, color: form.aura });
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    const dx = w.ex[i] - p.x,
      dy = w.ey[i] - p.y;
    if (w.char === "hercule") {
      if (Math.abs(dx) < w.view.w / 2 && Math.abs(dy) < w.view.h / 2) w.estun[i] = Math.max(w.estun[i], 4);
      continue;
    }
    if (dx * dx + dy * dy < r * r) hurt(w, i, 20 * tier * (1 + w.player.level / 20), dx, dy, 600, -1);
  }
  return true;
}

export function updateForm(w: World, dt: number) {
  if (w.form > 0) {
    w.formTime -= dt;
    w.ki = Math.max(0, w.formTime / w.formMax);
    if (w.formTime <= 0) {
      w.form = 0;
      w.ki = 0;
      w.transformCd = 20;
      recomputeStats(w);
      notice(w, "Your transformation wore off.");
    }
  } else if (w.transformCd > 0) w.transformCd -= dt;
}

export function gainKi(w: World, v: number) {
  if (w.form > 0 || w.transformCd > 0) return;
  const was = w.ki;
  w.ki = Math.min(1, w.ki + v * (hasScroll(w, "fusaoInstavel") ? 1.5 : 1));
  if (was < 1 && w.ki >= 1 && formAvailable(w) > 0) notice(w, "Ki full! Press SPACE to transform");
}

/* ---------- inimigos ---------- */

export function enemyDef(w: World, i: number): EnemyDef {
  return ENEMY_LIST[w.ekind[i]];
}

export function spawnEnemy(w: World, id: string, x: number, y: number) {
  if (w.enemyCount >= MAX_ENEMIES) return -1;
  let i = 0;
  while (i < MAX_ENEMIES && w.ealive[i]) i++;
  if (i === MAX_ENEMIES) return -1;
  const kind = ENEMY_INDEX[id];
  const d = ENEMY_LIST[kind];
  w.ex[i] = w.epx[i] = x;
  w.ey[i] = w.epy[i] = y;
  w.evx[i] = w.evy[i] = 0;
  const mult = enemyMult(w);
  // o chefe acompanha o herói: cada nível acima do 20 soma 4% de HP
  const hp = d.tier === "boss" ? d.hp * mult * bossLevelScale(w) : d.tier === "crate" ? 1 : d.hp * hpScale(w.t) * mult * w.stats.curse;
  w.ehp[i] = w.emax[i] = hp;
  w.eflash[i] = 0;
  w.estun[i] = 0;
  w.eatk[i] = d.patterns ? 2 + w.rng.next() * 2 : 0;
  w.eaux[i] = 0;
  w.eang[i] = 0;
  w.epat[i] = 0;
  w.efuse[i] = 0;
  w.edash[i] = 0;
  w.eborn[i] = w.t;
  w.eflag[i] = 0;
  w.ekind[i] = kind;
  w.ealive[i] = 1;
  for (let s = 0; s < MAX_SLOTS; s++) w.hitAt[s * MAX_ENEMIES + i] = 0;
  w.enemyCount++;
  return i;
}

export function bossLevelScale(w: World) {
  return 1 + 0.04 * Math.max(0, w.player.level - 20);
}

/** Multiplicador de HP e dano dos inimigos (saga e Modo Pesadelo). */
export function enemyMult(w: World) {
  return SAGAS[w.saga].mult * (w.nightmare ? 1.5 : 1);
}

/** Dano dos inimigos cresce devagar com o tempo. */
export function enemyDamage(w: World, base: number) {
  return base * enemyMult(w) * (1 + Math.max(0, w.t / 60 - 2) * 0.1) * (1 + (w.stats.curse - 1) * 0.5);
}

export function fx(w: World, kind: Fx, x: number, y: number, a = 0, color = "#ffffff") {
  const k = w.fxHead++ % MAX_FX;
  w.fxKind[k] = kind;
  w.fxX[k] = x;
  w.fxY[k] = y;
  w.fxA[k] = a;
  w.fxColor[k] = color;
}

export function addHazard(w: World, h: Omit<Hazard, "alive" | "done" | "warnMax">) {
  const slot = w.hazards.find((q) => !q.alive);
  if (!slot) return;
  Object.assign(slot, h);
  slot.warnMax = h.warn;
  slot.done = false;
  slot.alive = true;
}

/** Explosão de um kamikaze: fere os inimigos em volta (reação em cadeia) e, se `player`, o herói. */
export function explodeAt(w: World, x: number, y: number, r: number, dmgEnemies: number, dmgPlayer: number) {
  fx(w, Fx.Explosion, x, y, r, "#ff7a1a");
  w.events.push("boom");
  w.shake = Math.max(w.shake, 0.2);
  w.grid.query(x, y, r + 34, (j) => {
    if (!w.ealive[j]) return;
    const dx = w.ex[j] - x,
      dy = w.ey[j] - y;
    const rr = r + ENEMY_LIST[w.ekind[j]].radius;
    if (dx * dx + dy * dy < rr * rr && ENEMY_LIST[w.ekind[j]].tier !== "crate") hurt(w, j, dmgEnemies, dx, dy, 200, -1);
  });
  if (dmgPlayer > 0) {
    const p = w.player;
    if ((p.x - x) ** 2 + (p.y - y) ** 2 < (r + PLAYER_R) ** 2) hurtPlayer(w, dmgPlayer, "kamikaze");
  }
}

export function notice(w: World, text: string) {
  w.notices.push({ text, t: 0 });
  if (w.notices.length > 4) w.notices.shift();
}

/** Tira o inimigo do mundo sem recompensa (saiu de cena). */
export function removeEnemy(w: World, i: number) {
  if (!w.ealive[i]) return;
  w.ealive[i] = 0;
  w.enemyCount--;
  if (i === w.boss) w.boss = -1;
}

/** `slot` é a técnica que matou (-1: outra causa). */
export function killEnemy(w: World, i: number, slot: number) {
  const def = enemyDef(w, i);
  const x = w.ex[i],
    y = w.ey[i];
  removeEnemy(w, i);
  fx(w, Fx.Death, x, y, w.ekind[i] + (w.player.x < x ? 0.5 : 0), def.color);
  if (def.tier === "crate") {
    if (def.id === "barril") barrelBlast(w, x, y);
    else crateDrop(w, x, y);
    return;
  }
  w.player.kills++;
  w.killsBy[w.ekind[i]]++;
  if (def.xp) dropGem(w, x, y, def.xp * (1 + (w.stats.curse - 1) * 0.6));
  // kamikaze morto antes da hora: explode e fere só os vizinhos
  if (def.behavior === "exploder") explodeAt(w, x, y, 62, 30 * hpScale(w.t), 0);
  if (hasScroll(w, "absorcao")) w.player.hp = Math.min(w.stats.maxHp, w.player.hp + 0.2);
  if (slot >= 0) {
    const heal = TECHNIQUES[w.techs[slot]?.id]?.extra?.healOnKill;
    if (heal) w.player.hp = Math.min(w.stats.maxHp, w.player.hp + heal);
  }
  if (def.tier === "boss") {
    w.bossDefeated = true;
    w.victoryAt = w.t + 3;
    w.arena = null;
    w.shake = 1;
    w.flash = 0.8;
    w.flashColor = "#ffffff";
    w.hitstop = 0.3;
    w.events.push("victory");
    notice(w, `${def.name} was defeated!`);
    // a horda some junto com o chefe e vira orbs
    for (let j = 0; j < MAX_ENEMIES; j++) if (w.ealive[j] && enemyDef(w, j).tier !== "crate") killEnemy(w, j, -1);
    addPickup(w, "capsula", x, y, 5);
    return;
  }
  if (def.id === "ladrao") {
    w.thievesCaught++;
    addPickup(w, "capsula", x, y, 3);
    addPickup(w, "bolsa", x + 18, y, 6 + w.rng.int(6));
    if (w.rng.chance(0.5 * dropMult(w))) addPickup(w, "barreira", x - 18, y, 1);
    w.events.push("gold");
    notice(w, "Thief caught! It dropped its loot.");
    return;
  }
  if (def.tier === "elite") {
    addPickup(w, "capsula", x, y, 0);
    if (w.rng.chance(0.35 * dropMult(w))) addPickup(w, "bolsa", x + 16, y, 3 + w.rng.int(4));
    if (w.rng.chance(0.25 * dropMult(w))) addPickup(w, w.rng.pick(["carne", "furia", "barreira", "genki"] as PickupKind[]), x - 16, y, 1);
    fx(w, Fx.Explosion, x, y, 70, def.color);
    w.shake = Math.max(w.shake, 0.4);
    w.hitstop = Math.max(w.hitstop, 0.06);
    w.events.push("elite");
    gainKi(w, 0.15);
    return;
  }
  w.events.push("kill");
  gainKi(w, def.tier === "brute" ? 0.012 : 0.004);
  const luck = dropMult(w);
  if (def.tier === "brute") {
    if (w.rng.chance(0.05 * luck)) addPickup(w, "carne", x, y, 1);
    else if (w.rng.chance(0.012 * luck)) addPickup(w, "furia", x, y, 1);
    return;
  }
  if (w.rng.chance(0.0025 * luck)) addPickup(w, "senzu", x, y, 1);
  else if (w.rng.chance(0.004 * luck)) addPickup(w, "carne", x, y, 1);
  else if (w.rng.chance(0.022 * luck)) addPickup(w, "zeni", x, y, 1 + w.rng.int(5));
}

/** Sorte e Caçador de Tesouros (loja) aumentam a chance de item. */
export function dropMult(w: World) {
  return w.stats.luck * (1 + 0.15 * (w.shop.achados ?? 0));
}

function crateDrop(w: World, x: number, y: number, extra = true) {
  if (extra && w.rng.chance(0.12 * (w.shop.achados ?? 0))) crateDrop(w, x + 16, y, false);
  const r = w.rng.next();
  if (r < 0.14) addPickup(w, "senzu", x, y, 1);
  else if (r < 0.32) addPickup(w, "carne", x, y, 1);
  else if (r < 0.5) addPickup(w, "zeni", x, y, 5 + w.rng.int(10));
  else if (r < 0.58) addPickup(w, "bolsa", x, y, 2 + w.rng.int(3));
  else if (r < 0.66) addPickup(w, "scouter", x, y, 1);
  else if (r < 0.74) addPickup(w, "luz", x, y, 1);
  else if (r < 0.82) addPickup(w, "furia", x, y, 1);
  else if (r < 0.9) addPickup(w, "barreira", x, y, 1);
  else if (r < 0.95) addPickup(w, "genki", x, y, 1);
  else addPickup(w, "ki", x, y, 1);
}

/** Tanque de combustível destruído: explode, fere a horda em volta e pode estourar outros tanques. */
function barrelBlast(w: World, x: number, y: number) {
  const r = 120;
  const before = w.player.kills;
  fx(w, Fx.Explosion, x, y, r, "#ff7a1a");
  w.shake = Math.max(w.shake, 0.35);
  w.events.push("boom");
  const dmg = (60 + 6 * w.player.level) * hpScale(w.t) * 0.5;
  w.grid.query(x, y, r + 34, (j) => {
    if (!w.ealive[j]) return;
    const dx = w.ex[j] - x,
      dy = w.ey[j] - y;
    if (dx * dx + dy * dy < r * r) hurt(w, j, dmg, dx, dy, 500, -1);
  });
  // o herói perto demais também sente (pouco)
  const pdx = w.player.x - x,
    pdy = w.player.y - y;
  if (pdx * pdx + pdy * pdy < (r * 0.6) ** 2) hurtPlayer(w, 8 * enemyMult(w), "tanque");
  w.bestChain = Math.max(w.bestChain, w.player.kills - before);
}

/** Kaioken temporário: +40% dano, +15% velocidade. */
export function startRage(w: World, secs: number) {
  const was = w.player.rage > 0;
  w.player.rage = Math.max(w.player.rage, secs);
  if (!was) recomputeStats(w);
  w.flash = 0.25;
  w.flashColor = "#ff3b3b";
  w.events.push("transform");
  notice(w, `Kaioken Burst! +40% damage for ${secs}s`);
}

/** Cargas do Escudo de Ki: podem passar do máximo em até 2 (itens e drops). */
export function addShield(w: World, n: number) {
  w.player.shield = Math.min(w.stats.barrier + 2, w.player.shield + n);
  fx(w, Fx.Ring, w.player.x, w.player.y, 40, "#7ae8ff");
  notice(w, `Ki Shield: ${w.player.shield} charge${w.player.shield === 1 ? "" : "s"}`);
}

/** Genki Dama: dano grande em tudo que está na tela. */
export function spiritBomb(w: World) {
  const dmg = (90 + 12 * w.player.level) * Math.max(1, hpScale(w.t) * 0.6);
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i] || !onScreen(w, i)) continue;
    const tier = enemyDef(w, i).tier;
    if (tier === "crate") continue;
    hurt(w, i, tier === "boss" ? dmg * 3 : dmg, w.ex[i] - w.player.x, w.ey[i] - w.player.y, 300, -1);
  }
  fx(w, Fx.Ring, w.player.x, w.player.y, 360, "#9ad8ff");
  w.flash = 0.5;
  w.flashColor = "#bfe8ff";
  w.shake = 0.5;
  w.events.push("blast");
  notice(w, "Spirit Bomb!");
}

/** Comida: cura uma fração do HP máximo (Apetite Saiyajin aumenta). */
export function eat(w: World, frac: number) {
  const p = w.player;
  p.hp = Math.min(w.stats.maxHp, p.hp + w.stats.maxHp * frac * w.stats.foodHeal);
  w.foodEaten++;
  w.events.push("senzu");
  fx(w, Fx.Pickup, p.x, p.y - 10, 0, "#ff9a5a");
}

/** Bônus de dano das passivas de personagem e dos pergaminhos que dependem da run. */
function charMight(w: World) {
  let m = 1;
  if (w.char === "vegeta") m += Math.min(0.3, w.player.kills / 1000);
  if (w.char === "gohan") m += 0.5 * (1 - w.player.hp / w.stats.maxHp);
  if (w.scrolls.length) {
    if (hasScroll(w, "kaiokenX20")) m += Math.min(0.6, w.player.calm * 0.02);
    if (hasScroll(w, "espirito") && w.player.hp < w.stats.maxHp * 0.35) m += 0.5;
  }
  return m;
}

/** Dano num inimigo. (kx, ky) é a direção do empurrão (não precisa estar normalizada). */
export function hurt(w: World, i: number, dmg: number, kx: number, ky: number, kb: number, slot: number, critBonus = 0) {
  if (!w.ealive[i]) return;
  const def = enemyDef(w, i);
  const crit = w.rng.chance(w.stats.crit + critBonus);
  const big = def.tier === "elite" || def.tier === "boss";
  const amount = dmg * w.stats.might * charMight(w) * (crit ? w.stats.critMult : 1) * (big ? 1 + w.stats.bossDmg : 1);
  w.ehp[i] -= amount;
  if (slot >= 0) w.techDamage[slot] += amount;
  w.eflash[i] = 0.12;
  const len = Math.hypot(kx, ky) || 1;
  const k = kb * w.stats.knockback * (1 - def.knockbackResist);
  w.evx[i] += (kx / len) * k;
  w.evy[i] += (ky / len) * k;
  if (w.char === "hercule" && def.tier !== "boss" && w.rng.chance(0.04)) w.estun[i] = Math.max(w.estun[i], 1.5);
  addNumber(w, w.ex[i], w.ey[i] - 10, amount, crit);
  if (w.ticks % 3 === 0) w.events.push("hit");
  if (crit && w.ticks % 2 === 0) fx(w, Fx.Sparks, w.ex[i], w.ey[i], 6, "#ffd21f");
  if (w.ehp[i] <= 0) killEnemy(w, i, slot);
}

/** Respeita o tempo entre acertos do mesmo golpe no mesmo inimigo. */
export function canHit(w: World, slot: number, i: number, cd: number) {
  const k = slot * MAX_ENEMIES + i;
  if (w.hitAt[k] > w.t) return false;
  w.hitAt[k] = w.t + cd;
  return true;
}

function addNumber(w: World, x: number, y: number, v: number, crit: boolean) {
  let best = w.numbers[0];
  for (const n of w.numbers) {
    if (!n.alive) {
      best = n;
      break;
    }
    if (n.t > best.t) best = n;
  }
  best.alive = true;
  best.x = x + w.rng.range(-6, 6);
  best.y = y;
  best.v = Math.round(v);
  best.t = 0;
  best.crit = crit;
}

/** O herói leva um golpe (toque ou tiro). */
export function hurtPlayer(w: World, dmg: number, src = "toque"): boolean {
  const p = w.player;
  if (p.invuln > 0 || w.immortal > 0) return false;
  if (w.stats.dodge > 0 && w.rng.chance(w.stats.dodge)) {
    p.invuln = 0.3;
    w.dodges++;
    fx(w, Fx.Dodge, p.x, p.y - 20);
    w.events.push("dodge");
    return true;
  }
  if (p.shield >= 1) {
    // Escudo de Ki: a carga absorve o golpe inteiro
    p.shield--;
    if (p.shieldT <= 0) p.shieldT = SHIELD_REGEN;
    p.invuln = 0.5;
    w.shieldBlocks++;
    fx(w, Fx.Ring, p.x, p.y, 34, "#7ae8ff");
    w.events.push("dodge");
    return true;
  }
  const taken = Math.max(1, dmg - w.stats.armor);
  p.hp -= taken;
  w.dmgBy[src] = (w.dmgBy[src] ?? 0) + taken;
  p.invuln = 0.45;
  p.hurt = 0;
  p.calm = 0;
  w.shake = Math.max(w.shake, 0.15);
  w.events.push("hurt");
  fx(w, Fx.Sparks, p.x, p.y - 10, 8, "#ff3355");
  if (hasScroll(w, "zanzoken")) {
    p.invuln = 1;
    const r = 110;
    fx(w, Fx.Ring, p.x, p.y, r, "#7ad7ff");
    w.grid.query(p.x, p.y, r + 34, (j) => {
      if (!w.ealive[j]) return;
      const dx = w.ex[j] - p.x,
        dy = w.ey[j] - p.y;
      if (dx * dx + dy * dy < r * r) hurt(w, j, 30 + 2 * p.level, dx, dy, 400, -1);
    });
  }
  return true;
}

/* ---------- orbs e itens ---------- */

export function dropGem(w: World, x: number, y: number, v: number) {
  if (w.gemCount >= MAX_GEMS) {
    // cheio: o orb mais longe do herói (de uma amostra) vem para cá e soma o valor — o XP fica
    // perto da ação, num orb maior, em vez de sumir num canto que ninguém visita
    let far = 0,
      fd = -1;
    for (let k = 0; k < 24; k++) {
      const j = w.rng.int(MAX_GEMS);
      const d = (w.gx[j] - w.player.x) ** 2 + (w.gy[j] - w.player.y) ** 2;
      if (d > fd) {
        fd = d;
        far = j;
      }
    }
    w.gx[far] = x;
    w.gy[far] = y;
    w.gval[far] += v;
    return;
  }
  let i = 0;
  while (w.galive[i]) i++;
  w.gx[i] = x;
  w.gy[i] = y;
  w.gval[i] = v;
  w.gpull[i] = 0;
  w.galive[i] = 1;
  w.gemCount++;
}

export function addPickup(w: World, kind: PickupKind, x: number, y: number, value: number) {
  let p = w.pickups.find((q) => !q.alive);
  if (!p) {
    // cheio (itens não somem): troca o item comum mais longe do herói; Cápsula nunca sai
    let fd = -1;
    for (const q of w.pickups) {
      if (q.kind === "capsula") continue;
      const d = (q.x - w.player.x) ** 2 + (q.y - w.player.y) ** 2;
      if (d > fd) {
        fd = d;
        p = q;
      }
    }
    if (!p) return;
  }
  p.alive = true;
  p.kind = kind;
  p.x = x;
  p.y = y;
  p.value = value;
}

/* ---------- golpes: pools ---------- */

export function addZone(w: World, z: Omit<Zone, "alive">) {
  const slot = w.zones.find((q) => !q.alive);
  if (!slot) return null;
  Object.assign(slot, z);
  slot.alive = true;
  return slot;
}

export function addProj(w: World, slot: number, x: number, y: number, vx: number, vy: number, life: number, r: number, pierce: number, mode: number) {
  let i = 0;
  while (i < MAX_PROJ && w.qalive[i]) i++;
  if (i === MAX_PROJ) return -1;
  w.qx[i] = w.qpx[i] = x;
  w.qy[i] = w.qpy[i] = y;
  w.qvx[i] = vx;
  w.qvy[i] = vy;
  w.qlife[i] = w.qmax[i] = life;
  w.qr[i] = r;
  w.qpierce[i] = pierce;
  w.qslot[i] = slot;
  w.qmode[i] = mode;
  w.qlast[i] = -1;
  w.qalive[i] = 1;
  return i;
}

export function addBullet(w: World, x: number, y: number, vx: number, vy: number, r: number, dmg: number, life: number, home = 0) {
  let i = 0;
  while (i < MAX_BULLETS && w.balive[i]) i++;
  if (i === MAX_BULLETS) return;
  w.bx[i] = w.bpx[i] = x;
  w.by[i] = w.bpy[i] = y;
  w.bvx[i] = vx;
  w.bvy[i] = vy;
  w.br[i] = r;
  w.bdmg[i] = dmg;
  w.blife[i] = life;
  w.bhome[i] = home;
  w.balive[i] = 1;
}

/** Inimigo vivo mais próximo de (x, y) dentro de maxR (caixotes contam por último). */
export function nearestEnemy(w: World, x: number, y: number, maxR: number) {
  let best = -1,
    bd = maxR * maxR;
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    const dx = w.ex[i] - x,
      dy = w.ey[i] - y;
    let d = dx * dx + dy * dy;
    if (ENEMY_LIST[w.ekind[i]].tier === "crate") d *= 4;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

export function onScreen(w: World, i: number) {
  return Math.abs(w.ex[i] - w.player.x) < w.view.w / 2 && Math.abs(w.ey[i] - w.player.y) < w.view.h / 2;
}

/** Inimigo aleatório na tela (-1 se não achar em poucas tentativas). */
export function randomOnScreen(w: World) {
  for (let tries = 0; tries < 16; tries++) {
    const i = w.rng.int(MAX_ENEMIES);
    if (w.ealive[i] && onScreen(w, i)) return i;
  }
  return -1;
}

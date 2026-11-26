// Inimigos e sagas (GDD §9). Os números de HP são do minuto 0 e escalam com o tempo (hpScale) e
// com a saga (Saga.mult). Chefes não escalam com o tempo: têm HP absoluto.
export type EnemyTier = "grunt" | "brute" | "elite" | "boss" | "crate";

/** Ataques à distância de elites e chefes (sim/boss.ts). */
export type PatternKind = "snipe" | "volley" | "spiral" | "deathball" | "summon" | "dash" | "ring" | "shot" | "laser" | "meteor";

/** Como o inimigo se move. Padrão: persegue o herói. */
export type Behavior =
  | "ranged" // mantém distância e atira
  | "exploder" // corre até o herói, para, pisca e explode
  | "charger"; // de tempos em tempos avisa e investe em linha reta

export interface EnemyDef {
  id: string;
  name: string;
  tier: EnemyTier;
  hp: number;
  speed: number; // px/s
  damage: number; // por toque
  radius: number;
  xp: number;
  color: string; // placeholder
  knockbackResist: number; // 0..1
  sprite?: string; // chave no atlas (padrão: id)
  behavior?: Behavior;
  /** Padrões de ataque com a recarga de cada um, em s. */
  patterns?: { kind: PatternKind; cd: number }[];
}

const E = (d: EnemyDef) => d;

export const ENEMY_LIST: EnemyDef[] = [
  // Saga Freeza
  E({ id: "soldado", name: "Frieza Soldier", tier: "grunt", hp: 9, speed: 68, damage: 3, radius: 11, xp: 1, color: "#c9d2dc", knockbackResist: 0 }),
  E({ id: "saibaman", name: "Saibaman", tier: "grunt", hp: 6, speed: 92, damage: 2, radius: 9, xp: 1, color: "#5fd13a", knockbackResist: 0 }),
  E({ id: "soldadoElite", name: "Elite Soldier", tier: "grunt", hp: 16, speed: 78, damage: 5, radius: 11, xp: 2, color: "#8a9aff", knockbackResist: 0.1 }),
  E({ id: "brutamontes", name: "Frieza Brute", tier: "brute", hp: 55, speed: 42, damage: 9, radius: 18, xp: 5, color: "#b04aff", knockbackResist: 0.6, behavior: "charger" }),
  E({ id: "soldadoAtirador", name: "Frieza Gunner", tier: "grunt", hp: 10, speed: 62, damage: 5, radius: 11, xp: 2, color: "#ff9a5a", knockbackResist: 0, behavior: "ranged", patterns: [{ kind: "shot", cd: 2.8 }] }),
  E({ id: "saibamanBomba", name: "Kamikaze Saibaman", tier: "grunt", hp: 8, speed: 112, damage: 7, radius: 9, xp: 2, color: "#ff5a3a", knockbackResist: 0, behavior: "exploder" }),
  E({ id: "reiCold", name: "King Cold", tier: "elite", hp: 1900, speed: 55, damage: 18, radius: 26, xp: 80, color: "#c85aff", knockbackResist: 0.95, patterns: [{ kind: "laser", cd: 4.5 }, { kind: "volley", cd: 3.5 }] }),
  E({ id: "recoome", name: "Recoome", tier: "elite", hp: 900, speed: 60, damage: 11, radius: 26, xp: 40, color: "#ff5a3a", knockbackResist: 0.9, patterns: [{ kind: "dash", cd: 4 }] }),
  E({ id: "burter", name: "Burter", tier: "elite", hp: 750, speed: 95, damage: 10, radius: 22, xp: 40, color: "#3a6aff", knockbackResist: 0.85, patterns: [{ kind: "dash", cd: 3 }] }),
  E({ id: "jeice", name: "Jeice", tier: "elite", hp: 800, speed: 70, damage: 12, radius: 22, xp: 40, color: "#ff3a3a", knockbackResist: 0.85, patterns: [{ kind: "volley", cd: 3 }] }),
  E({ id: "ginyu", name: "Captain Ginyu", tier: "elite", hp: 1200, speed: 65, damage: 16, radius: 24, xp: 60, color: "#8a3aff", knockbackResist: 0.9, patterns: [{ kind: "snipe", cd: 2.5 }, { kind: "volley", cd: 5 }] }),
  E({
    id: "freeza",
    name: "Frieza",
    tier: "boss",
    hp: 23000,
    speed: 70,
    damage: 22,
    radius: 30,
    xp: 500,
    color: "#f0e8ff",
    knockbackResist: 1,
    patterns: [
      { kind: "snipe", cd: 1.6 },
      { kind: "laser", cd: 3.5 },
      { kind: "deathball", cd: 9 },
      { kind: "volley", cd: 4 },
      { kind: "meteor", cd: 6 },
      { kind: "summon", cd: 12 },
    ],
  }),

  // Saga Androides / Cell
  E({ id: "celljr", name: "Cell Jr.", tier: "grunt", hp: 11, speed: 88, damage: 4, radius: 10, xp: 1, color: "#7acc3a", knockbackResist: 0 }),
  E({ id: "roboRR", name: "Red Ribbon Robot", tier: "grunt", hp: 14, speed: 60, damage: 5, radius: 12, xp: 1, color: "#d84a3a", knockbackResist: 0.1 }),
  E({ id: "roboSentinela", name: "Sentry Robot", tier: "grunt", hp: 18, speed: 74, damage: 5, radius: 11, xp: 2, color: "#a0a8b0", knockbackResist: 0.2 }),
  E({ id: "roboPirata", name: "Pirate Robot", tier: "brute", hp: 70, speed: 40, damage: 10, radius: 20, xp: 5, color: "#6a7a8a", knockbackResist: 0.7, behavior: "charger" }),
  E({ id: "soldadoRR", name: "Red Ribbon Soldier", tier: "grunt", hp: 13, speed: 58, damage: 6, radius: 11, xp: 2, color: "#3a4ad8", knockbackResist: 0, behavior: "ranged", patterns: [{ kind: "shot", cd: 2.4 }] }),
  E({ id: "roboBomba", name: "Bomb Robot", tier: "grunt", hp: 12, speed: 100, damage: 8, radius: 10, xp: 2, color: "#ff3a3a", knockbackResist: 0, behavior: "exploder" }),
  E({ id: "generalPirata", name: "Giant Pirate Robot", tier: "elite", hp: 2100, speed: 60, damage: 19, radius: 28, xp: 80, color: "#4a8a3a", knockbackResist: 0.95, patterns: [{ kind: "dash", cd: 3.5 }, { kind: "laser", cd: 5 }] }),
  E({ id: "a16", name: "Android 16", tier: "elite", hp: 1400, speed: 50, damage: 18, radius: 26, xp: 50, color: "#5a8a3a", knockbackResist: 0.95, patterns: [{ kind: "snipe", cd: 2.5 }] }),
  E({ id: "a18", name: "Android 18", tier: "elite", hp: 900, speed: 95, damage: 13, radius: 20, xp: 50, color: "#f0d870", knockbackResist: 0.85, patterns: [{ kind: "volley", cd: 3 }, { kind: "dash", cd: 5 }] }),
  E({ id: "gero", name: "Dr. Gero", tier: "elite", hp: 1000, speed: 60, damage: 14, radius: 22, xp: 50, color: "#e8e8e8", knockbackResist: 0.9, patterns: [{ kind: "snipe", cd: 2 }] }),
  E({ id: "cellImperfeito", name: "Imperfect Cell", tier: "elite", hp: 1600, speed: 70, damage: 16, radius: 24, xp: 70, color: "#4a8a3a", knockbackResist: 0.9, patterns: [{ kind: "volley", cd: 3.5 }, { kind: "dash", cd: 4.5 }] }),
  E({
    id: "cell",
    name: "Perfect Cell",
    tier: "boss",
    hp: 26500,
    speed: 75,
    damage: 24,
    radius: 30,
    xp: 600,
    color: "#5fd13a",
    knockbackResist: 1,
    patterns: [
      { kind: "volley", cd: 3 },
      { kind: "laser", cd: 4 },
      { kind: "spiral", cd: 7 },
      { kind: "summon", cd: 10 },
      { kind: "dash", cd: 5 },
      { kind: "meteor", cd: 6 },
    ],
  }),

  // Filmes
  E({ id: "roboGete", name: "Big Gete Star Robot", tier: "grunt", hp: 16, speed: 72, damage: 5, radius: 11, xp: 1, color: "#3ad8d8", knockbackResist: 0.1 }),
  E({ id: "roboGeteVoador", name: "Big Gete Star Drone", tier: "grunt", hp: 10, speed: 110, damage: 4, radius: 9, xp: 1, color: "#3a9ad8", knockbackResist: 0 }),
  E({ id: "roboGeteGrande", name: "Metal Guardian", tier: "brute", hp: 90, speed: 44, damage: 11, radius: 20, xp: 6, color: "#3a6a8a", knockbackResist: 0.7, behavior: "charger" }),
  E({ id: "droneAtirador", name: "Gunner Drone", tier: "grunt", hp: 14, speed: 70, damage: 6, radius: 10, xp: 2, color: "#5aff9a", knockbackResist: 0, behavior: "ranged", patterns: [{ kind: "shot", cd: 2.2 }] }),
  E({ id: "minaGete", name: "Big Gete Star Mine", tier: "grunt", hp: 14, speed: 108, damage: 9, radius: 10, xp: 2, color: "#ff5a5a", knockbackResist: 0, behavior: "exploder" }),
  E({ id: "metalCooler", name: "Metal Cooler", tier: "elite", hp: 2600, speed: 70, damage: 20, radius: 25, xp: 90, color: "#c0c8d8", knockbackResist: 0.95, patterns: [{ kind: "laser", cd: 3.5 }, { kind: "dash", cd: 4 }, { kind: "snipe", cd: 2 }] }),
  E({ id: "cooler", name: "Cooler", tier: "elite", hp: 1600, speed: 75, damage: 18, radius: 24, xp: 60, color: "#a83ad8", knockbackResist: 0.9, patterns: [{ kind: "snipe", cd: 1.8 }, { kind: "deathball", cd: 8 }] }),
  E({ id: "zangya", name: "Zangya", tier: "elite", hp: 1100, speed: 100, damage: 14, radius: 20, xp: 60, color: "#ff8a3a", knockbackResist: 0.85, patterns: [{ kind: "volley", cd: 2.6 }] }),
  E({ id: "bojack", name: "Bojack", tier: "elite", hp: 2000, speed: 65, damage: 20, radius: 26, xp: 80, color: "#3aa8a8", knockbackResist: 0.95, patterns: [{ kind: "ring", cd: 4 }, { kind: "dash", cd: 5 }] }),
  E({
    id: "broly",
    name: "Broly",
    tier: "boss",
    hp: 31000,
    speed: 85,
    damage: 28,
    radius: 32,
    xp: 700,
    color: "#5aff5a",
    knockbackResist: 1,
    patterns: [
      { kind: "ring", cd: 3.5 },
      { kind: "meteor", cd: 4.5 },
      { kind: "deathball", cd: 7 },
      { kind: "dash", cd: 4 },
      { kind: "volley", cd: 2.5 },
      { kind: "laser", cd: 4 },
    ],
  }),

  // Saga Majin Boo
  E({ id: "majin", name: "Babidi's Majin", tier: "grunt", hp: 14, speed: 76, damage: 5, radius: 11, xp: 1, color: "#d8a0a0", knockbackResist: 0 }),
  E({ id: "yamu", name: "Yamu", tier: "grunt", hp: 12, speed: 104, damage: 4, radius: 10, xp: 1, color: "#e8c0a0", knockbackResist: 0 }),
  E({ id: "puipui", name: "Pui Pui", tier: "grunt", hp: 20, speed: 84, damage: 6, radius: 11, xp: 2, color: "#c8a0ff", knockbackResist: 0.1 }),
  E({ id: "spopovich", name: "Spopovich", tier: "brute", hp: 110, speed: 46, damage: 12, radius: 20, xp: 6, color: "#a07a5a", knockbackResist: 0.75, behavior: "charger" }),
  E({ id: "majinAtirador", name: "Majin Gunner", tier: "grunt", hp: 17, speed: 66, damage: 7, radius: 11, xp: 2, color: "#7aff7a", knockbackResist: 0, behavior: "ranged", patterns: [{ kind: "shot", cd: 2.1 }] }),
  E({ id: "majinBomba", name: "Majin Kamikaze", tier: "grunt", hp: 16, speed: 112, damage: 10, radius: 10, xp: 2, color: "#ff7ab0", knockbackResist: 0, behavior: "exploder" }),
  E({ id: "buuMaligno", name: "Evil Buu", tier: "elite", hp: 3200, speed: 80, damage: 22, radius: 24, xp: 110, color: "#8a8a9a", knockbackResist: 0.95, patterns: [{ kind: "laser", cd: 3.5 }, { kind: "ring", cd: 4 }, { kind: "dash", cd: 4 }] }),
  E({ id: "yakon", name: "Yakon", tier: "elite", hp: 1800, speed: 80, damage: 18, radius: 26, xp: 70, color: "#3a5a3a", knockbackResist: 0.95, patterns: [{ kind: "dash", cd: 3.5 }] }),
  E({ id: "dabura", name: "Dabura", tier: "elite", hp: 2200, speed: 70, damage: 20, radius: 26, xp: 80, color: "#d83a5a", knockbackResist: 0.95, patterns: [{ kind: "volley", cd: 2.8 }, { kind: "snipe", cd: 2 }] }),
  E({ id: "buu", name: "Majin Buu", tier: "elite", hp: 2800, speed: 60, damage: 20, radius: 28, xp: 100, color: "#ff9ad8", knockbackResist: 0.95, patterns: [{ kind: "ring", cd: 4 }] }),
  E({
    id: "kidbuu",
    name: "Kid Buu",
    tier: "boss",
    hp: 34500,
    speed: 95,
    damage: 30,
    radius: 26,
    xp: 900,
    color: "#ff7ac8",
    knockbackResist: 1,
    patterns: [
      { kind: "spiral", cd: 5 },
      { kind: "dash", cd: 3 },
      { kind: "meteor", cd: 5 },
      { kind: "deathball", cd: 8 },
      { kind: "laser", cd: 3.5 },
      { kind: "summon", cd: 9 },
      { kind: "ring", cd: 4 },
    ],
  }),

  // cenário: caixote destrutível (solta itens)
  E({ id: "caixote", name: "Capsule Corp Crate", tier: "crate", hp: 1, speed: 0, damage: 0, radius: 12, xp: 0, color: "#c89a5a", knockbackResist: 1 }),
];

export const ENEMY_INDEX: Record<string, number> = Object.fromEntries(ENEMY_LIST.map((d, i) => [d.id, i]));
export const enemyById = (id: string) => ENEMY_LIST[ENEMY_INDEX[id]];

/* ---------- sagas ---------- */

export type SagaId = "freeza" | "cell" | "filmes" | "buu";

export interface WaveDef {
  minute: number;
  target: number; // população que o spawner tenta manter
  kinds: string[];
}

export interface SagaDef {
  id: SagaId;
  name: string;
  place: string;
  background: string;
  /** Papéis da horda: a = comum, b = rápido, c = brutamontes, d = comum alternativo,
   *  e = atirador, f = kamikaze. */
  roster: Record<Role, string>;
  elites: string[]; // em ciclo, um a cada ELITE_EVERY
  boss: string;
  mult: number; // HP e dano dos inimigos
  unlock: string;
}

export const SAGAS: Record<SagaId, SagaDef> = {
  freeza: {
    id: "freeza",
    name: "Frieza Saga",
    place: "Namek",
    background: "/zones_backgrounds/namek_8280810415_z.jpg",
    roster: { a: "soldado", b: "saibaman", c: "brutamontes", d: "soldadoElite", e: "soldadoAtirador", f: "saibamanBomba" },
    elites: ["recoome", "burter", "jeice", "ginyu", "reiCold", "recoome", "ginyu", "reiCold", "jeice"],
    boss: "freeza",
    mult: 1,
    unlock: "Starter",
  },
  cell: {
    id: "cell",
    name: "Cell Saga",
    place: "Cell Games",
    background: "/zones_backgrounds/rocks_8280814777_z.jpg",
    roster: { a: "roboRR", b: "celljr", c: "roboPirata", d: "roboSentinela", e: "soldadoRR", f: "roboBomba" },
    elites: ["a16", "a18", "gero", "generalPirata", "cellImperfeito", "a16", "generalPirata", "cellImperfeito", "a18"],
    boss: "cell",
    mult: 1.25,
    unlock: "Clear the Frieza Saga",
  },
  filmes: {
    id: "filmes",
    name: "The Movies",
    place: "West City",
    background: "/zones_backgrounds/desert_8280814265_z.jpg",
    roster: { a: "roboGete", b: "roboGeteVoador", c: "roboGeteGrande", d: "roboGete", e: "droneAtirador", f: "minaGete" },
    elites: ["cooler", "zangya", "bojack", "metalCooler", "cooler", "zangya", "metalCooler", "bojack", "metalCooler"],
    boss: "broly",
    mult: 1.5,
    unlock: "Clear the Cell Saga",
  },
  buu: {
    id: "buu",
    name: "Majin Buu Saga",
    place: "Babidi's Ship",
    background: "/zones_backgrounds/majinbase_8281867064_z.jpg",
    roster: { a: "majin", b: "yamu", c: "spopovich", d: "puipui", e: "majinAtirador", f: "majinBomba" },
    elites: ["yakon", "dabura", "buu", "buuMaligno", "yakon", "dabura", "buuMaligno", "buu", "buuMaligno"],
    boss: "kidbuu",
    mult: 1.8,
    unlock: "Clear The Movies",
  },
};

export const SAGA_ORDER: SagaId[] = ["freeza", "cell", "filmes", "buu"];

export type Role = "a" | "b" | "c" | "d" | "e" | "f";

/** Curva de densidade comum a todas as sagas; os papéis viram ids pela `roster` da saga. */
const WAVE_TEMPLATE: { minute: number; target: number; roles: Role[] }[] = [
  { minute: 0, target: 25, roles: ["a"] },
  { minute: 1, target: 60, roles: ["a", "a", "b"] },
  { minute: 2, target: 100, roles: ["a", "b"] },
  { minute: 3, target: 145, roles: ["a", "b", "c", "e"] },
  { minute: 4, target: 205, roles: ["b", "b", "c", "f"] },
  { minute: 5, target: 270, roles: ["a", "b", "c", "d", "e", "f"] },
  { minute: 7, target: 370, roles: ["d", "b", "c", "c", "e", "f"] },
  { minute: 9, target: 450, roles: ["b", "c", "d", "e", "f", "f"] },
  { minute: 11, target: 540, roles: ["a", "b", "c", "d", "e", "e", "f"] },
  { minute: 13, target: 630, roles: ["d", "b", "c", "c", "e", "f", "f"] },
];

export function sagaWaves(saga: SagaDef): WaveDef[] {
  return WAVE_TEMPLATE.map((w) => ({ minute: w.minute, target: w.target, kinds: w.roles.map((r) => saga.roster[r]) }));
}

export const SAGA_LENGTH = 15 * 60; // s até o chefe

/** HP dos inimigos cresce com o tempo para acompanhar o poder do herói (e acelera no fim). */
export const hpScale = (t: number) => 1 + (t / 60) * 0.2 + (t / 60) ** 2 * 0.006;

export const ELITE_EVERY = 75; // s (em dupla a partir das 7:00)
export const RING_AT = [300, 480, 660]; // enxames que fecham um anel em volta do jogador
export const STAMPEDE_AT = [270, 510, 750]; // debandadas: uma parede de inimigos atravessa a tela

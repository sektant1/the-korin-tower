// "Proteja a Esfera": sprites, andares, inimigos e chefes.
// Os sprites são os GIFs do site (public/assets/dragon-ball-gifs) recortados em volta do
// personagem e regravados como WebP animado em public/assets/sphere-game: os originais têm até
// 320x240 de área quase toda transparente (o golpe), e camadas grandes animando derrubavam o FPS.
// Só ficam os quadros sem o golpe vazando para fora do personagem (o golpe agora é do jogo).
// (ax, ay) é o centro do personagem no recorte e ch a altura dele; face: para onde ele olha
// (1 direita, -1 esquerda, 0 de frente).
import { FLOOR_IMAGES } from "@/lib/tower";

export interface SpriteDef {
  src: string;
  w: number;
  h: number;
  ax: number;
  ay: number;
  ch: number;
  face: 1 | -1 | 0;
}

const sprite = (src: string, w: number, h: number, ax: number, ay: number, ch: number, face: 1 | -1 | 0): SpriteDef => ({ src, w, h, ax, ay, ch, face });

export const SPRITES = {
  cellKick: sprite("/assets/sphere-game/cellKick.webp", 89, 108, 26.5, 54, 108, 1),
  cellMeteo: sprite("/assets/sphere-game/cellMeteo.webp", 119, 106, 36.5, 52.5, 99, 0),
  cellBalls: sprite("/assets/sphere-game/cellBalls.webp", 85, 107, 45, 60, 94, -1),
  android16: sprite("/assets/sphere-game/android16.webp", 64, 84, 32, 43.5, 81, 1),
  android18: sprite("/assets/sphere-game/android18.webp", 63, 107, 31.5, 53.5, 107, -1),
  buuPush: sprite("/assets/sphere-game/buuPush.webp", 66, 84, 33, 42, 84, 1),
  cellPerfect: sprite("/assets/sphere-game/cellPerfect.webp", 106, 162, 53, 80, 159, 0),
  dabura: sprite("/assets/sphere-game/dabura.webp", 88, 109, 38, 53.5, 107, -1),
  freeza: sprite("/assets/sphere-game/freeza.webp", 92, 57, 35, 28, 56, 1),
  buu: sprite("/assets/sphere-game/buu.webp", 77, 116, 34.5, 54.5, 109, 0),
  broly: sprite("/assets/sphere-game/broly.webp", 113, 159, 56.5, 80, 158, 0),
};

/* ---------- inimigos comuns ---------- */

export type MinionKind = "grunt" | "tank" | "shooter" | "dasher";

export interface MinionDef {
  kind: MinionKind;
  sprite: SpriteDef;
  hp: number;
  speed: number; // px/s na onda 1
  height: number; // altura do personagem na tela
  score: number;
}

export const MINION_BASE: Record<MinionKind, Omit<MinionDef, "sprite">> = {
  grunt: { kind: "grunt", hp: 1, speed: 55, height: 104, score: 10 },
  tank: { kind: "tank", hp: 4, speed: 34, height: 140, score: 30 },
  shooter: { kind: "shooter", hp: 2, speed: 60, height: 108, score: 20 },
  dasher: { kind: "dasher", hp: 2, speed: 50, height: 104, score: 20 },
};

const m = (kind: MinionKind, s: SpriteDef): MinionDef => ({ ...MINION_BASE[kind], sprite: s });

/* ---------- chefes ---------- */

export type BossAttack = "volley" | "spiral" | "deathball" | "snipe" | "summon";

export interface BossDef {
  name: string;
  sprite: SpriteDef;
  hp: number;
  height: number;
  color: string; // cor dos golpes e da barra de vida
  attacks: BossAttack[];
  every: number; // s entre golpes
  deathball: string; // nome da esfera gigante
  summon: MinionDef;
  intro: string;
}

export interface StageDef {
  floor: number;
  name: string;
  background: string;
  quota: number; // derrotas para o chefe aparecer
  minions: MinionDef[];
  boss: BossDef;
}

const S = SPRITES;

export const STAGES: StageDef[] = [
  {
    floor: 1,
    name: "KAME HOUSE",
    background: FLOOR_IMAGES[1],
    quota: 14,
    minions: [m("grunt", S.cellKick), m("grunt", S.cellKick), m("tank", S.cellMeteo)],
    boss: {
      name: "CELL PERFEITO",
      sprite: S.cellPerfect,
      hp: 90,
      height: 230,
      color: "#7dff5a",
      attacks: ["volley", "deathball", "volley"],
      every: 2.6,
      deathball: "KAMEHAMEHA DO CELL",
      summon: m("grunt", S.cellKick),
      intro: "Cell quer a esfera para ficar perfeito... de novo.",
    },
  },
  {
    floor: 2,
    name: "TORNEIO DE ARTES MARCIAIS",
    background: FLOOR_IMAGES[2],
    quota: 18,
    minions: [m("shooter", S.android18), m("shooter", S.android16), m("grunt", S.cellKick), m("dasher", S.cellKick)],
    boss: {
      name: "DABURA",
      sprite: S.dabura,
      hp: 130,
      height: 200,
      color: "#ff3355",
      attacks: ["volley", "spiral", "summon"],
      every: 2.3,
      deathball: "BOLA DE FOGO",
      summon: m("shooter", S.android18),
      intro: "O rei dos demônios cuspiu no ringue.",
    },
  },
  {
    floor: 6,
    name: "PLANETA NAMEK",
    background: FLOOR_IMAGES[6],
    quota: 20,
    minions: [m("dasher", S.cellKick), m("shooter", S.cellBalls), m("tank", S.cellMeteo)],
    boss: {
      name: "FREEZA",
      sprite: S.freeza,
      hp: 160,
      height: 150,
      color: "#c070ff",
      attacks: ["snipe", "deathball", "snipe", "volley"],
      every: 2.1,
      deathball: "SUPERNOVA",
      summon: m("dasher", S.cellKick),
      intro: "Freeza mira na esfera com o dedo.",
    },
  },
  {
    floor: 8,
    name: "REINO DOS KAIOSHIN",
    background: FLOOR_IMAGES[8],
    quota: 22,
    minions: [m("dasher", S.buuPush), m("grunt", S.buuPush), m("shooter", S.android16), m("tank", S.cellMeteo)],
    boss: {
      name: "MAJIN BUU",
      sprite: S.buu,
      hp: 200,
      height: 210,
      color: "#ff7ad9",
      attacks: ["spiral", "summon", "volley", "deathball"],
      every: 2,
      deathball: "BOLA DE CHOCOLATE",
      summon: m("dasher", S.buuPush),
      intro: "Buu está com fome. E a esfera parece um doce.",
    },
  },
  {
    floor: 7,
    name: "JOGOS DE CELL",
    background: FLOOR_IMAGES[7],
    quota: 26,
    minions: [m("grunt", S.cellKick), m("shooter", S.android18), m("dasher", S.buuPush), m("tank", S.cellMeteo), m("shooter", S.cellBalls)],
    boss: {
      name: "BROLY",
      sprite: S.broly,
      hp: 280,
      height: 250,
      color: "#5aff5a",
      attacks: ["volley", "spiral", "deathball", "summon", "volley"],
      every: 1.8,
      deathball: "ERASER CANNON",
      summon: m("tank", S.cellMeteo),
      intro: "O Super Saiyajin Lendário chegou.",
    },
  },
];

/* ---------- regras ---------- */

export const RULES = {
  sphereHp: 100,
  senzuHeal: 35,
  // dano na esfera: encostar (por tipo de inimigo) e golpes
  touch: { grunt: 10, dasher: 10, shooter: 10, tank: 20 } as Record<MinionKind, number>,
  hit: { orb: 6, snipe: 8, deathball: 25 },
  kiSegment: 8, // derrotas por carga de KI
  kiMax: 3,
  comboWindow: 1.8, // s para manter o combo
  dropChance: 0.09,
  powerTime: 10, // s de tiro triplo / rajada
};

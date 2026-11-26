// Técnicas (as "armas"). Números base + o que cada nível soma; o comportamento vem de `kind` e é
// executado em sim/techs.ts. Evoluções são técnicas de nível único que tomam o lugar da original.
// Ver GDD §6.
import type { CharId } from "./characters";
import type { PassiveId } from "./passives";

export type BaseTechId =
  | "kamehameha"
  | "rajada"
  | "masenko"
  | "makankosappo"
  | "kienzan"
  | "taiyoken"
  | "barreira"
  | "genkidama"
  | "espada"
  | "bakuhatsuha"
  | "fantasmas"
  | "sokidan"
  | "kikoho"
  | "hellzone"
  | "renzoku"
  | "raio"
  | "rosquinha"
  | "galickHo"
  | "burningAttack"
  | "raioMorte"
  | "mafuba"
  | "dodonpa"
  | "kiai"
  | "lobo"
  | "eraser"
  | "doce"
  | "absorcao"
  | "zanzoken";
export type EvoTechId =
  | "kamehameha10"
  | "rajadaInfinita"
  | "masenkoSupremo"
  | "makankoDuplo"
  | "kienzanTeleguiado"
  | "flashSolar"
  | "auraDivina"
  | "genkiUniversal"
  | "burningSlash"
  | "explosaoPlanetaria"
  | "superFantasmas"
  | "sokidanGalactico"
  | "shinKikoho"
  | "hellzoneSupremo"
  | "chuvaInfinita"
  | "trovaoDivino"
  | "superRosquinha"
  | "galickFinal"
  | "burningStorm"
  | "raioMorteSupremo"
  | "mafubaSupremo"
  | "dodonpaSupremo"
  | "kiaiSupremo"
  | "loboNeo"
  | "meteoroGigante"
  | "doceSupremo"
  | "absorcaoTotal"
  | "zanzokenSupremo";
export type ExclusiveTechId = "socoDinamite" | "espadaKi" | "finalFlash" | "bigBang" | "punhoDragao" | "kameDefinitivo" | "granadaLuz" | "domoCalor" | "socoMilagre";
/** Uniões: duas técnicas base viram uma só e liberam um espaço. */
export type UnionTechId =
  | "paiEFilho"
  | "saraivadaGalick"
  | "kienzanTrovao"
  | "genkiRosquinha"
  | "cercoFantasma"
  | "corteGalactico"
  | "duplaGrou"
  | "loboFantasma"
  | "absorcaoMajin"
  | "omegaBlaster";
export type TechId = BaseTechId | EvoTechId | ExclusiveTechId | UnionTechId;

/** Como a técnica age no mundo (sim/techs.ts). */
export type TechKind =
  | "bolt"
  | "beam"
  | "fan"
  | "lance"
  | "disc"
  | "flash"
  | "aura"
  | "bomb"
  | "slash"
  | "blast"
  | "ghost"
  | "punch"
  | "orbit" // esferas girando em volta do herói (contínuo)
  | "nova" // anel que se expande a partir do herói
  | "converge" // esferas cercam um alvo e se fecham sobre ele
  | "barrage" // rajada de tiros rápidos por um tempo
  | "chain" // raio que salta de inimigo em inimigo
  | "vortex" // redemoinho que puxa e mói a horda
  | "trail"; // imagens residuais que ficam onde o herói passou e ferem quem pisa

export interface TechParams {
  damage: number;
  cooldown: number; // s
  amount: number; // projéteis/feixes por disparo
  area: number; // multiplicador de tamanho
  speed: number; // px/s (projéteis)
  duration: number; // s (feixes, auras, discos, atordoamento)
  pierce: number; // inimigos atravessados (projéteis); 0 = some no primeiro
  hitCd: number; // s até o mesmo golpe acertar o mesmo inimigo de novo
  knockback: number;
}

export interface TechExtra {
  critBonus?: number; // chance de crítico somada
  homing?: number; // força de perseguição (rad/s)
  healOnKill?: number; // HP por inimigo morto pela técnica
  screenStun?: boolean; // Flash Solar: atordoa a tela inteira
  trail?: boolean; // Burning Slash: solta uma bola de fogo para a frente
  pool?: number; // Genki Dama: deixa uma poça de ki por N s
  stunChance?: number;
  stun?: number; // s de atordoamento a cada acerto
  pull?: number; // força com que o redemoinho puxa (px/s)
  finalBlast?: boolean; // o redemoinho explode no fim
  rings?: number; // órbitas (Sokidan Galáctico)
  fireball?: boolean; // projétil vira bola de fogo grande que atravessa (Burning Attack)
  /** Onde mira (feixe, lança, bomba). Padrão: feixe no mais próximo, lança e bomba num aleatório. */
  target?: "nearest" | "random" | "densest" | "strongest" | "facing";
}

export interface TechDef {
  id: TechId;
  kind: TechKind;
  name: string;
  desc: string; // o que a técnica faz (carta de nível 1)
  color: string;
  max: number;
  base: TechParams;
  /** O que cada nível de 2 até max soma (índice 0 = nível 2). */
  levels: { add: Partial<TechParams>; text: string }[];
  extra?: TechExtra;
  /** Técnica base: com ela no máximo e esta passiva, uma Cápsula a evolui em `evolvesTo`. */
  evolvesWith?: PassiveId;
  evolvesTo?: EvoTechId;
  /** Evolução: de qual técnica veio. */
  from?: BaseTechId;
  /** Só este personagem recebe a técnica. */
  owner?: CharId;
  /** União: as duas técnicas (nível 5+) que se fundem nesta. */
  union?: [BaseTechId, BaseTechId];
}

const P = (p: Partial<TechParams>): TechParams => ({ damage: 10, cooldown: 1, amount: 1, area: 1, speed: 0, duration: 0, pierce: 0, hitCd: 0.5, knockback: 60, ...p });
const T = (d: Omit<TechDef, "base"> & { base: Partial<TechParams> }): TechDef => ({ ...d, base: P(d.base) });

export const TECHNIQUES: Record<TechId, TechDef> = {
  /* ---------- base ---------- */
  kamehameha: T({
    id: "kamehameha",
    kind: "beam",
    name: "Kamehameha",
    desc: "A beam at the closest enemy. Pierces everything.",
    color: "#5ad7ff",
    max: 8,
    base: { damage: 18, cooldown: 2.2, duration: 0.35, hitCd: 0.5, knockback: 120 },
    levels: [
      { add: { amount: 1 }, text: "+1 beam (backward)" },
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { cooldown: -0.4 }, text: "-0.4s cooldown" },
      { add: { area: 0.25, duration: 0.15 }, text: "+25% area, longer beam" },
      { add: { damage: 12 }, text: "+12 damage" },
    ],
    evolvesWith: "kaioken",
    evolvesTo: "kamehameha10",
  }),
  rajada: T({
    id: "rajada",
    kind: "bolt",
    name: "Ki Blast",
    desc: "Fires ki blasts at the closest enemy.",
    color: "#ffd21f",
    max: 8,
    base: { damage: 10, cooldown: 1.1, speed: 360, duration: 1.6, knockback: 60 },
    levels: [
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { cooldown: -0.2 }, text: "-0.2s cooldown" },
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { pierce: 1 }, text: "+1 pierce" },
      { add: { damage: 10 }, text: "+10 damage" },
    ],
    evolvesWith: "salaTempo",
    evolvesTo: "rajadaInfinita",
  }),
  masenko: T({
    id: "masenko",
    kind: "fan",
    name: "Masenko",
    desc: "Fires a spread of shots at the closest enemy.",
    color: "#ffef5a",
    max: 8,
    base: { damage: 9, cooldown: 1.0, amount: 2, speed: 440, duration: 1.0, pierce: 1, knockback: 50 },
    levels: [
      { add: { amount: 1 }, text: "+1 shot" },
      { add: { damage: 5 }, text: "+5 damage" },
      { add: { amount: 1 }, text: "+1 shot" },
      { add: { pierce: 1 }, text: "+1 pierce" },
      { add: { amount: 1 }, text: "+1 shot" },
      { add: { damage: 5, cooldown: -0.15 }, text: "+5 damage, lower cooldown" },
      { add: { pierce: 2 }, text: "+2 pierce" },
    ],
    evolvesWith: "potara",
    evolvesTo: "masenkoSupremo",
  }),
  makankosappo: T({
    id: "makankosappo",
    kind: "lance",
    name: "Special Beam Cannon",
    desc: "A thin drilling beam at a random enemy. Pierces everything.",
    color: "#ffb0ff",
    max: 8,
    base: { damage: 30, cooldown: 2.2, duration: 0.25, hitCd: 1, knockback: 20 },
    levels: [
      { add: { damage: 12 }, text: "+12 damage" },
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { cooldown: -0.3 }, text: "-0.3s cooldown" },
      { add: { damage: 15 }, text: "+15 damage" },
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { area: 0.4 }, text: "thicker beam" },
      { add: { damage: 20 }, text: "+20 damage" },
    ],
    extra: { critBonus: 0.1 },
    evolvesWith: "scouter",
    evolvesTo: "makankoDuplo",
  }),
  kienzan: T({
    id: "kienzan",
    kind: "disc",
    name: "Destructo Disc",
    desc: "A cutting disc that flies out and returns, piercing everything.",
    color: "#ffe08a",
    max: 8,
    base: { damage: 14, cooldown: 2.2, speed: 420, duration: 1.4, pierce: 999, hitCd: 0.4, knockback: 30 },
    levels: [
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { amount: 1 }, text: "+1 disc" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { speed: 80 }, text: "faster disc" },
      { add: { amount: 1 }, text: "+1 disc" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { cooldown: -0.4 }, text: "-0.4s cooldown" },
    ],
    evolvesWith: "kiControlado",
    evolvesTo: "kienzanTeleguiado",
  }),
  taiyoken: T({
    id: "taiyoken",
    kind: "flash",
    name: "Solar Flare",
    desc: "A blinding flash that freezes nearby enemies.",
    color: "#fffbd0",
    max: 8,
    base: { damage: 4, cooldown: 5, duration: 1.2, knockback: 0 },
    levels: [
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { duration: 0.4 }, text: "freezes longer" },
      { add: { cooldown: -0.6 }, text: "-0.6s cooldown" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { duration: 0.5 }, text: "freezes longer" },
      { add: { area: 0.3, cooldown: -0.6 }, text: "+30% area, lower cooldown" },
    ],
    evolvesWith: "aguaDivina",
    evolvesTo: "flashSolar",
  }),
  barreira: T({
    id: "barreira",
    kind: "aura",
    name: "Ki Barrier",
    desc: "Damages enemies that get close to you.",
    color: "#7dff7d",
    max: 8,
    base: { damage: 5, cooldown: 0, hitCd: 0.6, knockback: 40 },
    levels: [
      { add: { area: 0.2 }, text: "+20% radius" },
      { add: { damage: 2 }, text: "+2 damage" },
      { add: { hitCd: -0.1 }, text: "hits faster" },
      { add: { area: 0.2 }, text: "+20% radius" },
      { add: { damage: 3 }, text: "+3 damage" },
      { add: { hitCd: -0.1 }, text: "hits faster" },
      { add: { area: 0.2, damage: 3 }, text: "+20% radius, +3 damage" },
    ],
    evolvesWith: "armadura",
    evolvesTo: "auraDivina",
  }),
  genkidama: T({
    id: "genkidama",
    kind: "bomb",
    name: "Spirit Bomb",
    desc: "A ball of energy falls on the horde and explodes.",
    color: "#8fd8ff",
    max: 8,
    base: { damage: 40, cooldown: 6, duration: 0.9, knockback: 160 },
    levels: [
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { cooldown: -0.8 }, text: "-0.8s cooldown" },
      { add: { area: 0.25 }, text: "+25% area" },
      { add: { damage: 30 }, text: "+30 damage" },
      { add: { amount: 1 }, text: "+1 orb" },
    ],
    extra: { pool: 0 },
    evolvesWith: "kaiohBencao",
    evolvesTo: "genkiUniversal",
  }),
  espada: T({
    id: "espada",
    kind: "slash",
    name: "Future Sword",
    desc: "Slashes the closest enemy in a wide arc.",
    color: "#d8e8ff",
    max: 8,
    base: { damage: 14, cooldown: 1.3, amount: 1, duration: 0.18, knockback: 90 },
    levels: [
      { add: { amount: 1 }, text: "also slashes behind" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { area: 0.15 }, text: "+15% reach" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { cooldown: -0.2 }, text: "-0.2s cooldown" },
      { add: { area: 0.2 }, text: "+20% reach" },
      { add: { damage: 10 }, text: "+10 damage" },
    ],
    evolvesWith: "gravidade",
    evolvesTo: "burningSlash",
  }),
  bakuhatsuha: T({
    id: "bakuhatsuha",
    kind: "blast",
    name: "Explosive Wave",
    desc: "Blasts random enemies on screen.",
    color: "#ff8a3a",
    max: 8,
    base: { damage: 16, cooldown: 3, amount: 2, knockback: 90 },
    levels: [
      { add: { amount: 1 }, text: "+1 blast" },
      { add: { area: 0.25 }, text: "+25% area" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { amount: 1 }, text: "+1 blast" },
      { add: { cooldown: -0.5 }, text: "-0.5s cooldown" },
      { add: { amount: 1, damage: 10 }, text: "+1 blast, +10 damage" },
      { add: { area: 0.3 }, text: "+30% area" },
    ],
    evolvesWith: "cauda",
    evolvesTo: "explosaoPlanetaria",
  }),
  fantasmas: T({
    id: "fantasmas",
    kind: "ghost",
    name: "Kamikaze Ghosts",
    desc: "Ghosts chase enemies and explode on contact.",
    color: "#e8f0ff",
    max: 8,
    base: { damage: 22, cooldown: 3.2, amount: 1, area: 1, speed: 150, duration: 5, knockback: 120 },
    levels: [
      { add: { amount: 1 }, text: "+1 ghost" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { area: 0.25 }, text: "bigger explosion" },
      { add: { amount: 1 }, text: "+1 ghost" },
      { add: { speed: 60 }, text: "faster ghosts" },
      { add: { damage: 15 }, text: "+15 damage" },
      { add: { amount: 2 }, text: "+2 ghosts" },
    ],
    evolvesWith: "grandeKaioh",
    evolvesTo: "superFantasmas",
  }),
  sokidan: T({
    id: "sokidan",
    kind: "orbit",
    name: "Spirit Ball",
    desc: "Ki orbs circle around you.",
    color: "#ffcf5a",
    max: 8,
    base: { damage: 9, amount: 2, area: 1, speed: 3, hitCd: 0.45, knockback: 70 },
    levels: [
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { damage: 4 }, text: "+4 damage" },
      { add: { area: 0.2 }, text: "+20% orbit size" },
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { speed: 0.8 }, text: "spin faster" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { amount: 1, area: 0.15 }, text: "+1 orb, bigger orbit" },
    ],
    evolvesWith: "casco",
    evolvesTo: "sokidanGalactico",
  }),
  kikoho: T({
    id: "kikoho",
    kind: "nova",
    name: "Tri-Beam",
    desc: "A shockwave that expands around you.",
    color: "#ffef9a",
    max: 8,
    base: { damage: 24, cooldown: 3.4, area: 1, duration: 0.45, knockback: 260 },
    levels: [
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { area: 0.2 }, text: "+20% reach" },
      { add: { cooldown: -0.4 }, text: "-0.4s cooldown" },
      { add: { damage: 12 }, text: "+12 damage" },
      { add: { area: 0.25 }, text: "+25% reach" },
      { add: { cooldown: -0.5 }, text: "-0.5s cooldown" },
      { add: { damage: 20 }, text: "+20 damage" },
    ],
    evolvesWith: "terceiroOlho",
    evolvesTo: "shinKikoho",
  }),
  hellzone: T({
    id: "hellzone",
    kind: "converge",
    name: "Hellzone Grenade",
    desc: "Orbs surround an enemy, pause, then close in.",
    color: "#ffe85a",
    max: 8,
    base: { damage: 12, cooldown: 3.6, amount: 6, area: 1, speed: 380, duration: 1.4, pierce: 2, knockback: 40 },
    levels: [
      { add: { amount: 2 }, text: "+2 orbs" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { area: 0.2 }, text: "+20% ring size" },
      { add: { amount: 2 }, text: "+2 orbs" },
      { add: { cooldown: -0.6 }, text: "-0.6s cooldown" },
      { add: { damage: 8, pierce: 2 }, text: "+8 damage, +2 pierce" },
      { add: { amount: 4 }, text: "+4 orbs" },
    ],
    evolvesWith: "nuvem",
    evolvesTo: "hellzoneSupremo",
  }),
  renzoku: T({
    id: "renzoku",
    kind: "barrage",
    name: "Energy Barrage",
    desc: "Unleashes a barrage of shots at random enemies.",
    color: "#ffd84a",
    max: 8,
    base: { damage: 6, cooldown: 4.2, amount: 1, speed: 560, duration: 1.2, knockback: 30 },
    levels: [
      { add: { duration: 0.4 }, text: "longer barrage" },
      { add: { damage: 3 }, text: "+3 damage" },
      { add: { amount: 1 }, text: "+1 shot per volley" },
      { add: { cooldown: -0.7 }, text: "-0.7s cooldown" },
      { add: { damage: 4 }, text: "+4 damage" },
      { add: { duration: 0.6 }, text: "longer barrage" },
      { add: { amount: 1, pierce: 1 }, text: "+1 shot, +1 pierce" },
    ],
    evolvesWith: "nyoibo",
    evolvesTo: "chuvaInfinita",
  }),
  raio: T({
    id: "raio",
    kind: "chain",
    name: "Kai Lightning",
    desc: "Lightning that jumps from enemy to enemy.",
    color: "#9ad8ff",
    max: 8,
    base: { damage: 16, cooldown: 1.9, amount: 1, area: 1, pierce: 3, knockback: 20 },
    levels: [
      { add: { pierce: 1 }, text: "+1 jump" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { amount: 1 }, text: "+1 bolt" },
      { add: { pierce: 2 }, text: "+2 jumps" },
      { add: { cooldown: -0.4 }, text: "-0.4s cooldown" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { amount: 1, pierce: 2 }, text: "+1 bolt, +2 jumps" },
    ],
    evolvesWith: "radar",
    evolvesTo: "trovaoDivino",
  }),
  rosquinha: T({
    id: "rosquinha",
    kind: "vortex",
    name: "Galactic Donut",
    desc: "A ring of ki that drags nearby enemies into its center.",
    color: "#ff9ae8",
    max: 8,
    base: { damage: 5, cooldown: 6, amount: 1, area: 1, duration: 2.4, hitCd: 0.3, knockback: 0 },
    levels: [
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { damage: 3 }, text: "+3 damage" },
      { add: { duration: 0.6 }, text: "lasts longer" },
      { add: { cooldown: -0.8 }, text: "-0.8s cooldown" },
      { add: { amount: 1 }, text: "+1 ring" },
      { add: { damage: 4, area: 0.2 }, text: "+4 damage, +20% area" },
      { add: { duration: 0.8, damage: 4 }, text: "lasts longer, +4 damage" },
    ],
    extra: { pull: 90 },
    evolvesWith: "marcaMajin",
    evolvesTo: "superRosquinha",
  }),
  galickHo: T({
    id: "galickHo",
    kind: "beam",
    name: "Galick Gun",
    desc: "A slow, heavy beam at the closest enemy.",
    color: "#b05aff",
    max: 8,
    base: { damage: 30, cooldown: 3.4, duration: 0.5, area: 1.1, hitCd: 0.5, knockback: 160 },
    levels: [
      { add: { damage: 12 }, text: "+12 damage" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { cooldown: -0.5 }, text: "-0.5s cooldown" },
      { add: { amount: 1 }, text: "+1 beam (backward)" },
      { add: { damage: 16 }, text: "+16 damage" },
      { add: { duration: 0.25 }, text: "longer beam" },
      { add: { damage: 24, area: 0.2 }, text: "+24 damage, +20% area" },
    ],
    evolvesWith: "orgulho",
    evolvesTo: "galickFinal",
  }),
  burningAttack: T({
    id: "burningAttack",
    kind: "bolt",
    name: "Burning Attack",
    desc: "A big fireball that burns through the horde.",
    color: "#ff7a1a",
    max: 8,
    base: { damage: 24, cooldown: 2.4, speed: 300, duration: 2, area: 1, pierce: 999, hitCd: 0.5, knockback: 90 },
    levels: [
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { area: 0.25 }, text: "+25% fireball size" },
      { add: { amount: 1 }, text: "+1 fireball" },
      { add: { cooldown: -0.4 }, text: "-0.4s cooldown" },
      { add: { damage: 14 }, text: "+14 damage" },
      { add: { amount: 1 }, text: "+1 fireball" },
      { add: { damage: 20, area: 0.25 }, text: "+20 damage, bigger fireball" },
    ],
    extra: { fireball: true },
    evolvesWith: "pesos",
    evolvesTo: "burningStorm",
  }),
  raioMorte: T({
    id: "raioMorte",
    kind: "lance",
    name: "Death Beam",
    desc: "Frieza's finger beam: fast, thin shots at random enemies.",
    color: "#ff4ad8",
    max: 8,
    base: { damage: 14, cooldown: 0.9, amount: 1, duration: 0.15, area: 0.6, hitCd: 0.3, knockback: 10 },
    levels: [
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { cooldown: -0.15 }, text: "fires faster" },
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { damage: 12, cooldown: -0.15 }, text: "+12 damage, faster" },
    ],
    extra: { critBonus: 0.15 },
    evolvesWith: "poseGinyu",
    evolvesTo: "raioMorteSupremo",
  }),
  mafuba: T({
    id: "mafuba",
    kind: "vortex",
    name: "Evil Containment Wave",
    desc: "Traps enemies in a whirlwind and freezes them.",
    color: "#7affc8",
    max: 8,
    base: { damage: 4, cooldown: 7, amount: 1, area: 1.1, duration: 2, hitCd: 0.35, knockback: 0 },
    levels: [
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { duration: 0.5 }, text: "traps longer" },
      { add: { damage: 4 }, text: "+4 damage" },
      { add: { cooldown: -1 }, text: "-1s cooldown" },
      { add: { amount: 1 }, text: "+1 whirlwind" },
      { add: { area: 0.25 }, text: "+25% area" },
      { add: { damage: 6, duration: 0.5 }, text: "+6 damage, lasts longer" },
    ],
    extra: { pull: 60, stun: 0.5 },
    evolvesWith: "jarro",
    evolvesTo: "mafubaSupremo",
  }),

  dodonpa: T({
    id: "dodonpa",
    kind: "lance",
    name: "Dodon Ray",
    desc: "Tien's finger beam: a quick, precise shot at the closest enemy.",
    color: "#ffe85a",
    max: 8,
    base: { damage: 16, cooldown: 1.1, amount: 1, duration: 0.15, area: 0.7, hitCd: 0.3, knockback: 30 },
    levels: [
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { cooldown: -0.15 }, text: "fires faster" },
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { cooldown: -0.15 }, text: "fires faster" },
      { add: { amount: 1 }, text: "+1 beam" },
      { add: { damage: 12, area: 0.3 }, text: "+12 damage, thicker beam" },
    ],
    extra: { critBonus: 0.1, target: "nearest" },
    evolvesWith: "escolaGrou",
    evolvesTo: "dodonpaSupremo",
  }),
  kiai: T({
    id: "kiai",
    kind: "nova",
    name: "Kiai",
    desc: "An invisible shout that throws back everything close to you.",
    color: "#e8f4ff",
    max: 8,
    base: { damage: 6, cooldown: 1.8, area: 0.6, duration: 0.3, knockback: 380 },
    levels: [
      { add: { area: 0.1 }, text: "+10% reach" },
      { add: { damage: 4 }, text: "+4 damage" },
      { add: { cooldown: -0.25 }, text: "-0.25s cooldown" },
      { add: { knockback: 80 }, text: "pushes harder" },
      { add: { area: 0.15 }, text: "+15% reach" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { cooldown: -0.3, area: 0.1 }, text: "lower cooldown, +10% reach" },
    ],
    evolvesWith: "telecinese",
    evolvesTo: "kiaiSupremo",
  }),
  lobo: T({
    id: "lobo",
    kind: "punch",
    name: "Wolf Fang Fist",
    desc: "Yamcha's flurry: very fast punches at the closest enemy.",
    color: "#9ad0ff",
    max: 8,
    base: { damage: 9, cooldown: 0.45, area: 1.1, duration: 0.12, knockback: 70 },
    levels: [
      { add: { damage: 3 }, text: "+3 damage" },
      { add: { area: 0.15 }, text: "+15% reach" },
      { add: { cooldown: -0.06 }, text: "faster punches" },
      { add: { amount: 1 }, text: "also punches behind" },
      { add: { damage: 5 }, text: "+5 damage" },
      { add: { cooldown: -0.06 }, text: "faster punches" },
      { add: { damage: 8, area: 0.2 }, text: "+8 damage, +20% reach" },
    ],
    evolvesWith: "lenco",
    evolvesTo: "loboNeo",
  }),
  eraser: T({
    id: "eraser",
    kind: "bomb",
    name: "Eraser Cannon",
    desc: "Broly's green orb lands on the thickest part of the horde.",
    color: "#7aff5a",
    max: 8,
    base: { damage: 50, cooldown: 5.5, amount: 1, area: 1.3, duration: 1.1, knockback: 180 },
    levels: [
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { cooldown: -0.7 }, text: "-0.7s cooldown" },
      { add: { damage: 25 }, text: "+25 damage" },
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { area: 0.25 }, text: "+25% area" },
      { add: { damage: 40, cooldown: -0.6 }, text: "+40 damage, lower cooldown" },
    ],
    extra: { target: "densest" },
    evolvesWith: "coroa",
    evolvesTo: "meteoroGigante",
  }),
  doce: T({
    id: "doce",
    kind: "bolt",
    name: "Candy Beam",
    desc: "Majin Buu's slow, homing ray. It hunts enemies down on its own.",
    color: "#ff8ad8",
    max: 8,
    base: { damage: 14, cooldown: 1.6, amount: 1, area: 1.2, speed: 220, duration: 3, pierce: 0, hitCd: 0.5, knockback: 40 },
    levels: [
      { add: { amount: 1 }, text: "+1 ray" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { pierce: 1 }, text: "+1 pierce" },
      { add: { amount: 1 }, text: "+1 ray" },
      { add: { cooldown: -0.3 }, text: "-0.3s cooldown" },
      { add: { damage: 8, speed: 60 }, text: "+8 damage, faster rays" },
      { add: { amount: 1, pierce: 1 }, text: "+1 ray, +1 pierce" },
    ],
    extra: { homing: 4 },
    evolvesWith: "chocolate",
    evolvesTo: "doceSupremo",
  }),
  absorcao: T({
    id: "absorcao",
    kind: "aura",
    name: "Energy Absorption",
    desc: "An android's palms drain enemies close to you and heal you on kills.",
    color: "#ff5a5a",
    max: 8,
    base: { damage: 3, area: 0.8, hitCd: 0.5, knockback: 20 },
    levels: [
      { add: { damage: 2 }, text: "+2 damage" },
      { add: { area: 0.15 }, text: "+15% radius" },
      { add: { hitCd: -0.08 }, text: "drains faster" },
      { add: { damage: 2 }, text: "+2 damage" },
      { add: { area: 0.15 }, text: "+15% radius" },
      { add: { hitCd: -0.08 }, text: "drains faster" },
      { add: { damage: 4, area: 0.15 }, text: "+4 damage, +15% radius" },
    ],
    extra: { healOnKill: 0.08 },
    evolvesWith: "chipGero",
    evolvesTo: "absorcaoTotal",
  }),
  zanzoken: T({
    id: "zanzoken",
    kind: "trail",
    name: "Afterimage",
    desc: "You move so fast you leave afterimages behind. Enemies that touch them get hurt.",
    color: "#c8b0ff",
    max: 8,
    base: { damage: 8, cooldown: 0.5, area: 1, duration: 1.6, hitCd: 0.4, knockback: 30 },
    levels: [
      { add: { duration: 0.4 }, text: "afterimages last longer" },
      { add: { damage: 4 }, text: "+4 damage" },
      { add: { area: 0.2 }, text: "+20% size" },
      { add: { cooldown: -0.1 }, text: "more afterimages" },
      { add: { damage: 5 }, text: "+5 damage" },
      { add: { duration: 0.6 }, text: "afterimages last longer" },
      { add: { damage: 8, area: 0.2 }, text: "+8 damage, +20% size" },
    ],
    evolvesWith: "torreKorin",
    evolvesTo: "zanzokenSupremo",
  }),

  /* ---------- evoluções ---------- */
  kamehameha10: T({
    id: "kamehameha10",
    kind: "beam",
    from: "kamehameha",
    name: "x10 Kamehameha",
    desc: "A wide, sustained beam in four directions.",
    color: "#ff5a7a",
    max: 1,
    base: { damage: 34, cooldown: 2.2, amount: 4, area: 1.7, duration: 1.4, hitCd: 0.25, knockback: 160 },
    levels: [],
  }),
  rajadaInfinita: T({
    id: "rajadaInfinita",
    kind: "bolt",
    from: "rajada",
    name: "Infinite Ki Blast",
    desc: "A nonstop stream of piercing ki blasts.",
    color: "#ffe85a",
    max: 1,
    base: { damage: 22, cooldown: 0.12, amount: 1, speed: 520, duration: 1.4, pierce: 2, knockback: 40 },
    levels: [],
  }),
  masenkoSupremo: T({
    id: "masenkoSupremo",
    kind: "fan",
    from: "masenko",
    name: "Super Masenko",
    desc: "A huge spread that pierces the horde.",
    color: "#fff27a",
    max: 1,
    base: { damage: 22, cooldown: 0.7, amount: 7, area: 1.4, speed: 520, duration: 1.2, pierce: 8, knockback: 70 },
    levels: [],
  }),
  makankoDuplo: T({
    id: "makankoDuplo",
    kind: "lance",
    from: "makankosappo",
    name: "Twin Beam Cannon",
    desc: "Twin beams that always crit.",
    color: "#ff7aff",
    max: 1,
    base: { damage: 90, cooldown: 1.2, amount: 4, area: 1.6, duration: 0.3, hitCd: 0.6, knockback: 30 },
    levels: [],
    extra: { critBonus: 1 },
  }),
  kienzanTeleguiado: T({
    id: "kienzanTeleguiado",
    kind: "disc",
    from: "kienzan",
    name: "Homing Destructo Disc",
    desc: "Discs that hunt enemies on their own.",
    color: "#fff0b0",
    max: 1,
    base: { damage: 36, cooldown: 1.6, amount: 4, area: 1.3, speed: 520, duration: 3, pierce: 999, hitCd: 0.3, knockback: 40 },
    levels: [],
    extra: { homing: 5 },
  }),
  flashSolar: T({
    id: "flashSolar",
    kind: "flash",
    from: "taiyoken",
    name: "Total Solar Flare",
    desc: "Freezes every enemy on screen for 3s.",
    color: "#ffffff",
    max: 1,
    base: { damage: 30, cooldown: 9, duration: 3, area: 2, knockback: 0 },
    levels: [],
    extra: { screenStun: true },
  }),
  auraDivina: T({
    id: "auraDivina",
    kind: "aura",
    from: "barreira",
    name: "Divine Aura",
    desc: "A huge aura that heals you for every kill.",
    color: "#ffd8ff",
    max: 1,
    base: { damage: 16, area: 2, hitCd: 0.3, knockback: 70 },
    levels: [],
    extra: { healOnKill: 0.5 },
  }),
  genkiUniversal: T({
    id: "genkiUniversal",
    kind: "bomb",
    from: "genkidama",
    name: "Universal Spirit Bomb",
    desc: "Colossal bombs that leave burning ki on the ground.",
    color: "#5ab8ff",
    max: 1,
    base: { damage: 140, cooldown: 4.5, amount: 3, area: 2, duration: 0.8, knockback: 220, hitCd: 0.5 },
    levels: [],
    extra: { pool: 3 },
  }),
  burningSlash: T({
    id: "burningSlash",
    kind: "slash",
    from: "espada",
    name: "Burning Slash",
    desc: "Wide slashes on both sides, plus a fireball forward.",
    color: "#ffb347",
    max: 1,
    base: { damage: 48, cooldown: 0.9, amount: 2, area: 1.6, duration: 0.2, speed: 380, knockback: 140 },
    levels: [],
    extra: { trail: true },
  }),
  explosaoPlanetaria: T({
    id: "explosaoPlanetaria",
    kind: "blast",
    from: "bakuhatsuha",
    name: "Planet Burst",
    desc: "Giant explosions all over the screen.",
    color: "#ff5a2a",
    max: 1,
    base: { damage: 60, cooldown: 1.8, amount: 7, area: 1.9, knockback: 140 },
    levels: [],
  }),
  superFantasmas: T({
    id: "superFantasmas",
    kind: "ghost",
    from: "fantasmas",
    name: "Ghost Army",
    desc: "A swarm of fast, explosive ghosts.",
    color: "#c8d8ff",
    max: 1,
    base: { damage: 70, cooldown: 2, amount: 6, area: 1.8, speed: 240, duration: 6, knockback: 160 },
    levels: [],
  }),
  sokidanGalactico: T({
    id: "sokidanGalactico",
    kind: "orbit",
    from: "sokidan",
    name: "Galactic Spirit Ball",
    desc: "Two rings of huge orbs. Heals you on kills.",
    color: "#ffb02a",
    max: 1,
    base: { damage: 30, amount: 6, area: 1.6, speed: 4.2, hitCd: 0.3, knockback: 110 },
    levels: [],
    extra: { rings: 2, healOnKill: 0.2 },
  }),
  shinKikoho: T({
    id: "shinKikoho",
    kind: "nova",
    from: "kikoho",
    name: "Neo Tri-Beam",
    desc: "A giant shockwave that stuns everything it hits.",
    color: "#fff6c0",
    max: 1,
    base: { damage: 110, cooldown: 2.2, area: 2.3, duration: 0.6, knockback: 340 },
    levels: [],
    extra: { stun: 1.2 },
  }),
  hellzoneSupremo: T({
    id: "hellzoneSupremo",
    kind: "converge",
    from: "hellzone",
    name: "Hellzone Inferno",
    desc: "Three rings of orbs at once.",
    color: "#fff27a",
    max: 1,
    base: { damage: 36, cooldown: 2.2, amount: 3, area: 1.5, speed: 460, duration: 1.4, pierce: 6, knockback: 60 },
    levels: [],
  }),
  chuvaInfinita: T({
    id: "chuvaInfinita",
    kind: "barrage",
    from: "renzoku",
    name: "Endless Barrage",
    desc: "A near-endless barrage of piercing shots.",
    color: "#ffe14a",
    max: 1,
    base: { damage: 16, cooldown: 1.2, amount: 3, speed: 640, duration: 3.5, pierce: 3, knockback: 40 },
    levels: [],
  }),
  trovaoDivino: T({
    id: "trovaoDivino",
    kind: "chain",
    from: "raio",
    name: "Divine Thunder",
    desc: "Chain lightning that stuns.",
    color: "#d0f0ff",
    max: 1,
    base: { damage: 46, cooldown: 1.1, amount: 4, area: 1.5, pierce: 9, knockback: 30 },
    levels: [],
    extra: { stun: 0.6 },
  }),
  superRosquinha: T({
    id: "superRosquinha",
    kind: "vortex",
    from: "rosquinha",
    name: "Super Galactic Donut",
    desc: "Huge whirlwinds that explode when they end.",
    color: "#ff6ad8",
    max: 1,
    base: { damage: 16, cooldown: 4.5, amount: 2, area: 1.8, duration: 3, hitCd: 0.25, knockback: 200 },
    levels: [],
    extra: { pull: 150, finalBlast: true },
  }),
  galickFinal: T({
    id: "galickFinal",
    kind: "beam",
    from: "galickHo",
    name: "Final Galick Gun",
    desc: "Colossal beams in both directions.",
    color: "#d07aff",
    max: 1,
    base: { damage: 95, cooldown: 2.4, amount: 2, area: 2.2, duration: 1, hitCd: 0.3, knockback: 220 },
    levels: [],
  }),
  burningStorm: T({
    id: "burningStorm",
    kind: "bolt",
    from: "burningAttack",
    name: "Burning Storm",
    desc: "Rains huge fireballs on the horde.",
    color: "#ffb02a",
    max: 1,
    base: { damage: 70, cooldown: 1.2, amount: 4, area: 1.8, speed: 360, duration: 2.2, pierce: 999, hitCd: 0.4, knockback: 140 },
    levels: [],
    extra: { fireball: true },
  }),
  raioMorteSupremo: T({
    id: "raioMorteSupremo",
    kind: "lance",
    from: "raioMorte",
    name: "Death Beam Barrage",
    desc: "A machine gun of death beams.",
    color: "#ff2ad8",
    max: 1,
    base: { damage: 48, cooldown: 0.35, amount: 3, duration: 0.15, area: 0.9, hitCd: 0.2, knockback: 20 },
    levels: [],
    extra: { critBonus: 0.35 },
  }),
  mafubaSupremo: T({
    id: "mafubaSupremo",
    kind: "vortex",
    from: "mafuba",
    name: "Master Containment Wave",
    desc: "Huge whirlwinds that freeze and crush the horde.",
    color: "#3affb0",
    max: 1,
    base: { damage: 14, cooldown: 4, amount: 3, area: 1.9, duration: 3, hitCd: 0.25, knockback: 160 },
    levels: [],
    extra: { pull: 120, stun: 1.2, finalBlast: true },
  }),

  dodonpaSupremo: T({
    id: "dodonpaSupremo",
    kind: "lance",
    from: "dodonpa",
    name: "Super Dodon Ray",
    desc: "Rapid triple finger beams that crit often.",
    color: "#fff27a",
    max: 1,
    base: { damage: 70, cooldown: 0.6, amount: 3, duration: 0.18, area: 1.3, hitCd: 0.25, knockback: 50 },
    levels: [],
    extra: { critBonus: 0.3, target: "nearest" },
  }),
  kiaiSupremo: T({
    id: "kiaiSupremo",
    kind: "nova",
    from: "kiai",
    name: "Psychic Burst",
    desc: "A telekinetic blast that flings and stuns everything around you.",
    color: "#ffffff",
    max: 1,
    base: { damage: 40, cooldown: 1.2, area: 1.2, duration: 0.35, knockback: 460 },
    levels: [],
    extra: { stun: 0.8 },
  }),
  loboNeo: T({
    id: "loboNeo",
    kind: "punch",
    from: "lobo",
    name: "Neo Wolf Fang Fist",
    desc: "A howling storm of punches on both sides.",
    color: "#5ab0ff",
    max: 1,
    base: { damage: 46, cooldown: 0.3, amount: 2, area: 2, duration: 0.12, knockback: 140 },
    levels: [],
    extra: { critBonus: 0.15 },
  }),
  meteoroGigante: T({
    id: "meteoroGigante",
    kind: "bomb",
    from: "eraser",
    name: "Gigantic Meteor",
    desc: "Huge meteors crush the horde and leave burning ki behind.",
    color: "#5aff3a",
    max: 1,
    base: { damage: 190, cooldown: 3.8, amount: 2, area: 2.4, duration: 1, knockback: 260, hitCd: 0.5 },
    levels: [],
    extra: { target: "densest", pool: 2.5 },
  }),
  doceSupremo: T({
    id: "doceSupremo",
    kind: "bolt",
    from: "doce",
    name: "Chocolate Storm",
    desc: "A swarm of homing rays. Every kill heals you a little.",
    color: "#ff5ac0",
    max: 1,
    base: { damage: 42, cooldown: 0.9, amount: 6, area: 1.5, speed: 320, duration: 3.5, pierce: 2, hitCd: 0.4, knockback: 60 },
    levels: [],
    extra: { homing: 5, healOnKill: 0.15 },
  }),
  absorcaoTotal: T({
    id: "absorcaoTotal",
    kind: "aura",
    from: "absorcao",
    name: "Infinite Energy",
    desc: "A wide drain field. Kills heal you a lot.",
    color: "#ff2a4a",
    max: 1,
    base: { damage: 15, area: 1.7, hitCd: 0.25, knockback: 40 },
    levels: [],
    extra: { healOnKill: 0.6 },
  }),
  zanzokenSupremo: T({
    id: "zanzokenSupremo",
    kind: "trail",
    from: "zanzoken",
    name: "Afterimage Army",
    desc: "A constant line of big afterimages that stun what they touch.",
    color: "#a080ff",
    max: 1,
    base: { damage: 32, cooldown: 0.15, area: 1.6, duration: 2.6, hitCd: 0.3, knockback: 60 },
    levels: [],
    extra: { stun: 0.4 },
  }),

  /* ---------- exclusivas ---------- */
  socoDinamite: T({
    id: "socoDinamite",
    kind: "punch",
    owner: "hercule",
    name: "Dynamite Punch",
    desc: "A short punch. Weak, but he's the Champ!",
    color: "#ff6a3a",
    max: 8,
    base: { damage: 12, cooldown: 0.7, area: 1.25, duration: 0.15, knockback: 150 },
    levels: [
      { add: { damage: 4 }, text: "+4 damage" },
      { add: { area: 0.2 }, text: "+20% reach" },
      { add: { cooldown: -0.12 }, text: "faster punches" },
      { add: { damage: 6 }, text: "+6 damage" },
      { add: { amount: 1 }, text: "also punches behind" },
      { add: { area: 0.3 }, text: "+30% reach" },
      { add: { damage: 10 }, text: "+10 damage" },
    ],
  }),
  espadaKi: T({
    id: "espadaKi",
    kind: "slash",
    owner: "vegetto",
    name: "Spirit Sword",
    desc: "A ki blade that slashes both sides.",
    color: "#7af0ff",
    max: 8,
    base: { damage: 22, cooldown: 1.0, amount: 2, area: 1.2, duration: 0.18, knockback: 110 },
    levels: [
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { area: 0.15 }, text: "+15% reach" },
      { add: { cooldown: -0.15 }, text: "faster slashes" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { area: 0.2 }, text: "+20% reach" },
      { add: { cooldown: -0.15 }, text: "faster slashes" },
      { add: { damage: 16 }, text: "+16 damage" },
    ],
  }),
  finalFlash: T({
    id: "finalFlash",
    kind: "beam",
    owner: "vegeta",
    name: "Final Flash",
    desc: "A giant beam where you face. Long cooldown.",
    color: "#ffe14a",
    max: 8,
    base: { damage: 60, cooldown: 7, amount: 1, area: 2, duration: 0.9, hitCd: 0.3, knockback: 220 },
    levels: [
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { cooldown: -0.8 }, text: "-0.8s cooldown" },
      { add: { area: 0.3 }, text: "+30% area" },
      { add: { damage: 30 }, text: "+30 damage" },
      { add: { duration: 0.4 }, text: "beam lasts longer" },
      { add: { cooldown: -1 }, text: "-1s cooldown" },
      { add: { damage: 40, area: 0.3 }, text: "+40 damage, +30% area" },
    ],
    extra: { target: "facing" },
  }),
  bigBang: T({
    id: "bigBang",
    kind: "bomb",
    owner: "vegetto",
    name: "Big Bang Attack",
    desc: "Explodes on the toughest enemy on screen.",
    color: "#7ab8ff",
    max: 8,
    base: { damage: 70, cooldown: 5, amount: 1, area: 1.2, duration: 0.5, knockback: 200 },
    levels: [
      { add: { damage: 25 }, text: "+25 damage" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { cooldown: -0.6 }, text: "-0.6s cooldown" },
      { add: { amount: 1 }, text: "+1 orb" },
      { add: { damage: 35 }, text: "+35 damage" },
      { add: { area: 0.3 }, text: "+30% area" },
      { add: { amount: 1, damage: 40 }, text: "+1 orb, +40 damage" },
    ],
    extra: { target: "strongest" },
  }),

  punhoDragao: T({
    id: "punhoDragao",
    kind: "beam",
    owner: "goku",
    name: "Dragon Fist",
    desc: "Goku dashes a golden dragon where you face. Huge damage, long cooldown.",
    color: "#ffc21f",
    max: 8,
    base: { damage: 55, cooldown: 4.5, amount: 1, area: 1.5, duration: 0.6, hitCd: 0.3, knockback: 260 },
    levels: [
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { cooldown: -0.5 }, text: "-0.5s cooldown" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { damage: 25 }, text: "+25 damage" },
      { add: { duration: 0.3 }, text: "dragon lasts longer" },
      { add: { cooldown: -0.7 }, text: "-0.7s cooldown" },
      { add: { damage: 40, area: 0.3 }, text: "+40 damage, +30% area" },
    ],
    extra: { target: "facing" },
  }),
  kameDefinitivo: T({
    id: "kameDefinitivo",
    kind: "beam",
    owner: "gohan",
    name: "Ultimate Kamehameha",
    desc: "A huge beam at the closest enemy, fired with all of Gohan's power.",
    color: "#8ae0ff",
    max: 8,
    base: { damage: 40, cooldown: 3.8, amount: 1, area: 1.4, duration: 0.8, hitCd: 0.35, knockback: 200 },
    levels: [
      { add: { damage: 15 }, text: "+15 damage" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { cooldown: -0.5 }, text: "-0.5s cooldown" },
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { amount: 1 }, text: "+1 beam (backward)" },
      { add: { duration: 0.3 }, text: "beam lasts longer" },
      { add: { damage: 30, area: 0.25 }, text: "+30 damage, +25% area" },
    ],
    extra: { target: "nearest" },
  }),
  granadaLuz: T({
    id: "granadaLuz",
    kind: "bomb",
    owner: "piccolo",
    name: "Light Grenade",
    desc: "A dense ball of ki that bursts on the thickest part of the horde.",
    color: "#c8ff7a",
    max: 8,
    base: { damage: 60, cooldown: 4.8, amount: 1, area: 1.4, duration: 0.7, knockback: 200 },
    levels: [
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { area: 0.2 }, text: "+20% area" },
      { add: { cooldown: -0.6 }, text: "-0.6s cooldown" },
      { add: { damage: 25 }, text: "+25 damage" },
      { add: { amount: 1 }, text: "+1 grenade" },
      { add: { area: 0.25 }, text: "+25% area" },
      { add: { damage: 40 }, text: "+40 damage" },
    ],
    extra: { target: "densest" },
  }),
  domoCalor: T({
    id: "domoCalor",
    kind: "nova",
    owner: "trunks",
    name: "Heat Dome Attack",
    desc: "A dome of fire erupts around you.",
    color: "#ffb04a",
    max: 8,
    base: { damage: 45, cooldown: 5, area: 1.5, duration: 0.6, knockback: 300 },
    levels: [
      { add: { damage: 15 }, text: "+15 damage" },
      { add: { area: 0.15 }, text: "+15% reach" },
      { add: { cooldown: -0.6 }, text: "-0.6s cooldown" },
      { add: { damage: 20 }, text: "+20 damage" },
      { add: { area: 0.2 }, text: "+20% reach" },
      { add: { cooldown: -0.7 }, text: "-0.7s cooldown" },
      { add: { damage: 35 }, text: "+35 damage" },
    ],
  }),
  socoMilagre: T({
    id: "socoMilagre",
    kind: "punch",
    owner: "gotenks",
    name: "Miracle Super Punch",
    desc: "A showy haymaker that sends enemies flying.",
    color: "#ffd84a",
    max: 8,
    base: { damage: 26, cooldown: 1.1, area: 1.3, duration: 0.15, knockback: 260 },
    levels: [
      { add: { damage: 8 }, text: "+8 damage" },
      { add: { area: 0.2 }, text: "+20% reach" },
      { add: { cooldown: -0.15 }, text: "faster punches" },
      { add: { damage: 10 }, text: "+10 damage" },
      { add: { amount: 1 }, text: "also punches behind" },
      { add: { area: 0.25 }, text: "+25% reach" },
      { add: { damage: 16 }, text: "+16 damage" },
    ],
  }),

  /* ---------- uniões ---------- */
  paiEFilho: T({
    id: "paiEFilho",
    kind: "beam",
    union: ["kamehameha", "masenko"],
    name: "Father-Son Kamehameha",
    desc: "Two giant, sustained beams: forward and back.",
    color: "#7af0ff",
    max: 1,
    base: { damage: 55, cooldown: 1.8, amount: 2, area: 2.1, duration: 1.4, hitCd: 0.25, knockback: 180 },
    levels: [],
  }),
  saraivadaGalick: T({
    id: "saraivadaGalick",
    kind: "barrage",
    union: ["rajada", "renzoku"],
    name: "Galick Barrage",
    desc: "A storm of piercing ki blasts.",
    color: "#c87aff",
    max: 1,
    base: { damage: 20, cooldown: 1.5, amount: 3, speed: 620, duration: 3, pierce: 3, knockback: 50 },
    levels: [],
  }),
  kienzanTrovao: T({
    id: "kienzanTrovao",
    kind: "disc",
    union: ["kienzan", "raio"],
    name: "Thunder Disc",
    desc: "Homing electric discs that stun what they cut.",
    color: "#b0e8ff",
    max: 1,
    base: { damage: 42, cooldown: 1.5, amount: 5, area: 1.4, speed: 540, duration: 3, pierce: 999, hitCd: 0.3, knockback: 40 },
    levels: [],
    extra: { homing: 5, stun: 0.5 },
  }),
  genkiRosquinha: T({
    id: "genkiRosquinha",
    kind: "vortex",
    union: ["genkidama", "rosquinha"],
    name: "Spirit Donut",
    desc: "Colossal whirlwinds that suck in the horde, then explode.",
    color: "#8fb8ff",
    max: 1,
    base: { damage: 22, cooldown: 4, amount: 2, area: 2.3, duration: 2.6, hitCd: 0.25, knockback: 240 },
    levels: [],
    extra: { pull: 170, finalBlast: true },
  }),
  cercoFantasma: T({
    id: "cercoFantasma",
    kind: "converge",
    union: ["fantasmas", "hellzone"],
    name: "Ghost Hellzone",
    desc: "Two huge rings of orbs collapse on the horde.",
    color: "#e8d8ff",
    max: 1,
    base: { damage: 44, cooldown: 2, amount: 16, area: 1.6, speed: 480, duration: 1.4, pierce: 8, knockback: 80 },
    levels: [],
    extra: { rings: 2 },
  }),
  corteGalactico: T({
    id: "corteGalactico",
    kind: "nova",
    union: ["espada", "kikoho"],
    name: "Galactic Slash",
    desc: "A spinning slash that releases a stunning shockwave.",
    color: "#ffe8a0",
    max: 1,
    base: { damage: 120, cooldown: 1.9, area: 2, duration: 0.45, knockback: 300 },
    levels: [],
    extra: { stun: 0.6 },
  }),
  duplaGrou: T({
    id: "duplaGrou",
    kind: "lance",
    union: ["dodonpa", "kiai"],
    name: "Tien & Chiaotzu Combo",
    desc: "A volley of thick finger beams fired at every corner of the screen.",
    color: "#fff0a0",
    max: 1,
    base: { damage: 80, cooldown: 0.8, amount: 6, duration: 0.2, area: 1.6, hitCd: 0.3, knockback: 120 },
    levels: [],
    extra: { critBonus: 0.25 },
  }),
  loboFantasma: T({
    id: "loboFantasma",
    kind: "trail",
    union: ["lobo", "zanzoken"],
    name: "Phantom Wolf Fang",
    desc: "Your afterimages keep punching: big, stunning trails behind you.",
    color: "#8ab8ff",
    max: 1,
    base: { damage: 45, cooldown: 0.12, area: 1.9, duration: 2.4, hitCd: 0.25, knockback: 120 },
    levels: [],
    extra: { stun: 0.5 },
  }),
  absorcaoMajin: T({
    id: "absorcaoMajin",
    kind: "aura",
    union: ["doce", "absorcao"],
    name: "Majin Absorption",
    desc: "A huge pink field that turns the horde into health.",
    color: "#ff6ac8",
    max: 1,
    base: { damage: 22, area: 2.2, hitCd: 0.25, knockback: 60 },
    levels: [],
    extra: { healOnKill: 0.8 },
  }),
  omegaBlaster: T({
    id: "omegaBlaster",
    kind: "bomb",
    union: ["eraser", "bakuhatsuha"],
    name: "Omega Blaster",
    desc: "Three colossal green orbs that leave the ground burning.",
    color: "#3aff6a",
    max: 1,
    base: { damage: 220, cooldown: 3.2, amount: 3, area: 2.4, duration: 0.9, knockback: 300, hitCd: 0.5 },
    levels: [],
    extra: { target: "densest", pool: 3 },
  }),
};

export const BASE_TECHS = (Object.values(TECHNIQUES) as TechDef[]).filter((d) => !d.from && !d.union).map((d) => d.id);
export const UNIONS = (Object.values(TECHNIQUES) as TechDef[]).filter((d) => d.union);

export function techParams(def: TechDef, level: number): TechParams {
  const p = { ...def.base };
  for (let i = 0; i < level - 1 && i < def.levels.length; i++) {
    const add = def.levels[i].add;
    for (const k in add) {
      const key = k as keyof TechParams;
      p[key] += add[key]!;
    }
  }
  return p;
}

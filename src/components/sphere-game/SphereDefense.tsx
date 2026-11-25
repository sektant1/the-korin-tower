"use client";
// "Proteja a Esfera": Vegeta em órbita da Esfera do Dragão, 5 andares com chefe no fim de cada um.
// Canvas para energia, itens e efeitos; GIFs do site (DOM, para animarem) para os personagens.
import { useEffect, useRef, useState } from "react";
import { GIFS } from "@/lib/gifs";
import { DROP_INFO, dropIcon, dropIconUrl, loadDropArt, orb, type DropKind } from "./art";
import { CapsuleBar, CCLogo } from "./CapsuleArt";
import { RULES, STAGES, type BossDef, type MinionDef, type SpriteDef } from "./data";

const RECORD_KEY = "korin:esfera-record";

/* Vegeta (v_fire.gif) em folha de sprites sem a esfera de ki desenhada: o projétil do jogo faz o
   papel dela. Quadros de 80x98: 0-1 disparo da mão direita, 2 guarda, 3-4 disparo da esquerda,
   5 guarda. A esfera nascia em (98, 46) no 1º quadro de cada disparo; o pivô fica na altura dela,
   então a linha de mira sai do pivô, passa pela mão e chega no cursor. */
const VEGETA = { src: "/assets/sphere-game/vegeta-fire.png", fw: 80, fh: 98, pivotX: 40, pivotY: 46, ballX: 98, ballY: 46.5 };
const KI_BALL = { src: "/assets/sphere-game/ki-ball.png", w: 24, h: 16 };
const HANDS = [
  { frames: [0, 1], rest: 2 },
  { frames: [3, 4], rest: 5 },
];
const SHOT_FRAME = 0.08;
const VEGETA_SCALE = 1.4;
const MAX_SPARKS = 320;

type Phase = "ready" | "playing" | "paused" | "over" | "victory";

interface Hud {
  score: number;
  record: number;
  hp: number;
  ki: number; // cargas, 0..3 (fracionário)
  mult: number;
  stage: string;
  boss: { name: string; hp: number; max: number; color: string; enraged: boolean } | null;
  triple: number;
  rapid: number;
}

interface Banner {
  title: string;
  sub?: string;
  id: number;
}

/* ---------- entidades ---------- */

interface Actor {
  el: HTMLImageElement;
  def: SpriteDef;
  s: number; // escala do GIF
  x: number;
  y: number;
  r: number;
}
interface Minion extends Actor {
  m: MinionDef;
  hp: number;
  max: number;
  speed: number;
  t: number;
  wobble: number;
  stopR: number;
  orbit: number;
  shootT: number;
  dead: boolean;
}
interface Boss extends Actor {
  b: BossDef;
  hp: number;
  max: number;
  state: "enter" | "fight" | "dying";
  // órbita elíptica: usa a largura da tela para ficar longe do Vegeta
  rx: number;
  ry: number;
  angle: number;
  dir: number;
  attackT: number;
  attackI: number;
  enraged: boolean;
  hitT: number;
  deathT: number;
}
interface EnemyShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  dmg: number;
  img: HTMLCanvasElement;
  big: boolean;
}
// px/py: posição no quadro anterior; a colisão testa o trecho percorrido (varredura), e o
// primeiro trecho sai do corpo do Vegeta, então nada escapa entre o corpo e a mão.
type Shot = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; rot: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Boom = { x: number; y: number; max: number; t: number; dur: number; color: string };
type Drop = { kind: DropKind; x: number; y: number; t: number };
type Floater = { text: string; x: number; y: number; t: number; color: string };
type Line = { x1: number; y1: number; x2: number; y2: number; t: number; color: string };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** Distância do ponto (px, py) ao segmento (x1, y1)-(x2, y2). */
function segDist(x1: number, y1: number, x2: number, y2: number, px: number, py: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
  return Math.hypot(x1 + t * dx - px, y1 + t * dy - py);
}
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function readRecord() {
  try {
    return Number(localStorage.getItem(RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveRecord(n: number) {
  try {
    localStorage.setItem(RECORD_KEY, String(n));
  } catch {}
}

interface Controls {
  start: () => void;
  resume: () => void;
  endless: () => void;
  bigBang: () => void;
  finalFlash: () => void;
}

export function SphereDefense() {
  const arena = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sphereRef = useRef<HTMLImageElement>(null);
  const ctl = useRef<Controls | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [bg, setBg] = useState(STAGES[0].background);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [hud, setHud] = useState<Hud>({ score: 0, record: 0, hp: RULES.sphereHp, ki: 0, mult: 1, stage: "", boss: null, triple: 0, rapid: 0 });
  const [icons, setIcons] = useState<Record<DropKind, string> | null>(null);

  useEffect(() => {
    loadDropArt().then(() => setIcons({ senzu: dropIconUrl("senzu"), triple: dropIconUrl("triple"), rapid: dropIconUrl("rapid"), ki: dropIconUrl("ki") }));
    setHud((h) => ({ ...h, record: readRecord() }));

    const root = arena.current!;
    const sprites = layer.current!;
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    const ball = sphereRef.current!;
    const pixelFont = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim() || "monospace";

    const vegeta = new Image();
    vegeta.src = VEGETA.src;
    const kiBall = new Image();
    kiBall.src = KI_BALL.src;
    const bigBangImg = orb("#7fd4ff", 30);

    /* ---------- tela ---------- */
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let orbit = 140;
    let sphereR = 42;
    let dpr = 1;
    const resize = () => {
      // densidade 1: é pixel art, e o canvas de tela cheia em 2x custava 4x o preenchimento
      dpr = 1;
      W = root.clientWidth;
      H = root.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cx = W / 2;
      cy = H / 2;
      // Vegeta colado na esfera: a órbita é o escudo dela
      sphereR = Math.max(36, Math.min(56, Math.min(W, H) * 0.06));
      orbit = sphereR + 78;
      ball.style.width = ball.style.height = `${sphereR * 2}px`;
      ball.style.transform = `translate(${cx - sphereR}px, ${cy - sphereR}px)`;
    };
    resize();

    /* ---------- estado ---------- */
    let running = false;
    let paused = false;
    let minions: Minion[] = [];
    let boss: Boss | null = null;
    let shots: Shot[] = [];
    let foeShots: EnemyShot[] = [];
    let bigBangs: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
    let booms: Boom[] = [];
    let sparks: Spark[] = [];
    let drops: Drop[] = [];
    let floaters: Floater[] = [];
    let lines: Line[] = [];
    let later: { t: number; fn: () => void }[] = [];
    let beam: { t: number; dir: number } | null = null;

    let score = 0;
    let record = readRecord();
    let hp = RULES.sphereHp;
    let kiCharge = 0;
    let combo = 0;
    let comboT = 0;
    let triple = 0;
    let rapid = 0;
    let stageIdx = 0;
    let loop = 0;
    let kills = 0;
    let clearT = 0; // pausa entre andares
    let spawnIn = 0;
    let shake = 0;
    let hurt = 0;
    let hudDirty = true;
    let hudClock = 0;

    // Vegeta
    let angle = 0;
    let aimRot = 0;
    let flip = false;
    let hand = 1;
    let animT = -1;
    let restFrame = 2;
    let cooldown = 0;
    let firing = false;
    let pointer = { x: cx + 200, y: cy };

    const stage = () => STAGES[Math.min(stageIdx, STAGES.length - 1)];
    const diff = () => 1 + loop * 0.35 + stageIdx * 0.08;
    const mult = () => Math.min(4, 1 + Math.floor(combo / 6));
    const dirty = () => (hudDirty = true);

    let bannerId = 0;
    const say = (title: string, sub?: string, ms = 1800) => {
      const id = ++bannerId;
      setBanner({ title, sub, id });
      window.setTimeout(() => setBanner((b) => (b?.id === id ? null : b)), ms);
    };

    const pushHud = () => {
      hudDirty = false;
      setHud({
        score,
        record: Math.max(record, score),
        hp: Math.max(0, Math.round(hp)),
        ki: Math.min(RULES.kiMax, kiCharge / RULES.kiSegment),
        mult: mult(),
        stage: `ANDAR ${stage().floor} · ${stage().name}${loop ? ` · +${loop}` : ""}`,
        boss: boss && boss.state !== "dying" ? { name: boss.b.name, hp: boss.hp, max: boss.max, color: boss.b.color, enraged: boss.enraged } : null,
        triple: Math.ceil(triple),
        rapid: Math.ceil(rapid),
      });
    };

    /* ---------- sprites (GIFs) ---------- */
    const makeSprite = (def: SpriteDef, height: number): { el: HTMLImageElement; s: number } => {
      const s = height / def.ch;
      const el = document.createElement("img");
      el.src = def.src;
      el.alt = "";
      el.className = "sphere-sprite";
      el.style.width = `${def.w * s}px`;
      el.style.transformOrigin = `${def.ax * s}px ${def.ay * s}px`;
      sprites.appendChild(el);
      return { el, s };
    };
    const place = (a: Actor) => {
      // olha para a esfera
      const want = cx >= a.x ? 1 : -1;
      const flipX = a.def.face !== 0 && want * a.def.face < 0;
      a.el.style.transform = `translate(${a.x - a.def.ax * a.s}px, ${a.y - a.def.ay * a.s}px)${flipX ? " scaleX(-1)" : ""}`;
    };

    /* ---------- efeitos ---------- */
    const pop = (x: number, y: number, n: number, colors: string[], speed = 220) => {
      const room = Math.max(0, MAX_SPARKS - sparks.length);
      for (let i = 0; i < Math.min(n, room); i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random());
        const max = 0.3 + Math.random() * 0.4;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color: colors[i % colors.length], size: 2 + Math.floor(Math.random() * 3) });
      }
    };
    const float = (text: string, x: number, y: number, color = "#fff") => {
      if (floaters.length < 24) floaters.push({ text, x, y, t: 0.9, color });
    };
    const boom = (x: number, y: number, max: number, color: string, dur = 0.45) => booms.push({ x, y, max, t: 0, dur, color });

    /* ---------- pontuação e dano ---------- */
    const addScore = (base: number, x: number, y: number) => {
      const pts = base * mult();
      score += pts;
      float(`+${pts}`, x, y, mult() > 1 ? "#ffd21f" : "#fff");
      dirty();
    };
    const addKi = (n: number) => {
      const before = Math.floor(kiCharge / RULES.kiSegment);
      kiCharge = Math.min(RULES.kiMax * RULES.kiSegment, kiCharge + n);
      const now = Math.floor(kiCharge / RULES.kiSegment);
      if (now > before && now === RULES.kiMax) say("KI NO MÁXIMO", "F: FINAL FLASH", 1400);
      dirty();
    };
    const maybeDrop = (x: number, y: number, chance: number) => {
      if (Math.random() > chance) return;
      const kind: DropKind = hp < RULES.sphereHp * 0.6 && Math.random() < 0.45 ? "senzu" : pick<DropKind>(["triple", "rapid", "ki", "senzu"]);
      drops.push({ kind, x, y, t: 8 });
    };

    const killMinion = (e: Minion) => {
      if (e.dead) return;
      e.dead = true;
      e.el.remove();
      pop(e.x, e.y, 12, ["#ffd21f", "#ff8800", "#fff", "#7dff7d"]);
      combo++;
      comboT = RULES.comboWindow;
      kills++;
      addScore(e.m.score, e.x, e.y - 30);
      addKi(1);
      maybeDrop(e.x, e.y, RULES.dropChance);
    };
    const hitMinion = (e: Minion, dmg: number) => {
      if (e.dead) return;
      e.hp -= dmg;
      if (e.hp <= 0) killMinion(e);
    };
    const hitBoss = (dmg: number) => {
      if (!boss || boss.state !== "fight") return;
      boss.hp -= dmg;
      boss.hitT = 0.07;
      dirty();
      if (!boss.enraged && boss.hp <= boss.max / 2) {
        boss.enraged = true;
        say(`${boss.b.name} ESTÁ FURIOSO!`, undefined, 1500);
      }
      if (boss.hp <= 0) {
        boss.hp = 0;
        boss.state = "dying";
        boss.deathT = 1.6;
        boss.el.classList.add("dying");
        foeShots = [];
        lines = [];
        later = [];
      }
    };
    const hurtSphere = (dmg: number, x: number, y: number) => {
      hp -= dmg;
      float(`-${dmg}`, cx, cy - sphereR - 14, "#ff3355");
      combo = 0;
      hurt = 0.5;
      shake = 0.4;
      pop(x, y, 20, ["#ff3355", "#ff8800", "#fff"], 300);
      dirty();
      if (hp <= 0) gameOver();
    };

    /* ---------- Vegeta ---------- */
    const playerPos = () => ({ x: cx + orbit * Math.sin(angle), y: cy - orbit * Math.cos(angle) });
    const aimDir = () => {
      const p = playerPos();
      let dx = pointer.x - p.x;
      let dy = pointer.y - p.y;
      if (Math.hypot(dx, dy) < 30) {
        dx = p.x - cx;
        dy = p.y - cy;
      }
      return Math.atan2(dy, dx);
    };
    const handPoint = () => {
      const p = playerPos();
      const lx = (VEGETA.ballX - VEGETA.pivotX) * VEGETA_SCALE * (flip ? -1 : 1);
      const ly = (VEGETA.ballY - VEGETA.pivotY) * VEGETA_SCALE;
      return { x: p.x + lx * Math.cos(aimRot) - ly * Math.sin(aimRot), y: p.y + lx * Math.sin(aimRot) + ly * Math.cos(aimRot) };
    };
    const swing = () => {
      hand = 1 - hand;
      animT = 0;
    };
    // O tiro nasce no quadro em que o GIF mostrava a esfera saindo da mão, onde ela estava.
    const fire = () => {
      swing();
      const h = handPoint();
      const p = playerPos();
      const dir = aimDir();
      const spread = triple > 0 ? [-0.16, 0, 0.16] : [0];
      for (const off of spread) shots.push({ x: h.x, y: h.y, px: p.x, py: p.y, vx: Math.cos(dir + off) * 720, vy: Math.sin(dir + off) * 720, life: 1.4, rot: dir + off });
      cooldown = (SHOT_FRAME * 2 + 0.05) * (rapid > 0 ? 0.5 : 1);
    };
    const bigBang = () => {
      if (!running || clearT > 0 || beam || kiCharge < RULES.kiSegment) return;
      kiCharge -= RULES.kiSegment;
      swing();
      const h = handPoint();
      const dir = aimDir();
      bigBangs.push({ x: h.x, y: h.y, vx: Math.cos(dir) * 540, vy: Math.sin(dir) * 540, t: 1.1 });
      float("BIG BANG ATTACK!", h.x, h.y - 40, "#7fd4ff");
      dirty();
    };
    const finalFlash = () => {
      if (!running || clearT > 0 || beam) return;
      if (kiCharge < RULES.kiMax * RULES.kiSegment) {
        float("KI INSUFICIENTE", playerPos().x, playerPos().y - 60, "#ff3355");
        return;
      }
      kiCharge = 0;
      beam = { t: 2.6, dir: aimDir() };
      animT = -1;
      shake = 0.3;
      say("FINAL FLASH!!", undefined, 1200);
      dirty();
    };
    const explodeBigBang = (x: number, y: number) => {
      const R = 190;
      boom(x, y, R, "#7fd4ff", 0.5);
      boom(x, y, R * 0.6, "#ffffff", 0.35);
      pop(x, y, 40, ["#bff", "#7fd4ff", "#fff", "#ffd21f"], 420);
      shake = Math.max(shake, 0.35);
      for (const e of minions) if (Math.hypot(e.x - x, e.y - y) < R + e.r) hitMinion(e, 6);
      if (boss && Math.hypot(boss.x - x, boss.y - y) < R + boss.r) hitBoss(18);
      for (const s of foeShots) if (Math.hypot(s.x - x, s.y - y) < R + s.r) s.hp -= s.big ? 6 : 99;
    };

    /* ---------- inimigos ---------- */
    const edgePoint = (m: number) => {
      const side = Math.floor(Math.random() * 4);
      return {
        x: side === 0 ? rand(0, W) : side === 1 ? W + m : side === 2 ? rand(0, W) : -m,
        y: side === 0 ? -m : side === 1 ? rand(0, H) : side === 2 ? H + m : rand(0, H),
      };
    };
    const spawnMinion = (m: MinionDef, at?: { x: number; y: number }) => {
      const d = diff();
      const height = m.height * rand(0.92, 1.1);
      const { el, s } = makeSprite(m.sprite, height);
      const p = at ?? edgePoint(height * 1.4);
      const hp = Math.ceil(m.hp * (1 + loop * 0.5));
      minions.push({
        el,
        def: m.sprite,
        s,
        x: p.x,
        y: p.y,
        r: height * 0.3,
        m,
        hp,
        max: hp,
        speed: m.speed * d * rand(0.9, 1.15),
        t: rand(0, 1),
        wobble: rand(0, Math.PI * 2),
        stopR: orbit * 2.3 + rand(0, 60),
        orbit: Math.random() < 0.5 ? -1 : 1,
        shootT: rand(1, 2.5),
        dead: false,
      });
    };

    const foeOrb = (x: number, y: number, dir: number, speed: number, color: string, r = 10, hp = 1, dmg = 1, big = false) =>
      foeShots.push({ x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed, r, hp, dmg, img: orb(color, r), big });

    const updateMinions = (dt: number) => {
      for (const e of minions) {
        if (e.dead) continue;
        const dx = cx - e.x;
        const dy = cy - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d;
        const uy = dy / d;
        e.t += dt;
        let v = e.speed;
        if (e.m.kind === "dasher") {
          const phase = e.t % 1.2;
          v = phase < 0.7 ? e.speed * 0.15 : e.speed * 4.5;
        }
        if (e.m.kind === "shooter" && d <= e.stopR) {
          // para no anel e circula atirando na esfera
          e.x += -uy * e.orbit * 40 * dt;
          e.y += ux * e.orbit * 40 * dt;
          e.shootT -= dt;
          if (e.shootT <= 0) {
            e.shootT = 2.8 / Math.sqrt(diff());
            foeOrb(e.x, e.y, Math.atan2(dy, dx), 150 * Math.sqrt(diff()), "#ff8844", 9, 1, RULES.hit.orb);
          }
        } else {
          e.wobble += dt * 3;
          const side = e.m.kind === "grunt" ? Math.sin(e.wobble) * 0.35 : 0;
          e.x += (ux * Math.cos(side) - uy * Math.sin(side)) * v * dt;
          e.y += (uy * Math.cos(side) + ux * Math.sin(side)) * v * dt;
        }
        if (d < sphereR + e.r * 0.6) {
          e.dead = true;
          e.el.remove();
          hurtSphere(RULES.touch[e.m.kind], e.x, e.y);
        }
      }
    };

    /* ---------- chefe ---------- */
    const spawnBoss = () => {
      const b = stage().boss;
      const height = b.height;
      const { el, s } = makeSprite(b.sprite, height);
      el.classList.add("sphere-boss-sprite");
      const p = edgePoint(height);
      const hp = Math.round(b.hp * (1 + loop * 0.6));
      boss = {
        el,
        def: b.sprite,
        s,
        x: p.x,
        y: p.y,
        r: height * 0.32,
        b,
        hp,
        max: hp,
        state: "enter",
        rx: Math.max(orbit + 260, W * 0.38),
      ry: Math.max(orbit + 150, H * 0.5 - height * 0.3),
        angle: 0,
        dir: Math.random() < 0.5 ? -1 : 1,
        attackT: 1.6,
        attackI: 0,
        enraged: false,
        hitT: 0,
        deathT: 0,
      };
      say(b.name, b.intro, 2400);
      dirty();
    };

    const bossAttack = (bs: Boss) => {
      const kind = bs.b.attacks[bs.attackI++ % bs.b.attacks.length];
      const toSphere = Math.atan2(cy - bs.y, cx - bs.x);
      const sp = Math.sqrt(diff()) * (bs.enraged ? 1.2 : 1);
      const color = bs.b.color;
      if (kind === "volley") {
        const n = bs.enraged ? 7 : 5;
        for (let i = 0; i < n; i++) foeOrb(bs.x, bs.y, toSphere + (i - (n - 1) / 2) * 0.12, 165 * sp, color, 10, 1, RULES.hit.orb);
      } else if (kind === "spiral") {
        for (let w = 0; w < 3; w++)
          later.push({
            t: w * 0.28,
            fn: () => {
              if (!boss || boss.state !== "fight") return;
              for (let i = 0; i < 12; i++) foeOrb(boss.x, boss.y, (i / 12) * Math.PI * 2 + w * 0.26, 130 * sp, color, 9, 1, RULES.hit.orb);
            },
          });
      } else if (kind === "deathball") {
        foeOrb(bs.x, bs.y, toSphere, 48 * sp, color, 36, Math.round(10 * diff()), RULES.hit.deathball, true);
        float(bs.b.deathball, bs.x, bs.y - bs.r - 20, color);
      } else if (kind === "snipe") {
        for (let i = 0; i < 3; i++) {
          later.push({
            t: i * 0.4,
            fn: () => {
              if (!boss || boss.state !== "fight") return;
              const { x, y } = boss;
              lines.push({ x1: x, y1: y, x2: cx, y2: cy, t: 0.55, color });
              later.push({ t: 0.55, fn: () => boss && boss.state === "fight" && foeOrb(x, y, Math.atan2(cy - y, cx - x), 430 * sp, color, 7, 1, RULES.hit.snipe) });
            },
          });
        }
      } else {
        for (let i = 0; i < (bs.enraged ? 4 : 3); i++) spawnMinion(bs.b.summon, { x: bs.x + rand(-80, 80), y: bs.y + rand(-80, 80) });
      }
    };

    const updateBoss = (dt: number) => {
      const bs = boss;
      if (!bs) return;
      bs.hitT = Math.max(0, bs.hitT - dt);
      if (bs.state === "enter") {
        const dx = bs.x - cx;
        const dy = bs.y - cy;
        const d = Math.hypot(dx, dy);
        if ((dx / bs.rx) ** 2 + (dy / bs.ry) ** 2 <= 1) {
          bs.state = "fight";
          bs.angle = Math.atan2(dy / bs.ry, dx / bs.rx);
        } else {
          bs.x -= (dx / d) * 120 * dt;
          bs.y -= (dy / d) * 120 * dt;
        }
      } else if (bs.state === "fight") {
        bs.angle += bs.dir * (bs.enraged ? 0.32 : 0.2) * dt;
        const wob = Math.sin(performance.now() / 600) * 18;
        bs.x = cx + (bs.rx + wob) * Math.cos(bs.angle);
        bs.y = cy + (bs.ry + wob) * Math.sin(bs.angle);
        bs.attackT -= dt;
        if (bs.attackT <= 0) {
          bossAttack(bs);
          bs.attackT = (bs.b.every * (bs.enraged ? 0.65 : 1)) / Math.pow(diff(), 0.3);
        }
      } else {
        bs.deathT -= dt;
        if (Math.random() < dt * 14) {
          const x = bs.x + rand(-bs.r, bs.r);
          const y = bs.y + rand(-bs.r, bs.r);
          pop(x, y, 10, [bs.b.color, "#fff", "#ffd21f"], 260);
          boom(x, y, rand(40, 90), "#ffffff", 0.3);
        }
        shake = Math.max(shake, 0.15);
        if (bs.deathT <= 0) {
          bs.el.remove();
          boom(bs.x, bs.y, 320, bs.b.color, 0.7);
          pop(bs.x, bs.y, 60, [bs.b.color, "#fff", "#ffd21f"], 500);
          addScore(1000 * (stageIdx + 1), bs.x, bs.y);
          drops.push({ kind: "senzu", x: bs.x - 30, y: bs.y, t: 10 }, { kind: pick<DropKind>(["triple", "rapid", "ki"]), x: bs.x + 30, y: bs.y, t: 10 });
          boss = null;
          stageClear();
        }
      }
      if (boss) {
        place(boss);
        const on = boss.hitT > 0;
        if (on !== boss.el.classList.contains("hit")) boss.el.classList.toggle("hit", on);
      }
      if (bs.state !== "dying") hudDirty = true;
    };

    /* ---------- andares ---------- */
    const stageClear = () => {
      const bonus = Math.round(hp) * 10 * (stageIdx + 1);
      score += bonus;
      clearT = 3.2;
      say("ANDAR LIMPO!", `esfera com ${Math.round(hp)}% · bônus +${bonus}`, 2600);
      dirty();
    };
    const nextStage = () => {
      stageIdx++;
      kills = 0;
      if (stageIdx >= STAGES.length) {
        running = false;
        firing = false;
        record = Math.max(record, score);
        saveRecord(record);
        pushHud();
        setPhase("victory");
        return;
      }
      enterStage();
    };
    const enterStage = () => {
      setBg(stage().background);
      spawnIn = 1.5;
      say(`ANDAR ${stage().floor}`, stage().name, 2200);
      dirty();
    };

    /* ---------- partida ---------- */
    const clearWorld = () => {
      minions.forEach((e) => e.el.remove());
      boss?.el.remove();
      minions = [];
      boss = null;
      shots = [];
      foeShots = [];
      bigBangs = [];
      booms = [];
      sparks = [];
      drops = [];
      floaters = [];
      lines = [];
      later = [];
      beam = null;
    };
    const start = () => {
      clearWorld();
      score = 0;
      hp = RULES.sphereHp;
      kiCharge = 0;
      combo = 0;
      triple = rapid = 0;
      stageIdx = 0;
      loop = 0;
      kills = 0;
      clearT = 0;
      animT = -1;
      restFrame = 2;
      running = true;
      setPhase("playing");
      enterStage();
      pushHud();
    };
    const endless = () => {
      clearWorld();
      loop++;
      stageIdx = 0;
      kills = 0;
      clearT = 0;
      running = true;
      setPhase("playing");
      enterStage();
      say("MODO INFINITO", `volta ${loop}: tudo mais forte`, 2200);
      pushHud();
    };
    const gameOver = () => {
      running = false;
      firing = false;
      beam = null;
      record = Math.max(record, score);
      saveRecord(record);
      pushHud();
      setPhase("over");
    };
    const pause = () => {
      if (!running) return;
      running = false;
      paused = true;
      firing = false;
      setPhase("paused");
    };
    const resume = () => {
      if (!paused) return;
      paused = false;
      running = true;
      last = performance.now();
      setPhase("playing");
    };
    ctl.current = { start, resume, endless, bigBang, finalFlash };
    // atalhos de teste, só em desenvolvimento: __sphere.ki() enche o KI, __sphere.boss() chama o chefe
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __sphere: object }).__sphere = {
        ki: () => addKi(RULES.kiMax * RULES.kiSegment),
        boss: () => (kills = 999),
        stage: (n: number) => {
          clearWorld();
          stageIdx = n;
          kills = 0;
          enterStage();
        },
        fps: () => fpsNow,
      };
    }

    /* ---------- laço ---------- */
    let last = performance.now();
    let raf = 0;
    let fpsNow = 60;
    const tick = (now: number) => {
      const raw = (now - last) / 1000;
      const dt = Math.min(0.05, raw);
      last = now;
      if (raw > 0) fpsNow = fpsNow * 0.95 + (1 / raw) * 0.05;
      if (running) update(dt);
      draw(running ? dt : 0);
      hudClock -= dt;
      if (hudDirty && hudClock <= 0) {
        hudClock = 0.1;
        pushHud();
      }
      raf = requestAnimationFrame(tick);
    };

    const update = (dt: number) => {
      // mira e órbita
      const aim = beam ? beam.dir : aimDir();
      const target = Math.atan2(pointer.x - cx, -(pointer.y - cy));
      let diffA = target - angle;
      diffA = Math.atan2(Math.sin(diffA), Math.cos(diffA));
      angle += diffA * Math.min(1, dt * (beam ? 3 : 14));
      flip = Math.cos(aim) < 0;
      aimRot = flip ? aim - Math.PI : aim;
      if (animT >= 0) {
        animT += dt;
        if (animT >= SHOT_FRAME * 2) {
          animT = -1;
          restFrame = HANDS[hand].rest;
        }
      }

      // timers
      cooldown -= dt;
      if (firing && cooldown <= 0 && !beam) fire();
      if (comboT > 0 && (comboT -= dt) <= 0) {
        combo = 0;
        dirty();
      }
      if (triple > 0) {
        const before = Math.ceil(triple);
        triple = Math.max(0, triple - dt);
        if (Math.ceil(triple) !== before) dirty();
      }
      if (rapid > 0) {
        const before = Math.ceil(rapid);
        rapid = Math.max(0, rapid - dt);
        if (Math.ceil(rapid) !== before) dirty();
      }
      for (const l of later) l.t -= dt;
      const due = later.filter((l) => l.t <= 0);
      later = later.filter((l) => l.t > 0);
      due.forEach((l) => l.fn());

      // andar: inimigos até a cota, depois o chefe
      if (clearT > 0) {
        clearT -= dt;
        if (clearT <= 0) nextStage();
      } else {
        const q = Math.round(stage().quota * (1 + loop * 0.3));
        if (!boss && kills >= q) spawnBoss();
        spawnIn -= dt;
        const cap = boss ? 3 + loop : 5 + stageIdx + loop * 2;
        if (spawnIn <= 0 && minions.length < cap) {
          spawnMinion(pick(stage().minions));
          spawnIn = (boss ? 3.2 : Math.max(0.45, 1.35 - stageIdx * 0.12 - loop * 0.15)) * rand(0.6, 1.3);
        }
      }

      // tiros do Vegeta
      for (const s of shots) {
        const x0 = s.px;
        const y0 = s.py;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.px = s.x;
        s.py = s.y;
        s.life -= dt;
        if (s.life <= 0) continue;
        const near = (x: number, y: number, r: number) => segDist(x0, y0, s.x, s.y, x, y) < r;
        for (const e of minions) {
          if (!e.dead && near(e.x, e.y, e.r + 9)) {
            s.life = 0;
            hitMinion(e, 1);
            pop(s.x, s.y, 4, ["#9ff", "#fff"], 140);
            break;
          }
        }
        if (s.life > 0 && boss && boss.state === "fight" && near(boss.x, boss.y, boss.r + 9)) {
          s.life = 0;
          hitBoss(1);
          pop(s.x, s.y, 4, ["#9ff", "#fff"], 140);
        }
        if (s.life > 0)
          for (const f of foeShots) {
            if (f.hp > 0 && near(f.x, f.y, f.r + 8)) {
              s.life = 0;
              f.hp--;
              if (f.hp <= 0) {
                addScore(f.big ? 100 : 2, f.x, f.y);
                pop(f.x, f.y, f.big ? 30 : 6, ["#fff", "#ffd21f"], f.big ? 360 : 160);
                if (f.big) boom(f.x, f.y, 120, "#ffffff", 0.4);
              }
              break;
            }
          }
        if (s.life > 0)
          for (const d of drops) {
            if (d.t > 0 && near(d.x, d.y, 24)) {
              s.life = 0;
              d.t = 0;
              collect(d);
              break;
            }
          }
      }
      shots = shots.filter((s) => s.life > 0 && s.x > -40 && s.x < W + 40 && s.y > -40 && s.y < H + 40);

      // Big Bang
      for (const b of bigBangs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.t -= dt;
        const touch =
          minions.some((e) => !e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 28) ||
          (boss && boss.state === "fight" && Math.hypot(boss.x - b.x, boss.y - b.y) < boss.r + 28) ||
          foeShots.some((f) => f.big && Math.hypot(f.x - b.x, f.y - b.y) < f.r + 28);
        if (touch || b.t <= 0 || b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) {
          b.t = -1;
          explodeBigBang(Math.max(0, Math.min(W, b.x)), Math.max(0, Math.min(H, b.y)));
        }
      }
      bigBangs = bigBangs.filter((b) => b.t > -1);

      // Final Flash: raio que segue o mouse devagar
      if (beam) {
        beam.t -= dt;
        let d = aimDir() - beam.dir;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        beam.dir += Math.max(-1.8 * dt, Math.min(1.8 * dt, d));
        // conta a partir do corpo do Vegeta (o desenho sai da mão)
        const h = playerPos();
        const ux = Math.cos(beam.dir);
        const uy = Math.sin(beam.dir);
        const half = 38;
        const inBeam = (x: number, y: number, r: number) => {
          const px = x - h.x;
          const py = y - h.y;
          const along = px * ux + py * uy;
          return along > -r && Math.abs(px * uy - py * ux) < half + r;
        };
        for (const e of minions) if (!e.dead && inBeam(e.x, e.y, e.r)) hitMinion(e, 99);
        if (boss && boss.state === "fight" && inBeam(boss.x, boss.y, boss.r)) {
          hitBoss(55 * dt);
          if (Math.random() < dt * 30) pop(boss.x, boss.y, 3, ["#fff", "#ffd21f"], 200);
        }
        for (const f of foeShots) if (inBeam(f.x, f.y, f.r)) f.hp = 0;
        shake = Math.max(shake, 0.12);
        if (beam.t <= 0) beam = null;
      }

      updateMinions(dt);
      minions = minions.filter((e) => !e.dead);
      updateBoss(dt);

      // golpes inimigos
      const guard = playerPos();
      for (const f of foeShots) {
        if (f.hp <= 0) continue;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        // o corpo do Vegeta bloqueia os golpes (a esfera gigante não: essa tem que ser derrubada)
        if (!f.big && Math.hypot(f.x - guard.x, f.y - guard.y - 12) < 40 + f.r) {
          f.hp = 0;
          pop(f.x, f.y, 10, ["#9ff", "#fff", "#5ab0ff"], 220);
          float("BLOQUEIO!", guard.x, guard.y - 50, "#9ff");
          addScore(5, f.x, f.y);
          continue;
        }
        if (Math.hypot(f.x - cx, f.y - cy) < sphereR + f.r * 0.6) {
          f.hp = 0;
          hurtSphere(f.dmg, f.x, f.y);
          if (f.big) boom(f.x, f.y, 140, "#ff3355", 0.5);
        }
      }
      foeShots = foeShots.filter((f) => f.hp > 0 && f.x > -120 && f.x < W + 120 && f.y > -120 && f.y < H + 120);
      for (const l of lines) l.t -= dt;
      lines = lines.filter((l) => l.t > 0);

      // itens
      for (const d of drops) d.t -= dt;
      drops = drops.filter((d) => d.t > 0);
      for (const f of floaters) {
        f.t -= dt;
        f.y -= 40 * dt;
      }
      floaters = floaters.filter((f) => f.t > 0);
      for (const b of booms) b.t += dt;
      booms = booms.filter((b) => b.t < b.dur);
      hurt = Math.max(0, hurt - dt);
      if (score > record) hudDirty = true;
    };

    const collect = (d: Drop) => {
      if (d.kind === "senzu") hp = Math.min(RULES.sphereHp, hp + RULES.senzuHeal);
      else if (d.kind === "triple") triple = RULES.powerTime;
      else if (d.kind === "rapid") rapid = RULES.powerTime;
      else addKi(RULES.kiSegment);
      float(DROP_INFO[d.kind].label, d.x, d.y - 20, DROP_INFO[d.kind].color);
      pop(d.x, d.y, 14, [DROP_INFO[d.kind].color, "#fff"], 200);
      dirty();
    };

    /* ---------- desenho ---------- */
    const draw = (dt: number) => {
      for (const p of sparks) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= dt;
      }
      sparks = sparks.filter((p) => p.life > 0);
      shake = Math.max(0, shake - dt);
      const sx = shake > 0 ? (Math.random() - 0.5) * 14 * shake : 0;
      const sy = shake > 0 ? (Math.random() - 0.5) * 14 * shake : 0;
      // tremor só na camada de sprites e no canvas (não na arena com o cenário inteiro)
      sprites.style.transform = shake > 0 ? `translate(${sx}px, ${sy}px)` : "";

      ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * sy);
      ctx.clearRect(-20, -20, W + 40, H + 40);
      ctx.imageSmoothingEnabled = true;

      // órbita e aura da esfera
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "#8a76c455";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, orbit, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const aura = ctx.createRadialGradient(cx, cy, sphereR * 0.6, cx, cy, sphereR * 2.2);
      aura.addColorStop(0, hurt > 0 ? "#ff335588" : "#ffd21f44");
      aura.addColorStop(1, "#0000");
      ctx.fillStyle = aura;
      ctx.fillRect(cx - sphereR * 2.2, cy - sphereR * 2.2, sphereR * 4.4, sphereR * 4.4);
      // anel de vida em volta da esfera
      const life = Math.max(0, hp / RULES.sphereHp);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#0b1420cc";
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = life > 0.6 ? "#39e639" : life > 0.3 ? "#ffd21f" : "#ff3355";
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life);
      ctx.stroke();

      // mira dos tiros de precisão
      for (const l of lines) {
        ctx.globalAlpha = Math.floor(l.t * 12) % 2 ? 0.9 : 0.35;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // vida dos inimigos com mais de 1 de vida
      for (const e of minions) {
        if (e.max <= 1 || e.hp >= e.max) continue;
        const w = 40;
        ctx.fillStyle = "#000";
        ctx.fillRect(e.x - w / 2 - 1, e.y - e.r - 26, w + 2, 6);
        ctx.fillStyle = "#ff3355";
        ctx.fillRect(e.x - w / 2, e.y - e.r - 25, (w * e.hp) / e.max, 4);
      }

      // itens (piscam no fim)
      for (const d of drops) {
        if (d.t < 2 && Math.floor(d.t * 8) % 2) continue;
        const icon = dropIcon(d.kind);
        const bob = Math.sin(d.t * 4) * 4;
        ctx.drawImage(icon, d.x - icon.width / 2, d.y - icon.height / 2 + bob);
      }

      // golpes inimigos
      for (const f of foeShots) {
        const k = f.big ? 1 + Math.sin(performance.now() / 90) * 0.05 : 1;
        const size = f.img.width * k;
        ctx.drawImage(f.img, f.x - size / 2, f.y - size / 2, size, size);
      }

      // tiros do Vegeta (a esfera do próprio GIF)
      ctx.imageSmoothingEnabled = false;
      const bw = KI_BALL.w * VEGETA_SCALE;
      const bh = KI_BALL.h * VEGETA_SCALE;
      for (const s of shots) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.drawImage(kiBall, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
      ctx.imageSmoothingEnabled = true;
      for (const b of bigBangs) ctx.drawImage(bigBangImg, b.x - bigBangImg.width / 2, b.y - bigBangImg.height / 2);

      // Final Flash: camadas de traço (sem blur)
      if (beam) {
        const h = handPoint();
        const len = Math.hypot(W, H) * 1.5;
        const x2 = h.x + Math.cos(beam.dir) * len;
        const y2 = h.y + Math.sin(beam.dir) * len;
        const pulse = 1 + Math.sin(performance.now() / 40) * 0.08;
        const fade = Math.min(1, beam.t * 3);
        ctx.lineCap = "round";
        for (const [w, c, a] of [
          [110, "#2a6cff", 0.25],
          [76, "#5ab0ff", 0.55],
          [48, "#bfe8ff", 0.9],
          [22, "#ffffff", 1],
        ] as const) {
          ctx.globalAlpha = a * fade;
          ctx.strokeStyle = c;
          ctx.lineWidth = w * pulse;
          ctx.beginPath();
          ctx.moveTo(h.x, h.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.globalAlpha = fade;
        const flare = orb("#9fd8ff", 34);
        ctx.drawImage(flare, h.x - flare.width / 2, h.y - flare.height / 2);
        ctx.globalAlpha = 1;
        ctx.lineCap = "butt";
      }

      // explosões
      for (const b of booms) {
        const k = b.t / b.dur;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 10 * (1 - k) + 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.max * (0.2 + 0.8 * k), 0, Math.PI * 2);
        ctx.stroke();
        if (k < 0.3) {
          ctx.globalAlpha = (0.3 - k) * 1.6;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.max * 0.5 * (0.2 + k), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Vegeta
      if (running || paused) {
        const p = playerPos();
        const frame = beam ? 0 : animT >= 0 ? HANDS[hand].frames[Math.min(1, Math.floor(animT / SHOT_FRAME))] : restFrame;
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(aimRot);
        ctx.scale(flip ? -1 : 1, 1);
        ctx.drawImage(
          vegeta,
          frame * VEGETA.fw,
          0,
          VEGETA.fw,
          VEGETA.fh,
          -VEGETA.pivotX * VEGETA_SCALE,
          -VEGETA.pivotY * VEGETA_SCALE,
          VEGETA.fw * VEGETA_SCALE,
          VEGETA.fh * VEGETA_SCALE,
        );
        ctx.restore();
      }

      // faíscas
      for (const p of sparks) {
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // números flutuantes
      ctx.font = `10px ${pixelFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000";
      for (const f of floaters) {
        ctx.globalAlpha = Math.min(1, f.t * 2);
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      // sprites dos inimigos
      for (const e of minions) place(e);
    };
    raf = requestAnimationFrame(tick);

    /* ---------- controles ---------- */
    const local = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      pointer = local(e);
    };
    const onDown = (e: PointerEvent) => {
      if (!running || (e.target as HTMLElement).closest("button")) return;
      pointer = local(e);
      if (e.button === 2) return bigBang();
      firing = true;
      if (cooldown <= 0 && !beam) fire();
    };
    const onUp = () => (firing = false);
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.code === "Space") {
        e.preventDefault();
        if (running) bigBang();
      } else if (k === "f") finalFlash();
      else if (k === "p") {
        if (running) pause();
        else resume();
      }
    };
    const onHide = () => {
      if (document.hidden) pause();
    };
    const noMenu = (e: Event) => e.preventDefault();
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onHide);
    root.addEventListener("contextmenu", noMenu);
    return () => {
      cancelAnimationFrame(raf);
      clearWorld();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onHide);
      root.removeEventListener("contextmenu", noMenu);
    };
  }, []);

  const c = () => ctl.current!;
  const kiFull = Math.floor(hud.ki);

  return (
    <div ref={arena} className={`sphere-arena phase-${phase}`} style={{ backgroundImage: `linear-gradient(#05030bcc, #05030bee), url(${bg})` }}>
      <div ref={layer} className="sphere-layer">
        {/* eslint-disable-next-line @next/next/no-img-element -- GIF animado */}
        <img ref={sphereRef} src={GIFS.sphere.src} alt="" className="sphere-core" />
      </div>
      <canvas ref={cvRef} className="sphere-canvas" />

      {phase !== "ready" && (
        <div className="sphere-hud">
          <div className="sphere-score">
            <span>{hud.score}</span>
            {hud.mult > 1 && <b className="sphere-mult">x{hud.mult} COMBO</b>}
            <small>RECORDE {hud.record}</small>
          </div>
          <div className="sphere-top">
            <p className="sphere-stage">{hud.stage}</p>
            <CapsuleBar
              className="sphere-hp"
              value={hud.hp / RULES.sphereHp}
              metal="gold"
              fill={hud.hp > 60 ? "#39e639" : hud.hp > 30 ? "#ffd21f" : "#ff3355"}
              blink={hud.hp <= 25}
              label={`ESFERA ${hud.hp}%`}
            />
            {hud.boss && (
              <CapsuleBar
                className="sphere-boss"
                value={hud.boss.hp / hud.boss.max}
                metal="silver"
                fill={hud.boss.color}
                blink={hud.boss.enraged}
                label={`${hud.boss.name}${hud.boss.enraged ? " · FURIOSO" : ""}`}
              />
            )}
          </div>
          {icons && (hud.triple > 0 || hud.rapid > 0) && (
            <div className="sphere-powers">
              {hud.triple > 0 && (
                <span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- ícone gerado no cliente */}
                  <img src={icons.triple} alt="" /> TRIPLO {hud.triple}s
                </span>
              )}
              {hud.rapid > 0 && (
                <span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- ícone gerado no cliente */}
                  <img src={icons.rapid} alt="" /> RAJADA {hud.rapid}s
                </span>
              )}
            </div>
          )}
          <div className="sphere-ki">
            <span className="sphere-ki-label">KI</span>
            <span className="sphere-ki-bars">
              {Array.from({ length: RULES.kiMax }, (_, i) => (
                <CapsuleBar key={i} value={hud.ki - i} metal={i < kiFull ? "gold" : "silver"} fill={i < kiFull ? "#fff6a0" : "#5ad8ff"} />
              ))}
            </span>
            <button type="button" className="cc-btn sphere-move" disabled={hud.ki < 1} onClick={() => c().bigBang()}>
              <CCLogo size={16} /> BIG BANG <kbd>Espaço</kbd>
            </button>
            <button type="button" className={`cc-btn sphere-move ${kiFull >= RULES.kiMax ? "ready" : ""}`} disabled={kiFull < RULES.kiMax} onClick={() => c().finalFlash()}>
              <CCLogo size={16} /> FINAL FLASH <kbd>F</kbd>
            </button>
          </div>
        </div>
      )}
      {banner && phase === "playing" && (
        <div className="sphere-banner" key={banner.id}>
          <p>{banner.title}</p>
          {banner.sub && <small>{banner.sub}</small>}
        </div>
      )}

      {phase !== "playing" && (
        <div className="sphere-panel">
          <p className="cc-brand">
            <CCLogo size={22} /> CAPSULE CORP. <small>sistema de defesa da esfera</small>
          </p>
          {phase === "ready" && (
            <>
              <h2 className="t-display sphere-title">PROTEJA A ESFERA</h2>
              <p className="sphere-how">
                Cinco andares, cinco chefes. O Vegeta defende a Esfera do Dragão: mire com o mouse e segure o clique para disparar ki. A esfera tem 100% de vida; cada golpe tira um pouco. O corpo do Vegeta bloqueia golpes (menos as esferas gigantes, que precisam ser derrubadas). Atire nos itens para pegá-los.
              </p>
              <ul className="sphere-keys">
                <li>
                  <kbd>Espaço</kbd> ou botão direito: <b>Big Bang Attack</b> (1 carga de KI)
                </li>
                <li>
                  <kbd>F</kbd>: <b>Final Flash</b> (3 cargas, arraste o raio com o mouse)
                </li>
                <li>
                  <kbd>P</kbd> pausa · <kbd>Esc</kbd> sai
                </li>
              </ul>
              {icons && (
                <ul className="sphere-items">
                  {(Object.keys(DROP_INFO) as DropKind[]).map((k) => (
                    <li key={k}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- ícone gerado no cliente */}
                      <img src={icons[k]} alt="" /> {DROP_INFO[k].label}
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn-start" onClick={() => c().start()}>
                JOGAR <span className="arrow" aria-hidden="true">►</span>
              </button>
            </>
          )}
          {phase === "paused" && (
            <>
              <h2 className="t-display sphere-title">PAUSADO</h2>
              <button type="button" className="btn-start" onClick={() => c().resume()}>
                CONTINUAR <span className="arrow" aria-hidden="true">►</span>
              </button>
            </>
          )}
          {phase === "over" && (
            <>
              <h2 className="t-display sphere-title">GAME OVER</h2>
              <p className="t-sub">
                {hud.score} PONTOS · RECORDE {hud.record}
              </p>
              <p className="sphere-how">A esfera foi destruída.</p>
              <p className="sphere-how">Caiu em: {hud.stage}</p>
              <button type="button" className="btn-start" onClick={() => c().start()}>
                DE NOVO <span className="arrow" aria-hidden="true">►</span>
              </button>
            </>
          )}
          {phase === "victory" && (
            <>
              <h2 className="t-display sphere-title">A ESFERA ESTÁ A SALVO</h2>
              <p className="t-sub">
                {hud.score} PONTOS · RECORDE {hud.record}
              </p>
              <p className="sphere-how">Os cinco chefes caíram. Quer ver até onde aguenta? No modo infinito tudo volta mais forte.</p>
              <button type="button" className="btn-start" onClick={() => c().endless()}>
                MODO INFINITO <span className="arrow" aria-hidden="true">►</span>
              </button>
              <button type="button" className="btn98" onClick={() => c().start()}>
                Começar do andar 1
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

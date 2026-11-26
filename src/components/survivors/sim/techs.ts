// Golpes do herói: cada `kind` de técnica (data/techniques.ts) vira projéteis, zonas ou dano
// instantâneo aqui. Também atualiza zonas e projéteis a cada passo.
import { TECHNIQUES, type TechDef, type TechExtra } from "../data/techniques";
import {
  Fx,
  MAX_ENEMIES,
  MAX_PROJ,
  PLAYER_R,
  addProj,
  fx,
  addZone,
  canHit,
  enemyDef,
  hurt,
  nearestEnemy,
  onScreen,
  randomOnScreen,
  type TechSlot,
  type World,
  type Zone,
} from "./core";
import { ENEMY_LIST } from "../data/enemies";

const TAU = Math.PI * 2;

function aimAt(w: World, maxR: number) {
  const p = w.player;
  const target = nearestEnemy(w, p.x, p.y, maxR);
  return target >= 0 ? Math.atan2(w.ey[target] - p.y, w.ex[target] - p.x) : Math.atan2(p.faceY, p.faceX);
}

/** Dano em todos os inimigos num círculo. */
function circleHit(w: World, slot: number, x: number, y: number, r: number, dmg: number, kb: number, hitCd = 0, crit = 0, stun = 0) {
  w.grid.query(x, y, r + 34, (i) => {
    if (!w.ealive[i]) return;
    const dx = w.ex[i] - x,
      dy = w.ey[i] - y;
    const rr = r + enemyDef(w, i).radius;
    if (dx * dx + dy * dy > rr * rr) return;
    if (hitCd > 0 && !canHit(w, slot, i, hitCd)) return;
    if (stun > 0 && ENEMY_LIST[w.ekind[i]].tier !== "boss") w.estun[i] = Math.max(w.estun[i], stun);
    hurt(w, i, dmg, dx, dy, kb, slot, crit);
  });
}

/** Posições das esferas do Sokidan (a simulação e o renderizador usam a mesma conta). */
export function forEachOrbit(w: World, t: TechSlot, x: number, y: number, time: number, fn: (bx: number, by: number, r: number) => void) {
  const def = TECHNIQUES[t.id];
  const n = Math.max(1, Math.round(t.p.amount + w.stats.amount));
  const rings = def.extra?.rings ?? 1;
  const area = t.p.area * w.stats.area;
  const R = 62 * area;
  const r = 9 * area;
  for (let k = 0; k < n; k++) {
    const ring = k % rings;
    const inRing = Math.ceil((n - ring) / rings);
    const idx = Math.floor(k / rings);
    const dir = ring ? -1 : 1;
    const a = time * t.p.speed * dir + (idx / inRing) * TAU + ring * 0.5;
    const rr = R * (1 + ring * 0.65);
    fn(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85, r);
  }
}

/** Inimigo da tela com mais vizinhos (amostra alguns): alvo dos golpes de área. */
function densest(w: World) {
  let best = -1,
    most = -1;
  for (let k = 0; k < 6; k++) {
    const i = randomOnScreen(w);
    if (i < 0) continue;
    let n = 0;
    w.grid.query(w.ex[i], w.ey[i], 70, () => void n++);
    if (n > most) {
      most = n;
      best = i;
    }
  }
  return best;
}

/** Inimigo mais resistente da tela (Big Bang). */
function strongest(w: World) {
  let best = 0,
    i = -1;
  for (let j = 0; j < MAX_ENEMIES; j++)
    if (w.ealive[j] && onScreen(w, j) && w.ehp[j] > best) {
      best = w.ehp[j];
      i = j;
    }
  return i;
}

/** Alvo conforme `extra.target` (ou o padrão da técnica). */
function pickTarget(w: World, target: TechExtra["target"], fallback: "nearest" | "random", maxR = 600) {
  switch (target ?? fallback) {
    case "nearest":
      return nearestEnemy(w, w.player.x, w.player.y, maxR);
    case "densest":
      return densest(w);
    case "strongest":
      return strongest(w);
    default:
      return randomOnScreen(w);
  }
}

function segDist2(x1: number, y1: number, x2: number, y2: number, px: number, py: number) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  const qx = x1 + u * dx - px,
    qy = y1 + u * dy - py;
  return qx * qx + qy * qy;
}

/** Dano ao longo de um segmento grosso (feixes, raios). */
function lineHit(w: World, slot: number, x1: number, y1: number, angle: number, len: number, width: number, dmg: number, kb: number, hitCd: number, crit = 0) {
  const x2 = x1 + Math.cos(angle) * len,
    y2 = y1 + Math.sin(angle) * len;
  const half = width / 2;
  // o grid só consulta raios curtos com custo baixo: amostra o segmento em pedaços
  const steps = Math.max(1, Math.ceil(len / 120));
  for (let k = 0; k < steps; k++) {
    const u = (k + 0.5) / steps;
    const cx = x1 + (x2 - x1) * u,
      cy = y1 + (y2 - y1) * u;
    w.grid.query(cx, cy, len / steps / 2 + half + 34, (i) => {
      if (!w.ealive[i]) return;
      const rr = half + enemyDef(w, i).radius;
      if (segDist2(x1, y1, x2, y2, w.ex[i], w.ey[i]) >= rr * rr) return;
      if (!canHit(w, slot, i, hitCd)) return;
      hurt(w, i, dmg, Math.cos(angle), Math.sin(angle), kb, slot, crit);
    });
  }
}

function fire(w: World, slot: number, t: TechSlot) {
  const s = w.stats,
    p = w.player,
    tp = t.p,
    def: TechDef = TECHNIQUES[t.id];
  const amount = Math.max(1, Math.round(tp.amount + s.amount));
  const area = tp.area * s.area;
  const crit = def.extra?.critBonus ?? 0;
  switch (def.kind) {
    case "bolt": {
      const base = aimAt(w, 520);
      const v = tp.speed * s.projSpeed;
      for (let k = 0; k < amount; k++) {
        const a = base + (k - (amount - 1) / 2) * 0.14 + (tp.cooldown < 0.3 ? w.rng.range(-0.12, 0.12) : 0);
        const fire = def.extra?.fireball;
        // bola de fogo = 4, teleguiado (Raio Doce) = 6, comum = 0
        const mode = fire ? 4 : def.extra?.homing ? 6 : 0;
        addProj(w, slot, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, tp.duration * s.duration, (fire ? 15 : 7) * area, tp.pierce + s.pierce, mode);
      }
      w.events.push("shot");
      return;
    }
    case "fan": {
      const base = aimAt(w, 460);
      const v = tp.speed * s.projSpeed;
      const spread = 0.16;
      for (let k = 0; k < amount; k++) {
        const a = base + (k - (amount - 1) / 2) * spread;
        addProj(w, slot, p.x, p.y - 6, Math.cos(a) * v, Math.sin(a) * v, tp.duration * s.duration, 6 * area, tp.pierce + s.pierce, 0);
      }
      w.events.push("shot");
      return;
    }
    case "beam": {
      // Final Flash e Punho do Dragão vão para onde o herói anda; os outros miram no mais próximo
      const facing = def.extra?.target === "facing";
      const base = facing ? Math.atan2(p.faceY, p.faceX) : aimAt(w, 420 * area);
      const dirs = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
      for (let k = 0; k < Math.min(amount, dirs.length); k++) {
        addZone(w, {
          kind: "beam",
          slot,
          x: p.x,
          y: p.y,
          angle: base + dirs[k],
          len: 360 * area,
          width: 30 * area,
          r: 0,
          life: tp.duration * s.duration,
          max: tp.duration * s.duration,
          anchored: true,
          color: def.color,
        });
      }
      w.shake = Math.max(w.shake, facing ? 0.35 : 0.12);
      w.events.push("beam");
      return;
    }
    case "lance": {
      // raio fino num alvo (aleatório por padrão); atravessa tudo no caminho. Com alvo "mais
      // próximo", só o primeiro raio mira nele; os outros vão para alvos aleatórios.
      for (let k = 0; k < amount; k++) {
        const i = k === 0 ? pickTarget(w, def.extra?.target, "random", 560) : randomOnScreen(w);
        const a = i >= 0 ? Math.atan2(w.ey[i] - p.y, w.ex[i] - p.x) : w.rng.range(0, TAU);
        const len = 560,
          width = 8 * area;
        lineHit(w, slot, p.x, p.y, a, len, width, tp.damage, tp.knockback, tp.hitCd, crit);
        addZone(w, { kind: "lance", slot, x: p.x, y: p.y, angle: a, len, width, r: 0, life: tp.duration, max: tp.duration, anchored: false, color: def.color });
      }
      w.events.push("beam");
      return;
    }
    case "disc": {
      for (let k = 0; k < amount; k++) {
        let a = aimAt(w, 600);
        a += k === 0 ? 0 : w.rng.range(-1.2, 1.2) + (k * TAU) / amount;
        const v = tp.speed * s.projSpeed;
        const homing = def.extra?.homing ? 2 : 1;
        addProj(w, slot, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, tp.duration * s.duration, 12 * area, 999, homing);
      }
      w.events.push("slash");
      return;
    }
    case "flash": {
      const r = def.extra?.screenStun ? Math.max(w.view.w, w.view.h) : 110 * area;
      const stun = tp.duration * s.duration;
      for (let i = 0; i < MAX_ENEMIES; i++) {
        if (!w.ealive[i]) continue;
        if (def.extra?.screenStun ? !onScreen(w, i) : (w.ex[i] - p.x) ** 2 + (w.ey[i] - p.y) ** 2 > r * r) continue;
        if (enemyDef(w, i).tier !== "boss") w.estun[i] = Math.max(w.estun[i], stun);
        else w.estun[i] = Math.max(w.estun[i], stun * 0.2);
        hurt(w, i, tp.damage, w.ex[i] - p.x, w.ey[i] - p.y, 0, slot, crit);
      }
      addZone(w, { kind: "flash", slot, x: p.x, y: p.y, angle: 0, len: 0, width: 0, r, life: 0.4, max: 0.4, anchored: true, color: def.color });
      if (def.extra?.screenStun) {
        w.flash = 0.3;
        w.flashColor = "#ffffff";
      }
      w.events.push("flash");
      return;
    }
    case "aura":
      return; // contínua: tratada em updateTechs
    case "bomb": {
      for (let k = 0; k < amount; k++) {
        // Big Bang: o inimigo mais forte; Canhão Eraser: o meio da horda; Genki Dama: qualquer um.
        // Do segundo orbe em diante, um alvo aleatório (senão caem todos no mesmo ponto).
        const i = k === 0 ? pickTarget(w, def.extra?.target, "random") : randomOnScreen(w);
        const x = i >= 0 ? w.ex[i] : p.x + w.rng.range(-160, 160);
        const y = i >= 0 ? w.ey[i] : p.y + w.rng.range(-120, 120);
        const life = tp.duration + k * 0.15;
        addZone(w, { kind: "bomb", slot, x, y, angle: 0, len: 0, width: 0, r: 80 * area, life, max: life, anchored: false, color: def.color });
      }
      return;
    }
    case "slash":
    case "punch": {
      const reach = (def.kind === "punch" ? 54 : 96) * area;
      // golpe corpo a corpo: vira para o inimigo mais próximo ao alcance (o soco mira em 8
      // direções; a espada corta para a esquerda ou para a direita)
      const near = nearestEnemy(w, p.x, p.y, reach * 2.2);
      const dirX = near >= 0 ? w.ex[near] - p.x : p.faceX,
        dirY = near >= 0 ? w.ey[near] - p.y : p.faceY;
      const facing = def.kind === "punch" ? Math.atan2(dirY, dirX) : dirX >= 0 ? 0 : Math.PI;
      const thick = (def.kind === "punch" ? 26 : 40) * area;
      const sides = Math.min(2, amount);
      for (let k = 0; k < sides; k++) {
        const a = facing + (k === 1 ? Math.PI : 0);
        lineHit(w, slot, p.x, p.y, a, reach, thick * 2, tp.damage, tp.knockback, 0.05, crit);
        addZone(w, { kind: "slash", slot, x: p.x, y: p.y, angle: a, len: reach, width: thick * 2, r: 0, life: tp.duration, max: tp.duration, anchored: true, color: def.color });
      }
      if (def.extra?.trail) {
        const v = (tp.speed || 380) * s.projSpeed;
        const a = Math.atan2(p.faceY, p.faceX);
        addProj(w, slot, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, 1.6, 16 * area, 999, 4);
      }
      w.events.push("slash");
      return;
    }
    case "blast": {
      for (let k = 0; k < amount; k++) {
        const i = randomOnScreen(w);
        const x = i >= 0 ? w.ex[i] : p.x + w.rng.range(-200, 200);
        const y = i >= 0 ? w.ey[i] : p.y + w.rng.range(-150, 150);
        const r = 46 * area;
        circleHit(w, slot, x, y, r, tp.damage, tp.knockback, 0, crit);
        addZone(w, { kind: "blast", slot, x, y, angle: 0, len: 0, width: 0, r, life: 0.35, max: 0.35, anchored: false, color: def.color });
      }
      w.events.push("blast");
      return;
    }
    case "ghost": {
      for (let k = 0; k < amount; k++) {
        const a = w.rng.range(0, TAU);
        const v = tp.speed * s.projSpeed;
        addProj(w, slot, p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, Math.cos(a) * v, Math.sin(a) * v, tp.duration * s.duration, 9, 0, 3);
      }
      return;
    }
    case "orbit":
      return; // contínua: tratada em updateTechs
    case "nova": {
      const r = 150 * area;
      const life = tp.duration;
      addZone(w, { kind: "nova", slot, x: p.x, y: p.y, angle: 0, len: 0, width: 0, r, life, max: life, anchored: true, color: def.color });
      w.shake = Math.max(w.shake, 0.15);
      w.events.push("blast");
      return;
    }
    case "converge": {
      // Hellzone: N esferas cercam o alvo, param um instante e se fecham sobre ele
      const clusters = def.extra?.rings ?? 1;
      const n = Math.max(3, Math.round(tp.amount + s.amount * 2));
      const v = tp.speed * s.projSpeed;
      for (let c = 0; c < clusters; c++) {
        const i = c === 0 ? densest(w) : randomOnScreen(w);
        const cx = i >= 0 ? w.ex[i] : p.x + w.rng.range(-150, 150);
        const cy = i >= 0 ? w.ey[i] : p.y + w.rng.range(-110, 110);
        const R = 120 * area;
        const off = w.rng.range(0, TAU);
        for (let k = 0; k < n; k++) {
          const a = off + (k / n) * TAU;
          const x = cx + Math.cos(a) * R,
            y = cy + Math.sin(a) * R;
          const q = addProj(w, slot, x, y, -Math.cos(a) * v, -Math.sin(a) * v, 0.5 + k * 0.025 + tp.duration, 7 * area, tp.pierce + s.pierce, 5);
          if (q >= 0) w.qdelay[q] = 0.5 + k * 0.025;
        }
      }
      w.events.push("shot");
      return;
    }
    case "barrage":
      t.burst = tp.duration * s.duration;
      t.burstAcc = 0;
      return;
    case "chain": {
      const range = 150 * area;
      const hit: number[] = [];
      for (let b = 0; b < amount; b++) {
        let from = -1;
        let fx0 = p.x,
          fy0 = p.y - 10;
        let cur = b === 0 ? nearestEnemy(w, p.x, p.y, 360 * area) : randomOnScreen(w);
        for (let j = 0; j <= tp.pierce + s.pierce && cur >= 0; j++) {
          const x = w.ex[cur],
            y = w.ey[cur];
          const dx = x - fx0,
            dy = y - fy0;
          addZone(w, { kind: "chain", slot, x: fx0, y: fy0, angle: Math.atan2(dy, dx), len: Math.hypot(dx, dy), width: 0, r: 0, life: 0.22, max: 0.22, anchored: false, color: def.color });
          hit.push(cur);
          const stun = def.extra?.stun ?? 0;
          if (stun && ENEMY_LIST[w.ekind[cur]].tier !== "boss") w.estun[cur] = Math.max(w.estun[cur], stun);
          hurt(w, cur, tp.damage, dx, dy, tp.knockback, slot, crit);
          from = cur;
          fx0 = x;
          fy0 = y;
          // próximo: o mais perto que ainda não levou este raio
          let next = -1,
            bd = range * range;
          w.grid.query(x, y, range, (k) => {
            if (!w.ealive[k] || k === from || hit.includes(k)) return;
            const d = (w.ex[k] - x) ** 2 + (w.ey[k] - y) ** 2;
            if (d < bd) {
              bd = d;
              next = k;
            }
          });
          cur = next;
        }
      }
      if (hit.length) w.events.push("zap");
      return;
    }
    case "trail": {
      // imagem residual: fica onde o herói está e fere quem encosta até sumir
      const life = tp.duration * s.duration;
      const r = 30 * area;
      for (let k = 0; k < amount; k++) {
        const ox = k ? w.rng.range(-r, r) : 0,
          oy = k ? w.rng.range(-r, r) : 0;
        addZone(w, { kind: "pool", slot, x: p.x + ox, y: p.y + oy, angle: 0, len: 0, width: 0, r, life, max: life, anchored: false, color: def.color });
      }
      return;
    }
    case "vortex": {
      for (let k = 0; k < amount; k++) {
        const i = k === 0 ? densest(w) : randomOnScreen(w);
        const x = i >= 0 ? w.ex[i] : p.x + w.rng.range(-150, 150);
        const y = i >= 0 ? w.ey[i] : p.y + w.rng.range(-110, 110);
        const life = tp.duration * s.duration;
        addZone(w, { kind: "vortex", slot, x, y, angle: 0, len: 0, width: 0, r: 70 * area, life, max: life, anchored: false, color: def.color });
      }
      w.events.push("flash");
      return;
    }
  }
}

export function updateTechs(w: World, dt: number) {
  const s = w.stats,
    p = w.player;
  for (let slot = 0; slot < w.techs.length; slot++) {
    const t = w.techs[slot];
    const def = TECHNIQUES[t.id];
    if (def.kind === "aura") {
      const r = 52 * t.p.area * s.area;
      circleHit(w, slot, p.x, p.y, r, t.p.damage, t.p.knockback, Math.max(0.15, t.p.hitCd));
      continue;
    }
    if (def.kind === "orbit") {
      forEachOrbit(w, t, p.x, p.y, w.t, (x, y, r) => circleHit(w, slot, x, y, r, t.p.damage, t.p.knockback, t.p.hitCd));
      continue;
    }
    if (t.burst > 0) {
      // Renzoku: um tiro (ou leque) a cada 0,07 s num inimigo aleatório da tela
      t.burst -= dt;
      t.burstAcc += dt;
      const n = Math.max(1, Math.round(t.p.amount + s.amount));
      const v = t.p.speed * s.projSpeed;
      while (t.burstAcc >= 0.07) {
        t.burstAcc -= 0.07;
        const i = randomOnScreen(w);
        const base = i >= 0 ? Math.atan2(w.ey[i] - p.y, w.ex[i] - p.x) : w.rng.range(0, TAU);
        for (let k = 0; k < n; k++) {
          const a = base + (k - (n - 1) / 2) * 0.1 + w.rng.range(-0.06, 0.06);
          addProj(w, slot, p.x + w.rng.range(-6, 6), p.y - 8 + w.rng.range(-6, 6), Math.cos(a) * v, Math.sin(a) * v, 1, 5 * t.p.area * s.area, t.p.pierce + s.pierce, 0);
        }
        if (w.ticks % 4 === 0) w.events.push("shot");
      }
    }
    t.timer -= dt;
    if (t.timer <= 0) {
      t.timer += Math.max(0.08, t.p.cooldown * s.cooldown);
      fire(w, slot, t);
    }
  }
}

function explodeBomb(w: World, z: Zone) {
  const t = w.techs[z.slot];
  if (!t) return;
  circleHit(w, z.slot, z.x, z.y, z.r, t.p.damage, t.p.knockback);
  addZone(w, { kind: "blast", slot: z.slot, x: z.x, y: z.y, angle: 0, len: 0, width: 0, r: z.r, life: 0.5, max: 0.5, anchored: false, color: z.color });
  fx(w, Fx.Explosion, z.x, z.y, z.r, z.color);
  const pool = TECHNIQUES[t.id].extra?.pool;
  if (pool) addZone(w, { kind: "pool", slot: z.slot, x: z.x, y: z.y, angle: 0, len: 0, width: 0, r: z.r * 0.8, life: pool, max: pool, anchored: false, color: z.color });
  w.shake = Math.max(w.shake, 0.3);
  w.events.push("blast");
}

export function updateZones(w: World, dt: number) {
  const p = w.player;
  for (const z of w.zones) {
    if (!z.alive) continue;
    z.life -= dt;
    if (z.anchored) {
      z.x = p.x;
      z.y = p.y;
    }
    if (z.life <= 0) {
      z.alive = false;
      if (z.kind === "bomb") explodeBomb(w, z);
      else if (z.kind === "vortex" && TECHNIQUES[w.techs[z.slot]?.id]?.extra?.finalBlast) {
        const t = w.techs[z.slot];
        circleHit(w, z.slot, z.x, z.y, z.r * 1.3, t.p.damage * 8, t.p.knockback);
        fx(w, Fx.Explosion, z.x, z.y, z.r * 1.3, z.color);
        w.events.push("blast");
      }
      continue;
    }
    const t = w.techs[z.slot];
    if (!t) continue;
    if (z.kind === "beam") lineHit(w, z.slot, z.x, z.y, z.angle, z.len, z.width, t.p.damage, t.p.knockback, t.p.hitCd);
    else if (z.kind === "pool") {
      const def = TECHNIQUES[t.id];
      // imagem residual fere com o dano cheio; a poça da Genki Dama, com um quarto
      if (def.kind === "trail") circleHit(w, z.slot, z.x, z.y, z.r, t.p.damage, t.p.knockback, t.p.hitCd, def.extra?.critBonus ?? 0, def.extra?.stun ?? 0);
      else circleHit(w, z.slot, z.x, z.y, z.r, t.p.damage * 0.25, 0, 0.5);
    }
    else if (z.kind === "nova") {
      // anel que cresce: cada inimigo leva um golpe só por onda
      const cur = z.r * Math.sin((1 - z.life / z.max) * Math.PI * 0.5);
      circleHit(w, z.slot, z.x, z.y, cur, t.p.damage, t.p.knockback, z.max + 0.05, 0, TECHNIQUES[t.id].extra?.stun ?? 0);
    } else if (z.kind === "vortex") {
      const def = TECHNIQUES[t.id];
      const pull = def.extra?.pull ?? 80;
      const R = z.r * 1.5;
      w.grid.query(z.x, z.y, R + 34, (i) => {
        if (!w.ealive[i]) return;
        const ed = ENEMY_LIST[w.ekind[i]];
        if (ed.tier === "boss" || ed.tier === "crate") return;
        const dx = z.x - w.ex[i],
          dy = z.y - w.ey[i];
        const d = Math.hypot(dx, dy);
        if (d > R || d < 4) return;
        // puxa para o centro girando, como um redemoinho
        const k = pull * (1 - ed.knockbackResist * 0.7) * dt;
        w.ex[i] += (dx / d) * k - (dy / d) * k * 0.6;
        w.ey[i] += (dy / d) * k + (dx / d) * k * 0.6;
      });
      circleHit(w, z.slot, z.x, z.y, z.r, t.p.damage, 0, t.p.hitCd, 0, def.extra?.stun ?? 0);
    }
  }
}

/** Técnica dona do projétil `q`. */
const def0 = (w: World, q: number) => (w.techs[w.qslot[q]] ? TECHNIQUES[w.techs[w.qslot[q]].id] : undefined);

export function updateProjectiles(w: World, dt: number) {
  const p = w.player;
  for (let q = 0; q < MAX_PROJ; q++) {
    if (!w.qalive[q]) continue;
    w.qpx[q] = w.qx[q];
    w.qpy[q] = w.qy[q];
    w.qlife[q] -= dt;
    if (w.qlife[q] <= 0) {
      w.qalive[q] = 0;
      continue;
    }
    const mode = w.qmode[q];
    if (mode === 5 && w.qdelay[q] > 0) {
      // Hellzone: esperando o cerco fechar
      w.qdelay[q] -= dt;
      continue;
    }
    if (mode === 1) {
      // Kienzan: desacelera até parar na metade da vida e volta para o herói
      const half = w.qmax[q] / 2;
      if (w.qlife[q] < half) {
        const dx = p.x - w.qx[q],
          dy = p.y - w.qy[q];
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.hypot(w.qvx[q], w.qvy[q]) + 900 * dt;
        w.qvx[q] = (dx / d) * sp;
        w.qvy[q] = (dy / d) * sp;
        if (d < PLAYER_R + 6) {
          w.qalive[q] = 0;
          continue;
        }
      } else {
        const k = Math.max(0, 1 - (dt / half) * 0.9);
        w.qvx[q] *= k;
        w.qvy[q] *= k;
      }
    } else if (mode === 2 || mode === 3 || mode === 6) {
      // teleguiado (Kienzan evoluído, fantasmas, Raio Doce): gira em direção ao inimigo mais próximo
      const target = nearestEnemy(w, w.qx[q], w.qy[q], 420);
      if (target >= 0) {
        const want = Math.atan2(w.ey[target] - w.qy[q], w.ex[target] - w.qx[q]);
        const cur = Math.atan2(w.qvy[q], w.qvx[q]);
        let d = want - cur;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const turn = (mode === 2 ? 5 : mode === 6 ? (def0(w, q)?.extra?.homing ?? 4) : 3) * dt;
        const a = cur + Math.max(-turn, Math.min(turn, d));
        const sp = Math.hypot(w.qvx[q], w.qvy[q]);
        w.qvx[q] = Math.cos(a) * sp;
        w.qvy[q] = Math.sin(a) * sp;
      }
    }
    w.qx[q] += w.qvx[q] * dt;
    w.qy[q] += w.qvy[q] * dt;
    const slot = w.qslot[q];
    const t = w.techs[slot];
    if (!t) continue;
    const def = TECHNIQUES[t.id];
    const x = w.qx[q],
      y = w.qy[q],
      r = w.qr[q];
    w.grid.query(x, y, r + 34, (i) => {
      if (!w.ealive[i]) return;
      const dx = w.ex[i] - x,
        dy = w.ey[i] - y,
        rr = r + enemyDef(w, i).radius;
      if (dx * dx + dy * dy > rr * rr) return;
      if (mode === 3) {
        // fantasma: explode no primeiro toque
        const er = 50 * t.p.area * w.stats.area;
        circleHit(w, slot, x, y, er, t.p.damage, t.p.knockback);
        addZone(w, { kind: "blast", slot, x, y, angle: 0, len: 0, width: 0, r: er, life: 0.35, max: 0.35, anchored: false, color: def.color });
        w.events.push("blast");
        w.qalive[q] = 0;
        return true;
      }
      // disco e bola de fogo respeitam o hitCd; projétil comum não repete o último alvo
      if (mode === 1 || mode === 2 || mode === 4 || mode === 6) {
        if (!canHit(w, slot, i, mode === 4 ? 0.5 : t.p.hitCd)) return;
      } else {
        if (w.qlast[q] === i) return;
        w.qlast[q] = i;
      }
      const stun = def.extra?.stun;
      if (stun && ENEMY_LIST[w.ekind[i]].tier !== "boss") w.estun[i] = Math.max(w.estun[i], stun);
      hurt(w, i, t.p.damage, w.qvx[q], w.qvy[q], t.p.knockback, slot, def.extra?.critBonus ?? 0);
      if (w.qpierce[q]-- <= 0) {
        w.qalive[q] = 0;
        return true;
      }
    });
  }
}

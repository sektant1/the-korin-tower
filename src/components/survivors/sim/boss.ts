// Ataques de elites e chefes (padrões herdados do jogo antigo: volley, spiral, deathball, snipe,
// summon, mais dash e ring) e os tiros inimigos. Abaixo de 30% de HP o chefe fica enfurecido.
import { SAGAS } from "../data/enemies";
import { Fx, MAX_BULLETS, MAX_ENEMIES, PLAYER_R, addBullet, addHazard, enemyDamage, enemyDef, fx, hurtPlayer, spawnEnemy, type World } from "./core";

const TAU = Math.PI * 2;

function doPattern(w: World, i: number, kind: string, enraged: boolean) {
  const def = enemyDef(w, i);
  const p = w.player;
  const x = w.ex[i],
    y = w.ey[i];
  const aim = Math.atan2(p.y - y, p.x - x);
  const boss = def.tier === "boss";
  const sp = (enraged ? 1.25 : 1) * (boss ? 1.1 : 1);
  const dmg = enemyDamage(w, def.damage) * 0.6;
  switch (kind) {
    case "snipe":
      addBullet(w, x, y, Math.cos(aim) * 330 * sp, Math.sin(aim) * 330 * sp, 6, dmg, 3);
      if (enraged) {
        addBullet(w, x, y, Math.cos(aim + 0.2) * 330 * sp, Math.sin(aim + 0.2) * 330 * sp, 6, dmg, 3);
        addBullet(w, x, y, Math.cos(aim - 0.2) * 330 * sp, Math.sin(aim - 0.2) * 330 * sp, 6, dmg, 3);
      }
      break;
    case "volley": {
      const n = boss ? 9 : 5;
      for (let k = 0; k < n; k++) {
        const a = aim + (k - (n - 1) / 2) * (boss ? 0.16 : 0.22);
        addBullet(w, x, y, Math.cos(a) * 200 * sp, Math.sin(a) * 200 * sp, 7, dmg, 4);
      }
      break;
    }
    case "ring": {
      const n = boss ? 24 : 14;
      const off = w.rng.next() * TAU;
      for (let k = 0; k < n; k++) {
        const a = off + (k / n) * TAU;
        addBullet(w, x, y, Math.cos(a) * 150 * sp, Math.sin(a) * 150 * sp, 7, dmg, 5);
      }
      break;
    }
    case "spiral":
      w.eaux[i] = 2.6; // segue atirando em updateEnemyAttacks
      w.eang[i] = aim;
      break;
    case "deathball":
      addBullet(w, x, y, Math.cos(aim) * 85 * sp, Math.sin(aim) * 85 * sp, 22, dmg * 2.2, 9, 0.9);
      break;
    case "summon": {
      const roster = SAGAS[w.saga].roster;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        spawnEnemy(w, k % 2 ? roster.a : roster.b, x + Math.cos(a) * 60, y + Math.sin(a) * 60);
      }
      break;
    }
    case "dash":
      // investida com aviso: para, marca a linha e depois dispara (world.ts)
      w.efuse[i] = boss ? 0.5 : 0.6;
      w.eang[i] = aim;
      fx(w, Fx.Telegraph, x, y, aim, "#ff3355");
      w.events.push("warn");
      break;
    case "shot":
      addBullet(w, x, y, Math.cos(aim) * 190, Math.sin(aim) * 190, 5, dmg, 4);
      break;
    case "laser": {
      // feixe com aviso: uma linha fina mostra onde vai acertar
      const n = boss && enraged ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const a = aim + (k - (n - 1) / 2) * 0.5;
        addHazard(w, { kind: "laser", x, y, angle: a, len: 1100, r: boss ? 22 : 16, warn: boss ? 0.8 : 0.95, life: 0.35, dmg: dmg * 2, color: def.color });
      }
      w.events.push("warn");
      break;
    }
    case "meteor": {
      // chuva de ki: círculos no chão em volta do herói, que explodem depois do aviso
      const n = enraged ? 9 : 6;
      for (let k = 0; k < n; k++) {
        const a = w.rng.range(0, TAU),
          d = k === 0 ? 0 : w.rng.range(60, 260);
        addHazard(w, { kind: "meteor", x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, angle: 0, len: 0, r: w.rng.range(40, 62), warn: 1.1 + k * 0.08, life: 0.15, dmg: dmg * 1.8, color: "#ff7a1a" });
      }
      w.events.push("warn");
      return;
    }
  }
  if (kind !== "dash" && kind !== "summon" && kind !== "laser") w.events.push("enemyShot");
}

export function updateEnemyAttacks(w: World, dt: number) {
  const p = w.player;
  const reachX = w.view.w * 0.6,
    reachY = w.view.h * 0.6;
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    const def = enemyDef(w, i);
    if (!def.patterns) continue;
    if (w.estun[i] > 0 || w.efuse[i] > 0 || w.edash[i] > 0) continue;
    const enraged = def.tier === "boss" && w.ehp[i] < w.emax[i] * 0.3;
    // espiral em andamento
    if (w.eaux[i] > 0) {
      w.eaux[i] -= dt;
      const before = Math.floor((w.eaux[i] + dt) / 0.07),
        now = Math.floor(w.eaux[i] / 0.07);
      if (before !== now) {
        w.eang[i] += 0.38;
        const arms = enraged ? 4 : 3;
        for (let k = 0; k < arms; k++) {
          const a = w.eang[i] + (k / arms) * TAU;
          addBullet(w, w.ex[i], w.ey[i], Math.cos(a) * 170, Math.sin(a) * 170, 6, enemyDamage(w, def.damage) * 0.5, 4);
        }
      }
    }
    // só ataca perto da tela
    if (Math.abs(w.ex[i] - p.x) > reachX || Math.abs(w.ey[i] - p.y) > reachY) continue;
    w.eatk[i] -= dt;
    if (w.eatk[i] > 0) continue;
    const pat = def.patterns[w.epat[i] % def.patterns.length];
    w.epat[i]++;
    doPattern(w, i, pat.kind, enraged);
    const next = def.patterns[w.epat[i] % def.patterns.length];
    w.eatk[i] = Math.min(pat.cd, next.cd) * (enraged ? 0.6 : 1) * (0.85 + w.rng.next() * 0.3);
  }
}

export function updateBullets(w: World, dt: number) {
  const p = w.player;
  for (let b = 0; b < MAX_BULLETS; b++) {
    if (!w.balive[b]) continue;
    w.bpx[b] = w.bx[b];
    w.bpy[b] = w.by[b];
    w.blife[b] -= dt;
    if (w.blife[b] <= 0) {
      w.balive[b] = 0;
      continue;
    }
    if (w.bhome[b] > 0) {
      const want = Math.atan2(p.y - w.by[b], p.x - w.bx[b]);
      const cur = Math.atan2(w.bvy[b], w.bvx[b]);
      let d = want - cur;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const turn = w.bhome[b] * dt;
      const a = cur + Math.max(-turn, Math.min(turn, d));
      const sp = Math.hypot(w.bvx[b], w.bvy[b]);
      w.bvx[b] = Math.cos(a) * sp;
      w.bvy[b] = Math.sin(a) * sp;
    }
    w.bx[b] += w.bvx[b] * dt;
    w.by[b] += w.bvy[b] * dt;
    const dx = p.x - w.bx[b],
      dy = p.y - w.by[b],
      rr = w.br[b] + PLAYER_R - 3;
    if (dx * dx + dy * dy < rr * rr) {
      if (p.invuln <= 0 && w.immortal <= 0) {
        hurtPlayer(w, w.bdmg[b], "tiro");
        w.balive[b] = 0;
      }
    }
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

/** Lasers e meteoros: aviso, depois acerto único no herói se ele ainda estiver na área. */
export function updateHazards(w: World, dt: number) {
  const p = w.player;
  for (const h of w.hazards) {
    if (!h.alive) continue;
    if (h.warn > 0) {
      h.warn -= dt;
      if (h.warn <= 0) {
        if (h.kind === "meteor") {
          fx(w, Fx.Explosion, h.x, h.y, h.r, h.color);
          w.events.push("boom");
        } else w.events.push("beam");
        w.shake = Math.max(w.shake, h.kind === "laser" ? 0.2 : 0.12);
      }
      continue;
    }
    h.life -= dt;
    if (h.life <= 0) {
      h.alive = false;
      continue;
    }
    if (h.done) continue;
    let inside: boolean;
    if (h.kind === "meteor") inside = (p.x - h.x) ** 2 + (p.y - h.y) ** 2 < (h.r + PLAYER_R - 4) ** 2;
    else inside = segDist2(h.x, h.y, h.x + Math.cos(h.angle) * h.len, h.y + Math.sin(h.angle) * h.len, p.x, p.y) < (h.r + PLAYER_R - 4) ** 2;
    if (inside) {
      h.done = true;
      hurtPlayer(w, h.dmg, h.kind);
    }
  }
}

// Simulação do Saiyajin Survivors: o laço do passo fixo. O estado e as mutações ficam em core.ts,
// os golpes do herói em techs.ts e os ataques inimigos em boss.ts. O renderizador só lê o World;
// a interface (React) só chama as funções exportadas aqui.
import { ELITE_EVERY, RING_AT, SAGAS, STAMPEDE_AT, enemyById, hpScale } from "../data/enemies";
import { PLAYER_SPEED, SHIELD_REGEN } from "../data/stats";
import { updateBullets, updateEnemyAttacks, updateHazards } from "./boss";
import {
  BALL_TIMES,
  THIEF_AT,
  Fx,
  addShield,
  eat,
  spiritBomb,
  startRage,
  SCROLL_TIMES,
  enemyDamage,
  explodeAt,
  fx,
  hasScroll,
  hurt,
  offerScrolls,
  randomOnScreen,
  MAX_ENEMIES,
  MAX_GEMS,
  PLAYER_R,
  STEP,
  addZone,
  enemyDef,
  gainKi,
  gainXp,
  hurtPlayer,
  killEnemy,
  newWorld,
  notice,
  openCapsule,
  capsuleRoll,
  recomputeStats,
  removeEnemy,
  rollWishes,
  spawnEnemy,
  transform,
  updateForm,
  type Input,
  type RunOptions,
  type World,
} from "./core";
import { updateProjectiles, updateTechs, updateZones } from "./techs";

export * from "./core";

export function createWorld(seed: number, opts: RunOptions = {}): World {
  return newWorld(seed, opts);
}

/** Ponto logo fora da tela, num lado sorteado (com folga para não nascer à vista). */
function offscreen(w: World): [number, number] {
  const hw = w.view.w / 2 + 32,
    hh = w.view.h / 2 + 32;
  const { x, y } = w.player;
  const side = w.rng.int(4);
  if (side === 0) return [x + w.rng.range(-hw, hw), y - hh];
  if (side === 1) return [x + w.rng.range(-hw, hw), y + hh];
  if (side === 2) return [x - hw, y + w.rng.range(-hh, hh)];
  return [x + hw, y + w.rng.range(-hh, hh)];
}

function currentWave(w: World) {
  const minute = w.t / 60;
  let wave = w.waves[0];
  for (const wv of w.waves) if (wv.minute <= minute) wave = wv;
  return wave;
}

function spawnBoss(w: World) {
  const saga = SAGAS[w.saga];
  const def = enemyById(saga.boss);
  const p = w.player;
  w.arena = { x: p.x, y: p.y, r: 430 };
  const i = spawnEnemy(w, def.id, p.x, p.y - 330);
  if (i < 0) {
    // pool cheio: abre espaço tirando um comum longe
    for (let j = 0; j < MAX_ENEMIES; j++)
      if (w.ealive[j] && enemyDef(w, j).tier === "grunt") {
        removeEnemy(w, j);
        break;
      }
    return spawnBoss(w);
  }
  if (w.bossPreDamage > 0) w.ehp[i] *= 1 - w.bossPreDamage;
  w.boss = i;
  w.shake = 0.8;
  w.flash = 0.4;
  w.flashColor = def.color;
  w.events.push("boss");
  notice(w, `${def.name} has arrived! There is no escape.`);
  // quem estava fora da arena some (a arena é do chefe)
  for (let j = 0; j < MAX_ENEMIES; j++) {
    if (!w.ealive[j] || j === i) continue;
    const dx = w.ex[j] - p.x,
      dy = w.ey[j] - p.y;
    if (dx * dx + dy * dy > 430 * 430) removeEnemy(w, j);
  }
}

function spawner(w: World, dt: number) {
  const saga = SAGAS[w.saga];
  if (!w.bossDefeated && w.boss < 0 && w.t >= w.bossAt) spawnBoss(w);
  const wave = currentWave(w);
  const bossFight = w.boss >= 0 || w.bossDefeated;
  const target = bossFight ? (w.bossDefeated ? 0 : 60) : Math.min(MAX_ENEMIES - 40, Math.round(wave.target * w.stats.curse));
  w.spawnAcc += dt * (target / 5 + 4);
  while (w.spawnAcc >= 1) {
    w.spawnAcc -= 1;
    if (w.enemyCount >= target) {
      w.spawnAcc = 0;
      break;
    }
    const [x, y] = offscreen(w);
    spawnEnemy(w, w.rng.pick(wave.kinds), x, y);
  }
  if (bossFight) return;
  if (w.scrollsOffered < SCROLL_TIMES.length && w.t >= SCROLL_TIMES[w.scrollsOffered]) {
    w.scrollsOffered++;
    offerScrolls(w);
  }
  if (w.stampedesDone < STAMPEDE_AT.length && w.t >= STAMPEDE_AT[w.stampedesDone]) {
    w.stampedesDone++;
    stampede(w, saga.roster.b);
  }
  if (w.t >= w.nextElite) {
    w.nextElite += ELITE_EVERY;
    // a partir das 7:00 eles vêm em dupla
    for (let k = 0; k < (w.t >= 420 ? 2 : 1); k++) {
      const [x, y] = offscreen(w);
      const id = saga.elites[w.eliteIdx++ % saga.elites.length];
      spawnEnemy(w, id, x, y);
      notice(w, `${enemyById(id).name} is approaching!`);
    }
  }
  if (w.ringsDone < RING_AT.length && w.t >= RING_AT[w.ringsDone]) {
    w.ringsDone++;
    const n = 60,
      r = Math.max(w.view.w, w.view.h) * 0.55;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      spawnEnemy(w, saga.roster.a, w.player.x + Math.cos(a) * r, w.player.y + Math.sin(a) * r);
    }
    notice(w, "You are surrounded!");
  }
  // caixotes: alguns pela vizinhança
  if (w.t >= w.nextCrate) {
    w.nextCrate = w.t + (hasScroll(w, "sorteOolong") ? 17 : 35);
    const a = w.rng.range(0, Math.PI * 2),
      d = w.rng.range(220, 420);
    spawnEnemy(w, "caixote", w.player.x + Math.cos(a) * d, w.player.y + Math.sin(a) * d);
  }
  // tanques de combustível: um trio entre o herói e a horda (atire neles para explodir a horda)
  if (w.t >= w.nextBarrel) {
    if (w.nextBarrel === 45) notice(w, "Fuel tanks! Blow them up near the horde.");
    w.nextBarrel = w.t + 40;
    const a = w.rng.range(0, Math.PI * 2),
      d = w.rng.range(200, 340);
    const cx = w.player.x + Math.cos(a) * d,
      cy = w.player.y + Math.sin(a) * d;
    for (let k = 0; k < 3; k++) spawnEnemy(w, "barril", cx + w.rng.range(-50, 50), cy + w.rng.range(-50, 50));
  }
  // ladrão: foge com Zeni; derrote-o antes que suma
  if (w.thievesDone < THIEF_AT.length && w.t >= THIEF_AT[w.thievesDone]) {
    w.thievesDone++;
    const a = w.rng.range(0, Math.PI * 2);
    const i = spawnEnemy(w, "ladrao", w.player.x + Math.cos(a) * 240, w.player.y + Math.sin(a) * 240);
    if (i >= 0) {
      w.events.push("warn");
      notice(w, "A thief is running off with Zeni! Catch it!");
    }
  }
  // Esferas do Dragão: uma de cada vez, longe do herói
  if (w.balls.length < 7 && w.t >= BALL_TIMES[w.balls.length]) {
    const a = w.rng.range(0, Math.PI * 2),
      d = w.rng.range(600, 1000);
    w.balls.push({ stars: w.balls.length + 1, x: w.player.x + Math.cos(a) * d, y: w.player.y + Math.sin(a) * d, taken: false });
    notice(w, "The Dragon Radar found a Dragon Ball!");
  }
}

/** Uma parede de inimigos rápidos atravessa a tela em linha reta. */
function stampede(w: World, id: string) {
  const p = w.player;
  const dir = w.rng.int(4);
  const ang = [0, Math.PI, Math.PI / 2, -Math.PI / 2][dir];
  const ux = Math.cos(ang),
    uy = Math.sin(ang);
  const along = (dir < 2 ? w.view.w : w.view.h) / 2 + 60;
  const span = (dir < 2 ? w.view.h : w.view.w) * 1.1;
  const n = 40;
  for (let k = 0; k < n; k++) {
    const off = (k / (n - 1) - 0.5) * span;
    const back = w.rng.range(0, 90);
    const x = p.x - ux * (along + back) - uy * off,
      y = p.y - uy * (along + back) + ux * off;
    const i = spawnEnemy(w, id, x, y);
    if (i < 0) break;
    w.eflag[i] = 1;
    w.eang[i] = ang;
  }
  w.events.push("warn");
  notice(w, "Stampede!");
}

function updateEnemies(w: World, dt: number) {
  const p = w.player;
  const far2 = (Math.max(w.view.w, w.view.h) * 1.1) ** 2;
  w.grid.clear();
  for (let i = 0; i < MAX_ENEMIES; i++) if (w.ealive[i]) w.grid.insert(i, w.ex[i], w.ey[i]);

  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    w.epx[i] = w.ex[i];
    w.epy[i] = w.ey[i];
    const def = enemyDef(w, i);
    if (w.eflash[i] > 0) w.eflash[i] -= dt;
    let dx = p.x - w.ex[i],
      dy = p.y - w.ey[i];
    const d2 = dx * dx + dy * dy;
    if (def.tier === "crate") {
      if (d2 > far2 * 2) removeEnemy(w, i);
      continue;
    }
    // debandada: corre reto e some longe
    if (w.eflag[i] === 1) {
      if (d2 > far2 * 2.25) {
        removeEnemy(w, i);
        continue;
      }
      const v = Math.max(200, def.speed * 2.4) * (w.estun[i] > 0 ? 0 : 1);
      if (w.estun[i] > 0) w.estun[i] -= dt;
      w.ex[i] += (Math.cos(w.eang[i]) * v + w.evx[i]) * dt;
      w.ey[i] += (Math.sin(w.eang[i]) * v + w.evy[i]) * dt;
      w.evx[i] *= Math.exp(-8 * dt);
      w.evy[i] *= Math.exp(-8 * dt);
      if (w.estun[i] <= 0 && d2 < (def.radius + PLAYER_R) ** 2 && hurtPlayer(w, enemyDamage(w, def.damage))) thorns(w, i);
      continue;
    }
    // ladrão: corre para longe do herói e some depois de 25 s (ou se ficar muito longe)
    if (def.behavior === "flee") {
      if (w.t - w.eborn[i] > 30 || d2 > far2 * 1.6) {
        removeEnemy(w, i);
        notice(w, "The thief got away...");
        continue;
      }
      const d = Math.sqrt(d2) || 1;
      const stunned = w.estun[i] > 0;
      if (stunned) w.estun[i] -= dt;
      // foge em ziguezague (o ângulo oscila) para não ser só uma linha reta
      const wob = Math.sin(w.t * 2 + i) * 0.7;
      const ux = -dx / d,
        uy = -dy / d;
      const vx = ux * Math.cos(wob) - uy * Math.sin(wob),
        vy = ux * Math.sin(wob) + uy * Math.cos(wob);
      // perto: foge a toda; longe: só se afasta devagar, provocando
      const scared = d < 380 ? 1 : 0.45;
      const v = stunned ? 0 : def.speed * scared * (w.eflash[i] > 0 ? 0.6 : 1);
      w.ex[i] += (vx * v + w.evx[i]) * dt;
      w.ey[i] += (vy * v + w.evy[i]) * dt;
      w.evx[i] *= Math.exp(-8 * dt);
      w.evy[i] *= Math.exp(-8 * dt);
      continue;
    }
    // muito longe (o herói fugiu): reaparece do outro lado da tela, como no gênero
    if (d2 > far2 && (def.tier === "grunt" || def.tier === "brute")) {
      const [x, y] = offscreen(w);
      w.ex[i] = w.epx[i] = x;
      w.ey[i] = w.epy[i] = y;
      continue;
    }
    const d = Math.sqrt(d2) || 1;
    dx /= d;
    dy /= d;
    // separação: empurra vizinhos sobrepostos (no máximo alguns, para custar pouco)
    let sx = 0,
      sy = 0,
      seen = 0;
    const r = def.radius;
    w.grid.query(w.ex[i], w.ey[i], r * 2, (j) => {
      if (j === i || !w.ealive[j]) return;
      const ox = w.ex[i] - w.ex[j],
        oy = w.ey[i] - w.ey[j];
      const rr = r + enemyDef(w, j).radius;
      const o2 = ox * ox + oy * oy;
      if (o2 < rr * rr && o2 > 0.0001) {
        const o = Math.sqrt(o2);
        sx += (ox / o) * (rr - o);
        sy += (oy / o) * (rr - o);
      }
      return ++seen >= 6;
    });
    const stunned = w.estun[i] > 0;
    if (stunned) w.estun[i] -= dt;
    let slow = stunned ? 0 : w.eflash[i] > 0 ? 0.4 : 1; // tropeça quando apanha
    let speed = def.speed * (1 + (w.stats.curse - 1) * 0.5);
    const beh = def.behavior;
    if (beh === "exploder") {
      if (w.efuse[i] > 0) {
        // pavio aceso: parado, piscando
        w.efuse[i] -= dt;
        slow = 0;
        if (w.efuse[i] <= 0) {
          const x = w.ex[i],
            y = w.ey[i];
          removeEnemy(w, i);
          explodeAt(w, x, y, 64, 30 * hpScale(w.t), enemyDamage(w, def.damage) * 1.6);
          continue;
        }
      } else if (!stunned && d < r + PLAYER_R + 28) {
        w.efuse[i] = 0.7;
        w.events.push("warn");
      }
    } else if (w.efuse[i] > 0) {
      // aviso da investida: parado, mirando
      if (!stunned) w.efuse[i] -= dt;
      slow = 0;
      if (w.efuse[i] <= 0) w.edash[i] = def.tier === "boss" ? 0.5 : 0.55;
    } else if (w.edash[i] > 0) {
      w.edash[i] -= dt;
      if (!stunned) {
        // investida: reto, rápido, na direção marcada
        dx = Math.cos(w.eang[i]);
        dy = Math.sin(w.eang[i]);
        speed = def.tier === "boss" ? 620 : def.tier === "elite" ? 520 : 400;
        slow = 1;
      }
    } else if (beh === "charger" && !stunned) {
      w.eatk[i] -= dt;
      if (w.eatk[i] <= 0 && d < 300 && d > 50) {
        w.eatk[i] = 4 + w.rng.next() * 2.5;
        w.efuse[i] = 0.7;
        w.eang[i] = Math.atan2(dy, dx);
        fx(w, Fx.Telegraph, w.ex[i], w.ey[i], w.eang[i], "#ff8a1f");
      }
    } else if (beh === "ranged") {
      // mantém distância: recua de perto, circula no meio, chega quando longe
      if (d < 170) {
        dx = -dx * 0.8;
        dy = -dy * 0.8;
      } else if (d < 260) {
        const sgn = i & 1 ? 1 : -1;
        const tx = -dy * sgn,
          ty = dx * sgn;
        dx = tx * 0.6;
        dy = ty * 0.6;
      }
    }
    w.ex[i] += (dx * speed * slow + w.evx[i]) * dt + sx * 0.25;
    w.ey[i] += (dy * speed * slow + w.evy[i]) * dt + sy * 0.25;
    const decay = Math.exp(-8 * dt);
    w.evx[i] *= decay;
    w.evy[i] *= decay;

    // toque no herói
    if (!stunned && d < r + PLAYER_R && beh !== "exploder" && hurtPlayer(w, enemyDamage(w, def.damage), w.edash[i] > 0 ? "investida" : def.tier)) thorns(w, i);
  }
}

/** Espinhos: quem encosta no herói leva dano de volta (cresce com o nível). */
function thorns(w: World, i: number) {
  const t = w.stats.thorns;
  if (t <= 0 || !w.ealive[i]) return;
  hurt(w, i, t * (1 + w.player.level * 0.03), w.ex[i] - w.player.x, w.ey[i] - w.player.y, 260, -1);
}

function updatePlayer(w: World, input: Input, dt: number) {
  const p = w.player;
  p.px = p.x;
  p.py = p.y;
  if (input.transform) transform(w);
  let mx = input.mx,
    my = input.my;
  const len = Math.hypot(mx, my);
  p.moving = len > 0.01;
  if (p.moving) {
    mx /= Math.max(1, len);
    my /= Math.max(1, len);
    const n = Math.hypot(mx, my);
    p.faceX = mx / n;
    p.faceY = my / n;
  }
  const v = PLAYER_SPEED * w.stats.moveSpeed;
  p.x += mx * v * dt;
  p.y += my * v * dt;
  // a arena do chefe é uma barreira de ki
  if (w.arena) {
    const ax = p.x - w.arena.x,
      ay = p.y - w.arena.y;
    const ad = Math.hypot(ax, ay);
    const max = w.arena.r - PLAYER_R;
    if (ad > max) {
      p.x = w.arena.x + (ax / ad) * max;
      p.y = w.arena.y + (ay / ad) * max;
    }
  }
  p.invuln -= dt;
  p.hurt += dt;
  p.calm += dt;
  if (w.immortal > 0) w.immortal -= dt;
  if (p.rage > 0) {
    p.rage -= dt;
    if (p.rage <= 0) {
      p.rage = 0;
      recomputeStats(w);
    }
  }
  // Escudo de Ki: recupera uma carga a cada SHIELD_REGEN s até o máximo
  if (p.shield < w.stats.barrier) {
    p.shieldT -= dt;
    if (p.shieldT <= 0) {
      p.shield++;
      p.shieldT = p.shield < w.stats.barrier ? SHIELD_REGEN : 0;
    }
  } else p.shieldT = 0;
  let regen = w.stats.recovery;
  if (hasScroll(w, "espirito") && p.hp < w.stats.maxHp * 0.35) regen += 2;
  if (regen > 0) p.hp = Math.min(w.stats.maxHp, p.hp + regen * dt);
}

function updateGems(w: World, dt: number) {
  const p = w.player;
  const m2 = w.stats.magnet ** 2;
  for (let i = 0; i < MAX_GEMS; i++) {
    if (!w.galive[i]) continue;
    const dx = p.x - w.gx[i],
      dy = p.y - w.gy[i];
    const d2 = dx * dx + dy * dy;
    if (!w.gpull[i] && d2 < m2) w.gpull[i] = 1;
    if (!w.gpull[i]) continue;
    const d = Math.sqrt(d2) || 1;
    if (d < PLAYER_R + 6) {
      w.galive[i] = 0;
      w.gemCount--;
      gainKi(w, 0.0015 * Math.min(10, w.gval[i]));
      if (w.ticks % 2 === 0) w.events.push("gem");
      gainXp(w, w.gval[i]);
      continue;
    }
    const sp = 260 + Math.max(0, 500 - d);
    w.gx[i] += (dx / d) * sp * dt;
    w.gy[i] += (dy / d) * sp * dt;
  }
  for (const it of w.pickups) {
    if (!it.alive) continue;
    const dx = p.x - it.x,
      dy = p.y - it.y;
    if (dx * dx + dy * dy > (PLAYER_R + 16) ** 2) continue;
    it.alive = false;
    switch (it.kind) {
      case "senzu":
        p.hp = Math.min(w.stats.maxHp, p.hp + w.stats.maxHp * 0.3);
        w.events.push("senzu");
        notice(w, "Senzu Bean!");
        break;
      case "carne":
        eat(w, 0.12);
        break;
      case "furia":
        startRage(w, 10);
        break;
      case "barreira":
        addShield(w, 1);
        break;
      case "genki":
        spiritBomb(w);
        break;
      case "bolsa": {
        const z = Math.round(it.value * 25 * w.stats.greed);
        p.zeni += z;
        w.events.push("gold");
        notice(w, `Zeni bag: +${z} Zeni`);
        break;
      }
      case "zeni":
        p.zeni += Math.round(it.value * 10 * w.stats.greed);
        break;
      case "scouter":
        for (let i = 0; i < MAX_GEMS; i++) if (w.galive[i]) w.gpull[i] = 1;
        notice(w, "Scanning Scouter: every orb comes to you!");
        break;
      case "luz":
        for (let i = 0; i < MAX_ENEMIES; i++) if (w.ealive[i] && enemyDef(w, i).tier !== "boss") w.estun[i] = Math.max(w.estun[i], 5);
        w.flash = 0.4;
        w.flashColor = "#ffffff";
        w.events.push("flash");
        notice(w, "Solar Flare! Enemies are blinded.");
        break;
      case "ki":
        gainKi(w, 0.5);
        notice(w, "Ki surge!");
        break;
      case "capsula":
        openCapsule(w, it.value || capsuleRoll(w));
        return; // abriu uma tela: o resto fica para o próximo passo
    }
  }
  // Esferas do Dragão
  for (const b of w.balls) {
    if (b.taken) continue;
    const dx = p.x - b.x,
      dy = p.y - b.y;
    if (dx * dx + dy * dy > (PLAYER_R + 18) ** 2) continue;
    b.taken = true;
    w.ballsFound++;
    w.events.push("ball");
    notice(w, `${b.stars}-Star Ball! (${w.ballsFound}/7)`);
    if (w.ballsFound === 7 && !w.wished && (w.phase === "playing" || w.phase === "levelup")) {
      rollWishes(w);
      w.phase = "wish";
      w.flash = 0.6;
      w.flashColor = "#5fd13a";
    }
  }
}

/** Pergaminhos com efeito periódico: meteoros e kiai. */
function updateScrolls(w: World) {
  if (!w.scrolls.length) return;
  const p = w.player;
  if (hasScroll(w, "meteoros") && w.t >= w.nextMeteor) {
    w.nextMeteor = w.t + 3;
    const i = randomOnScreen(w);
    if (i >= 0) explodeAt(w, w.ex[i], w.ey[i], 70, 40 + 4 * p.level, 0);
  }
  if (hasScroll(w, "kiai") && w.t >= w.nextKiai) {
    w.nextKiai = w.t + 5;
    const r = 130;
    fx(w, Fx.Ring, p.x, p.y, r, "#fffbd0");
    w.grid.query(p.x, p.y, r + 34, (j) => {
      if (!w.ealive[j]) return;
      const dx = w.ex[j] - p.x,
        dy = w.ey[j] - p.y;
      if (dx * dx + dy * dy < r * r) hurt(w, j, 10 + p.level, dx, dy, 520, -1);
    });
  }
}

function checkDeath(w: World) {
  const p = w.player;
  if (p.hp > 0) return;
  if (w.revives > 0) {
    w.revives--;
    p.hp = w.stats.maxHp * 0.5;
    p.invuln = 3;
    w.flash = 0.6;
    w.flashColor = "#5fd13a";
    w.events.push("revive");
    notice(w, "You came back to life!");
    addZone(w, { kind: "shock", slot: 0, x: p.x, y: p.y, angle: 0, len: 0, width: 0, r: 260, life: 0.5, max: 0.5, anchored: true, color: "#5fd13a" });
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (!w.ealive[i]) continue;
      const tier = enemyDef(w, i).tier;
      if (tier === "grunt" || tier === "brute") {
        const dx = w.ex[i] - p.x,
          dy = w.ey[i] - p.y;
        if (dx * dx + dy * dy < 260 * 260) killEnemy(w, i, -1);
      }
    }
    return;
  }
  p.hp = 0;
  w.phase = "dead";
  w.events.push("death");
}

/** Avança a simulação em dt (use STEP). */
export function step(w: World, input: Input, dt = STEP) {
  if (w.phase !== "playing") return;
  if (w.events.length > 256) w.events.length = 0; // ninguém tocando os sons (testes): não acumula
  if (w.hitstop > 0) {
    w.hitstop -= dt;
    w.player.px = w.player.x;
    w.player.py = w.player.y;
    return;
  }
  w.t += dt;
  w.ticks++;
  updatePlayer(w, input, dt);
  updateForm(w, dt);
  spawner(w, dt);
  updateEnemies(w, dt);
  updateEnemyAttacks(w, dt);
  updateHazards(w, dt);
  updateScrolls(w);
  updateTechs(w, dt);
  updateZones(w, dt);
  updateProjectiles(w, dt);
  updateBullets(w, dt);
  updateGems(w, dt);
  for (const n of w.numbers) if (n.alive && (n.t += dt) > 0.7) n.alive = false;
  for (const n of w.notices) n.t += dt;
  if (w.notices.length && w.notices[0].t >= 3) w.notices = w.notices.filter((n) => n.t < 3);
  w.shake = Math.max(0, w.shake - dt);
  if (w.flash > 0) w.flash -= dt;
  checkDeath(w);
  if (w.phase === "playing" && w.bossDefeated && w.t >= w.victoryAt) w.phase = "won";
}


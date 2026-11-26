import assert from "node:assert/strict";
import { test } from "node:test";
import { botInput, botPick } from "./bot";
import { choose, chooseScroll, chooseWish, closeChest, createWorld, MAX_ENEMIES, step, STEP, xpForLevel, type Input, type World } from "./world";

const still: Input = { mx: 0, my: 0 };

/** Resolve telas que pausam a run (nível, cápsula, desejo) como um jogador apressado. */
function settle(w: World) {
  for (let k = 0; k < 50 && w.phase !== "playing" && w.phase !== "dead" && w.phase !== "won"; k++) {
    if (w.phase === "levelup") choose(w, botPick(w));
    else if (w.phase === "chest") closeChest(w);
    else if (w.phase === "wish") chooseWish(w, 0);
    else if (w.phase === "scroll") chooseScroll(w, 0);
  }
}

/** Joga sozinho (bot de kite) e sempre pega a primeira carta. */
function autoplay(w: World, seconds: number, input?: (t: number) => Input) {
  const ticks = Math.round(seconds / STEP);
  for (let i = 0; i < ticks; i++) {
    settle(w);
    if (w.phase === "dead" || w.phase === "won") break;
    step(w, input ? input(w.t) : botInput(w));
  }
}

function snapshot(w: World) {
  return JSON.stringify({ t: w.t.toFixed(3), x: w.player.x.toFixed(3), hp: w.player.hp.toFixed(3), lv: w.player.level, k: w.player.kills, n: w.enemyCount, techs: w.techs.map((t) => `${t.id}${t.level}`) });
}

test("curva de XP sobe por faixas", () => {
  assert.equal(xpForLevel(1), 5);
  assert.equal(xpForLevel(2), 12);
  assert.ok(xpForLevel(20) > xpForLevel(19));
  assert.ok(xpForLevel(41) - xpForLevel(40) > xpForLevel(21) - xpForLevel(20));
});

test("mesma seed e mesmas entradas dão a mesma run", () => {
  const a = createWorld(42),
    b = createWorld(42);
  autoplay(a, 90);
  autoplay(b, 90);
  assert.equal(snapshot(a), snapshot(b));
  const c = createWorld(43);
  autoplay(c, 90);
  assert.notEqual(snapshot(a), snapshot(c));
});

test("Goku começa com Kamehameha e mata, coleta XP e sobe de nível", () => {
  const w = createWorld(1);
  assert.deepEqual(
    w.techs.map((t) => t.id),
    ["kamehameha"],
  );
  autoplay(w, 90);
  assert.ok(w.player.kills > 50, `kills ${w.player.kills}`);
  assert.ok(w.player.level >= 3, `nível ${w.player.level}`);
  assert.ok(w.techs[0].level + w.techs.length + w.passives.length > 3);
});

test("parado e sem upgrades, a horda acaba matando", () => {
  const w = createWorld(7);
  for (let i = 0; i < (8 * 60) / STEP && w.phase !== "dead"; i++) {
    if (w.phase === "levelup") {
      w.pendingLevels = 1;
      // escolhe sempre algo que não é técnica nova: mantém o herói fraco
      const idx = w.offers.findIndex((o) => o.type === "passive");
      choose(w, Math.max(0, idx));
    }
    step(w, still);
  }
  assert.equal(w.phase, "dead");
});

test("estado fica finito e dentro dos limites numa run longa", () => {
  const w = createWorld(99);
  w.player.hp = w.stats.maxHp = 1e9;
  autoplay(w, 6 * 60);
  assert.ok(w.enemyCount <= MAX_ENEMIES);
  let alive = 0;
  for (let i = 0; i < MAX_ENEMIES; i++)
    if (w.ealive[i]) {
      alive++;
      assert.ok(Number.isFinite(w.ex[i]) && Number.isFinite(w.ey[i]) && Number.isFinite(w.ehp[i]));
    }
  assert.equal(alive, w.enemyCount);
  assert.ok(Number.isFinite(w.player.x) && Number.isFinite(w.player.hp));
});

test("500 inimigos: um tick cabe folgado no orçamento de quadro", () => {
  const w = createWorld(5);
  w.player.hp = w.stats.maxHp = 1e9;
  // pula para o fim da saga: horda cheia
  w.t = 13.5 * 60;
  w.nextElite = 99999;
  w.ringsDone = 99;
  autoplay(w, 25);
  const n = w.enemyCount;
  const t0 = performance.now();
  const ticks = 300;
  for (let i = 0; i < ticks; i++) {
    settle(w);
    step(w, { mx: 1, my: 0 });
  }
  const ms = (performance.now() - t0) / ticks;
  assert.ok(n > 300, `só ${n} inimigos`);
  assert.ok(ms < 4, `${ms.toFixed(2)} ms por tick com ${n} inimigos`);
});

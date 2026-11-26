import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAR_ORDER, CHARACTERS } from "../data/characters";
import { SAGA_ORDER, SAGA_LENGTH } from "../data/enemies";
import { PASSIVES } from "../data/passives";
import { TECHNIQUES, type TechId } from "../data/techniques";
import { botInput, botPick } from "./bot";
import {
  candidates,
  lockOffer,
  rollOffers,
  unionsAvailable,
  addHazard,
  addPassive,
  dropGem,
  hurt,
  MAX_GEMS,
  spawnEnemy,
  addTech,
  banish,
  chooseWish,
  chooseScroll,
  closeChest,
  choose,
  createWorld,
  evolvable,
  MAX_ENEMIES,
  openCapsule,
  reroll,
  skip,
  step,
  STEP,
  transform,
  addPickup,
  eat,
  hurtPlayer,
  startRage,
  type World,
} from "./world";
import { SHIELD_REGEN } from "../data/stats";

function settle(w: World) {
  for (let k = 0; k < 50 && w.phase !== "playing" && w.phase !== "dead" && w.phase !== "won"; k++) {
    if (w.phase === "levelup") choose(w, botPick(w));
    else if (w.phase === "chest") closeChest(w);
    else if (w.phase === "wish") chooseWish(w, 0);
    else if (w.phase === "scroll") chooseScroll(w, 0);
  }
}

function run(w: World, seconds: number) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    settle(w);
    if (w.phase === "dead" || w.phase === "won") break;
    step(w, botInput(w));
  }
}

const god = (w: World) => {
  w.immortal = 1e9;
};

test("toda técnica (base, evolução, exclusiva) dispara e fere sem erro", () => {
  for (const id of Object.keys(TECHNIQUES) as TechId[]) {
    const w = createWorld(11);
    god(w);
    w.techs = [];
    addTech(w, id);
    w.t = 120; // horda já formada
    run(w, 25);
    assert.ok(w.techDamage[0] > 0, `${id} não causou dano`);
  }
});

test("Cápsula evolui técnica no máximo com a passiva certa", () => {
  const w = createWorld(3);
  w.techs = [];
  addTech(w, "kamehameha");
  for (let k = 1; k < TECHNIQUES.kamehameha.max; k++) addTech(w, "kamehameha");
  assert.equal(evolvable(w).length, 0, "sem Kaioken ainda não evolui");
  addPassive(w, "kaioken");
  assert.equal(evolvable(w).length, 1);
  openCapsule(w, 1);
  assert.equal(w.techs[0].id, "kamehameha10");
  assert.equal(w.phase, "chest");
  closeChest(w);
  assert.equal(w.phase, "playing");
});

test("toda evolução tem caminho (técnica base + passiva existente)", () => {
  const evos = Object.values(TECHNIQUES).filter((d) => d.from);
  assert.equal(evos.length, 28);
  // toda técnica base (fora as exclusivas) evolui, e cada passiva evolui no máximo uma técnica
  const bases = Object.values(TECHNIQUES).filter((d) => !d.from && !d.union && !d.owner);
  assert.ok(bases.every((d) => d.evolvesTo));
  const withs = bases.map((d) => d.evolvesWith);
  assert.equal(new Set(withs).size, withs.length);
  for (const e of evos) {
    const base = TECHNIQUES[e.from!];
    assert.equal(base.evolvesTo, e.id);
    assert.ok(base.evolvesWith && PASSIVES[base.evolvesWith], `${e.id} sem passiva`);
  }
});

test("reroll, pular e banir gastam usos da loja", () => {
  const w = createWorld(4, { shop: { reroll: 1, pular: 1, banir: 1 } });
  w.techs = [];
  addTech(w, "rajada");
  w.player.xp = 1e4;
  run(w, 0.1);
  // força a tela de nível
  w.pendingLevels = 3;
  w.phase = "levelup";
  w.offers = [{ type: "tech", id: "kienzan", level: 1 }, { type: "passive", id: "potara", level: 1 }];
  assert.ok(banish(w, 0));
  assert.ok(w.banished.includes("kienzan"));
  assert.ok(!banish(w, 0), "sem usos");
  assert.ok(reroll(w));
  assert.ok(!reroll(w));
  assert.ok(skip(w));
  assert.equal(w.pendingLevels, 2);
});

test("transformação exige nível e ki cheio, e acaba sozinha", () => {
  const w = createWorld(5);
  w.ki = 1;
  assert.equal(transform(w), false, "nível 1 não transforma");
  w.player.level = 10;
  assert.equal(transform(w), true);
  assert.equal(w.form, 1);
  const might = w.stats.might;
  assert.ok(might > 1.3);
  god(w);
  run(w, 20);
  assert.equal(w.form, 0);
  assert.ok(w.transformCd > 0);
});

test("7 esferas chamam o Shenlong e o desejo se realiza", () => {
  const w = createWorld(6, { shop: { lendarios: 1 } });
  god(w);
  w.t = 800;
  run(w, 1);
  assert.equal(w.balls.length, 7);
  for (const b of w.balls) {
    w.player.x = b.x;
    w.player.y = b.y;
    step(w, { mx: 0, my: 0 });
    settle_noWish(w);
  }
  assert.equal(w.ballsFound, 7);
  assert.equal(w.phase, "wish");
  assert.equal(w.wishOptions.length, 3);
  chooseWish(w, 0);
  assert.ok(w.wished);
  assert.notEqual(w.phase, "wish");
});

function settle_noWish(w: World) {
  for (let k = 0; k < 50 && (w.phase === "levelup" || w.phase === "chest"); k++) {
    if (w.phase === "levelup") choose(w, 0);
    else closeChest(w);
  }
}

test("cada saga chega ao chefe aos 15:00, e matar o chefe vence a run", () => {
  for (const saga of SAGA_ORDER) {
    const w = createWorld(21, { saga });
    god(w);
    w.t = SAGA_LENGTH - 1;
    w.nextElite = 1e9;
    w.ringsDone = 9;
    run(w, 2);
    assert.ok(w.boss >= 0, `${saga}: sem chefe`);
    assert.ok(w.arena);
    // o chefe ataca: há tiros inimigos no ar em algum momento
    let shots = 0;
    for (let k = 0; k < 600 && w.boss >= 0; k++) {
      settle(w);
      step(w, botInput(w));
      shots += w.balive.reduce((a, b) => a + b, 0);
    }
    assert.ok(shots > 0, `${saga}: chefe não atirou`);
    w.ehp[w.boss] = 1;
    // qualquer golpe acaba com ele
    for (let k = 0; k < 3600 && w.phase !== "won"; k++) {
      settle(w);
      step(w, botInput(w));
      if (w.boss >= 0) w.ehp[w.boss] = Math.min(w.ehp[w.boss], 1);
    }
    assert.equal(w.phase, "won", `${saga}: não venceu`);
    assert.ok(w.bossDefeated);
  }
});

test("todos os personagens começam com a técnica certa e jogam 3 min", () => {
  for (const char of CHAR_ORDER) {
    const w = createWorld(31, { char });
    assert.equal(w.techs[0].id, CHARACTERS[char].start);
    run(w, 180);
    assert.ok(w.player.kills > 20, `${char}: ${w.player.kills} derrotas`);
    assert.ok(w.enemyCount <= MAX_ENEMIES);
  }
});

test("run completa do Goku com o bot imortal termina vencendo", () => {
  const w = createWorld(77);
  god(w);
  run(w, SAGA_LENGTH + 240);
  assert.equal(w.phase, "won", `fase ${w.phase} em ${w.t.toFixed(0)} s, chefe hp ${w.boss >= 0 ? w.ehp[w.boss].toFixed(0) : "-"}`);
  assert.ok(w.player.level > 30, `nível ${w.player.level}`);
});

test("Pergaminho Secreto aparece aos 4:00 e o escolhido vale na run", () => {
  const w = createWorld(21);
  god(w);
  while (w.phase !== "scroll" && w.t < 300) {
    if (w.phase === "levelup") choose(w, 0);
    else if (w.phase === "chest") closeChest(w);
    else if (w.phase === "wish") chooseWish(w, 0);
    step(w, botInput(w));
  }
  assert.equal(w.phase, "scroll");
  assert.ok(w.t >= 240 && w.t < 241, `abriu em ${w.t}`);
  assert.equal(w.scrollOptions.length, 3);
  const id = w.scrollOptions[0];
  chooseScroll(w, 0);
  assert.deepEqual(w.scrolls, [id]);
  assert.notEqual(w.phase, "scroll");
});

test("Pergaminhos de atributo mudam os atributos", () => {
  const w = createWorld(1);
  const hp = w.stats.maxHp,
    might = w.stats.might;
  w.phase = "scroll";
  w.scrollOptions = ["oozaru"];
  chooseScroll(w, 0);
  assert.ok(w.stats.maxHp < hp && w.stats.might > might);
});

test("kamikaze para perto do herói, explode e fere; morto antes, fere só os vizinhos", () => {
  const w = createWorld(2);
  w.techs = [];
  const i = spawnEnemy(w, "saibamanBomba", w.player.x + 30, w.player.y);
  const hp = w.player.hp;
  for (let k = 0; k < 90 && w.ealive[i]; k++) step(w, { mx: 0, my: 0 });
  assert.equal(w.ealive[i], 0, "não explodiu");
  assert.ok(w.player.hp < hp, "a explosão não feriu o herói");
  assert.ok((w.dmgBy.kamikaze ?? 0) > 0);

  const v = createWorld(3);
  v.techs = [];
  const a = spawnEnemy(v, "saibamanBomba", 400, 0);
  const b = spawnEnemy(v, "soldado", 420, 0);
  v.grid.clear();
  v.grid.insert(a, v.ex[a], v.ey[a]);
  v.grid.insert(b, v.ex[b], v.ey[b]);
  const before = v.ehp[b];
  hurt(v, a, 999, 1, 0, 0, -1);
  assert.ok(!v.ealive[b] || v.ehp[b] < before, "a explosão não feriu o vizinho");
});

test("laser e meteoro avisam antes e só acertam quem fica na área", () => {
  const w = createWorld(4);
  w.techs = [];
  addHazard(w, { kind: "meteor", x: w.player.x, y: w.player.y, angle: 0, len: 0, r: 50, warn: 0.5, life: 0.2, dmg: 30, color: "#f00" });
  const hp = w.player.hp;
  for (let k = 0; k < 20; k++) step(w, { mx: 0, my: 0 });
  assert.equal(w.player.hp, hp, "acertou durante o aviso");
  for (let k = 0; k < 30; k++) step(w, { mx: 0, my: 0 });
  assert.ok(w.player.hp < hp, "meteoro não acertou");

  const v = createWorld(5);
  v.techs = [];
  addHazard(v, { kind: "laser", x: v.player.x - 200, y: v.player.y, angle: 0, len: 900, r: 16, warn: 0.6, life: 0.3, dmg: 30, color: "#f00" });
  const hp2 = v.player.hp;
  for (let k = 0; k < 80; k++) step(v, { mx: 0, my: 1 }); // sai da linha durante o aviso
  assert.equal(v.player.hp, hp2, "o laser acertou quem saiu da linha");
});

test("carta dourada sobe dois níveis", () => {
  const w = createWorld(6);
  const lv = w.techs[0].level;
  w.phase = "levelup";
  w.pendingLevels = 1;
  w.offers = [{ type: "tech", id: w.techs[0].id, level: lv + 2, gold: true }];
  choose(w, 0);
  assert.equal(w.techs[0].level, lv + 2);
});

test("orbs no limite: o XP novo continua perto da ação", () => {
  const w = createWorld(7);
  for (let i = 0; i < MAX_GEMS; i++) dropGem(w, 5000 + i, 5000, 1);
  assert.equal(w.gemCount, MAX_GEMS);
  dropGem(w, w.player.x + 10, w.player.y, 50);
  let near = 0;
  for (let i = 0; i < MAX_GEMS; i++) if (Math.abs(w.gx[i] - w.player.x) < 20 && Math.abs(w.gy[i] - w.player.y) < 20) near += w.gval[i];
  assert.ok(near >= 50, "o XP sumiu longe");
});

test("Modo Pesadelo: inimigos com mais HP", () => {
  const a = createWorld(8),
    b = createWorld(8, { nightmare: true });
  const i = spawnEnemy(a, "soldado", 300, 0),
    j = spawnEnemy(b, "soldado", 300, 0);
  assert.ok(b.ehp[j] > a.ehp[i] * 1.4);
});

test("Rosquinha Galáctica puxa a horda para o centro", () => {
  const w = createWorld(9);
  god(w);
  w.techs = [];
  addTech(w, "rosquinha");
  w.t = 120;
  run(w, 2);
  const i = spawnEnemy(w, "soldado", w.player.x + 300, w.player.y);
  w.zones[0].alive = true;
  Object.assign(w.zones[0], { kind: "vortex", slot: 0, x: w.player.x + 260, y: w.player.y, r: 70, life: 2, max: 2, anchored: false });
  const d0 = Math.abs(w.ex[i] - (w.player.x + 260));
  for (let k = 0; k < 20; k++) step(w, { mx: 0, my: 0 });
  assert.ok(!w.ealive[i] || Math.abs(w.ex[i] - (w.player.x + 260)) < d0, "a rosquinha não puxou");
});

test("União: duas técnicas no nível 5 viram uma e liberam um espaço", () => {
  const w = createWorld(31);
  w.techs = [];
  for (let k = 0; k < 5; k++) {
    addTech(w, "kamehameha");
    addTech(w, "masenko");
  }
  addTech(w, "rajada");
  assert.ok(unionsAvailable(w).includes("paiEFilho"));
  w.phase = "levelup";
  w.pendingLevels = 1;
  w.offers = [{ type: "union", id: "paiEFilho" }];
  choose(w, 0);
  assert.deepEqual(
    w.techs.map((t) => t.id),
    ["paiEFilho", "rajada"],
  );
  assert.deepEqual(w.unions, ["paiEFilho"]);
  run(w, 5); // a união e a técnica que mudou de espaço seguem funcionando
  assert.ok(w.techDamage[0] > 0 && w.techDamage[1] > 0);
});

test("Pacto: ganho e custo valem; Pacto do Imperador sobe as técnicas", () => {
  const w = createWorld(32);
  const hp = w.stats.maxHp,
    lv = w.techs[0].level;
  w.phase = "levelup";
  w.pendingLevels = 1;
  w.offers = [{ type: "pact", id: "freeza" }];
  choose(w, 0);
  assert.equal(w.techs[0].level, lv + 1);
  assert.ok(w.stats.maxHp < hp);
});

test("Pacto/item que abre Cápsula: a Cápsula vem antes e os níveis seguem depois", () => {
  const w = createWorld(33);
  w.phase = "levelup";
  w.pendingLevels = 2;
  w.offers = [{ type: "item", id: "capsula" }];
  choose(w, 0);
  assert.equal(w.phase, "chest");
  closeChest(w);
  assert.equal(w.phase, "levelup");
  assert.equal(w.pendingLevels, 1);
});

test("Conjunto completo liga o bônus", () => {
  const w = createWorld(34);
  const might = w.stats.might;
  addPassive(w, "kaioken");
  addPassive(w, "gravidade");
  const partial = w.stats.might;
  addPassive(w, "grandeKaioh");
  assert.ok(w.setsDone.includes("kaioh"));
  assert.ok(w.stats.might - partial > 0.15 && partial > might);
});

test("Trava: a carta travada volta na próxima tela de nível", () => {
  const w = createWorld(35);
  w.phase = "levelup";
  w.pendingLevels = 2;
  rollOffers(w);
  const target = w.offers[w.offers.length - 1];
  assert.ok(lockOffer(w, w.offers.length - 1));
  assert.equal(w.locks, 0);
  choose(w, 0 === w.offers.length - 1 ? 1 : 0);
  if ((w.phase as string) === "chest") closeChest(w);
  assert.equal(w.phase, "levelup");
  assert.equal(w.offers[0].type, target.type);
  assert.equal((w.offers[0] as { id?: string }).id, (target as { id?: string }).id);
});

test("passivas exclusivas só aparecem para o dono", () => {
  const g = createWorld(36, { char: "goku" }),
    v = createWorld(36, { char: "vegeta" });
  const ids = (w: World) => candidates(w).filter((o) => o.type === "passive").map((o) => (o as { id: string }).id);
  assert.ok(ids(g).includes("instintoLuta") && !ids(g).includes("principe"));
  assert.ok(ids(v).includes("principe") && !ids(v).includes("instintoLuta"));
});

test("uniões novas: receitas existem e são técnicas base", () => {
  for (const id of ["duplaGrou", "loboFantasma", "absorcaoMajin", "omegaBlaster"] as TechId[]) {
    const d = TECHNIQUES[id];
    assert.ok(d.union && d.union.every((part) => TECHNIQUES[part] && !TECHNIQUES[part].from && !TECHNIQUES[part].owner), id);
  }
});

test("técnicas exclusivas novas só aparecem para o dono", () => {
  const techIds = (w: World) => candidates(w).filter((o) => o.type === "tech").map((o) => (o as { id: string }).id);
  const g = createWorld(37, { char: "goku" }),
    p = createWorld(37, { char: "piccolo" });
  assert.ok(techIds(g).includes("punhoDragao") && !techIds(g).includes("granadaLuz"));
  assert.ok(techIds(p).includes("granadaLuz") && !techIds(p).includes("punhoDragao"));
});

test("Ritual do Velho Kaioshin sobe as passivas", () => {
  const w = createWorld(38);
  addPassive(w, "kaioken");
  addPassive(w, "chipGero");
  w.phase = "levelup";
  w.pendingLevels = 1;
  w.offers = [{ type: "pact", id: "velhoKaioshin" }];
  choose(w, 0);
  assert.deepEqual(
    w.passives.map((p) => p.level),
    [2, 2],
  );
});

test("itens novos: Dende cura tudo, Baba dá usos, Sala do Tempo sobe uma técnica", () => {
  const w = createWorld(39);
  const lv = w.techs[0].level;
  w.player.hp = 1;
  const rr = w.rerolls,
    ll = w.locks;
  for (const id of ["dende", "baba", "salaUmDia"] as const) {
    w.phase = "levelup";
    w.pendingLevels = 1;
    w.offers = [{ type: "item", id }];
    choose(w, 0);
  }
  assert.equal(w.player.hp, w.stats.maxHp);
  assert.equal(w.rerolls, rr + 2);
  assert.equal(w.locks, ll + 1);
  assert.equal(w.techs[0].level, lv + 1);
});

test("Imagem Residual deixa zonas para trás e fere quem pisa", () => {
  const w = createWorld(40);
  god(w);
  w.techs = [];
  addTech(w, "zanzoken");
  w.t = 120;
  run(w, 6);
  assert.ok(w.zones.some((z) => z.alive && z.kind === "pool"));
  assert.ok(w.techDamage[0] > 0);
});

/* ---------- §23: drops, interações, atributos novos ---------- */

test("Escudo de Ki anula um golpe e recarrega", () => {
  const w = createWorld(50, { shop: { escudo: 1 } });
  assert.equal(w.player.shield, 1);
  const hp = w.player.hp;
  assert.equal(hurtPlayer(w, 30), true);
  assert.equal(w.player.hp, hp);
  assert.equal(w.player.shield, 0);
  assert.equal(w.shieldBlocks, 1);
  w.player.invuln = 0;
  hurtPlayer(w, 30);
  assert.ok(w.player.hp < hp);
  w.immortal = 1e9;
  w.techs = [];
  run(w, SHIELD_REGEN + 1);
  assert.equal(w.player.shield, 1);
});

test("Espinhos ferem quem encosta no herói", () => {
  const w = createWorld(51, { shop: { espinhos: 3 } });
  w.techs = [];
  const i = spawnEnemy(w, "brutamontes", w.player.x + 5, w.player.y);
  const hp = w.ehp[i];
  w.player.invuln = 0;
  step(w, { mx: 0, my: 0 });
  assert.ok(w.ehp[i] < hp || !w.ealive[i]);
});

test("tanque de combustível explode e derruba a horda em volta", () => {
  const w = createWorld(52);
  w.techs = [];
  const b = spawnEnemy(w, "barril", 300, 0);
  for (let k = 0; k < 8; k++) spawnEnemy(w, "soldado", 300 + Math.cos(k) * 50, Math.sin(k) * 50);
  w.grid.clear();
  for (let i = 0; i < MAX_ENEMIES; i++) if (w.ealive[i]) w.grid.insert(i, w.ex[i], w.ey[i]);
  const kills = w.player.kills;
  hurt(w, b, 5, 0, 0, 0, -1);
  assert.equal(w.player.kills - kills, 8);
  assert.equal(w.bestChain, 8);
});

test("ladrão foge, e derrotado solta Cápsula e bolsa de Zeni", () => {
  const w = createWorld(53);
  god(w);
  w.techs = [];
  const i = spawnEnemy(w, "ladrao", w.player.x + 100, w.player.y);
  const d0 = Math.hypot(w.ex[i] - w.player.x, w.ey[i] - w.player.y);
  run(w, 1);
  assert.ok(Math.hypot(w.ex[i] - w.player.x, w.ey[i] - w.player.y) > d0);
  hurt(w, i, 1e6, 0, 0, 0, -1);
  assert.equal(w.thievesCaught, 1);
  assert.ok(w.pickups.some((p) => p.alive && p.kind === "capsula"));
  assert.ok(w.pickups.some((p) => p.alive && p.kind === "bolsa"));
});

test("Largada abre a run com níveis para escolher", () => {
  const w = createWorld(54, { shop: { inicio: 2 } });
  assert.equal(w.phase, "levelup");
  assert.equal(w.player.level, 3);
  assert.ok(w.offers.length >= 3);
  settle(w);
  assert.equal(w.phase, "playing");
});

test("comida cura mais com Apetite; Kaioken temporário sobe o dano e acaba", () => {
  const a = createWorld(55),
    b = createWorld(55, { shop: { apetite: 3 } });
  for (const w of [a, b]) {
    w.player.hp = 1;
    eat(w, 0.12);
  }
  assert.ok(b.player.hp > a.player.hp);
  const w = createWorld(56);
  god(w);
  const m = w.stats.might;
  startRage(w, 2);
  assert.ok(w.stats.might > m * 1.3);
  run(w, 3);
  assert.ok(Math.abs(w.stats.might - m) < 1e-9);
});

test("dano extra em elites e chefes só vale para eles", () => {
  const w = createWorld(57, { shop: { gigante: 5 } });
  w.stats.crit = 0;
  const e = spawnEnemy(w, "recoome", 400, 0),
    g = spawnEnemy(w, "soldado", -400, 0);
  w.ehp[g] = w.emax[g] = 1e6;
  const he = w.ehp[e],
    hg = w.ehp[g];
  hurt(w, e, 10, 0, 0, 0, -1);
  hurt(w, g, 10, 0, 0, 0, -1);
  assert.ok(he - w.ehp[e] > (hg - w.ehp[g]) * 1.25);
});

test("o chefe ganha HP com o nível do herói", () => {
  const a = createWorld(58),
    b = createWorld(58);
  b.player.level = 70;
  const i = spawnEnemy(a, "freeza", 0, -300),
    j = spawnEnemy(b, "freeza", 0, -300);
  assert.ok(b.emax[j] > a.emax[i] * 2.5);
});

test("com o chão cheio de itens, a Cápsula de elite ainda aparece", () => {
  const w = createWorld(59);
  for (let k = 0; k < 80; k++) addPickup(w, "carne", 1000 + k, 0, 1);
  assert.ok(w.pickups.every((p) => p.alive));
  addPickup(w, "capsula", 10, 10, 0);
  assert.ok(w.pickups.some((p) => p.kind === "capsula"));
  for (let k = 0; k < 80; k++) addPickup(w, "carne", 2000 + k, 0, 1);
  assert.ok(w.pickups.some((p) => p.kind === "capsula"));
});

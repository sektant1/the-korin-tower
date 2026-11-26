// Balanceamento headless: roda uma run com o bot e imprime um resumo por minuto.
// Uso: npx tsx scripts/survivors/balance.ts [seed] [personagem] [saga] [mortal] [loja em JSON]
import { botInput, botPick } from "../../src/components/survivors/sim/bot";
import { choose, chooseScroll, chooseWish, closeChest, createWorld, step, STEP, type World } from "../../src/components/survivors/sim/world";
import { TECHNIQUES } from "../../src/components/survivors/data/techniques";
const seed = Number(process.argv[2] || 77), char = (process.argv[3] || "goku") as any, saga = (process.argv[4] || "freeza") as any, godMode = process.argv[5] !== "mortal";
const w = createWorld(seed, { char, saga, shop: process.argv[6] ? JSON.parse(process.argv[6]) : {} });
if (godMode) w.immortal = 1e9;
let last = 0, lastDmg = 0;
for (let i = 0; i < (20 * 60) / STEP; i++) {
  for (let k = 0; k < 50 && !["playing", "dead", "won"].includes(w.phase); k++) {
    if (w.phase === "levelup") choose(w, process.env.PICK0 ? 0 : botPick(w)); else if (w.phase === "chest") closeChest(w); else if (w.phase === "scroll") chooseScroll(w, 0); else chooseWish(w, 0);
  }
  if (w.phase === "dead" || w.phase === "won") break;
  step(w, botInput(w));
  if (w.t - last >= 60) {
    last = w.t;
    const dmg = w.techDamage.reduce((a, b) => a + b, 0);
    console.log(`${(w.t / 60).toFixed(0)}m lv${w.player.level} hp${w.player.hp.toFixed(0)} kills${w.player.kills} n${w.enemyCount} dps${((dmg - lastDmg) / 60).toFixed(0)} boss${w.boss >= 0 ? w.ehp[w.boss].toFixed(0) : "-"} ki${w.ki.toFixed(2)} form${w.maxForm} balls${w.ballsFound} ${w.techs.map((t) => t.id + t.level).join(",")} | ${w.passives.map((p) => p.id + p.level).join(",")}`);
    lastDmg = dmg;
  }
}
console.log("END", w.phase, w.t.toFixed(0), "evolved", w.evolved.join(","), "wish", w.wished, "scrolls", w.scrolls.join(","), JSON.stringify(w.dmgBy));

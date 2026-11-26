// Dá para pegar o ladrão? Bot até ele aparecer, depois persegue. Uso: npx tsx scripts/survivors/thief.ts [seeds] [loja JSON]
import { botInput, botPick } from "../../src/components/survivors/sim/bot";
import { choose, chooseScroll, chooseWish, closeChest, createWorld, enemyDef, step, MAX_ENEMIES, STEP, THIEF_AT } from "../../src/components/survivors/sim/world";
const seeds = Number(process.argv[2] || 6);
const shop = process.argv[3] ? JSON.parse(process.argv[3]) : {};
for (const at of THIEF_AT.slice(0, 2)) {
  let caught = 0;
  for (let s = 1; s <= seeds; s++) {
    const w = createWorld(s, { shop });
    w.immortal = 1e9;
    while (w.t < at + 30 && w.phase !== "won") {
      for (let k = 0; k < 50 && w.phase !== "playing"; k++) {
        if (w.phase === "levelup") choose(w, botPick(w)); else if (w.phase === "chest") closeChest(w); else if (w.phase === "scroll") chooseScroll(w, 0); else chooseWish(w, 0);
      }
      let input = botInput(w);
      if (w.t >= at) {
        for (let i = 0; i < MAX_ENEMIES; i++) if (w.ealive[i] && enemyDef(w, i).id === "ladrao") {
          const dx = w.ex[i] - w.player.x, dy = w.ey[i] - w.player.y, d = Math.hypot(dx, dy) || 1;
          input = { mx: dx / d, my: dy / d };
        }
      }
      step(w, input, STEP);
      if (w.thievesCaught) break;
    }
    caught += w.thievesCaught;
  }
  console.log(`ladrão em ${at}s: pego em ${caught}/${seeds}`);
}

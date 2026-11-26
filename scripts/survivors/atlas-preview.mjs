// Confere o atlas: uma linha por sprite com os quadros de idle e move, sobre fundo cinza.
// Uso: node scripts/survivors/atlas-preview.mjs <saída.png>  (imprime índice → sprite)
import fs from "node:fs";
import sharp from "sharp";
const dir = "public/assets/survivors/";
const atlas = JSON.parse(fs.readFileSync(dir + "atlas.json", "utf8"));
const pages = atlas.images.map((f) => dir + f);
const keys = Object.keys(atlas.sprites);
const COLS = 4, CELL = 110, ROWH = 100;
const comps = [];
let i = 0;
for (const k of keys) {
  const s = atlas.sprites[k];
  const list = [...(s.anims.idle?.frames ?? []).slice(0, 4), ...(s.anims.move?.frames ?? []).slice(0, 2), ...(s.anims.cast?.frames ?? []).slice(0, 1)];
  const col = i % COLS, row = Math.floor(i / COLS);
  list.forEach((f, j) => {
    comps.push({ input: pages[f[4] ?? s.anims.idle.img], extract: f, left: col * CELL * 3 + j * 46, top: row * ROWH + (ROWH - f[3]) - 4 });
  });
  i++;
}
const W = COLS * CELL * 3, H = Math.ceil(keys.length / COLS) * ROWH;
const bufs = await Promise.all(comps.map(async (c) => ({ input: await sharp(c.input).extract({ left: c.extract[0], top: c.extract[1], width: c.extract[2], height: c.extract[3] }).png().toBuffer(), left: c.left, top: c.top })));
await sharp({ create: { width: W, height: H, channels: 4, background: "#3c3c48" } }).composite(bufs).png().toFile(process.argv[2]);
console.log(keys.map((k, n) => `${n}:${k}`).join(" "));

// Uso: node scripts/survivors/inspect.mjs scratch/survivors-sheets/hd_goku.png [faixa px=900]
// Gera prévias numeradas em scratch/survivors-sheets/preview/ para escolher os quadros do anims.json.
import fs from "node:fs";
import path from "node:path";
import { components, keyOut, loadSheet, preview } from "./sheet-lib.mjs";

const file = process.argv[2];
const band = Number(process.argv[3] || 900);
const img = await loadSheet(file);
keyOut(img);
const boxes = components(img, { gap: Number(process.argv[4] ?? 2), minArea: Number(process.argv[5] ?? 30) });
const dir = path.join(path.dirname(file), "preview");
fs.mkdirSync(dir, { recursive: true });
const base = path.basename(file).replace(/\.\w+$/, "");
for (let from = 0, k = 0; from < img.h; from += band, k++) await preview(img, boxes, path.join(dir, `${base}-${k}.png`), { from, to: Math.min(img.h, from + band) });
console.log(base, img.w, "x", img.h, "frames:", boxes.length);
console.log(boxes.slice(0, 400).map((b, i) => `${i}:${b.x},${b.y},${b.w}x${b.h}`).join(" "));

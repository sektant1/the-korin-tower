// Monta o atlas de sprites do Saiyajin Survivors (GDD §12).
//   1. Baixe as folhas do Sprite Database para scratch/survivors-sheets/ (ver docs/gdd §16).
//   2. node scripts/survivors/inspect.mjs <folha> [faixa] [gap]  → prévias numeradas.
//   3. Anote os quadros de cada animação em scripts/survivors/anims.json.
//   4. node scripts/survivors/build-atlas.mjs  → public/assets/survivors/atlas.json + atlas-N.png
// Cada quadro sai sem fundo, redimensionado para a altura de exibição do sprite, e as páginas do
// atlas são empacotadas em prateleiras. Os sprites olham para a direita (o jogo espelha).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { components, keyOut, loadSheet } from "./sheet-lib.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const SHEETS = path.join(ROOT, "scratch/survivors-sheets");
const OUT = path.join(ROOT, "public/assets/survivors");
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/survivors/anims.json"), "utf8"));
const PAGE = 2048;
const PAD = 1;

/** Corta um retângulo de um RGBA cru. */
function crop(img, b) {
  const out = Buffer.alloc(b.w * b.h * 4);
  for (let y = 0; y < b.h; y++) img.data.copy(out, y * b.w * 4, ((b.y + y) * img.w + b.x) * 4, ((b.y + y) * img.w + b.x + b.w) * 4);
  return { data: out, w: b.w, h: b.h };
}

/** Quadros de uma animação WebP/GIF animada (cada página é um quadro). */
async function animatedFrames(file) {
  const meta = await sharp(file, { animated: true }).metadata();
  const ph = meta.pageHeight ?? meta.height;
  const { data, info } = await sharp(file, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frames = [];
  for (let k = 0; k < (meta.pages ?? 1); k++) {
    const raw = { data: data.subarray(k * ph * info.width * 4, (k + 1) * ph * info.width * 4), w: info.width, h: ph };
    // apara a sobra transparente
    let x0 = raw.w, y0 = raw.h, x1 = -1, y1 = -1;
    for (let y = 0; y < raw.h; y++)
      for (let x = 0; x < raw.w; x++)
        if (raw.data[(y * raw.w + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    frames.push(crop({ ...raw, data: Buffer.from(raw.data) }, { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }));
  }
  return frames;
}

const sheetCache = new Map();
async function sheetFrames(name, gap, minArea) {
  const key = `${name}:${gap}:${minArea}`;
  if (!sheetCache.has(key)) {
    const img = await loadSheet(path.join(SHEETS, name));
    keyOut(img);
    sheetCache.set(key, { img, boxes: components(img, { gap, minArea }) });
  }
  return sheetCache.get(key);
}

/** Redimensiona um quadro (fator único por sprite) e aplica a troca de cor. */
async function finish(frame, k, s) {
  const w = Math.max(1, Math.round(frame.w * k)),
    h = Math.max(1, Math.round(frame.h * k));
  let img = sharp(frame.data, { raw: { width: frame.w, height: frame.h, channels: 4 } }).resize(w, h, { kernel: k >= 1 ? "nearest" : "mitchell" });
  if (s.hue || s.saturation || s.brightness) img = img.modulate({ hue: s.hue ?? 0, saturation: s.saturation ?? 1, brightness: s.brightness ?? 1 });
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // alpha binário: pixel art não tem meio-termo (evita franja do redimensionamento)
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0;
  // hairBlack: [matiz mín, matiz máx] — pinta de preto-azulado só os pixels amarelos (cabelo de
  // Super Saiyajin) para fazer a forma base a partir de uma folha que só tem a forma SSJ
  if (s.hairBlack) {
    const [h0, h1, top = 0.34] = s.hairBlack;
    // só a parte de cima do quadro: os reflexos amarelos da roupa ficam como estão
    const limit = Math.round(info.height * top) * info.width * 4;
    for (let i = 0; i < limit; i += 4) {
      if (!data[i + 3]) continue;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (mx === 0 || d / mx < 0.1) continue;
      let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
      if (h < h0 || h > h1) continue;
      // brilho do cabelo vira tons de 34..130 (preto com reflexo azulado, como no anime)
      const v = 34 + Math.round(mx * mx * mx * 96);
      data[i] = v * 0.72;
      data[i + 1] = v * 0.8;
      data[i + 2] = Math.min(255, v * 1.3);
    }
  }
  return { data, w: info.width, h: info.height };
}

const frames = []; // { sprite, anim, data, w, h }
const out = { images: [], sprites: {} };

for (const [key, s] of Object.entries(spec.sprites)) {
  let pool;
  if (s.animated) pool = await animatedFrames(path.join(ROOT, s.animated));
  else {
    const { img, boxes } = await sheetFrames(s.sheet, s.gap ?? 2, s.minArea ?? 30);
    // cropBottom: corta linhas de baixo (ex.: a plataforma da intro do Goku base)
    pool = boxes.map((b) => crop(img, s.cropBottom ? { ...b, h: Math.max(1, b.h - s.cropBottom) } : b));
  }
  const anims = s.animated ? { idle: pool.map((_, i) => i) } : s.anims;
  // escala: a altura média do idle vira a altura de exibição pedida
  const idle = anims.idle.map((i) => pool[i]).filter(Boolean);
  if (!idle.length) throw new Error(`${key}: idle sem quadros válidos`);
  const k = s.height / (idle.reduce((a, f) => a + f.h, 0) / idle.length);
  out.sprites[key] = { scale: 1, anims: {} };
  for (const [anim, list] of Object.entries(anims)) {
    const fps = s.fps?.[anim] ?? (anim === "move" ? 10 : anim === "idle" ? 6 : 8);
    const done = [];
    for (const i of list) {
      if (!pool[i]) throw new Error(`${key}.${anim}: quadro ${i} não existe (${pool.length} quadros)`);
      const f = await finish(pool[i], k, s);
      frames.push({ sprite: key, anim, ...f });
      done.push(frames.length - 1);
    }
    out.sprites[key].anims[anim] = { fps, idx: done };
  }
}

// empacota em prateleiras, do mais alto para o mais baixo
const order = frames.map((_, i) => i).sort((a, b) => frames[b].h - frames[a].h);
const pages = [];
let page = null;
for (const i of order) {
  const f = frames[i];
  if (!page || page.x + f.w + PAD > PAGE) {
    if (page && page.y + page.shelf + f.h + PAD <= PAGE) {
      page.y += page.shelf + PAD;
      page.x = 0;
      page.shelf = 0;
    } else {
      page = { x: 0, y: 0, shelf: 0, items: [] };
      pages.push(page);
    }
  }
  f.page = pages.length - 1;
  f.x = page.x;
  f.y = page.y;
  page.items.push(f);
  page.x += f.w + PAD;
  page.shelf = Math.max(page.shelf, f.h);
}

fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) if (/^atlas-\d+\.png$/.test(old)) fs.rmSync(path.join(OUT, old));
for (let p = 0; p < pages.length; p++) {
  const h = pages[p].y + pages[p].shelf;
  const composites = pages[p].items.map((f) => ({ input: f.data, raw: { width: f.w, height: f.h, channels: 4 }, left: f.x, top: f.y }));
  const name = `atlas-${p}.png`;
  await sharp({ create: { width: PAGE, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(OUT, name));
  out.images.push(name);
}
for (const s of Object.values(out.sprites))
  for (const a of Object.values(s.anims)) {
    a.img = frames[a.idx[0]].page;
    // [x, y, w, h, página]: os quadros de uma animação podem cair em páginas diferentes
    a.frames = a.idx.map((i) => [frames[i].x, frames[i].y, frames[i].w, frames[i].h, frames[i].page]);
    delete a.idx;
  }
fs.writeFileSync(path.join(OUT, "atlas.json"), JSON.stringify(out));
console.log(`${Object.keys(out.sprites).length} sprites, ${frames.length} quadros, ${pages.length} página(s)`);

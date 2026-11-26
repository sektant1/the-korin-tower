// Ferramentas de folha de sprites para o Saiyajin Survivors: tira o fundo (color key), acha os
// quadros por componentes conexos e desenha prévias numeradas para montar o anims.json à mão.
import sharp from "sharp";

/** Lê a folha como RGBA cru. */
export async function loadSheet(file) {
  const { data, info } = await sharp(file, { page: 0 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const near = (data, i, c, tol) => Math.abs(data[i] - c[0]) <= tol && Math.abs(data[i + 1] - c[1]) <= tol && Math.abs(data[i + 2] - c[2]) <= tol;

/** Cor opaca mais comum da folha (o fundo, em quase todas). */
export function dominant(img) {
  const { data, w, h } = img;
  const m = new Map();
  for (let i = 0; i < w * h * 4; i += 16) {
    if (data[i + 3] < 16) continue;
    const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    m.set(k, (m.get(k) || 0) + 1);
  }
  let best = 0,
    n = -1;
  for (const [k, v] of m) if (v > n) [best, n] = [k, v];
  return [best >> 16, (best >> 8) & 255, best & 255];
}

/** Cores de fundo: a dominante, a do canto e as listadas. Pixels nelas (ou já transparentes) viram alpha 0. */
export function keyOut(img, extra = [], tol = 4) {
  const { data, w, h } = img;
  const keys = [dominant(img), ...extra];
  if (data[3] > 16) keys.push([data[0], data[1], data[2]]);
  for (let i = 0; i < w * h * 4; i += 4) {
    if (data[i + 3] < 16) {
      data[i + 3] = 0;
      continue;
    }
    for (const c of keys)
      if (near(data, i, c, tol)) {
        data[i + 3] = 0;
        break;
      }
  }
  return keys;
}

/** Componentes conexos (8-viz.) dos pixels opacos; caixas a até `gap` px se fundem. */
export function components(img, { gap = 2, minArea = 30 } = {}) {
  const { data, w, h } = img;
  const label = new Int32Array(w * h).fill(-1);
  const boxes = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (label[s] >= 0 || data[s * 4 + 3] === 0) continue;
    const id = boxes.length;
    const b = { x0: s % w, y0: (s / w) | 0, x1: s % w, y1: (s / w) | 0, n: 0 };
    label[s] = id;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop();
      const x = p % w,
        y = (p / w) | 0;
      b.n++;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (label[q] < 0 && data[q * 4 + 3] !== 0) {
            label[q] = id;
            stack.push(q);
          }
        }
    }
    boxes.push(b);
  }
  // funde caixas próximas (cabelo solto, rastro, faísca)
  let merged = true;
  let list = boxes.filter((b) => b.n >= 4);
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j];
        if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1) {
          a.x0 = Math.min(a.x0, b.x0);
          a.y0 = Math.min(a.y0, b.y0);
          a.x1 = Math.max(a.x1, b.x1);
          a.y1 = Math.max(a.y1, b.y1);
          a.n += b.n;
          list.splice(j, 1);
          merged = true;
          break outer;
        }
      }
  }
  list = list.filter((b) => b.n >= minArea);
  // ordem de leitura: por linha (faixas de altura) e depois por x
  list.sort((a, b) => a.y0 - b.y0);
  const rows = [];
  for (const b of list) {
    const row = rows.find((r) => b.y0 <= r.y1 && b.y1 >= r.y0 && Math.abs(b.y0 - r.y0) < 40);
    if (row) {
      row.items.push(b);
      row.y1 = Math.max(row.y1, b.y1);
    } else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
  }
  const out = [];
  for (const r of rows) out.push(...r.items.sort((a, b) => a.x0 - b.x0));
  return out.map((b) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 }));
}

/* fonte 3x5 para numerar as prévias */
const FONT = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111",
};

function text(buf, W, H, x, y, s, scale = 2) {
  for (const ch of s) {
    const g = FONT[ch];
    // fundo preto
    for (let yy = -1; yy < 5 * scale + 1; yy++)
      for (let xx = -1; xx < 4 * scale; xx++) put(buf, W, H, x + xx, y + yy, [0, 0, 0, 255]);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++)
        if (g[r * 3 + c] === "1")
          for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) put(buf, W, H, x + c * scale + xx, y + r * scale + yy, [255, 255, 0, 255]);
    x += 4 * scale;
  }
}
function put(buf, W, H, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
  buf[i + 3] = c[3];
}

/** Prévia: folha sem fundo sobre cinza, caixas em magenta e índices em amarelo. */
export async function preview(img, boxes, out, { from = 0, to = img.h } = {}) {
  const W = img.w,
    H = to - from;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const si = ((y + from) * W + x) * 4,
        di = (y * W + x) * 4;
      const a = img.data[si + 3] / 255;
      buf[di] = img.data[si] * a + 60 * (1 - a);
      buf[di + 1] = img.data[si + 1] * a + 60 * (1 - a);
      buf[di + 2] = img.data[si + 2] * a + 70 * (1 - a);
      buf[di + 3] = 255;
    }
  boxes.forEach((b, i) => {
    if (b.y + b.h < from || b.y > to) return;
    for (let x = b.x; x < b.x + b.w; x++) {
      put(buf, W, H, x, b.y - from, [255, 0, 255, 255]);
      put(buf, W, H, x, b.y + b.h - 1 - from, [255, 0, 255, 255]);
    }
    for (let y = b.y; y < b.y + b.h; y++) {
      put(buf, W, H, b.x, y - from, [255, 0, 255, 255]);
      put(buf, W, H, b.x + b.w - 1, y - from, [255, 0, 255, 255]);
    }
    text(buf, W, H, b.x + 1, b.y + 1 - from, String(i));
  });
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
}

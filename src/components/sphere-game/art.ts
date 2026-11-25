// Arte desenhada em código para o que não tem GIF bom: esferas de energia, Big Bang, itens.
// Tudo é pré-renderizado uma vez em canvas fora da tela e depois só copiado (drawImage),
// sem shadowBlur no laço do jogo (o blur por quadro era o que derrubava o FPS).

import { capsuleDataUrl } from "./CapsuleArt";

type Canvas = HTMLCanvasElement;

function canvas(w: number, h: number): [Canvas, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

const orbCache = new Map<string, Canvas>();

/** Esfera de energia com halo: núcleo branco, corpo na cor, brilho que some. Lado = 4r. */
export function orb(color: string, r: number): Canvas {
  const key = `${color}:${r}`;
  const hit = orbCache.get(key);
  if (hit) return hit;
  const size = Math.ceil(r * 4);
  const [c, g] = canvas(size, size);
  const mid = size / 2;
  const halo = g.createRadialGradient(mid, mid, r * 0.6, mid, mid, mid);
  halo.addColorStop(0, `${color}aa`);
  halo.addColorStop(1, `${color}00`);
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  const body = g.createRadialGradient(mid - r * 0.25, mid - r * 0.25, 0, mid, mid, r);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.35, "#ffffff");
  body.addColorStop(0.7, color);
  body.addColorStop(1, `${color}cc`);
  g.fillStyle = body;
  g.beginPath();
  g.arc(mid, mid, r, 0, Math.PI * 2);
  g.fill();
  orbCache.set(key, c);
  return c;
}

/* ---------- itens ---------- */

export type DropKind = "senzu" | "triple" | "rapid" | "ki";

function pixels(rows: string[], colors: Record<string, string>, scale: number): Canvas {
  const [c, g] = canvas(rows[0].length * scale, rows.length * scale);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = colors[ch];
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(x * scale, y * scale, scale, scale);
    }),
  );
  return c;
}

const SENZU = [
  "....dddd....",
  "..ddGGGGdd..",
  ".dGLLGGGGGd.",
  "dGLGGGGGGGGd",
  "dGGGGGGGGGGd",
  ".dGGGGGGGGd.",
  "..ddGGGGdd..",
  "....dddd....",
];

/* Cápsulas da Capsule Corp em SVG (CapsuleArt.tsx): dourada = KI, acobreada = rajada,
   vermelha = tiro triplo. */
const CAPSULE_ART: Record<Exclude<DropKind, "senzu">, { src: string }> = {
  ki: { src: capsuleDataUrl("gold") },
  rapid: { src: capsuleDataUrl("copper") },
  triple: { src: capsuleDataUrl("red") },
};
const CAPSULE_SIZE = 44;
const capsuleImgs = new Map<string, HTMLImageElement>();

/** Carrega a arte das cápsulas; resolve quando todas chegaram (ou falharam). */
export function loadDropArt(): Promise<void> {
  const srcs = [...new Set(Object.values(CAPSULE_ART).map((c) => c.src))];
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((done) => {
          const img = capsuleImgs.get(src) ?? new Image();
          capsuleImgs.set(src, img);
          if (img.complete && img.naturalWidth) return done();
          img.onload = img.onerror = () => done();
          img.src = src;
        }),
    ),
  ).then(() => dropCache.clear());
}


export const DROP_INFO: Record<DropKind, { label: string; color: string }> = {
  senzu: { label: "SENZU +1 VIDA", color: "#5fd13a" },
  triple: { label: "TIRO TRIPLO", color: "#ff3355" },
  rapid: { label: "RAJADA", color: "#2f8fd0" },
  ki: { label: "+1 KI", color: "#ffd21f" },
};

const dropCache = new Map<DropKind, Canvas>();

export function dropIcon(kind: DropKind): Canvas {
  const hit = dropCache.get(kind);
  if (hit) return hit;
  if (kind === "senzu") {
    const icon = pixels(SENZU, { d: "#1d5a14", G: "#5fd13a", L: "#c8f7a0" }, 3);
    dropCache.set(kind, icon);
    return icon;
  }
  const art = CAPSULE_ART[kind];
  const img = capsuleImgs.get(art.src);
  const [c, g] = canvas(CAPSULE_SIZE, CAPSULE_SIZE);
  if (img?.complete && img.naturalWidth) {
    g.drawImage(img, 0, 0, CAPSULE_SIZE, CAPSULE_SIZE);
    dropCache.set(kind, c); // só guarda a versão com a arte carregada
  } else {
    g.fillStyle = DROP_INFO[kind].color;
    g.beginPath();
    g.arc(CAPSULE_SIZE / 2, CAPSULE_SIZE / 2, 12, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** Ícone do item como data URL, para o HUD (mesmo desenho do jogo). */
export function dropIconUrl(kind: DropKind): string {
  return dropIcon(kind).toDataURL();
}

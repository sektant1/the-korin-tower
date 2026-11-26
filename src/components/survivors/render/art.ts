// Arte desenhada em código e pré-renderizada uma vez em canvas fora da tela (vinda do antigo
// sphere-game/art.ts): esferas de energia, Esferas do Dragão, fantasmas, caixotes. No laço só há
// drawImage, sem shadowBlur.
type Canvas = HTMLCanvasElement;

function canvas(w: number, h: number): [Canvas, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

const cache = new Map<string, Canvas>();
function memo(key: string, make: () => Canvas) {
  let c = cache.get(key);
  if (!c) {
    c = make();
    cache.set(key, c);
  }
  return c;
}

/** Esfera de energia com halo: núcleo branco, corpo na cor, brilho que some. Lado = 4r. */
export function orb(color: string, r: number): Canvas {
  return memo(`orb:${color}:${r}`, () => {
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
    return c;
  });
}

/** Halo suave (aura de transformação), lado = 2r. */
export function glow(color: string, r: number): Canvas {
  return memo(`glow:${color}:${r}`, () => {
    const [c, g] = canvas(r * 2, r * 2);
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `${color}cc`);
    grad.addColorStop(0.5, `${color}55`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, r * 2, r * 2);
    return c;
  });
}

/** Esfera do Dragão com as estrelas. */
export function dragonBall(stars: number): Canvas {
  return memo(`db:${stars}`, () => {
    const r = 9;
    const [c, g] = canvas(r * 2 + 8, r * 2 + 8);
    const m = r + 4;
    const body = g.createRadialGradient(m - 3, m - 3, 1, m, m, r);
    body.addColorStop(0, "#fff6c0");
    body.addColorStop(0.4, "#ffb21f");
    body.addColorStop(1, "#d86a00");
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(m, m, r + 1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = body;
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e0201a";
    const pos = [[0, 0], [-3, -3], [3, 3], [3, -3], [-3, 3], [0, -4], [0, 4]];
    for (let k = 0; k < stars; k++) {
      const [dx, dy] = stars === 1 ? [0, 0] : pos[k + 1] ?? [0, 0];
      g.fillRect(m + dx - 1, m + dy - 1, 2, 2);
    }
    return c;
  });
}

/** Fantasma Kamikaze do Gotenks. */
export function ghost(color: string): Canvas {
  return memo(`ghost:${color}`, () => {
    const [c, g] = canvas(24, 26);
    g.fillStyle = color;
    g.strokeStyle = "#5a6a8a";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(12, 11, 9, Math.PI, 0);
    g.lineTo(21, 22);
    for (let k = 0; k < 4; k++) g.quadraticCurveTo(21 - k * 4.5 - 2.25, 26, 21 - (k + 1) * 4.5, 22);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#1a1a2a";
    g.fillRect(8, 9, 2, 4);
    g.fillRect(14, 9, 2, 4);
    g.fillStyle = "#ff7a9a";
    g.fillRect(10, 15, 4, 2);
    return c;
  });
}

/** Caixote da Capsule Corp. */
export function crate(): Canvas {
  return memo("crate", () => {
    const [c, g] = canvas(26, 26);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 26, 26);
    g.fillStyle = "#c89a5a";
    g.fillRect(1, 1, 24, 24);
    g.fillStyle = "#8a5a2a";
    g.fillRect(1, 1, 24, 3);
    g.fillRect(1, 22, 24, 3);
    g.fillRect(1, 1, 3, 24);
    g.fillRect(22, 1, 3, 24);
    g.fillStyle = "#3a86e8";
    g.beginPath();
    g.arc(13, 13, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "bold 6px monospace";
    g.textAlign = "center";
    g.fillText("CC", 13, 15);
    return c;
  });
}

/** Disco placeholder com contorno e brilho (inimigos e herói sem sprite). */
export function disc(color: string, r: number, flash = false): Canvas {
  return memo(`disc:${color}:${r}:${flash}`, () => {
    const s = Math.ceil(r * 2 + 4);
    const [c, g] = canvas(s, s);
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(s / 2, s / 2, r + 1.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = flash ? "#ffffff" : color;
    g.beginPath();
    g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    g.fill();
    if (!flash) {
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath();
      g.arc(s / 2 - r * 0.35, s / 2 - r * 0.35, r * 0.35, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  });
}

/** Sombra oval no chão. */
export function shadow(w: number): Canvas {
  return memo(`shadow:${w}`, () => {
    const [c, g] = canvas(w, Math.ceil(w / 3));
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath();
    g.ellipse(w / 2, w / 6, w / 2, w / 6, 0, 0, Math.PI * 2);
    g.fill();
    return c;
  });
}

// Mapas procedurais do campo de batalha (um tema por saga), no lugar das fotos de fundo. As fotos
// continuam na UI (cartas de saga etc.). O mundo é infinito: é cortado em pedaços de CH×CH que são
// desenhados uma vez num canvas fora da tela (em cache) e depois só copiados com drawImage.
// Tudo é determinístico pela posição, então o mesmo lugar tem sempre a mesma cara.
// É só visual: nada aqui bloqueia o herói ou os inimigos.
import type { SagaId } from "../data/enemies";

type Ctx = CanvasRenderingContext2D;

const CH = 320; // lado do pedaço (unidades do mundo)
const T = 16; // lado do ladrilho do chão
const MAX_CACHE = 90;
const GEN_PER_FRAME = 6; // pedaços novos por quadro (o resto aparece no quadro seguinte)

/* ---------- ruído determinístico ---------- */

function hash(x: number, y: number, s: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const xf = x - xi,
    yf = y - yi;
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s),
    b = hash(xi + 1, yi, s),
    c = hash(xi, yi + 1, s),
    d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Ruído em duas escalas (manchas grandes + detalhe), 0..1. */
const fbm = (x: number, y: number, s: number) => vnoise(x / 300, y / 300, s) * 0.65 + vnoise(x / 95, y / 95, s + 7) * 0.35;

/* ---------- temas ---------- */

interface Prop {
  x: number;
  y: number;
  draw(g: Ctx, x: number, y: number): void;
}

interface Theme {
  salt: number;
  fill: string; // cor do pedaço ainda não gerado
  /** Pinta o chão do ladrilho (tx, ty em coordenadas do mundo, canto superior esquerdo). */
  tile(g: Ctx, lx: number, ly: number, tx: number, ty: number): void;
  /** Enfeites que nascem no pedaço (cx, cy), em coordenadas do mundo. */
  props(cx: number, cy: number, r: () => number, out: Prop[]): void;
}

const pick = <V>(arr: readonly V[], u: number) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];

function shadow(g: Ctx, x: number, y: number, rx: number, ry: number) {
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function boulder(g: Ctx, x: number, y: number, r: number, dark: string, mid: string, light: string) {
  shadow(g, x + 2, y + r * 0.55, r * 1.1, r * 0.45);
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = mid;
  g.beginPath();
  g.ellipse(x - r * 0.12, y - r * 0.12, r * 0.8, r * 0.6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = light;
  g.fillRect(Math.round(x - r * 0.45), Math.round(y - r * 0.45), Math.max(2, Math.round(r * 0.35)), 2);
}

/* Namek: campos azul-esverdeados, lagos, árvores Ajisa de copa redonda e casas em domo. */
const NAMEK_GRASS = ["#25493a", "#264b3b", "#24473a", "#274d3c"];
const NAMEK_MEADOW = ["#2d5841", "#2e5a42", "#2c5640"];
const namek: Theme = {
  salt: 11,
  fill: "#24493a",
  tile(g, lx, ly, tx, ty) {
    const n = fbm(tx + 8, ty + 8, 11);
    const h = hash(tx / T, ty / T, 3);
    if (n < 0.3) {
      g.fillStyle = n < 0.26 ? "#163c4e" : "#1b4656";
      g.fillRect(lx, ly, T, T);
      if (h < 0.18) {
        g.fillStyle = "#3a7a8a";
        g.fillRect(lx + 3, ly + ((h * 97) % 12), 7, 1);
      }
      return;
    }
    if (n < 0.335) {
      g.fillStyle = h < 0.5 ? "#4a5a3a" : "#465634";
      g.fillRect(lx, ly, T, T);
      return;
    }
    g.fillStyle = n > 0.66 ? pick(NAMEK_MEADOW, h) : pick(NAMEK_GRASS, h);
    g.fillRect(lx, ly, T, T);
    if (h > 0.82) {
      // tufo de grama
      g.fillStyle = "#3d7a52";
      g.fillRect(lx + 4, ly + 9, 1, 3);
      g.fillRect(lx + 6, ly + 8, 1, 4);
      g.fillRect(lx + 8, ly + 10, 1, 2);
    } else if (h < 0.02) {
      g.fillStyle = "#6aa8c8"; // florzinha azul
      g.fillRect(lx + 7, ly + 7, 2, 2);
    }
  },
  props(cx, cy, r, out) {
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const x = (cx + r()) * CH,
        y = (cy + r()) * CH;
      if (fbm(x + 8, y + 8, 11) < 0.36) continue; // nada dentro d'água
      const u = r(),
        s = 0.8 + r() * 0.5;
      if (u < 0.55)
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // árvore Ajisa: tronco fino e alto, copa redonda
            const h = 34 * s;
            shadow(g, x + 8, y + 2, 16 * s, 5 * s);
            g.fillStyle = "#5a4630";
            g.fillRect(Math.round(x - 2), Math.round(y - h), 4, Math.round(h));
            g.fillStyle = "#2f6e4e";
            g.beginPath();
            g.arc(x, y - h, 14 * s, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#3f8a60";
            g.beginPath();
            g.arc(x - 3 * s, y - h - 3 * s, 10 * s, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#5aa878";
            g.fillRect(Math.round(x - 7 * s), Math.round(y - h - 8 * s), 4, 3);
          },
        });
      else if (u < 0.88) {
        const rr = 7 + r() * 9;
        out.push({ x, y, draw: (g, x, y) => boulder(g, x, y, rr, "#3a4a54", "#4e6270", "#7a92a0") });
      } else
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // casa namekuseijin: domo branco com janelas redondas
            const R = 22 * s;
            shadow(g, x + 6, y + 4, R * 1.15, R * 0.4);
            g.fillStyle = "#9aa898";
            g.beginPath();
            g.ellipse(x, y, R, R * 0.85, 0, Math.PI, 0);
            g.fill();
            g.fillStyle = "#c8d6c4";
            g.beginPath();
            g.ellipse(x - 2, y - 2, R * 0.85, R * 0.72, 0, Math.PI, 0);
            g.fill();
            g.fillStyle = "#1e3a40";
            for (const dx of [-0.45, 0, 0.45]) {
              g.beginPath();
              g.arc(x + dx * R, y - R * 0.38, 3 * s, 0, Math.PI * 2);
              g.fill();
            }
            g.fillStyle = "#2a2a2a";
            g.fillRect(Math.round(x - 4 * s), Math.round(y - 8 * s), Math.round(8 * s), Math.round(8 * s));
          },
        });
    }
  },
};

/* Cell Games: planalto rochoso e seco, crateras, e o ringue de pedra no ponto de partida. */
const ROCK = ["#4a3d2e", "#4b3e2e", "#483b2d", "#4d402f"];
const RING = 224; // meia largura do ringue
const cell: Theme = {
  salt: 23,
  fill: "#4a3d2e",
  tile(g, lx, ly, tx, ty) {
    const h = hash(tx / T, ty / T, 5);
    if (Math.abs(tx + T / 2) < RING && Math.abs(ty + T / 2) < RING) {
      // ringue: lajotas grandes (2×2 ladrilhos) com rejunte
      const big = (Math.floor(tx / 32) + Math.floor(ty / 32)) & 1;
      g.fillStyle = big ? "#6e6a60" : "#76726a";
      g.fillRect(lx, ly, T, T);
      g.fillStyle = "#4e4a44";
      if ((tx & 31) === 0) g.fillRect(lx, ly, 1, T);
      if ((ty & 31) === 0) g.fillRect(lx, ly, T, 1);
      if (h < 0.06) {
        g.fillStyle = "#4e4a44"; // rachadura da luta
        g.fillRect(lx + 3, ly + 5, 7, 1);
        g.fillRect(lx + 9, ly + 6, 1, 5);
      }
      return;
    }
    const n = fbm(tx + 8, ty + 8, 23);
    g.fillStyle = n < 0.33 ? "#3c3226" : n > 0.68 ? "#5a4a36" : pick(ROCK, h);
    g.fillRect(lx, ly, T, T);
    if (h > 0.86) {
      g.fillStyle = "#2e261c"; // rachadura
      g.fillRect(lx + 2, ly + 7, 6, 1);
      g.fillRect(lx + 7, ly + 8, 5, 1);
    } else if (h < 0.1) {
      g.fillStyle = "#6a5a44"; // pedrisco
      g.fillRect(lx + 5, ly + 4, 2, 2);
      g.fillRect(lx + 11, ly + 10, 1, 1);
    }
  },
  props(cx, cy, r, out) {
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const x = (cx + r()) * CH,
        y = (cy + r()) * CH;
      if (Math.abs(x) < RING + 40 && Math.abs(y) < RING + 40) continue;
      const u = r();
      if (u < 0.45) {
        const rr = 8 + r() * 14;
        out.push({ x, y, draw: (g, x, y) => boulder(g, x, y, rr, "#3a3024", "#5a4a38", "#7a6850") });
      } else if (u < 0.75) {
        const rr = 18 + r() * 26;
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // cratera
            g.fillStyle = "#2e261c";
            g.beginPath();
            g.ellipse(x, y, rr, rr * 0.6, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#3a3024";
            g.beginPath();
            g.ellipse(x + rr * 0.08, y + rr * 0.06, rr * 0.8, rr * 0.45, 0, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "#6a5a44";
            g.lineWidth = 2;
            g.beginPath();
            g.ellipse(x, y, rr, rr * 0.6, 0, Math.PI * 1.05, Math.PI * 1.9);
            g.stroke();
          },
        });
      } else {
        const s = 0.8 + r() * 0.5;
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // arbusto seco
            g.strokeStyle = "#6a5636";
            g.lineWidth = 1;
            g.beginPath();
            for (let a = 0; a < 7; a++) {
              const t = -Math.PI * (0.15 + (a / 6) * 0.7);
              g.moveTo(x, y);
              g.lineTo(x + Math.cos(t) * 9 * s, y + Math.sin(t) * 9 * s);
            }
            g.stroke();
          },
        });
      }
    }
    // os quatro pilares dos cantos do ringue
    if (cx >= -1 && cx <= 0 && cy >= -1 && cy <= 0) {
      const x = cx === 0 ? RING - 10 : -RING + 10,
        y = cy === 0 ? RING - 10 : -RING + 10;
      out.push({
        x,
        y,
        draw: (g, x, y) => {
          shadow(g, x + 4, y + 4, 12, 5);
          g.fillStyle = "#4e4a44";
          g.fillRect(x - 8, y - 26, 16, 28);
          g.fillStyle = "#8a867c";
          g.fillRect(x - 7, y - 26, 13, 24);
          g.fillStyle = "#a8a49a";
          g.fillRect(x - 7, y - 26, 13, 3);
        },
      });
    }
  },
};

/* West City: quarteirões com ruas, calçadas, praças, parques e prédios em domo. */
const BLOCK = 640;
const ROAD = 72;
const city: Theme = {
  salt: 37,
  fill: "#2a2a30",
  tile(g, lx, ly, tx, ty) {
    const h = hash(tx / T, ty / T, 7);
    const mx = ((tx % BLOCK) + BLOCK) % BLOCK,
      my = ((ty % BLOCK) + BLOCK) % BLOCK;
    const roadX = mx < ROAD,
      roadY = my < ROAD;
    if (roadX || roadY) {
      g.fillStyle = h < 0.5 ? "#26262c" : "#28282e";
      g.fillRect(lx, ly, T, T);
      // faixa amarela tracejada no meio da rua (não no cruzamento)
      g.fillStyle = "#8a7a2a";
      if (roadX && !roadY && mx === ROAD / 2 - 4 && (my / T) % 3 < 2) g.fillRect(lx + 7, ly, 2, T);
      if (roadY && !roadX && my === ROAD / 2 - 4 && (mx / T) % 3 < 2) g.fillRect(lx, ly + 7, T, 2);
      return;
    }
    const side = mx < ROAD + T || my < ROAD + T || mx >= BLOCK - T || my >= BLOCK - T;
    if (side) {
      g.fillStyle = "#4a4a50";
      g.fillRect(lx, ly, T, T);
      g.fillStyle = "#3e3e44";
      g.fillRect(lx, ly, T, 1);
      g.fillRect(lx, ly, 1, T);
      return;
    }
    const bx = Math.floor(tx / BLOCK),
      by = Math.floor(ty / BLOCK);
    const kind = hash(bx, by, 9);
    if (kind < 0.45) {
      // parque
      g.fillStyle = h < 0.5 ? "#28432a" : "#2a462c";
      g.fillRect(lx, ly, T, T);
      if (h > 0.9) {
        g.fillStyle = "#3a5e38";
        g.fillRect(lx + 5, ly + 8, 1, 3);
        g.fillRect(lx + 8, ly + 7, 1, 4);
      }
    } else {
      // praça de lajotas
      g.fillStyle = ((tx / T + ty / T) & 1) === 0 ? "#45413c" : "#413d38";
      g.fillRect(lx, ly, T, T);
    }
  },
  props(cx, cy, r, out) {
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const x = (cx + r()) * CH,
        y = (cy + r()) * CH;
      const mx = ((x % BLOCK) + BLOCK) % BLOCK,
        my = ((y % BLOCK) + BLOCK) % BLOCK;
      const onRoad = mx < ROAD || my < ROAD;
      const u = r();
      if (onRoad) {
        if (u > 0.35 || mx < ROAD === my < ROAD) continue; // carro parado, fora dos cruzamentos
        const horiz = my < ROAD;
        const col = pick(["#8a3a3a", "#3a5a8a", "#c8c8c0", "#8a7a3a"], r());
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            const w = horiz ? 30 : 16,
              h = horiz ? 16 : 30;
            shadow(g, x + 2, y + h / 2, w / 2 + 2, 4);
            g.fillStyle = "#18181c";
            g.fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
            g.fillStyle = col;
            g.fillRect(x - w / 2, y - h / 2, w, h);
            g.fillStyle = "#9ac8e8";
            if (horiz) g.fillRect(x + 3, y - h / 2 + 3, 6, h - 6);
            else g.fillRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, 6);
          },
        });
        continue;
      }
      if (mx < ROAD + 28 || my < ROAD + 28 || mx > BLOCK - 28 || my > BLOCK - 28) continue;
      if (u < 0.5) {
        const s = 0.8 + r() * 0.5;
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // árvore vista de cima
            shadow(g, x + 4, y + 4, 13 * s, 8 * s);
            g.fillStyle = "#23502a";
            g.beginPath();
            g.arc(x, y, 12 * s, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#2f6a36";
            g.beginPath();
            g.arc(x - 2 * s, y - 2 * s, 8 * s, 0, Math.PI * 2);
            g.fill();
          },
        });
      } else if (u < 0.8) {
        const R = 24 + r() * 18;
        const roof = pick(["#c8c0a8", "#b8c8d0", "#d0b8a0"], r());
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // prédio em domo (estilo Capsule)
            shadow(g, x + 7, y + 7, R, R * 0.9);
            g.fillStyle = "#6a6660";
            g.beginPath();
            g.arc(x, y, R, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = roof;
            g.beginPath();
            g.arc(x - 2, y - 2, R - 3, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#ffffff55";
            g.beginPath();
            g.arc(x - R * 0.35, y - R * 0.35, R * 0.3, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#3a3a44";
            g.fillRect(Math.round(x - R * 0.15), Math.round(y + R * 0.3), Math.round(R * 0.3), Math.round(R * 0.25));
          },
        });
      } else {
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // poste
            shadow(g, x + 6, y + 2, 7, 3);
            g.fillStyle = "#5a5a62";
            g.fillRect(x - 1, y - 22, 3, 22);
            g.fillStyle = "#e8e0a0";
            g.fillRect(x - 3, y - 25, 7, 4);
          },
        });
      }
    }
  },
};

/* Nave do Babidi: chão de placas de metal com rebites, veios de energia rosa e escotilhas. */
const buu: Theme = {
  salt: 51,
  fill: "#241a2c",
  tile(g, lx, ly, tx, ty) {
    const px = Math.floor(tx / 32),
      py = Math.floor(ty / 32);
    const h = hash(px, py, 13);
    g.fillStyle = h < 0.33 ? "#241a2c" : h < 0.66 ? "#281d31" : "#2b2034";
    g.fillRect(lx, ly, T, T);
    // bordas da placa (2×2 ladrilhos): luz em cima/esquerda, sombra embaixo/direita
    if ((tx & 31) === 0) {
      g.fillStyle = "#3a2c46";
      g.fillRect(lx, ly, 1, T);
    }
    if ((ty & 31) === 0) {
      g.fillStyle = "#3a2c46";
      g.fillRect(lx, ly, T, 1);
    }
    if ((tx & 31) === 16) {
      g.fillStyle = "#170f1d";
      g.fillRect(lx + T - 1, ly, 1, T);
    }
    if ((ty & 31) === 16) {
      g.fillStyle = "#170f1d";
      g.fillRect(lx, ly + T - 1, T, 1);
    }
    if ((tx & 31) === 0 && (ty & 31) === 0) {
      g.fillStyle = "#4e3e5c"; // rebite
      g.fillRect(lx + 3, ly + 3, 2, 2);
    }
    // veios de energia: trechos de 3 a 7 placas das emendas acendem em rosa
    const vein = (seam: number, along: number, salt: number) => {
      const seg = Math.floor(along / 8);
      const hh = hash(seg, seam, salt);
      return hh < 0.14 && ((along % 8) + 8) % 8 < 3 + Math.floor(hh * 30);
    };
    const glowLine = (horiz: boolean) => {
      g.fillStyle = "#6a2a5c";
      if (horiz) g.fillRect(lx, ly - 1, T, 3);
      else g.fillRect(lx - 1, ly, 3, T);
      g.fillStyle = "#e05ac0";
      if (horiz) g.fillRect(lx, ly, T, 1);
      else g.fillRect(lx, ly, 1, T);
    };
    if ((ty & 31) === 0 && vein(py, px, 71)) glowLine(true);
    if ((tx & 31) === 0 && vein(px, py, 73)) glowLine(false);
  },
  props(cx, cy, r, out) {
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x = (cx + r()) * CH,
        y = (cy + r()) * CH;
      const u = r();
      if (u < 0.4) {
        const R = 20 + r() * 12;
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // escotilha redonda
            g.fillStyle = "#170f1d";
            g.beginPath();
            g.arc(x, y, R + 3, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#3a2c46";
            g.beginPath();
            g.arc(x, y, R, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "#241a2c";
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(x - R, y);
            g.lineTo(x + R, y);
            g.moveTo(x, y - R);
            g.lineTo(x, y + R);
            g.stroke();
            g.fillStyle = "#c84aa8";
            g.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
          },
        });
      } else if (u < 0.75) {
        const R = 14 + r() * 18;
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // poça de gosma majin
            g.fillStyle = "#6a2a5a";
            g.beginPath();
            g.ellipse(x, y, R, R * 0.6, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#9a3a80";
            g.beginPath();
            g.ellipse(x - R * 0.2, y - R * 0.1, R * 0.55, R * 0.3, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#e88ad0";
            g.fillRect(Math.round(x - R * 0.4), Math.round(y - R * 0.2), 3, 2);
          },
        });
      } else {
        out.push({
          x,
          y,
          draw: (g, x, y) => {
            // pilar com luz
            shadow(g, x + 5, y + 4, 14, 5);
            g.fillStyle = "#170f1d";
            g.fillRect(x - 11, y - 34, 22, 36);
            g.fillStyle = "#3a2c46";
            g.fillRect(x - 10, y - 34, 18, 34);
            g.fillStyle = "#4e3e5c";
            g.fillRect(x - 10, y - 34, 18, 3);
            g.fillStyle = "#c84aa8";
            g.fillRect(x - 3, y - 26, 4, 14);
          },
        });
      }
    }
  },
};

const THEMES: Record<SagaId, Theme> = { freeza: namek, cell, filmes: city, buu };

/* ---------- cache e desenho ---------- */

let current: SagaId | null = null;
const chunks = new Map<string, HTMLCanvasElement>();

function buildChunk(th: Theme, cx: number, cy: number) {
  const c = document.createElement("canvas");
  c.width = CH;
  c.height = CH;
  const g = c.getContext("2d")!;
  const x0 = cx * CH,
    y0 = cy * CH;
  for (let ly = 0; ly < CH; ly += T) for (let lx = 0; lx < CH; lx += T) th.tile(g, lx, ly, x0 + lx, y0 + ly);
  // enfeites deste pedaço e dos vizinhos (os que passam da borda), em ordem de altura
  const props: Prop[] = [];
  for (let ny = cy - 1; ny <= cy + 1; ny++)
    for (let nx = cx - 1; nx <= cx + 1; nx++) th.props(nx, ny, rngOf(hash(nx, ny, th.salt) * 4294967296), props);
  props.sort((a, b) => a.y - b.y);
  for (const pr of props) {
    if (pr.x < x0 - 90 || pr.x > x0 + CH + 90 || pr.y < y0 - 90 || pr.y > y0 + CH + 90) continue;
    pr.draw(g, pr.x - x0, pr.y - y0);
  }
  return c;
}

/** Troca o tema (ao começar uma run). */
export function setMap(saga: SagaId) {
  if (saga === current) return;
  current = saga;
  chunks.clear();
}

/**
 * Pinta o chão visível. `ox, oy` = posição na tela da origem do mundo; `z` = zoom. Os pedaços são
 * alinhados ao pixel inteiro da tela para não abrir costura entre eles.
 */
export function drawMap(ctx: Ctx, camX: number, camY: number, viewW: number, viewH: number, z: number, ox: number, oy: number) {
  const th = THEMES[current ?? "freeza"];
  const x0 = Math.floor((camX - viewW / 2 / z) / CH) - 1,
    x1 = Math.floor((camX + viewW / 2 / z) / CH) + 1;
  const y0 = Math.floor((camY - viewH / 2 / z) / CH) - 1,
    y1 = Math.floor((camY + viewH / 2 / z) / CH) + 1;
  ctx.fillStyle = th.fill;
  ctx.fillRect(0, 0, viewW, viewH);
  let budget = GEN_PER_FRAME;
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) {
      const key = `${cx},${cy}`;
      let c = chunks.get(key);
      if (!c) {
        if (budget <= 0) continue;
        budget--;
        c = buildChunk(th, cx, cy);
        chunks.set(key, c);
        if (chunks.size > MAX_CACHE) chunks.delete(chunks.keys().next().value!);
      } else {
        // LRU: o que foi usado vai para o fim da fila
        chunks.delete(key);
        chunks.set(key, c);
      }
      const sx = Math.round(ox + cx * CH * z),
        sy = Math.round(oy + cy * CH * z);
      const ex = Math.round(ox + (cx + 1) * CH * z),
        ey = Math.round(oy + (cy + 1) * CH * z);
      if (ex < 0 || ey < 0 || sx > viewW || sy > viewH) continue;
      ctx.drawImage(c, sx, sy, ex - sx, ey - sy);
    }
}

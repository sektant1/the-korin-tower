// Partículas e efeitos só visuais. A simulação empurra pedidos em w.fx* (fila circular, sim/core
// `fx()`); aqui eles viram faíscas, anéis, cadáveres piscando e explosões animadas. O relógio é o
// da simulação (w.t): pausa, hitstop e tela de nível congelam os efeitos junto com o jogo.
import { ENEMY_LIST } from "../data/enemies";
import { Fx, MAX_FX, type World } from "../sim/core";
import { orb } from "./art";
import { drawSprite, hasSprite } from "./sprites";

type Ctx = CanvasRenderingContext2D;

const enum P {
  Spark = 1,
  Ring = 2,
  Corpse = 3,
  Boom = 4,
  Text = 5,
  Dust = 6,
  Flame = 7,
}

const MAX = 1600;
const kind = new Uint8Array(MAX);
const px = new Float32Array(MAX);
const py = new Float32Array(MAX);
const vx = new Float32Array(MAX);
const vy = new Float32Array(MAX);
const born = new Float32Array(MAX);
const life = new Float32Array(MAX);
const size = new Float32Array(MAX);
const aux = new Float32Array(MAX); // inimigo (cadáver), virado
const color: string[] = new Array(MAX).fill("#fff");
const text: string[] = new Array(MAX).fill("");
let next = 0;
let seen = 0;
let owner: World | null = null;
let now = 0;

function spawn(k: P, x: number, y: number, dx: number, dy: number, l: number, s: number, c: string, a = 0) {
  // fila circular: o mais antigo cede o lugar
  const i = next++ % MAX;
  kind[i] = k;
  px[i] = x;
  py[i] = y;
  vx[i] = dx;
  vy[i] = dy;
  born[i] = now;
  life[i] = l;
  size[i] = s;
  aux[i] = a;
  color[i] = c;
  return i;
}

function sparks(x: number, y: number, n: number, c: string, speed = 160, l = 0.35, s = 2) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      v = speed * (0.4 + Math.random() * 0.8);
    spawn(P.Spark, x, y, Math.cos(a) * v, Math.sin(a) * v, l * (0.6 + Math.random() * 0.6), s * (0.7 + Math.random() * 0.6), c);
  }
}

export function floatText(x: number, y: number, t: string, c: string, l = 0.9, s = 12) {
  const i = spawn(P.Text, x, y, 0, -36, l, s, c);
  text[i] = t;
}

/** Lê os pedidos novos da simulação e cria as partículas. */
export function consumeFx(w: World) {
  now = w.t;
  if (owner !== w) {
    owner = w;
    seen = w.fxHead;
    for (let i = 0; i < MAX; i++) kind[i] = 0;
  }
  // se a fila deu a volta (muita coisa num quadro), pula o que já foi sobrescrito
  if (w.fxHead - seen > MAX_FX) seen = w.fxHead - MAX_FX;
  for (; seen < w.fxHead; seen++) {
    const k = seen % MAX_FX;
    const x = w.fxX[k],
      y = w.fxY[k],
      a = w.fxA[k],
      c = w.fxColor[k];
    switch (w.fxKind[k] as Fx) {
      case Fx.Death: {
        const e = Math.floor(a);
        const def = ENEMY_LIST[e];
        if (def.tier === "crate") {
          sparks(x, y, 8, "#c89a5a", 140, 0.4, 3);
          break;
        }
        spawn(P.Corpse, x, y + def.radius, 0, 0, def.tier === "elite" ? 0.6 : 0.3, 1, c, e + (a - e > 0.25 ? 0.5 : 0));
        sparks(x, y, def.tier === "grunt" ? 3 : 8, c, 120, 0.3, 2);
        break;
      }
      case Fx.Explosion:
        spawn(P.Boom, x, y, 0, 0, 0.5, a, c);
        spawn(P.Ring, x, y, 0, 0, 0.35, a * 1.2, c);
        sparks(x, y, 10, "#ffd21f", a * 4, 0.5, 2.5);
        break;
      case Fx.Sparks:
        sparks(x, y, Math.round(a) || 5, c, 140, 0.25, 2);
        break;
      case Fx.LevelUp:
        spawn(P.Ring, x, y, 0, 0, 0.5, 90, c);
        floatText(x, y - 40, "LEVEL UP!", "#5ad7ff", 1.1, 14);
        sparks(x, y, 18, "#5ad7ff", 220, 0.6, 2.5);
        break;
      case Fx.Dodge:
        floatText(x, y, "DODGE!", "#c8d8ff", 0.7, 10);
        break;
      case Fx.Ring:
        spawn(P.Ring, x, y, 0, 0, 0.4, a, c);
        break;
      case Fx.Telegraph:
        sparks(x, y, 4, c, 60, 0.4, 2);
        break;
      case Fx.Pickup:
        sparks(x, y, 6, c, 90, 0.3, 2);
        break;
    }
  }
}

/** Poeira dos pés e chamas da aura: o renderizador chama a cada quadro. */
export function dust(x: number, y: number) {
  spawn(P.Dust, x + (Math.random() - 0.5) * 8, y, (Math.random() - 0.5) * 20, -8, 0.4, 3 + Math.random() * 2, "#d8c8a8");
}
export function flame(x: number, y: number, c: string, spread: number) {
  spawn(P.Flame, x + (Math.random() - 0.5) * spread, y, (Math.random() - 0.5) * 12, -60 - Math.random() * 60, 0.45, 3 + Math.random() * 3, c);
}

/** Desenha uma camada: "under" fica sob os personagens, "over" por cima. */
export function drawFx(ctx: Ctx, layer: "under" | "over") {
  for (let i = 0; i < MAX; i++) {
    const k = kind[i];
    if (!k) continue;
    const age = now - born[i];
    if (age < 0 || age > life[i]) {
      if (age > life[i]) kind[i] = 0;
      continue;
    }
    const u = age / life[i];
    const under = k === P.Ring || k === P.Dust || k === P.Corpse;
    if ((layer === "under") !== under) continue;
    const x = px[i] + vx[i] * age,
      y = py[i] + vy[i] * age;
    switch (k) {
      case P.Spark: {
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = color[i];
        const s = size[i] * (1 - u * 0.5);
        // risco na direção do movimento
        ctx.strokeStyle = color[i];
        ctx.lineWidth = s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - vx[i] * 0.03, y - vy[i] * 0.03);
        ctx.stroke();
        break;
      }
      case P.Ring:
        ctx.globalAlpha = (1 - u) * 0.8;
        ctx.strokeStyle = color[i];
        ctx.lineWidth = 4 * (1 - u) + 1;
        ctx.beginPath();
        ctx.arc(x, y, size[i] * (0.2 + 0.8 * Math.sqrt(u)), 0, Math.PI * 2);
        ctx.stroke();
        break;
      case P.Dust:
        ctx.globalAlpha = 0.35 * (1 - u);
        ctx.fillStyle = color[i];
        ctx.beginPath();
        ctx.arc(x, y, size[i] * (0.6 + u), 0, Math.PI * 2);
        ctx.fill();
        break;
      case P.Flame: {
        ctx.globalAlpha = 0.8 * (1 - u);
        const o = orb(color[i], Math.max(2, Math.round(size[i] * (1 - u * 0.6))));
        ctx.drawImage(o, x - o.width / 2, y - o.height / 2);
        break;
      }
      case P.Corpse: {
        // o inimigo pisca branco, achata e some
        const e = Math.floor(aux[i]);
        const def = ENEMY_LIST[e];
        const key = def.sprite ?? def.id;
        ctx.globalAlpha = 1 - u;
        if (hasSprite(key)) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(1 + u * 0.5, 1 - u * 0.6);
          drawSprite(ctx, key, "hurt", 0, 0, 0, aux[i] - e > 0.25, u < 0.5, 1);
          ctx.restore();
        } else {
          const o = orb(color[i], Math.max(3, Math.round(def.radius * (1 - u))));
          ctx.drawImage(o, x - o.width / 2, y - def.radius - o.height / 2);
        }
        break;
      }
      case P.Boom: {
        const r = size[i];
        if (hasSprite("fx_explosion")) {
          ctx.globalAlpha = 1;
          // a animação toda cabe na vida do efeito; a folha é normalizada para ~70 px de altura
          // média (anims.json), então o tamanho segue o raio por essa referência
          drawSprite(ctx, "fx_explosion", "idle", u * 0.499, x, y + r * 0.8, false, false, (r * 1.6) / 70);
        } else {
          ctx.globalAlpha = 1 - u;
          const o = orb(color[i], Math.max(4, Math.round((r * (0.5 + u * 0.6)) / 4) * 4));
          ctx.drawImage(o, x - o.width / 2, y - o.height / 2);
        }
        break;
      }
      case P.Text: {
        const pop = u < 0.12 ? 1 + (0.12 - u) * 5 : 1;
        ctx.globalAlpha = Math.min(1, (1 - u) * 3);
        ctx.font = `bold ${Math.round(size[i] * pop)}px monospace`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.strokeText(text[i], x, y);
        ctx.fillStyle = color[i];
        ctx.fillText(text[i], x, y);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

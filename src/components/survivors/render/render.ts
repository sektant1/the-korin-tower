// Desenha o World num canvas 2D. Só lê o estado; interpola posições entre os dois últimos ticks
// (alpha) para o movimento ficar liso em telas acima de 60 Hz. Usa o atlas de sprites quando há
// (render/sprites.ts) e cai em formas desenhadas em código quando não há.
import { CHARACTERS } from "../data/characters";
import { ENEMY_LIST } from "../data/enemies";
import { TECHNIQUES } from "../data/techniques";
import { MAX_BULLETS, MAX_ENEMIES, MAX_GEMS, MAX_PROJ, PLAYER_R, type World } from "../sim/core";
import { forEachOrbit } from "../sim/techs";
import { barrel, crate, disc, dragonBall, ghost, glow, orb, shadow } from "./art";
import { consumeFx, drawFx, dust, flame } from "./fx";
import { drawMap } from "./maps";
import { drawSprite, hasSprite } from "./sprites";

type Ctx = CanvasRenderingContext2D;

export interface View {
  zoom: number; // px de tela por unidade do mundo
  w: number; // tamanho do canvas em px
  h: number;
}

const GEM_COLORS = ["#3a86e8", "#2fbf6a", "#ff3355"];
const gemTier = (v: number) => (v < 5 ? 0 : v < 25 ? 1 : 2);
const PICKUP_COLOR = { senzu: "#5fd13a", zeni: "#ffd21f", capsula: "#3a86e8", scouter: "#5aff5a", luz: "#fffbd0", ki: "#5ad7ff", carne: "#ff9a5a", furia: "#ff3b3b", barreira: "#7ae8ff", genki: "#9ad8ff", bolsa: "#ffd21f" } as const;
const PICKUP_GLYPH: Record<string, string> = { scouter: "S", luz: "☀", ki: "K", furia: "!", barreira: "◇", genki: "✺" };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bolsinha de Zeni (drop e marcador do ladrão). */
function zeniBag(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(x, y + 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 4, y - 8, 8, 6);
  ctx.fillStyle = "#c89a3a";
  ctx.beginPath();
  ctx.arc(x, y + 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 3, y - 7, 6, 4);
  ctx.fillStyle = "#7a5a1a";
  ctx.fillRect(x - 4, y - 3, 8, 2);
  ctx.fillStyle = "#ffd21f";
  ctx.fillRect(x - 1, y - 1, 2, 7);
  ctx.fillRect(x - 3, y, 6, 2);
  ctx.fillRect(x - 3, y + 3, 6, 2);
}

// rastro do herói (imagens residuais quando transformado) e ritmo da poeira
const trail: { x: number; y: number; t: number }[] = [];
let trailAt = 0,
  dustAt = 0,
  flameAt = 0;

const easeOut = (u: number) => 1 - (1 - u) ** 3;

/** Esfera de energia com halo (gradiente radial), somada à luz da cena. */
function energyBall(ctx: Ctx, x: number, y: number, r: number, color: string, t: number) {
  if (r <= 0.5) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, "#ffffff");
  g.addColorStop(0.45, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  // raios de luz girando
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = t * 6 + (k * Math.PI) / 2;
    const l = r * (1.8 + Math.sin(t * 40 + k) * 0.5);
    ctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  ctx.stroke();
}

/**
 * Feixe de ki (Kamehameha, Final Flash...): avança da mão até a ponta, brilha em camadas com
 * bordas que ondulam, riscos de energia correndo e uma espiral, e afina no fim.
 */
function drawBeam(ctx: Ctx, x: number, y: number, angle: number, len: number, width: number, life: number, max: number, color: string, t: number) {
  const age = max - life;
  const grow = easeOut(Math.min(1, age / 0.14));
  const fade = life < 0.18 ? life / 0.18 : 1;
  const L = len * grow;
  const W = width * (0.35 + 0.65 * fade) * (1 + Math.sin(t * 55) * 0.07) * (age < 0.06 ? 0.5 + age * 8 : 1);
  ctx.save();
  // mãos à frente do corpo
  ctx.translate(x + Math.cos(angle) * 8, y - 14 + Math.sin(angle) * 8);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";
  const wavy = (scale: number, amp: number, speed: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -W * scale * 0.6);
    for (let s = 0; s <= L; s += 8) {
      const taper = Math.min(1, 0.6 + s / 60); // sai estreito da mão e abre
      ctx.lineTo(s, -(W * scale * taper + Math.sin(s * 0.07 - t * speed) * W * amp));
    }
    for (let s = L; s >= 0; s -= 8) {
      const taper = Math.min(1, 0.6 + s / 60);
      ctx.lineTo(s, W * scale * taper + Math.sin(s * 0.07 - t * speed + 2) * W * amp);
    }
    ctx.closePath();
  };
  // 1) brilho externo largo
  ctx.globalAlpha = 0.28 * fade;
  ctx.fillStyle = color;
  wavy(0.95, 0.12, 38);
  ctx.fill();
  // 2) corpo: degradê de borda colorida para o centro branco
  const g = ctx.createLinearGradient(0, -W * 0.6, 0, W * 0.6);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.2, color);
  g.addColorStop(0.42, "#ffffff");
  g.addColorStop(0.58, "#ffffff");
  g.addColorStop(0.8, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.95 * fade;
  ctx.fillStyle = g;
  wavy(0.6, 0.05, 60);
  ctx.fill();
  // 3) espiral de energia em volta
  ctx.globalAlpha = 0.55 * fade;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, W * 0.06);
  for (const ph of [0, Math.PI]) {
    ctx.beginPath();
    for (let s = 0; s <= L; s += 6) ctx.lineTo(s, Math.sin(s * 0.06 - t * 26 + ph) * W * 0.38);
    ctx.stroke();
  }
  // 4) riscos correndo para a frente
  ctx.globalAlpha = 0.8 * fade;
  ctx.lineWidth = Math.max(1, W * 0.05);
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const sx = (t * 1100 + k * 157) % Math.max(1, L);
    const sy = Math.sin(k * 2.3) * W * 0.3;
    ctx.moveTo(sx, sy);
    ctx.lineTo(Math.min(L, sx + 26 + (k % 3) * 12), sy);
  }
  ctx.stroke();
  // 5) bola nas mãos e cabeça do feixe
  ctx.globalAlpha = fade;
  energyBall(ctx, 0, 0, W * 0.26, color, t);
  energyBall(ctx, L, 0, W * 0.5 * (1 + Math.sin(t * 30) * 0.1), color, t + 1);
  ctx.restore();
}

/** Raio em zigue-zague entre dois pontos (Raio do Kaioshin). */
function lightning(ctx: Ctx, x: number, y: number, a: number, len: number, seed: number) {
  const n = Math.max(2, Math.round(len / 14));
  const cx = Math.cos(a),
    cy = Math.sin(a);
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let k = 1; k < n; k++) {
    const u = k / n;
    const j = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
    const off = (j - Math.floor(j) - 0.5) * 16;
    ctx.lineTo(x + cx * len * u - cy * off, y + cy * len * u + cx * off);
  }
  ctx.lineTo(x + cx * len, y + cy * len);
  ctx.stroke();
}

export function render(ctx: Ctx, w: World, view: View, alpha: number) {
  const p = w.player;
  consumeFx(w);
  const camX = lerp(p.px, p.x, alpha),
    camY = lerp(p.py, p.y, alpha);
  const z = view.zoom;
  const shake = w.shake > 0 ? w.shake * 14 : 0;
  const ox = view.w / 2 - camX * z + (shake ? (Math.random() - 0.5) * shake : 0);
  const oy = view.h / 2 - camY * z + (shake ? (Math.random() - 0.5) * shake : 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawMap(ctx, camX, camY, view.w, view.h, z, ox, oy);

  ctx.setTransform(z, 0, 0, z, ox, oy);
  // área visível no mundo, para pular o que está fora
  const vx0 = camX - view.w / 2 / z - 60,
    vx1 = camX + view.w / 2 / z + 60;
  const vy0 = camY - view.h / 2 / z - 60,
    vy1 = camY + view.h / 2 / z + 60;
  const visible = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

  // arena do chefe
  if (w.arena) {
    ctx.strokeStyle = `rgba(255, 80, 60, ${0.55 + Math.sin(w.t * 6) * 0.2})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -w.t * 40;
    ctx.beginPath();
    ctx.arc(w.arena.x, w.arena.y, w.arena.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // poças de ki (Genki Dama Universal)
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "pool") continue;
    ctx.globalAlpha = 0.25 * Math.min(1, zn.life / 0.5) + Math.sin(w.t * 10) * 0.04;
    ctx.fillStyle = zn.color;
    ctx.beginPath();
    ctx.arc(zn.x, zn.y, zn.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // orbs de ki
  for (let i = 0; i < MAX_GEMS; i++) {
    if (!w.galive[i] || !visible(w.gx[i], w.gy[i])) continue;
    const tier = gemTier(w.gval[i]);
    const o = orb(GEM_COLORS[tier], 3 + tier * 1.5);
    ctx.drawImage(o, w.gx[i] - o.width / 2, w.gy[i] - o.height / 2);
  }

  // Esferas do Dragão
  for (const b of w.balls) {
    if (b.taken || !visible(b.x, b.y)) continue;
    const o = orb("#ffb21f", 14);
    ctx.globalAlpha = 0.5 + Math.sin(w.t * 5) * 0.2;
    ctx.drawImage(o, b.x - o.width / 2, b.y - o.height / 2);
    ctx.globalAlpha = 1;
    const img = dragonBall(b.stars);
    ctx.drawImage(img, b.x - img.width / 2, b.y - img.height / 2 + Math.sin(w.t * 3) * 2);
  }

  // itens
  for (const it of w.pickups) {
    if (!it.alive || !visible(it.x, it.y)) continue;
    const bob = Math.sin(w.t * 4 + it.x) * 2;
    if (it.kind === "senzu") {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + bob, 7, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5fd13a";
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + bob, 6, 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.kind === "zeni") {
      ctx.fillStyle = "#000";
      ctx.fillRect(it.x - 5, it.y - 5 + bob, 10, 10);
      ctx.fillStyle = "#ffd21f";
      ctx.fillRect(it.x - 4, it.y - 4 + bob, 8, 8);
      ctx.fillStyle = "#8a5a00";
      ctx.fillRect(it.x - 1, it.y - 3 + bob, 2, 6);
    } else if (it.kind === "capsula") {
      const o = orb("#ffffff", 10);
      ctx.drawImage(o, it.x - o.width / 2, it.y - o.height / 2 + bob);
      ctx.fillStyle = "#000";
      ctx.fillRect(it.x - 10, it.y - 6 + bob, 20, 12);
      ctx.fillStyle = it.value >= 5 ? "#ffd21f" : "#3a86e8";
      ctx.fillRect(it.x - 9, it.y - 5 + bob, 18, 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CC", it.x, it.y + 3 + bob);
    } else if (it.kind === "carne") {
      // coxa de carne: osso + pedaço
      ctx.fillStyle = "#000";
      ctx.fillRect(it.x - 8, it.y - 2 + bob, 6, 4);
      ctx.fillStyle = "#f0e8d8";
      ctx.fillRect(it.x - 7, it.y - 1 + bob, 5, 2);
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(it.x + 2, it.y + bob, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b8502a";
      ctx.beginPath();
      ctx.ellipse(it.x + 2, it.y + bob, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e88a4a";
      ctx.fillRect(it.x, it.y - 3 + bob, 3, 2);
    } else if (it.kind === "bolsa") {
      const o = orb("#ffd21f", 10);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(o, it.x - o.width / 2, it.y - o.height / 2 + bob);
      ctx.globalAlpha = 1;
      zeniBag(ctx, it.x, it.y + bob);
    } else {
      const big = it.kind === "genki" || it.kind === "furia" || it.kind === "barreira";
      const o = orb(PICKUP_COLOR[it.kind], big ? 8 : 6);
      ctx.drawImage(o, it.x - o.width / 2, it.y - o.height / 2 + bob);
      ctx.fillStyle = "#000";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(PICKUP_GLYPH[it.kind] ?? "?", it.x, it.y + 3 + bob);
    }
  }

  // auras (Barreira de Ki e Aura Divina)
  for (const t of w.techs) {
    const def = TECHNIQUES[t.id];
    if (def.kind !== "aura") continue;
    const r = 52 * t.p.area * w.stats.area;
    ctx.globalAlpha = 0.16 + Math.sin(w.t * 8) * 0.05;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(camX, camY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // explosões, clarões, ondas de choque
  for (const zn of w.zones) {
    if (!zn.alive) continue;
    const k = 1 - zn.life / zn.max;
    if (zn.kind === "blast") {
      ctx.globalAlpha = 1 - k;
      const o = orb(zn.color, Math.max(4, Math.round((zn.r * (0.5 + k * 0.6)) / 4) * 4));
      ctx.drawImage(o, zn.x - o.width / 2, zn.y - o.height / 2);
    } else if (zn.kind === "flash" || zn.kind === "shock") {
      ctx.globalAlpha = (1 - k) * (zn.kind === "flash" ? 0.5 : 0.8);
      ctx.strokeStyle = zn.color;
      ctx.lineWidth = zn.kind === "flash" ? 10 : 6;
      ctx.beginPath();
      ctx.arc(zn.x, zn.y, zn.r * (0.3 + 0.7 * k), 0, Math.PI * 2);
      ctx.stroke();
      if (zn.kind === "flash") {
        ctx.globalAlpha = (1 - k) * 0.25;
        ctx.fillStyle = zn.color;
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // sombras das Genki Damas que estão caindo
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "bomb") continue;
    const k = zn.life / zn.max;
    ctx.globalAlpha = 0.35 * (1 - k) + 0.1;
    ctx.strokeStyle = zn.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(zn.x, zn.y, zn.r * (1 - k * 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // redemoinhos (Rosquinha Galáctica): espiral girando no chão
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "vortex") continue;
    const k = zn.life / zn.max;
    const fade = Math.min(1, (1 - k) * 6, k * 4);
    ctx.save();
    ctx.translate(zn.x, zn.y);
    ctx.globalAlpha = 0.18 * fade;
    ctx.fillStyle = zn.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, zn.r * 1.5, zn.r * 1.5 * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = zn.color;
    ctx.lineWidth = 3;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let s = 0; s <= 1; s += 0.05) {
        const a = arm * 2.094 - w.t * 7 + s * 5;
        const r = zn.r * 1.4 * (1 - s);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
      }
      ctx.stroke();
    }
    // a rosquinha em si: anel grosso
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.6 * fade;
    ctx.beginPath();
    ctx.ellipse(0, 0, zn.r, zn.r * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // avisos dos chefes: meteoros (círculo enchendo) e lasers (linha fina piscando)
  for (const h of w.hazards) {
    if (!h.alive || h.warn <= 0) continue;
    const u = 1 - h.warn / h.warnMax;
    if (h.kind === "meteor") {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(w.t * 20);
      ctx.fillStyle = "#ff2a2a";
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "#ff3a3a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.globalAlpha = 0.15 + 0.35 * u;
      ctx.fillStyle = "#ff2a2a";
      ctx.fillRect(0, -h.r * u, h.len, h.r * 2 * u);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(w.t * 30);
      ctx.fillRect(0, -1, h.len, 2);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;

  drawFx(ctx, "under");

  // inimigos
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    const x = lerp(w.epx[i], w.ex[i], alpha),
      y = lerp(w.epy[i], w.ey[i], alpha);
    if (!visible(x, y)) continue;
    const def = ENEMY_LIST[w.ekind[i]];
    if (def.tier === "crate") {
      const c = def.id === "barril" ? barrel() : crate();
      ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
      continue;
    }
    const fuse = w.efuse[i];
    const exploder = def.behavior === "exploder";
    // kamikaze com o pavio aceso: pisca branco cada vez mais rápido
    const flash = w.eflash[i] > 0.06 || (exploder && fuse > 0 && Math.floor(w.t * (30 - fuse * 25)) % 2 === 0);
    const key = def.sprite ?? def.id;
    const age = w.t - w.eborn[i];
    const grow = age < 0.25 ? 0.35 + (age / 0.25) * 0.65 : 1; // brota do chão
    // aviso da investida: faixa na direção marcada
    if (fuse > 0 && !exploder) {
      const len = def.tier === "boss" ? 330 : def.tier === "elite" ? 300 : 230;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(w.eang[i]);
      const c = def.tier === "brute" ? "#ff8a1f" : "#ff2a4a";
      const u = 1 - fuse / 0.7; // a faixa se estreita até a investida
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(w.t * 25);
      ctx.fillStyle = c;
      ctx.fillRect(0, -def.radius * (1.2 - u * 0.5), len, def.radius * (2.4 - u));
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(w.t * 25);
      ctx.fillRect(0, -1, len, 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (exploder && fuse > 0) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#ff3a1a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 64 * (1 - fuse / 0.7) + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // ladrão: brilho dourado e um Ƶ em cima, para ser caçado
    if (def.behavior === "flee") {
      const g = glow("#ffd21f", def.radius * 1.8);
      ctx.globalAlpha = 0.5 + Math.sin(w.t * 10) * 0.2;
      ctx.drawImage(g, x - g.width / 2, y - g.height / 2 - def.radius * 0.6);
      ctx.globalAlpha = 1;
      zeniBag(ctx, x, y - def.radius * 2.9 + Math.sin(w.t * 6) * 2);
    }
    // elites e chefe: aura pulsando atrás do sprite
    if (def.tier === "elite" || def.tier === "boss") {
      const enraged = def.tier === "boss" && w.ehp[i] < w.emax[i] * 0.3;
      const g = glow(enraged ? "#ff2a2a" : def.color, def.radius * (def.tier === "boss" ? 2.2 : 1.6));
      ctx.globalAlpha = 0.35 + Math.sin(w.t * (enraged ? 16 : 6) + i) * 0.15;
      ctx.drawImage(g, x - g.width / 2, y - g.height / 2 - def.radius * 0.6);
      ctx.globalAlpha = 1;
    }
    const sh = shadow(def.radius * 2 + 6);
    ctx.drawImage(sh, x - sh.width / 2, y + def.radius * 0.6 - sh.height / 2);
    const stunned = w.estun[i] > 0;
    const dashing = w.edash[i] > 0;
    if (grow < 1) ctx.globalAlpha = grow;
    // andar: um quique leve; investida: inclina para a frente
    const bob = stunned ? 0 : Math.abs(Math.sin(w.t * 9 + i)) * -1.5;
    const flip = dashing ? Math.cos(w.eang[i]) < 0 : w.eflag[i] ? Math.cos(w.eang[i]) < 0 : w.player.x < x;
    const drawn = drawSprite(ctx, key, stunned ? "hurt" : fuse > 0 || dashing ? "cast" : "move", stunned ? 0 : w.t * (dashing ? 2 : 1) + i * 0.37, x, y + def.radius + bob, flip, flash, grow);
    ctx.globalAlpha = 1;
    if (!drawn) {
      const img = disc(def.color, def.radius, flash);
      ctx.drawImage(img, x - img.width / 2, y - img.height / 2);
    }
    // kamikaze: faísca de pavio sobre a cabeça (some quando a explosão começa: aí ele pisca inteiro)
    if (exploder && fuse <= 0 && drawn) {
      const top = y - def.radius * 2.4;
      ctx.fillStyle = Math.floor(w.t * 8 + i) % 2 ? "#ffd21f" : "#ff3a1a";
      ctx.fillRect(x - 2, top - 2, 4, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 1, top - 1, 2, 2);
    }
    if (stunned) {
      ctx.fillStyle = "#ffd21f";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("✦", x + Math.cos(w.t * 8) * 8, y - def.radius - 6);
    }
    if (def.tier === "elite" || (def.tier === "brute" && w.ehp[i] < w.emax[i])) {
      const hw = def.radius;
      const top = y - (drawn ? def.radius * 2.6 : def.radius) - 8;
      ctx.fillStyle = "#000";
      ctx.fillRect(x - hw, top, hw * 2, 4);
      ctx.fillStyle = def.tier === "elite" ? "#ff8a1f" : "#ff3355";
      ctx.fillRect(x - hw, top, hw * 2 * Math.max(0, w.ehp[i] / w.emax[i]), 4);
    }
  }

  // herói
  const ch = CHARACTERS[w.char];
  const form = w.form > 0 ? ch.forms[w.form - 1] : null;
  const blink = p.invuln > 0 && w.immortal <= 0 && Math.floor(w.t * 20) % 2 === 0;
  if (form) {
    const g = glow(form.aura, 34 + w.form * 6);
    ctx.globalAlpha = 0.75 + Math.sin(w.t * 18) * 0.2;
    ctx.drawImage(g, camX - g.width / 2, camY - g.height / 2 - 10);
    ctx.globalAlpha = 1;
  }
  if (w.immortal > 0) {
    const g = glow("#ffe14a", 30);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(g, camX - g.width / 2, camY - g.height / 2 - 8);
    ctx.globalAlpha = 1;
  }
  if (p.rage > 0) {
    const g = glow("#ff2a2a", 30);
    ctx.globalAlpha = 0.45 + Math.sin(w.t * 20) * 0.15;
    ctx.drawImage(g, camX - g.width / 2, camY - g.height / 2 - 8);
    ctx.globalAlpha = 1;
  }
  const sh = shadow(28);
  ctx.drawImage(sh, camX - sh.width / 2, camY + PLAYER_R * 0.7 - sh.height / 2);
  // Escudo de Ki: uma bolha azul; mais cargas, mais forte
  if (p.shield >= 1) {
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.06 * Math.min(4, p.shield) + Math.sin(w.t * 4) * 0.05;
    ctx.strokeStyle = "#7ae8ff";
    ctx.lineWidth = 1.5 + Math.min(4, p.shield) * 0.5;
    ctx.beginPath();
    ctx.arc(camX, camY - 6, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const heroKey = form && hasSprite(form.sprite) ? form.sprite : ch.sprite;
  // rastro: imagens residuais quando transformado (ou com o Instinto Superior)
  if (w.t - trailAt > 0.05) {
    trailAt = w.t;
    trail.unshift({ x: camX, y: camY, t: w.t });
    if (trail.length > 5) trail.pop();
  }
  if (form || w.scrolls.includes("instinto")) {
    for (let k = trail.length - 1; k >= 1; k--) {
      const tr = trail[k];
      if (Math.abs(tr.x - camX) + Math.abs(tr.y - camY) < 3) continue;
      ctx.globalAlpha = 0.22 * (1 - k / trail.length);
      drawSprite(ctx, heroKey, "move", tr.t, tr.x, tr.y + PLAYER_R, p.faceX < 0, false);
    }
    ctx.globalAlpha = 1;
  }
  if (p.moving && w.t - dustAt > 0.12) {
    dustAt = w.t;
    dust(camX, camY + PLAYER_R);
  }
  if (form && w.t - flameAt > 0.035) {
    flameAt = w.t;
    flame(camX, camY + PLAYER_R - 4, form.aura, 28);
  }
  if (!blink) {
    const key = heroKey;
    // carregando um feixe: a esfera cresce nas mãos nos últimos 0,5 s antes do disparo
    const charging = w.techs.find((t) => TECHNIQUES[t.id].kind === "beam" && t.timer < 0.5 && t.timer > 0);
    const casting = !!charging || w.zones.some((zn) => zn.alive && (zn.kind === "beam" || zn.kind === "nova")) || w.techs.some((t) => t.burst > 0);
    const anim = p.hurt < 0.2 ? "hurt" : casting ? "cast" : p.moving ? "move" : "idle";
    // andando: quique e leve inclinação para a frente
    const bob = p.moving ? -Math.abs(Math.sin(w.t * 11)) * 2 : Math.sin(w.t * 3) * 0.6;
    const tilt = p.moving ? p.faceX * 0.07 : 0;
    ctx.save();
    ctx.translate(camX, camY + PLAYER_R + bob);
    ctx.rotate(tilt);
    // no cast, a animação segue a carga (agacha, junta as mãos, dispara)
    const animT = charging ? (0.5 - charging.timer) * 4 : w.t;
    const drawn = drawSprite(ctx, key, anim, animT, 0, 0, p.faceX < 0, p.hurt < 0.08);
    ctx.restore();
    if (charging) {
      const u = 1 - charging.timer / 0.5;
      const hx = camX + (p.faceX < 0 ? -10 : 10),
        hy = camY - 6;
      const c = TECHNIQUES[charging.id].color;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // faíscas convergindo para as mãos
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = k * 0.785 + w.t * 3;
        const r = 40 * (1 - ((w.t * 3 + k * 0.13) % 1));
        ctx.moveTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r);
        ctx.lineTo(hx + Math.cos(a) * (r - 7), hy + Math.sin(a) * (r - 7));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      energyBall(ctx, hx, hy, 2 + u * 7 * (1 + Math.sin(w.t * 50) * 0.15), c, w.t);
      ctx.restore();
    }
    if (!drawn) {
      const body = disc(ch.color, PLAYER_R);
      ctx.drawImage(body, camX - body.width / 2, camY - body.height / 2);
      // cabelo espetado virado para onde ele anda
      const a = Math.atan2(p.faceY, p.faceX);
      ctx.fillStyle = form?.hair ?? ch.hair;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        const b = a + Math.PI + k * 0.45;
        ctx.moveTo(camX + Math.cos(b - 0.2) * PLAYER_R * 0.6, camY - 4 + Math.sin(b - 0.2) * PLAYER_R * 0.6);
        ctx.lineTo(camX + Math.cos(b) * PLAYER_R * 1.7, camY - 4 + Math.sin(b) * PLAYER_R * 1.7);
        ctx.lineTo(camX + Math.cos(b + 0.2) * PLAYER_R * 0.6, camY - 4 + Math.sin(b + 0.2) * PLAYER_R * 0.6);
      }
      ctx.fill();
    }
  }
  // HP sob o herói
  const hpw = 30;
  ctx.fillStyle = "#000";
  ctx.fillRect(camX - hpw / 2 - 1, camY + PLAYER_R + 5, hpw + 2, 5);
  ctx.fillStyle = p.hp / w.stats.maxHp > 0.3 ? "#5fd13a" : "#ff3355";
  ctx.fillRect(camX - hpw / 2, camY + PLAYER_R + 6, hpw * Math.max(0, p.hp / w.stats.maxHp), 3);

  // cortes (espada, soco)
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "slash") continue;
    const k = 1 - zn.life / zn.max;
    ctx.save();
    ctx.translate(zn.x, zn.y);
    ctx.rotate(zn.angle);
    ctx.globalAlpha = 1 - k * 0.8;
    ctx.fillStyle = zn.color;
    ctx.beginPath();
    const r = zn.len,
      h = zn.width / 2;
    ctx.moveTo(4, -h * 0.9);
    ctx.quadraticCurveTo(r * 1.25, 0, 4, h * 0.9);
    ctx.quadraticCurveTo(r * 0.85, 0, 4, -h * 0.9);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.beginPath();
    ctx.moveTo(8, -h * 0.6);
    ctx.quadraticCurveTo(r * 1.15, 0, 8, h * 0.6);
    ctx.quadraticCurveTo(r * 0.95, 0, 8, -h * 0.6);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // projéteis
  for (let q = 0; q < MAX_PROJ; q++) {
    if (!w.qalive[q]) continue;
    const x = lerp(w.qpx[q], w.qx[q], alpha),
      y = lerp(w.qpy[q], w.qy[q], alpha);
    if (!visible(x, y)) continue;
    const t = w.techs[w.qslot[q]];
    if (!t) continue;
    const color = TECHNIQUES[t.id].color;
    const mode = w.qmode[q];
    if (mode === 1 || mode === 2) {
      // Kienzan: disco achatado girando
      const r = w.qr[q];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(w.t * 20 + q);
      ctx.fillStyle = "rgba(255,224,138,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.3, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8d0";
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (mode === 3) {
      const g = ghost(color);
      ctx.drawImage(g, x - g.width / 2, y - g.height / 2 + Math.sin(w.t * 10 + q) * 2);
    } else {
      const c = mode === 4 ? "#ff7a1a" : color;
      const waiting = mode === 5 && w.qdelay[q] > 0;
      if (!waiting) {
        // rastro: risco do tamanho da velocidade
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(2, w.qr[q] * 1.1);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - w.qvx[q] * 0.045, y - w.qvy[q] * 0.045);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const pulse = waiting ? 1 + Math.sin(w.t * 30 + q) * 0.25 : 1;
      const o = orb(c, Math.max(3, Math.round(w.qr[q] * pulse)));
      ctx.drawImage(o, x - o.width / 2, y - o.height / 2);
    }
  }

  // Sokidan: esferas em órbita com um rastro curto
  for (const t of w.techs) {
    const def = TECHNIQUES[t.id];
    if (def.kind !== "orbit") continue;
    for (let k = 3; k >= 0; k--) {
      ctx.globalAlpha = k === 0 ? 1 : 0.25 / k;
      forEachOrbit(w, t, camX, camY - 8, w.t - k * 0.02, (bx, by, r) => {
        const o = orb(def.color, Math.max(3, Math.round(r)));
        ctx.drawImage(o, bx - o.width / 2, by - o.height / 2);
      });
    }
    ctx.globalAlpha = 1;
  }

  // Kikoho: anel quadrado (o triângulo do Tenshinhan) que cresce
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "nova") continue;
    const u = 1 - zn.life / zn.max;
    const r = zn.r * Math.sin(u * Math.PI * 0.5);
    ctx.globalAlpha = 0.25 * (1 - u);
    ctx.fillStyle = zn.color;
    ctx.beginPath();
    ctx.arc(zn.x, zn.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1 - u * 0.7;
    ctx.strokeStyle = zn.color;
    ctx.lineWidth = 10 * (1 - u) + 2;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3 * (1 - u) + 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Raio do Kaioshin: zigue-zague com brilho
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "chain") continue;
    const k = zn.life / zn.max;
    const seed = Math.floor(w.t * 30) + zn.x;
    ctx.globalAlpha = k;
    ctx.strokeStyle = zn.color;
    ctx.lineWidth = 6;
    lightning(ctx, zn.x, zn.y, zn.angle, zn.len, seed);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    lightning(ctx, zn.x, zn.y, zn.angle, zn.len, seed);
  }
  ctx.globalAlpha = 1;

  // Genki Dama caindo do céu
  for (const zn of w.zones) {
    if (!zn.alive || zn.kind !== "bomb") continue;
    const k = zn.life / zn.max;
    const o = orb(zn.color, Math.max(6, Math.round(zn.r / 3)));
    ctx.drawImage(o, zn.x - o.width / 2, zn.y - o.height / 2 - k * 260);
  }

  // feixes e raios
  for (const zn of w.zones) {
    if (!zn.alive || (zn.kind !== "beam" && zn.kind !== "lance")) continue;
    const k = zn.life / zn.max;
    ctx.save();
    ctx.translate(zn.x, zn.y);
    ctx.rotate(zn.angle);
    const t = w.techs[zn.slot];
    if (zn.kind === "lance" && t && TECHNIQUES[t.id].extra?.volley) {
      // laser fino e reto (Death Beam, Eye Laser): halo na cor, núcleo branco e brilho na ponta do dedo
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = zn.color;
      ctx.fillRect(0, -zn.width * 0.75, zn.len, zn.width * 1.5);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, -Math.max(0.5, zn.width * 0.25), zn.len, Math.max(1, zn.width * 0.5));
      const g = glow(zn.color, 10);
      ctx.drawImage(g, -10, -10);
      ctx.globalCompositeOperation = "source-over";
    } else if (zn.kind === "lance") {
      // Makankosappo: linha fina com a espiral em volta
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, -zn.width / 4, zn.len, zn.width / 2);
      ctx.strokeStyle = zn.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= zn.len; s += 6) ctx.lineTo(s, Math.sin(s * 0.25 + w.t * 30) * zn.width);
      ctx.stroke();
    }
    ctx.restore();
    if (zn.kind === "beam") drawBeam(ctx, zn.x, zn.y, zn.angle, zn.len, zn.width, zn.life, zn.max, zn.color, w.t);
  }
  ctx.globalAlpha = 1;

  // tiros inimigos
  for (let b = 0; b < MAX_BULLETS; b++) {
    if (!w.balive[b]) continue;
    const x = lerp(w.bpx[b], w.bx[b], alpha),
      y = lerp(w.bpy[b], w.by[b], alpha);
    if (!visible(x, y)) continue;
    const big = w.br[b] > 12;
    const o = orb(big ? "#ff5a1a" : "#d83aff", Math.max(3, Math.round(w.br[b] * 0.8)));
    ctx.drawImage(o, x - o.width / 2, y - o.height / 2);
  }

  // lasers dos chefes disparando
  for (const h of w.hazards) {
    if (!h.alive || h.warn > 0 || h.kind !== "laser") continue;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.angle);
    const wd = h.r * 2 * (1 + Math.sin(w.t * 50) * 0.08);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = h.color;
    ctx.fillRect(0, -wd / 2, h.len, wd);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, -wd / 5, h.len, (wd * 2) / 5);
    ctx.restore();
  }

  drawFx(ctx, "over");

  // números de dano (saltam ao aparecer; crítico maior)
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#000";
  for (const n of w.numbers) {
    if (!n.alive || !visible(n.x, n.y)) continue;
    ctx.globalAlpha = Math.min(1, (0.7 - n.t) / 0.25);
    const pop = n.t < 0.08 ? 1.5 - n.t * 6 : 1;
    ctx.font = `bold ${Math.round((n.crit ? 14 : 10) * pop)}px monospace`;
    const y = n.y - n.t * 30;
    ctx.strokeText(String(n.v), n.x, y);
    ctx.fillStyle = n.crit ? "#ffd21f" : "#ffffff";
    ctx.fillText(String(n.v), n.x, y);
  }
  ctx.globalAlpha = 1;

  /* ---------- tela ---------- */
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // setas para elites e chefe fora da tela
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    const tier = ENEMY_LIST[w.ekind[i]].tier;
    if ((tier !== "elite" && tier !== "boss") || visible(w.ex[i], w.ey[i])) continue;
    arrow(ctx, view, Math.atan2(w.ey[i] - camY, w.ex[i] - camX), tier === "boss" ? "#ff2a2a" : "#ff8a1f", tier === "boss" ? 16 : 12);
  }

  radar(ctx, w, view, camX, camY);

  // HP baixo: bordas vermelhas pulsando
  const hpFrac = p.hp / w.stats.maxHp;
  if (hpFrac < 0.3 && p.hp > 0) {
    const k = (0.3 - hpFrac) / 0.3;
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.35, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
    g.addColorStop(0, "rgba(255,0,40,0)");
    g.addColorStop(1, `rgba(255,0,40,${(0.25 + 0.2 * Math.sin(w.t * 8)) * k + 0.1})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  if (w.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, w.flash * 1.5);
    ctx.fillStyle = w.flashColor;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.globalAlpha = 1;
  }
}

function arrow(ctx: Ctx, view: View, a: number, color: string, size: number) {
  const rx = view.w / 2 - 24,
    ry = view.h / 2 - 24;
  const s = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
  const x = view.w / 2 + Math.cos(a) * s,
    y = view.h / 2 + Math.sin(a) * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(size + 2, 0);
  ctx.lineTo(-size / 2 - 2, -size * 0.75);
  ctx.lineTo(-size / 2 - 2, size * 0.75);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size / 2, -size * 0.6);
  ctx.lineTo(-size / 2, size * 0.6);
  ctx.fill();
  ctx.restore();
}

/** Radar do Dragão no canto inferior direito: aponta as esferas que faltam. */
function radar(ctx: Ctx, w: World, view: View, camX: number, camY: number) {
  let thief = -1;
  for (let i = 0; i < MAX_ENEMIES && thief < 0; i++) if (w.ealive[i] && ENEMY_LIST[w.ekind[i]].behavior === "flee") thief = i;
  if (!w.balls.length && thief < 0) return;
  const R = 54;
  const cx = view.w - R - 18,
    cy = view.h - R - 18;
  ctx.fillStyle = "#e8e8e8";
  ctx.beginPath();
  ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0e3a1a";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(90, 255, 120, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -R; k <= R; k += 18) {
    ctx.moveTo(cx + k, cy - R);
    ctx.lineTo(cx + k, cy + R);
    ctx.moveTo(cx - R, cy + k);
    ctx.lineTo(cx + R, cy + k);
  }
  ctx.stroke();
  // varredura
  const a = (w.t * 2) % (Math.PI * 2);
  ctx.strokeStyle = "rgba(120, 255, 140, 0.6)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#ff3355";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.fill();
  for (const b of w.balls) {
    if (b.taken) continue;
    const dx = b.x - camX,
      dy = b.y - camY;
    const d = Math.hypot(dx, dy);
    const k = Math.min(R - 6, d / 20) / (d || 1);
    ctx.globalAlpha = 0.6 + Math.sin(w.t * 8 + b.stars) * 0.4;
    ctx.fillStyle = "#ffb21f";
    ctx.beginPath();
    ctx.arc(cx + dx * k, cy + dy * k, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // ladrão: quadradinho dourado piscando
  if (thief >= 0) {
    const dx = w.ex[thief] - camX,
      dy = w.ey[thief] - camY;
    const d = Math.hypot(dx, dy);
    const k = Math.min(R - 6, d / 20) / (d || 1);
    ctx.globalAlpha = Math.floor(w.t * 6) % 2 ? 1 : 0.4;
    ctx.fillStyle = "#fff6a0";
    ctx.fillRect(cx + dx * k - 3, cy + dy * k - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  // esferas coletadas, acima do radar
  for (let s = 0; s < 7; s++) {
    ctx.fillStyle = s < w.ballsFound ? "#ffb21f" : "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(cx - 36 + s * 12, cy - R - 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

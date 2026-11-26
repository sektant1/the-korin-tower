// Jogador automático para testes headless e balanceamento: foge do centro de massa dos
// inimigos próximos girando em volta dele, vai buscar orbs quando está calmo, escolhe a 1ª carta.
import { ENEMY_LIST } from "../data/enemies";
import { TECHNIQUES } from "../data/techniques";
import { MAX_ENEMIES, MAX_GEMS, canTransform, type Input, type World } from "./world";

/** Carta que um jogador razoável escolheria: subir o que já tem, buscar a passiva da evolução. */
export function botPick(w: World) {
  const want = new Set(w.techs.map((t) => TECHNIQUES[t.id].evolvesWith));
  let best = 0,
    score = -1;
  w.offers.forEach((o, i) => {
    let s = 0;
    if (o.type === "tech") s = o.level > 1 ? 10 + o.level + (o.gold ? 5 : 0) : w.techs.length < 4 ? 6 : 2;
    else if (o.type === "passive") s = want.has(o.id) ? 9 : o.level > 1 ? 5 : 3;
    else if (o.type === "union") s = 30;
    else if (o.type === "pact") s = 4;
    else if (o.type === "item") s = 1;
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return best;
}

export function botInput(w: World): Input {
  const input = steer(w);
  input.transform = canTransform(w);
  return input;
}

function steer(w: World): Input {
  const p = w.player;
  let cx = 0,
    cy = 0,
    n = 0;
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i]) continue;
    const dx = w.ex[i] - p.x,
      dy = w.ey[i] - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 220 * 220) continue;
    const k = 1 / (d2 + 1);
    cx += dx * k;
    cy += dy * k;
    n++;
  }
  // orb mais perto: puxa o herói enquanto ele foge
  let best = -1,
    bd = Infinity;
  for (let i = 0; i < MAX_GEMS; i++) {
    if (!w.galive[i]) continue;
    const d = (w.gx[i] - p.x) ** 2 + (w.gy[i] - p.y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  let gx = 0,
    gy = 0;
  // Esfera do Dragão pendente: vale mais que um orb
  // (só quando está calmo; no meio da horda ela fica para depois)
  const ball = n ? undefined : (w.balls.find((b) => !b.taken) ?? w.pickups.find((q) => q.alive && q.kind === "capsula"));
  if (ball) {
    const d = Math.hypot(ball.x - p.x, ball.y - p.y) || 1;
    gx = (ball.x - p.x) / d;
    gy = (ball.y - p.y) / d;
  } else if (best >= 0) {
    const d = Math.sqrt(bd) || 1;
    gx = (w.gx[best] - p.x) / d;
    gy = (w.gy[best] - p.y) / d;
  }
  // perigos marcados no chão (meteoros, lasers) e kamikazes acesos: sai de perto
  let hx = 0,
    hy = 0;
  for (const h of w.hazards) {
    if (!h.alive || h.warn <= 0) continue;
    if (h.kind === "meteor") {
      const dx = p.x - h.x,
        dy = p.y - h.y,
        d = Math.hypot(dx, dy) || 1;
      if (d < h.r + 30) {
        hx += dx / d;
        hy += dy / d;
      }
    } else {
      // lado da linha em que o herói está: anda para longe dela
      const nx = -Math.sin(h.angle),
        ny = Math.cos(h.angle);
      const side = (p.x - h.x) * nx + (p.y - h.y) * ny;
      if (Math.abs(side) < h.r + 40) {
        hx += nx * Math.sign(side || 1) * 1.5;
        hy += ny * Math.sign(side || 1) * 1.5;
      }
    }
  }
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!w.ealive[i] || (w.efuse[i] <= 0 && w.edash[i] <= 0)) continue;
    const dx = p.x - w.ex[i],
      dy = p.y - w.ey[i],
      d = Math.hypot(dx, dy) || 1;
    if (ENEMY_LIST[w.ekind[i]].behavior === "exploder") {
      if (d < 90) {
        hx += dx / d;
        hy += dy / d;
      }
      continue;
    }
    // investida marcada: sai da linha pelo lado mais perto
    const ux = Math.cos(w.eang[i]),
      uy = Math.sin(w.eang[i]);
    const ahead = dx * ux + dy * uy;
    const side = -dx * uy + dy * ux;
    if (ahead > -20 && ahead < 360 && Math.abs(side) < 60) {
      const sg = Math.sign(side || 1);
      hx += -uy * sg * 2;
      hy += ux * sg * 2;
    }
  }
  if (hx || hy) {
    const l = Math.hypot(hx, hy);
    return { mx: hx / l, my: hy / l };
  }
  if (n) {
    const l = Math.hypot(cx, cy) || 1;
    // afasta e gira (tangente), como um humano fazendo kite, puxado de leve pelo orb
    return { mx: -cx / l + (-cy / l) * 0.8 + gx * 0.6, my: -cy / l + (cx / l) * 0.8 + gy * 0.6 };
  }
  if (ball || best >= 0) return { mx: gx, my: gy };
  return { mx: Math.cos(w.t * 0.3), my: Math.sin(w.t * 0.3) };
}

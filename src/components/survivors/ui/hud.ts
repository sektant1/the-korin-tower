// Fotografia do World para o React (lida a cada ~100 ms, não a cada quadro).
import { CHARACTERS } from "../data/characters";
import { ENEMY_LIST } from "../data/enemies";
import { PASSIVES } from "../data/passives";
import { SCROLLS } from "../data/scrolls";
import { TECHNIQUES } from "../data/techniques";
import { ICON, KIND_ICON } from "./icons";
import { canTransform, formAvailable, type World } from "../sim/core";

export interface SlotView {
  id: string;
  name: string;
  level: number;
  max: number;
  color: string;
  evo: boolean;
  icon: string;
}

export interface Hud {
  t: number;
  level: number;
  xp: number; // 0..1
  hp: number;
  maxHp: number;
  kills: number;
  zeni: number;
  techs: SlotView[];
  passives: SlotView[];
  notices: string[];
  ki: number;
  form: string | null;
  formReady: string | null; // nome do degrau pronto para usar
  formNext: number | null; // nível que libera o próximo degrau
  transformCd: number;
  boss: { name: string; hp: number } | null;
  bossIn: number; // s até o chefe
  revives: number;
  ballsFound: number;
  immortal: number;
  scrolls: { name: string; color: string }[];
  nightmare: boolean;
}

export function readHud(w: World): Hud {
  const ch = CHARACTERS[w.char];
  const avail = formAvailable(w);
  const levels = [10, 25, 40];
  return {
    t: w.t,
    level: w.player.level,
    xp: w.player.xp / w.player.xpNext,
    hp: w.player.hp,
    maxHp: w.stats.maxHp,
    kills: w.player.kills,
    zeni: w.player.zeni,
    techs: w.techs.map((t) => {
      const d = TECHNIQUES[t.id];
      return { id: t.id, name: d.name, level: t.level, max: d.max, color: d.color, evo: !!(d.from || d.union), icon: KIND_ICON[d.kind] };
    }),
    passives: w.passives.map((p) => ({ id: p.id, name: PASSIVES[p.id].name, level: p.level, max: PASSIVES[p.id].max, color: PASSIVES[p.id].color, evo: false, icon: ICON.passive })),
    notices: w.notices.map((n) => n.text),
    ki: w.ki,
    form: w.form > 0 ? ch.forms[w.form - 1].name : null,
    formReady: canTransform(w) ? ch.forms[avail - 1].name : null,
    formNext: avail < ch.forms.length ? levels[avail] : null,
    transformCd: w.transformCd,
    boss: w.boss >= 0 ? { name: ENEMY_LIST[w.ekind[w.boss]].name, hp: Math.max(0, w.ehp[w.boss] / w.emax[w.boss]) } : null,
    bossIn: w.bossAt - w.t,
    revives: w.revives,
    ballsFound: w.ballsFound,
    immortal: w.immortal,
    scrolls: w.scrolls.map((id) => ({ name: SCROLLS[id].name, color: SCROLLS[id].color })),
    nightmare: w.nightmare,
  };
}

export const fmtTime = (t: number) => `${String(Math.floor(Math.max(0, t) / 60)).padStart(2, "0")}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, "0")}`;

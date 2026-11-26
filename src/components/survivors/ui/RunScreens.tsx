"use client";
// Telas durante a run: HUD, cartas de nível, Cápsula, Shenlong, pergaminho, pausa e resultado.
// Textos da interface em inglês.
import type { ReactNode } from "react";
import type { RunSummary } from "../data/achievements";
import { ITEMS, PACTS, SETS } from "../data/cards";
import { CHARACTERS } from "../data/characters";
import { PASSIVES } from "../data/passives";
import { SCROLLS } from "../data/scrolls";
import { TECHNIQUES, UNIONS } from "../data/techniques";
import { WISHES } from "../data/wishes";
import { MAX_SLOTS, UNION_LEVEL, offerName, offerText, type Offer, type World } from "../sim/core";
import { fmtTime, type Hud, type SlotView } from "./hud";
import { ICON, KIND_ICON, fmt } from "./icons";

/* ---------- peças ---------- */

/** Marcadores de nível: cheios até `have`, destacados até `next`. */
function Pips({ max, have, next = have, color }: { max: number; have: number; next?: number; color: string }) {
  if (max <= 1) return null;
  return (
    <span className="ss-pips2" aria-label={`level ${next} of ${max}`}>
      {Array.from({ length: max }, (_, k) => (
        <i key={k} className={k < have ? "on" : k < next ? "new" : ""} style={k < next ? { background: color } : undefined} />
      ))}
    </span>
  );
}

function Slots({ list, passive }: { list: SlotView[]; passive?: boolean }) {
  return (
    <div className="ss-slotrow">
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const s = list[i];
        return (
          <span key={i} className={`ss-slot2 ${passive ? "ss-slot-passive" : ""} ${s?.evo ? "ss-slot-evo" : ""}`} style={s ? { borderColor: s.color, color: s.color } : undefined}>
            {s && (
              <>
                <b>{s.icon}</b>
                {s.evo ? <em>★</em> : <Pips max={s.max} have={s.level} color={s.color} />}
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function HudView({ hud }: { hud: Hud }) {
  const hpFrac = Math.max(0, hud.hp / hud.maxHp);
  return (
    <div className="ss-hud">
      <div className="ss-xp">
        <div className="ss-xp-fill" style={{ width: `${Math.min(1, hud.xp) * 100}%` }} />
        <span>LV {hud.level}</span>
      </div>
      <div className="ss-hudleft">
        <div className={`ss-hp ${hpFrac < 0.3 ? "low" : ""}`}>
          <i style={{ width: `${hpFrac * 100}%` }} />
          <span>
            {Math.ceil(hud.hp)} / {Math.round(hud.maxHp)}
          </span>
        </div>
        <Slots list={hud.techs} />
        <Slots list={hud.passives} passive />
        {hud.scrolls.length > 0 && (
          <div className="ss-slotrow">
            {hud.scrolls.map((sc) => (
              <span key={sc.name} className="ss-scrollchip" style={{ borderColor: sc.color, color: sc.color }}>
                {ICON.scroll} {sc.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={`ss-time ${hud.bossIn < 60 && !hud.boss ? "ss-warn" : ""}`}>{fmtTime(hud.t)}</div>
      {hud.boss && (
        <div className="ss-bossbar">
          <span>{hud.boss.name}</span>
          <div>
            <i style={{ width: `${hud.boss.hp * 100}%` }} />
          </div>
        </div>
      )}
      <div className="ss-stats">
        <span title="Kills">☠ {fmt(hud.kills)}</span>
        <span title="Zeni">Ƶ {fmt(hud.zeni)}</span>
        <span title="Dragon Balls" className="ss-balls">
          {Array.from({ length: 7 }, (_, k) => (
            <i key={k} className={k < hud.ballsFound ? "on" : ""} />
          ))}
        </span>
        {hud.revives > 0 && <span title="Extra lives">♥ {hud.revives}</span>}
        {hud.immortal > 0 && hud.immortal < 1e6 && <span>✦ {Math.ceil(hud.immortal)}s</span>}
        {hud.nightmare && <span className="ss-nm-tag">☠ NIGHTMARE</span>}
      </div>
      <div className={`ss-ki ${hud.formReady ? "ss-ki-ready" : ""} ${hud.form ? "ss-ki-active" : ""}`}>
        <div className="ss-ki-bar">
          <i style={{ width: `${hud.ki * 100}%` }} />
        </div>
        <span>
          {hud.form
            ? hud.form
            : hud.formReady
              ? `SPACE: ${hud.formReady}`
              : hud.transformCd > 0
                ? `Ki recovering… ${Math.ceil(hud.transformCd)}s`
                : hud.formNext && hud.level < hud.formNext
                  ? `Transformation unlocks at LV ${hud.formNext}`
                  : "Ki"}
        </span>
      </div>
      <div className="ss-notices">
        {hud.notices.map((n, i) => (
          <p key={`${i}:${n}`}>{n}</p>
        ))}
      </div>
    </div>
  );
}

/* ---------- cartas de nível ---------- */

function offerColor(o: Offer) {
  if (o.type === "tech" || o.type === "union") return TECHNIQUES[o.id].color;
  if (o.type === "passive") return PASSIVES[o.id].color;
  if (o.type === "pact") return "#ff2a4a";
  if (o.type === "item") return ITEMS[o.id].color;
  return o.type === "senzu" ? "#5fd13a" : "#ffd21f";
}

function offerIcon(o: Offer) {
  if (o.type === "tech") return KIND_ICON[TECHNIQUES[o.id].kind];
  if (o.type === "union") return ICON.union;
  if (o.type === "passive") return ICON.passive;
  if (o.type === "pact") return ICON.pact;
  if (o.type === "item") return ICON.item;
  return o.type === "senzu" ? ICON.senzu : ICON.zeni;
}

const TYPE_LABEL: Record<Offer["type"], string> = { tech: "Technique", passive: "Passive", union: "Union", pact: "Pact", item: "Item", senzu: "Item", zeni: "Item" };

/** Dicas da carta: evolução, união possível e conjunto de passivas. */
function hints(o: Offer, w: World): { icon: string; text: string; strong?: boolean }[] {
  const out: { icon: string; text: string; strong?: boolean }[] = [];
  if (o.type === "tech") {
    const d = TECHNIQUES[o.id];
    if (d.evolvesTo && d.evolvesWith) {
      const has = w.passives.some((p) => p.id === d.evolvesWith);
      out.push({ icon: ICON.evolve, text: `Evolves with ${PASSIVES[d.evolvesWith].name}${has ? " ✓" : ""}`, strong: has });
    }
    const u = UNIONS.find((x) => x.union!.includes(o.id as never) && w.techs.some((t) => x.union!.includes(t.id as never) && t.id !== o.id));
    if (u) out.push({ icon: ICON.union, text: `Union at LV ${UNION_LEVEL}: ${u.name}` });
  } else if (o.type === "passive") {
    const t = w.techs.find((s) => TECHNIQUES[s.id].evolvesWith === o.id);
    if (t) out.push({ icon: ICON.evolve, text: `Evolves ${TECHNIQUES[t.id].name}`, strong: true });
    for (const set of SETS) {
      if (!set.parts.includes(o.id)) continue;
      const have = set.parts.filter((id) => id === o.id || w.passives.some((p) => p.id === id)).length;
      if (have > 1 || o.level === 1) out.push({ icon: ICON.set, text: `${set.name} ${have}/${set.parts.length}${have === set.parts.length ? " · COMPLETE!" : ""}`, strong: have === set.parts.length });
    }
  }
  return out;
}

/** Corpo da carta, por tipo. */
function CardBody({ o, w }: { o: Offer; w: World }): ReactNode {
  const color = offerColor(o);
  if (o.type === "tech" || o.type === "passive") {
    const def = o.type === "tech" ? TECHNIQUES[o.id] : PASSIVES[o.id];
    const owned = o.type === "tech" ? w.techs.find((t) => t.id === o.id)?.level ?? 0 : w.passives.find((p) => p.id === o.id)?.level ?? 0;
    const isNew = o.level === 1;
    return (
      <>
        <Pips max={def.max} have={owned} next={o.level} color={color} />
        {o.type === "tech" ? (
          <>
            {!isNew && <span className="ss-card-up">{offerText(o)}</span>}
            <span className="ss-card-desc">{TECHNIQUES[o.id].desc}</span>
          </>
        ) : (
          <span className="ss-card-up">{PASSIVES[o.id].desc}</span>
        )}
      </>
    );
  }
  if (o.type === "union") {
    const d = TECHNIQUES[o.id];
    const [a, b] = d.union!;
    return (
      <>
        <span className="ss-recipe">
          <span style={{ color: TECHNIQUES[a].color }}>{TECHNIQUES[a].name}</span> + <span style={{ color: TECHNIQUES[b].color }}>{TECHNIQUES[b].name}</span>
        </span>
        <span className="ss-card-desc">{d.desc}</span>
        <span className="ss-card-up">Frees a slot</span>
      </>
    );
  }
  if (o.type === "pact") {
    const p = PACTS[o.id];
    return (
      <>
        <span className="ss-gain">▲ {p.gain}</span>
        <span className="ss-cost">▼ {p.cost}</span>
      </>
    );
  }
  return <span className="ss-card-desc">{offerText(o)}</span>;
}

function badge(o: Offer, w: World) {
  if (o.type === "tech" && o.gold) return { text: "GOLDEN · +2 LV", cls: "gold" };
  if (o.type === "tech" || o.type === "passive") {
    const own = o.type === "tech" ? TECHNIQUES[o.id].owner : PASSIVES[o.id].owner;
    if (own) return { text: `${CHARACTERS[own].name} only`, cls: "own" };
    if (o.level === 1) return { text: "NEW", cls: "new" };
    if (o.type === "tech" && o.level === TECHNIQUES[o.id].max && TECHNIQUES[o.id].evolvesTo) {
      const ready = w.passives.some((p) => p.id === TECHNIQUES[o.id].evolvesWith);
      return { text: ready ? "MAX · CAN EVOLVE" : "MAX", cls: ready ? "evo" : "" };
    }
    if (o.level === (o.type === "tech" ? TECHNIQUES[o.id].max : PASSIVES[o.id].max)) return { text: "MAX", cls: "" };
  }
  return null;
}

const CARD_CLASS: Partial<Record<Offer["type"], string>> = { union: "ss-union", pact: "ss-pact", item: "ss-item" };

/** Sua build atual, em miniatura, para comparar com as cartas. */
function BuildStrip({ w }: { w: World }) {
  return (
    <div className="ss-build">
      {w.techs.map((t) => {
        const d = TECHNIQUES[t.id];
        return (
          <span key={t.id} style={{ borderColor: d.color, color: d.color }} title={d.name}>
            {KIND_ICON[d.kind]} {d.from || d.union ? "★" : t.level}
          </span>
        );
      })}
      <span className="ss-build-sep" />
      {w.passives.map((p) => (
        <span key={p.id} className="round" style={{ borderColor: PASSIVES[p.id].color, color: PASSIVES[p.id].color }} title={PASSIVES[p.id].name}>
          {ICON.passive} {p.level}
        </span>
      ))}
    </div>
  );
}

export function LevelUp({
  w,
  offers,
  pick,
  banishMode,
  toggleBanish,
  lockMode,
  toggleLock,
  reroll,
  skip,
}: {
  w: World;
  offers: Offer[];
  pick: (i: number) => void;
  banishMode: boolean;
  toggleBanish: () => void;
  lockMode: boolean;
  toggleLock: () => void;
  reroll: () => void;
  skip: () => void;
}) {
  const isLocked = (o: Offer) => !!w.locked && w.locked.type === o.type && (w.locked as { id?: string }).id === (o as { id?: string }).id;
  return (
    <div className={`ss-panel ss-levelup ${banishMode ? "ss-banish" : ""} ${lockMode ? "ss-lockmode" : ""}`}>
      <h2 className="ss-title">{banishMode ? "BANISH WHICH CARD?" : lockMode ? "LOCK WHICH CARD?" : "LEVEL UP!"}</h2>
      <p className="ss-sub">{banishMode ? "It won't show up again this run." : lockMode ? "It will come back on your next level-up." : `Level ${w.player.level} · pick one`}</p>
      <div className="ss-cards">
        {offers.map((o, i) => {
          const hs = hints(o, w);
          const color = offerColor(o);
          const bd = badge(o, w);
          const gold = o.type === "tech" && o.gold;
          return (
            <button key={`${i}:${offerName(o)}`} type="button" className={`ss-card ss-card2 ${gold ? "ss-gold" : ""} ${CARD_CLASS[o.type] ?? ""}`} style={{ borderColor: color }} onClick={() => pick(i)} autoFocus={i === 0}>
              <span className="ss-card-type" style={{ background: color }}>
                {TYPE_LABEL[o.type]}
              </span>
              <span className="ss-card-key">{i + 1}</span>
              {isLocked(o) && <span className="ss-card-lock">{ICON.lock}</span>}
              <span className="ss-card-icon" style={{ color, borderColor: color }}>
                {offerIcon(o)}
              </span>
              <b>{offerName(o)}</b>
              {bd && <span className={`ss-badge ${bd.cls}`}>{bd.text}</span>}
              <CardBody o={o} w={w} />
              {hs.length > 0 && (
                <span className="ss-card-hints">
                  {hs.map((h) => (
                    <em key={h.text} className={h.strong ? "strong" : ""}>
                      {h.icon} {h.text}
                    </em>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <BuildStrip w={w} />
      <div className="ss-buttons">
        <button type="button" className="btn98" disabled={w.rerolls <= 0} onClick={reroll}>
          Reroll (R) ×{w.rerolls}
        </button>
        <button type="button" className="btn98" disabled={w.skips <= 0} onClick={skip}>
          Skip (X) ×{w.skips}
        </button>
        <button type="button" className="btn98" disabled={w.banishes <= 0} onClick={toggleBanish}>
          {banishMode ? "Cancel" : "Banish"} (B) ×{w.banishes}
        </button>
        <button type="button" className="btn98" disabled={w.locks <= 0 && !w.locked} onClick={toggleLock}>
          {lockMode ? "Cancel" : "Lock"} (T) ×{w.locks}
        </button>
      </div>
    </div>
  );
}

/* ---------- outras telas da run ---------- */

export function Chest({ w, close }: { w: World; close: () => void }) {
  const c = w.chest;
  if (!c) return null;
  return (
    <div className={`ss-panel ss-chest ${c.evolved ? "ss-chest-evo" : ""}`}>
      <div className="ss-capsule" />
      <h2 className="ss-title">HOI-POI CAPSULE!</h2>
      <ul className="ss-chest-items">
        {c.items.map((it, i) => (
          <li key={i} style={{ animationDelay: `${0.25 + i * 0.35}s` }} className={it.startsWith("EVOLUTION") ? "evo" : ""}>
            {it}
          </li>
        ))}
      </ul>
      <div className="ss-buttons">
        <button type="button" className="btn98" onClick={close} autoFocus>
          Continue (Enter)
        </button>
      </div>
    </div>
  );
}

export function Wish({ w, pick }: { w: World; pick: (i: number) => void }) {
  return (
    <div className="ss-panel ss-wish">
      <div className="ss-shenlong" aria-hidden />
      <h2 className="ss-title">I AM SHENRON</h2>
      <p className="ss-sub">State your wish, and I shall grant it.</p>
      <div className="ss-cards">
        {w.wishOptions.map((id, i) => (
          <button key={id} type="button" className={`ss-card ${WISHES[id].legendary ? "ss-legend" : ""}`} onClick={() => pick(i)} autoFocus={i === 0}>
            <span className="ss-card-key">{i + 1}</span>
            <b>&ldquo;{WISHES[id].quote}&rdquo;</b>
            <span>{WISHES[id].desc}</span>
            {WISHES[id].legendary && <em>Legendary wish</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScrollPick({ w, pick }: { w: World; pick: (i: number) => void }) {
  return (
    <div className="ss-panel ss-scroll">
      <h2 className="ss-title">SECRET SCROLL</h2>
      <p className="ss-sub">A master left you a secret. Pick one; it lasts for the rest of the run.</p>
      <div className="ss-cards">
        {w.scrollOptions.map((id, i) => (
          <button key={id} type="button" className="ss-card ss-card2 ss-scroll-card" style={{ borderColor: SCROLLS[id].color }} onClick={() => pick(i)} autoFocus={i === 0}>
            <span className="ss-card-type" style={{ background: SCROLLS[id].color }}>
              Scroll
            </span>
            <span className="ss-card-key">{i + 1}</span>
            <span className="ss-card-icon" style={{ color: SCROLLS[id].color, borderColor: SCROLLS[id].color }}>
              {ICON.scroll}
            </span>
            <b>{SCROLLS[id].name}</b>
            <span className="ss-card-up">{SCROLLS[id].desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <li className="ss-sec">{title}</li>
      {children}
    </>
  );
}

export function Pause({ w, resume, quit, muted, toggleMute }: { w: World; resume: () => void; quit: () => void; muted: boolean; toggleMute: () => void }) {
  const s = w.stats;
  const pct = (v: number) => `${v >= 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`;
  const sets = SETS.filter((set) => w.setsDone.includes(set.id));
  const stats: [string, string][] = [
    ["HP", `${Math.ceil(w.player.hp)} / ${Math.round(s.maxHp)}`],
    ["Regen", `${s.recovery.toFixed(1)}/s`],
    ["Armor", `${s.armor}`],
    ["Damage", pct(s.might)],
    ["Area", pct(s.area)],
    ["Cooldown", pct(s.cooldown)],
    ["Duration", pct(s.duration)],
    ["Projectiles", `+${s.amount}`],
    ["Pierce", `+${s.pierce}`],
    ["Crit", `${Math.round(s.crit * 100)}% ×${s.critMult.toFixed(2)}`],
    ["Move speed", pct(s.moveSpeed)],
    ["Dodge", `${Math.round(s.dodge * 100)}%`],
    ["Luck", pct(s.luck)],
    ["XP", pct(s.growth)],
    ["Zeni", pct(s.greed)],
    ["Curse", pct(s.curse)],
    ["Dragon Balls", `${w.ballsFound}/7`],
    ["Locks", `${w.locks}`],
  ];
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">PAUSED</h2>
      <div className="ss-pause">
        <ul className="ss-list ss-list-compact ss-build-list">
          <Section title="Techniques">
            {w.techs.map((t) => {
              const d = TECHNIQUES[t.id];
              const evo = d.evolvesTo ? TECHNIQUES[d.evolvesTo] : null;
              const has = d.evolvesWith && w.passives.some((p) => p.id === d.evolvesWith);
              return (
                <li key={t.id}>
                  <b style={{ color: d.color }}>
                    {KIND_ICON[d.kind]} {d.name}
                  </b>
                  <span>{d.from ? "Evolved" : d.union ? "Union" : <Pips max={d.max} have={t.level} color={d.color} />}</span>
                  {evo && (
                    <small className={has ? "ok" : ""}>
                      {ICON.evolve} {evo.name}: LV {d.max} + {PASSIVES[d.evolvesWith!].name} {has ? "✓" : ""}
                    </small>
                  )}
                </li>
              );
            })}
          </Section>
          <Section title="Passives">
            {w.passives.map((p) => (
              <li key={p.id}>
                <b style={{ color: PASSIVES[p.id].color }}>
                  {ICON.passive} {PASSIVES[p.id].name}
                </b>
                <span>
                  <Pips max={PASSIVES[p.id].max} have={p.level} color={PASSIVES[p.id].color} />
                </span>
                <small>{PASSIVES[p.id].desc}</small>
              </li>
            ))}
          </Section>
          {(w.pacts.length > 0 || sets.length > 0 || w.scrolls.length > 0) && (
            <Section title="Modifiers">
              {w.pacts.map((id) => (
                <li key={id}>
                  <b style={{ color: "#ff3a5a" }}>
                    {ICON.pact} {PACTS[id].name}
                  </b>
                  <small>
                    <span className="ss-gain">▲ {PACTS[id].gain}</span> <span className="ss-cost">▼ {PACTS[id].cost}</span>
                  </small>
                </li>
              ))}
              {sets.map((set) => (
                <li key={set.id}>
                  <b style={{ color: set.color }}>
                    {ICON.set} {set.name}
                  </b>
                  <small>{set.desc}</small>
                </li>
              ))}
              {w.scrolls.map((id) => (
                <li key={id}>
                  <b style={{ color: SCROLLS[id].color }}>
                    {ICON.scroll} {SCROLLS[id].name}
                  </b>
                  <small>{SCROLLS[id].desc}</small>
                </li>
              ))}
            </Section>
          )}
        </ul>
        <ul className="ss-statgrid">
          {stats.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="ss-buttons">
        <button type="button" className="btn98" onClick={resume} autoFocus>
          Resume (Esc)
        </button>
        <button type="button" className="btn98" onClick={toggleMute}>
          Sound: {muted ? "off" : "on"} (M)
        </button>
        <button type="button" className="btn98" onClick={quit}>
          Give up
        </button>
      </div>
    </div>
  );
}

export function Over({ w, r, reward, news, again, menu }: { w: World; r: RunSummary; reward: number; news: string[]; again: () => void; menu: () => void }) {
  const total = w.techDamage.reduce((a, b) => a + b, 0) || 1;
  const tiles: [string, string][] = [
    ["Time", fmtTime(r.time)],
    ["Level", `${r.level}`],
    ["Kills", fmt(r.kills)],
    ["Zeni earned", `Ƶ ${fmt(reward)}`],
  ];
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">{r.won ? "SAGA CLEARED!" : "GAME OVER"}</h2>
      <p className="ss-sub">
        {CHARACTERS[r.char].name}
        {r.nightmare ? " · Nightmare" : ""}
      </p>
      <ul className="ss-tiles">
        {tiles.map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </li>
        ))}
      </ul>
      <ul className="ss-list ss-list-compact">
        {w.techs.map((t, i) => (
          <li key={t.id}>
            <b style={{ color: TECHNIQUES[t.id].color }}>
              {KIND_ICON[TECHNIQUES[t.id].kind]} {TECHNIQUES[t.id].name}
            </b>
            <span className="ss-dmgbar">
              <i style={{ width: `${(w.techDamage[i] / total) * 100}%`, background: TECHNIQUES[t.id].color }} />
            </span>
            <small>{fmt(w.techDamage[i])}</small>
          </li>
        ))}
      </ul>
      {news.length > 0 && (
        <ul className="ss-news">
          {news.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="ss-buttons">
        <button type="button" className="btn98" onClick={again} autoFocus>
          Play again (Enter)
        </button>
        <button type="button" className="btn98" onClick={menu}>
          Main menu
        </button>
      </div>
    </div>
  );
}

"use client";
// Telas fora da run: título, seleção de personagem e saga, Korin Tower (loja), conquistas,
// bestiário, enciclopédia e créditos. Textos da interface em inglês.
import { useState } from "react";
import { ACHIEVEMENTS } from "../data/achievements";
import { ITEMS, PACTS, PACT_IDS, SETS } from "../data/cards";
import { CHARACTERS, CHAR_ORDER, type CharId } from "../data/characters";
import { ENEMY_LIST, SAGAS, SAGA_ORDER, type SagaId } from "../data/enemies";
import { PASSIVES } from "../data/passives";
import { SCROLLS, SCROLL_IDS } from "../data/scrolls";
import { SHOP, shopPrice, type ShopId } from "../data/shop";
import { TECHNIQUES, UNIONS } from "../data/techniques";
import type { SaveData } from "../save";
import { SpritePreview } from "./SpritePreview";
import { fmtTime } from "./hud";
import { ICON, KIND_ICON, fmt } from "./icons";

export type MenuScreen = "title" | "chars" | "sagas" | "shop" | "achievements" | "bestiary" | "codex" | "credits";

const Back = ({ back, focus }: { back: () => void; focus?: boolean }) => (
  <button type="button" className="btn98" onClick={back} autoFocus={focus}>
    Back (Esc)
  </button>
);

export function Title({ save, go, onExit, muted, toggleMute }: { save: SaveData | null; go: (s: MenuScreen) => void; onExit: () => void; muted: boolean; toggleMute: () => void }) {
  // o que tem de novo para fazer: treinos que cabem no bolso, conquistas feitas
  const canBuy = save ? SHOP.filter((d) => (save.shop[d.id] ?? 0) < d.max && save.zeni >= shopPrice(d, save.shop[d.id] ?? 0, save.bought)).length : 0;
  const heroes = (save?.chars ?? ["goku"]).slice(0, 3) as CharId[];
  return (
    <div className="ss-panel ss-menu ss-title-screen">
      <div className="ss-heroes" aria-hidden>
        {heroes.map((c, i) => (
          <span key={c} className={i === 1 ? "mid" : ""}>
            <SpritePreview sprite={CHARACTERS[c].sprite} color={CHARACTERS[c].color} size={i === 1 ? 104 : 84} />
          </span>
        ))}
      </div>
      <h2 className="ss-title ss-logo">SAIYAN SURVIVORS</h2>
      <p className="ss-sub">Survive 15 minutes of the horde, then defeat the saga&apos;s boss.</p>
      <button type="button" className="btn98 ss-primary ss-play" onClick={() => go("chars")} autoFocus>
        Play
      </button>
      <div className="ss-menu-grid">
        <button type="button" className="btn98" onClick={() => go("shop")}>
          Korin Tower
          {canBuy > 0 && <span className="ss-dot" title={`${canBuy} upgrades you can afford`}>{canBuy}</span>}
        </button>
        <button type="button" className="btn98" onClick={() => go("codex")}>
          Encyclopedia
        </button>
        <button type="button" className="btn98" onClick={() => go("achievements")}>
          Achievements{save ? <small>{save.achievements.length}/{ACHIEVEMENTS.length}</small> : null}
        </button>
        <button type="button" className="btn98" onClick={() => go("bestiary")}>
          Bestiary
        </button>
      </div>
      <div className="ss-menu-row">
        <button type="button" className="btn98 ss-small" onClick={toggleMute} aria-pressed={!muted}>
          {muted ? "🔇" : "🔊"} Sound (M)
        </button>
        <button type="button" className="btn98 ss-small" onClick={() => go("credits")}>
          Credits
        </button>
        <button type="button" className="btn98 ss-small" onClick={onExit}>
          Quit
        </button>
      </div>
      {save && (
        <ul className="ss-tiles ss-tiles-sm">
          <li>
            <span>Zeni</span>
            <b>Ƶ {fmt(save.zeni)}</b>
          </li>
          {save.runs > 0 && (
            <>
              <li>
                <span>Best time</span>
                <b>{fmtTime(save.best.time)}</b>
              </li>
              <li>
                <span>Most kills</span>
                <b>{fmt(save.best.kills)}</b>
              </li>
              <li>
                <span>Best level</span>
                <b>{save.best.level}</b>
              </li>
            </>
          )}
        </ul>
      )}
      <ul className="ss-keys ss-keys-inline">
        <li>
          <kbd>WASD</kbd>
          <kbd>↑↓←→</kbd> move
        </li>
        <li>
          <kbd>Space</kbd> transform
        </li>
        <li>
          <kbd>1</kbd>–<kbd>4</kbd> pick card
        </li>
        <li>
          <kbd>R</kbd> reroll <kbd>X</kbd> skip <kbd>B</kbd> banish <kbd>T</kbd> lock
        </li>
        <li>
          <kbd>Esc</kbd> pause
        </li>
      </ul>
    </div>
  );
}

export function CharSelect({ save, pick, back }: { save: SaveData; pick: (c: CharId) => void; back: () => void }) {
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">CHOOSE YOUR FIGHTER</h2>
      <div className="ss-grid">
        {CHAR_ORDER.map((id, i) => {
          const c = CHARACTERS[id];
          const open = save.chars.includes(id);
          const secret = !open && (id === "hercule" || id === "vegetto");
          const start = TECHNIQUES[c.start];
          return (
            <button key={id} type="button" className="ss-card ss-char-card" disabled={!open} onClick={() => pick(id)} autoFocus={i === 0}>
              <SpritePreview sprite={c.sprite} color={c.color} size={88} dim={!open} />
              <b>{open ? c.name : secret ? "???" : c.name}</b>
              {open ? (
                <>
                  <small style={{ color: start.color }}>
                    {KIND_ICON[start.kind]} {start.name}
                  </small>
                  <span>{c.passive}</span>
                  <span className="ss-forms">{c.forms.map((f) => f.name).join(" → ")}</span>
                </>
              ) : (
                <span>🔒 {secret ? "Secret character" : c.unlock}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="ss-buttons">
        <Back back={back} />
      </div>
    </div>
  );
}

export function SagaSelect({ save, char, pick, back }: { save: SaveData; char: CharId; pick: (s: SagaId, nightmare: boolean) => void; back: () => void }) {
  const [nightmare, setNightmare] = useState(false);
  const anyWin = SAGA_ORDER.some((g) => (save.wins[g]?.length ?? 0) > 0);
  return (
    <div className={`ss-panel ss-wide ${nightmare ? "ss-nightmare" : ""}`}>
      <h2 className="ss-title">{nightmare ? "NIGHTMARE MODE" : "CHOOSE A SAGA"}</h2>
      <p className="ss-sub">
        Playing as {CHARACTERS[char].name}
        {nightmare && " · enemies are 50% tougher, faster and more numerous · double Zeni"}
      </p>
      <div className="ss-grid ss-grid-4">
        {SAGA_ORDER.map((id, i) => {
          const s = SAGAS[id];
          const open = save.sagas.includes(id) && (!nightmare || (save.wins[id]?.length ?? 0) > 0);
          const rec = save.records[`${id}:${char}`];
          const stars = SAGA_ORDER.indexOf(id) + 1;
          return (
            <button key={id} type="button" className="ss-card ss-saga-card" disabled={!open} onClick={() => pick(id, nightmare)} autoFocus={i === 0} style={open ? { backgroundImage: `linear-gradient(#0008, #000c), url(${s.background})` } : undefined}>
              <b>
                {s.name}
                {save.nightmareWins?.includes(id) ? " ☠" : ""}
              </b>
              <small>{s.place}</small>
              <span className="ss-stars" title="Difficulty">
                {"★".repeat(stars)}
                {"☆".repeat(4 - stars)}
              </span>
              {open ? (
                <span>
                  Boss: {ENEMY_LIST.find((e) => e.id === s.boss)!.name}
                  <br />
                  {rec ? `${rec.won ? "✔ Cleared" : `Best ${fmtTime(rec.time)}`} · ${fmt(rec.kills)} kills` : "Not played yet"}
                </span>
              ) : (
                <span>🔒 {nightmare ? "Clear this saga first" : s.unlock}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="ss-buttons">
        {anyWin && (
          <button type="button" className="btn98" onClick={() => setNightmare((n) => !n)}>
            Nightmare: {nightmare ? "on" : "off"}
          </button>
        )}
        <Back back={back} />
      </div>
    </div>
  );
}

export function Shop({ save, buy, refund, back }: { save: SaveData; buy: (id: ShopId) => void; refund: () => void; back: () => void }) {
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">KORIN TOWER</h2>
      <p className="ss-sub">
        <b className="ss-zeni">Ƶ {fmt(save.zeni)}</b> · upgrades apply to every run · each purchase makes the next one pricier
      </p>
      <div className="ss-grid ss-grid-shop">
        {SHOP.map((d, i) => {
          const lv = save.shop[d.id] ?? 0;
          const done = lv >= d.max;
          const price = shopPrice(d, lv, save.bought);
          return (
            <button key={d.id} type="button" className={`ss-card ss-shop-card ${done ? "ss-done" : save.zeni >= price ? "ss-afford" : "ss-cant"}`} disabled={done || save.zeni < price} onClick={() => buy(d.id)} autoFocus={i === 0}>
              <b>{d.name}</b>
              <span>{d.desc}</span>
              <span className="ss-pips">
                {Array.from({ length: d.max }, (_, k) => (
                  <i key={k} className={k < lv ? "on" : ""} />
                ))}
              </span>
              <small>{done ? "✓ MAXED" : `Ƶ ${fmt(price)}`}</small>
              {!done && save.zeni < price && <em className="ss-need">need Ƶ {fmt(price - save.zeni)} more</em>}
            </button>
          );
        })}
      </div>
      <div className="ss-buttons">
        <Back back={back} />
        <button type="button" className="btn98" onClick={refund} disabled={!save.spent}>
          Refund all (Ƶ {fmt(save.spent)})
        </button>
      </div>
    </div>
  );
}

export function Achievements({ save, back }: { save: SaveData; back: () => void }) {
  const done = save.achievements.length;
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">ACHIEVEMENTS</h2>
      <div className="ss-progress">
        <i style={{ width: `${(done / ACHIEVEMENTS.length) * 100}%` }} />
        <span>
          {done} / {ACHIEVEMENTS.length}
        </span>
      </div>
      <ul className="ss-list">
        {ACHIEVEMENTS.map((a) => {
          const ok = save.achievements.includes(a.id);
          return (
            <li key={a.id} className={ok ? "ok" : ""}>
              <b>
                {ok ? "★" : "☆"} {a.name}
              </b>
              <span>{a.desc}</span>
              <small>{a.zeni ? `+Ƶ ${fmt(a.zeni)}` : ""}</small>
            </li>
          );
        })}
      </ul>
      <div className="ss-buttons">
        <Back back={back} focus />
      </div>
    </div>
  );
}

const TIER_NAME: Record<string, string> = { boss: "Boss", elite: "Elite", brute: "Brute", grunt: "Grunt" };
const BEHAVIOR_NAME: Record<string, string> = { ranged: "Shooter", exploder: "Kamikaze", charger: "Charger", flee: "Thief" };

export function Bestiary({ save, back }: { save: SaveData; back: () => void }) {
  const list = ENEMY_LIST.filter((e) => e.tier !== "crate");
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">BESTIARY</h2>
      <p className="ss-sub">
        {list.filter((e) => save.bestiary[e.id]).length} of {list.length} defeated · {fmt(save.totalKills)} kills in total
      </p>
      <div className="ss-grid ss-grid-beasts">
        {list.map((e) => {
          const n = save.bestiary[e.id] ?? 0;
          return (
            <div key={e.id} className="ss-card ss-beast">
              <SpritePreview sprite={e.sprite ?? e.id} color={e.color} size={64} anim="move" dim={!n} />
              <b>{n ? e.name : "???"}</b>
              <small>
                {TIER_NAME[e.tier]}
                {e.behavior ? ` · ${BEHAVIOR_NAME[e.behavior]}` : ""}
              </small>
              {n > 0 && <small>{fmt(n)} defeated</small>}
            </div>
          );
        })}
      </div>
      <div className="ss-buttons">
        <Back back={back} focus />
      </div>
    </div>
  );
}

export function Credits({ back }: { back: () => void }) {
  return (
    <div className="ss-panel ss-wide ss-credits">
      <h2 className="ss-title">CREDITS</h2>
      <p>
        A non-profit fan-made easter egg. Dragon Ball belongs to Akira Toriyama, Bird Studio/Shueisha and Toei Animation. Sprites and sounds come from games by Bandai, TOSE, Banpresto, Webfoot and
        Dimps.
      </p>
      <p>
        Sprites ripped by the <b>Sprite Database</b> community (spritedatabase.net):
      </p>
      <ul className="ss-list ss-list-compact">
        <li>
          <b>DBZ Hyper Dimension (SNES)</b> Kenman865, Kramlack, Konpaku, Nemu
        </li>
        <li>
          <b>DBZ Super Butouden 1 &amp; 2 (SNES)</b> G.o.D.
        </li>
        <li>
          <b>DBZ: The Legacy of Goku I &amp; II (GBA)</b> Lloyd_irving_1, Zidane_Blake, catumechupac
        </li>
        <li>
          <b>DBZ: Buu&apos;s Fury (GBA)</b> Kramlack, Bonzai, Grim, FullPower, Nemu, SpriteChampion2K5, Zidane_Blake
        </li>
        <li>
          <b>Dragon Ball Advanced Adventure (GBA)</b> Bonzai, Grim
        </li>
        <li>
          <b>DBZ 2 Super Battle (Arcade)</b> sounds and music
        </li>
      </ul>
      <p>Backgrounds: the same DBZ scenery used on the Tower floors. Genre inspired by Vampire Survivors (poncle).</p>
      <div className="ss-buttons">
        <Back back={back} focus />
      </div>
    </div>
  );
}

type CodexTab = "techniques" | "passives" | "cards" | "scrolls";

/** Encyclopedia: técnicas com receita de evolução, uniões, passivas, conjuntos, pactos, itens e pergaminhos. */
/** O que cai no chão e o que acontece no mapa (Enciclopédia). */
const DROPS: [string, string, string][] = [
  ["Senzu Bean", "#5fd13a", "Heals 30% HP. Rare from enemies, common in crates."],
  ["Roast Meat", "#ff9a5a", "Heals 12% HP (more with Saiyan Appetite and Chi-Chi's Cooking). Brutes drop it often."],
  ["Kaioken Orb (!)", "#ff3b3b", "+40% damage and +15% move speed for 10s."],
  ["Ki Shield Orb (◇)", "#7ae8ff", "+1 Ki Shield charge: blocks a whole hit."],
  ["Spirit Bomb Orb (✺)", "#9ad8ff", "Hits every enemy on screen."],
  ["Zeni / Zeni Bag", "#ffd21f", "Zeni to spend at Korin Tower. Bags come from elites, crates and thieves."],
  ["Scouter (S) / Solar Flare (☀) / Ki (K)", "#5aff5a", "Pulls every orb / blinds enemies for 5s / fills half the ki meter."],
  ["Capsule Corp Crate", "#c89a5a", "Breaks into a random drop."],
  ["Fuel Tank", "#d83a2a", "Shoot it: explodes and blasts the horde around it (and other tanks). Don't stand next to it."],
  ["Thief Bot", "#ffd21f", "Runs away with Zeni at 2:30, 6:30, 10:30 and 13:30. It only sprints when you get close. Catch it within 30s for a Capsule and a Zeni bag."],
];

export function Codex({ save, back }: { save: SaveData; back: () => void }) {
  const [tab, setTab] = useState<CodexTab>("techniques");
  const all = Object.values(TECHNIQUES);
  const bases = all.filter((d) => !d.from && !d.union);
  const evoCount = all.filter((d) => d.from).length;
  const found = save.evolved.filter((id) => TECHNIQUES[id as keyof typeof TECHNIQUES]?.from).length;
  const tabs: [CodexTab, string][] = [
    ["techniques", "Techniques"],
    ["passives", "Passives & Sets"],
    ["cards", "Unions, Pacts & Items"],
    ["scrolls", "Secret Scrolls"],
  ];
  return (
    <div className="ss-panel ss-wide">
      <h2 className="ss-title">ENCYCLOPEDIA</h2>
      <div className="ss-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`btn98 ${tab === id ? "on" : ""}`} onClick={() => setTab(id)} autoFocus={id === "techniques"}>
            {label}
          </button>
        ))}
      </div>
      {tab === "techniques" && (
        <>
          <p className="ss-sub">
            Evolutions found: {found}/{evoCount} · max a technique, own its passive, then open a Capsule
          </p>
          <ul className="ss-list ss-codex">
            {bases.map((d) => {
              const evo = d.evolvesTo ? TECHNIQUES[d.evolvesTo] : null;
              const known = evo && save.evolved.includes(evo.id);
              return (
                <li key={d.id}>
                  <b style={{ color: d.color }}>
                    {KIND_ICON[d.kind]} {d.name}
                  </b>
                  <span>
                    {d.desc}
                    {d.owner && <em> ({CHARACTERS[d.owner].name} only)</em>}
                  </span>
                  {evo && (
                    <small>
                      {ICON.evolve} + <b style={{ color: PASSIVES[d.evolvesWith!].color }}>{PASSIVES[d.evolvesWith!].name}</b> →{" "}
                      {known ? (
                        <b style={{ color: evo.color }}>
                          {evo.name}: {evo.desc}
                        </b>
                      ) : (
                        "???"
                      )}
                    </small>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {tab === "passives" && (
        <>
          <ul className="ss-list ss-codex">
            {Object.values(PASSIVES).map((p) => (
              <li key={p.id}>
                <b style={{ color: p.color }}>
                  {ICON.passive} {p.name}
                </b>
                <span>
                  {p.desc} per level
                  {p.owner && <em> ({CHARACTERS[p.owner].name} only)</em>}
                </span>
                <small>max level {p.max}</small>
              </li>
            ))}
          </ul>
          <h3 className="ss-h3">Sets: own every passive in a set for a bonus</h3>
          <ul className="ss-list ss-codex">
            {SETS.map((set) => (
              <li key={set.id}>
                <b style={{ color: set.color }}>
                  {ICON.set} {set.name}
                </b>
                <span>{set.desc}</span>
                <small>{set.parts.map((id) => PASSIVES[id].name).join(" + ")}</small>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === "cards" && (
        <>
          <h3 className="ss-h3">Unions: both techniques at LV 5 fuse into one and free a slot</h3>
          <ul className="ss-list ss-codex">
            {UNIONS.map((d) => {
              const known = save.evolved.includes(d.id);
              return (
                <li key={d.id}>
                  <b style={{ color: d.color }}>
                    {ICON.union} {known ? d.name : "???"}
                  </b>
                  <span>{known ? d.desc : ""}</span>
                  <small>
                    {TECHNIQUES[d.union![0]].name} + {TECHNIQUES[d.union![1]].name}
                  </small>
                </li>
              );
            })}
          </ul>
          <h3 className="ss-h3">Pacts: from level 8, up to 3 per run</h3>
          <ul className="ss-list ss-codex">
            {PACT_IDS.map((id) => (
              <li key={id}>
                <b style={{ color: "#ff3a5a" }}>
                  {ICON.pact} {PACTS[id].name}
                </b>
                <span className="ss-gain">▲ {PACTS[id].gain}</span>
                <small className="ss-cost">▼ {PACTS[id].cost}</small>
              </li>
            ))}
          </ul>
          <h3 className="ss-h3">Items: used the moment you pick them</h3>
          <ul className="ss-list ss-codex">
            {Object.values(ITEMS).map((it) => (
              <li key={it.name}>
                <b style={{ color: it.color }}>
                  {ICON.item} {it.name}
                </b>
                <span>{it.desc}</span>
              </li>
            ))}
          </ul>
          <h3 className="ss-h3">Drops and map events</h3>
          <ul className="ss-list ss-codex">
            {DROPS.map(([name, color, desc]) => (
              <li key={name}>
                <b style={{ color }}>{name}</b>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === "scrolls" && (
        <>
          <p className="ss-sub">Offered at 4:00 and 9:00. Pick one of three; it lasts for the rest of the run.</p>
          <ul className="ss-list ss-codex">
            {SCROLL_IDS.map((id) => (
              <li key={id}>
                <b style={{ color: SCROLLS[id].color }}>
                  {ICON.scroll} {SCROLLS[id].name}
                </b>
                <span>{SCROLLS[id].desc}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="ss-buttons">
        <Back back={back} />
      </div>
    </div>
  );
}

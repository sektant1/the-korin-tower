"use client";
// A Torre no navegador: o manifesto vem do layout (servidor); o progresso, da conta ou do
// localStorage. Tudo que mostra andar, tranca, "próximo" ou esferas passa por aqui, para
// a regra ser uma só (src/lib/tower.ts).
import Link from "next/link";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  FLOORS,
  FLOOR_NAMES,
  NEED_PER_FLOOR,
  floorScene,
  currentFloor,
  floorOf,
  floors,
  isOpen,
  lockInfo,
  nextStep,
  solvedCount,
  tracksDone,
  type NextStep,
  type TowerData,
} from "@/lib/tower";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { useAccount, useProgressMap } from "./Account";
import { Gif } from "./Gif";
import { GIFS } from "@/lib/gifs";
import { Difficulty, arcade } from "./Retro";

const Ctx = createContext<TowerData>({ challenges: [], tracks: [], daily: null });

export function TowerProvider({ data, children }: { data: TowerData; children: ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useTower() {
  const data = useContext(Ctx);
  const progress = useProgressMap();
  return useMemo(() => {
    const fs = floors(data, progress);
    return {
      data,
      progress,
      floors: fs,
      current: currentFloor(data, progress),
      solved: solvedCount(data, progress),
      balls: tracksDone(data, progress),
      isOpen: (slug: string) => isOpen(data, progress, slug),
      lock: (slug: string) => lockInfo(data, progress, slug),
      next: (opts?: { trackId?: string | null; after?: string }) => nextStep(data, progress, opts),
      find: (slug: string) => data.challenges.find((c) => c.slug === slug) ?? null,
    };
  }, [data, progress]);
}

const useHydrated = () => useSyncExternalStore(
  () => () => {},
  () => true,
  () => false,
);

/**
 * Dá para confiar no progresso? Logado, o servidor já tem tudo. Convidado, o progresso
 * mora no localStorage e só existe depois de hidratar; até lá tratamos como "sem progresso",
 * que é o certo para quem está chegando agora.
 */
function useReady() {
  const account = useAccount();
  const hydrated = useHydrated();
  return account !== null || hydrated;
}

const href = (slug: string, trackId?: string | null) => `/desafio/${slug}${trackId ? `?trilha=${trackId}` : ""}`;

/* ---------- sidebar ---------- */

export function FloorNav() {
  const t = useTower();
  return (
    <ol className="floor-nav">
      {[...t.floors].reverse().map((f) => (
        <li key={f.n} className={f.open ? "open" : "locked"} aria-current={f.n === t.current ? "true" : undefined}>
          <Link href={`/desafios#andar-${f.n}`}>
            <span className="floor-nav-n">{f.n}</span>
            <span className="floor-nav-name">{FLOOR_NAMES[f.n]}</span>
            <span className="floor-nav-count">{f.total === 0 ? "em obras" : f.open ? `${f.solved}/${f.scored}` : "trancado"}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Caixa do jogador: andar atual, pontos, progresso no andar e esferas. */
export function TowerPlayer() {
  const t = useTower();
  const account = useAccount();
  const here = t.floors[t.current - 1];
  const pct = here.scored ? Math.round((here.solved / here.scored) * 100) : 0;
  const score = account ? account.points : t.solved * 100;
  return (
    <div className="player-one">
      <div className="p1-floor">
        <span>ANDAR</span>
        <b>{t.current}</b>
      </div>
      <div className="power-level">
        <span>NIVEL DE PODER</span> <b>{score}</b>
      </div>
      {score > 8000 && <div className="over-8000">É MAIS DE 8000!</div>}
      <div className="xp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso no andar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="p1-foot">
        {here.solved}/{here.scored} neste andar
      </div>
      <DragonBalls />
    </div>
  );
}

/** Esferas do Dragão: uma por detonado zerado. */
export function DragonBalls() {
  const t = useTower();
  const total = Math.max(1, t.data.tracks.length);
  const found = Math.min(total, t.balls);
  return (
    <div className="dragon-balls">
      <div className="balls" role="img" aria-label={`${found} de ${total} esferas`}>
        {Array.from({ length: total }, (_, i) => (
          <Gif key={i} gif={GIFS.sphere} height={22} className={i < found ? "ball on" : "ball"} />
        ))}
      </div>
      {found < total ? (
        <p className="balls-text">
          {found}/{total} esferas · <Link href="/trilhas">detonados</Link>
        </p>
      ) : (
        <p className="balls-text wish">
          Shenlong apareceu! Faça seu pedido no <Link href="/guestbook">guestbook</Link>.
        </p>
      )}
    </div>
  );
}

/* ---------- home ---------- */

/** Cenário do andar atual atrás do herói da home. */
export function FloorBackdrop() {
  const t = useTower();
  return <div className="floor-backdrop" style={floorScene(t.current)} aria-hidden="true" />;
}

/** Faixa com o cenário de um andar (cabeçalho de seção, topo do enunciado). */
export function FloorStrip({ n, children, className }: { n: number; children?: ReactNode; className?: string }) {
  return (
    <div className={`floor-strip ${className ?? ""}`} style={floorScene(n)}>
      <span className="floor-strip-n">ANDAR {n}</span>
      <span className="floor-strip-name">{FLOOR_NAMES[n]}</span>
      {children}
    </div>
  );
}

/** Cartão "continuar": o que fazer agora, com um botão só. */
export function ContinueCard() {
  const t = useTower();
  const next = t.next();
  const c = next ? t.find(next.slug) : null;
  const track = next?.trackId ? t.data.tracks.find((x) => x.id === next.trackId) : null;
  const fresh = t.solved === 0;
  if (!c) {
    return (
      <div className="continue">
        <p className="continue-kicker">A TORRE</p>
        <p className="continue-title">Você fez tudo que está aberto.</p>
        <p className="dim">Novos desafios entram de tempos em tempos. Até lá, o compilador e o guestbook ficam abertos.</p>
      </div>
    );
  }
  return (
    <div className="continue">
      <p className="continue-kicker">
        {arcade(fresh ? "COMECE AQUI" : track ? `CONTINUAR · ${track.title}` : `ANDAR ${t.current} · PROXIMO`)}
      </p>
      <p className="continue-title">
        <Link href={href(c.slug, next!.trackId)}>{c.title}</Link>
      </p>
      <p className="continue-meta">
        <Difficulty level={c.difficulty} /> · {c.categoryName} · Andar {floorOf(c)}
      </p>
      <p>
        <Link href={href(c.slug, next!.trackId)} className="btn-start">
          {fresh ? "COMEÇAR" : "CONTINUAR"} <span className="arrow" aria-hidden="true">►</span>
        </Link>
      </p>
      {fresh && (
        <p className="continue-how">
          Leia o enunciado, escreva o código no editor e mande <kbd>:submit</kbd>. Passou nos testes, subiu um degrau. {NEED_PER_FLOOR} desafios por
          andar abrem o andar de cima.
        </p>
      )}
    </div>
  );
}

/** Mapa da torre: do topo à base, com o estado de cada andar. */
export function TowerMap() {
  const t = useTower();
  return (
    <div className="tower">
      {/* eslint-disable-next-line @next/next/no-img-element -- recorte do cenário da Torre de Karin */}
      <img src="/assets/dragon-ball-gifs/korin-tower.png" alt="" className="tower-sky" aria-hidden="true" />
      <div className="tower-roof" aria-hidden="true" />
      <div className="tower-karin">
        <span className="floor-n">KARIN</span> Mestre Karin e a água sagrada
      </div>
      <ol className="tower-floors" reversed>
        {[...t.floors].reverse().map((f) => {
          const pct = f.scored ? Math.round((f.solved / f.scored) * 100) : 0;
          const below = t.floors[f.n - 2];
          const state = f.total === 0 ? "obras" : f.open ? "open" : "locked";
          return (
            <li key={f.n} className={`tfloor ${state} ${f.n === t.current ? "here" : ""}`} style={floorScene(f.n)}>
              <span className="floor-n">
                ANDAR
                <b>{f.n}</b>
              </span>
              <span className="tfloor-main">
                <Link href={`/desafios#andar-${f.n}`} className="tfloor-name">
                  {FLOOR_NAMES[f.n]}
                </Link>
                {state === "open" && (
                  <span className="xp-bar tfloor-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
              <span className="tfloor-status">
                {state === "obras" && "em obras"}
                {state === "open" && `${f.solved}/${f.scored}`}
                {state === "locked" && (
                  <>
                    <span className="tfloor-lock" aria-hidden="true">
                      ▬
                    </span>{" "}
                    faltam {below?.missingForNext ?? 0} no andar {f.n - 1}
                  </>
                )}
                {f.n === t.current && <span className="floor-you">você</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="tower-ground">
        <span className="floor-n">TERREO</span> entrada da torre
      </div>
    </div>
  );
}

/* ---------- lista de desafios ---------- */

export function FloorHeading({ n }: { n: number }) {
  const t = useTower();
  const f = t.floors[n - 1];
  const below = t.floors[n - 2];
  return (
    <div className={`floor-head ${f.open ? "open" : "locked"} ${f.total === 0 ? "obras" : ""}`} style={floorScene(n)}>
      <h2 id={`andar-${n}`} className="floor-title">
        <span className="floor-strip-n">ANDAR {n}</span>
        {FLOOR_NAMES[n]}
      </h2>
      <span className="floor-status">
        {f.total === 0
          ? "em obras"
          : f.open
            ? `${f.solved}/${f.scored} resolvidos${f.missingForNext > 0 && n < FLOORS ? ` · mais ${f.missingForNext} para abrir o andar ${n + 1}` : ""}`
            : `trancado · resolva mais ${below?.missingForNext ?? 0} no andar ${n - 1}`}
      </span>
    </div>
  );
}

export interface CardProps {
  slug: string;
  title: string;
  difficulty: number;
  categoryName: string;
  kind: "stdio" | "shader" | "canvas";
  languages: LanguageId[];
  tags: string[];
}

export function ChallengeCard(c: CardProps) {
  const t = useTower();
  const ready = useReady();
  const state = t.progress[c.slug];
  const open = t.isOpen(c.slug);
  const next = ready && t.next()?.slug === c.slug;
  return (
    <li className={`cartridge ${open ? "" : "locked"} ${next ? "next" : ""}`}>
      <div className="cart-label">
        <span className="cart-stage">Andar {floorOf(c)}</span>
        {state === "solved" ? (
          <span className="badge-clear">CLEAR</span>
        ) : state === "gaveup" ? (
          <span className="badge-gaveup">DESISTIU</span>
        ) : next ? (
          <span className="badge-next">PROXIMO</span>
        ) : !open ? (
          <span className="badge-locked">TRANCADO</span>
        ) : null}
      </div>
      <h3 className="cart-title">
        <Link href={`/desafio/${c.slug}`}>{c.title}</Link>
      </h3>
      <Difficulty level={c.difficulty} />
      <p className="cart-meta">
        {c.categoryName} · {c.languages.map((l) => LANGUAGES[l].label).join(" / ")}
        {c.kind !== "stdio" && " · roda no navegador, não conta andar"}
      </p>
      <p className="tags">
        {c.tags.map((tag) => (
          <span key={tag} className="tag">
            #{tag}
          </span>
        ))}
      </p>
      <Link href={`/desafio/${c.slug}`} className="btn98 play" aria-label={`${open ? "Jogar" : "Ver"} ${c.title}`}>
        {state === "solved" ? "REVER" : open ? "JOGAR" : "VER"} <span className="arrow" aria-hidden="true">►</span>
      </Link>
    </li>
  );
}

/* ---------- página do desafio ---------- */

/** Tranca o editor quando o andar ainda não abriu; o enunciado continua visível. */
export function ChallengeGate({ slug, children }: { slug: string; children: ReactNode }) {
  const t = useTower();
  const ready = useReady();
  const lock = ready ? t.lock(slug) : null;
  if (!lock) return <>{children}</>;
  const from = t.floors[lock.from - 1];
  const suggestions = t.data.challenges.filter((c) => floorOf(c) === lock.from && c.kind === "stdio" && !t.progress[c.slug]).slice(0, 4);
  return (
    <div className="gate window98" id="editor">
      <div className="title-bar">
        <span>andar {lock.floor} trancado</span>
      </div>
      <div className="window-body">
        <FloorStrip n={lock.floor} className="gate-scene">
          <Gif gif={GIFS.piccolo} height={110} className="gate-guard" />
        </FloorStrip>
        <p>
          Este desafio fica no <b>andar {lock.floor}</b>. Para subir até aqui, resolva mais <b>{lock.missing}</b> do andar {lock.from} (
          {from.solved}/{from.scored} feitos).
        </p>
        {suggestions.length > 0 && (
          <ul className="gate-list">
            {suggestions.map((c) => (
              <li key={c.slug}>
                <Link href={`/desafio/${c.slug}`}>{c.title}</Link> <Difficulty level={c.difficulty} />
              </li>
            ))}
          </ul>
        )}
        <p className="dim small">Atalhos: o próximo passo de um detonado e o desafio do dia abrem mesmo com o andar trancado.</p>
      </div>
    </div>
  );
}

/** Barra do detonado no topo da página do desafio. */
export function TrackBar({ trackId, current }: { trackId: string; current: string }) {
  const t = useTower();
  const track = t.data.tracks.find((x) => x.id === trackId);
  if (!track) return null;
  const i = track.steps.indexOf(current);
  if (i < 0) return null;
  const prev = track.steps[i - 1];
  const after = track.steps[i + 1];
  return (
    <nav className="track-bar" aria-label={`Detonado ${track.title}`}>
      <Link href={`/trilhas/${track.id}`} className="track-bar-title">
        {track.title}
      </Link>
      <ol className="track-dots" aria-label={`passo ${i + 1} de ${track.steps.length}`}>
        {track.steps.map((s, k) => {
          const c = t.find(s);
          return (
            <li key={s} className={`${t.progress[s] === "solved" ? "done" : ""} ${k === i ? "here" : ""}`}>
              <Link href={href(s, track.id)} title={c?.title ?? s} aria-current={k === i ? "step" : undefined}>
                {k + 1}
              </Link>
            </li>
          );
        })}
      </ol>
      <span className="track-bar-nav">
        {prev && <Link href={href(prev, track.id)}>◄ anterior</Link>}
        {after && <Link href={href(after, track.id)}>próximo ►</Link>}
      </span>
    </nav>
  );
}

/** Depois de resolver: para onde ir. Fica no alto do painel de saída. */
export function NextStepBar({ slug, trackId }: { slug: string; trackId: string | null }) {
  const t = useTower();
  if (t.progress[slug] !== "solved") return null;
  const next: NextStep | null = t.next({ trackId, after: slug });
  const c = next ? t.find(next.slug) : null;
  const floorNow = t.current;
  return (
    <div className="next-bar">
      <span className="next-bar-state">resolvido</span>
      {c ? (
        <Link href={href(c.slug, next!.trackId)} className="btn98 small">
          próximo: {c.title} <span className="arrow" aria-hidden="true">►</span>
        </Link>
      ) : (
        <span className="dim">nada mais aberto por enquanto · andar {floorNow}</span>
      )}
    </div>
  );
}

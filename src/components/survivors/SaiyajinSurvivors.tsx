"use client";
// Saiyajin Survivors: o easter egg das 7 esferas. A simulação (sim/) roda em passo fixo de 60 Hz;
// o canvas desenha interpolando; o React só cuida de HUD e telas (ui/).
import { useCallback, useEffect, useRef, useState } from "react";
import { drain, setMute, unlockAudio } from "./audio";
import type { RunSummary } from "./data/achievements";
import { ENEMY_LIST, SAGAS, type SagaId } from "./data/enemies";
import type { CharId } from "./data/characters";
import type { ShopId } from "./data/shop";
import { Keyboard, type Action } from "./input";
import { loadBackground, render } from "./render/render";
import { loadSprites } from "./render/sprites";
import { buy, loadSave, recordRun, refund, setMuted, type SaveData } from "./save";
import { banish, lockOffer, choose, chooseScroll, chooseWish, closeChest, createWorld, reroll, skip, step, STEP, type Offer, type World } from "./sim/world";
import * as sim from "./sim/world";
import { readHud, type Hud } from "./ui/hud";
import { Achievements, Bestiary, CharSelect, Codex, Credits, SagaSelect, Shop, Title, type MenuScreen } from "./ui/Menus";
import { Chest, HudView, LevelUp, Over, Pause, ScrollPick, Wish } from "./ui/RunScreens";

const MAX_FRAME = 0.25;

type Screen = MenuScreen | "playing" | "levelup" | "chest" | "wish" | "scroll" | "paused" | "over";
const RUN_SCREENS: Screen[] = ["playing", "levelup", "chest", "wish", "scroll", "paused"];

function summary(w: World): RunSummary {
  const killsBy: Record<string, number> = {};
  w.killsBy.forEach((n, i) => {
    if (n) killsBy[ENEMY_LIST[i].id] = n;
  });
  return {
    saga: w.saga,
    char: w.char,
    won: w.phase === "won",
    time: w.t,
    kills: w.player.kills,
    level: w.player.level,
    zeni: w.player.zeni,
    killsBy,
    evolved: [...w.evolved],
    maxForm: w.maxForm,
    wished: w.wished,
    ballsFound: w.ballsFound,
    revivesUsed: Math.max(0, (w.shop.reviver ?? 0) + (w.wished === "reviver" ? 1 : 0) - w.revives),
    scrolls: [...w.scrolls],
    nightmare: w.nightmare,
    dodges: w.dodges,
    unions: [...w.unions],
    pacts: [...w.pacts],
    sets: [...w.setsDone],
    thieves: w.thievesCaught,
    shieldBlocks: w.shieldBlocks,
    food: w.foodEaten,
    bestChain: w.bestChain,
  };
}

/** Move o foco entre os botões do painel aberto (navegação por teclado nos menus). */
function moveFocus(root: HTMLElement | null, dir: number) {
  if (!root) return;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>(".ss-panel button:not(:disabled)")];
  if (!buttons.length) return;
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = i < 0 ? 0 : (i + dir + buttons.length) % buttons.length;
  buttons[next].focus();
}

export function SaiyajinSurvivors({ onExit }: { onExit: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const screenRef = useRef<Screen>("title");
  const [screen, setScreenState] = useState<Screen>("title");
  const [hud, setHud] = useState<Hud | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [save, setSave] = useState<SaveData | null>(null);
  const [char, setChar] = useState<CharId>("goku");
  const [saga, setSaga] = useState<SagaId>("freeza");
  const [nightmare, setNightmare] = useState(false);
  const [banishMode, setBanishMode] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  const lockRef = useRef(false);
  lockRef.current = lockMode;
  const [result, setResult] = useState<{ r: RunSummary; reward: number; news: string[] } | null>(null);
  const [, force] = useState(0);
  const banishRef = useRef(false);
  banishRef.current = banishMode;

  const setScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreenState(s);
  }, []);

  // em desenvolvimento, o World fica acessível para os testes no navegador (window.__ss)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __ss: worldRef, __ssSim: sim });
  }, []);

  useEffect(() => {
    const s = loadSave();
    setSave(s);
    setMute(s.muted);
    loadSprites();
  }, []);

  const toggleMute = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      const next = setMuted(s, !s.muted);
      setMute(next.muted);
      return next;
    });
  }, []);

  const start = useCallback(
    (c: CharId, g: SagaId, nm: boolean) => {
      unlockAudio();
      const cv = cvRef.current!;
      const zoom = Math.max(1, Math.min(2, window.innerWidth / 1000));
      const s = loadSave();
      worldRef.current = createWorld((Math.random() * 2 ** 32) >>> 0, { char: c, saga: g, shop: s.shop, nightmare: nm, view: { w: cv.width / zoom, h: cv.height / zoom } });
      const ctx = cv.getContext("2d", { alpha: false })!;
      loadBackground(ctx, SAGAS[g].background);
      setChar(c);
      setSaga(g);
      setNightmare(nm);
      setResult(null);
      setOffers([]);
      setBanishMode(false);
      setLockMode(false);
      // Largada (loja): a run pode começar já na tela de nível
      const w0 = worldRef.current;
      if (w0.phase === "levelup") {
        setOffers([...w0.offers]);
        setScreen("levelup");
      } else setScreen("playing");
    },
    [setScreen],
  );

  /** Sincroniza a tela do React com a fase da simulação. */
  const syncPhase = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    if (w.phase === "levelup") {
      setOffers([...w.offers]);
      setScreen("levelup");
    } else if (w.phase === "chest") setScreen("chest");
    else if (w.phase === "wish") setScreen("wish");
    else if (w.phase === "scroll") setScreen("scroll");
    else if (w.phase === "playing") setScreen("playing");
    else if (w.phase === "dead" || w.phase === "won") {
      const r = summary(w);
      const { save: s, reward, news } = recordRun(r);
      setSave(s);
      setResult({ r, reward, news });
      setScreen("over");
    }
  }, [setScreen]);

  const pick = useCallback(
    (i: number) => {
      const w = worldRef.current;
      if (!w) return;
      if (screenRef.current === "levelup") {
        if (i >= w.offers.length) return;
        if (banishRef.current) {
          banish(w, i);
          setBanishMode(false);
          setOffers([...w.offers]);
          return;
        }
        if (lockRef.current) {
          lockOffer(w, i);
          setLockMode(false);
          setOffers([...w.offers]);
          return;
        }
        choose(w, i);
      } else if (screenRef.current === "wish") chooseWish(w, i);
      else if (screenRef.current === "scroll") chooseScroll(w, i);
      else return;
      syncPhase();
    },
    [syncPhase],
  );

  const quit = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    w.phase = "dead";
    syncPhase();
  }, [syncPhase]);

  /* laço principal */
  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d", { alpha: false })!;
    const keys = new Keyboard(window);
    let zoom = 1;
    const resize = () => {
      // densidade 1: é pixel art; o zoom fica no transform
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      zoom = Math.max(1, Math.min(2, window.innerWidth / 1000));
      const w = worldRef.current;
      if (w) w.view = { w: cv.width / zoom, h: cv.height / zoom };
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0,
      acc = 0,
      last = performance.now() / 1000,
      hudAt = 0,
      transformQueued = false;
    const back: Partial<Record<Screen, Screen>> = { chars: "title", sagas: "chars", shop: "title", achievements: "title", bestiary: "title", codex: "title", credits: "title" };
    const onAction = (a: Action) => {
      const s = screenRef.current;
      const w = worldRef.current;
      unlockAudio();
      if (a === "mute") return toggleMute();
      if (s === "playing") {
        if (a === "pause") setScreen("paused");
        else if (a === "transform") transformQueued = true;
        return;
      }
      if (s === "paused" && a === "pause") return setScreen("playing");
      if (s === "levelup" && w) {
        if (a.startsWith("card")) return pick(Number(a.slice(4)) - 1);
        if (a === "reroll" && reroll(w)) return setOffers([...w.offers]);
        if (a === "skip" && skip(w)) return syncPhase();
        if (a === "banish" && w.banishes > 0) {
          setLockMode(false);
          return setBanishMode((b) => !b);
        }
        if (a === "lock" && (w.locks > 0 || w.locked)) {
          setBanishMode(false);
          return setLockMode((b) => !b);
        }
      }
      if ((s === "wish" || s === "scroll") && a.startsWith("card")) return pick(Number(a.slice(4)) - 1);
      if (s === "chest" && w && (a === "confirm" || a === "transform" || a === "pause")) {
        closeChest(w);
        return syncPhase();
      }
      if (a === "pause" && back[s]) return setScreen(back[s]!);
      // menus: setas movem o foco, Enter/Espaço apertam o botão
      if (a === "left" || a === "up") moveFocus(rootRef.current, -1);
      else if (a === "right" || a === "down") moveFocus(rootRef.current, 1);
      else if (a === "confirm" || a === "transform") {
        const el = document.activeElement;
        if (el instanceof HTMLButtonElement && rootRef.current?.contains(el)) el.click();
        else if (s === "over") start(char, saga, nightmare);
      }
    };
    const frame = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(now - last, MAX_FRAME);
      last = now;
      for (const a of keys.consume()) onAction(a);
      const w = worldRef.current;
      if (w && screenRef.current === "playing") {
        acc += dt;
        while (acc >= STEP && w.phase === "playing") {
          const m = keys.move();
          step(w, { mx: m.mx, my: m.my, transform: transformQueued });
          transformQueued = false;
          acc -= STEP;
        }
        if (w.phase !== "playing") {
          acc = 0;
          syncPhase();
        }
      } else acc = 0;
      if (w) {
        drain(w.events);
        render(ctx, w, { zoom, w: cv.width, h: cv.height }, screenRef.current === "playing" ? acc / STEP : 1);
        if (now - hudAt > 0.1) {
          hudAt = now;
          setHud(readHud(w));
        }
      } else {
        ctx.fillStyle = "#05030b";
        ctx.fillRect(0, 0, cv.width, cv.height);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      keys.dispose();
      window.removeEventListener("resize", resize);
    };
  }, [pick, setScreen, start, syncPhase, toggleMute, char, saga, nightmare]);

  // sair da aba pausa o jogo
  useEffect(() => {
    const onHide = () => document.hidden && screenRef.current === "playing" && setScreen("paused");
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [setScreen]);

  const w = worldRef.current;
  const inRun = RUN_SCREENS.includes(screen);
  const menu = () => {
    worldRef.current = null;
    setHud(null);
    setScreen("title");
  };

  return (
    <div className="ss-root" ref={rootRef} onPointerDown={unlockAudio}>
      <canvas ref={cvRef} className="ss-canvas" />
      {hud && inRun && <HudView hud={hud} />}

      {screen === "title" && <Title save={save} go={setScreen} onExit={onExit} muted={!!save?.muted} toggleMute={toggleMute} />}
      {screen === "chars" && save && (
        <CharSelect
          save={save}
          pick={(c) => {
            setChar(c);
            setScreen("sagas");
          }}
          back={() => setScreen("title")}
        />
      )}
      {screen === "sagas" && save && <SagaSelect save={save} char={char} pick={(g, nm) => start(char, g, nm)} back={() => setScreen("chars")} />}
      {screen === "shop" && save && (
        <Shop
          save={save}
          buy={(id: ShopId) => {
            const next = buy(save, id);
            if (next) setSave(next);
          }}
          refund={() => setSave(refund(save))}
          back={() => setScreen("title")}
        />
      )}
      {screen === "achievements" && save && <Achievements save={save} back={() => setScreen("title")} />}
      {screen === "bestiary" && save && <Bestiary save={save} back={() => setScreen("title")} />}
      {screen === "codex" && save && <Codex save={save} back={() => setScreen("title")} />}
      {screen === "credits" && <Credits back={() => setScreen("title")} />}

      {screen === "levelup" && w && (
        <LevelUp
          w={w}
          offers={offers}
          pick={pick}
          banishMode={banishMode}
          toggleBanish={() => {
            setLockMode(false);
            setBanishMode((b) => !b);
          }}
          lockMode={lockMode}
          toggleLock={() => {
            setBanishMode(false);
            setLockMode((b) => !b);
          }}
          reroll={() => {
            if (reroll(w)) setOffers([...w.offers]);
          }}
          skip={() => {
            if (skip(w)) syncPhase();
          }}
        />
      )}
      {screen === "chest" && w && (
        <Chest
          w={w}
          close={() => {
            closeChest(w);
            syncPhase();
          }}
        />
      )}
      {screen === "wish" && w && <Wish w={w} pick={pick} />}
      {screen === "scroll" && w && <ScrollPick w={w} pick={pick} />}
      {screen === "paused" && w && (
        <Pause
          w={w}
          resume={() => setScreen("playing")}
          quit={() => {
            quit();
            force((n) => n + 1);
          }}
          muted={!!save?.muted}
          toggleMute={toggleMute}
        />
      )}
      {screen === "over" && w && result && <Over w={w} r={result.r} reward={result.reward} news={result.news} again={() => start(char, saga, nightmare)} menu={menu} />}
    </div>
  );
}

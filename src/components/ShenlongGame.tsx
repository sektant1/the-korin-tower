"use client";
// Easter egg: junte as 7 Esferas do Dragão (as bolinhas dos divisores) e o Shenlong libera
// "Proteja a Esfera" (sphere-game/): Vegeta defende a Esfera do Dragão por 5 andares com chefes.
import { useEffect, useRef, useState } from "react";
import { SphereDefense } from "./sphere-game/SphereDefense";

const EVENT = "korin:dragonball";

/* ---------- as esferas ---------- */

// Esferas já pegas nesta aba (qualquer divisor conta). Some ao recarregar: o pedido é de uma vez.
const got = new Set<string>();

/** Divisor com 7 esferas. Clicar numa esfera a acende; 7 acesas chamam o Shenlong. */
export function DragonBallDivider() {
  const id = useRef(Math.random().toString(36).slice(2)).current;
  const [, render] = useState(0);
  useEffect(() => {
    const on = () => render((n) => n + 1);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const pick = (i: number) => {
    const key = `${id}:${i}`;
    if (got.has(key) || got.size >= 7) return;
    got.add(key);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: got.size }));
  };
  return (
    <div className="ball-divider" role="separator">
      {Array.from({ length: 7 }, (_, i) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- easter egg de mouse; no teclado há o Konami
        <span key={i} className={`ball-divider-ball ${got.has(`${id}:${i}`) ? "got" : ""}`} onClick={() => pick(i)} />
      ))}
    </div>
  );
}

/* ---------- o pedido ---------- */

export function ShenlongGame() {
  const [stage, setStage] = useState<"off" | "summon" | "game">("off");
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<number>).detail === 7) setStage("summon");
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (stage !== "summon") return;
    const id = setTimeout(() => setStage("game"), 2200);
    return () => clearTimeout(id);
  }, [stage]);
  useEffect(() => {
    if (stage === "off") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const close = () => {
      setStage("off");
      got.clear();
      window.dispatchEvent(new CustomEvent(EVENT, { detail: 0 }));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [stage]);

  if (stage === "off") return null;
  const close = () => {
    setStage("off");
    got.clear();
    window.dispatchEvent(new CustomEvent(EVENT, { detail: 0 }));
  };
  return (
    <div className="shenlong" role="dialog" aria-modal="true" aria-label="Proteja a Esfera">
      {stage === "summon" ? (
        <div className="shenlong-summon">
          <p className="shenlong-wish">AS 7 ESFERAS FORAM REUNIDAS</p>
          <p className="t-sub">Diga o seu desejo...</p>
        </div>
      ) : (
        <>
          <SphereDefense />
          <button type="button" className="btn98 shenlong-close" onClick={close}>
            × Sair (Esc)
          </button>
        </>
      )}
    </div>
  );
}

"use client";
// Widgets de "portal pessoal" dos anos 90, com tempero Dragon Ball.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useProgress } from "@/lib/client/store";
import { KONAMI_LINES } from "@/lib/site-content";
import { GIFS } from "@/lib/gifs";
import { Gif } from "./Gif";

/** As 7 esferas: uma acende para cada desafio resolvido neste navegador. */
export function DragonBalls() {
  const solved = Object.values(useProgress()).filter((v) => v === "solved").length;
  const found = Math.min(7, solved);
  return (
    <div className="dragon-balls">
      <div className="balls" role="img" aria-label={`${found} de 7 esferas encontradas`}>
        {Array.from({ length: 7 }, (_, i) => (
          <Gif key={i} gif={GIFS.sphere} height={22} className={i < found ? "ball on" : "ball"} />
        ))}
      </div>
      {found < 7 ? (
        <p className="balls-text">{found}/7 esferas</p>
      ) : (
        <p className="balls-text wish">
          Shenlong apareceu! Faça seu pedido no <Link href="/guestbook">guestbook</Link>.
        </p>
      )}
    </div>
  );
}

/** Nível de poder do jogador (pontuação) com o clássico da dublagem. */
export function PowerLevel({ score }: { score: number }) {
  return (
    <div className="power-level">
      <span>NÍVEL DE PODER</span> <b>{score}</b>
      {score > 8000 && <div className="over-8000">É MAIS DE 8000!</div>}
    </div>
  );
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Easter egg: ↑↑↓↓←→←→BA dispara um raio de energia pela tela. */
export function KonamiCode() {
  const [line, setLine] = useState(-1);
  useEffect(() => {
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      // Não atrapalha quem está digitando no editor ou em campos.
      const t = e.target;
      if (t instanceof Element && t.closest(".cm-editor, input, textarea, select")) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = key === KONAMI[pos] ? pos + 1 : key === KONAMI[0] ? 1 : 0;
      if (pos === KONAMI.length) {
        pos = 0;
        setLine(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (line < 0) return;
    const id = setTimeout(() => setLine((l) => (l + 1 < KONAMI_LINES.length + 3 ? l + 1 : -1)), 450);
    return () => clearTimeout(id);
  }, [line]);
  if (line < 0) return null;
  const fired = line >= KONAMI_LINES.length - 1;
  return (
    <div className="konami" role="status" onClick={() => setLine(-1)}>
      <p className="konami-text">{KONAMI_LINES.slice(0, line + 1).join(" ")}</p>
      {fired && <div className="beam" aria-hidden="true" />}
      <Gif gif={GIFS.gokuKame} height={150} className="konami-gif" />
    </div>
  );
}

/** Guerreiro voando pelo cabeçalho (decorativo). */
export function FlyingCloud() {
  return (
    <div className="flying-cloud" aria-hidden="true">
      <Gif gif={GIFS.krillinFlight} height={56} />
    </div>
  );
}

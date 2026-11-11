"use client";
// Widgets de "portal pessoal" dos anos 90, com tempero Dragon Ball.
import Link from "next/link";
import { useEffect, useState } from "react";
import { KONAMI_LINES } from "@/lib/site-content";
import { GIFS } from "@/lib/gifs";
import { Gif } from "./Gif";

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

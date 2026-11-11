"use client";
// Duas colunas com um divisor arrastável. A proporção vai numa variável CSS (--split),
// o CSS decide quando as colunas viram linhas (aí o divisor some) e a escolha fica
// no localStorage por chave. Duplo clique volta ao padrão.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  storageKey: string;
  /** largura inicial da coluna da esquerda, em % */
  initial: number;
  min?: number;
  max?: number;
  className?: string;
  id?: string;
  left: ReactNode;
  right: ReactNode;
}

const KEY = (k: string) => `korin:split:${k}`;

export function SplitColumns({ storageKey, initial, min = 20, max = 80, className, id, left, right }: Props) {
  const [pct, setPct] = useState(initial);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY(storageKey)));
      if (saved >= min && saved <= max) setPct(saved);
    } catch {}
  }, [storageKey, min, max]);

  const persist = useCallback(
    (v: number) => {
      try {
        localStorage.setItem(KEY(storageKey), String(Math.round(v)));
      } catch {}
    },
    [storageKey],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = box.current;
    if (!el) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("is-resizing");
    const rect = el.getBoundingClientRect();
    let last = pct;
    const move = (ev: PointerEvent) => {
      const v = ((ev.clientX - rect.left) / rect.width) * 100;
      last = Math.min(max, Math.max(min, v));
      setPct(last);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      document.body.classList.remove("is-resizing");
      persist(last);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const reset = () => {
    setPct(initial);
    persist(initial);
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") setPct((p) => Math.max(min, p - step));
    else if (e.key === "ArrowRight") setPct((p) => Math.min(max, p + step));
    else if (e.key === "Home") reset();
    else return;
    e.preventDefault();
  };

  return (
    <div ref={box} id={id} className={`split ${className ?? ""}`} style={{ "--split": `${pct}%` } as React.CSSProperties}>
      {left}
      <div
        className="split-handle"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        title="Arraste para redimensionar. Duplo clique volta ao padrão."
        onPointerDown={onPointerDown}
        onDoubleClick={reset}
        onKeyDown={onKey}
        onBlur={() => persist(pct)}
      />
      {right}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { updateSettings, useSettings } from "@/lib/client/store";
import { useAccount, useProgressMap } from "./Account";
import { PowerLevel } from "./PortalWidgets";

/** Reflete as preferências em atributos do <html> (o CSS faz o resto). */
export function SettingsApplier() {
  const [s] = useSettings();
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.sanity = s.sanity ? "on" : "off";
  }, [s.sanity]);
  return null;
}

export function SanityToggle() {
  const [s] = useSettings();
  return (
    <label className="check98 sanity-toggle">
      <input type="checkbox" checked={s.sanity} onChange={(e) => updateSettings({ sanity: e.target.checked })} />
      Menos animações
    </label>
  );
}

/** Rastro de estrelinhas atrás do mouse. Desliga com Modo Sanidade, reduced-motion ou toque. */
export function StarTrail() {
  const [s] = useSettings();
  useEffect(() => {
    if (!s.starTrail || s.sanity) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    const glyphs = ["*", "+", "★", "."];
    const colors = ["#ffff00", "#00ffff", "#ff00ff", "#ffffff", "#33ff33"];
    let last = 0;
    let alive = 0;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - last < 35 || alive > 40) return;
      last = now;
      const el = document.createElement("span");
      el.className = "trail-star";
      el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.color = colors[Math.floor(Math.random() * colors.length)];
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      alive++;
      el.addEventListener("animationend", () => {
        el.remove();
        alive--;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.querySelectorAll(".trail-star").forEach((n) => n.remove());
    };
  }, [s.starTrail, s.sanity]);
  return null;
}

/** Contador de visitas estilo odômetro. Conta uma vez por sessão do navegador. */
export function VisitCounter() {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    let counted = false;
    try {
      counted = sessionStorage.getItem("korin:counted") === "1";
      sessionStorage.setItem("korin:counted", "1");
    } catch {
      counted = true; // sem storage: só lê, para não inflar
    }
    fetch("/api/counter", { method: counted ? "GET" : "POST" })
      .then((r) => r.json())
      .then((d) => setValue(d.value))
      .catch(() => setValue(0));
  }, []);
  const digits = (value ?? 0).toString().padStart(7, "0").split("");
  return (
    <div className="counter">
      <span className="counter-label">Você é o visitante nº</span>
      <span className="odometer" aria-label={value === null ? "carregando" : `${value} visitas`}>
        {digits.map((d, i) => (
          <span key={i} className="odo-digit" aria-hidden="true">
            {value === null ? "-" : d}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Placar do "jogador 1": pontos da conta (logado) ou desafios resolvidos neste navegador. */
export function PlayerOne({ total }: { total: number }) {
  const account = useAccount();
  const progress = useProgressMap();
  const solved = Object.values(progress).filter((v) => v === "solved").length;
  const score = account ? account.points : solved * 100;
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="player-one">
      <PowerLevel score={score} />
      <div className="xp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Desafios resolvidos">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="p1-foot">
        {solved}/{total} desafios
      </div>
    </div>
  );
}

/** Marca CLEAR! / desistiu nos cards de desafio já feitos (conta ou navegador). */
export function ProgressBadge({ slug }: { slug: string }) {
  const p = useProgressMap()[slug];
  if (!p) return null;
  return p === "solved" ? (
    <span className="badge-clear" title="Resolvido">CLEAR</span>
  ) : (
    <span className="badge-gaveup" title="Desistiu">DESISTIU</span>
  );
}

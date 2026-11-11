"use client";
import Link from "next/link";
import { useProgressMap } from "./Account";

/** Barra "3/5" de uma trilha, com o progresso da conta ou deste navegador. */
export function TrackProgress({ slugs }: { slugs: string[] }) {
  const progress = useProgressMap();
  const done = slugs.filter((s) => progress[s] === "solved").length;
  const pct = slugs.length ? Math.round((done / slugs.length) * 100) : 0;
  return (
    <div className="track-progress">
      <div className="xp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso na trilha">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="track-count">
        {done}/{slugs.length} {done === slugs.length && slugs.length > 0 ? "ZERADO" : "passos"}
      </span>
    </div>
  );
}

/** Primeiro passo ainda não resolvido: é para onde o botão "continuar" leva. */
export function TrackNext({ trackId, steps }: { trackId: string; steps: { slug: string; title: string }[] }) {
  const progress = useProgressMap();
  const next = steps.find((s) => progress[s.slug] !== "solved");
  if (!next) return <p className="pass">Detonado zerado. Uma Esfera do Dragão é sua.</p>;
  return (
    <p>
      <Link href={`/desafio/${next.slug}?trilha=${trackId}`} className="btn98 play">
        {steps[0].slug === next.slug ? "COMEÇAR" : "CONTINUAR"}: {next.title} <span className="arrow" aria-hidden="true">►</span>
      </Link>
    </p>
  );
}

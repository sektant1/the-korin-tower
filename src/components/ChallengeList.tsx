import Link from "next/link";
import type { ChallengeSummary } from "@/lib/challenges";
import { LANGUAGES } from "@/lib/languages";
import { ProgressBadge } from "./ClientEffects";
import { Difficulty } from "./Retro";

const NEW_MS = 14 * 24 * 3600 * 1000; // selo NEW! por 14 dias

const langs = (c: ChallengeSummary) => c.languages.map((l) => LANGUAGES[l].label).join(" / ");

export function ChallengeList({ items, categoryNames }: { items: ChallengeSummary[]; categoryNames?: Record<string, string> }) {
  if (!items.length) {
    return <p className="dim">Nenhum desafio aqui ainda. Volte em breve (ou escreva um em /challenges)!</p>;
  }
  return (
    <ul className="cart-grid">
      {items.map((c, i) => (
        <li key={c.slug} className="cartridge">
          <div className="cart-label">
            <span className="cart-stage">STAGE {String(i + 1).padStart(2, "0")}</span>
            {Date.now() - c.createdAt.getTime() < NEW_MS && <span className="new-badge">NEW!</span>}
            <ProgressBadge slug={c.slug} />
          </div>
          <h3 className="cart-title">
            <Link href={`/desafio/${c.slug}`}>{c.title}</Link>
          </h3>
          <Difficulty level={c.difficulty} />
          <p className="cart-meta">
            {categoryNames && categoryNames[c.categoryId] !== langs(c) && <span>{categoryNames[c.categoryId]} · </span>}
            {langs(c)}
            {c.kind !== "stdio" && " · roda no navegador"}
          </p>
          <p className="tags">
            {c.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </p>
          <Link href={`/desafio/${c.slug}`} className="btn98 play" aria-label={`Jogar ${c.title}`}>
            JOGAR <span className="arrow" aria-hidden="true">►</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

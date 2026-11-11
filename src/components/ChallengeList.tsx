import type { ChallengeSummary } from "@/lib/challenges";
import { ChallengeCard } from "./Tower";

/** Grade de cartuchos. O estado (andar, trancado, próximo, CLEAR) é decidido no navegador. */
export function ChallengeList({ items, categoryNames }: { items: ChallengeSummary[]; categoryNames: Record<string, string> }) {
  if (!items.length) return <p className="dim">Nenhum desafio aqui ainda.</p>;
  return (
    <ul className="cart-grid">
      {items.map((c) => (
        <ChallengeCard
          key={c.slug}
          slug={c.slug}
          title={c.title}
          difficulty={c.difficulty}
          categoryName={categoryNames[c.categoryId] ?? c.categoryId}
          kind={c.kind}
          languages={c.languages}
          tags={c.tags}
        />
      ))}
    </ul>
  );
}

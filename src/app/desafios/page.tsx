import type { Metadata } from "next";
import Link from "next/link";
import { ChallengeList } from "@/components/ChallengeList";
import { FlameTitle, UnderConstruction } from "@/components/Retro";
import { FloorHeading } from "@/components/Tower";
import { listCategories, listChallenges } from "@/lib/challenges";
import { FLOORS, floorOf } from "@/lib/tower";

export const metadata: Metadata = { title: "A Torre" };

type Props = { searchParams: Promise<{ sala?: string }> };

// A torre inteira, andar por andar. `?sala=<categoria>` filtra por tema.
export default async function ChallengesPage({ searchParams }: Props) {
  const { sala } = await searchParams;
  const [categories, all] = await Promise.all([listCategories(), listChallenges()]);
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const active = categories.find((c) => c.id === sala) ?? null;
  const challenges = active ? all.filter((c) => c.categoryId === active.id) : all;

  return (
    <>
      <FlameTitle>A TORRE</FlameTitle>
      <p className="center dim">
        {all.length} desafios em {FLOORS} andares. <Link href="/aleatorio">Um aleatório</Link>.
      </p>
      <nav className="chips" aria-label="Filtrar por tema">
        <Link href="/desafios" className={active ? "chip" : "chip on"}>
          todos
        </Link>
        {categories
          .filter((c) => c.count > 0)
          .map((c) => (
            <Link key={c.id} href={`/desafios?sala=${c.id}`} className={active?.id === c.id ? "chip on" : "chip"}>
              {c.name} <span className="count">{c.count}</span>
            </Link>
          ))}
      </nav>
      {active && <p className="center dim small">{active.description}</p>}

      {Array.from({ length: FLOORS }, (_, i) => i + 1).map((n) => {
        const items = challenges.filter((c) => floorOf(c) === n);
        if (active && items.length === 0) return null;
        return (
          <section key={n} className="floor-section" aria-labelledby={`andar-${n}`}>
            <FloorHeading n={n} />
            {items.length > 0 ? <ChallengeList items={items} categoryNames={names} /> : <UnderConstruction />}
          </section>
        );
      })}
    </>
  );
}

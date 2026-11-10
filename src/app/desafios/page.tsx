import type { Metadata } from "next";
import Link from "next/link";
import { ChallengeList } from "@/components/ChallengeList";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { FlameTitle, RainbowHr } from "@/components/Retro";
import { listCategories, listChallenges } from "@/lib/challenges";

export const metadata: Metadata = { title: "Desafios" };

export default async function ChallengesPage() {
  const [categories, challenges] = await Promise.all([listCategories(), listChallenges()]);
  const withItems = categories.filter((c) => c.count > 0);

  return (
    <>
      <FlameTitle>TODOS OS DESAFIOS</FlameTitle>
      <p>
        {challenges.length} desafio(s) em {withItems.length} fase(s).{" "}
        <Link href="/aleatorio">&gt;&gt; Me dá um aleatório! &lt;&lt;</Link>
      </p>
      {withItems.map((cat) => (
        <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
          <RainbowHr />
          <h2 id={`cat-${cat.id}`} className="section-title">
            <Gif gif={GIFS.sphere} height={22} /> <Link href={`/categoria/${cat.id}`}>{cat.name}</Link>
          </h2>
          <ChallengeList items={challenges.filter((c) => c.categoryId === cat.id)} />
        </section>
      ))}
    </>
  );
}

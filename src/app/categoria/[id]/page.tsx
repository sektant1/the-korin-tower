import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeList } from "@/components/ChallengeList";
import { Gif } from "@/components/Gif";
import { GIFS } from "@/lib/gifs";
import { FlameTitle, UnderConstruction } from "@/components/Retro";
import { getCategory, listChallenges } from "@/lib/challenges";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const cat = await getCategory((await params).id);
  return { title: cat?.name ?? "Categoria" };
}

export default async function CategoryPage({ params }: Params) {
  const { id } = await params;
  const cat = await getCategory(id);
  if (!cat) notFound();
  const items = await listChallenges(id);

  return (
    <>
      <FlameTitle>
        <Gif gif={GIFS.sphere} height={30} /> {cat.name}
      </FlameTitle>
      <p className="dim">{cat.description}</p>
      {items.length ? <ChallengeList items={items} /> : <UnderConstruction what="Nenhum desafio nesta fase ainda" />}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocRow, SeriesNext, SeriesProgress } from "@/components/Biblioteca";
import { FlameTitle, Window } from "@/components/Retro";
import { getSeries } from "@/lib/biblioteca";
import { seriesScene } from "@/lib/biblioteca/parse";
import { FLOOR_NAMES, floorScene } from "@/lib/tower";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = await getSeries((await params).id).catch(() => null);
  return { title: s?.title ?? "Série", description: s?.description || undefined };
}

export default async function SeriesPage({ params }: Params) {
  const s = await getSeries((await params).id);
  if (!s) notFound();
  const minutes = s.docs.reduce((n, d) => n + d.readingMin, 0);

  return (
    <>
      <FlameTitle>SÉRIE</FlameTitle>
      <Window title={`vol${String(s.order + 1).padStart(2, "0")}.dir`}>
        <header className="floor-strip doc-scene" style={floorScene(seriesScene(s))}>
          <p className="doc-kicker">
            <span className="doc-part">VOL.{String(s.order + 1).padStart(2, "0")} · SÉRIE</span>
          </p>
          <h2 className="doc-title">{s.title}</h2>
          {s.description && <p className="doc-desc">{s.description}</p>}
          <span className="doc-scene-name" aria-hidden="true">
            {FLOOR_NAMES[seriesScene(s)]}
          </span>
        </header>
        <nav className="crumbs" aria-label="Você está em">
          <Link href="/biblioteca">Biblioteca</Link> » <span aria-current="page">{s.title}</span>
        </nav>
        <p className="dim small">
          {s.docs.length} {s.docs.length === 1 ? "parte" : "partes"} · ~{minutes} min de leitura no total
        </p>
        <SeriesProgress slugs={s.docs.map((d) => d.slug)} />
        <SeriesNext docs={s.docs} />
        <ul className="doc-list">
          {s.docs.map((d, i) => (
            <DocRow key={d.slug} doc={d} partLabel={`PARTE ${String(i + 1).padStart(2, "0")}`} />
          ))}
        </ul>
      </Window>
    </>
  );
}

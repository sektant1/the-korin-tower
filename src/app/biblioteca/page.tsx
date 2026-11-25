import type { Metadata } from "next";
import Link from "next/link";
import { LibraryBrowser, SeriesNext, SeriesProgress, type BrowserDoc } from "@/components/Biblioteca";
import { FlameTitle, PageBanner, UnderConstruction, Window } from "@/components/Retro";
import { listDocs, listSeries } from "@/lib/biblioteca";
import { isDocKind } from "@/lib/biblioteca/kinds";
import { DocError, seriesScene } from "@/lib/biblioteca/parse";
import { PAGE_SCENES } from "@/lib/scenes";
import { FLOOR_IMAGES } from "@/lib/tower";

export const metadata: Metadata = {
  title: "Biblioteca",
  description: "Tutoriais, guias e referências de programação de baixo nível: C, C++, Rust, assembly e shaders.",
};

type Props = { searchParams: Promise<{ q?: string; tipo?: string; tag?: string }> };

export default async function LibraryPage({ searchParams }: Props) {
  const sp = await searchParams;
  let docs: Awaited<ReturnType<typeof listDocs>>;
  let series: Awaited<ReturnType<typeof listSeries>>;
  try {
    [docs, series] = await Promise.all([listDocs(), listSeries()]);
  } catch (e) {
    if (!(e instanceof DocError)) throw e;
    // Erro de quem escreve (frontmatter, série inexistente...): mostra onde, em vez de um 500 mudo.
    return (
      <>
        <FlameTitle>BIBLIOTECA</FlameTitle>
        <Window title="erro.txt">
          <p className="fail">Erro ao carregar a biblioteca:</p>
          <pre className="code-block">{e.message}</pre>
        </Window>
      </>
    );
  }

  const seriesTitle = new Map(series.map((s) => [s.id, s.title]));
  const browserDocs: BrowserDoc[] = docs.map((d) => ({ ...d, seriesTitle: d.series ? (seriesTitle.get(d.series) ?? null) : null }));

  const tagCount = new Map<string, number>();
  for (const d of docs) for (const t of d.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const tags = [...tagCount].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  const kind = isDocKind(sp.tipo) ? sp.tipo : "";
  const latest = docs[0];

  return (
    <>
      <PageBanner
        title="BIBLIOTECA"
        image={PAGE_SCENES.biblioteca}
        lead="Tutoriais, guias e referências de programação de baixo nível."
        stats={[
          { n: docs.length, label: docs.length === 1 ? "post" : "posts" },
          { n: series.length, label: series.length === 1 ? "série" : "séries" },
          { n: tagCount.size, label: tagCount.size === 1 ? "tag" : "tags" },
        ]}
      >
        {latest && (
          <p className="page-banner-extra">
            <span className="doc-part">MAIS NOVO</span> <Link href={`/biblioteca/${latest.slug}`}>{latest.title}</Link>
          </p>
        )}
      </PageBanner>

      {docs.length === 0 && (
        <Window title="vazio.txt">
          <UnderConstruction what="nenhum post publicado ainda" />
        </Window>
      )}

      {series.length > 0 && (
        <Window title="series.dir" className="lib-series-window">
          <ul className="shelf">
            {series.map((s) => {
              const minutes = s.docs.reduce((n, d) => n + d.readingMin, 0);
              return (
                <li key={s.id} className="tome">
                  <div
                    className="tome-body"
                    style={{
                      backgroundImage: `linear-gradient(90deg, #201738 40%, #201738d0), url(${FLOOR_IMAGES[seriesScene(s)]})`,
                    }}
                  >
                    <h3 className="tome-title">
                      <Link href={`/biblioteca/serie/${s.id}`}>{s.title}</Link>
                    </h3>
                    {s.description && <p className="tome-desc">{s.description}</p>}
                    <p className="tome-meta">
                      {s.docs.length} {s.docs.length === 1 ? "parte" : "partes"} · ~{minutes} min
                    </p>
                    <div className="tome-foot">
                      <SeriesProgress slugs={s.docs.map((d) => d.slug)} />
                      <SeriesNext docs={s.docs} compact />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Window>
      )}

      {docs.length > 0 && (
        <Window title="posts.txt">
          <LibraryBrowser docs={browserDocs} tags={tags} initial={{ q: sp.q ?? "", kind, tag: sp.tag ?? "" }} />
        </Window>
      )}
    </>
  );
}

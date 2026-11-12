import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocEnhancer, DocToc, KindBadge, ReadToggle, SeriesParts } from "@/components/Biblioteca";
import { Difficulty, Window } from "@/components/Retro";
import { challengeCards, getDocPage } from "@/lib/biblioteca";
import { formatDay } from "@/lib/biblioteca/kinds";
import { renderDoc } from "@/lib/biblioteca/render";
import { sceneOf } from "@/lib/biblioteca/parse";
import { siteDay } from "@/lib/dates";
import { FLOOR_NAMES, floorScene } from "@/lib/tower";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await getDocPage((await params).slug).catch(() => null);
  if (!page) return { title: "Biblioteca" };
  const { doc } = page;
  return {
    title: doc.title,
    description: doc.description || undefined,
    openGraph: { type: "article", title: doc.title, description: doc.description || undefined, publishedTime: doc.date, modifiedTime: doc.updated ?? undefined, tags: doc.tags },
  };
}

export default async function DocPage({ params }: Params) {
  const page = await getDocPage((await params).slug);
  if (!page) notFound();
  const { doc, series, index, prev, next, related } = page;
  const [{ html, toc }, challenges] = await Promise.all([renderDoc(doc.body), challengeCards(doc.challenges)]);
  const scheduled = !doc.draft && doc.date > siteDay();
  const hasToc = toc.length >= 2;
  const scene = sceneOf(doc, series);

  return (
    <>
      <DocEnhancer slug={doc.slug} bodyId="doc-body" endId="doc-fim" />
      <div className="doc-wrap">
      <div className={`doc-page ${hasToc ? "has-toc" : ""}`}>
        <article className="window98 doc-article" aria-labelledby="doc-title">
          <div className="title-bar">
            <span>{doc.slug}.md</span>
            <span className="title-buttons" aria-hidden="true">
              <span>_</span>
              <span>□</span>
              <span>×</span>
            </span>
          </div>
          <div className="window-body">
            <header className="floor-strip doc-scene" style={floorScene(scene)}>
              <p className="doc-kicker">
                <KindBadge kind={doc.kind} />
                {series && (
                  <span className="doc-part">
                    PARTE {index + 1}/{series.docs.length}
                  </span>
                )}
                {doc.draft && <span className="draft-badge">RASCUNHO</span>}
                {scheduled && <span className="draft-badge">AGENDADO P/ {formatDay(doc.date)}</span>}
              </p>
              <h1 id="doc-title" className="doc-title">
                {doc.title}
              </h1>
              {doc.description && <p className="doc-desc">{doc.description}</p>}
              <span className="doc-scene-name" aria-hidden="true">
                {FLOOR_NAMES[scene]}
              </span>
            </header>
            <nav className="crumbs" aria-label="Você está em">
              <Link href="/biblioteca">Biblioteca</Link> »{" "}
              {series ? (
                <>
                  <Link href={`/biblioteca/serie/${series.id}`}>{series.title}</Link> »{" "}
                </>
              ) : (
                <>
                  <Link href={`/biblioteca?tipo=${doc.kind}`}>
                    <KindBadge kind={doc.kind} />
                  </Link>{" "}
                  »{" "}
                </>
              )}
              <span aria-current="page">{doc.title}</span>
            </nav>

            <div className="doc-head">
              <p className="doc-meta">
                <span>
                  <time dateTime={doc.date}>{formatDay(doc.date)}</time>
                </span>
                {doc.updated && doc.updated !== doc.date && (
                  <span>
                    atualizado em <time dateTime={doc.updated}>{formatDay(doc.updated)}</time>
                  </span>
                )}
                <span title={`${doc.words} palavras`}>{doc.readingMin} min de leitura</span>
                {doc.level && (
                  <span>
                    nível <Difficulty level={doc.level} />
                  </span>
                )}
              </p>
              {doc.tags.length > 0 && (
                <p className="tags">
                  {doc.tags.map((t) => (
                    <Link key={t} href={`/biblioteca?tag=${encodeURIComponent(t)}`} className="tag">
                      #{t}
                    </Link>
                  ))}
                </p>
              )}
            </div>

            {series && (
              <details className="series-box" open={index === 0}>
                <summary>
                  Série <b>{series.title}</b>: parte {index + 1} de {series.docs.length}
                </summary>
                <SeriesParts docs={series.docs} current={doc.slug} />
              </details>
            )}

            {hasToc && (
              <details className="toc-mobile">
                <summary>Sumário ({toc.length})</summary>
                <DocToc toc={toc} />
              </details>
            )}

            <div id="doc-body" className="markdown doc-body" dangerouslySetInnerHTML={{ __html: html }} />
            <div id="doc-fim" aria-hidden="true" />

            {challenges.length > 0 && (
              <section className="practice" aria-labelledby="pratique">
                <h2 id="pratique" className="practice-title">
                  Pratique na torre
                </h2>
                <ul className="practice-list">
                  {challenges.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/desafio/${c.slug}`}>{c.title}</Link> <Difficulty level={c.difficulty} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="doc-actions">
              <ReadToggle slug={doc.slug} />
              <a href="#doc-title" className="small">
                ▲ topo
              </a>
            </div>

            {(prev || next) && (
              <nav className="doc-pager" aria-label="Partes da série">
                {prev ? (
                  <Link href={`/biblioteca/${prev.slug}`} className="pager-card prev">
                    <small>◄ parte {index}</small>
                    <span>{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link href={`/biblioteca/${next.slug}`} className="pager-card next">
                    <small>parte {index + 2} ►</small>
                    <span>{next.title}</span>
                  </Link>
                ) : (
                  <Link href={`/biblioteca/serie/${series!.id}`} className="pager-card next">
                    <small>fim da série ►</small>
                    <span>Voltar para {series!.title}</span>
                  </Link>
                )}
              </nav>
            )}
          </div>
        </article>

        {hasToc && (
          <aside className="doc-aside" aria-label="Sumário">
            <Window title="sumario.txt">
              <DocToc toc={toc} />
            </Window>
          </aside>
        )}
      </div>
      </div>

      {related.length > 0 && (
        <Window title="leia-tambem.txt">
          <ul className="related-list">
            {related.map((d) => (
              <li key={d.slug}>
                <KindBadge kind={d.kind} /> <Link href={`/biblioteca/${d.slug}`}>{d.title}</Link>
                {d.description && <span className="dim small"> — {d.description}</span>}
              </li>
            ))}
          </ul>
        </Window>
      )}
    </>
  );
}

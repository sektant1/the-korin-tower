"use client";
// Partes interativas da Biblioteca: busca/filtros, sumário que acompanha a rolagem,
// barra de leitura, botão de copiar código e "lido" (guardado neste navegador).
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { setDocRead, useReadDocs } from "@/lib/client/store";
import { DOC_KINDS, formatDay, type DocKind } from "@/lib/biblioteca/kinds";
import type { DocMeta } from "@/lib/biblioteca/parse";
import type { TocEntry } from "@/lib/biblioteca/render";

/* ---------- selos ---------- */

export function KindBadge({ kind }: { kind: DocKind }) {
  return (
    <span className={`kind-badge kind-${kind}`} title={DOC_KINDS[kind].hint}>
      {DOC_KINDS[kind].label}
    </span>
  );
}

export function ReadBadge({ slug }: { slug: string }) {
  const reads = useReadDocs();
  if (!reads[slug]) return null;
  return (
    <span className="read-badge" title={`Lido em ${formatDay(reads[slug])}`}>
      ✓ LIDO
    </span>
  );
}

/* ---------- séries ---------- */

/** "3/5 lidos" de uma série, neste navegador. */
export function SeriesProgress({ slugs }: { slugs: string[] }) {
  const reads = useReadDocs();
  const done = slugs.filter((s) => reads[s]).length;
  const pct = slugs.length ? Math.round((done / slugs.length) * 100) : 0;
  return (
    <div className="track-progress">
      <div className="xp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Partes lidas">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="track-count">
        {done}/{slugs.length} {done === slugs.length && slugs.length > 0 ? "COMPLETA" : "lidos"}
      </span>
    </div>
  );
}

/** Botão para a primeira parte ainda não lida. */
export function SeriesNext({ docs }: { docs: { slug: string; title: string }[] }) {
  const reads = useReadDocs();
  const next = docs.find((d) => !reads[d.slug]);
  if (!docs.length) return null;
  if (!next) return <p className="pass">Série completa.</p>;
  return (
    <p>
      <Link href={`/biblioteca/${next.slug}`} className="btn98 play">
        {docs[0].slug === next.slug ? "COMEÇAR" : "CONTINUAR"}: {next.title} <span className="arrow" aria-hidden="true">►</span>
      </Link>
    </p>
  );
}

/* ---------- busca e filtros do índice ---------- */

export interface BrowserDoc extends DocMeta {
  seriesTitle: string | null;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function LibraryBrowser({
  docs,
  tags,
  initial,
}: {
  docs: BrowserDoc[];
  tags: { tag: string; count: number }[];
  initial: { q: string; kind: DocKind | ""; tag: string };
}) {
  const [q, setQ] = useState(initial.q);
  const [kind, setKind] = useState<DocKind | "">(initial.kind);
  const [tag, setTag] = useState(initial.tag);
  const [allTags, setAllTags] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Filtros na URL (dá para linkar "?tag=ponteiros"), sem recarregar a página.
  useEffect(() => {
    const u = new URL(location.href);
    for (const [k, v] of [["q", q.trim()], ["tipo", kind], ["tag", tag]] as const) {
      if (v) u.searchParams.set(k, v);
      else u.searchParams.delete(k);
    }
    history.replaceState(history.state, "", u);
  }, [q, kind, tag]);

  // "/" foca a busca, como no Vim (e no GitHub).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.ctrlKey || e.metaKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return docs.filter((d) => {
      if (kind && d.kind !== kind) return false;
      if (tag && !d.tags.includes(tag)) return false;
      if (!words.length) return true;
      const hay = fold([d.title, d.description, d.seriesTitle ?? "", ...d.tags, ...d.headings].join(" "));
      return words.every((w) => hay.includes(w));
    });
  }, [docs, q, kind, tag]);

  const kindCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.kind, (m.get(d.kind) ?? 0) + 1);
    return m;
  }, [docs]);

  const visibleTags = allTags ? tags : tags.slice(0, 14);
  const filtered = Boolean(q.trim() || kind || tag);

  return (
    <div className="lib-browser">
      <div className="lib-search" role="search">
        <label htmlFor="lib-q" className="sr-only">
          Buscar na biblioteca
        </label>
        <svg className="lib-search-icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" shapeRendering="crispEdges">
          {/* lupa em pixel art */}
          <path fill="currentColor" d="M5 1h4v1h2v2h1v4h-1v2H9v1H5v-1H3V8H2V4h1V2h2zM5 3v1H4v4h1v1h4V8h1V4H9V3z" />
          <path fill="currentColor" d="M10 11h2v1h1v1h1v1h1v2h-2v-1h-1v-1h-1v-1h-1z" />
        </svg>
        <input
          ref={input}
          id="lib-q"
          type="search"
          className="lib-input"
          placeholder="Buscar por título, assunto ou tag..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQ("");
              e.currentTarget.blur();
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {q ? (
          <button type="button" className="lib-clear" onClick={() => (setQ(""), input.current?.focus())} aria-label="Limpar busca">
            ×
          </button>
        ) : (
          <kbd className="lib-key" title="Aperte / para buscar">
            /
          </kbd>
        )}
      </div>

      <div className="lib-filters" role="group" aria-label="Filtrar por tipo">
        <button type="button" className={`chip98 ${kind === "" ? "on" : ""}`} aria-pressed={kind === ""} onClick={() => setKind("")}>
          Tudo <small>{docs.length}</small>
        </button>
        {(Object.keys(DOC_KINDS) as DocKind[])
          .filter((k) => kindCounts.has(k))
          .map((k) => (
            <button key={k} type="button" className={`chip98 kind-${k} ${kind === k ? "on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(kind === k ? "" : k)} title={DOC_KINDS[k].hint}>
              {DOC_KINDS[k].label} <small>{kindCounts.get(k)}</small>
            </button>
          ))}
      </div>

      {tags.length > 0 && (
        <div className="lib-tags" role="group" aria-label="Filtrar por tag">
          {visibleTags.map(({ tag: t, count }) => (
            <button key={t} type="button" className={`tag tag-btn ${tag === t ? "on" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
              #{t} <small>{count}</small>
            </button>
          ))}
          {tags.length > visibleTags.length && (
            <button type="button" className="link-btn small" onClick={() => setAllTags(true)}>
              +{tags.length - visibleTags.length} tags
            </button>
          )}
        </div>
      )}

      <p className="lib-count dim small" aria-live="polite">
        {shown.length} {shown.length === 1 ? "post" : "posts"}
        {filtered && (
          <>
            {" "}
            ·{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setQ("");
                setKind("");
                setTag("");
              }}
            >
              limpar filtros
            </button>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="lib-empty">Nenhum post encontrado.</p>
      ) : (
        <ul className="doc-list">
          {shown.map((d) => (
            <DocRow key={d.slug} doc={d} seriesTitle={d.seriesTitle} onTag={setTag} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function DocRow({ doc: d, seriesTitle, onTag, partLabel }: { doc: DocMeta; seriesTitle?: string | null; onTag?: (t: string) => void; partLabel?: string }) {
  return (
    <li className={`doc-row ${d.draft ? "is-draft" : ""}`}>
      <div className="doc-row-head">
        {partLabel ? <span className="floor-n">{partLabel}</span> : <KindBadge kind={d.kind} />}
        <Link href={`/biblioteca/${d.slug}`} className="doc-row-title">
          {d.title}
        </Link>
        {d.draft && <span className="draft-badge">RASCUNHO</span>}
        <ReadBadge slug={d.slug} />
      </div>
      {d.description && <p className="doc-row-desc">{d.description}</p>}
      <p className="doc-row-meta">
        <span>{formatDay(d.updated ?? d.date)}</span>
        <span>{d.readingMin} min</span>
        {seriesTitle && d.series && (
          <Link href={`/biblioteca/serie/${d.series}`} className="doc-row-series">
            série: {seriesTitle}
            {d.part ? ` #${d.part}` : ""}
          </Link>
        )}
        {d.tags.map((t) =>
          onTag ? (
            <button key={t} type="button" className="tag tag-btn" onClick={() => onTag(t)}>
              #{t}
            </button>
          ) : (
            <Link key={t} href={`/biblioteca?tag=${encodeURIComponent(t)}`} className="tag">
              #{t}
            </Link>
          ),
        )}
      </p>
    </li>
  );
}

/* ---------- página do post ---------- */

/** Sumário com a seção atual destacada enquanto se rola. */
export function DocToc({ toc }: { toc: TocEntry[] }) {
  const [active, setActive] = useState(toc[0]?.id ?? "");
  useEffect(() => {
    const els = toc.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const onScroll = () => {
      // A seção atual é a última cujo título já passou do topo (com folga).
      let cur = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top < 120) cur = el.id;
        else break;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);

  return (
    <ol className="doc-toc">
      {toc.map((t) => (
        <li key={t.id} className={`toc-${t.depth} ${active === t.id ? "on" : ""}`}>
          <a href={`#${t.id}`} aria-current={active === t.id ? "location" : undefined}>
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Efeitos do post: barra de leitura no topo, botão "copiar" nos blocos de código
 * e marca como lido quando o fim do texto aparece na tela.
 */
export function DocEnhancer({ slug, bodyId, endId }: { slug: string; bodyId: string; endId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = document.getElementById(bodyId);
    if (!body) return;

    // Copiar código
    const buttons: HTMLButtonElement[] = [];
    body.querySelectorAll<HTMLElement>(".code-box").forEach((box) => {
      const head = box.querySelector(".code-head");
      const code = box.querySelector("pre code");
      if (!head || !code || head.querySelector(".code-copy")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "code-copy";
      b.textContent = "copiar";
      b.setAttribute("aria-label", "Copiar código");
      b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? "");
          b.textContent = "copiado!";
        } catch {
          b.textContent = "erro :(";
        }
        setTimeout(() => (b.textContent = "copiar"), 1500);
      };
      head.appendChild(b);
      buttons.push(b);
    });

    // Barra de leitura + "lido": o fim do texto apareceu durante uma rolagem
    // (só abrir um post curto não conta; para esses existe o botão "marcar como lido").
    const end = document.getElementById(endId);
    const update = (scrolled: boolean) => {
      const r = body.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const pct = total <= 0 ? 100 : Math.min(100, Math.max(0, (-r.top / total) * 100));
      if (bar.current) bar.current.style.width = `${pct}%`;
      if (scrolled && end && end.getBoundingClientRect().top < window.innerHeight) setDocRead(slug, true);
    };
    const onScroll = () => update(true);
    const onResize = () => update(false);
    update(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      buttons.forEach((b) => b.remove());
    };
  }, [slug, bodyId, endId]);

  return (
    <div className="reading-bar" aria-hidden="true">
      <div ref={bar} />
    </div>
  );
}

/** Marcar/desmarcar como lido na mão. */
export function ReadToggle({ slug }: { slug: string }) {
  const reads = useReadDocs();
  const isRead = Boolean(reads[slug]);
  return (
    <button type="button" className="btn98 small" aria-pressed={isRead} onClick={() => setDocRead(slug, !isRead)}>
      {isRead ? "✓ Lido (desmarcar)" : "Marcar como lido"}
    </button>
  );
}

/** Lista de partes da série, com ✓ nas lidas. */
export function SeriesParts({ docs, current }: { docs: DocMeta[]; current?: string }) {
  const reads = useReadDocs();
  return (
    <ol className="series-parts">
      {docs.map((d, i) => (
        <li key={d.slug} className={`${d.slug === current ? "here" : ""} ${reads[d.slug] ? "done" : ""}`}>
          <span className="series-n" aria-hidden="true">
            {reads[d.slug] ? "✓" : String(i + 1).padStart(2, "0")}
          </span>
          {d.slug === current ? (
            <b aria-current="page">{d.title}</b>
          ) : (
            <Link href={`/biblioteca/${d.slug}`}>{d.title}</Link>
          )}
          {d.draft && <span className="draft-badge">RASCUNHO</span>}
        </li>
      ))}
    </ol>
  );
}

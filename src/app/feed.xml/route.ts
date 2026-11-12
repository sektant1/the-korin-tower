import { listDocs } from "@/lib/biblioteca";
import { DOC_KINDS } from "@/lib/biblioteca/kinds";
import { latestChallenges, listCategories } from "@/lib/challenges";
import { LANGUAGES } from "@/lib/languages";

// Feed RSS 2.0 dos desafios mais novos (Fase 5) e dos posts da Biblioteca. Lido a cada pedido, com cache curto.
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(req: Request) {
  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  const [items, categories, docs] = await Promise.all([
    latestChallenges(30),
    listCategories(),
    listDocs({ drafts: false }).catch(() => []), // biblioteca com erro não derruba o feed
  ]);
  const names = new Map(categories.map((c) => [c.id, c.name]));

  const entries = [
    ...items.map((c) => {
      const url = `${base}/desafio/${c.slug}`;
      const about = `Dificuldade ${c.difficulty}/5 · ${c.languages.map((l) => LANGUAGES[l].label).join(" / ")}${c.tags.length ? ` · ${c.tags.map((t) => `#${t}`).join(" ")}` : ""}`;
      return { at: c.createdAt, title: c.title, url, category: names.get(c.categoryId) ?? c.categoryId, about };
    }),
    ...docs.slice(0, 30).map((d) => ({
      at: new Date(`${d.date}T12:00:00-03:00`),
      title: d.title,
      url: `${base}/biblioteca/${d.slug}`,
      category: `Biblioteca: ${DOC_KINDS[d.kind].label}`,
      about: d.description || `${DOC_KINDS[d.kind].label} · ${d.readingMin} min de leitura`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>The Korin Tower</title>
<link>${esc(base)}/</link>
<atom:link href="${esc(base)}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Desafios novos e posts da Biblioteca: programação de baixo nível.</description>
<language>pt-BR</language>
${entries
  .map(
    (e) => `<item>
<title>${esc(e.title)}</title>
<link>${esc(e.url)}</link>
<guid isPermaLink="true">${esc(e.url)}</guid>
<category>${esc(e.category)}</category>
<pubDate>${e.at.toUTCString()}</pubDate>
<description>${esc(e.about)}</description>
</item>`,
  )
  .join("\n")}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}

import { latestChallenges, listCategories } from "@/lib/challenges";
import { LANGUAGES } from "@/lib/languages";

// Feed RSS 2.0 dos desafios mais novos (Fase 5). Lido do banco a cada pedido, com cache curto.
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(req: Request) {
  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  const [items, categories] = await Promise.all([latestChallenges(30), listCategories()]);
  const names = new Map(categories.map((c) => [c.id, c.name]));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>The Korin Tower</title>
<link>${esc(base)}/</link>
<atom:link href="${esc(base)}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Desafios novos de programação de baixo nível.</description>
<language>pt-BR</language>
${items
  .map((c) => {
    const url = `${base}/desafio/${c.slug}`;
    const about = `Dificuldade ${c.difficulty}/5 · ${c.languages.map((l) => LANGUAGES[l].label).join(" / ")}${c.tags.length ? ` · ${c.tags.map((t) => `#${t}`).join(" ")}` : ""}`;
    return `<item>
<title>${esc(c.title)}</title>
<link>${esc(url)}</link>
<guid isPermaLink="true">${esc(url)}</guid>
<category>${esc(names.get(c.categoryId) ?? c.categoryId)}</category>
<pubDate>${c.createdAt.toUTCString()}</pubDate>
<description>${esc(about)}</description>
</item>`;
  })
  .join("\n")}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}

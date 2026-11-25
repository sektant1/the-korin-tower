import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import rehypeMathNowrap from "./rehype-math-nowrap";

const render = async (md: string) =>
  String(await unified().use(remarkParse).use(remarkMath).use(remarkRehype).use(rehypeKatex).use(rehypeMathNowrap).use(rehypeStringify).process(md));

test("parênteses e pontuação ficam colados na fórmula", async () => {
  const html = await render("vetor ($-10^9 \\le a_i \\le 10^9$). Fim");
  assert.match(html, /vetor <span class="math-nowrap">\(<span class="katex">.*<\/span>\)\.<\/span> Fim/);
});

test("fórmula sem pontuação em volta não ganha invólucro", async () => {
  const html = await render("tem $N$ linhas");
  assert.ok(!html.includes("math-nowrap"));
  assert.match(html, /tem <span class="katex">/);
});

test("o CSS importado no layout é do mesmo KaTeX que gera o HTML", async () => {
  // Versões diferentes renomeiam classes (0.19 usa .katex-base) e a fórmula se parte no meio.
  const html = await render("$10^9$");
  const cls = html.match(/<span class="katex-html" aria-hidden="true"><span class="([^"]+)">/)?.[1];
  assert.ok(cls, "classe do bloco da fórmula");
  const req = createRequire(import.meta.url);
  const css = readFileSync(req.resolve("katex/dist/katex.min.css"), "utf8");
  assert.ok(css.includes(`.katex .${cls}{`), `katex.min.css não estiliza .${cls}`);
});

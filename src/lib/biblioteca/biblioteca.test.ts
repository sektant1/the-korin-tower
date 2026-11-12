import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLibrary } from "./load";
import { checkLibrary, countWords, DocError, groupSeries, headingsOf, isPublished, parseDoc, parseSeries, recentOrder, sceneOf, seriesScene } from "./parse";
import { renderDoc, slugify } from "./render";

const doc = (front: string, body = "Texto.") => `---\n${front}\n---\n${body}\n`;

test("parseDoc: padrões e slug a partir do caminho", () => {
  const d = parseDoc(doc("title: Olá\ndate: 2026-11-12"), "pasta/meu-post.md");
  assert.equal(d.slug, "meu-post");
  assert.equal(d.kind, "artigo");
  assert.equal(d.date, "2026-11-12");
  assert.equal(d.series, null);
  assert.deepEqual(d.tags, []);
  assert.equal(d.draft, false);
  assert.equal(parseDoc(doc("title: X\ndate: 2026-01-01"), "guia-x/index.md").slug, "guia-x");
  assert.equal(parseDoc(doc("title: X\ndate: 2026-01-01\nslug: outro"), "a.md").slug, "outro");
});

test("parseDoc: campos completos", () => {
  const d = parseDoc(
    doc("title: T\ndate: 2026-11-12\nupdated: 2026-11-20\nkind: tutorial\nseries: s1\npart: 2\ntags: [C, Ponteiros]\nlevel: 3\nchallenges: fizzbuzz\ndraft: true"),
    "t.md",
  );
  assert.equal(d.kind, "tutorial");
  assert.equal(d.part, 2);
  assert.deepEqual(d.tags, ["c", "ponteiros"]);
  assert.deepEqual(d.challenges, ["fizzbuzz"]);
  assert.equal(d.updated, "2026-11-20");
  assert.equal(d.level, 3);
  assert.equal(d.draft, true);
});

test("parseDoc: erros de quem escreve", () => {
  assert.throws(() => parseDoc(doc("date: 2026-01-01"), "a.md"), /falta 'title'/);
  assert.throws(() => parseDoc(doc("title: A"), "a.md"), /falta 'date'/);
  assert.throws(() => parseDoc(doc("title: A\ndate: ontem"), "a.md"), /AAAA-MM-DD/);
  assert.throws(() => parseDoc(doc("title: A\ndate: 2026-01-01\nkind: receita"), "a.md"), /'kind'/);
  assert.throws(() => parseDoc(doc("title: A\ndate: 2026-01-01\npart: 0"), "a.md"), /'part'/);
  assert.throws(() => parseDoc(doc("title: A\ndate: 2026-01-01\nlevel: 9"), "a.md"), /'level'/);
  assert.throws(() => parseDoc(doc("title: A\ndate: 2026-01-01"), "Com Espaço.md"), /slug/);
});

test("checkLibrary: slug repetido, série inexistente e parte repetida", () => {
  const series = parseSeries("- id: s1\n  title: Série 1\n");
  const a = parseDoc(doc("title: A\ndate: 2026-01-01\nseries: s1\npart: 1"), "a.md");
  const b = parseDoc(doc("title: B\ndate: 2026-01-01\nseries: s1\npart: 1"), "b.md");
  assert.throws(() => checkLibrary([a, b], series), /duas partes 1/);
  assert.throws(() => checkLibrary([a, { ...b, slug: "a", part: 2 }], series), /repetido/);
  assert.throws(() => checkLibrary([{ ...a, series: "nada" }], series), DocError);
  checkLibrary([a, { ...b, part: 2 }], series);
});

test("publicação, ordem e séries", () => {
  const mk = (f: string, file: string) => parseDoc(doc(f), file);
  const p1 = mk("title: P1\ndate: 2026-11-01\nseries: s\npart: 1", "p1.md");
  const p2 = mk("title: P2\ndate: 2026-11-10\nseries: s\npart: 2", "p2.md");
  const rascunho = mk("title: R\ndate: 2026-11-01\ndraft: true", "r.md");
  const futuro = mk("title: F\ndate: 2026-12-25", "f.md");
  assert.equal(isPublished(p1, "2026-11-12"), true);
  assert.equal(isPublished(rascunho, "2026-11-12"), false);
  assert.equal(isPublished(futuro, "2026-11-12"), false);
  assert.equal(isPublished(futuro, "2026-12-25"), true);
  assert.deepEqual([p1, p2].sort(recentOrder).map((d) => d.slug), ["p2", "p1"]);
  const [s] = groupSeries(parseSeries("- id: s\n  title: S\n- id: vazia\n  title: V\n"), [p2, p1]);
  assert.deepEqual(s.docs.map((d) => d.slug), ["p1", "p2"]);
  assert.equal(groupSeries(parseSeries("- id: vazia\n  title: V\n"), [p1]).length, 0);
});

test("countWords e headingsOf ignoram código", () => {
  assert.equal(countWords("uma duas três").words, 3);
  assert.equal(countWords("").readingMin, 1);
  assert.deepEqual(headingsOf("## Um\ntexto\n```sh\n## não\n```\n### Dois ##\n#### fora"), ["Um", "Dois"]);
});

test("sceneOf: frontmatter > série > level > slug, sempre 1..8", () => {
  const base = { scene: null, series: null, level: null, slug: "qualquer" };
  assert.equal(sceneOf({ ...base, scene: 6, series: "s", level: 2 }), 6);
  assert.equal(sceneOf({ ...base, series: "s", level: 2 }), seriesScene({ id: "s", scene: null }));
  assert.equal(sceneOf({ ...base, series: "s" }, { id: "s", scene: 7 }), 7);
  assert.equal(parseSeries("- id: s\n  title: S\n  scene: 4\n")[0].scene, 4);
  assert.throws(() => parseSeries("- id: s\n  title: S\n  scene: 0\n"), /'scene'/);
  assert.equal(sceneOf({ ...base, level: 2 }), 2);
  for (const slug of ["a", "b", "ponteiros", "x-y-z"]) {
    const n = sceneOf({ ...base, slug });
    assert.ok(n >= 1 && n <= 8);
    assert.equal(sceneOf({ ...base, slug }), n); // estável
  }
  assert.throws(() => parseDoc(doc("title: A\ndate: 2026-01-01\nscene: 9"), "a.md"), /'scene'/);
});

test("slugify", () => {
  assert.equal(slugify("Ponteiros & Memória!"), "ponteiros-memoria");
  assert.equal(slugify("???"), "secao");
});

test("renderDoc: sumário, âncoras e ids sem repetição", async () => {
  const { html, toc } = await renderDoc("## Introdução\n\n### Passo\n\n## Passo\n\n#### Detalhe");
  assert.deepEqual(toc, [
    { id: "introducao", text: "Introdução", depth: 2 },
    { id: "passo", text: "Passo", depth: 3 },
    { id: "passo-2", text: "Passo", depth: 2 },
  ]);
  assert.match(html, /<h2 id="introducao">Introdução<a href="#introducao" class="h-anchor"/);
  assert.match(html, /<h4 id="detalhe">/);
});

test("renderDoc: caixas de aviso", async () => {
  const { html } = await renderDoc("> [!DICA] Atalho\n> Use `-O2`.\n\n> [!NOTE]\n> Nota.\n\n> [!SPOILER]\n> 42\n\n> Citação comum");
  const flat = html.replace(/\n/g, "");
  assert.match(flat, /<aside class="callout callout-tip"><p class="callout-title">Atalho<\/p><p>Use <code>-O2<\/code>.<\/p><\/aside>/);
  assert.match(flat, /<aside class="callout callout-note"><p class="callout-title">Nota<\/p><p>Nota.<\/p>/);
  assert.match(flat, /<details class="callout callout-spoiler"><summary class="callout-title">Spoiler<\/summary><p>42<\/p><\/details>/);
  assert.match(html, /<blockquote>\n<p>Citação comum<\/p>/);
  assert.doesNotMatch(html, /\[!/);
});

test("renderDoc: atalhos de link, imagens e links externos", async () => {
  const { html } = await renderDoc(
    "[a](desafio:fizzbuzz) [b](doc:outro#secao) [c](serie:s1) [d](https://x.dev) ![e](./assets/p.png)",
  );
  assert.match(html, /href="\/desafio\/fizzbuzz"/);
  assert.match(html, /href="\/biblioteca\/outro#secao"/);
  assert.match(html, /href="\/biblioteca\/serie\/s1"/);
  assert.match(html, /href="https:\/\/x.dev" rel="noopener noreferrer" class="ext"/);
  assert.match(html, /src="\/biblioteca-assets\/p.png"/);
});

test("renderDoc: bloco de código com título e linguagem; HTML cru some", async () => {
  const { html } = await renderDoc('```c title="main.c"\nint x;\n```\n\n<script>alert(1)</script>');
  assert.match(html, /<div class="code-box"><div class="code-head"><span class="code-title">main.c<\/span><span class="code-lang">c<\/span><\/div><pre>/);
  assert.doesNotMatch(html, /<script>/);
});

test("a pasta biblioteca/ do repositório é válida", async () => {
  const lib = await loadLibrary();
  assert.ok(lib.docs.length > 0);
  // links internos para outros posts apontam para posts que existem
  const slugs = new Set(lib.docs.map((d) => d.slug));
  for (const d of lib.docs) {
    for (const m of d.body.matchAll(/\]\(doc:([a-z0-9-]+)/g)) assert.ok(slugs.has(m[1]), `${d.file}: link para doc:${m[1]} inexistente`);
  }
});

// Markdown da Biblioteca → HTML + sumário. Mesma base dos enunciados (GFM, KaTeX, highlight.js),
// com extras de leitura longa: âncoras nos títulos, caixas de aviso, título nos blocos de código
// e atalhos de link (`desafio:slug`, `doc:slug`). Conteúdo escrito por quem administra (confiável);
// HTML cru continua descartado (remark-rehype sem allowDangerousHtml).
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface RenderedDoc {
  html: string;
  toc: TocEntry[];
}

/* Tipos mínimos das árvores (mdast/hast) — só o que os plugins abaixo tocam. */
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}
interface HNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
  data?: { meta?: string };
}
interface VFileLike {
  data: Record<string, unknown>;
}

export const CALLOUTS = {
  note: { label: "Nota", aliases: ["NOTE", "NOTA", "INFO"] },
  tip: { label: "Dica", aliases: ["TIP", "DICA"] },
  important: { label: "Importante", aliases: ["IMPORTANT", "IMPORTANTE"] },
  warning: { label: "Cuidado", aliases: ["WARNING", "CUIDADO", "ATENCAO", "ATENÇÃO"] },
  caution: { label: "Perigo", aliases: ["CAUTION", "PERIGO", "DANGER"] },
  spoiler: { label: "Spoiler", aliases: ["SPOILER"] },
} as const;
type CalloutKind = keyof typeof CALLOUTS;
const CALLOUT_BY_ALIAS = new Map<string, CalloutKind>(
  (Object.entries(CALLOUTS) as [CalloutKind, (typeof CALLOUTS)[CalloutKind]][]).flatMap(([k, v]) => v.aliases.map((a) => [a, k] as const)),
);

function walk<T extends { children?: T[] }>(node: T, fn: (n: T, parent: T | null, index: number) => void, parent: T | null = null, index = 0) {
  fn(node, parent, index);
  node.children?.forEach((c, i) => walk(c, fn, node, i));
}

function textOf(n: HNode): string {
  if (n.type === "text") return n.value ?? "";
  return (n.children ?? []).map(textOf).join("");
}

/** "Ponteiros & Memória!" → "ponteiros-memoria" */
export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "secao"
  );
}

/**
 * `> [!DICA] Título opcional` (sintaxe dos alertas do GitHub, com nomes em português também)
 * vira <aside class="callout callout-tip">. `[!SPOILER]` vira um <details> fechado.
 */
function remarkCallouts() {
  return (tree: MdNode) => {
    walk(tree, (node) => {
      if (node.type !== "blockquote") return;
      const first = node.children?.[0];
      const text = first?.type === "paragraph" ? first.children?.[0] : undefined;
      if (text?.type !== "text" || !text.value) return;
      const m = /^\[!([A-Za-zÀ-ú]+)\][ \t]*([^\n]*)\n?/.exec(text.value);
      const kind = m && CALLOUT_BY_ALIAS.get(m[1].toUpperCase());
      if (!m || !kind) return;
      text.value = text.value.slice(m[0].length);
      if (!text.value) first!.children!.shift();
      if (!first!.children!.length) node.children!.shift();

      const title = m[2].trim() || CALLOUTS[kind].label;
      const spoiler = kind === "spoiler";
      node.data = { hName: spoiler ? "details" : "aside", hProperties: { className: ["callout", `callout-${kind}`] } };
      node.children!.unshift({
        type: "paragraph",
        data: { hName: spoiler ? "summary" : "p", hProperties: { className: ["callout-title"] } },
        children: [{ type: "text", value: title }],
      });
    });
  };
}

/** Atalhos de link e imagem. */
function rewriteUrl(url: string): string {
  if (url.startsWith("desafio:")) return `/desafio/${url.slice(8)}`;
  if (url.startsWith("doc:")) {
    const [slug, hash] = url.slice(4).split("#");
    return `/biblioteca/${slug}${hash ? `#${hash}` : ""}`;
  }
  if (url.startsWith("serie:")) return `/biblioteca/serie/${url.slice(6)}`;
  if (url.startsWith("./assets/")) return `/biblioteca-assets/${url.slice(9)}`;
  return url;
}

function rehypeDoc() {
  return (tree: HNode, file: VFileLike) => {
    const toc: TocEntry[] = [];
    const used = new Map<string, number>();

    walk(tree, (node, parent, index) => {
      if (node.type !== "element") return;
      const props = (node.properties ??= {});

      // Títulos: id estável + âncora "#" clicável; h2/h3 entram no sumário.
      if (node.tagName === "h2" || node.tagName === "h3" || node.tagName === "h4") {
        const text = textOf(node).trim();
        let id = slugify(text);
        const n = used.get(id) ?? 0;
        used.set(id, n + 1);
        if (n) id = `${id}-${n + 1}`;
        props.id = id;
        if (node.tagName !== "h4") toc.push({ id, text, depth: node.tagName === "h2" ? 2 : 3 });
        node.children = [
          ...(node.children ?? []),
          {
            type: "element",
            tagName: "a",
            properties: { href: `#${id}`, className: ["h-anchor"], ariaLabel: `Link para a seção ${text}` },
            children: [{ type: "text", value: "#" }],
          },
        ];
        return;
      }

      if (node.tagName === "a" && typeof props.href === "string") {
        const href = (props.href = rewriteUrl(props.href));
        if (/^https?:\/\//.test(href)) {
          props.rel = ["noopener", "noreferrer"];
          props.className = ["ext"];
        }
        return;
      }
      if (node.tagName === "img" && typeof props.src === "string") {
        props.src = rewriteUrl(props.src);
        props.loading = "lazy";
        return;
      }

      // Blocos de código: ```c title="main.c" → moldura com cabeçalho (linguagem/arquivo).
      // O botão de copiar entra no cliente (DocEnhancer).
      if (node.tagName === "pre" && parent && parent.tagName !== "div") {
        const code = node.children?.find((c) => c.tagName === "code");
        if (!code) return;
        const cls = (code.properties?.className as string[] | undefined) ?? [];
        const lang = cls.find((c) => c.startsWith("language-"))?.slice(9) ?? "";
        const meta = code.data?.meta ?? "";
        const title = /title="([^"]*)"/.exec(meta)?.[1] ?? /title=(\S+)/.exec(meta)?.[1] ?? "";
        const head: HNode[] = [];
        if (title) head.push({ type: "element", tagName: "span", properties: { className: ["code-title"] }, children: [{ type: "text", value: title }] });
        if (lang) head.push({ type: "element", tagName: "span", properties: { className: ["code-lang"] }, children: [{ type: "text", value: lang }] });
        parent.children![index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["code-box"] },
          children: [{ type: "element", tagName: "div", properties: { className: ["code-head"] }, children: head }, node],
        };
      }
    });

    file.data.toc = toc;
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkCallouts)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeDoc)
  .use(rehypeStringify);

export async function renderDoc(md: string): Promise<RenderedDoc> {
  const file = await processor.process(md);
  return { html: String(file), toc: (file.data.toc as TocEntry[] | undefined) ?? [] };
}

import "server-only";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// Markdown de desafios é escrito por quem administra o site (confiável).
// HTML cru é descartado pelo remark-rehype (sem allowDangerousHtml).
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeStringify);

/**
 * @param assetSlug se informado, `./assets/x.png` vira `/challenge-assets/<slug>/x.png`
 */
export async function renderMarkdown(md: string, assetSlug?: string): Promise<string> {
  const source = assetSlug ? md.replace(/\]\(\.\/assets\//g, `](/challenge-assets/${assetSlug}/`) : md;
  return String(await processor.process(source));
}

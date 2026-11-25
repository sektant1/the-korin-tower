import type { Element, ElementContent, Root, Text } from "hast";

// Fórmula inline e a pontuação colada nela não podem se separar na quebra de linha:
// "($N \le 10^5$)." não deve deixar o ")." sozinho no começo da linha seguinte.
// Roda depois do rehype-katex: junta "(" + fórmula + ")." num <span class="math-nowrap">.

const OPEN = /[(\[{"“'‘]+$/;
const CLOSE = /^[)\]}"”'’.,;:!?%]+/;

const isInlineMath = (n: ElementContent | undefined): boolean =>
  n?.type === "element" && n.tagName === "span" && Array.isArray(n.properties?.className) && n.properties.className.includes("katex");

const text = (value: string): Text => ({ type: "text", value });

function glue(children: ElementContent[]): ElementContent[] {
  const out: ElementContent[] = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!isInlineMath(node)) {
      out.push(node.type === "element" ? { ...node, children: glue(node.children) } : node);
      continue;
    }
    const wrapped: ElementContent[] = [node as Element];
    // pontuação de abertura no fim do texto anterior
    const prev = out[out.length - 1];
    if (prev?.type === "text") {
      const m = prev.value.match(OPEN);
      if (m) {
        prev.value = prev.value.slice(0, -m[0].length);
        if (!prev.value) out.pop();
        wrapped.unshift(text(m[0]));
      }
    }
    // pontuação de fechamento no começo do texto seguinte
    const next = children[i + 1];
    if (next?.type === "text") {
      const m = next.value.match(CLOSE);
      if (m) {
        wrapped.push(text(m[0]));
        const rest = next.value.slice(m[0].length);
        children[i + 1] = text(rest);
      }
    }
    out.push(wrapped.length > 1 ? { type: "element", tagName: "span", properties: { className: ["math-nowrap"] }, children: wrapped } : node);
  }
  return out.filter((n) => n.type !== "text" || n.value !== "");
}

export default function rehypeMathNowrap() {
  return (tree: Root) => {
    tree.children = glue(tree.children as ElementContent[]) as Root["children"];
  };
}

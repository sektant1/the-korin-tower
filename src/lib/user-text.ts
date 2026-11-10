// Texto de usuários (guestbook e comentários). Não é Markdown nem HTML: vira uma árvore
// pequena que o React desenha como texto, então não há o que sanitizar.
//   ```bloco de código```    `código`    ||spoiler|| (some até a pessoa clicar)

export type Inline = { type: "text"; text: string } | { type: "code"; text: string };
export type Block = { type: "pre"; text: string } | { type: "inline"; parts: Inline[] } | { type: "spoiler"; parts: Inline[] };

function inline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    parts.push({ type: "code", text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

export function parseUserText(raw: string): Block[] {
  const blocks: Block[] = [];
  const push = (text: string, spoiler: boolean) => {
    if (text) blocks.push({ type: spoiler ? "spoiler" : "inline", parts: inline(text) });
  };
  // Blocos de código primeiro: dentro deles, || e ` são literais.
  raw.split(/```(?:[a-z+]*\n)?([\s\S]*?)```/g).forEach((chunk, i) => {
    if (i % 2) {
      if (chunk.trim()) blocks.push({ type: "pre", text: chunk.replace(/\n$/, "") });
      return;
    }
    chunk.split(/\|\|([\s\S]+?)\|\|/g).forEach((piece, k) => push(piece, k % 2 === 1));
  });
  return blocks;
}

/** Normaliza o que chega de um formulário; devolve o erro em português ou o texto pronto para salvar. */
export function cleanUserText(raw: unknown, max: number): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "texto inválido" };
  const text = raw.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (!text) return { ok: false, error: "escreva alguma coisa" };
  if (text.length > max) return { ok: false, error: `texto grande demais (${text.length} de ${max} caracteres)` };
  return { ok: true, text };
}

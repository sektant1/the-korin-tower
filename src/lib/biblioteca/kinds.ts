// Constantes leves da Biblioteca, seguras para componentes de cliente (sem gray-matter/yaml).
export const DOC_KINDS = {
  tutorial: { label: "Tutorial", hint: "passo a passo, do zero até funcionar" },
  guia: { label: "Guia", hint: "como resolver um problema específico" },
  referencia: { label: "Referência", hint: "consulta rápida: tabelas, flags, APIs" },
  artigo: { label: "Artigo", hint: "explicação, opinião, história" },
} as const;
export type DocKind = keyof typeof DOC_KINDS;
export const isDocKind = (k: unknown): k is DocKind => typeof k === "string" && k in DOC_KINDS;

/** "2026-11-12" → "12/11/2026" */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

// Biblioteca: posts em Markdown (tutoriais, guias, referências) versionados em /biblioteca.
// Este arquivo só valida e organiza; não lê disco nem renderiza (testável sem Next).
import matter from "gray-matter";
import YAML from "yaml";
import { DOC_KINDS, isDocKind, type DocKind } from "./kinds";

export { DOC_KINDS, formatDay, isDocKind, type DocKind } from "./kinds";

export const DOC_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class DocError extends Error {}

/** Quantos cenários existem (as imagens dos andares em public/andares). */
export const SCENES = 8;

function hashPick(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % SCENES) + 1;
}

/** Cenário de uma série: `scene` do series.yml, senão um sorteio estável pelo id. */
export const seriesScene = (s: Pick<Series, "id" | "scene">) => s.scene ?? hashPick(s.id);

/**
 * Cenário do banner de um post: `scene` do frontmatter; senão o da série (todas as partes
 * dividem o mesmo); senão o andar do `level`; senão um sorteio estável pelo slug.
 */
export function sceneOf(d: Pick<DocMeta, "scene" | "series" | "level" | "slug">, series?: Pick<Series, "id" | "scene"> | null): number {
  if (d.scene) return d.scene;
  if (d.series) return seriesScene(series?.id === d.series ? series : { id: d.series, scene: null });
  return d.level ?? hashPick(d.slug);
}

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  kind: DocKind;
  series: string | null;
  /** posição na série (1, 2, 3...); sem série é ignorado */
  part: number | null;
  tags: string[];
  /** "AAAA-MM-DD" */
  date: string;
  updated: string | null;
  /** slugs de desafios para praticar o assunto */
  challenges: string[];
  /** 1..5, mesma escala das esferas dos desafios */
  level: number | null;
  /** cenário do banner (1..8, as imagens dos andares); null = escolhido por sceneOf */
  scene: number | null;
  draft: boolean;
  words: number;
  readingMin: number;
  /** títulos ## e ###: a busca do índice também acha o que está dentro do post */
  headings: string[];
  /** caminho relativo a /biblioteca, para mensagens de erro */
  file: string;
}

export interface Doc extends DocMeta {
  body: string;
}

export interface Series {
  id: string;
  title: string;
  description: string;
  order: number;
  /** cenário do banner da série e das partes (1..8); null = sorteio estável pelo id */
  scene: number | null;
}

/** Série com as partes já ordenadas (só as visíveis para quem está lendo). */
export interface SeriesWithDocs extends Series {
  docs: DocMeta[];
}

function toDay(v: unknown, where: string, field: string): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  throw new DocError(`${where}: '${field}' precisa ser uma data AAAA-MM-DD`);
}

function strList(v: unknown, where: string, field: string): string[] {
  if (v === undefined || v === null) return [];
  if (typeof v === "string") return [v];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new DocError(`${where}: '${field}' deve ser uma lista de textos`);
  return v as string[];
}

export function headingsOf(md: string): string[] {
  return [...md.replace(/```[\s\S]*?```/g, "").matchAll(/^#{2,3}[ \t]+(.+?)[ \t#]*$/gm)].map((m) => m[1].trim());
}

/** Palavras do texto corrido (código conta, mas pesa menos na leitura). */
export function countWords(md: string): { words: number; readingMin: number } {
  let prose = md;
  let code = 0;
  prose = prose.replace(/```[\s\S]*?```/g, (block) => {
    code += block.split(/\s+/).length;
    return " ";
  });
  const words = (prose.match(/[\p{L}\p{N}_]+/gu) ?? []).length;
  // ~200 palavras/min de prosa técnica; código é lido devagar mas pulado com frequência: meio peso.
  return { words: words + code, readingMin: Math.max(1, Math.round((words + code * 0.5) / 200)) };
}

export function parseDoc(raw: string, file: string): Doc {
  const where = `biblioteca/${file}`;
  const { data, content } = matter(raw.replace(/\r\n/g, "\n"));
  const base = file.split("/").pop()!.replace(/\.md$/, "");
  const slug = typeof data.slug === "string" ? data.slug : base === "index" ? file.split("/").slice(-2, -1)[0] : base;
  if (!slug || !DOC_SLUG_RE.test(slug)) throw new DocError(`${where}: slug '${slug}' inválido (use minúsculas, números e hífens)`);
  if (typeof data.title !== "string" || !data.title.trim()) throw new DocError(`${where}: falta 'title'`);
  const kind = data.kind ?? "artigo";
  if (!isDocKind(kind)) throw new DocError(`${where}: 'kind' deve ser ${Object.keys(DOC_KINDS).join(", ")}`);
  if (data.date === undefined) throw new DocError(`${where}: falta 'date'`);
  const series = data.series === undefined || data.series === null ? null : String(data.series);
  if (series !== null && !DOC_SLUG_RE.test(series)) throw new DocError(`${where}: 'series' deve ser o id de uma série`);
  const part = data.part === undefined || data.part === null ? null : Number(data.part);
  if (part !== null && (!Number.isInteger(part) || part < 1)) throw new DocError(`${where}: 'part' deve ser um inteiro >= 1`);
  const level = data.level === undefined || data.level === null ? null : Number(data.level);
  if (level !== null && (!Number.isInteger(level) || level < 1 || level > 5)) throw new DocError(`${where}: 'level' vai de 1 a 5`);

  const scene = data.scene === undefined || data.scene === null ? null : Number(data.scene);
  if (scene !== null && (!Number.isInteger(scene) || scene < 1 || scene > SCENES)) throw new DocError(`${where}: 'scene' vai de 1 a ${SCENES}`);

  const body = content.replace(/^\s+/, "");
  return {
    slug,
    title: data.title.trim(),
    description: typeof data.description === "string" ? data.description.trim() : "",
    kind,
    series,
    part,
    tags: strList(data.tags, where, "tags").map((t) => t.toLowerCase()),
    date: toDay(data.date, where, "date"),
    updated: data.updated === undefined || data.updated === null ? null : toDay(data.updated, where, "updated"),
    challenges: strList(data.challenges, where, "challenges"),
    level,
    scene,
    draft: data.draft === true,
    ...countWords(body),
    headings: headingsOf(body),
    file,
    body,
  };
}

export function parseSeries(raw: string): Series[] {
  const list = YAML.parse(raw) ?? [];
  if (!Array.isArray(list)) throw new DocError("biblioteca/series.yml deve ser uma lista");
  return list.map((s, i) => {
    if (!s?.id || !DOC_SLUG_RE.test(s.id) || typeof s.title !== "string") {
      throw new DocError(`biblioteca/series.yml item ${i}: precisa de 'id' (slug) e 'title'`);
    }
    const scene = s.scene === undefined || s.scene === null ? null : Number(s.scene);
    if (scene !== null && (!Number.isInteger(scene) || scene < 1 || scene > SCENES)) {
      throw new DocError(`biblioteca/series.yml item ${i} ('${s.id}'): 'scene' vai de 1 a ${SCENES}`);
    }
    return { id: s.id, title: s.title, description: typeof s.description === "string" ? s.description.trim() : "", order: i, scene };
  });
}

/** Erros que dependem do conjunto todo: slugs repetidos, série inexistente, partes repetidas. */
export function checkLibrary(docs: Doc[], series: Series[]): void {
  const seen = new Map<string, string>();
  for (const d of docs) {
    const other = seen.get(d.slug);
    if (other) throw new DocError(`slug '${d.slug}' repetido em biblioteca/${other} e biblioteca/${d.file}`);
    seen.set(d.slug, d.file);
  }
  const ids = new Set(series.map((s) => s.id));
  const parts = new Map<string, string>();
  for (const d of docs) {
    if (!d.series) continue;
    if (!ids.has(d.series)) throw new DocError(`biblioteca/${d.file}: série '${d.series}' não está em series.yml`);
    if (d.part === null) continue;
    const key = `${d.series}#${d.part}`;
    const other = parts.get(key);
    if (other) throw new DocError(`série '${d.series}' tem duas partes ${d.part}: ${other} e ${d.file}`);
    parts.set(key, d.file);
  }
}

/** Visível para quem lê: rascunhos e posts agendados (data no futuro) só aparecem para admin/dev. */
export function isPublished(d: DocMeta, today: string): boolean {
  return !d.draft && d.date <= today;
}

/** Ordem na série: `part` primeiro, depois data e título. */
export function seriesOrder(a: DocMeta, b: DocMeta): number {
  return (a.part ?? Infinity) - (b.part ?? Infinity) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
}

/** Mais novos primeiro (por atualização ou publicação). */
export function recentOrder(a: DocMeta, b: DocMeta): number {
  return (b.updated ?? b.date).localeCompare(a.updated ?? a.date) || a.title.localeCompare(b.title);
}

export function groupSeries(series: Series[], docs: DocMeta[]): SeriesWithDocs[] {
  return series
    .map((s) => ({ ...s, docs: docs.filter((d) => d.series === s.id).sort(seriesOrder) }))
    .filter((s) => s.docs.length > 0);
}

export function meta(d: Doc): DocMeta {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { body, ...m } = d;
  return m;
}

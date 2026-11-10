// Lê o diretório /challenges (fonte de verdade versionada no git).
// Usado pelo seed e pelo verificador. `parseMeta` também valida desafios criados no painel admin.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import { LANGUAGES, isLanguageId, type Checker, type ChallengeKind, type LanguageId } from "./languages";

export interface LoadedCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
}

export interface LoadedTest {
  name: string;
  input: string;
  expected: string;
  hidden: boolean;
  order: number;
}

export interface LoadedChallenge {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  difficulty: number;
  kind: ChallengeKind;
  checker: Checker;
  statement: string;
  notes: string | null;
  hints: string[];
  languages: LanguageId[];
  templates: Partial<Record<LanguageId, string>>;
  solutions: Partial<Record<LanguageId, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
  order: number;
  sourceDir: string; // relativo à raiz do repositório
  tests: LoadedTest[];
}

export class ChallengeError extends Error {}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function readOptional(file: string): Promise<string | null> {
  return existsSync(file) ? (await readFile(file, "utf8")).replace(/\r\n/g, "\n") : null;
}

export async function loadCategories(root: string): Promise<LoadedCategory[]> {
  const raw = YAML.parse(await readFile(path.join(root, "categories.yml"), "utf8"));
  if (!Array.isArray(raw)) throw new ChallengeError("categories.yml deve ser uma lista");
  return raw.map((c, i) => {
    if (!c?.id || !SLUG_RE.test(c.id) || !c.name) {
      throw new ChallengeError(`categories.yml item ${i}: precisa de 'id' (slug) e 'name'`);
    }
    return { id: c.id, name: c.name, icon: c.icon ?? "floppy", description: c.description ?? "", order: i };
  });
}

function parseChecker(raw: unknown, where: string): Checker {
  if (raw === undefined || raw === "exact") return { type: "exact" };
  if (raw === "ppm") return { type: "ppm", tolerance: 2, maxBadRatio: 0.005 };
  if (typeof raw === "object" && raw && (raw as { type?: string }).type === "ppm") {
    const r = raw as { tolerance?: number; maxBadRatio?: number };
    return { type: "ppm", tolerance: r.tolerance ?? 2, maxBadRatio: r.maxBadRatio ?? 0.005 };
  }
  throw new ChallengeError(`${where}: checker inválido (use 'exact' ou 'ppm')`);
}

async function loadTests(dir: string, hidden: boolean, where: string): Promise<LoadedTest[]> {
  const testDir = path.join(dir, "tests", hidden ? "hidden" : "public");
  if (!existsSync(testDir)) return [];
  const files = (await readdir(testDir)).sort();
  const ins = files.filter((f) => f.endsWith(".in"));
  for (const f of files.filter((f) => f.endsWith(".out"))) {
    if (!ins.includes(f.replace(/\.out$/, ".in"))) throw new ChallengeError(`${where}: ${f} sem .in correspondente`);
  }
  return Promise.all(
    ins.map(async (f, i) => {
      const base = f.replace(/\.in$/, "");
      const expected = await readOptional(path.join(testDir, `${base}.out`));
      if (expected === null) throw new ChallengeError(`${where}: tests/${hidden ? "hidden" : "public"}/${base}.out não existe`);
      return {
        name: base,
        input: (await readFile(path.join(testDir, f), "utf8")).replace(/\r\n/g, "\n"),
        expected,
        hidden,
        order: i,
      };
    }),
  );
}

export type ChallengeMeta = Omit<LoadedChallenge, "statement" | "notes" | "templates" | "solutions" | "sourceDir" | "tests">;

function positiveInt(raw: unknown, fallback: number, max: number, field: string, where: string): number {
  const n = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new ChallengeError(`${where}: '${field}' deve ser inteiro de 1 a ${max}`);
  return n;
}

/** Valida os metadados (frontmatter do README.md ou campos do painel admin). */
export function parseMeta(
  fm: Record<string, unknown>,
  where: string,
  categories: Set<string>,
  defaults: { slug: string; category: string },
): ChallengeMeta {
  const slug = (fm.slug as string | undefined) ?? defaults.slug;
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) throw new ChallengeError(`${where}: slug inválido '${slug}'`);
  if (typeof fm.title !== "string" || !fm.title.trim()) throw new ChallengeError(`${where}: 'title' obrigatório`);
  const category = (fm.category as string | undefined) ?? defaults.category;
  if (!categories.has(category)) throw new ChallengeError(`${where}: categoria '${category}' não está em categories.yml`);
  const difficulty = Number(fm.difficulty);
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw new ChallengeError(`${where}: 'difficulty' deve ser inteiro de 1 a 5`);
  }
  const kind = (fm.kind ?? "stdio") as ChallengeKind;
  if (kind !== "stdio" && kind !== "shader") throw new ChallengeError(`${where}: kind deve ser 'stdio' ou 'shader'`);

  const languages: unknown[] = Array.isArray(fm.languages) ? fm.languages : [];
  if (!languages.length) throw new ChallengeError(`${where}: 'languages' deve listar ao menos uma linguagem`);
  for (const l of languages) {
    if (!isLanguageId(l)) throw new ChallengeError(`${where}: linguagem desconhecida '${l}' (veja src/lib/languages.ts)`);
    if ((kind === "shader") !== (l === "glsl")) {
      throw new ChallengeError(`${where}: desafios 'shader' usam só glsl, e glsl só existe em desafios 'shader'`);
    }
  }
  const langs = [...new Set(languages)] as LanguageId[];

  return {
    slug,
    title: fm.title.trim(),
    category,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    difficulty,
    kind,
    checker: parseChecker(fm.checker, where),
    hints: Array.isArray(fm.hints) ? fm.hints.map(String) : [],
    languages: langs,
    // Teto do tempo = PISTON_RUN_TIMEOUT do docker-compose; memória = PISTON_RUN_MEMORY_LIMIT.
    timeLimitMs: positiveInt(fm.timeLimitMs, 2000, 10_000, "timeLimitMs", where),
    memoryLimitMb: positiveInt(fm.memoryLimitMb, 256, 512, "memoryLimitMb", where),
    order: Number.isInteger(Number(fm.order ?? 0)) ? Number(fm.order ?? 0) : 0,
  };
}

export async function loadChallenge(dir: string, repoRoot: string, categories: Set<string>): Promise<LoadedChallenge> {
  const where = path.relative(repoRoot, dir).replaceAll("\\", "/");
  const readme = await readOptional(path.join(dir, "README.md"));
  if (readme === null) throw new ChallengeError(`${where}: falta README.md`);
  const { data: fm, content } = matter(readme);
  const meta = parseMeta(fm, where, categories, { slug: path.basename(dir), category: path.basename(path.dirname(dir)) });
  const { kind, languages: langs } = meta;

  const templates: Partial<Record<LanguageId, string>> = {};
  const solutions: Partial<Record<LanguageId, string>> = {};
  for (const l of langs) {
    const ext = LANGUAGES[l].ext;
    const t = await readOptional(path.join(dir, `template.${ext}`));
    if (t === null) throw new ChallengeError(`${where}: falta template.${ext}`);
    templates[l] = t;
    const s = await readOptional(path.join(dir, `solution.${ext}`));
    if (s !== null) solutions[l] = s;
  }

  const tests = [...(await loadTests(dir, false, where)), ...(await loadTests(dir, true, where))];
  if (kind === "stdio" && !tests.length) throw new ChallengeError(`${where}: desafio stdio precisa de testes em tests/public ou tests/hidden`);

  return {
    ...meta,
    statement: content.trim(),
    notes: (await readOptional(path.join(dir, "NOTES.md")))?.trim() ?? null,
    templates,
    solutions,
    sourceDir: where,
    tests,
  };
}

/** Desafios ficam em challenges/<categoria>/<slug>/README.md */
export async function loadAll(repoRoot: string) {
  const root = path.join(repoRoot, "challenges");
  const categories = await loadCategories(root);
  const catIds = new Set(categories.map((c) => c.id));
  const challenges: LoadedChallenge[] = [];
  const errors: string[] = [];
  for (const cat of await readdir(root, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const ch of await readdir(path.join(root, cat.name), { withFileTypes: true })) {
      if (!ch.isDirectory()) continue;
      try {
        challenges.push(await loadChallenge(path.join(root, cat.name, ch.name), repoRoot, catIds));
      } catch (e) {
        if (!(e instanceof ChallengeError)) throw e;
        errors.push(e.message);
      }
    }
  }
  const seen = new Map<string, string>();
  for (const c of challenges) {
    if (seen.has(c.slug)) errors.push(`slug duplicado '${c.slug}': ${seen.get(c.slug)} e ${c.sourceDir}`);
    seen.set(c.slug, c.sourceDir);
  }
  return { categories, challenges, errors };
}

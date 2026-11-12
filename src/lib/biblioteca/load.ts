// Leitura de /biblioteca no disco. Separado de index.ts (server-only) para os testes e scripts usarem.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { checkLibrary, parseDoc, parseSeries, type Doc, type Series } from "./parse";

export const LIBRARY_DIR = path.join(process.cwd(), "biblioteca");

export interface Library {
  docs: Doc[];
  series: Series[];
}

async function findMarkdown(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name !== "assets" && !e.name.startsWith(".")) out.push(...(await findMarkdown(dir, r)));
    } else if (e.name.endsWith(".md") && !e.name.startsWith("_") && e.name.toUpperCase() !== "README.MD") {
      out.push(r);
    }
  }
  return out.sort();
}

export async function loadLibrary(root = LIBRARY_DIR): Promise<Library> {
  if (!existsSync(root)) return { docs: [], series: [] };
  const seriesFile = path.join(root, "series.yml");
  const series = existsSync(seriesFile) ? parseSeries(await readFile(seriesFile, "utf8")) : [];
  const files = await findMarkdown(root);
  const docs = await Promise.all(files.map(async (f) => parseDoc(await readFile(path.join(root, f), "utf8"), f)));
  checkLibrary(docs, series);
  return { docs, series };
}


import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { GALLERY_SKIP, GIF_DIR } from "./gifs";

// Imagens que o dono do site coloca em public/fanart/. Lidas a cada requisição,
// então basta copiar o arquivo: não precisa rebuild nem seed.
//   banner.*  -> cabeçalho
//   mascote.* -> topo da home
//   o resto   -> galeria e slot aleatório da sidebar
const DIR = path.join(process.cwd(), "public", "fanart");
const IMAGE = /\.(gif|png|jpe?g|webp|svg)$/i;

export interface Fanart {
  banner: string | null;
  mascot: string | null;
  gallery: string[];
}

export async function getFanart(): Promise<Fanart> {
  let files: string[] = [];
  try {
    files = (await readdir(DIR)).filter((f) => IMAGE.test(f)).sort();
  } catch {
    /* pasta não existe: sem imagens */
  }
  const url = (f: string) => `/fanart/${encodeURIComponent(f)}`;
  const named = (base: string) => files.find((f) => f.toLowerCase().startsWith(`${base}.`));
  const banner = named("banner");
  const mascot = named("mascote");
  return {
    banner: banner ? url(banner) : null,
    mascot: mascot ? url(mascot) : null,
    gallery: files.filter((f) => f !== banner && f !== mascot).map(url),
  };
}

/** Nome legível a partir do arquivo: "goku-voando.gif" -> "goku voando" */
export function captionOf(src: string): string {
  return decodeURIComponent(src.split("/").pop() ?? "")
    .replace(IMAGE, "")
    .replace(/[-_]+/g, " ");
}

/**
 * Todas as imagens de public/assets/dragon-ball-gifs, inclusive em subpastas.
 * Lido a cada requisição: basta copiar o arquivo para a pasta.
 * Se existir uma cópia sem fundo em transparente/ (mesmo nome), ela é usada no lugar.
 */
export async function listGifArchive(): Promise<string[]> {
  const root = path.join(process.cwd(), GIF_DIR);
  let entries: string[];
  try {
    entries = (await readdir(root, { recursive: true })).map((p) => p.replaceAll("\\", "/"));
  } catch {
    return []; // pasta não existe
  }
  const clean = new Set(entries.filter((p) => p.startsWith("transparente/")).map((p) => p.slice("transparente/".length)));
  const originals = entries.filter(
    (p) => IMAGE.test(p) && !p.startsWith("transparente/") && !GALLERY_SKIP.has(path.posix.basename(p)),
  );
  // Sem original correspondente (ex.: logo-dbz.gif, cujo original fica fora da galeria): mostra a cópia mesmo.
  const orphans = [...clean].filter((p) => IMAGE.test(p) && !originals.includes(p));
  const rel = [
    ...orphans.map((p) => `transparente/${p}`),
    ...originals.sort().map((p) => (clean.has(p) ? `transparente/${p}` : p)),
  ];
  const base = "/" + GIF_DIR.replace(/^public\//, "");
  return rel.map((p) => `${base}/${p.split("/").map(encodeURIComponent).join("/")}`);
}

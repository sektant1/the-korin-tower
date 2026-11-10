// .vimrc simplificado: só mapeamentos e `set theme=...`.
export interface VimMapping {
  lhs: string;
  rhs: string;
  context: "normal" | "insert" | "visual" | undefined; // undefined = todos
  noremap: boolean;
}

export interface ParsedVimrc {
  mappings: VimMapping[];
  options: Record<string, string>;
  errors: string[];
}

const MAP_RE = /^(n|i|v|x)?(nore)?map\s+(\S+)\s+(.+)$/;
const CONTEXT = { n: "normal", i: "insert", v: "visual", x: "visual" } as const;

export function parseVimrc(text: string): ParsedVimrc {
  const out: ParsedVimrc = { mappings: [], options: {}, errors: [] };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('"')) return;
    const m = MAP_RE.exec(line);
    if (m) {
      out.mappings.push({
        context: m[1] ? CONTEXT[m[1] as keyof typeof CONTEXT] : undefined,
        noremap: Boolean(m[2]),
        lhs: m[3],
        rhs: m[4].trim(),
      });
      return;
    }
    const s = /^set\s+(\w+)=(\S+)$/.exec(line);
    if (s) {
      out.options[s[1]] = s[2];
      return;
    }
    out.errors.push(`linha ${i + 1}: não entendi "${line}" (suportado: [n|i|v]map, [n|i|v]noremap, set opção=valor)`);
  });
  return out;
}

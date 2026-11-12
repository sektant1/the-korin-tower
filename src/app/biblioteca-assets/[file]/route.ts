import { readFile } from "node:fs/promises";
import path from "node:path";
import { LIBRARY_DIR } from "@/lib/biblioteca/load";

// Serve biblioteca/assets/<file> (imagens dos posts; no Markdown, `./assets/x.png`).
const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const type = TYPES[path.extname(file).toLowerCase()];
  // Nome simples apenas: nada de "..", barras ou caminhos absolutos.
  if (!type || !/^[\w.-]+$/.test(file) || file.startsWith(".")) return new Response("não encontrado", { status: 404 });
  try {
    const data = await readFile(path.join(LIBRARY_DIR, "assets", file));
    return new Response(data, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=3600",
        // SVG pode conter <script>: bloqueia qualquer execução.
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("não encontrado", { status: 404 });
  }
}

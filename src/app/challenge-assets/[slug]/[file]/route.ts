import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

// Serve challenges/<cat>/<slug>/assets/<file> (imagens do enunciado).
const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await ctx.params;
  const type = TYPES[path.extname(file).toLowerCase()];
  // Nome simples apenas: nada de "..", barras ou caminhos absolutos.
  if (!type || !/^[\w.-]+$/.test(file) || file.startsWith(".")) return new Response("não encontrado", { status: 404 });

  const c = await prisma.challenge.findUnique({ where: { slug }, select: { sourceDir: true } });
  if (!c?.sourceDir) return new Response("não encontrado", { status: 404 });
  try {
    const data = await readFile(path.join(process.cwd(), c.sourceDir, "assets", file));
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

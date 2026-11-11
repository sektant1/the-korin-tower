import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// A CLI é um único arquivo Node sem dependências; o próprio site o distribui
// (veja /cli). O fonte mora em cli/korin.mjs e entra na função pelo
// outputFileTracingIncludes do next.config.ts.
export async function GET() {
  const src = await readFile(path.join(process.cwd(), "cli", "korin.mjs"), "utf8");
  return new NextResponse(src, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'inline; filename="korin.mjs"',
      "cache-control": "public, max-age=300",
    },
  });
}

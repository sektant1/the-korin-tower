import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";

// `curl -fsSL <site>/install.sh | bash`: o script sai daqui com a URL do próprio site.
export async function GET() {
  const [src, url] = await Promise.all([readFile(path.join(process.cwd(), "cli", "install.sh"), "utf8"), siteUrl()]);
  return new NextResponse(src.replaceAll("__KORIN_URL__", url), {
    headers: { "content-type": "text/x-shellscript; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}

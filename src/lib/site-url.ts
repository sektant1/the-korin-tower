import "server-only";
import { headers } from "next/headers";

/**
 * URL pública do site, sem barra no fim: APP_URL quando definida; senão o host
 * da requisição (na Vercel vem em x-forwarded-host/proto). Para links que o
 * usuário copia para fora do navegador (comando `korin login`, por exemplo).
 */
export async function siteUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

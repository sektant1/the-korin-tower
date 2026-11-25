import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import type { IoTestCase } from "@/lib/runner/types";

// Todos os testes, para o navegador julgar o :submit de Python (Pyodide).
// Ocultos inclusive, com a saída esperada: eles só rodam no :submit, mas não
// são segredo (o painel mostra entrada e saídas de todos).
// C, C++ e Rust não usam esta rota: o servidor roda os testes deles.
// É público e igual para todo mundo, então a CDN guarda a resposta.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const c = await getChallenge(slug);
  if (!c || !c.languages.includes("python")) return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  const tests: IoTestCase[] = c.tests.map((t) => ({ name: t.name, input: t.input, expected: t.expected, hidden: t.hidden }));
  return NextResponse.json(
    { tests, driver: c.drivers.python ?? null },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

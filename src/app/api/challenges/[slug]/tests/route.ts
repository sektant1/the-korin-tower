import { NextResponse } from "next/server";
import { getChallenge } from "@/lib/challenges";
import { outputSha256 } from "@/lib/judge/hash";
import type { JudgeTest } from "@/lib/judge/judge";
import { submitVerify } from "@/lib/submit-mode";

// Todos os testes do desafio para o navegador julgar o :submit sozinho (sem
// servidor de execução). Os ocultos vêm só com a entrada e o SHA-256 da saída
// esperada; no checker ppm (comparação com tolerância) não há como usar hash e
// a imagem esperada vai junto. É público e igual para todo mundo, então a CDN
// guarda a resposta: quase nunca chega a rodar a função.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (submitVerify() === "server") return NextResponse.json({ error: "este servidor confere os testes ocultos" }, { status: 404 });
  const { slug } = await ctx.params;
  const c = await getChallenge(slug);
  if (!c || c.kind !== "stdio") return NextResponse.json({ error: "desafio não encontrado" }, { status: 404 });
  const tests: JudgeTest[] = await Promise.all(
    c.tests.map(async (t) =>
      !t.hidden || c.checker.type === "ppm"
        ? { name: t.name, input: t.input, expected: t.expected, hidden: t.hidden }
        : { name: t.name, input: t.input, expected: "", hidden: true, expectedSha256: await outputSha256(t.expected) },
    ),
  );
  return NextResponse.json(
    { tests },
    { headers: { "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

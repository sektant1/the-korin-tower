import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlameTitle, Window } from "@/components/Retro";
import { requireAdmin } from "@/lib/auth/session";
import { getChallenge, listCategories } from "@/lib/challenges";
import { deleteChallenge } from "../../actions";
import { ChallengeForm } from "../ChallengeForm";

export const metadata: Metadata = { title: "Editar desafio", robots: { index: false } };

export default async function EditChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const [c, categories] = await Promise.all([getChallenge(slug), listCategories()]);
  if (!c) notFound();

  return (
    <>
      <FlameTitle>EDITAR DESAFIO</FlameTitle>
      <p>
        <Link href="/admin">« voltar ao painel</Link>
      </p>
      {c.sourceDir ? (
        <Window title="somente leitura">
          <p>
            Este desafio vem de <code>{c.sourceDir}</code>. Edite os arquivos no repositório e rode <code>npm run seed</code>; mudanças feitas
            aqui seriam desfeitas no próximo seed.
          </p>
        </Window>
      ) : (
        <>
          <Window title={`${c.slug}.txt`}>
            <ChallengeForm
              categories={categories}
              initial={{
                originalSlug: c.slug,
                slug: c.slug,
                title: c.title,
                category: c.categoryId,
                difficulty: c.difficulty,
                kind: c.kind,
                languages: c.languages,
                tags: c.tags.join(", "),
                checker: c.checker.type,
                tolerance: c.checker.type === "ppm" ? c.checker.tolerance : 2,
                maxBadRatio: c.checker.type === "ppm" ? c.checker.maxBadRatio : 0.005,
                timeLimitMs: c.timeLimitMs,
                memoryLimitMb: c.memoryLimitMb,
                order: c.order,
                statement: c.statement,
                notes: c.notes ?? "",
                hints: c.hints,
                templates: c.templates,
                solutions: c.solutions,
                tests: c.tests.map((t) => ({ name: t.name, input: t.input, expected: t.expected, hidden: t.hidden })),
              }}
            />
          </Window>
          <Window title="Zona de perigo">
            <form action={deleteChallenge.bind(null, c.slug)} className="admin-inline">
              <label className="check98">
                <input type="checkbox" name="confirm" required /> Confirmo: apagar o desafio e o progresso/rascunhos de todos nele
              </label>
              <button type="submit" className="btn98">
                Apagar desafio
              </button>
            </form>
          </Window>
        </>
      )}
    </>
  );
}

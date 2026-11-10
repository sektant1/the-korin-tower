import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Difficulty } from "@/components/Retro";
import { ChallengeWorkspace } from "@/components/workspace/ChallengeWorkspace";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { LANGUAGES } from "@/lib/languages";
import { renderMarkdown } from "@/lib/markdown";
import { getChallengeProgress } from "@/lib/progress";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await getChallenge((await params).slug);
  return { title: c?.title ?? "Desafio" };
}

export default async function ChallengePage({ params }: Params) {
  const { slug } = await params;
  const c = await getChallenge(slug);
  if (!c) notFound();

  const user = await getCurrentUser();
  const [statement, notes, saved] = await Promise.all([
    renderMarkdown(c.statement, c.slug),
    c.notes ? renderMarkdown(c.notes, c.slug) : null,
    user ? getChallengeProgress(user.id, c.id) : null,
  ]);
  const publicTests = c.tests.filter((t) => !t.hidden);
  const hiddenCount = c.tests.length - publicTests.length;

  return (
    <div className="challenge-page">
      <article className="statement window98" aria-labelledby="ch-title">
        <div className="title-bar">
          <span>{c.category.name}.txt</span>
        </div>
        <div className="window-body">
          <nav className="crumbs" aria-label="Você está em">
            <Link href="/desafios">Desafios</Link> » <Link href={`/categoria/${c.category.id}`}>{c.category.name}</Link>
          </nav>
          <h1 id="ch-title" className="ch-title">
            {c.title}
          </h1>
          <p className="ch-meta">
            <Difficulty level={c.difficulty} /> · {c.languages.map((l) => LANGUAGES[l].label).join(" / ")}
            {c.kind === "stdio" && (
              <>
                {" "}
                · tempo: {c.timeLimitMs} ms · memória: {c.memoryLimitMb} MB · {publicTests.length} teste(s) público(s), {hiddenCount} oculto(s)
              </>
            )}
          </p>
          <p className="tags">
            {c.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </p>
          <div className="markdown" dangerouslySetInnerHTML={{ __html: statement }} />

          {publicTests.length > 0 && (
            <details className="public-tests">
              <summary>Testes públicos ({publicTests.length})</summary>
              {publicTests.map((t) => (
                <div key={t.id} className="sample">
                  <b>{t.name}</b>
                  <div className="sample-io">
                    <div>
                      <div className="io-label">entrada</div>
                      <pre className="code-block">{t.input.length > 1500 ? t.input.slice(0, 1500) + "\n…" : t.input}</pre>
                    </div>
                    <div>
                      <div className="io-label">saida esperada</div>
                      <pre className="code-block">{t.expected.length > 1500 ? t.expected.slice(0, 1500) + "\n…" : t.expected}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </details>
          )}

          {notes && (
            <details className="teacher-notes">
              <summary>Notas do professor (spoilers!)</summary>
              <div className="markdown" dangerouslySetInnerHTML={{ __html: notes }} />
            </details>
          )}
        </div>
      </article>

      <ChallengeWorkspace
        slug={c.slug}
        kind={c.kind}
        languages={c.languages}
        templates={c.templates}
        checker={c.checker.type}
        hintsTotal={c.hints.length}
        hasSolution={Object.keys(c.solutions).length > 0}
        defaultStdin={publicTests[0]?.input ?? ""}
        saved={saved && { drafts: saved.drafts, hintsRevealed: saved.hintsRevealed }}
      />
    </div>
  );
}

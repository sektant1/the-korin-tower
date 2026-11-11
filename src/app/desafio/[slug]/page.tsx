import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { PostList } from "@/components/PostList";
import { Difficulty } from "@/components/Retro";
import { ChallengeWorkspace } from "@/components/workspace/ChallengeWorkspace";
import { getCurrentUser } from "@/lib/auth/session";
import { getChallenge } from "@/lib/challenges";
import { getDaily } from "@/lib/daily";
import { LANGUAGES } from "@/lib/languages";
import { renderMarkdown } from "@/lib/markdown";
import { getChallengeProgress } from "@/lib/progress";
import { getRecords, type RecordRow } from "@/lib/records";
import { DAILY_BONUS } from "@/lib/scoring";
import { COMMENT_MAX, listComments } from "@/lib/social";
import { addComment, deleteComment } from "./actions";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await getChallenge((await params).slug);
  return { title: c?.title ?? "Desafio" };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const clip = (s: string) => (s.length > 1500 ? s.slice(0, 1500) + "\n…" : s || "(vazia)");

function RecordTable({ title, unit, rows }: { title: string; unit: string; rows: RecordRow[] }) {
  return (
    <table className="table98 records">
      <caption>{title}</caption>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.username}>
            <td className="num">{i + 1}º</td>
            <td>
              <Link href={`/jogador/${r.username}`}>{r.username}</Link>
            </td>
            <td>{LANGUAGES[r.language].label}</td>
            <td className="num">
              {r.value} {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ChallengePage({ params }: Params) {
  const { slug } = await params;
  const c = await getChallenge(slug);
  if (!c) notFound();

  const user = await getCurrentUser();
  const [statement, notes, saved, comments, records, daily] = await Promise.all([
    renderMarkdown(c.statement, c.slug),
    c.notes ? renderMarkdown(c.notes, c.slug) : null,
    user ? getChallengeProgress(user.id, c.id) : null,
    listComments(user, c.id),
    c.kind === "stdio" ? getRecords(c.id) : null,
    getDaily(),
  ]);
  const isDaily = daily?.challengeId === c.id;
  const publicTests = c.tests.filter((t) => !t.hidden);
  const hiddenCount = c.tests.length - publicTests.length;

  return (
    <div className="challenge-page">
      <article className="statement window98" aria-labelledby="ch-title">
        <div className="title-bar">
          <span>enunciado.txt</span>
        </div>
        <div className="window-body">
          <nav className="crumbs" aria-label="Você está em">
            <Link href="/desafios">Desafios</Link> » <Link href={`/categoria/${c.category.id}`}>{c.category.name}</Link>
          </nav>
          {/* Só no celular: o enunciado fica empilhado acima do editor. */}
          <a href="#editor" className="btn98 small mobile-only">
            ↓ Ir para o editor
          </a>
          <h1 id="ch-title" className="ch-title">
            {c.title}
          </h1>
          <p className="ch-meta">
            <Difficulty level={c.difficulty} /> · {c.languages.map((l) => LANGUAGES[l].label).join(" / ")}
            {c.kind === "stdio" && (
              <>
                {" "}
                · {c.timeLimitMs} ms · {c.memoryLimitMb} MB · {plural(publicTests.length, "teste público", "testes públicos")},{" "}
                {plural(hiddenCount, "oculto", "ocultos")}
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
          {isDaily && (
            <p className="daily-flag">
              Desafio do dia: resolvido hoje vale +{DAILY_BONUS * 100}%{user ? "" : " para quem tem conta"}.
            </p>
          )}
          <div className="markdown" dangerouslySetInnerHTML={{ __html: statement }} />

          {publicTests.length > 0 && (
            <details className="samples" open>
              <summary>Exemplos ({publicTests.length})</summary>
              {publicTests.map((t, i) => (
                <div key={t.id} className="sample">
                  <div className="sample-head">
                    <b>Exemplo {i + 1}</b>
                    <span className="dim">{t.name}</span>
                  </div>
                  <div className="io-label">entrada</div>
                  <pre className="sample-pre">{clip(t.input)}</pre>
                  <div className="io-label">saída esperada</div>
                  <pre className="sample-pre">{clip(t.expected)}</pre>
                </div>
              ))}
            </details>
          )}

          {notes && (
            <details className="teacher-notes">
              <summary>Notas do professor (spoiler)</summary>
              <div className="markdown" dangerouslySetInnerHTML={{ __html: notes }} />
            </details>
          )}

          {records && (
            <details className="teacher-notes">
              <summary>Recordes ({records.shortest.length ? `menor código: ${records.shortest[0].value} bytes` : "ninguém ainda"})</summary>
              {records.shortest.length === 0 ? (
                <p className="dim">Ninguém resolveu com conta ainda.</p>
              ) : (
                <div className="sample-io">
                  <RecordTable title="Menor código" unit="bytes" rows={records.shortest} />
                  {records.fastest.length > 0 && <RecordTable title="Mais rápido (pior teste)" unit="ms" rows={records.fastest} />}
                </div>
              )}
              <p className="dim small">Vale o último código aprovado de cada jogador em cada linguagem.</p>
            </details>
          )}

          <details className="teacher-notes" id="comentarios">
            <summary>Comentários ({comments.length})</summary>
            <PostList posts={comments} onDelete={deleteComment} empty="Ninguém comentou ainda." />
            {user ? (
              <PostForm
                action={addComment}
                hidden={{ slug: c.slug }}
                label="Seu comentário:"
                placeholder="Dúvida, dica ou comentário. Spoiler entre ||barras||."
                max={COMMENT_MAX}
                submit="Comentar"
              />
            ) : (
              <p>
                <Link href={`/entrar?next=/desafio/${c.slug}`}>Entre</Link> para comentar.
              </p>
            )}
          </details>
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

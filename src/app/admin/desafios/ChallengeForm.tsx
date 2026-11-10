"use client";
import { startTransition, useActionState, useState } from "react";
import type { ChallengeInput } from "@/lib/admin-challenges";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { saveChallenge } from "../actions";

const STDIO_LANGS = (Object.keys(LANGUAGES) as LanguageId[]).filter((l) => l !== "glsl");

export function ChallengeForm({ initial, categories }: { initial: ChallengeInput; categories: { id: string; name: string }[] }) {
  const [v, setV] = useState(initial);
  const [state, dispatch, pending] = useActionState(saveChallenge, undefined);
  const set = <K extends keyof ChallengeInput>(k: K, value: ChallengeInput[K]) => setV((s) => ({ ...s, [k]: value }));
  const langs = v.kind === "shader" ? (["glsl"] as LanguageId[]) : STDIO_LANGS;

  const setKind = (kind: ChallengeInput["kind"]) =>
    setV((s) => ({ ...s, kind, languages: kind === "shader" ? ["glsl"] : s.languages.filter((l) => l !== "glsl") }));
  const toggleLang = (l: LanguageId, on: boolean) =>
    set("languages", on ? [...v.languages, l] : v.languages.filter((x) => x !== l));
  const setCode = (field: "templates" | "solutions", l: LanguageId, code: string) => set(field, { ...v[field], [l]: code });
  const setTest = (i: number, patch: Partial<ChallengeInput["tests"][number]>) =>
    set("tests", v.tests.map((t, k) => (k === i ? { ...t, ...patch } : t)));

  return (
    <form
      className="settings admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => dispatch(v));
      }}
    >
      <fieldset className="fieldset98">
        <legend>Básico</legend>
        <label>
          Título <input className="input98" value={v.title} onChange={(e) => set("title", e.target.value)} required />
        </label>
        <label>
          Slug{" "}
          <input
            className="input98"
            value={v.slug}
            onChange={(e) => set("slug", e.target.value.toLowerCase())}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            aria-describedby="slug-help"
          />
        </label>
        <p id="slug-help" className="dim small">
          Vai na URL: /desafio/<b>{v.slug || "meu-desafio"}</b>. Só a-z, 0-9 e hífens.
        </p>
        <label>
          Categoria{" "}
          <select className="select98" value={v.category} onChange={(e) => set("category", e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dificuldade{" "}
          <select className="select98" value={v.difficulty} onChange={(e) => set("difficulty", Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n * 100} pts)
              </option>
            ))}
          </select>
        </label>
        <label>
          Tags (vírgula) <input className="input98" value={v.tags} onChange={(e) => set("tags", e.target.value)} placeholder="ponteiros, parsing" />
        </label>
        <label>
          Ordem na categoria{" "}
          <input className="input98 narrow" type="number" value={v.order} onChange={(e) => set("order", Number(e.target.value))} />
        </label>
      </fieldset>

      <fieldset className="fieldset98">
        <legend>Execução</legend>
        <label>
          Tipo{" "}
          <select className="select98" value={v.kind} onChange={(e) => setKind(e.target.value as ChallengeInput["kind"])}>
            <option value="stdio">stdio (compila no servidor, testes de entrada/saída)</option>
            <option value="shader">shader (GLSL no navegador, sem testes)</option>
          </select>
        </label>
        {v.kind === "stdio" && (
          <>
            <div role="group" aria-label="Linguagens" className="admin-inline">
              Linguagens:
              {langs.map((l) => (
                <label key={l} className="check98">
                  <input type="checkbox" checked={v.languages.includes(l)} onChange={(e) => toggleLang(l, e.target.checked)} />{" "}
                  {LANGUAGES[l].label}
                </label>
              ))}
            </div>
            <label>
              Tempo (ms){" "}
              <input className="input98 narrow" type="number" min={1} max={10000} value={v.timeLimitMs} onChange={(e) => set("timeLimitMs", Number(e.target.value))} />
            </label>
            <label>
              Memória (MB){" "}
              <input className="input98 narrow" type="number" min={1} max={512} value={v.memoryLimitMb} onChange={(e) => set("memoryLimitMb", Number(e.target.value))} />
            </label>
            <label>
              Correção{" "}
              <select className="select98" value={v.checker} onChange={(e) => set("checker", e.target.value as ChallengeInput["checker"])}>
                <option value="exact">exata (ignora espaços no fim e CRLF)</option>
                <option value="ppm">imagem PPM (pixel a pixel)</option>
              </select>
            </label>
            {v.checker === "ppm" && (
              <>
                <label>
                  Tolerância por canal (0–255){" "}
                  <input className="input98 narrow" type="number" min={0} max={255} value={v.tolerance} onChange={(e) => set("tolerance", Number(e.target.value))} />
                </label>
                <label>
                  Proporção máx. de pixels errados (0–1){" "}
                  <input className="input98 narrow" type="number" min={0} max={1} step={0.001} value={v.maxBadRatio} onChange={(e) => set("maxBadRatio", Number(e.target.value))} />
                </label>
              </>
            )}
          </>
        )}
      </fieldset>

      <fieldset className="fieldset98">
        <legend>Textos (Markdown + KaTeX)</legend>
        <label className="block" htmlFor="ch-statement">
          Enunciado
        </label>
        <textarea id="ch-statement" className="stdin98" rows={12} value={v.statement} onChange={(e) => set("statement", e.target.value)} required />
        <label className="block" htmlFor="ch-notes">
          Notas do professor (opcional, aparecem como spoiler)
        </label>
        <textarea id="ch-notes" className="stdin98" rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
        <p className="block">Dicas (reveladas uma por vez; cada uma tira 20% dos pontos)</p>
        {v.hints.map((h, i) => (
          <div key={i} className="admin-row">
            <textarea
              className="stdin98"
              rows={2}
              aria-label={`Dica ${i + 1}`}
              value={h}
              onChange={(e) => set("hints", v.hints.map((x, k) => (k === i ? e.target.value : x)))}
            />
            <button type="button" className="btn98 small" onClick={() => set("hints", v.hints.filter((_, k) => k !== i))}>
              Remover
            </button>
          </div>
        ))}
        <button type="button" className="btn98 small" onClick={() => set("hints", [...v.hints, ""])}>
          + Dica
        </button>
      </fieldset>

      <fieldset className="fieldset98">
        <legend>Código</legend>
        {v.languages.length === 0 && <p className="out-warn">(!) Escolha ao menos uma linguagem.</p>}
        {v.languages.map((l) => (
          <details key={l} open>
            <summary>{LANGUAGES[l].label}</summary>
            <label className="block" htmlFor={`tpl-${l}`}>
              Template ({LANGUAGES[l].file})
            </label>
            <textarea
              id={`tpl-${l}`}
              className="stdin98 mono"
              rows={8}
              spellCheck={false}
              value={v.templates[l] ?? ""}
              onChange={(e) => setCode("templates", l, e.target.value)}
            />
            <label className="block" htmlFor={`sol-${l}`}>
              Solução de referência (opcional)
            </label>
            <textarea
              id={`sol-${l}`}
              className="stdin98 mono"
              rows={8}
              spellCheck={false}
              value={v.solutions[l] ?? ""}
              onChange={(e) => setCode("solutions", l, e.target.value)}
            />
          </details>
        ))}
      </fieldset>

      {v.kind === "stdio" && (
        <fieldset className="fieldset98">
          <legend>Testes ({v.tests.length})</legend>
          {v.tests.map((t, i) => (
            <div key={i} className="admin-test">
              <div className="admin-inline">
                <label>
                  Nome <input className="input98 narrow" value={t.name} onChange={(e) => setTest(i, { name: e.target.value })} required />
                </label>
                <label className="check98">
                  <input type="checkbox" checked={t.hidden} onChange={(e) => setTest(i, { hidden: e.target.checked })} /> oculto
                </label>
                <button type="button" className="btn98 small" onClick={() => set("tests", v.tests.filter((_, k) => k !== i))}>
                  Remover
                </button>
              </div>
              <div className="sample-io">
                <textarea
                  className="stdin98 mono"
                  rows={4}
                  spellCheck={false}
                  aria-label={`Entrada do teste ${t.name || i + 1}`}
                  placeholder="entrada (stdin)"
                  value={t.input}
                  onChange={(e) => setTest(i, { input: e.target.value })}
                />
                <textarea
                  className="stdin98 mono"
                  rows={4}
                  spellCheck={false}
                  aria-label={`Saída esperada do teste ${t.name || i + 1}`}
                  placeholder="saída esperada"
                  value={t.expected}
                  onChange={(e) => setTest(i, { expected: e.target.value })}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn98 small"
            onClick={() => set("tests", [...v.tests, { name: String(v.tests.length + 1).padStart(2, "0"), input: "", expected: "", hidden: v.tests.length > 0 }])}
          >
            + Teste
          </button>
        </fieldset>
      )}

      {state?.error && (
        <p className="out-warn" role="alert">
          (!) {state.error}
        </p>
      )}
      <p className="admin-inline">
        <button type="submit" className="btn98 primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar desafio"}
        </button>
        {initial.originalSlug && (
          <a href={`/desafio/${initial.originalSlug}`} className="btn98">
            Ver página
          </a>
        )}
      </p>
    </form>
  );
}

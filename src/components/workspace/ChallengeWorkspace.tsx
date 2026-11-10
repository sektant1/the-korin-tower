"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearDraft,
  loadDraft,
  loadHintsRevealed,
  saveDraft,
  saveHintsRevealed,
  setProgress,
  updateSettings,
  useSettings,
  type EditorTheme,
} from "@/lib/client/store";
import { LANGUAGES, type ChallengeKind, type LanguageId } from "@/lib/languages";
import type { RunResponse } from "@/lib/run-api";
import { GIFS } from "@/lib/gifs";
import { useAccount, useProgressMap } from "../Account";
import { Gif } from "../Gif";
import { CodeEditor, type CodeEditorHandle, type EditorCommands } from "./CodeEditor";
import { OutputPanel, type OutputState } from "./OutputPanel";
import { ShaderCanvas, type ShaderError } from "./ShaderCanvas";

interface Props {
  slug: string;
  kind: ChallengeKind;
  languages: LanguageId[];
  templates: Partial<Record<LanguageId, string>>;
  checker: "exact" | "ppm";
  hintsTotal: number;
  hasSolution: boolean;
  defaultStdin: string;
  /** Com login: o que está salvo na conta. Sem login: null (usa o localStorage). */
  saved: { drafts: Partial<Record<LanguageId, string>>; hintsRevealed: number } | null;
}

type Mode = "run" | "test" | "submit";
const MODE_LABEL: Record<Mode, string> = {
  run: "compilando e executando...",
  test: "rodando testes públicos...",
  submit: "rodando TODOS os testes (públicos + ocultos)...",
};

export function ChallengeWorkspace(p: Props) {
  const router = useRouter();
  const [settings] = useSettings();
  const account = useAccount();
  const logged = p.saved !== null && account !== null;
  const progress = useProgressMap();
  // Rascunhos da conta em memória (atualizados a cada save), para trocar de linguagem sem ir ao servidor.
  const accountDrafts = useRef<Partial<Record<LanguageId, string>>>({ ...p.saved?.drafts });
  const editor = useRef<CodeEditorHandle>(null);
  const [lang, setLang] = useState<LanguageId>(p.languages[0]);
  const [initialCode] = useState(() => p.templates[p.languages[0]] ?? "");
  const [stdin, setStdin] = useState(p.defaultStdin);
  const [output, setOutput] = useState<OutputState>({ status: "idle" });
  const [message, setMessage] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [solution, setSolution] = useState<Partial<Record<LanguageId, string>> | null>(null);
  const [confirm, setConfirm] = useState<null | "giveup" | "reset">(null);
  const [shader, setShader] = useState({ source: initialCode, version: 0 });
  const [shaderErrors, setShaderErrors] = useState<ShaderError[]>([]);
  const [tab, setTab] = useState<"out" | "hints" | "sol">("out");
  const stdinRef = useRef<HTMLTextAreaElement>(null);
  const busy = output.status === "running";
  const status = progress[p.slug];
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage((m) => (m === msg ? "" : m)), 4000);
  }, []);

  // Restaura rascunho e dicas já reveladas: da conta, ou do localStorage (só existe no cliente).
  // Logado sem rascunho na conta, aproveita o que ficou neste navegador de antes do login.
  useEffect(() => {
    const draft = accountDrafts.current[p.languages[0]] ?? loadDraft(p.slug, p.languages[0]);
    if (draft != null && draft !== initialCode) {
      editor.current?.setValue(draft);
      if (p.kind === "shader") setShader({ source: draft, version: 1 });
      flash(logged ? "rascunho da conta restaurado" : "rascunho restaurado");
    }
    const n = Math.min(p.saved ? p.saved.hintsRevealed : loadHintsRevealed(p.slug), p.hintsTotal);
    if (n > 0) {
      Promise.all(Array.from({ length: n }, (_, i) => fetch(`/api/challenges/${p.slug}/hints/${i}`, { method: "POST" }).then((r) => r.json())))
        .then((rs) => setHints(rs.map((r) => r.html)))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    (explicit: boolean) => {
      const code = editor.current?.getValue() ?? "";
      const file = LANGUAGES[lang].file;
      if (!logged) {
        const ok = saveDraft(p.slug, lang, code);
        if (explicit) flash(ok ? `"${file}" salvo (rascunho local)` : "E212: não foi possível salvar (storage bloqueado)");
        return;
      }
      if (accountDrafts.current[lang] === code && !explicit) return;
      accountDrafts.current[lang] = code;
      // keepalive: o save do :q sobrevive à troca de página (o navegador limita o corpo a 64 KB).
      fetch(`/api/challenges/${p.slug}/draft`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: lang, code }),
        keepalive: code.length < 60_000,
      })
        .then(async (r) => {
          if (r.ok) {
            if (explicit) flash(`"${file}" salvo na conta`);
          } else flash(`E212: não salvou na conta (${(await r.json().catch(() => ({}))).error ?? r.status})`);
        })
        .catch(() => flash("E212: sem conexão; rascunho não salvo"));
    },
    [p.slug, lang, flash, logged],
  );

  const onChange = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(false), 800);
  }, [save]);

  const execute = useCallback(
    async (mode: Mode) => {
      setTab("out");
      if (p.kind === "shader") {
        if (mode === "run") setShader((s) => ({ source: editor.current?.getValue() ?? s.source, version: s.version + 1 }));
        else flash("desafio de shader: sem testes automáticos, use :run");
        return;
      }
      if (busy) return;
      save(false);
      setOutput({ status: "running", label: MODE_LABEL[mode] });
      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug: p.slug,
            language: lang,
            source: editor.current?.getValue() ?? "",
            stdin: mode === "run" ? stdin : undefined,
            mode,
            flags: lang === "c" || lang === "cpp" ? settings.flags[lang] : undefined,
          }),
        });
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) {
          setOutput({ status: "error", error: body.error ?? `HTTP ${res.status}` });
          return;
        }
        const r = body as RunResponse;
        setOutput({ status: "done", response: r });
        if (r.mode === "submit" && r.allPassed) {
          if (r.awarded === undefined) {
            setProgress(p.slug, "solved");
            flash("★ STAGE CLEAR ★ entre na sua conta para pontuar e ver a solução");
          } else {
            router.refresh(); // traz o progresso novo do banco (badges, placar)
            flash(r.awarded > 0 ? `★ STAGE CLEAR ★ +${r.awarded} pontos! solução liberada` : "★ STAGE CLEAR ★ (sem pontos novos) solução liberada");
          }
        }
      } catch (e) {
        setOutput({ status: "error", error: `falha de rede: ${(e as Error).message}` });
      }
    },
    [busy, flash, lang, p.kind, p.slug, router, save, settings.flags, stdin],
  );

  const nextHint = useCallback(async () => {
    if (hints.length >= p.hintsTotal) {
      flash(p.hintsTotal ? "acabaram os cheat codes!" : "este desafio não tem dicas");
      return;
    }
    const r = await fetch(`/api/challenges/${p.slug}/hints/${hints.length}`, { method: "POST" });
    if (!r.ok) return flash("não consegui buscar a dica");
    const { html } = await r.json();
    setTab("hints");
    setHints((h) => {
      if (!logged) saveHintsRevealed(p.slug, h.length + 1);
      return [...h, html];
    });
  }, [flash, hints.length, logged, p.hintsTotal, p.slug]);

  const loadSolution = useCallback(async () => {
    const r = await fetch(`/api/challenges/${p.slug}/solution`);
    if (r.ok) setSolution((await r.json()).solutions);
  }, [p.slug]);

  // A solução só sai do servidor para quem está logado e resolveu ou desistiu.
  useEffect(() => {
    if (logged && status && !solution && p.hasSolution) void loadSolution();
  }, [logged, status, solution, p.hasSolution, loadSolution]);

  const commands: EditorCommands = useMemo(
    () => ({
      save: () => save(true),
      run: () => void execute("run"),
      test: () => void execute("test"),
      submit: () => void execute("submit"),
      quit: () => {
        save(false);
        router.push("/desafios");
      },
      hint: () => void nextHint(),
      stdin: () => {
        setTab("out");
        setTimeout(() => stdinRef.current?.focus());
      },
      output: () => setTab("out"),
      setTheme: (t: EditorTheme) => updateSettings({ editorTheme: t }),
    }),
    [execute, nextHint, router, save],
  );

  const switchLang = (next: LanguageId) => {
    save(false);
    setLang(next);
    const draft = logged ? accountDrafts.current[next] : loadDraft(p.slug, next);
    editor.current?.setValue(draft ?? p.templates[next] ?? "");
  };

  const doConfirm = async () => {
    setConfirm(null);
    if (confirm === "giveup") {
      const r = await fetch(`/api/challenges/${p.slug}/giveup`, { method: "POST" });
      if (!r.ok) return flash("não consegui registrar a desistência");
      router.refresh();
      await loadSolution();
      setTab("sol");
    } else if (confirm === "reset") {
      if (logged) {
        delete accountDrafts.current[lang];
        void fetch(`/api/challenges/${p.slug}/draft?language=${lang}`, { method: "DELETE" });
      } else clearDraft(p.slug, lang);
      editor.current?.setValue(p.templates[lang] ?? "");
      flash("template restaurado");
    }
  };

  const jump = useCallback((line: number, col: number) => editor.current?.gotoLine(line, col), []);

  const fkeys = [
    { cmd: ":w", label: "Salvar", run: commands.save },
    { cmd: ":run", label: "Executar", run: commands.run },
    ...(p.kind === "stdio"
      ? [
          { cmd: ":test", label: "Testar", run: commands.test },
          { cmd: ":submit", label: "Enviar", run: commands.submit },
          { cmd: ":stdin", label: "Entrada", run: commands.stdin },
        ]
      : []),
    { cmd: ":hint", label: "Dica", run: commands.hint },
    { cmd: ":out", label: "Saída", run: commands.output },
    { cmd: ":q", label: "Sair", run: commands.quit },
  ];

  const tabs = [
    { id: "out", label: p.kind === "shader" ? "Canvas" : "Saída" },
    { id: "hints", label: `Cheat codes ${hints.length}/${p.hintsTotal}` },
    { id: "sol", label: "Solução" },
  ] as const;

  return (
    <div className="workspace">
      <div className="ws-editor">
        <div className="toolbar98" role="toolbar" aria-label="Ações do editor">
          {p.languages.length > 1 && (
            <label>
              Linguagem{" "}
              <select value={lang} onChange={(e) => switchLang(e.target.value as LanguageId)} className="select98">
                {p.languages.map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGES[l].label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn98" onClick={() => execute("run")} disabled={busy} title=":run">
            ▶ Executar
          </button>
          {p.kind === "stdio" && (
            <>
              <button type="button" className="btn98" onClick={() => execute("test")} disabled={busy} title=":test">
                Testar
              </button>
              <button type="button" className="btn98 primary" onClick={() => execute("submit")} disabled={busy} title=":submit">
                Enviar
              </button>
            </>
          )}
          <button type="button" className="btn98" onClick={() => nextHint()} title=":hint">
            Dica
          </button>
          <label className="check98">
            <input type="checkbox" checked={settings.vim} onChange={(e) => updateSettings({ vim: e.target.checked })} /> Vim
          </label>
        </div>

        <CodeEditor
          ref={editor}
          language={lang}
          initialValue={initialCode}
          theme={settings.editorTheme}
          fontSize={settings.fontSize}
          vimEnabled={settings.vim}
          vimrc={settings.vimrc}
          commands={commands}
          message={message}
          onChange={onChange}
        />
        {/* Barra de teclas estilo editor de DOS: mostra o comando ex e também executa no clique. */}
        <div className="fkeys" role="toolbar" aria-label="Comandos do editor">
          {fkeys.map((k) => (
            <button key={k.cmd} type="button" className="fkey" onClick={k.run} title={`Digite ${k.cmd} no modo normal`}>
              <span className="fkey-cmd">{k.cmd}</span>
              <span className="fkey-label">{k.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ws-io">
        <div className="tabs98" role="tablist" aria-label="Painel de saída">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="ws-panel"
              className={tab === t.id ? "tab98 active" : "tab98"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tab-panel" role="tabpanel" id="ws-panel" aria-labelledby={`tab-${tab}`}>
          {/* A aba de saída fica montada (só escondida) para não perder canvas e resultado. */}
          <div className="tab-out" hidden={tab !== "out"}>
            {p.kind === "stdio" ? (
              <>
                <label className="stdin-label" htmlFor="stdin">
                  stdin para <b>Executar</b> <span className="dim">(Ctrl+Enter executa · Esc volta ao editor)</span>
                </label>
                <textarea
                  id="stdin"
                  ref={stdinRef}
                  className="stdin98"
                  rows={3}
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void execute("run");
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      editor.current?.focus();
                    }
                  }}
                  spellCheck={false}
                />
                <OutputPanel state={output} checker={p.checker} onJump={jump} />
              </>
            ) : (
              <>
                <ShaderCanvas source={shader.source} version={shader.version} onResult={setShaderErrors} />
                {shaderErrors.length > 0 && (
                  <div className="crt">
                    <div className="crt-inner">
                      <p className="fail">[X] ERRO NO SHADER</p>
                      <ul className="tests">
                        {shaderErrors.map((e, i) => (
                          <li key={i}>
                            {e.line ? (
                              <button type="button" className="loc-link" onClick={() => jump(e.line!, 1)}>
                                linha {e.line}
                              </button>
                            ) : null}{" "}
                            {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {tab === "hints" && (
            <div className="window-body">
              <div className="tab-gif">
                <Gif gif={GIFS.powerUp} height={64} />
              </div>
              {hints.length === 0 && (
                <p className="dim">
                  Nenhuma dica revelada. Use <kbd>:hint</kbd> só se travar!
                </p>
              )}
              <ol className="hints">
                {hints.map((h, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
                ))}
              </ol>
              {hints.length < p.hintsTotal && (
                <button type="button" className="btn98 small" onClick={() => nextHint()}>
                  Revelar próxima ({hints.length + 1}/{p.hintsTotal})
                </button>
              )}
            </div>
          )}

          {tab === "sol" && (
            <div className="window-body">
              {!p.hasSolution && <p className="dim">Este desafio ainda não tem solução de referência.</p>}
              {p.hasSolution && !logged && (
                <p>
                  [TRANCADA] A solução de referência é liberada pelo servidor para quem tem conta.{" "}
                  <a href={`/entrar?next=/desafio/${p.slug}`} className="btn98 small">
                    Entrar
                  </a>
                  {status === "solved" && <span className="dim"> Você já resolveu neste navegador; entre e envie de novo para pontuar.</span>}
                </p>
              )}
              {p.hasSolution && logged && !status && (
                <p>
                  [TRANCADA] Liberada quando você passar em todos os testes{p.kind === "shader" ? "" : " (:submit)"} ou desistir. Desistir
                  zera os pontos deste desafio.{" "}
                  <button type="button" className="btn98 small" onClick={() => setConfirm("giveup")}>
                    Desistir
                  </button>
                </p>
              )}
              {logged && status && solution && (
                <>
                  <div className="tab-gif">
                    <Gif gif={status === "solved" ? GIFS.gokuSsj : GIFS.buuBlast} height={status === "solved" ? 110 : 60} />
                  </div>
                  <p>{status === "solved" ? "★ Você resolveu! Compare com a referência:" : "Você desistiu, sem vergonha. Estude e tente de novo:"}</p>
                  {Object.entries(solution).map(([l, code]) => (
                    <details key={l} open={l === lang}>
                      <summary>{LANGUAGES[l as LanguageId].label}</summary>
                      <pre className="code-block">
                        <code>{code}</code>
                      </pre>
                    </details>
                  ))}
                </>
              )}
              <p>
                <button type="button" className="btn98 small" onClick={() => setConfirm("reset")}>
                  Comer feijão senzu (restaurar template)
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setConfirm(null)} onKeyDown={(e) => e.key === "Escape" && setConfirm(null)}>
          <div className="window98 dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <h2 className="title-bar" id="dlg-title">
              Confirmar
            </h2>
            <div className="window-body">
              <p>{confirm === "giveup" ? "Desistir e ver a solução de referência? Este desafio deixa de valer pontos." : "Comer o feijão senzu? Seu rascunho é apagado e o código volta ao template (HP cheio!)."}</p>
              <div className="dialog-actions">
                <button type="button" className="btn98 primary" onClick={doConfirm} autoFocus>
                  OK
                </button>
                <button type="button" className="btn98" onClick={() => setConfirm(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

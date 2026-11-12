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
import { LANGUAGES, isCanvasLanguage, type CanvasLanguage, type ChallengeKind, type LanguageId } from "@/lib/languages";
import { renderShaderPpm } from "@/lib/client/shader";
import { browserWasmProblem, prewarmEmception } from "@/lib/client/emception";
import { BrowserWasmRunner, PHASE_LABEL, compileStdioCached, wasmToBase64 } from "@/lib/client/wasm-run";
import { judge, type JudgeLimits, type JudgeTest, type TestOutcome } from "@/lib/judge/judge";
import { FRAME_TEST_NAME, framesOutcome } from "@/lib/judge/frames";
import { submitVerify } from "@/lib/submit-mode";
import { sanitizeFlags } from "@/lib/runner/flags";
import type { RunResponse } from "@/lib/run-api";
import { HINT_PENALTY } from "@/lib/scoring";
import { useAccount, useProgressMap } from "../Account";
import { NextStepBar } from "../Tower";
import { CodeEditor, type CodeEditorHandle, type EditorCommands } from "./CodeEditor";
import { OutputPanel, type OutputState } from "./OutputPanel";
import { SplitColumns } from "./SplitColumns";
import { ShaderCanvas } from "./ShaderCanvas";
import type { ShaderError } from "@/lib/client/shader";
import { EmceptionCanvas } from "./EmceptionCanvas";

/** Código aprovado de outro jogador (GET /api/challenges/<slug>/solutions). */
interface PlayerSolution {
  username: string;
  language: LanguageId;
  code: string;
  bytes: number;
  timeMs: number | null;
}

interface Props {
  slug: string;
  kind: ChallengeKind;
  languages: LanguageId[];
  templates: Partial<Record<LanguageId, string>>;
  checker: "exact" | "ppm";
  hintsTotal: number;
  hasSolution: boolean;
  defaultStdin: string;
  /** limites e checker do desafio: o :run/:test de C/C++ é julgado aqui no navegador */
  limits: JudgeLimits;
  /** testes públicos (já aparecem no enunciado); os ocultos só existem no servidor */
  publicTests: JudgeTest[];
  /** detonado pelo qual o jogador chegou (?trilha=), para o "próximo" seguir a ordem dele */
  trackId: string | null;
  /** Com login: o que está salvo na conta. Sem login: null (usa o localStorage). */
  saved: { drafts: Partial<Record<LanguageId, string>>; hintsRevealed: number } | null;
}

type Mode = "run" | "test" | "submit";
const MODE_LABEL: Record<Mode, string> = {
  run: "compilando e executando...",
  test: "rodando os testes públicos...",
  submit: "rodando todos os testes, públicos e ocultos...",
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
  const [others, setOthers] = useState<PlayerSolution[] | null>(null);
  const [wasm, setWasm] = useState<{ source: string; language: CanvasLanguage; version: number }>({ source: "", language: "c", version: 0 });
  const [confirm, setConfirm] = useState<null | "giveup" | "reset">(null);
  const [shader, setShader] = useState({ source: initialCode, version: 0 });
  const [shaderErrors, setShaderErrors] = useState<ShaderError[]>([]);
  const [tab, setTab] = useState<"out" | "hints" | "sol">("out");
  const stdinRef = useRef<HTMLTextAreaElement>(null);
  const busy = output.status === "running";
  const status = progress[p.slug];
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // setValue() programático (troca de linguagem, restaurar) dispara onChange; não é edição do jogador.
  const skipChange = useRef(false);

  const flash = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage((m) => (m === msg ? "" : m)), 4000);
  }, []);

  // Restaura rascunho e dicas já reveladas: da conta, ou do localStorage (só existe no cliente).
  // Logado sem rascunho na conta, aproveita o que ficou neste navegador de antes do login.
  useEffect(() => {
    const draft = accountDrafts.current[p.languages[0]] ?? loadDraft(p.slug, p.languages[0]);
    if (draft != null && draft !== initialCode) {
      setEditorText(draft);
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
        if (explicit) flash(ok ? `"${file}" salvo (rascunho local)` : "E212: não deu para salvar neste navegador");
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
    if (skipChange.current) {
      skipChange.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(false), 800);
    // Quem edita C/C++ vai compilar: sobe a toolchain já (no-op se já subiu).
    if (lang === "c" || lang === "cpp") prewarmEmception(p.kind === "stdio" ? lang : undefined); // canvas: só sobe a toolchain
  }, [save, lang, p.kind]);

  /** Troca o texto do editor sem que isso conte como edição (nem gere save na linguagem errada). */
  const setEditorText = useCallback((code: string) => {
    clearTimeout(saveTimer.current);
    skipChange.current = true;
    editor.current?.setValue(code);
    skipChange.current = false;
  }, []);

  /** Ocultos chegam sem a resposta (só o hash); no painel, nem a entrada aparece. */
  const redactHidden = (tests: TestOutcome[]) =>
    tests.map((t) => (t.hidden ? { ...t, input: "", expected: "", stdout: "", stderr: "", message: t.verdict === "AC" ? undefined : t.message } : t));

  // Mostra o resultado e, num :submit aprovado, registra (na conta ou no navegador).
  const finish = useCallback(
    async (r: Extract<RunResponse, { mode: "test" | "submit" }>, record?: () => Promise<Response>, serverJudges = false) => {
      setOutput({ status: "done", response: r });
      if (r.mode !== "submit" || !r.allPassed) return;
      // Convidado não pontua: o progresso fica no navegador, sem tocar o servidor
      // (exceto no modo "server", em que só ele pode rodar os ocultos).
      if (!record || (!logged && !serverJudges)) {
        setProgress(p.slug, "solved");
        flash("resolvido! entre na sua conta para pontuar e ver a solução");
        return;
      }
      setOutput({ status: "running", label: serverJudges ? "públicos ok; o servidor está rodando os testes ocultos..." : "aprovado! registrando na sua conta..." });
      try {
        const res = await record();
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) {
          setOutput({ status: "done", response: { ...r, warnings: [...r.warnings, `não registrou na conta: ${body.error ?? res.status}`] } });
          return;
        }
        const server = body as RunResponse;
        // Os testes que o servidor rodou (modo "server": os ocultos) se juntam aos daqui.
        const merged = server.mode === "submit" ? { ...r, tests: [...r.tests, ...server.tests], allPassed: server.allPassed, awarded: server.awarded, warnings: [...r.warnings, ...server.warnings] } : r;
        setOutput({ status: "done", response: merged });
        if (!merged.allPassed) return;
        if (merged.awarded === undefined) {
          setProgress(p.slug, "solved");
          flash("resolvido! entre na sua conta para pontuar e ver a solução");
          return;
        }
        router.refresh(); // traz o progresso novo do banco (badges, placar)
        const pts = merged.awarded ?? 0;
        flash(pts > 0 ? `resolvido! +${pts} pontos. solução liberada` : "resolvido de novo. solução liberada");
      } catch (e) {
        setOutput({ status: "done", response: { ...r, warnings: [...r.warnings, `sem conexão para registrar: ${(e as Error).message}`] } });
      }
    },
    [flash, logged, p.slug, router],
  );

  /** POST /api/run só para registrar/conferir (nunca compila nada). */
  const post = useCallback(
    (body: Record<string, unknown>) =>
      fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: p.slug, ...body }) }),
    [p.slug],
  );

  // Resposta de /api/run quando o servidor executa (Rust, ou navegador sem SharedArrayBuffer).
  const handleRunResponse = useCallback(
    async (res: Response) => {
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
          flash("resolvido! entre na sua conta para pontuar e ver a solução");
        } else {
          router.refresh();
          flash(r.awarded > 0 ? `resolvido! +${r.awarded} pontos. solução liberada` : "resolvido de novo. solução liberada");
        }
      }
    },
    [flash, p.slug, router],
  );

  /** Frames de shader/canvas: veredito aqui mesmo; o servidor só reconfere ao registrar. */
  const judgeFrames = useCallback(
    async (mode: "test" | "submit", language: LanguageId, source: string, frames: string[], compileOutput = "") => {
      let test: TestOutcome;
      try {
        test = framesOutcome(frames, FRAME_TEST_NAME[p.kind === "canvas" ? "canvas" : "shader"]);
      } catch (e) {
        return setOutput({ status: "error", error: `não deu para capturar o frame: ${(e as Error).message}` });
      }
      const r = { mode, compile: { ok: true, output: compileOutput }, tests: [test], allPassed: test.verdict === "AC", warnings: [] };
      await finish(r, () => post({ language, source, mode, frames }));
    },
    [finish, p.kind, post],
  );

  // Canvas :test/:submit: o EmceptionCanvas compila, roda e devolve os frames.
  const pendingCapture = useRef<{ mode: "test" | "submit"; language: CanvasLanguage; source: string; compileOutput: string } | null>(null);
  const [capture, setCapture] = useState(0);

  // O canvas compila no navegador; o resultado do clang/wasm-ld vira o mesmo
  // painel de compilação dos desafios stdio (avisos e erros clicáveis).
  const onWasmCompile = useCallback((r: { ok: boolean; output: string }) => {
    const pend = pendingCapture.current;
    if (!pend) {
      setOutput({ status: "done", response: { mode: "run", compile: { ok: r.ok, output: r.output }, run: null, warnings: [] } });
      return;
    }
    if (!r.ok) {
      pendingCapture.current = null;
      setOutput({ status: "done", response: { mode: pend.mode, compile: { ok: false, output: r.output }, tests: [], allPassed: false, warnings: [] } });
      return;
    }
    pend.compileOutput = r.output;
    setOutput({ status: "running", label: "rodando o programa e fotografando o canvas (3 s)..." });
  }, []);

  const onFrames = useCallback(
    (frames: string[] | null, error?: string) => {
      const pend = pendingCapture.current;
      pendingCapture.current = null;
      if (!pend) return;
      if (!frames) {
        if (error !== "não compilou") setOutput({ status: "error", error: `o programa não rodou: ${error ?? "erro desconhecido"}` });
        return;
      }
      void judgeFrames(pend.mode, pend.language, pend.source, frames, pend.compileOutput);
    },
    [judgeFrames],
  );

  const execute = useCallback(
    async (mode: Mode) => {
      setTab("out");
      if (p.kind === "shader") {
        if (mode === "run") {
          setShader((s) => ({ source: editor.current?.getValue() ?? s.source, version: s.version + 1 }));
          return;
        }
        // :test/:submit de shader: renderiza frames com iTime fixo e julga aqui.
        if (busy) return;
        const source = editor.current?.getValue() ?? "";
        setOutput({ status: "running", label: "renderizando o shader..." });
        await new Promise((r) => setTimeout(r, 50)); // deixa o painel pintar antes do render
        const f0 = renderShaderPpm(source, 0);
        const f3 = renderShaderPpm(source, 3);
        if (f0.ppm === null && f3.ppm === null) {
          const errors = (f0.errors.length ? f0 : f3).errors;
          setOutput({
            status: "done",
            response: {
              mode,
              compile: { ok: false, output: errors.map((e) => `shader.frag:${e.line ?? 0}:1: erro: ${e.message}`).join("\n") },
              tests: [],
              allPassed: false,
              warnings: [],
            },
          });
          return;
        }
        save(false);
        setShader((s) => ({ source, version: s.version + 1 })); // o canvas mostra o que foi julgado
        await judgeFrames(mode, "glsl", source, [f0.ppm, f3.ppm].filter((f): f is string => f !== null));
        return;
      }
      if (busy) return;
      save(false);
      const source = editor.current?.getValue() ?? "";
      if (p.kind === "canvas") {
        if (!isCanvasLanguage(lang)) return;
        // Compila e roda no próprio navegador (Emception/clang num Worker).
        // :test/:submit ainda fotografam o canvas para o veredito.
        pendingCapture.current = mode === "run" ? null : { mode, language: lang, source, compileOutput: "" };
        setOutput({ status: "running", label: PHASE_LABEL.loading });
        const version = wasm.version + 1;
        if (mode !== "run") setCapture(version);
        setWasm({ source, language: lang, version });
        return;
      }
      // C/C++ compila aqui mesmo (clang no Web Worker do Emception) e roda cada
      // teste num Web Worker: o servidor não compila nem executa nada. No
      // :submit, os ocultos vêm de /api/challenges/<slug>/tests só com o hash
      // da resposta. Sem SharedArrayBuffer (ou Rust), cai no runner do servidor.
      if ((lang === "c" || lang === "cpp") && !browserWasmProblem()) {
        const { flags, rejected } = sanitizeFlags(settings.flags[lang]);
        const extra = rejected.length ? [`flags ignoradas (não permitidas): ${rejected.join(" ")}`] : [];
        const onPhase = (phase: keyof typeof PHASE_LABEL) => setOutput({ status: "running", label: PHASE_LABEL[phase] });
        setOutput({ status: "running", label: MODE_LABEL[mode] });
        try {
          if (mode === "run") {
            const r = await judge(new BrowserWasmRunner(onPhase), p.limits, lang, source, [{ name: "stdin", input: stdin, expected: "", hidden: false }], flags);
            setOutput({ status: "done", response: { mode, compile: r.compile, run: r.tests[0] ?? null, warnings: [...r.warnings, ...extra] } });
            return;
          }
          const serverVerify = submitVerify() === "server";
          let tests = p.publicTests;
          if (mode === "submit" && !serverVerify) {
            const res = await fetch(`/api/challenges/${p.slug}/tests`);
            if (!res.ok) throw new Error(`não consegui baixar os testes (${res.status})`);
            tests = ((await res.json()) as { tests: JudgeTest[] }).tests;
          }
          const r = await judge(new BrowserWasmRunner(onPhase), p.limits, lang, source, tests, flags);
          const local = { mode, compile: r.compile, tests: redactHidden(r.tests), allPassed: r.allPassed, warnings: [...r.warnings, ...extra] };
          if (mode === "test" || !r.compile.ok) return setOutput({ status: "done", response: local });
          if (!serverVerify) {
            await finish(local, () => post({ language: lang, source, mode, verdict: { allPassed: true, timesMs: r.tests.map((t) => t.timeMs) } }));
            return;
          }
          // Modo "server": públicos passaram aqui; o servidor roda os ocultos no mesmo .wasm.
          if (!r.allPassed) return setOutput({ status: "done", response: local });
          const compiled = await compileStdioCached({ language: lang, source, flags, memoryLimitMb: p.limits.memoryLimitMb });
          await finish({ ...local, allPassed: true }, () => post({ language: lang, source, mode, wasm: wasmToBase64(compiled.wasm!), publicPassed: true }), true);
        } catch (e) {
          setOutput({ status: "error", error: `compilador do navegador: ${(e as Error).message}` });
        }
        return;
      }
      setOutput({ status: "running", label: MODE_LABEL[mode] });
      try {
        const res = await post({
          language: lang,
          source,
          stdin: mode === "run" ? stdin : undefined,
          mode,
          flags: lang === "c" || lang === "cpp" ? settings.flags[lang] : undefined,
        });
        await handleRunResponse(res);
      } catch (e) {
        setOutput({ status: "error", error: `falha de rede: ${(e as Error).message}` });
      }
    },
    [busy, finish, handleRunResponse, judgeFrames, lang, p.kind, p.limits, p.publicTests, p.slug, post, save, settings.flags, stdin, wasm.version],
  );

  const nextHint = useCallback(async () => {
    if (hints.length >= p.hintsTotal) {
      flash(p.hintsTotal ? "não há mais dicas" : "este desafio não tem dicas");
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

  // Soluções dos outros jogadores: mesma regra, e só ao abrir a aba (podem ser muitas).
  useEffect(() => {
    if (tab !== "sol" || !logged || !status || others || p.kind === "canvas") return;
    fetch(`/api/challenges/${p.slug}/solutions`)
      .then((r) => (r.ok ? r.json() : { solutions: [] }))
      .then((d) => setOthers(d.solutions))
      .catch(() => setOthers([]));
  }, [tab, logged, status, others, p.kind, p.slug]);

  const commands: EditorCommands = useMemo(
    () => ({
      save: () => save(true),
      run: () => void execute("run"),
      test: () => void execute("test"),
      submit: () => void execute("submit"),
      quit: () => {
        save(false);
        router.push(p.trackId ? `/trilhas/${p.trackId}` : "/desafios");
      },
      hint: () => void nextHint(),
      stdin: () => {
        setTab("out");
        setTimeout(() => stdinRef.current?.focus());
      },
      output: () => setTab("out"),
      setTheme: (t: EditorTheme) => updateSettings({ editorTheme: t }),
    }),
    [execute, nextHint, router, save, p.trackId],
  );

  const switchLang = (next: LanguageId) => {
    if (next === lang) return;
    clearTimeout(saveTimer.current);
    save(false); // o que está no editor ainda é da linguagem atual
    setLang(next);
    const draft = logged ? accountDrafts.current[next] : loadDraft(p.slug, next);
    setEditorText(draft ?? p.templates[next] ?? "");
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
      setEditorText(p.templates[lang] ?? "");
      flash("template restaurado");
    }
  };

  const jump = useCallback((line: number, col: number) => editor.current?.gotoLine(line, col), []);

  // Todo tipo tem :test/:submit: stdio por testes, shader e canvas pelos frames.
  const fkeys = [
    { cmd: ":w", label: "Salvar", run: commands.save },
    { cmd: ":run", label: "Executar", run: commands.run },
    { cmd: ":test", label: "Testar", run: commands.test },
    { cmd: ":submit", label: "Enviar", run: commands.submit },
    ...(p.kind === "stdio" ? [{ cmd: ":stdin", label: "Entrada", run: commands.stdin }] : []),
    { cmd: ":hint", label: "Dica", run: commands.hint },
    { cmd: ":out", label: "Saída", run: commands.output },
    { cmd: ":q", label: "Sair", run: commands.quit },
  ];

  const tabs = [
    { id: "out", label: p.kind === "stdio" ? "Saída" : "Canvas" },
    { id: "hints", label: `Dicas ${hints.length}/${p.hintsTotal}` },
    { id: "sol", label: "Solução" },
  ] as const;

  const editorPane = (
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
          <button type="button" className="btn98" onClick={() => execute("test")} disabled={busy} title=":test">
            Testar
          </button>
          <button type="button" className="btn98 primary" onClick={() => execute("submit")} disabled={busy} title=":submit">
            Enviar
          </button>
          <button type="button" className="btn98" onClick={() => setTab("hints")} title="abre as dicas (:hint revela a próxima)">
            Dicas
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
  );

  const ioPane = (
      <div className="ws-io">
        <NextStepBar slug={p.slug} trackId={p.trackId} />
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
                  Entrada (stdin) <span className="stdin-hint">Ctrl+Enter executa · Esc volta ao editor</span>
                </label>
                <textarea
                  id="stdin"
                  ref={stdinRef}
                  className="stdin98 stdin-box"
                  rows={5}
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
            ) : p.kind === "canvas" ? (
              <>
                <EmceptionCanvas source={wasm.source} language={wasm.language} version={wasm.version} onCompile={onWasmCompile} capture={capture} onFrames={onFrames} />
                {output.status !== "idle" && <OutputPanel state={output} checker={p.checker} onJump={jump} />}
              </>
            ) : (
              <>
                <ShaderCanvas source={shader.source} version={shader.version} onResult={setShaderErrors} />
                {output.status !== "idle" && <OutputPanel state={output} checker={p.checker} onJump={jump} />}
                {shaderErrors.length > 0 && (
                  <div className="crt">
                    <div className="crt-inner">
                      <div className="out-head bad">erro no shader</div>
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
              {hints.length === 0 && (
                <p className="dim">Nenhuma dica revelada. Cada dica aberta antes de resolver tira {HINT_PENALTY * 100}% dos pontos deste desafio.</p>
              )}
              <ol className="hints">
                {hints.map((h, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
                ))}
              </ol>
              {hints.length < p.hintsTotal && (
                <button type="button" className="btn98 small" onClick={() => nextHint()}>
                  Revelar dica {hints.length + 1} de {p.hintsTotal}
                </button>
              )}
            </div>
          )}

          {tab === "sol" && (
            <div className="window-body">
              {!p.hasSolution && <p className="dim">Este desafio não tem solução de referência.</p>}
              {p.hasSolution && !logged && (
                <p>
                  A solução de referência abre para quem tem conta.{" "}
                  <a href={`/entrar?next=/desafio/${p.slug}`} className="btn98 small">
                    Entrar
                  </a>
                  {status === "solved" && <span className="dim"> Você resolveu sem login. Entre e envie de novo para pontuar.</span>}
                </p>
              )}
              {p.hasSolution && logged && !status && (
                <p>
                  A solução abre quando você passar em todos os testes, ou se desistir. Desistir zera os pontos deste desafio.{" "}
                  <button type="button" className="btn98 small" onClick={() => setConfirm("giveup")}>
                    Desistir
                  </button>
                </p>
              )}
              {logged && status && solution && (
                <>
                  <p>{status === "solved" ? "Resolvido. Compare com a referência:" : "Você desistiu. A referência:"}</p>
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
              {logged && status && others && others.length > 0 && (
                <section className="others" aria-labelledby="others-title">
                  <h3 id="others-title" className="section-title">
                    Soluções de outros jogadores ({others.length})
                  </h3>
                  {others.map((o) => (
                    <details key={`${o.username}:${o.language}`}>
                      <summary>
                        <b>{o.username}</b> · {LANGUAGES[o.language].label} · {o.bytes} bytes{o.timeMs != null ? ` · ${o.timeMs} ms` : ""}
                        {o.username === account?.username ? " (você)" : ""}
                      </summary>
                      <pre className="code-block">
                        <code>{o.code}</code>
                      </pre>
                    </details>
                  ))}
                </section>
              )}
              <p>
                <button type="button" className="btn98 small" onClick={() => setConfirm("reset")}>
                  Restaurar o template
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
  );

  return (
    <>
      <SplitColumns storageKey="workspace" initial={58} min={30} max={78} className="workspace" id="editor" left={editorPane} right={ioPane} />
      {confirm && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setConfirm(null)} onKeyDown={(e) => e.key === "Escape" && setConfirm(null)}>
          <div className="window98 dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <h2 className="title-bar" id="dlg-title">
              Confirmar
            </h2>
            <div className="window-body">
              <p>{confirm === "giveup" ? "Desistir e ver a solução? Este desafio deixa de valer pontos." : "Apagar o rascunho e voltar ao template?"}</p>
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
    </>
  );
}

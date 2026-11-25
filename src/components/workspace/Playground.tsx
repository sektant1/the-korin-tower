"use client";
// Compilador livre da página /compilador: qualquer linguagem da torre, sem desafio,
// sem testes e sem pontos. Mesmo editor (Vim, temas, :comandos) e mesmo motor
// (src/lib/runner): Python no Pyodide aqui mesmo; C, C++ e Rust direto no
// Compiler Explorer (o stdin é pequeno, então não precisa passar pelo servidor).
// Rascunhos por linguagem no localStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  updateSettings,
  useSettings,
  type EditorTheme,
} from "@/lib/client/store";
import { LANGUAGE_IDS, LANGUAGES, acceptsFlags, type LanguageId } from "@/lib/languages";
import { forDisplay } from "@/lib/run-api";
import { engineLabel, getBrowserRunner, preloadLanguages, useEngineStage, useEngineStatus } from "@/lib/runner/browser";
import { sanitizeFlags } from "@/lib/runner/flags";
import { EngineBadge } from "./ChallengeWorkspace";
import { CodeEditor, type CodeEditorHandle, type EditorCommands } from "./CodeEditor";
import { OutputPanel, type OutputState } from "./OutputPanel";
import { SplitColumns } from "./SplitColumns";

// Rascunhos ficam no navegador, como nos desafios sem login.
const DRAFT = "playground";

/** Folga maior que nos desafios: aqui ninguém está competindo (o lote tem teto de 5 s). */
const TIME_LIMIT_MS = 5000;

/** Ponto de partida de cada linguagem: o "ola, korin!" de sempre. */
const TEMPLATES: Partial<Record<LanguageId, string>> = {
  c: `#include <stdio.h>

int main(void) {
    puts("ola, korin!");
    return 0;
}
`,
  cpp: `#include <iostream>

int main() {
    std::cout << "ola, korin!\\n";
}
`,
  rust: `fn main() {
    println!("ola, korin!");
}
`,
  python: `print("ola, korin!")
`,
};

export function Playground() {
  const router = useRouter();
  const [settings] = useSettings();
  const editor = useRef<CodeEditorHandle>(null);
  const [lang, setLang] = useState<LanguageId>("c");
  const [initialCode] = useState(() => TEMPLATES.c ?? "");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<OutputState>({ status: "idle" });
  const [message, setMessage] = useState("");
  const stdinRef = useRef<HTMLTextAreaElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const busy = output.status === "running";
  const engine = useEngineStatus(lang);
  const stage = useEngineStage(lang);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const skipChange = useRef(false);

  const flash = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage((m) => (m === msg ? "" : m)), 4000);
  }, []);

  // Restaura o rascunho desta linguagem, se houver (depois da montagem, para não
  // brigarmos com o HTML renderizado no servidor).
  useEffect(() => {
    const draft = loadDraft(DRAFT, lang);
    if (draft != null && draft !== initialCode) {
      setEditorText(draft);
      flash("rascunho restaurado");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    (explicit: boolean) => {
      const code = editor.current?.getValue() ?? "";
      const ok = saveDraft(DRAFT, lang, code);
      if (explicit) flash(ok ? `"${LANGUAGES[lang].file}" salvo (neste navegador)` : "E212: não foi possível salvar (storage bloqueado)");
    },
    [flash, lang],
  );

  const onChange = useCallback(() => {
    if (skipChange.current) {
      skipChange.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(false), 800);
  }, [save]);

  useEffect(() => preloadLanguages(lang), [lang]);

  const setEditorText = useCallback((code: string) => {
    clearTimeout(saveTimer.current);
    skipChange.current = true;
    editor.current?.setValue(code);
    skipChange.current = false;
  }, []);

  const execute = useCallback(async () => {
    if (busy) return;
    save(false);
    const running = `compilando e executando (${engineLabel(lang)})...`;
    setOutput({ status: "running", label: lang === "python" && engine !== "ready" ? `loading: ${stage || "subindo o Python"}...` : running });
    const source = editor.current?.getValue() ?? "";
    const { flags, rejected } = acceptsFlags(lang) ? sanitizeFlags(settings.flags[lang]) : { flags: [], rejected: [] };
    try {
      const r = await getBrowserRunner().run(source, lang, stdin, {
        timeLimitMs: TIME_LIMIT_MS,
        flags,
        onPhase: (ph, detail) => setOutput({ status: "running", label: ph === "loading" ? `loading: ${detail ?? "subindo o Python"}...` : `${detail ?? running.slice(0, -3)}...` }),
      });
      const warnings = [...r.warnings, ...(rejected.length ? [`flags ignoradas (não permitidas): ${rejected.join(" ")}`] : [])];
      setOutput({ status: "done", response: { mode: "run", compile: r.compile, run: r.tests[0] ? forDisplay(r.tests[0]) : null, warnings, wallMs: r.wallMs } });
    } catch (e) {
      setOutput({ status: "error", error: (e as Error).message });
    }
  }, [busy, engine, lang, save, settings.flags, stage, stdin]);

  const commands: EditorCommands = useMemo(
    () => ({
      save: () => save(true),
      run: () => void execute(),
      // Aqui não há testes: os dois comandos só executam com o stdin.
      test: () => {
        flash("sem testes no compilador; executando");
        void execute();
      },
      submit: () => {
        flash("sem testes no compilador; executando");
        void execute();
      },
      quit: () => {
        save(false);
        router.push("/desafios");
      },
      hint: () => flash("o compilador não tem dicas"),
      stdin: () => setTimeout(() => stdinRef.current?.focus()),
      output: () => outRef.current?.scrollIntoView({ block: "nearest" }),
      setTheme: (t: EditorTheme) => updateSettings({ editorTheme: t }),
    }),
    [execute, flash, router, save],
  );

  const switchLang = (next: LanguageId) => {
    if (next === lang) return;
    clearTimeout(saveTimer.current);
    save(false);
    setLang(next);
    const draft = loadDraft(DRAFT, next);
    setEditorText(draft ?? TEMPLATES[next] ?? "");
  };

  const reset = () => {
    clearDraft(DRAFT, lang);
    setEditorText(TEMPLATES[lang] ?? "");
    flash("template restaurado");
  };

  const jump = useCallback((line: number, col: number) => editor.current?.gotoLine(line, col), []);
  const codeLine = useCallback((n: number) => editor.current?.getValue().split("\n")[n - 1], []);

  const fkeys = [
    { cmd: ":w", label: "Salvar", run: commands.save },
    { cmd: ":run", label: "Executar", run: commands.run },
    { cmd: ":stdin", label: "Entrada", run: commands.stdin },
    { cmd: ":out", label: "Saída", run: commands.output },
    { cmd: ":q", label: "Sair", run: commands.quit },
  ];

  const editorPane = (
      <div className="ws-editor">
        <div className="toolbar98" role="toolbar" aria-label="Ações do compilador">
          <label>
            Linguagem{" "}
            <select value={lang} onChange={(e) => switchLang(e.target.value as LanguageId)} className="select98">
              {LANGUAGE_IDS.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGES[l].label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn98 primary" onClick={() => execute()} disabled={busy} title=":run">
            ▶ Executar
          </button>
          <button type="button" className="btn98" onClick={reset} disabled={busy} title="apaga o rascunho desta linguagem e volta ao template">
            Reset
          </button>
          <label className="check98">
            <input type="checkbox" checked={settings.vim} onChange={(e) => updateSettings({ vim: e.target.checked })} /> Vim
          </label>
          <EngineBadge status={engine} stage={stage} />
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
        <label className="stdin-label" htmlFor="pg-stdin">
          Entrada (stdin) <span className="stdin-hint">Ctrl+Enter executa · Esc volta ao editor</span>
        </label>
        <textarea
          id="pg-stdin"
          ref={stdinRef}
          className="stdin98 stdin-box"
          rows={5}
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void execute();
            } else if (e.key === "Escape") {
              e.preventDefault();
              editor.current?.focus();
            }
          }}
          spellCheck={false}
        />
        <div className="tab-out pg-out" ref={outRef}>
          <OutputPanel state={output} checker="exact" language={lang} onJump={jump} codeLine={codeLine} idle=":run compila e executa com a entrada acima" />
        </div>
      </div>
  );
  return <SplitColumns storageKey="compilador" initial={58} min={30} max={78} className="workspace" id="editor" left={editorPane} right={ioPane} />;
}

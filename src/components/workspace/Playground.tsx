"use client";
// Compilador livre da página /compilador: qualquer linguagem da torre, sem desafio,
// sem testes e sem pontos. Mesmo editor (Vim, temas, :comandos), mesma execução
// (/api/playground -> runner) e rascunhos por linguagem no localStorage.
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
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import type { RunResponse } from "@/lib/run-api";
import { CodeEditor, type CodeEditorHandle, type EditorCommands } from "./CodeEditor";
import { OutputPanel, type OutputState } from "./OutputPanel";

// Rascunhos ficam no navegador, como nos desafios sem login.
const DRAFT = "playground";

/** Linguagens que rodam no servidor (GLSL é só no navegador, via ShaderCanvas). */
const SERVER_LANGS = (Object.keys(LANGUAGES) as LanguageId[]).filter((l) => LANGUAGES[l].piston);

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
  go: `package main

import "fmt"

func main() {
    fmt.Println("ola, korin!")
}
`,
  zig: `const std = @import("std");

pub fn main() !void {
    const out = std.io.getStdOut().writer();
    try out.print("ola, korin!\\n", .{});
}
`,
  nasm: `; x86-64 Linux: write no stdout e exit
section .data
msg: db "ola, korin!", 10
len equ $ - msg

section .text
global _start
_start:
    mov rax, 1          ; write
    mov rdi, 1          ; stdout
    lea rsi, [msg]
    mov rdx, len
    syscall
    mov rax, 60         ; exit
    xor rdi, rdi
    syscall
`,
  d: `import std.stdio;

void main() {
    writeln("ola, korin!");
}
`,
  pascal: `program Ola;
begin
    writeln('ola, korin!');
end.
`,
  fortran: `program ola
    implicit none
    print '(a)', 'ola, korin!'
end program ola
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
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage((m) => (m === msg ? "" : m)), 4000);
  }, []);

  // Restaura o rascunho desta linguagem, se houver (depois da montagem, para não
  // brigarmos com o HTML renderizado no servidor).
  useEffect(() => {
    const draft = loadDraft(DRAFT, lang);
    if (draft != null && draft !== initialCode) {
      editor.current?.setValue(draft);
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
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(false), 800);
  }, [save]);

  const execute = useCallback(async () => {
    if (busy) return;
    save(false);
    setOutput({ status: "running", label: "compilando e executando..." });
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: lang,
          source: editor.current?.getValue() ?? "",
          stdin,
          flags: lang === "c" || lang === "cpp" ? settings.flags[lang] : undefined,
        }),
      });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) {
        setOutput({ status: "error", error: body.error ?? `HTTP ${res.status}` });
        return;
      }
      setOutput({ status: "done", response: body as RunResponse });
    } catch (e) {
      setOutput({ status: "error", error: `falha de rede: ${(e as Error).message}` });
    }
  }, [busy, lang, save, settings.flags, stdin]);

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
      hint: () => flash("sem cheat codes no compilador!"),
      stdin: () => setTimeout(() => stdinRef.current?.focus()),
      output: () => outRef.current?.scrollIntoView({ block: "nearest" }),
      setTheme: (t: EditorTheme) => updateSettings({ editorTheme: t }),
    }),
    [execute, flash, router, save],
  );

  const switchLang = (next: LanguageId) => {
    save(false);
    setLang(next);
    const draft = loadDraft(DRAFT, next);
    editor.current?.setValue(draft ?? TEMPLATES[next] ?? "");
  };

  const reset = () => {
    clearDraft(DRAFT, lang);
    editor.current?.setValue(TEMPLATES[lang] ?? "");
    flash("template restaurado");
  };

  const jump = useCallback((line: number, col: number) => editor.current?.gotoLine(line, col), []);

  const fkeys = [
    { cmd: ":w", label: "Salvar", run: commands.save },
    { cmd: ":run", label: "Executar", run: commands.run },
    { cmd: ":stdin", label: "Entrada", run: commands.stdin },
    { cmd: ":out", label: "Saída", run: commands.output },
    { cmd: ":q", label: "Sair", run: commands.quit },
  ];

  return (
    <div className="workspace" id="editor">
      <div className="ws-editor">
        <div className="toolbar98" role="toolbar" aria-label="Ações do compilador">
          <label>
            Linguagem{" "}
            <select value={lang} onChange={(e) => switchLang(e.target.value as LanguageId)} className="select98">
              {SERVER_LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGES[l].label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn98 primary" onClick={() => execute()} disabled={busy} title=":run">
            ▶ Executar
          </button>
          <button type="button" className="btn98" onClick={reset} disabled={busy} title="descartar rascunho e voltar ao template">
            Comer feijão senzu
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
        <label className="stdin-label" htmlFor="pg-stdin">
          stdin para <b>Executar</b> <span className="dim">(Ctrl+Enter executa · Esc volta ao editor)</span>
        </label>
        <textarea
          id="pg-stdin"
          ref={stdinRef}
          className="stdin98"
          rows={3}
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
          <OutputPanel state={output} checker="exact" onJump={jump} idle="aguardando... digite :run para compilar e executar" />
        </div>
      </div>
    </div>
  );
}

"use client";
import { cpp } from "@codemirror/lang-cpp";
import { rust } from "@codemirror/lang-rust";
import { indentUnit, StreamLanguage } from "@codemirror/language";
import { indentWithTab } from "@codemirror/commands";
import { shader } from "@codemirror/legacy-modes/mode/clike";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import { basicSetup } from "codemirror";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { EditorTheme } from "@/lib/client/store";
import { parseVimrc } from "@/lib/client/vimrc";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { editorTheme, isEditorTheme } from "./editor-themes";

export interface EditorCommands {
  save(): void;
  run(): void;
  test(): void;
  submit(): void;
  quit(): void;
  hint(): void;
  stdin(): void;
  output(): void;
  setTheme(theme: EditorTheme): void;
}

export interface CodeEditorHandle {
  getValue(): string;
  setValue(code: string): void;
  gotoLine(line: number, col?: number): void;
  focus(): void;
}

interface Props {
  language: LanguageId;
  initialValue: string;
  theme: EditorTheme;
  fontSize: number;
  vimEnabled: boolean;
  vimrc: string;
  commands: EditorCommands;
  message: string;
  onChange(code: string): void;
}

function languageExtension(lang: LanguageId): Extension {
  switch (lang) {
    case "c":
    case "cpp":
      return cpp();
    case "rust":
      return rust();
    case "glsl":
      return StreamLanguage.define(shader);
  }
}

// Vim.defineEx é global ao módulo: os comandos ex chamam o editor montado agora.
let active: { commands: EditorCommands; theme: EditorTheme } | null = null;
let exRegistered = false;

function registerVimCommands() {
  if (exRegistered) return;
  exRegistered = true;
  Vim.defineEx("write", "w", () => active?.commands.save());
  Vim.defineEx("quit", "q", () => active?.commands.quit());
  Vim.defineEx("run", "run", () => active?.commands.run());
  Vim.defineEx("make", "mak", () => active?.commands.run());
  Vim.defineEx("test", "test", () => active?.commands.test());
  Vim.defineEx("submit", "sub", () => active?.commands.submit());
  Vim.defineEx("hint", "hint", () => active?.commands.hint());
  Vim.defineEx("stdin", "std", () => active?.commands.stdin());
  Vim.defineEx("output", "out", () => active?.commands.output());
  // :set theme=ambar  /  :set theme?
  Vim.defineOption("theme", "vim", "string", [], (value?: string) => {
    if (value === undefined) return active?.theme;
    if (!isEditorTheme(value)) throw new Error(`tema desconhecido: ${value} (vim, noite, fosforo, ambar, turbo, win98)`);
    active?.commands.setTheme(value);
  });
}

function applyVimrc(text: string) {
  Vim.mapclear();
  const parsed = parseVimrc(text);
  for (const m of parsed.mappings) {
    // contexto undefined = todos os modos (assinatura do tipo exige string)
    const ctx = m.context as string;
    if (m.noremap) Vim.noremap(m.lhs, m.rhs, ctx);
    else Vim.map(m.lhs, m.rhs, ctx);
  }
  return parsed.options;
}

const MODE_LABEL: Record<string, string> = {
  insert: "-- INSERT --",
  visual: "-- VISUAL --",
  "visual:linewise": "-- VISUAL LINE --",
  "visual:blockwise": "-- VISUAL BLOCK --",
  replace: "-- REPLACE --",
  normal: "",
};

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const comp = useRef({ vim: new Compartment(), lang: new Compartment(), theme: new Compartment() });
  const onChange = useRef(props.onChange);
  onChange.current = props.onChange;
  // Os atalhos abaixo leem por ref: o objeto de comandos muda a cada render do pai.
  const commandsRef = useRef(props.commands);
  commandsRef.current = props.commands;
  const [mode, setMode] = useState("normal");
  const [pos, setPos] = useState({ line: 1, col: 1 });

  active = { commands: props.commands, theme: props.theme };

  // Cria o editor uma única vez.
  useEffect(() => {
    registerVimCommands();
    const c = comp.current;
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: props.initialValue,
        extensions: [
          c.vim.of(props.vimEnabled ? vim() : []), // antes do basicSetup: precedência das teclas
          // Atalhos "de IDE" para quem não usa Vim (e no modo de inserção do Vim).
          // Antes do basicSetup para vencer o Mod-Enter (insertNewlineAndIndent) do defaultKeymap.
          keymap.of([
            indentWithTab, // Tab indenta, Shift-Tab desindenta; antes disso o Tab tirava o foco do editor
            {
              key: "Mod-s",
              preventDefault: true,
              run: () => {
                commandsRef.current.save();
                return true;
              },
            },
            {
              key: "Mod-Enter",
              preventDefault: true,
              run: () => {
                commandsRef.current.run();
                return true;
              },
            },
          ]),
          basicSetup,
          // Quebra de linha longa em vez de rolar na horizontal: melhor no celular e
          // não esconde nada no desktop (os colchetes de dobra seguem a quebra).
          EditorView.lineWrapping,
          c.lang.of(languageExtension(props.language)),
          c.theme.of(editorTheme(props.theme, props.fontSize)),
          EditorState.tabSize.of(4),
          indentUnit.of("    "),
          EditorView.contentAttributes.of({ "aria-label": "Editor de código" }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChange.current(u.state.doc.toString());
            if (u.selectionSet || u.docChanged) {
              const head = u.state.selection.main.head;
              const line = u.state.doc.lineAt(head);
              setPos({ line: line.number, col: head - line.from + 1 });
            }
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.dispatch({ effects: comp.current.vim.reconfigure(props.vimEnabled ? vim() : []) });
    setMode(props.vimEnabled ? "normal" : "off");
    if (!props.vimEnabled) return;
    const cm = getCM(v);
    const onMode = (e: { mode: string; subMode?: string }) => setMode(e.subMode ? `${e.mode}:${e.subMode}` : e.mode);
    cm?.on("vim-mode-change", onMode);
    return () => cm?.off("vim-mode-change", onMode);
  }, [props.vimEnabled]);

  useEffect(() => {
    const opts = applyVimrc(props.vimrc);
    if (opts.theme && isEditorTheme(opts.theme)) props.commands.setTheme(opts.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.vimrc]);

  useEffect(() => {
    view.current?.dispatch({ effects: comp.current.lang.reconfigure(languageExtension(props.language)) });
  }, [props.language]);

  useEffect(() => {
    view.current?.dispatch({ effects: comp.current.theme.reconfigure(editorTheme(props.theme, props.fontSize)) });
  }, [props.theme, props.fontSize]);

  useImperativeHandle(ref, () => ({
    getValue: () => view.current?.state.doc.toString() ?? "",
    setValue(code) {
      const v = view.current;
      if (v) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: code } });
    },
    gotoLine(line, col = 1) {
      const v = view.current;
      if (!v) return;
      const l = v.state.doc.line(Math.min(Math.max(1, line), v.state.doc.lines));
      v.dispatch({ selection: { anchor: Math.min(l.from + col - 1, l.to) }, scrollIntoView: true });
      v.focus();
    },
    focus: () => view.current?.focus(),
  }));

  return (
    <div className="editor-frame" data-theme={props.theme}>
      <div ref={host} className="editor-host" />
      <div className="vim-status" role="status" aria-live="polite">
        <span className="vim-mode">{mode === "off" ? "[vim off]" : (MODE_LABEL[mode] ?? `-- ${mode.toUpperCase()} --`)}</span>
        <span className="vim-msg">{props.message}</span>
        <span className="vim-pos">
          {pos.line},{pos.col}
        </span>
        <span className="vim-lang">{LANGUAGES[props.language].label}</span>
      </div>
    </div>
  );
});

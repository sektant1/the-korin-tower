import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { EditorTheme } from "@/lib/client/store";

interface Palette {
  dark: boolean;
  bg: string;
  fg: string;
  gutterBg: string;
  gutterFg: string;
  cursor: string;
  selection: string;
  activeLine: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  type: string;
  fn: string;
  /** Diretivas de pré-processador (#include, #define...); cai em `keyword` se ausente. */
  preproc?: string;
}

const PALETTES: Record<EditorTheme, Palette> = {
  // Cores padrão do Vim (:syntax on sem colorscheme, fundo escuro), de
  // runtime/syntax/syncolor.vim: Statement #ffff60, Constant #ffa0a0,
  // Comment #80a0ff, Identifier #40ffff, Type #60ff60, PreProc #ff80ff.
  // O fundo segue o escuro roxo dos painéis do site em vez do preto puro.
  vim: {
    dark: true,
    bg: "#100a1d",
    fg: "#f2ecff",
    gutterBg: "#0c0716",
    gutterFg: "#8a76c4",
    cursor: "#ffffff",
    selection: "#3a2d5c",
    activeLine: "#1a1230",
    keyword: "#ffff60",
    string: "#ffa0a0",
    number: "#ffa0a0",
    comment: "#80a0ff",
    type: "#60ff60",
    fn: "#40ffff",
    preproc: "#ff80ff",
  },
  // Escuro neutro, cores suaves e só o necessário para distinguir tokens.
  noite: {
    dark: true,
    bg: "#1b1d26",
    fg: "#d4d7e0",
    gutterBg: "#1b1d26",
    gutterFg: "#5c6070",
    cursor: "#f0f0f0",
    selection: "#3a3f55",
    activeLine: "#232633",
    keyword: "#c4a7e7",
    string: "#a6d189",
    number: "#ef9f76",
    comment: "#7c8296",
    type: "#8caaee",
    fn: "#e5c890",
  },
  fosforo: {
    dark: true,
    bg: "#020a02",
    fg: "#a8ffa8",
    gutterBg: "#011401",
    gutterFg: "#3fae3f",
    cursor: "#7dff7d",
    selection: "#145214",
    activeLine: "#062006",
    keyword: "#b6ffb6",
    string: "#66ff99",
    number: "#ccff66",
    comment: "#5fbf5f",
    type: "#99ffcc",
    fn: "#e0ffe0",
  },
  ambar: {
    dark: true,
    bg: "#0d0700",
    fg: "#ffb000",
    gutterBg: "#140b00",
    gutterFg: "#c08a30",
    cursor: "#ffd166",
    selection: "#4d3200",
    activeLine: "#1f1200",
    keyword: "#ffe0a0",
    string: "#ffcc55",
    number: "#ff9d00",
    comment: "#c08a30",
    type: "#ffd98a",
    fn: "#fff0cc",
  },
  turbo: {
    dark: true,
    bg: "#0000aa",
    fg: "#ffff55",
    gutterBg: "#000080",
    gutterFg: "#55ffff",
    cursor: "#ffffff",
    selection: "#00aaaa",
    activeLine: "#0000c0",
    keyword: "#ffffff",
    string: "#55ffff",
    number: "#ff55ff",
    comment: "#aaaaaa",
    type: "#55ff55",
    fn: "#ffff55",
  },
  win98: {
    dark: false,
    bg: "#ffffff",
    fg: "#000000",
    gutterBg: "#c0c0c0",
    gutterFg: "#404040",
    cursor: "#000000",
    selection: "#000080",
    activeLine: "#f0f0ff",
    keyword: "#0000ff",
    string: "#a31515",
    number: "#098658",
    comment: "#008000",
    type: "#267f99",
    fn: "#795e26",
  },
};

// Mesma pilha de código do resto do site (globals.css: --font-code).
const CODE_FONT = "Consolas, 'Lucida Console', 'DejaVu Sans Mono', 'Liberation Mono', Menlo, monospace";

export function editorTheme(id: EditorTheme, fontSize = 15): Extension {
  const p = PALETTES[id] ?? PALETTES.vim;
  const theme = EditorView.theme(
    {
      "&": { color: p.fg, backgroundColor: p.bg, fontSize: `${fontSize}px`, height: "100%" },
      ".cm-content": { fontFamily: CODE_FONT, caretColor: p.cursor, lineHeight: "1.55" },
      ".cm-scroller": { fontFamily: CODE_FONT },
      ".cm-content, .cm-gutter": { minHeight: "100%" },
      ".cm-gutters": { backgroundColor: p.gutterBg, color: p.gutterFg, border: "none", borderRight: `1px solid ${p.gutterFg}55` },
      ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 10px" },
      ".cm-activeLine": { backgroundColor: p.activeLine },
      ".cm-activeLineGutter": { backgroundColor: p.activeLine },
      "&.cm-focused .cm-cursor": { borderLeftColor: p.cursor },
      ".cm-fat-cursor": { background: `${p.cursor} !important`, color: `${p.bg} !important` },
      "&:not(.cm-focused) .cm-fat-cursor": { background: "none !important", outline: `1px solid ${p.cursor}` },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: `${p.selection} !important` },
      ".cm-selectionMatch": { backgroundColor: p.selection },
      ".cm-panels": { backgroundColor: p.gutterBg, color: p.fg, fontFamily: CODE_FONT },
      ".cm-panels input": { color: p.fg, fontFamily: CODE_FONT, fontSize: "inherit" },
      ".cm-matchingBracket": { outline: `1px solid ${p.fg}` },
    },
    { dark: p.dark },
  );
  const highlight = HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: p.keyword, fontWeight: "bold" },
    { tag: [t.string, t.special(t.string), t.character], color: p.string },
    { tag: [t.number, t.bool, t.null, t.atom], color: p.number },
    { tag: [t.comment, t.lineComment, t.blockComment], color: p.comment, fontStyle: "italic" },
    { tag: [t.typeName, t.className, t.standard(t.typeName)], color: p.type },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: p.fn },
    { tag: [t.macroName], color: p.preproc ?? p.fn },
    { tag: [t.processingInstruction, t.meta], color: p.preproc ?? p.keyword },
  ]);
  return [theme, syntaxHighlighting(highlight)];
}

export function isEditorTheme(x: string): x is EditorTheme {
  return Object.hasOwn(PALETTES, x);
}

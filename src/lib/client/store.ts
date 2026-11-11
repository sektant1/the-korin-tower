"use client";
// Preferências, progresso e rascunhos no localStorage: é o que vale sem login.
// Com login, progresso e rascunhos vêm do banco e as preferências são sincronizadas
// com a conta (ver src/components/Account.tsx).
import { useSyncExternalStore } from "react";

export type EditorTheme = "vim" | "noite" | "fosforo" | "ambar" | "turbo" | "win98";
export const EDITOR_THEMES: { id: EditorTheme; label: string }[] = [
  { id: "vim", label: "Vim (padrão: colorscheme default do vim)" },
  { id: "noite", label: "Noite (mais legível)" },
  { id: "fosforo", label: "Fósforo verde" },
  { id: "ambar", label: "Âmbar" },
  { id: "turbo", label: "Turbo C++ azul" },
  { id: "win98", label: "Windows 98" },
];

export interface Settings {
  vim: boolean;
  editorTheme: EditorTheme;
  vimrc: string;
  sanity: boolean; // reduz animações
  starTrail: boolean;
  fontSize: number; // px do editor
  flags: { c: string; cpp: string };
}

export const DEFAULT_SETTINGS: Settings = {
  vim: true,
  editorTheme: "vim",
  vimrc: '" mapeamentos simples, um por linha\n" imap jj <Esc>\n',
  sanity: false,
  starTrail: false,
  fontSize: 15,
  flags: { c: "", cpp: "" },
};

const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let v = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) v = JSON.parse(raw);
  } catch {
    /* storage bloqueado ou JSON corrompido: usa o padrão */
  }
  cache.set(key, v);
  return v;
}

function write(key: string, value: unknown) {
  cache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem storage: vale só nesta aba */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key) cache.delete(e.key);
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const SETTINGS_KEY = "korin:settings";
let settingsSnapshot: Settings | null = null;
let settingsRaw: unknown;

export function getSettings(): Settings {
  const raw = read<Partial<Settings>>(SETTINGS_KEY, {});
  if (raw !== settingsRaw || !settingsSnapshot) {
    settingsRaw = raw;
    // Tela de toque sem teclado físico: Vim atrapalha. Vale só enquanto a pessoa não escolheu.
    const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    settingsSnapshot = {
      ...DEFAULT_SETTINGS,
      ...(touch ? { vim: false } : {}),
      ...raw,
      flags: { ...DEFAULT_SETTINGS.flags, ...raw.flags },
    };
  }
  return settingsSnapshot;
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const s = useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
  return [s, updateSettings];
}

export function updateSettings(patch: Partial<Settings>) {
  write(SETTINGS_KEY, { ...getSettings(), ...patch });
}

export { subscribe as subscribeStore };

// ---- progresso
export type ProgressState = "solved" | "gaveup";
const PROGRESS_KEY = "korin:progress";
const EMPTY: Record<string, ProgressState> = {};

export function useProgress(): Record<string, ProgressState> {
  return useSyncExternalStore(subscribe, () => read(PROGRESS_KEY, EMPTY), () => EMPTY);
}

export function setProgress(slug: string, state: ProgressState) {
  const cur = read(PROGRESS_KEY, EMPTY);
  if (cur[slug] === "solved") return; // resolver vale mais que desistir
  write(PROGRESS_KEY, { ...cur, [slug]: state });
}

// ---- rascunhos e dicas (sem reatividade global: lidos uma vez por página)
const draftKey = (slug: string, lang: string) => `korin:draft:${slug}:${lang}`;

export function loadDraft(slug: string, lang: string): string | null {
  try {
    return localStorage.getItem(draftKey(slug, lang));
  } catch {
    return null;
  }
}

export function saveDraft(slug: string, lang: string, code: string): boolean {
  try {
    localStorage.setItem(draftKey(slug, lang), code);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(slug: string, lang: string) {
  try {
    localStorage.removeItem(draftKey(slug, lang));
  } catch {
    /* ignore */
  }
}

export function loadHintsRevealed(slug: string): number {
  try {
    return Number(localStorage.getItem(`korin:hints:${slug}`) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function saveHintsRevealed(slug: string, n: number) {
  try {
    localStorage.setItem(`korin:hints:${slug}`, String(n));
  } catch {
    /* ignore */
  }
}

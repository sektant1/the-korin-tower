"use client";
// Notificações (toasts) do site. Qualquer componente cliente chama toast(); o <Toaster />
// do layout desenha. Fica fora do React para poder ser chamado de callbacks e efeitos.
import { useSyncExternalStore } from "react";
import type { Gif } from "@/lib/gifs";

export interface ToastReward {
  label: string;
  gif: Gif;
  href?: string;
}

export interface ToastInput {
  /** "achievement" ganha moldura dourada; "secret" a roxa */
  tone?: "info" | "achievement" | "secret";
  /** linha pequena em cima (ex.: "CONQUISTA DESBLOQUEADA") */
  kicker?: string;
  title: string;
  body?: string;
  /** selo ASCII à esquerda */
  icon?: string;
  reward?: ToastReward;
  /** ms até sumir sozinho; 0 = só fecha no X */
  duration?: number;
}

export interface Toast extends Required<Pick<ToastInput, "tone" | "title" | "duration">>, Omit<ToastInput, "tone" | "title" | "duration"> {
  id: number;
}

/** Quantos aparecem ao mesmo tempo; o resto espera na fila. */
export const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(input: ToastInput): number {
  const t: Toast = { tone: "info", duration: 7000, ...input, id: nextId++ };
  toasts = [...toasts, t];
  emit();
  return t.id;
}

export function dismissToast(id: number) {
  const before = toasts.length;
  toasts = toasts.filter((t) => t.id !== id);
  if (toasts.length !== before) emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => toasts;
const EMPTY: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

"use client";
import { useActionState, useEffect, useRef } from "react";

export type PostState = { error?: string; ok?: number } | undefined;

interface Props {
  action(prev: PostState, form: FormData): Promise<PostState>;
  /** campos escondidos enviados junto (ex.: slug do desafio) */
  hidden?: Record<string, string>;
  label: string;
  placeholder: string;
  max: number;
  submit: string;
}

/** Caixa de texto do guestbook e dos comentários. Limpa sozinha quando o envio dá certo. */
export function PostForm({ action, hidden, label, placeholder, max, submit }: Props) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={form} action={dispatch} className="post-form">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label>
        {label}
        <textarea name="text" className="stdin98" rows={4} maxLength={max} placeholder={placeholder} required />
      </label>
      <p className="dim small">
        Até {max} caracteres. <code>`código`</code>, <code>```bloco```</code> e <code>||spoiler||</code> (fica escondido até clicarem).
      </p>
      {state?.error && (
        <p className="out-warn" role="alert">
          (!) {state.error}
        </p>
      )}
      <button type="submit" className="btn98" disabled={pending}>
        {pending ? "Enviando..." : submit}
      </button>
    </form>
  );
}

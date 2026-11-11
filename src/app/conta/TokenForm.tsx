"use client";
import { useActionState } from "react";
import { newApiToken } from "./actions";

export function TokenForm({ loginUrl }: { loginUrl: string }) {
  const [state, action, pending] = useActionState(newApiToken, undefined);
  return (
    <form action={action} className="auth-form">
      <label htmlFor="tk-name">Nome do token (onde você vai usar)</label>
      <input id="tk-name" name="name" className="input98" placeholder="notebook" maxLength={40} required />
      {state?.error && (
        <p className="out-warn" role="alert">
          (!) {state.error}
        </p>
      )}
      {state?.token && (
        <div className="token-reveal" role="status">
          <p className="pass">[OK] Token &quot;{state.name}&quot; criado. Copie agora: ele não aparece de novo.</p>
          <pre className="out-pre small">
            <code>{state.token}</code>
          </pre>
          <p className="small">No terminal:</p>
          <pre className="out-pre small">
            <code>
              korin login --url {loginUrl} --token {state.token}
            </code>
          </pre>
        </div>
      )}
      <button type="submit" className="btn98" disabled={pending}>
        Gerar token
      </button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import { changePassword } from "./actions";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="auth-form">
      {hasPassword && (
        <>
          <label htmlFor="pw-current">Senha atual</label>
          <input id="pw-current" name="current" type="password" className="input98" autoComplete="current-password" required />
        </>
      )}
      <label htmlFor="pw-new">Nova senha</label>
      <input id="pw-new" name="password" type="password" className="input98" autoComplete="new-password" required minLength={8} />
      <label htmlFor="pw-new2">Repita a nova senha</label>
      <input id="pw-new2" name="password2" type="password" className="input98" autoComplete="new-password" required minLength={8} />
      {state?.error && (
        <p className="out-warn" role="alert">
          (!) {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="pass" role="status">
          [OK] Senha salva. Outras sessões foram encerradas.
        </p>
      )}
      <button type="submit" className="btn98" disabled={pending}>
        {hasPassword ? "Trocar senha" : "Criar senha"}
      </button>
    </form>
  );
}

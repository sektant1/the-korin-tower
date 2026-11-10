"use client";
import { useActionState } from "react";
import { login, register } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="login-user">Usuário</label>
      <input id="login-user" name="username" className="input98" autoComplete="username" required autoFocus />
      <label htmlFor="login-pass">Senha</label>
      <input id="login-pass" name="password" type="password" className="input98" autoComplete="current-password" required />
      {state?.error && (
        <p className="out-warn" role="alert">
          (!) {state.error}
        </p>
      )}
      <button type="submit" className="btn98 primary" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export function RegisterForm({ next, invite }: { next: string; invite: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="reg-invite">Código de convite</label>
      <input id="reg-invite" name="invite" className="input98" defaultValue={invite} placeholder="KORIN-XXXX-XXXX" required autoComplete="off" />
      <label htmlFor="reg-user">Usuário</label>
      <input
        id="reg-user"
        name="username"
        className="input98"
        autoComplete="username"
        required
        minLength={3}
        maxLength={20}
        pattern="[A-Za-z0-9_\-]{3,20}"
        aria-describedby="reg-user-help"
      />
      <p id="reg-user-help" className="dim small">
        3 a 20 caracteres: letras, números, _ e -. Aparece no Hall of Fame.
      </p>
      <label htmlFor="reg-pass">Senha</label>
      <input id="reg-pass" name="password" type="password" className="input98" autoComplete="new-password" required minLength={8} />
      <label htmlFor="reg-pass2">Repita a senha</label>
      <input id="reg-pass2" name="password2" type="password" className="input98" autoComplete="new-password" required minLength={8} />
      {state?.error && (
        <p className="out-warn" role="alert">
          (!) {state.error}
        </p>
      )}
      <button type="submit" className="btn98 primary" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}

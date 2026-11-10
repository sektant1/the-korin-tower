"use client";
// Conta do jogador no cliente. O layout (servidor) lê a sessão e passa os dados aqui;
// depois de resolver/desistir, `router.refresh()` traz o progresso novo do banco.
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { getSettings, subscribeStore, updateSettings, useProgress, type ProgressState, type Settings } from "@/lib/client/store";

export interface AccountData {
  username: string;
  isAdmin: boolean;
  points: number;
  progress: Record<string, ProgressState>;
  settings: Partial<Settings> | null;
}

const Ctx = createContext<AccountData | null>(null);

export function AccountProvider({ account, children }: { account: AccountData | null; children: ReactNode }) {
  const username = account?.username;
  const serverSettings = account?.settings;

  // Preferências: a conta manda ao entrar; depois, cada mudança local sobe (com debounce).
  useEffect(() => {
    if (!username) return;
    if (serverSettings) updateSettings(serverSettings);
    let last = JSON.stringify(getSettings());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const push = () =>
      fetch("/api/me/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: last, keepalive: true }).catch(() => {});
    if (!serverSettings) push(); // primeira vez: leva as preferências deste navegador para a conta
    const unsubscribe = subscribeStore(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const cur = JSON.stringify(getSettings());
        if (cur === last) return;
        last = cur;
        push();
      }, 1000);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
    // serverSettings só importa na entrada; reaplicar a cada refresh desfaria mudanças locais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return <Ctx.Provider value={account}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountData | null {
  return useContext(Ctx);
}

/** Progresso que vale agora: o da conta (logado) ou o deste navegador. */
export function useProgressMap(): Record<string, ProgressState> {
  const account = useAccount();
  const local = useProgress();
  return account ? account.progress : local;
}

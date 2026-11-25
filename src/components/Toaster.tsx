"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Gif } from "@/components/Gif";
import { getAchievement } from "@/lib/achievements";
import { avatarsUnlockedBy } from "@/lib/avatars";
import { dismissToast, MAX_VISIBLE, toast, useToasts, type Toast } from "@/lib/client/toast";
import { useAccount } from "./Account";

/** Pilha de notificações no canto da tela. Vai uma vez no layout. */
export function Toaster() {
  const all = useToasts();
  const visible = all.slice(0, MAX_VISIBLE);
  const waiting = all.length - visible.length;
  return (
    <section className="toaster" aria-label="Notificações">
      <ol>
        {visible.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </ol>
      {waiting > 0 && <p className="toast-more">+{waiting} na fila</p>}
    </section>
  );
}

function ToastCard({ toast: t }: { toast: Toast }) {
  const [paused, setPaused] = useState(false);
  // Some sozinho, mas espera enquanto o mouse ou o foco do teclado estão nele.
  useEffect(() => {
    if (!t.duration || paused) return;
    const id = setTimeout(() => dismissToast(t.id), t.duration);
    return () => clearTimeout(id);
  }, [t.id, t.duration, paused]);

  return (
    <li
      className={`toast toast-${t.tone}`}
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {t.icon && (
        <span className="toast-icon medal-icon" aria-hidden="true">
          {t.icon}
        </span>
      )}
      <div className="toast-text">
        {t.kicker && <p className="toast-kicker">{t.kicker}</p>}
        <p className="toast-title">{t.title}</p>
        {t.body && <p className="toast-body">{t.body}</p>}
        {t.reward && (
          <p className="toast-reward">
            <span className="avatar avatar-xs" aria-hidden="true">
              <Gif gif={t.reward.gif} height={24} />
            </span>
            {t.reward.href ? (
              <Link href={t.reward.href} onClick={() => dismissToast(t.id)}>
                {t.reward.label}
              </Link>
            ) : (
              t.reward.label
            )}
          </p>
        )}
      </div>
      <button type="button" className="toast-close" aria-label="Fechar notificação" onClick={() => dismissToast(t.id)}>
        ×
      </button>
      {t.duration > 0 && <span className={`toast-timer ${paused ? "paused" : ""}`} style={{ animationDuration: `${t.duration}ms` }} aria-hidden="true" />}
    </li>
  );
}

/**
 * Conquistas com aviso pendente (vêm do layout em `account.unseen`): vira toast e avisa o
 * servidor que já apareceu. O conjunto `shown` evita repetir enquanto o refresh não volta.
 */
const shown = new Set<string>();

export function AchievementNotifier() {
  const account = useAccount();
  const unseen = account?.unseen;
  const pending = useRef<string[]>([]);

  useEffect(() => {
    if (!unseen?.length) return;
    const fresh = unseen.filter((id) => !shown.has(id));
    if (!fresh.length) return;
    for (const id of fresh) {
      shown.add(id);
      const a = getAchievement(id);
      if (!a) continue;
      const avatars = avatarsUnlockedBy(id);
      toast({
        tone: a.secret ? "secret" : "achievement",
        kicker: a.secret ? "SEGREDO DESCOBERTO" : "CONQUISTA DESBLOQUEADA",
        icon: a.icon,
        title: a.name,
        body: a.description,
        reward: avatars[0] && {
          label: `Novo avatar: ${avatars.map((v) => v.name).join(", ")}`,
          gif: avatars[0].gif,
          href: "/conta#avatar",
        },
        duration: 9000,
      });
    }
    pending.current.push(...fresh);
    const ids = pending.current.splice(0);
    fetch("/api/me/achievements/seen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
      keepalive: true,
    }).catch(() => {
      // Sem rede: tenta de novo no próximo aviso (o toast já apareceu, não repete).
      pending.current.push(...ids);
    });
  }, [unseen]);

  return null;
}

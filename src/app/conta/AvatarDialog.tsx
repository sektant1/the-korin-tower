"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { AvatarPicker, type AvatarOption } from "./AvatarPicker";

/**
 * Botão "Trocar avatar" + janela com a grade de avatares (<dialog> nativo: Esc fecha e o foco
 * fica preso nela). Abre sozinha em /conta#avatar, para onde apontam a caixa do jogador e o toast
 * de conquista.
 */
export function AvatarDialog({ options, current, children }: { options: AvatarOption[]; current: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  useEffect(() => {
    const fromHash = () => {
      if (location.hash === "#avatar" && !ref.current?.open) open();
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  return (
    <>
      <button type="button" id="avatar" className="profile-avatar-btn" onClick={open} title="Trocar avatar">
        {children}
        <span className="btn98 small">Trocar avatar</span>
      </button>
      <dialog
        ref={ref}
        className="window98 avatar-dialog"
        aria-labelledby="avatar-dialog-title"
        // clique no fundo (fora da janela) fecha
        onClick={(e) => e.target === e.currentTarget && close()}
        onClose={() => {
          if (location.hash === "#avatar") history.replaceState(null, "", location.pathname + location.search);
        }}
      >
        <div className="title-bar">
          <span id="avatar-dialog-title">Escolher avatar</span>
          <button type="button" className="title-close" onClick={close} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="window-body">
          <AvatarPicker options={options} current={current} />
        </div>
      </dialog>
    </>
  );
}

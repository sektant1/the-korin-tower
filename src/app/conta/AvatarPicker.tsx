"use client";
import { useActionState } from "react";
import { Avatar } from "@/components/Avatar";
import { chooseAvatar } from "./actions";

export interface AvatarOption {
  id: string;
  name: string;
  unlocked: boolean;
  /** como liberar (só para os trancados) */
  how?: string;
}

/** Grade de avatares: os liberados equipam com um clique; os trancados dizem como liberar. */
export function AvatarPicker({ options, current }: { options: AvatarOption[]; current: string }) {
  const [state, dispatch, pending] = useActionState(chooseAvatar, undefined);
  const equipped = state?.ok ?? current;
  const got = options.filter((o) => o.unlocked).length;
  return (
    <form action={dispatch} className="avatar-picker">
      <p className="dim small">
        {got} de {options.length} liberados. Conquistas novas liberam mais.
      </p>
      <ul className="avatar-grid">
        {options.map((o) => {
          const on = o.id === equipped;
          return (
            <li key={o.id}>
              <button
                type="submit"
                name="avatar"
                value={o.id}
                className={`avatar-tile ${on ? "on" : ""} ${o.unlocked ? "" : "locked"}`}
                disabled={!o.unlocked || pending || on}
                aria-pressed={on}
                title={o.unlocked ? o.name : `${o.name}: ${o.how}`}
              >
                <Avatar id={o.id} size="md" />
                <span className="avatar-tile-name">{o.name}</span>
                <span className="avatar-tile-state">{on ? "EQUIPADO" : o.unlocked ? "equipar" : o.how}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="small">
        {state?.error ? <span className="out-warn">(!) {state.error}</span> : pending ? "Equipando..." : ""}
      </p>
    </form>
  );
}

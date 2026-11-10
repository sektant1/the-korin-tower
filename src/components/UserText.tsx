"use client";
import { useState, type ReactNode } from "react";
import { parseUserText, type Inline } from "@/lib/user-text";

function inline(parts: Inline[]): ReactNode[] {
  return parts.map((p, i) => (p.type === "code" ? <code key={i}>{p.text}</code> : p.text));
}

function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <span className="spoiler open">{children}</span>;
  return (
    <button type="button" className="spoiler" onClick={() => setOpen(true)} aria-label="Spoiler escondido. Ative para revelar.">
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

/** Texto de usuário (guestbook, comentários): tudo vira nó de texto do React, nunca HTML. */
export function UserText({ text }: { text: string }) {
  return (
    <div className="user-text">
      {parseUserText(text).map((b, i) =>
        b.type === "pre" ? (
          <pre key={i} className="code-block">
            <code>{b.text}</code>
          </pre>
        ) : b.type === "spoiler" ? (
          <Spoiler key={i}>{inline(b.parts)}</Spoiler>
        ) : (
          <span key={i}>{inline(b.parts)}</span>
        ),
      )}
    </div>
  );
}

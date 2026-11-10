// Pequenos elementos clássicos (server components, sem estado).
import { Children, type ReactNode } from "react";

export function Marquee({ children, label }: { children: ReactNode; label: string }) {
  // <marquee> real não respeita prefers-reduced-motion; este respeita (ver CSS).
  return (
    <div className="marquee" role="marquee" aria-label={label}>
      <div className="marquee-track">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </div>
    </div>
  );
}

export function Blink({ children }: { children: ReactNode }) {
  return <span className="blink">{children}</span>;
}

export function UnderConstruction({ what }: { what?: string }) {
  return (
    <div className="under-construction" role="note">
      <span className="uc-stripes" aria-hidden="true" />
      <span className="uc-text">
        <span aria-hidden="true">/!\ </span>UNDER CONSTRUCTION<span aria-hidden="true"> /!\</span>
        {what && <small>{what}</small>}
      </span>
      <span className="uc-stripes" aria-hidden="true" />
    </div>
  );
}

export function RainbowHr() {
  return <hr className="rainbow" />;
}

export function Difficulty({ level }: { level: number }) {
  return (
    <span className="difficulty" title={`Dificuldade ${level} de 5`}>
      <span className="sr-only">Dificuldade {level} de 5</span>
      <span aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < level ? "star on" : "star"} style={{ animationDelay: `${i * 0.15}s` }}>
            ★
          </span>
        ))}
      </span>
      {level === 5 && <span className="boss">BOSS</span>}
    </span>
  );
}

/** Remove acentos: a fonte pixel (Press Start 2P) desenha maiúsculas acentuadas como minúsculas. */
export function arcade(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function FlameTitle({ children, as: Tag = "h1" }: { children: ReactNode; as?: "h1" | "h2" }) {
  // Children.map preserva/atribui keys (um .map comum geraria aviso de key).
  const kids = Children.map(children, (n) => (typeof n === "string" ? arcade(n) : n));
  return <Tag className="flame">{kids}</Tag>;
}

export function Window({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`window98 ${className ?? ""}`}>
      <div className="title-bar">
        <span>{title}</span>
        <span className="title-buttons" aria-hidden="true">
          <span>_</span>
          <span>□</span>
          <span>×</span>
        </span>
      </div>
      <div className="window-body">{children}</div>
    </section>
  );
}

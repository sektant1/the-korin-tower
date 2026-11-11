// Pequenos elementos clássicos (server components, sem estado).
import Link from "next/link";
import { Children, type ReactNode } from "react";
import { Gif } from "./Gif";
import { GIFS } from "@/lib/gifs";

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
          <span key={i} className={i < level ? "star on" : "star"}>
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

/* ---------- botões 88x31 ----------
   A parede de botões. Quase todos são GIFs de verdade, resgatados de sites pessoais antigos
   (public/buttons, créditos em CREDITS.txt). Os poucos sem versão original (a própria torre,
   a CLI, ki, senzu, gcc) são desenhados em CSS. */
const GIF_BUTTONS = {
  "dbz-amazing": { file: "/buttons/dbz-amazing.gif", alt: "Amazing DBZ", href: "/galeria" },
  "best-dbz-br": { file: "/buttons/best-dbz-br.gif", alt: "Best DBZ BR" },
  "vegeta-alliance": { file: "/buttons/vegeta-alliance.gif", alt: "Vegeta Alliance", href: "/hall-da-fama" },
  goku: { file: "/buttons/goku.gif", alt: "Goku" },
  "majin-vegeta": { file: "/buttons/majin-vegeta.gif", alt: "Majin Vegeta" },
  "planete-dbz": { file: "/buttons/planete-dbz.gif", alt: "Planete DBZ" },
  assembly: { file: "/buttons/assembly.gif", alt: "Assembly", href: "/desafios?sala=asm" },
  cpp: { file: "/buttons/cpp.gif", alt: "C++", href: "/desafios?sala=cpp" },
  "powered-by-asm": { file: "/buttons/powered-by-asm.gif", alt: "Powered by ASM" },
  vim: { file: "/buttons/vim.gif", alt: "Edited with Vim", href: "/config" },
  "gnu-linux": { file: "/buttons/gnu-linux.gif", alt: "Made on GNU/Linux" },
  "dos-page": { file: "/buttons/dos-page.gif", alt: "DOS page", href: "/compilador" },
  "hand-coded": { file: "/buttons/hand-coded.gif", alt: "Completely hand-coded" },
  "open-source": { file: "/buttons/open-source.png", alt: "Open source" },
  "hacker-powered": { file: "/buttons/hacker-powered.gif", alt: "Hacker powered" },
  "netscape-now": { file: "/buttons/netscape-now.gif", alt: "Netscape Now!" },
  "made-with-notepad": { file: "/buttons/made-with-notepad.gif", alt: "Made with Notepad" },
  "best-viewed-800x600": { file: "/buttons/best-viewed-800x600.gif", alt: "Best viewed 800x600" },
  "any-browser": { file: "/buttons/any-browser.gif", alt: "Best viewed with any browser" },
  "rss-feed": { file: "/buttons/rss-feed.gif", alt: "RSS feed", href: "/feed.xml" },
  "guest-book": { file: "/buttons/guest-book.gif", alt: "Guest book", href: "/guestbook" },
  "web-rings": { file: "/buttons/web-rings.gif", alt: "Web rings", href: "/aleatorio" },
  "8-bit": { file: "/buttons/8-bit.gif", alt: "8 bit" },
  "open-eyes": { file: "/buttons/open-eyes.gif", alt: "Best viewed with open eyes" },
  "w3c-html401": { file: "/buttons/w3c-html401.png", alt: "W3C HTML 4.01" },
  "made-with-css": { file: "/buttons/made-with-css.gif", alt: "Made with Cascading Style Sheets" },
  "y2k-neocities": { file: "/buttons/y2k-neocities.png", alt: "Y2K Neocities" },
} as const satisfies Record<string, { file: string; alt: string; href?: string }>;

const CSS_BUTTONS = {
  cli: { top: "korin", bottom: "CLI", href: "/cli", title: "Resolva pelo terminal" },
  ki: { top: "KI 9000+", bottom: "carregado", href: "/hall-da-fama", title: "Hall of Fame" },
  senzu: { top: "Senzu", bottom: "inside" },
  gcc: { top: "gcc", bottom: "inside" },
} as const satisfies Record<string, { top: string; bottom: string; href?: string; title?: string }>;

export type Button88Kind = "korin" | "guestbook" | keyof typeof GIF_BUTTONS | keyof typeof CSS_BUTTONS;

/** Todos, na ordem da parede completa (página Sobre). */
export const ALL_BUTTONS: Button88Kind[] = [
  "korin",
  ...(Object.keys(GIF_BUTTONS) as (keyof typeof GIF_BUTTONS)[]),
  "guestbook",
  ...(Object.keys(CSS_BUTTONS) as (keyof typeof CSS_BUTTONS)[]),
];

export function Button88({ kind }: { kind: Button88Kind }) {
  if (kind === "korin") {
    return (
      <Link href="/" className="b88-img" title="The Korin Tower">
        {/* eslint-disable-next-line @next/next/no-img-element -- botão 88x31 estático */}
        <img src="/korin-88x31.svg" width={88} height={31} alt="The Korin Tower" />
      </Link>
    );
  }
  if (kind === "guestbook") {
    return (
      <Link href="/guestbook" className="b88-img" title="Assine o guestbook">
        <Gif gif={GIFS.guestbookButton} alt="Guestbook" />
      </Link>
    );
  }
  if (kind in GIF_BUTTONS) {
    const g = GIF_BUTTONS[kind as keyof typeof GIF_BUTTONS] as { file: string; alt: string; href?: string };
    // eslint-disable-next-line @next/next/no-img-element -- GIFs animados da época, tamanho fixo
    const img = <img src={g.file} width={88} height={31} alt={g.alt} loading="lazy" />;
    return g.href ? (
      <Link href={g.href} className="b88-img" title={g.alt}>
        {img}
      </Link>
    ) : (
      <span className="b88-img" title={g.alt}>
        {img}
      </span>
    );
  }
  const b = CSS_BUTTONS[kind as keyof typeof CSS_BUTTONS] as { top: string; bottom: string; href?: string; title?: string };
  const inner = (
    <>
      <b>{b.top}</b>
      <small>{b.bottom}</small>
    </>
  );
  return b.href ? (
    <Link href={b.href} className={`b88 b-${kind}`} title={b.title}>
      {inner}
    </Link>
  ) : (
    <span className={`b88 b-${kind}`} title={b.title}>
      {inner}
    </span>
  );
}

export function ButtonWall({ kinds, className }: { kinds: Button88Kind[]; className?: string }) {
  return (
    <div className={`buttons-88 ${className ?? ""}`}>
      {kinds.map((k) => (
        <Button88 key={k} kind={k} />
      ))}
    </div>
  );
}

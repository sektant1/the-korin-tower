import "katex/dist/katex.min.css";
import "./globals.css";
import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import Link from "next/link";
import { AccountProvider, type AccountData } from "@/components/Account";
import { PlayerOne, SanityToggle, SettingsApplier, StarTrail, VisitCounter } from "@/components/ClientEffects";
import { DragonBalls, FlyingCloud, KonamiCode } from "@/components/PortalWidgets";
import { Gif } from "@/components/Gif";
import { MobileMenu } from "@/components/MobileMenu";
import { GIFS } from "@/lib/gifs";
import { RainbowHr } from "@/components/Retro";
import { logout } from "@/app/entrar/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/lib/challenges";
import { prisma } from "@/lib/db";
import { getProgressSummary } from "@/lib/progress";
import type { Settings } from "@/lib/client/store";
import { captionOf, getFanart } from "@/lib/fanart";

// Tudo lê o banco em tempo de requisição (nada é pré-renderizado no build).
export const dynamic = "force-dynamic";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel", display: "swap" });
const vt = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt", display: "swap" });

export const metadata: Metadata = {
  title: { default: "The Korin Tower", template: "%s :: The Korin Tower" },
  description: "Desafios de programação de baixo nível: C, C++, Rust, assembly, shaders. Editor Vim e compilador de verdade.",
  icons: { icon: GIFS.sphere.src },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

const MENU = [
  { href: "/", label: "Home" },
  { href: "/desafios", label: "Desafios" },
  { href: "/trilhas", label: "Detonados" },
  { href: "/compilador", label: "Compilador" },
  { href: "/cli", label: "CLI" },
  { href: "/hall-da-fama", label: "Hall of Fame" },
  { href: "/galeria", label: "Galeria" },
  { href: "/guestbook", label: "Guestbook" },
  { href: "/sobre", label: "Sobre" },
  { href: "/config", label: "Opções" },
];

async function loadAccount(): Promise<AccountData | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [summary, row] = await Promise.all([
    getProgressSummary(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { settings: true } }),
  ]);
  return {
    username: user.username,
    isAdmin: user.isAdmin,
    points: summary.points,
    progress: summary.map,
    settings: (row?.settings ?? null) as Partial<Settings> | null,
  };
}

// Aplica o Modo Sanidade antes da primeira pintura (evita um flash de animação).
const EARLY = `try{var s=JSON.parse(localStorage.getItem('korin:settings')||'{}');document.documentElement.dataset.sanity=s.sanity?'on':'off'}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, fanart, account] = await Promise.all([listCategories(), getFanart(), loadAccount()]);
  const menu = [
    ...MENU,
    account ? { href: "/conta", label: "Minha conta" } : { href: "/entrar", label: "Entrar" },
    ...(account?.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const sideArt = fanart.gallery.length ? fanart.gallery[Math.floor(Math.random() * fanart.gallery.length)] : null;
  const total = categories.reduce((n, c) => n + c.count, 0);

  return (
    <html lang="pt-BR" className={`${pixel.variable} ${vt.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY }} />
      </head>
      <body>
        <AccountProvider account={account}>
          <a href="#conteudo" className="skip-link">
            Pular para o conteúdo
          </a>
          <SettingsApplier />
          <StarTrail />
          <KonamiCode />

          <header className="site-header">
            <FlyingCloud />
            <Link href="/" className="logo-link" aria-label="The Korin Tower, página inicial">
              <Gif gif={GIFS.logo} height={80} className="header-logo-gif" pixelated={false} />
              <span className="logo-title">
                <Gif gif={GIFS.sphere} height={34} />
                <span className="flame logo-text">THE KORIN TOWER</span>
                <Gif gif={GIFS.sphere} height={34} />
              </span>
            </Link>
            {fanart.banner && (
              // eslint-disable-next-line @next/next/no-img-element -- GIF animado do dono do site
              <img src={fanart.banner} alt="" className="header-banner" />
            )}
            <p className="tagline">
              ~*~ desafios de programação para devs de <i>baixo nível</i> ~*~
            </p>
          </header>

          <MobileMenu items={menu} />

          <div className="frame">
            <nav className="sidebar" aria-label="Navegação principal">
              <div className="side-box">
                <h2 className="side-title">MENU</h2>
                <ul className="nav-list">
                  {menu.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="side-box">
                <h2 className="side-title">ANDARES</h2>
                <ul className="nav-list">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={`/categoria/${c.id}`}>
                        {c.name} <span className="count">({c.count})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="side-box">
                <h2 className="side-title">JOGADOR</h2>
                <Gif gif={GIFS.goku} alt="" className="p1-avatar" />
                <p className="p1-name">{account ? account.username : "convidado"}</p>
                <PlayerOne total={total} />
                <DragonBalls />
                {account ? (
                  <form action={logout} className="side-action">
                    <button type="submit" className="btn98 small">
                      Sair
                    </button>
                  </form>
                ) : (
                  <p className="side-action">
                    <Link href="/entrar" className="btn98 small">
                      Entrar
                    </Link>
                  </p>
                )}
              </div>

              {sideArt && (
                <div className="side-box">
                  <h2 className="side-title">FAN ART</h2>
                  <Link href="/galeria" className="side-art">
                    {/* eslint-disable-next-line @next/next/no-img-element -- GIF animado do dono do site */}
                    <img src={sideArt} alt={captionOf(sideArt)} />
                  </Link>
                </div>
              )}

              <div className="side-box side-misc">
                <VisitCounter />
                <SanityToggle />
              </div>
            </nav>

            <main id="conteudo" className="content" tabIndex={-1}>
              {children}
            </main>
          </div>

          <footer className="site-footer">
            <RainbowHr />
            <div className="webring" aria-label="Webring">
              <Link href="/sobre">◄ anterior</Link>
              <span>
                <Gif gif={GIFS.sphere} height={16} /> Webring dos Devs de Baixo Nível <Gif gif={GIFS.sphere} height={16} />
              </span>
              <Link href="/aleatorio">aleatório</Link>
              <Link href="/desafios">próximo ►</Link>
            </div>
            <div className="buttons-88">
              <Link href="/guestbook" className="b88-img" title="Assine o guestbook">
                <Gif gif={GIFS.guestbookButton} alt="Guestbook" />
              </Link>
              <span className="b88 b-netscape">
                <b>Netscape</b>
                <small>NOW!</small>
              </span>
              <span className="b88 b-notepad">
                <b>Made with</b>
                <small>Notepad</small>
              </span>
              <span className="b88 b-vim">
                <b>VIM</b>
                <small>powered</small>
              </span>
              <span className="b88 b-800">
                <b>800x600</b>
                <small>best view</small>
              </span>
            </div>
            <p className="best-viewed">
              Best viewed in Netscape Navigator 4.0 at 800x600 · © 1998–{new Date().getFullYear()} The Korin Tower ·{" "}
              <Link href="/guestbook">guestbook</Link> · <a href="/feed.xml">RSS</a>
            </p>
          </footer>
        </AccountProvider>
      </body>
    </html>
  );
}

import "katex/dist/katex.min.css";
import "./globals.css";
import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import Link from "next/link";
import { AccountProvider, type AccountData } from "@/components/Account";
import { PlayerOne, SanityToggle, SettingsApplier, StarTrail, VisitCounter } from "@/components/ClientEffects";
import { Bookmark, Clock, DragonBalls, FlyingCloud, KonamiCode } from "@/components/PortalWidgets";
import { Gif } from "@/components/Gif";
import { MobileMenu } from "@/components/MobileMenu";
import { GIFS } from "@/lib/gifs";
import { Marquee, RainbowHr } from "@/components/Retro";
import { logout } from "@/app/entrar/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { latestChallenges, listCategories } from "@/lib/challenges";
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
  description: "Desafios de programação para devs de baixo nível. Best viewed in Netscape Navigator 4.0.",
  icons: { icon: GIFS.sphere.src },
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

const MENU = [
  { href: "/", label: "Home" },
  { href: "/desafios", label: "Desafios" },
  { href: "/compilador", label: "Compilador" },
  { href: "/trilhas", label: "Detonados" },
  { href: "/hall-da-fama", label: "Hall of Fame" },
  { href: "/galeria", label: "Galeria" },
  { href: "/guestbook", label: "Guestbook" },
  { href: "/sobre", label: "Sobre mim" },
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
  const [categories, latest, fanart, account] = await Promise.all([listCategories(), latestChallenges(3), getFanart(), loadAccount()]);
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

        <Marquee label="Avisos">
          {latest.map((c) => (
            <span key={c.slug}>
              <Gif gif={GIFS.sphere} height={18} className="marquee-gif" /> NOVO DESAFIO: {c.title}!!! &nbsp;&nbsp;
            </span>
          ))}
          <span>
            <Gif gif={GIFS.sphere} height={18} className="marquee-gif" /> Bem-vindo à torre, jogador! Cada andar é um desafio. &nbsp;&nbsp;
          </span>
          <span>
            <Gif gif={GIFS.sphere} height={18} className="marquee-gif" /> Seus rascunhos são salvos automaticamente{account ? " na sua conta" : ""} &nbsp;&nbsp;
          </span>
        </Marquee>

        <MobileMenu items={menu} />

        <div className="frame">
          <nav className="sidebar" aria-label="Navegação principal">
            <div className="side-box">
              <h2 className="side-title">MENU</h2>
              <ul className="nav-list">
                {menu.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <Gif gif={GIFS.sphere} height={14} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="side-box">
              <h2 className="side-title">SELECT STAGE</h2>
              <ul className="nav-list">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/categoria/${c.id}`}>
                      <Gif gif={GIFS.sphere} height={14} /> {c.name} <span className="count">({c.count})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="side-box">
              <h2 className="side-title">ESFERAS DO DRAGAO</h2>
              <DragonBalls />
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

            <div className="side-box">
              <h2 className="side-title">PLAYER 1</h2>
              <Gif gif={GIFS.goku} alt="Avatar do jogador" className="p1-avatar" />
              <p className="p1-name">{account ? account.username.toUpperCase() : "CONVIDADO"}</p>
              <PlayerOne total={total} />
              {account ? (
                <form action={logout}>
                  <button type="submit" className="btn98 small">
                    Sair (logout)
                  </button>
                </form>
              ) : (
                <Link href="/entrar" className="btn98 small">
                  Entrar / criar conta
                </Link>
              )}
            </div>

            <div className="side-box">
              <SanityToggle />
              <VisitCounter />
              <Clock />
              <Bookmark />
            </div>
          </nav>

          <main id="conteudo" className="content" tabIndex={-1}>
            {children}
          </main>
        </div>

        <footer className="site-footer">
          <RainbowHr />
          <div className="webring" aria-label="Webring">
            <Link href="/sobre">◄ Anterior</Link>
            <span>
              <Gif gif={GIFS.sphere} height={16} /> Webring dos Devs de Baixo Nível <Gif gif={GIFS.sphere} height={16} />
            </span>
            <Link href="/aleatorio">Aleatório ?</Link>
            <Link href="/desafios">Próximo ►</Link>
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
            <span className="b88 b-rust">
              <b>Powered by</b>
              <small>Rust</small>
            </span>
            <span className="b88 b-vim">
              <b>VIM</b>
              <small>powered</small>
            </span>
            <span className="b88 b-800">
              <b>800x600</b>
              <small>best view</small>
            </span>
            <span className="b88 b-html">
              <b>HTML 3.2</b>
              <small>valid?</small>
            </span>
            <span className="b88 b-ki">
              <b>KI 100%</b>
              <small>carregado</small>
            </span>
            <span className="b88 b-senzu">
              <b>Senzu</b>
              <small>inside</small>
            </span>
          </div>
          <p className="best-viewed">
            Feito com &hearts; e muito Ki · Best viewed in Netscape Navigator 4.0 at 800x600 · © 1998–{new Date().getFullYear()} The Korin Tower ·{" "}
            <Link href="/guestbook">assine o guestbook</Link> · <a href="/feed.xml">feed RSS</a>
          </p>
        </footer>
        </AccountProvider>
      </body>
    </html>
  );
}

import "katex/dist/katex.min.css";
import "./globals.css";
import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import Link from "next/link";
import { AccountProvider, type AccountData } from "@/components/Account";
import { SanityToggle, SettingsApplier, StarTrail, VisitCounter } from "@/components/ClientEffects";
import { FlyingCloud, KonamiCode } from "@/components/PortalWidgets";
import { FloorNav, TowerPlayer, TowerProvider } from "@/components/Tower";
import { getTowerData } from "@/lib/tower-server";
import { Gif } from "@/components/Gif";
import { MobileMenu } from "@/components/MobileMenu";
import { GIFS } from "@/lib/gifs";
import { ButtonWall, Difficulty, RainbowHr } from "@/components/Retro";
import { NEWS } from "@/lib/site-content";
import { getDaily } from "@/lib/daily";
import { getProgressSummary, hallOfFame } from "@/lib/progress";
import { DAILY_BONUS } from "@/lib/scoring";
import { logout } from "@/app/entrar/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
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
  { href: "/desafios", label: "A Torre" },
  { href: "/trilhas", label: "Detonados" },
  { href: "/biblioteca", label: "Biblioteca" },
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
  const [tower, fanart, account, daily, top] = await Promise.all([getTowerData(), getFanart(), loadAccount(), getDaily(), hallOfFame(3)]);
  const menu = [
    ...MENU,
    account ? { href: "/conta", label: "Minha conta" } : { href: "/entrar", label: "Entrar" },
    ...(account?.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const sideArt = fanart.gallery.length ? fanart.gallery[Math.floor(Math.random() * fanart.gallery.length)] : null;

  return (
    <html lang="pt-BR" className={`${pixel.variable} ${vt.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY }} />
      </head>
      <body>
        <AccountProvider account={account}>
        <TowerProvider data={tower}>
          <a href="#conteudo" className="skip-link">
            Pular para o conteúdo
          </a>
          <SettingsApplier />
          <StarTrail />
          <KonamiCode />

          <header className="site-header">
            <FlyingCloud />
            <Link href="/" className="banner-link" aria-label="The Korin Tower, página inicial">
              {/* eslint-disable-next-line @next/next/no-img-element -- banner estático em public/ */}
              <img src="/korin-banner.png" alt="The Korin Tower: desafios de programação" className="site-banner" width={2048} height={768} />
            </Link>
            {/* Páginas de editor: só o nome, numa linha, para sobrar tela. */}
            <Link href="/" className="logo-link logo-compact" aria-label="The Korin Tower, página inicial">
              <Gif gif={GIFS.sphere} height={20} />
              <span className="flame logo-text">THE KORIN TOWER</span>
              <Gif gif={GIFS.sphere} height={20} />
            </Link>
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
                <FloorNav />
              </div>
            </nav>

            <main id="conteudo" className="content" tabIndex={-1}>
              {children}
            </main>

            {/* Direita: o jogador e o que muda todo dia. A esquerda fica só com navegação. */}
            <aside className="sidebar sidebar-right" aria-label="Jogador e novidades">
              <div className="side-box">
                <h2 className="side-title">JOGADOR</h2>
                <Gif gif={GIFS.goku} alt="" className="p1-avatar" />
                <p className="p1-name">{account ? account.username : "convidado"}</p>
                <TowerPlayer />
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

              {daily && (
                <div className="side-box">
                  <h2 className="side-title">DESAFIO DO DIA</h2>
                  <p className="side-daily-title">
                    <Link href={`/desafio/${daily.slug}`}>{daily.title}</Link>
                  </p>
                  <p className="side-daily-meta">
                    <Difficulty level={daily.difficulty} /> <span>+{DAILY_BONUS * 100}% hoje</span>
                  </p>
                  <p className="side-action">
                    <Link href={`/desafio/${daily.slug}`} className="btn98 small" aria-label={`Jogar o desafio do dia: ${daily.title}`}>
                      JOGAR <span className="arrow" aria-hidden="true">►</span>
                    </Link>
                  </p>
                </div>
              )}

              <div className="side-box">
                <h2 className="side-title">TOP 3</h2>
                {top.length === 0 ? (
                  <p className="side-empty">ninguém ainda</p>
                ) : (
                  <ol className="side-top">
                    {top.map((e, i) => (
                      <li key={e.username} className={account?.username === e.username ? "me" : undefined}>
                        <span className="side-top-rank">{i + 1}</span>
                        <Link href={`/jogador/${e.username}`}>{e.username}</Link>
                        <span className="side-top-pts">{e.points}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="side-action">
                  <Link href="/hall-da-fama" className="small">
                    Hall of Fame
                  </Link>
                </p>
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
                <h2 className="side-title">BOTOES</h2>
                <ButtonWall className="side-buttons" kinds={["dbz-amazing", "vegeta-alliance", "vim", "cpp", "powered-by-asm", "gnu-linux", "cli", "rss-feed", "any-browser", "8-bit"]} />
              </div>

              <div className="side-box side-misc">
                <VisitCounter />
                <SanityToggle />
              </div>
            </aside>
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
            <ButtonWall kinds={["korin", "guest-book", "netscape-now", "made-with-notepad", "best-viewed-800x600", "web-rings", "y2k-neocities", "open-eyes", "ki"]} />
            <p className="best-viewed">
              Atualizado em {NEWS[0]?.date} · Best viewed in Netscape Navigator 4.0 at 800x600 · © 1998–{new Date().getFullYear()} The Korin Tower ·{" "}
              <Link href="/sobre#botao">linke para cá</Link> · <a href="#conteudo">▲ topo</a>
            </p>
          </footer>
        </TowerProvider>
        </AccountProvider>
      </body>
    </html>
  );
}

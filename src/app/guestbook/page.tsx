import type { Metadata } from "next";
import Link from "next/link";
import { Gif } from "@/components/Gif";
import { PostForm } from "@/components/PostForm";
import { PostList } from "@/components/PostList";
import { FlameTitle, PageBanner, Window } from "@/components/Retro";
import { getCurrentUser } from "@/lib/auth/session";
import { GIFS } from "@/lib/gifs";
import { GUESTBOOK_MAX, GUESTBOOK_PAGE, listGuestbook } from "@/lib/social";
import { deleteGuestbookEntry, signGuestbook } from "./actions";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Guestbook" };

export default async function GuestbookPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const page = Math.max(0, (Number((await searchParams).p) || 1) - 1);
  const me = await getCurrentUser();
  const { entries, total } = await listGuestbook(me, page);
  const pages = Math.max(1, Math.ceil(total / GUESTBOOK_PAGE));

  return (
    <>
      <FlameTitle>LIVRO DE VISITAS</FlameTitle>
      <PageBanner
        image={PAGE_SCENES.guestbook}
        lead="Passou por aqui? Deixe um recado."
        stats={[{ n: total, label: total === 1 ? "recado" : "recados" }]}
        gif={GIFS.gokuStand}
      />
      <Window title="Assine o guestbook">
        <p className="center">
          <Gif gif={GIFS.guestbookButton} alt="Guestbook" /> <Gif gif={GIFS.navCommunity} alt="Community" />
        </p>
        {me ? (
          <PostForm
            action={signGuestbook}
            label="Seu recado:"
            placeholder="Passei por aqui..."
            max={GUESTBOOK_MAX}
            submit="Assinar o livro"
          />
        ) : (
          <p>
            <Link href="/entrar?next=/guestbook">Entre</Link> para assinar.
          </p>
        )}
      </Window>
      <Window title={`Recados (${total})`}>
        <PostList posts={entries} onDelete={deleteGuestbookEntry} empty="Ninguém assinou ainda." />
        {pages > 1 && (
          <nav className="pager" aria-label="Páginas do guestbook">
            {page > 0 && <Link href={`/guestbook?p=${page}`}>◄ Mais novos</Link>}
            <span>
              Página {page + 1} de {pages}
            </span>
            {page + 1 < pages && <Link href={`/guestbook?p=${page + 2}`}>Mais antigos ►</Link>}
          </nav>
        )}
      </Window>
    </>
  );
}

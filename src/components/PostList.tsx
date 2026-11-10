import Link from "next/link";
import type { Post } from "@/lib/social";
import { UserText } from "./UserText";

const WHEN = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

/** Recados do guestbook e comentários: mesmo cartão, com botão de apagar para o autor e para admins. */
export function PostList({ posts, onDelete, empty }: { posts: Post[]; onDelete(id: string): Promise<void>; empty: string }) {
  if (!posts.length) return <p className="dim">{empty}</p>;
  return (
    <ul className="posts">
      {posts.map((p) => (
        <li key={p.id} className="post">
          <div className="post-head">
            <Link href={`/jogador/${p.username}`} className="post-author">
              {p.username}
            </Link>
            <time dateTime={p.createdAt.toISOString()}>{WHEN.format(p.createdAt)}</time>
            {p.mine && (
              <form action={onDelete.bind(null, p.id)}>
                <button type="submit" className="btn98 small" aria-label={`Apagar a mensagem de ${p.username}`}>
                  Apagar
                </button>
              </form>
            )}
          </div>
          <UserText text={p.text} />
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import type React from "react";
import type { Post } from "@/lib/social";
import { FLOORS, floorScene } from "@/lib/tower";
import { UserText } from "./UserText";

/** Cor estável por jogador: o mesmo nome sempre ganha o mesmo matiz (claro o bastante para o fundo escuro). */
function authorHash(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

/** Cenário do cabeçalho: um dos andares da torre, também fixo por jogador. */
const authorScene = (name: string) => floorScene((authorHash(name) % FLOORS) + 1);

const WHEN = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

/** Recados do guestbook e comentários: mesmo cartão, com botão de apagar para o autor e para admins. */
export function PostList({ posts, onDelete, empty }: { posts: Post[]; onDelete(id: string): Promise<void>; empty: string }) {
  if (!posts.length) return <p className="dim">{empty}</p>;
  return (
    <ul className="posts">
      {posts.map((p) => (
        <li key={p.id} className="post" style={{ "--post-hue": authorHash(p.username) % 360 } as React.CSSProperties}>
          <div className="post-head" style={authorScene(p.username)}>
            <span className="post-avatar" aria-hidden="true">
              {[...p.username][0]?.toUpperCase()}
            </span>
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

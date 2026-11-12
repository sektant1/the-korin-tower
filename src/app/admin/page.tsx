import type { Metadata } from "next";
import Link from "next/link";
import { FlameTitle, PageBanner, Window } from "@/components/Retro";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createInviteAction, deleteUser, revokeInvite, setAdmin } from "./actions";
import { PAGE_SCENES } from "@/lib/scenes";
import { GIFS } from "@/lib/gifs";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type Props = { searchParams: Promise<{ salvo?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const me = await requireAdmin();
  const { salvo } = await searchParams;
  const [invites, users, points, challenges] = await Promise.all([
    prisma.invite.findMany({ orderBy: { createdAt: "desc" }, include: { usedBy: { select: { username: true } }, createdBy: { select: { username: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, username: true, isAdmin: true, githubId: true, createdAt: true } }),
    prisma.progress.groupBy({ by: ["userId"], where: { state: "solved" }, _sum: { points: true }, _count: { _all: true } }),
    prisma.challenge.findMany({
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }, { title: "asc" }],
      select: { slug: true, title: true, difficulty: true, sourceDir: true, category: { select: { name: true } }, _count: { select: { tests: true } } },
    }),
  ]);
  const score = new Map(points.map((p) => [p.userId, p]));
  const now = new Date();
  const open = invites.filter((i) => !i.usedById && !(i.expiresAt && i.expiresAt < now));
  const closed = invites.filter((i) => !open.includes(i));

  return (
    <>
      <FlameTitle>PAINEL DO MESTRE KARIN</FlameTitle>
      <PageBanner image={PAGE_SCENES.admin} lead="Convites e desafios." gif={GIFS.vegeta} gifHeight={100} />
      {salvo && (
        <p className="pass center" role="status">
          [OK] Desafio <Link href={`/desafio/${salvo}`}>{salvo}</Link> salvo.
        </p>
      )}

      <Window title={`Convites (${open.length} disponíveis)`}>
        <form action={createInviteAction} className="admin-inline">
          <label className="check98">
            <input type="checkbox" name="isAdmin" /> vira admin
          </label>
          <label>
            vence em{" "}
            <select name="days" className="select98" defaultValue="7">
              <option value="1">1 dia</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="0">nunca</option>
            </select>
          </label>
          <button type="submit" className="btn98 primary">
            Gerar convite
          </button>
        </form>
        {open.length > 0 && (
          <div className="table-scroll"><table className="table98">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Tipo</th>
                <th scope="col">Vence</th>
                <th scope="col">Link</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {open.map((i) => (
                <tr key={i.code}>
                  <td>
                    <code className="select-all">{i.code}</code>
                  </td>
                  <td>{i.isAdmin ? "admin" : "jogador"}</td>
                  <td>{i.expiresAt ? i.expiresAt.toLocaleDateString("pt-BR") : "nunca"}</td>
                  <td>
                    <code className="select-all small">/entrar?convite={i.code}</code>
                  </td>
                  <td>
                    <form action={revokeInvite.bind(null, i.code)}>
                      <button type="submit" className="btn98 small">
                        Revogar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {closed.length > 0 && (
          <details>
            <summary>Usados ou vencidos ({closed.length})</summary>
            <ul className="small">
              {closed.map((i) => (
                <li key={i.code}>
                  <code>{i.code}</code> {i.usedBy ? `usado por ${i.usedBy.username} em ${i.usedAt?.toLocaleDateString("pt-BR")}` : "vencido"}
                  {i.createdBy && <span className="dim"> · criado por {i.createdBy.username}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Window>

      <Window title={`Jogadores (${users.length})`}>
        <div className="table-scroll"><table className="table98">
          <thead>
            <tr>
              <th scope="col">Usuário</th>
              <th scope="col">Pontos</th>
              <th scope="col">Resolvidos</th>
              <th scope="col">Login</th>
              <th scope="col">Desde</th>
              <th scope="col">Papel</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = score.get(u.id);
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    {u.username}
                    {self && <span className="dim"> (você)</span>}
                  </td>
                  <td>{s?._sum.points ?? 0}</td>
                  <td>{s?._count._all ?? 0}</td>
                  <td>{u.githubId ? "GitHub" : "senha"}</td>
                  <td>{u.createdAt.toLocaleDateString("pt-BR")}</td>
                  <td>
                    {self ? (
                      "admin"
                    ) : (
                      <form action={setAdmin.bind(null, u.id, !u.isAdmin)}>
                        <button type="submit" className="btn98 small" title={u.isAdmin ? "Tirar admin" : "Tornar admin"}>
                          {u.isAdmin ? "admin ▼" : "jogador ▲"}
                        </button>
                      </form>
                    )}
                  </td>
                  <td>
                    {!self && (
                      <form action={deleteUser.bind(null, u.id)} className="admin-inline">
                        <label className="check98 small">
                          <input type="checkbox" name="confirm" required /> confirmar
                        </label>
                        <button type="submit" className="btn98 small">
                          Apagar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </Window>

      <Window title={`Desafios (${challenges.length})`}>
        <p>
          <Link href="/admin/desafios/novo" className="btn98 primary">
            + Novo desafio
          </Link>
        </p>
        <p className="dim small">
          Desafios de <code>/challenges</code> são editados no repositório (<code>npm run seed</code> importa). Os criados aqui ficam só no banco
          e podem ser editados nesta página. Se um slug criado aqui aparecer depois em <code>/challenges</code>, o seed sobrescreve.
        </p>
        <div className="table-scroll"><table className="table98">
          <thead>
            <tr>
              <th scope="col">Desafio</th>
              <th scope="col">Categoria</th>
              <th scope="col">Dif.</th>
              <th scope="col">Testes</th>
              <th scope="col">Origem</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((c) => (
              <tr key={c.slug}>
                <td>
                  <Link href={`/desafio/${c.slug}`}>{c.title}</Link>
                </td>
                <td>{c.category.name}</td>
                <td>{c.difficulty}</td>
                <td>{c._count.tests}</td>
                <td>
                  {c.sourceDir ? (
                    <code className="small">{c.sourceDir}</code>
                  ) : (
                    <Link href={`/admin/desafios/${c.slug}`} className="btn98 small">
                      Editar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Window>
    </>
  );
}

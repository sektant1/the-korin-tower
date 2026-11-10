import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { githubConfig, OAUTH_COOKIE, OAUTH_PATH, usernameFromGithub } from "@/lib/auth/github";
import { createUserWithInvite, InviteError } from "@/lib/auth/invites";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Config = NonNullable<ReturnType<typeof githubConfig>>;

// APP_URL, e não req.url: atrás do proxy reverso o host da requisição pode ser o interno.
const back = (path: string) => NextResponse.redirect(new URL(path, process.env.APP_URL));
const fail = (msg: string) => back(`/entrar?erro=${encodeURIComponent(msg)}`);

function sameState(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function githubUser(code: string, cfg: Config): Promise<{ id: string; login: string } | null> {
  const tok = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: cfg.id, client_secret: cfg.secret, code, redirect_uri: cfg.redirectUri }),
  }).then((r) => r.json());
  if (typeof tok.access_token !== "string") return null;
  const res = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${tok.access_token}`, accept: "application/vnd.github+json", "user-agent": "the-korin-tower" },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return typeof u.id === "number" && typeof u.login === "string" ? { id: String(u.id), login: u.login } : null;
}

export async function GET(req: Request) {
  const cfg = githubConfig();
  if (!cfg) return NextResponse.json({ error: "login com GitHub não configurado" }, { status: 404 });
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: OAUTH_PATH });

  let saved: { state?: unknown; invite?: unknown } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    /* cookie adulterado: cai no erro abaixo */
  }
  const params = new URL(req.url).searchParams;
  const code = params.get("code");
  if (!code || typeof saved.state !== "string" || !sameState(params.get("state") ?? "", saved.state)) {
    return fail("o login com GitHub expirou; tente de novo");
  }

  let gh: Awaited<ReturnType<typeof githubUser>> = null;
  try {
    gh = await githubUser(code, cfg);
  } catch (e) {
    console.error("[github]", e);
  }
  if (!gh) return fail("o GitHub não confirmou o login");

  // 1) conta já ligada a esse GitHub: entra.
  const linked = await prisma.user.findUnique({ where: { githubId: gh.id }, select: { id: true } });
  if (linked) {
    await startSession(linked.id);
    return back("/");
  }
  // 2) já logado (com senha): liga o GitHub à conta atual.
  const current = await getCurrentUser();
  if (current) {
    await prisma.user.update({ where: { id: current.id }, data: { githubId: gh.id } });
    return back("/conta");
  }
  // 3) conta nova: precisa de convite.
  if (typeof saved.invite !== "string" || !saved.invite) return fail("essa conta GitHub não tem cadastro: informe um código de convite");
  let username = usernameFromGithub(gh.login);
  if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    username = `${username.slice(0, 15)}-${gh.id.slice(-4)}`;
  }
  try {
    const user = await createUserWithInvite(saved.invite, { username, githubId: gh.id });
    await startSession(user.id);
  } catch (e) {
    if (e instanceof InviteError) return fail(e.message);
    throw e;
  }
  return back("/");
}

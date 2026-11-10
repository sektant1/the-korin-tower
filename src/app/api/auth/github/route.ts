import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { githubConfig, OAUTH_COOKIE, OAUTH_PATH } from "@/lib/auth/github";
import { normalizeInvite } from "@/lib/auth/invites";

// GET /api/auth/github?invite=KORIN-...  → manda para o GitHub.
// O convite só é usado se essa conta GitHub ainda não estiver cadastrada.
export async function GET(req: Request) {
  const cfg = githubConfig();
  if (!cfg) return NextResponse.json({ error: "login com GitHub não configurado" }, { status: 404 });
  const state = randomBytes(16).toString("base64url");
  const invite = normalizeInvite(new URL(req.url).searchParams.get("invite"));
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, invite }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: OAUTH_PATH,
    maxAge: 600,
  });
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", cfg.id);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

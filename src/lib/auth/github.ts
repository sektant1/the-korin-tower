import "server-only";

// Login com GitHub (OAuth App). Opcional: só aparece com as três variáveis definidas.
export function githubConfig() {
  const { GITHUB_CLIENT_ID: id, GITHUB_CLIENT_SECRET: secret, APP_URL: appUrl } = process.env;
  if (!id || !secret || !appUrl) return null;
  return { id, secret, redirectUri: `${appUrl.replace(/\/$/, "")}/api/auth/github/callback` };
}

export const OAUTH_COOKIE = "korin_oauth";
export const OAUTH_PATH = "/api/auth/github";

/** login do GitHub → nome válido aqui: minúsculo, só [a-z0-9_-], 3 a 20 caracteres. */
export function usernameFromGithub(login: string): string {
  const base = login.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
  return base.length >= 3 ? base : `gh-${base}`;
}

// Hash de senha com scrypt (node:crypto), sem dependência extra.
// Formato salvo: scrypt$N$r$p$salt(base64)$hash(base64)
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))));

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const got = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// Hash fixo para gastar o mesmo tempo quando o usuário não existe (não revela quem existe).
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  return (dummy ??= hashPassword("korin-dummy-password"));
}

export const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export function normalizeUsername(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** Retorna a mensagem de erro, ou null se estiver ok. */
export function checkCredentials(username: string, password: unknown): string | null {
  if (!USERNAME_RE.test(username)) return "nome de usuário: 3 a 20 caracteres, só a-z, 0-9, _ e -";
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return `senha precisa de pelo menos ${PASSWORD_MIN} caracteres`;
  if (password.length > PASSWORD_MAX) return "senha longa demais";
  return null;
}

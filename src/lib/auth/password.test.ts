import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCredentials, hashPassword, normalizeUsername, verifyPassword } from "./password";

test("hash e verificação de senha", async () => {
  const h = await hashPassword("kamehameha123");
  assert.match(h, /^scrypt\$/);
  assert.equal(await verifyPassword("kamehameha123", h), true);
  assert.equal(await verifyPassword("kamehameha124", h), false);
  assert.notEqual(await hashPassword("kamehameha123"), h, "salt aleatório");
});

test("hash corrompido não verifica", async () => {
  assert.equal(await verifyPassword("x", "lixo"), false);
  assert.equal(await verifyPassword("x", "bcrypt$1$2$3$abc$def"), false);
});

test("validação de credenciais", () => {
  assert.equal(normalizeUsername("  Goku_99 "), "goku_99");
  assert.equal(checkCredentials("goku", "12345678"), null);
  assert.ok(checkCredentials("go", "12345678"));
  assert.ok(checkCredentials("goku!", "12345678"));
  assert.ok(checkCredentials("goku", "1234567"));
  assert.ok(checkCredentials("goku", undefined));
});

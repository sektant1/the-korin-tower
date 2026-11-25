import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { getAchievement } from "./achievements";
import { AVATARS, avatarsUnlockedBy, DEFAULT_AVATAR_ID, getAvatar, isAvatarUnlocked, unlockHint } from "./avatars";

const nobody = { achievements: new Set<string>(), isAdmin: false };

test("ids únicos e o padrão é livre", () => {
  assert.equal(new Set(AVATARS.map((a) => a.id)).size, AVATARS.length);
  const def = getAvatar(DEFAULT_AVATAR_ID);
  assert.equal(def.id, DEFAULT_AVATAR_ID);
  assert.equal(def.unlock.kind, "free");
});

test("todo avatar aponta para um GIF que existe e para uma conquista que existe", () => {
  for (const a of AVATARS) {
    assert.ok(existsSync(`public${a.gif.src}`), `${a.id}: ${a.gif.src}`);
    if (a.unlock.kind === "achievement") assert.ok(getAchievement(a.unlock.id), `${a.id}: conquista ${a.unlock.id}`);
  }
});

test("id desconhecido ou nulo cai no padrão", () => {
  assert.equal(getAvatar(null).id, DEFAULT_AVATAR_ID);
  assert.equal(getAvatar("nao-existe").id, DEFAULT_AVATAR_ID);
});

test("liberação por conquista, admin e livre", () => {
  const vegeta = getAvatar("vegeta");
  assert.ok(!isAvatarUnlocked(vegeta, nobody));
  assert.ok(isAvatarUnlocked(vegeta, { achievements: new Set(["ki-9000"]), isAdmin: false }));
  const admin = AVATARS.find((a) => a.unlock.kind === "admin")!;
  assert.ok(!isAvatarUnlocked(admin, nobody));
  assert.ok(isAvatarUnlocked(admin, { ...nobody, isAdmin: true }));
  assert.ok(AVATARS.filter((a) => a.unlock.kind === "free").every((a) => isAvatarUnlocked(a, nobody)));
});

test("toast e dica de liberação", () => {
  assert.deepEqual(avatarsUnlockedBy("ki-9000").map((a) => a.id), ["vegeta"]);
  assert.equal(unlockHint(getAvatar("vegeta")), 'conquista "É Mais de 8000!"');
  // segredo não entrega a regra
  assert.equal(unlockHint(getAvatar("kamehameha-goku")), "conquista secreta");
  assert.equal(unlockHint(getAvatar("goku")), "");
});

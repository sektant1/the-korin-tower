import assert from "node:assert/strict";
import { test } from "node:test";
import { BADGES, earnedBadges, type BadgeStats } from "./badges";

const empty: BadgeStats = { solved: [], points: 0, tracksDone: 0, guestbookSigned: false, comments: 0, bestStreak: 0, records: 0 };
const ids = (s: BadgeStats) => earnedBadges(s).map((b) => b.id);

test("jogador novo não tem medalhas", () => {
  assert.deepEqual(ids(empty), []);
});

test("ids únicos", () => {
  assert.equal(new Set(BADGES.map((b) => b.id)).size, BADGES.length);
});

test("medalhas de progresso", () => {
  const solve = (categoryId: string, difficulty: number, hintsRevealed = 0, dailyBonus = false) => ({ categoryId, difficulty, hintsRevealed, dailyBonus });
  assert.deepEqual(ids({ ...empty, solved: [solve("c", 1)] }), ["primeiro-andar"]);
  // Dificuldade 3 com dica não dá "sem senzu"; sem dica dá.
  assert.ok(!ids({ ...empty, solved: [solve("c", 3, 1)] }).includes("sem-senzu"));
  assert.ok(ids({ ...empty, solved: [solve("c", 3)] }).includes("sem-senzu"));
  const many = ids({ ...empty, points: 1200, solved: [solve("c", 5), solve("cpp", 1), solve("rust", 1, 0, true), ...Array(4).fill(solve("c", 1, 2))] });
  for (const id of ["sete-esferas", "boss", "poliglota", "ki-1000", "desafio-do-dia"]) assert.ok(many.includes(id), id);
});

test("medalhas sociais e de sequência", () => {
  assert.deepEqual(ids({ ...empty, guestbookSigned: true, comments: 3, tracksDone: 1, bestStreak: 7, records: 1 }), [
    "detonado",
    "livro-de-visitas",
    "comentarista",
    "treino-diario",
    "sala-do-tempo",
    "recordista",
  ]);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { ACHIEVEMENTS, activeAchievements, earnedAchievementIds, isEventAchievement, type AchievementStats, type SolvedStat } from "./achievements";
import { siteHour } from "./dates";

const empty: AchievementStats = { solved: [], points: 0, tracksDone: 0, guestbookSigned: false, comments: 0, bestStreak: 0, records: 0, floorsOpen: 1 };
const ids = (s: AchievementStats) => earnedAchievementIds(s);
const solve = (categoryId: string, difficulty: number, hintsRevealed = 0, dailyBonus = false, hour: number | null = 14): SolvedStat => ({
  categoryId,
  difficulty,
  hintsRevealed,
  dailyBonus,
  hour,
});

test("jogador novo não tem conquistas", () => {
  assert.deepEqual(ids(empty), []);
});

test("ids únicos, em kebab-case, e toda conquista tem regra ou é de evento", () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) {
    assert.match(a.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, a.id);
    assert.ok(a.icon.length >= 1 && a.icon.length <= 3, `${a.id}: selo de 1 a 3 caracteres`);
  }
  assert.deepEqual(
    ACHIEVEMENTS.filter((a) => !a.earned).map((a) => a.id),
    ["konami"],
  );
});

test("conquistas de desafios", () => {
  assert.deepEqual(ids({ ...empty, solved: [solve("c", 1)] }), ["primeiro-andar"]);
  // Dificuldade 3 com dica não dá "sem senzu"; sem dica dá.
  assert.ok(!ids({ ...empty, solved: [solve("c", 3, 1)] }).includes("sem-senzu"));
  assert.ok(ids({ ...empty, solved: [solve("c", 3)] }).includes("sem-senzu"));
  const many = ids({ ...empty, points: 1200, solved: [solve("c", 5), solve("cpp", 1), solve("rust", 1, 0, true), ...Array(4).fill(solve("c", 1, 2))] });
  for (const id of ["sete-esferas", "boss", "poliglota", "ki-1000", "desafio-do-dia"]) assert.ok(many.includes(id), id);
  assert.ok(!many.includes("ki-9000"));
  assert.ok(ids({ ...empty, points: 8001 }).includes("ki-9000"), "mais de 8000");
  assert.ok(!ids({ ...empty, points: 8000 }).includes("ki-9000"), "8000 não é mais de 8000");
});

test("andares da torre", () => {
  assert.deepEqual(ids({ ...empty, floorsOpen: 2 }), ["andar-2"]);
  assert.deepEqual(ids({ ...empty, floorsOpen: 5 }), ["andar-2", "andar-3", "andar-5"]);
  assert.ok(ids({ ...empty, floorsOpen: 8 }).includes("topo"));
});

test("conquistas sociais e de sequência", () => {
  const got = ids({ ...empty, guestbookSigned: true, comments: 3, tracksDone: 1, bestStreak: 7, records: 1 });
  assert.deepEqual(got, ["recordista", "detonado", "treino-diario", "sala-do-tempo", "livro-de-visitas", "comentarista"]);
});

test("coruja: resolver entre 0h e 5h (Brasília)", () => {
  assert.ok(ids({ ...empty, solved: [solve("c", 1, 0, false, 3)] }).includes("coruja"));
  assert.ok(!ids({ ...empty, solved: [solve("c", 1, 0, false, 5)] }).includes("coruja"));
  assert.ok(!ids({ ...empty, solved: [solve("c", 1, 0, false, null)] }).includes("coruja"));
  // 06:30 UTC = 03:30 em Brasília
  assert.equal(siteHour(new Date("2026-11-25T06:30:00Z")), 3);
});

test("conquistas de evento não saem das estatísticas", () => {
  assert.ok(isEventAchievement("konami"));
  assert.ok(!isEventAchievement("primeiro-andar"));
  assert.ok(!isEventAchievement("nao-existe"));
});

test("conquista de trilha some com as trilhas desligadas", () => {
  assert.ok(activeAchievements({ tracks: true }).some((a) => a.id === "detonado"));
  assert.ok(!activeAchievements({ tracks: false }).some((a) => a.id === "detonado"));
});

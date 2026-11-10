import assert from "node:assert/strict";
import { test } from "node:test";
import { computeStreak, previousDay, siteDay } from "./dates";

test("siteDay usa o fuso de Brasília", () => {
  // 02:00 UTC ainda é o dia anterior em Brasília (UTC-3).
  assert.equal(siteDay(new Date("2026-11-10T02:00:00Z")), "2026-11-09");
  assert.equal(siteDay(new Date("2026-11-10T03:00:00Z")), "2026-11-10");
});

test("previousDay atravessa mês e ano", () => {
  assert.equal(previousDay("2026-03-01"), "2026-02-28");
  assert.equal(previousDay("2027-01-01"), "2026-12-31");
});

test("computeStreak", () => {
  assert.deepEqual(computeStreak([], "2026-11-10"), { current: 0, best: 0 });
  // Hoje ainda sem resolver: a sequência até ontem continua valendo.
  assert.deepEqual(computeStreak(["2026-11-08", "2026-11-09", "2026-11-09"], "2026-11-10"), { current: 2, best: 2 });
  assert.deepEqual(computeStreak(["2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-10"), { current: 3, best: 3 });
  // Quebrou anteontem: a atual zera, a melhor fica.
  assert.deepEqual(computeStreak(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-07"], "2026-11-10"), { current: 0, best: 3 });
});

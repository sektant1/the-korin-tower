import assert from "node:assert/strict";
import { test } from "node:test";
import { pointsFor } from "./scoring";

test("pontos por dificuldade e dicas", () => {
  assert.equal(pointsFor(3, 0, false), 300);
  assert.equal(pointsFor(3, 1, false), 240);
  assert.equal(pointsFor(5, 2, false), 300);
  assert.equal(pointsFor(5, 10, false), 100, "piso de 20%");
  assert.equal(pointsFor(5, 0, true), 0, "desistiu não pontua");
  assert.equal(pointsFor(3, 0, false, true), 450, "desafio do dia: +50%");
  assert.equal(pointsFor(3, 1, false, true), 360, "bônus do dia vem depois da penalidade das dicas");
  assert.equal(pointsFor(3, 0, true, true), 0, "desistiu não pontua nem no desafio do dia");
});

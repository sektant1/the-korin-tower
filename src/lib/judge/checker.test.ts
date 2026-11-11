import { test } from "node:test";
import assert from "node:assert/strict";
import { check, normalizeOutput } from "./checker";

test("normalizeOutput ignora CRLF, espaços finais e linhas vazias finais", () => {
  assert.equal(normalizeOutput("a  \r\nb\r\n\r\n"), "a\nb");
});

test("exact compara saída normalizada", () => {
  assert.equal(check({ type: "exact" }, "1\n2\n", "1\r\n2").passed, true);
  assert.equal(check({ type: "exact" }, "1\n2\n", "1\n3\n").passed, false);
});

const ppm = (px: number[]) => `P3\n2 1\n255\n${px.join(" ")}\n`;

test("ppm aceita diferenças dentro da tolerância", () => {
  const r = check({ type: "ppm", tolerance: 2, maxBadRatio: 0 }, ppm([10, 10, 10, 200, 200, 200]), ppm([11, 9, 12, 200, 200, 200]));
  assert.equal(r.passed, true);
});

test("ppm rejeita pixel fora da tolerância e dimensão errada", () => {
  const c = { type: "ppm", tolerance: 2, maxBadRatio: 0 } as const;
  assert.equal(check(c, ppm([10, 10, 10, 0, 0, 0]), ppm([50, 10, 10, 0, 0, 0])).passed, false);
  assert.equal(check(c, ppm([0, 0, 0, 0, 0, 0]), "P3\n1 1\n255\n0 0 0").passed, false);
  assert.equal(check(c, ppm([0, 0, 0, 0, 0, 0]), "hello").passed, false);
});

test("ppm respeita maxBadRatio", () => {
  const c = { type: "ppm", tolerance: 0, maxBadRatio: 0.5 } as const;
  assert.equal(check(c, ppm([0, 0, 0, 0, 0, 0]), ppm([9, 0, 0, 0, 0, 0])).passed, true);
});

test("exact parcial confere só o prefixo e descarta a última linha cortada", () => {
  const exp = "1\n2\nFizz\n4\nBuzz\n";
  assert.equal(check({ type: "exact" }, exp, "1\n2\nFi", { partial: true }).passed, true);
  assert.equal(check({ type: "exact" }, exp, "1\n2\nFizz\n4\nBu", { partial: true }).passed, true);
  assert.equal(check({ type: "exact" }, exp, "1\n3\nFi", { partial: true }).passed, false);
  // "12" é prefixo da string "123", mas não é uma linha inteira igual
  assert.equal(check({ type: "exact" }, "123\n4\n", "12\nx", { partial: true }).passed, false);
});

test("ppm parcial compara só os pixels inteiros que chegaram", () => {
  const c = { type: "ppm", tolerance: 2, maxBadRatio: 0 } as const;
  const full = "P3\n2 2\n255\n10 10 10 20 20 20 30 30 30 40 40 40\n";
  assert.equal(check(c, full, "P3\n2 2\n255\n10 10 10 20 20 20 30 3", { partial: true }).passed, true);
  assert.equal(check(c, full, "P3\n2 2\n255\n10 10 10 99 20 20 30 3", { partial: true }).passed, false);
  assert.equal(check(c, full, "P3\n2 2\n255\n10 10 10 20 20 20 30 3").passed, false); // sem partial: PPM incompleto
});

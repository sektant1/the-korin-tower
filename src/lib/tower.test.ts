import assert from "node:assert/strict";
import { test } from "node:test";
import { currentFloor, floors, isOpen, lockInfo, nextStep, tracksDone, type TowerData } from "./tower";

const ch = (slug: string, difficulty: number, kind: "stdio" | "shader" = "stdio") => ({ slug, title: slug, difficulty, kind, categoryId: "c", categoryName: "C" });
const data: TowerData = {
  challenges: [
    ch("a1", 1), ch("b1", 1), ch("s1", 1, "shader"),
    ch("a2", 2), ch("b2", 2), ch("c2", 2),
    ch("a3", 3), ch("b3", 3),
    ch("a4", 4),
  ],
  tracks: [{ id: "t", title: "T", steps: ["a1", "a3"] }],
  daily: "b3",
};

test("andar 1 aberto, resto trancado; detonado e desafio do dia abrem exceções", () => {
  assert.equal(currentFloor(data, {}), 1);
  assert.ok(isOpen(data, {}, "a1"));
  assert.ok(isOpen(data, {}, "s1"));
  assert.ok(!isOpen(data, {}, "a2"));
  assert.ok(isOpen(data, {}, "b3"), "desafio do dia");
  assert.ok(!isOpen(data, {}, "a3"), "a3 é o 2º passo do detonado; a1 ainda não foi feito");
  assert.ok(isOpen(data, { a1: "solved" }, "a3"), "próximo passo do detonado abre");
  assert.ok(!isOpen(data, { a1: "solved", a3: "solved" }, "a4"), "andar 4 segue trancado: o 2 não foi feito");
});

test("resolver o mínimo do andar abre o de cima; andares abrem em sequência", () => {
  // Na fixture todo andar tem menos que NEED_PER_FLOOR: o mínimo vira "todos os que têm testes".
  const p = { a1: "solved", b1: "solved" } as const;
  assert.equal(currentFloor(data, p), 2);
  assert.ok(isOpen(data, p, "c2"));
  // Resolver a3 pelo detonado não abre o andar 4 enquanto o 2 não estiver feito.
  const p2 = { ...p, a3: "solved" } as const;
  assert.equal(currentFloor(data, p2), 2);
  assert.deepEqual(lockInfo(data, p2, "a4"), { floor: 4, from: 2, missing: 3 });
  assert.equal(lockInfo(data, p2, "a1"), null);
});

test("andar com menos desafios que o mínimo abre com todos", () => {
  const p = { a1: "solved", b1: "solved", a2: "solved", b2: "solved", c2: "solved", a3: "solved", b3: "solved" } as const;
  assert.equal(currentFloor(data, p), 4);
  const f = floors(data, p);
  assert.equal(f[3].missingForNext, 1); // andar 4 tem só 1 com testes: precisa dele para o topo
  assert.equal(currentFloor(data, { ...p, a4: "solved" }), 5);
});

test("próximo passo: continua o detonado começado, senão o andar atual", () => {
  assert.deepEqual(nextStep(data, {}), { slug: "a1", trackId: null, reason: "floor" });
  assert.deepEqual(nextStep(data, { a1: "solved" }), { slug: "a3", trackId: "t", reason: "track" });
  assert.deepEqual(nextStep(data, { a1: "solved", a3: "solved" }), { slug: "b1", trackId: null, reason: "floor" });
  assert.deepEqual(nextStep(data, { a1: "solved" }, { trackId: "t", after: "a1" }), { slug: "a3", trackId: "t", reason: "track" });
});

test("esferas: uma por detonado zerado", () => {
  assert.equal(tracksDone(data, {}), 0);
  assert.equal(tracksDone(data, { a1: "solved", a3: "solved" }), 1);
});

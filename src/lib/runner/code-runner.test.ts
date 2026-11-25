import assert from "node:assert/strict";
import { test } from "node:test";
import { outputSha256 } from "@/lib/judge/hash";
import { createCodeRunner, DeadlineError, perTestLimit, withHarness } from "./code-runner";
import type { Engine, EngineRequest, EngineResult, RawRun } from "./types";

const ok = (stdout: string, extra: Partial<RawRun> = {}): RawRun => ({ stdout, stderr: "", exitCode: 0, timeMs: 5, timedOut: false, outputTruncated: false, ...extra });

/** Engine falso: "executa" cada stdin com a função dada. */
function fake(fn: (req: EngineRequest, stdin: string) => RawRun | null, compile = { ok: true, output: "" }): Engine & { calls: EngineRequest[] } {
  const calls: EngineRequest[] = [];
  return {
    name: "fake",
    calls,
    async execute(req): Promise<EngineResult> {
      calls.push(req);
      return compile.ok ? { compile, runs: req.stdins.map((s) => fn(req, s)) } : { compile, runs: [] };
    },
  };
}

test("io: AC, WA, RE, TLE e OLE", async () => {
  const engine = fake((_r, s) => {
    if (s === "ac") return ok("42\n");
    if (s === "wa") return ok("41\n");
    if (s === "re") return ok("", { exitCode: 139 });
    if (s === "tle") return ok("", { timedOut: true });
    return ok("", { outputTruncated: true });
  });
  const r = await createCodeRunner({ c: engine }).runAndTest("int main(){}", "c", ["ac", "wa", "re", "tle", "ole"].map((n) => ({ name: n, input: n, expected: "42", hidden: false })));
  assert.equal(r.compile.ok, true);
  assert.deepEqual(r.tests.map((t) => t.verdict), ["AC", "WA", "RE", "TLE", "OLE"]);
  assert.equal(r.allPassed, false);
  assert.equal(engine.calls.length, 1, "um binário para todos os testes de entrada/saída");
});

test("io: oculto julgado pelo hash", async () => {
  const sha = await outputSha256("ok");
  const r = await createCodeRunner({ python: fake(() => ok("ok\n")) }).runAndTest("print('ok')", "python", [{ name: "h", input: "", expected: "", expectedSha256: sha, hidden: true }]);
  assert.equal(r.tests[0].verdict, "AC");
});

test("erro de compilação não roda nada", async () => {
  const r = await createCodeRunner({ cpp: fake(() => ok(""), { ok: false, output: "main.cpp:1:1: error" }) }).runAndTest("x", "cpp", [{ name: "a", input: "", expected: "", hidden: false }]);
  assert.equal(r.compile.ok, false);
  assert.deepEqual(r.tests, []);
});

test("unitário: harness anexado, assert vira WA e crash vira RE", async () => {
  const engine = fake((req) => (req.source.includes("FALHA") ? ok("", { exitCode: 134, stderr: "main: tests.c:3: assert failed" }) : req.source.includes("CRASH") ? ok("", { exitCode: 139 }) : ok("")));
  const runner = createCodeRunner({ c: engine });
  const r = await runner.runAndTest("int soma(int a,int b){return a+b;}", "c", [
    { kind: "unit", name: "passa", harness: "int main(){return 0;}", hidden: false },
    { kind: "unit", name: "falha", harness: "/* FALHA */ int main(){}", hidden: false },
    { kind: "unit", name: "crash", harness: "/* CRASH */ int main(){}", hidden: true },
  ]);
  assert.deepEqual(r.tests.map((t) => t.verdict), ["AC", "WA", "RE"]);
  assert.match(r.tests[1].message ?? "", /assert failed/);
  assert.equal(engine.calls.length, 3, "cada unitário é um programa próprio");
  assert.match(engine.calls[0].source, /#line 1 "tests\.c"/);
});

test("withHarness: Python e Rust só concatenam", () => {
  assert.equal(withHarness("python", "def f(): pass", "assert f() is None"), "def f(): pass\nassert f() is None");
  assert.equal(withHarness("rust", "fn f() {}\n", "fn main() { f() }"), "fn f() {}\nfn main() { f() }");
});

test("limite por teste: fator da linguagem, nunca acima do prazo global", () => {
  assert.equal(perTestLimit("c", 1000), 1000);
  assert.equal(perTestLimit("python", 1000), 3000);
  assert.equal(perTestLimit("python", 2000), 5000);
});

test("prazo global: o que não rodou vira TLE e sai aviso", async () => {
  const engine: Engine = {
    name: "lento",
    execute: (req) =>
      new Promise((resolve) => {
        req.signal.addEventListener("abort", () => resolve({ compile: { ok: true, output: "" }, runs: [ok("1"), null] }));
      }),
  };
  const r = await createCodeRunner({ rust: engine }, { deadlineMs: 50 }).runAndTest("fn main(){}", "rust", [
    { name: "a", input: "", expected: "1", hidden: false },
    { name: "b", input: "", expected: "1", hidden: false },
  ]);
  assert.deepEqual(r.tests.map((t) => t.verdict), ["AC", "TLE"]);
  assert.equal(r.warnings.length, 1);
});

test("prazo global estourado antes de compilar vira DeadlineError", async () => {
  const engine: Engine = {
    name: "travado",
    execute: (req) => new Promise((_resolve, reject) => req.signal.addEventListener("abort", () => reject(req.signal.reason))),
  };
  await assert.rejects(createCodeRunner({ c: engine }, { deadlineMs: 30 }).run("int main(){}", "c", ""), DeadlineError);
});

test("preload do motor acontece antes do prazo começar a contar", async () => {
  let booted = false;
  const engine: Engine = {
    name: "frio",
    preload: () => new Promise((r) => setTimeout(() => ((booted = true), r()), 80)),
    execute: async (req) => {
      assert.ok(booted);
      return { compile: { ok: true, output: "" }, runs: req.stdins.map(() => ok("x")) };
    },
  };
  const r = await createCodeRunner({ python: engine }, { deadlineMs: 50 }).run("print('x')", "python", "");
  assert.equal(r.tests[0].stdout, "x");
});

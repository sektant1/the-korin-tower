import assert from "node:assert/strict";
import { test } from "node:test";
import type { BatchRequest, Runner } from "@/lib/runner/types";
import { outputSha256 } from "./hash";
import { judge } from "./judge";

// Runner falso: devolve o stdin em maiúsculas.
const upper: Runner = {
  name: "fake",
  async runBatch(req: BatchRequest) {
    return {
      compile: { ok: true, output: "" },
      runs: req.inputs.map((i) => ({ stdout: i.toUpperCase(), stderr: "", exitCode: 0, signal: null, timeMs: 1, memoryKb: 1, timedOut: false, outputTruncated: false })),
    };
  },
};
const limits = { checker: { type: "exact" as const }, timeLimitMs: 1000, memoryLimitMb: 64 };

test("teste oculto com hash: compara a saída normalizada sem conhecer a resposta", async () => {
  const hash = await outputSha256("ABC\n");
  const r = await judge(upper, limits, "c", "", [
    { name: "ok", input: "abc  \r\n", expected: "", hidden: true, expectedSha256: hash },
    { name: "errado", input: "xyz", expected: "", hidden: true, expectedSha256: hash },
    { name: "vazio", input: "", expected: "", hidden: true, expectedSha256: hash },
  ]);
  assert.deepEqual(r.tests.map((t) => t.verdict), ["AC", "WA", "WA"]);
  assert.equal(r.allPassed, false);
});

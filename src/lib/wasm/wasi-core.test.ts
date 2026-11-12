import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectWasm, runWasi, wasmProblem } from "./wasi-core.mjs";
import { WasiPool } from "./pool";
import { WasmModuleRunner, spawnNodeWasiWorker } from "@/lib/runner/wasm";

// Montador de bolso: módulos WebAssembly escritos à mão, byte a byte, para
// testar o executor sem depender do clang do navegador.
const leb = (n: number): number[] => {
  const out: number[] = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return out;
};
const str = (s: string) => [...leb(s.length), ...new TextEncoder().encode(s)];
const vec = (items: number[][]) => [...leb(items.length), ...items.flat()];
const section = (id: number, body: number[]) => [id, ...leb(body.length), ...body];
const I32 = 0x7f;
const fnType = (params: number[], results: number[]) => [0x60, ...vec(params.map((p) => [p])), ...vec(results.map((r) => [r]))];
const I32_CONST = (n: number) => [0x41, ...leb(n)];
const CALL = (i: number) => [0x10, ...leb(i)];
const DROP = 0x1a;
const END = 0x0b;
const UNREACHABLE = 0x00;
const I32_LOAD = [0x28, 2, 0];
const I32_STORE = [0x36, 2, 0];

interface ModuleSpec {
  imports: { name: string; type: number }[];
  memory: { min: number; max: number | null };
  data: number[];
  body: number[];
}

/** Módulo com os tipos (i32,i32,i32,i32)->i32 [0], (i32)->() [1] e ()->() [2], uma função `_start` e a memória exportada. */
function assemble(spec: ModuleSpec): Uint8Array<ArrayBuffer> {
  const types = section(1, vec([fnType([I32, I32, I32, I32], [I32]), fnType([I32], []), fnType([], [])]));
  const imports = section(2, vec(spec.imports.map((i) => [...str("wasi_snapshot_preview1"), ...str(i.name), 0x00, ...leb(i.type)])));
  const funcs = section(3, vec([[2]]));
  const limits = spec.memory.max === null ? [0x00, ...leb(spec.memory.min)] : [0x01, ...leb(spec.memory.min), ...leb(spec.memory.max)];
  const memory = section(5, vec([limits]));
  const startIndex = spec.imports.length;
  const exports = section(7, vec([[...str("memory"), 0x02, 0], [...str("_start"), 0x00, ...leb(startIndex)]]));
  const code = section(10, vec([[...leb(spec.body.length + 1), 0x00, ...spec.body]]));
  const data = section(11, vec([[0x00, ...I32_CONST(0), END, ...leb(spec.data.length), ...spec.data]]));
  return new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, ...types, ...imports, ...funcs, ...memory, ...exports, ...code, ...data]);
}

const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

// iov em 0 -> {ptr: 8, len: 3}; "hi\n" em 8; nwritten em 16.
const hello = (exitCode: number | null, extra: number[] = []) =>
  assemble({
    imports: [
      { name: "fd_write", type: 0 },
      { name: "proc_exit", type: 1 },
    ],
    memory: { min: 1, max: 2 },
    data: [...u32(8), ...u32(3), 0x68, 0x69, 0x0a],
    body: [
      ...I32_CONST(1),
      ...I32_CONST(0),
      ...I32_CONST(1),
      ...I32_CONST(16),
      ...CALL(0),
      DROP,
      ...extra,
      ...(exitCode === null ? [] : [...I32_CONST(exitCode), ...CALL(1)]),
      END,
    ],
  });

test("roda um binário WASI: stdout, exit code e memória", async () => {
  const r = await runWasi({ wasm: hello(7) });
  assert.equal(r.stdout, "hi\n");
  assert.equal(r.exitCode, 7);
  assert.equal(r.signal, null);
  assert.equal(r.outputTruncated, false);
  assert.equal(r.memoryBytes, 65536);
});

test("_start que retorna sem proc_exit vale exit 0", async () => {
  const r = await runWasi({ wasm: hello(null) });
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, "hi\n");
});

test("trap vira sinal, não exceção", async () => {
  const r = await runWasi({ wasm: hello(null, [UNREACHABLE]) });
  assert.equal(r.exitCode, null);
  assert.match(r.signal ?? "", /SIGABRT/);
  assert.equal(r.stdout, "hi\n");
});

test("estouro de saída corta e marca outputTruncated", async () => {
  const r = await runWasi({ wasm: hello(0), maxOutputBytes: 2 });
  assert.equal(r.outputTruncated, true);
  assert.equal(r.stdout, "hi");
});

test("stdin chega por fd_read", async () => {
  // iov de escrita em 0 {ptr: 32, len: nread}; iov de leitura em 24 {ptr: 32, len: 16}; nread em 48; nwritten em 52.
  const echo = assemble({
    imports: [
      { name: "fd_read", type: 0 },
      { name: "fd_write", type: 0 },
    ],
    memory: { min: 1, max: 1 },
    data: [...u32(32), ...u32(0), ...new Array<number>(16).fill(0), ...u32(32), ...u32(16)],
    body: [
      ...I32_CONST(0),
      ...I32_CONST(24),
      ...I32_CONST(1),
      ...I32_CONST(48),
      ...CALL(0),
      DROP,
      ...I32_CONST(4),
      ...I32_CONST(48),
      ...I32_LOAD,
      ...I32_STORE,
      ...I32_CONST(1),
      ...I32_CONST(0),
      ...I32_CONST(1),
      ...I32_CONST(52),
      ...CALL(1),
      DROP,
      END,
    ],
  });
  const r = await runWasi({ wasm: echo, stdin: "ola" });
  assert.equal(r.stdout, "ola");
  assert.equal(r.exitCode, 0);
});

test("inspectWasm lê imports e limites de memória", () => {
  const info = inspectWasm(hello(0));
  assert.deepEqual(
    info.imports.map((i) => `${i.module}.${i.name}:${i.kind}`),
    ["wasi_snapshot_preview1.fd_write:function", "wasi_snapshot_preview1.proc_exit:function"],
  );
  assert.deepEqual(info.memories, [{ min: 1, max: 2, shared: false, is64: false, imported: false }]);
});

test("wasmProblem aceita só WASI puro com memória limitada", () => {
  assert.equal(wasmProblem(hello(0), 1), null);
  // abaixo de 16 MB vale o piso (o compilador do navegador nunca linka com menos que isso)
  assert.equal(wasmProblem(hello(0), 0), null);
  const big = assemble({ imports: [{ name: "proc_exit", type: 1 }], memory: { min: 1, max: 400 }, data: [], body: [...I32_CONST(0), ...CALL(0), END] });
  assert.match(wasmProblem(big, 16) ?? "", /acima/);
  assert.equal(wasmProblem(big, 32), null);
  const noMax = assemble({ imports: [{ name: "proc_exit", type: 1 }], memory: { min: 1, max: null }, data: [], body: [...I32_CONST(0), ...CALL(0), END] });
  assert.match(wasmProblem(noMax, 64) ?? "", /sem limite/);
  assert.match(wasmProblem(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 64) ?? "", /WebAssembly/);
});

// ---- runner do servidor: um worker_thread reaproveitado, recriado só no TLE ----

const spin = assemble({ imports: [], memory: { min: 1, max: 1 }, data: [], body: [0x03, 0x40, 0x0c, 0x00, END, END] });

test("WasmModuleRunner roda todos os testes no mesmo worker", async () => {
  const r = await new WasmModuleRunner(hello(0)).runBatch({ language: "c", source: "", inputs: ["", "", ""], timeLimitMs: 1000, memoryLimitMb: 64, flags: [] });
  assert.equal(r.runs.length, 3);
  for (const run of r.runs) {
    assert.equal(run.stdout, "hi\n");
    assert.equal(run.exitCode, 0);
  }
});

test("laço infinito vira TLE e o teste seguinte sobe outro worker", async () => {
  const pool = new WasiPool(spawnNodeWasiWorker, 1024);
  try {
    const looping = await pool.run(await WebAssembly.compile(spin), "", 50);
    assert.equal(looping.timedOut, true);
    const after = await pool.run(await WebAssembly.compile(hello(3)), "", 1000);
    assert.equal(after.stdout, "hi\n");
    assert.equal(after.exitCode, 3);
  } finally {
    pool.close();
  }
});

test("saída normal chama fflush exportado (stdio sem \\n no fim não some)", async () => {
  // Módulo com `_start` que não escreve e `fflush` que escreve "hi\n": só aparece se o executor esvaziar o stdio.
  const types = section(1, vec([fnType([I32, I32, I32, I32], [I32]), fnType([I32], [I32]), fnType([], [])]));
  const imports = section(2, vec([[...str("wasi_snapshot_preview1"), ...str("fd_write"), 0x00, 0]]));
  const funcs = section(3, vec([[2], [1]]));
  const memory = section(5, vec([[0x01, 1, 1]]));
  const exports = section(7, vec([[...str("memory"), 0x02, 0], [...str("_start"), 0x00, 1], [...str("fflush"), 0x00, 2]]));
  const start = [END];
  const flush = [...I32_CONST(1), ...I32_CONST(0), ...I32_CONST(1), ...I32_CONST(16), ...CALL(0), END];
  const code = section(10, vec([[...leb(start.length + 1), 0x00, ...start], [...leb(flush.length + 1), 0x00, ...flush]]));
  const data = section(11, vec([[0x00, ...I32_CONST(0), END, ...leb(11), ...u32(8), ...u32(3), 0x68, 0x69, 0x0a]]));
  const wasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, ...types, ...imports, ...funcs, ...memory, ...exports, ...code, ...data]);
  const r = await runWasi({ wasm });
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, "hi\n");
});

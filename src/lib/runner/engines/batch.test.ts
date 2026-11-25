// O driver em lote compilado de verdade (gcc/g++/rustc locais): é o mesmo
// código que vai para o Compiler Explorer. Pula o que não estiver instalado.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { outputSha256 } from "@/lib/judge/hash";
import type { Language, RawRun } from "../types";
import { encodeBatch, parseBatch, prefixBytes, wrapForBatch } from "./batch";

const has = (cmd: string) => spawnSync(cmd, ["--version"]).status === 0;
const MAX = 64 * 1024;

function runBatch(language: Exclude<Language, "python">, source: string, stdins: string[], limitMs = 500): (RawRun | null)[] {
  const dir = mkdtempSync(path.join(os.tmpdir(), "korin-batch-"));
  try {
    const file = path.join(dir, { c: "main.c", cpp: "main.cpp", rust: "main.rs" }[language]);
    const exe = path.join(dir, "a.out");
    writeFileSync(file, wrapForBatch(language, source)!);
    const [cc, args] =
      language === "c" ? ["gcc", ["-std=c17", "-O2", "-Wall", "-Wextra", "-Werror", "-o", exe, file, "-lm"]]
      : language === "cpp" ? ["g++", ["-std=c++20", "-O2", "-Wall", "-Wextra", "-Werror", "-o", exe, file]]
      : ["rustc", ["--edition", "2021", "-o", exe, file]];
    const c = spawnSync(cc, args as string[], { encoding: "utf8" });
    assert.equal(c.status, 0, c.stderr);
    const out = execFileSync(exe, { input: encodeBatch(stdins, limitMs, MAX) }).toString();
    const runs = parseBatch(out, stdins.length, prefixBytes(stdins.length));
    assert.ok(runs, out);
    return runs;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("C: saída, hash normalizado, TLE, crash e OLE no mesmo lote", { skip: !has("gcc") }, async () => {
  const src = `#include <stdio.h>
#include <string.h>
#include <stdlib.h>
/* nomes que colidiriam com a libc: o driver não usa nenhum */
static int read(void) { int x; return scanf("%d", &x) == 1 ? x : -1; }
int main(void) {
  int op = read();
  if (op == 1) { printf("a  \\r\\nb\\n\\n\\n"); return 0; }
  if (op == 2) for (;;) {}
  if (op == 3) { int *volatile p = NULL; return *p; }
  if (op == 4) { for (;;) fputs("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", stdout); }
  if (op == 5) { fprintf(stderr, "deu ruim\\n"); return 7; }
  return 0;
}`;
  const runs = runBatch("c", src, ["1", "2", "3", "4", "5"]);
  assert.equal(runs[0]!.exitCode, 0);
  assert.equal(runs[0]!.stdoutSha256, await outputSha256("a\nb"));
  assert.equal(runs[1]!.timedOut, true);
  assert.equal(runs[2]!.exitCode, 128 + 11); // SIGSEGV
  assert.equal(runs[3]!.outputTruncated, true);
  assert.equal(runs[4]!.exitCode, 7);
  assert.equal(runs[4]!.stderr, "deu ruim\n");
});

test("C++: estado global não vaza entre testes (cada um é um processo)", { skip: !has("g++") }, () => {
  const src = `#include <iostream>
static int calls = 0;
int main() { std::string s; std::cin >> s; calls++; std::cout << s << ' ' << calls << '\\n'; }`;
  const runs = runBatch("cpp", src, ["x", "y", "z"]);
  assert.deepEqual(runs.map((r) => r!.stdout), ["x 1\n", "y 1\n", "z 1\n"]);
});

test("Rust: main com Result, panic e stdin", { skip: !has("rustc") }, () => {
  const src = `use std::io::*;
fn main() -> Result<()> {
    let mut s = String::new();
    stdin().read_to_string(&mut s)?;
    if s.trim() == "panic" { panic!("bum"); }
    print!("{}", s.trim().len());
    Ok(())
}`;
  const runs = runBatch("rust", src, ["abc", "panic"]);
  assert.equal(runs[0]!.stdout, "3");
  assert.equal(runs[0]!.exitCode, 0);
  assert.equal(runs[1]!.exitCode, 101);
  assert.match(runs[1]!.stderr, /bum/);
});

test("prefixo cabe no corte de 32 KB do Compiler Explorer", () => {
  for (const n of [1, 5, 20, 100]) assert.ok(n * (4 * prefixBytes(n) + 160) <= 32_000 || prefixBytes(n) === 64);
});

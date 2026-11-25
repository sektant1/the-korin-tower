import assert from "node:assert/strict";
import { test } from "node:test";
import { explainRuntime, parseDiagnostics } from "./diagnostics";

test("gcc: erro, aviso e trecho com ^", () => {
  const out = `main.c: In function 'main':
main.c:4:12: error: 'y' undeclared (first use in this function)
    4 |     return y;
      |            ^
main.c:3:9: warning: unused variable 'x' [-Wunused-variable]
    3 |     int x;
      |         ^`;
  const d = parseDiagnostics("c", out);
  assert.equal(d.length, 2);
  assert.deepEqual([d[0].severity, d[0].file, d[0].line, d[0].col], ["error", "main.c", 4, 12]);
  assert.equal(d[0].snippet.length, 2);
  assert.equal(d[1].code, "-Wunused-variable");
});

test("rustc: código do erro, local e trecho", () => {
  const out = `error[E0308]: mismatched types
 --> main.rs:1:25
  |
1 | fn main(){ let x: i32 = "a"; }
  |                   ---   ^^^ expected \`i32\`, found \`&str\`
  |                   |
  |                   expected due to this

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0308\`.`;
  const d = parseDiagnostics("rust", out);
  assert.equal(d.length, 1);
  assert.deepEqual([d[0].code, d[0].file, d[0].line, d[0].col], ["E0308", "main.rs", 1, 25]);
  assert.ok(d[0].snippet.some((l) => l.includes("^^^")));
});

test("Python: SyntaxError", () => {
  const out = `  File "main.py", line 2
    print(x
         ^
SyntaxError: '(' was never closed
`;
  const [d] = parseDiagnostics("python", out);
  assert.equal(d.line, 2);
  assert.equal(d.message, "SyntaxError: '(' was never closed");
  assert.equal(d.snippet[0], "print(x");
});

test("runtime: traceback do Python aponta a linha do jogador", () => {
  const e = explainRuntime("python", 1, `Traceback (most recent call last):
  File "main.py", line 5, in <module>
    print(f(0))
  File "main.py", line 2, in f
    return 1 / n
ZeroDivisionError: division by zero`)!;
  assert.equal(e.title, "ZeroDivisionError: division by zero");
  assert.equal(e.line, 2);
  assert.match(e.hint!, /zero/);
});

test("runtime: panic do Rust e sinais de C", () => {
  const p = explainRuntime("rust", 101, "thread 'main' panicked at main.rs:3:13:\nindex out of bounds: the len is 3 but the index is 7\nnote: run with `RUST_BACKTRACE=1`")!;
  assert.equal(p.line, 3);
  assert.match(p.hint!, /índice/);
  assert.match(explainRuntime("c", 139, "")!.title, /segmentation fault/);
  assert.match(explainRuntime("cpp", 136, "")!.hint!, /zero/);
  const a = explainRuntime("c", 134, "main: main.c:9: soma: Assertion `x > 0' failed.\n")!;
  assert.equal(a.title, "assert falhou: x > 0");
  assert.equal(a.line, 9);
  assert.equal(explainRuntime("c", 0, ""), null);
});

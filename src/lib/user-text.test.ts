import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanUserText, parseUserText } from "./user-text";

test("texto simples e código inline", () => {
  assert.deepEqual(parseUserText("use `calloc` aqui"), [
    { type: "inline", parts: [{ type: "text", text: "use " }, { type: "code", text: "calloc" }, { type: "text", text: " aqui" }] },
  ]);
});

test("spoiler pode ter código e quebra de linha", () => {
  assert.deepEqual(parseUserText("dica: ||troque `<` por\n`<=`|| ok"), [
    { type: "inline", parts: [{ type: "text", text: "dica: " }] },
    { type: "spoiler", parts: [{ type: "text", text: "troque " }, { type: "code", text: "<" }, { type: "text", text: " por\n" }, { type: "code", text: "<=" }] },
    { type: "inline", parts: [{ type: "text", text: " ok" }] },
  ]);
});

test("bloco de código mantém || e ` literais", () => {
  assert.deepEqual(parseUserText("veja:\n```c\nif (a || b) x = `y`;\n```"), [
    { type: "inline", parts: [{ type: "text", text: "veja:\n" }] },
    { type: "pre", text: "if (a || b) x = `y`;" },
  ]);
});

test("HTML continua sendo texto", () => {
  assert.deepEqual(parseUserText("<script>alert(1)</script>"), [{ type: "inline", parts: [{ type: "text", text: "<script>alert(1)</script>" }] }]);
});

test("cleanUserText", () => {
  assert.deepEqual(cleanUserText("  oi\r\n\r\n\r\n\r\n\r\ntchau  ", 100), { ok: true, text: "oi\n\n\ntchau" });
  assert.equal(cleanUserText("   ", 100).ok, false);
  assert.equal(cleanUserText("abcdef", 5).ok, false);
  assert.equal(cleanUserText(null, 5).ok, false);
});

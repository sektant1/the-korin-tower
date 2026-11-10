import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVimrc } from "./vimrc";

test("parseVimrc entende map/noremap por modo, set e comentários", () => {
  const r = parseVimrc('" comentário\nimap jj <Esc>\nnnoremap ; :\nmap Y y$\nset theme=ambar\nlixo aqui\n');
  assert.deepEqual(r.mappings, [
    { context: "insert", noremap: false, lhs: "jj", rhs: "<Esc>" },
    { context: "normal", noremap: true, lhs: ";", rhs: ":" },
    { context: undefined, noremap: false, lhs: "Y", rhs: "y$" },
  ]);
  assert.deepEqual(r.options, { theme: "ambar" });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /linha 6/);
});

import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { DraftBook } from "./drafts";

const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
} as Storage;

type Call = { method: string; url: string; body?: { language: string; code: string } };
let calls: Call[] = [];
let failNext = false;
globalThis.fetch = (async (url: string, init: RequestInit) => {
  calls.push({ method: init.method!, url, body: init.body ? JSON.parse(init.body as string) : undefined });
  if (failNext) {
    failNext = false;
    throw new TypeError("offline");
  }
  return new Response("{}", { status: 200 });
}) as typeof fetch;

const templates = { c: "int main(){}", rust: "fn main(){}" };

beforeEach(() => {
  mem.clear();
  calls = [];
});

test("sem login: troca de linguagem devolve o template ou o código já digitado", async () => {
  const b = new DraftBook({ slug: "x", templates, account: null });
  assert.deepEqual(b.open("c"), { code: templates.c, restored: false });
  await b.save("c", "int main(){return 1;}");
  assert.deepEqual(b.open("rust"), { code: templates.rust, restored: false });
  assert.equal(b.open("c").code, "int main(){return 1;}");
  // nova página: vem do localStorage
  const b2 = new DraftBook({ slug: "x", templates, account: null });
  assert.deepEqual(b2.open("c"), { code: "int main(){return 1;}", restored: true });
  assert.equal(b2.open("rust").code, templates.rust);
});

test("código igual ao template não vira rascunho (template novo aparece depois)", async () => {
  const b = new DraftBook({ slug: "x", templates, account: null });
  await b.save("c", "edit");
  await b.save("c", templates.c);
  assert.equal(mem.size, 0);
  const b2 = new DraftBook({ slug: "x", templates: { ...templates, c: "int main(void){}" }, account: null });
  assert.equal(b2.open("c").code, "int main(void){}");
});

test("com login: salva na conta, não reenvia sem mudança e apaga ao voltar ao template", async () => {
  const b = new DraftBook({ slug: "x", templates, account: { drafts: { rust: "fn main(){1}" }, endpoint: "/d" } });
  assert.deepEqual(b.open("rust"), { code: "fn main(){1}", restored: true });
  await b.save("rust", "fn main(){1}");
  assert.equal(calls.length, 0);
  await b.save("c", templates.c); // nunca editado: nada a fazer
  assert.equal(calls.length, 0);
  await b.save("c", "int x;");
  await b.reset("c");
  assert.deepEqual(
    calls.map((c) => c.method),
    ["PUT", "DELETE"],
  );
  assert.equal(mem.size, 0); // cópia pending some depois de confirmado
});

test("com login: save que falha fica no navegador e vence a conta na próxima abertura", async () => {
  const b = new DraftBook({ slug: "x", templates, account: { drafts: { c: "velho" }, endpoint: "/d" } });
  failNext = true;
  const r = await b.save("c", "novo");
  assert.equal(r.ok, false);
  const b2 = new DraftBook({ slug: "x", templates, account: { drafts: { c: "velho" }, endpoint: "/d" } });
  assert.equal(b2.open("c").code, "novo");
  // e o próximo save tenta de novo mesmo sem mudança
  calls = [];
  assert.equal((await b.save("c", "novo")).ok, true);
  assert.equal(calls.length, 1);
});

test("com login: rascunho de antes do login vale só sem rascunho na conta", () => {
  mem.set("korin:draft:x:c", "local");
  mem.set("korin:draft:x:rust", "local rust");
  const b = new DraftBook({ slug: "x", templates, account: { drafts: { c: "conta" }, endpoint: "/d" } });
  assert.equal(b.open("c").code, "conta");
  assert.equal(b.open("rust").code, "local rust");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { endpointOf } from "./piston";

test("endpointOf aceita a raiz do serviço", () => {
  assert.equal(endpointOf("http://piston:2000"), "http://piston:2000/api/v2/execute");
  assert.equal(endpointOf("http://localhost:2000/"), "http://localhost:2000/api/v2/execute");
  assert.equal(endpointOf("  https://piston.exemplo.com.br/  "), "https://piston.exemplo.com.br/api/v2/execute");
});

test("endpointOf aceita a URL completa do execute (Piston atrás de proxy com caminho)", () => {
  // É o caso da instância pública da emkc, que mora em /api/v2/piston.
  assert.equal(endpointOf("https://emkc.org/api/v2/piston/execute"), "https://emkc.org/api/v2/piston/execute");
  assert.equal(endpointOf("https://emkc.org/api/v2/piston/execute/"), "https://emkc.org/api/v2/piston/execute");
});

test("endpointOf não reescreve um caminho que termina em /execute por acaso", () => {
  // Regra simples: termina em /execute? Usa como está. O resto ganha /api/v2/execute.
  assert.equal(endpointOf("https://x.example.com/api/v2"), "https://x.example.com/api/v2/api/v2/execute");
});

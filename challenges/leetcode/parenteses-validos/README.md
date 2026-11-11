---
title: Parênteses Válidos
difficulty: 1
tags: [pilha, strings, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 2
hints:
  - "Use uma **pilha**: abriu, empilha; fechou, o topo tem que ser o par correspondente, senão é inválido."
  - "No fim, a pilha precisa estar **vazia**. `((` não é válido, mesmo sem nenhum erro de pareamento."
  - "Um fecha com a pilha vazia (`)(`) também é inválido. Em C, um vetor de `char` do tamanho da linha serve de pilha."
---

Dada uma string só com os caracteres `(`, `)`, `[`, `]`, `{` e `}`, decida se ela é **válida**:

1. todo símbolo que abre é fechado pelo símbolo do mesmo tipo;
2. os pares fecham na ordem certa (o último que abriu é o primeiro que fecha);
3. todo símbolo que fecha tem um correspondente aberto.

## Entrada

A primeira linha tem $T$ ($1 \le T \le 10^4$), o número de casos. Cada uma das $T$ linhas seguintes tem uma string não vazia. A soma dos comprimentos não passa de $10^6$.

## Saída

Para cada caso, `sim` se a string é válida, senão `nao`.

## Exemplo

Entrada:

```
5
()
()[]{}
(]
([)]
{[]}
```

Saída:

```
sim
sim
nao
nao
sim
```

---

> Versão stdin/stdout de [LeetCode #20 Valid Parentheses](https://leetcode.com/problems/valid-parentheses/).

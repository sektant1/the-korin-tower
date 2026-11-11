---
title: "Contando Inversões"
difficulty: 2
tags: [merge-sort, divisao-e-conquista, vetores]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 2
hints:
  - "Dois laços aninhados contam certo, mas são $N^2 / 2 = 2 \\cdot 10^{10}$ comparações. Não dá."
  - "Merge sort: ao intercalar duas metades ordenadas, toda vez que um elemento da direita passa na frente, ele é menor que **todos** os que restam na esquerda. Some essa quantidade."
  - "A resposta pode passar de $2^{31}$: use `long long` para o contador."
---

Uma inversão é um par fora de ordem: posições $i < j$ com $v_i > v_j$. Um vetor ordenado tem zero; um vetor invertido tem $N(N-1)/2$. É a medida clássica de "quão bagunçado" um vetor está.

## Tarefa

Conte as inversões do vetor.

## Entrada

Uma linha com $N$, com $1 \le N \le 2 \cdot 10^5$, e uma linha com os $N$ inteiros, entre $-10^9$ e $10^9$.

## Saída

Um inteiro: o número de inversões.

## Exemplo

Entrada:

```
5
2 4 1 3 5
```

Saída:

```
3
```

Os pares são `(2,1)`, `(4,1)` e `(4,3)`.

---
title: 56. Fundir Intervalos
difficulty: 2
tags: [ordenacao, intervalos, varredura, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 4
hints:
  - "**Ordene** os intervalos pelo início. Depois disso, um intervalo só pode se sobrepor ao que está sendo montado agora."
  - "Mantenha o intervalo `atual`. Para cada próximo `[a, b]`: se `a <= atual.fim`, estenda `atual.fim = max(atual.fim, b)`; senão, imprima `atual` e recomece."
  - "Intervalos que **encostam** (`[1,3]` e `[3,5]`) se fundem. E não esqueça de imprimir o último `atual` depois do laço."
---

Dada uma lista de intervalos fechados $[a_i, b_i]$, **funda** todos os que se sobrepõem (ou se tocam) e imprima o resultado em ordem crescente.

## Entrada

A primeira linha tem $N$ ($1 \le N \le 2 \cdot 10^5$). Cada uma das $N$ linhas seguintes tem `a b` com $-10^9 \le a \le b \le 10^9$. A ordem de entrada é arbitrária.

## Saída

Os intervalos resultantes, um por linha, `a b`, em ordem crescente de início.

## Exemplo

Entrada:

```
4
1 3
8 10
2 6
15 18
```

Saída:

```
1 6
8 10
15 18
```

`[1,3]` e `[2,6]` se sobrepõem e viram `[1,6]`.

---

> Versão stdin/stdout de [LeetCode #56 Merge Intervals](https://leetcode.com/problems/merge-intervals/).

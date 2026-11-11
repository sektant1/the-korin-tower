---
title: 4. Mediana de Dois Vetores Ordenados
difficulty: 4
tags: [busca-binaria, dois-ponteiros, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 7
hints:
  - "A solução $O(N + M)$ existe: avance dois ponteiros como no *merge* do merge sort até chegar no meio. Passa nos testes. Mas o desafio de verdade é a próxima dica."
  - "Para $O(\\log \\min(N, M))$: faça busca binária em quantos elementos de $A$ ficam na **metade esquerda** (`i`); isso determina quantos de $B$ ficam (`j = (N + M + 1) / 2 - i`)."
  - "O corte está certo quando `A[i-1] <= B[j]` e `B[j-1] <= A[i]`. Se `A[i-1] > B[j]`, `i` é grande demais; se `B[j-1] > A[i]`, é pequeno demais. Trate as bordas (`i = 0`, `i = N`) como $\\pm\\infty$."
  - "Total ímpar: a mediana é o maior da metade esquerda. Total par: média entre o maior da esquerda e o menor da direita. Imprima com **uma casa decimal**."
---

Dados dois vetores **já ordenados**, $A$ e $B$, encontre a **mediana** da união deles.

A solução linear é fácil. A graça está em fazer em $O(\log \min(N, M))$, como pede o enunciado original: isso vale uma estrela extra de dificuldade.

## Entrada

A primeira linha tem $N$ e $M$ ($0 \le N, M \le 5 \cdot 10^5$, $N + M \ge 1$). A segunda tem os $N$ inteiros de $A$ em ordem não decrescente; a terceira, os $M$ de $B$ ($-10^6 \le$ valores $\le 10^6$). Uma linha vazia significa vetor vazio.

## Saída

A mediana com **exatamente uma casa decimal** (`printf("%.1f")`).

## Exemplos

Entrada:

```
2 1
1 3
2
```

Saída:

```
2.0
```

Entrada:

```
2 2
1 2
3 4
```

Saída:

```
2.5
```

---

> Versão stdin/stdout de [LeetCode #4 Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/).

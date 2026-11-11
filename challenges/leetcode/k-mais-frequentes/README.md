---
title: Os K Mais Frequentes
difficulty: 2
tags: [hash, heap, ordenacao, contagem, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 6
hints:
  - "Primeiro conte: um mapa `valor -> quantas vezes`. Em C, ordene o vetor e conte os blocos iguais."
  - "Depois ordene os pares `(contagem, valor)` por contagem decrescente e, em empate, valor crescente. $O(N \\log N)$ passa folgado."
  - "Quer o $O(N \\log K)$ do enunciado original? Use um *min-heap* de tamanho $K$ (`std::priority_queue` com `std::greater`, ou `BinaryHeap<Reverse<_>>`)."
---

Dado um vetor de inteiros e um $K$, imprima os $K$ valores **mais frequentes**.

## Entrada

A primeira linha tem $N$ e $K$ ($1 \le K \le$ número de valores distintos $\le N \le 2 \cdot 10^5$). A segunda tem os $N$ inteiros ($-10^9 \le a_i \le 10^9$).

## Saída

$K$ linhas, cada uma com `valor contagem`, da maior contagem para a menor. Em caso de empate na contagem, o **menor valor** vem primeiro.

## Exemplo

Entrada:

```
7 2
1 1 1 2 2 3 3
```

Saída:

```
1 3
2 2
```

`2` e `3` aparecem duas vezes cada; o desempate escolhe o menor.

---

> Versão stdin/stdout de [LeetCode #347 Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/). Aqui a saída é determinística graças ao critério de desempate.

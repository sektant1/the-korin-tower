---
title: 1. Dois Números (Two Sum)
difficulty: 1
tags: [hash, vetor, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 1
hints:
  - "Dois laços aninhados dão $O(N^2)$: com $N = 2 \\cdot 10^5$ são $4 \\cdot 10^{10}$ pares. Estoura o tempo."
  - "Percorra o vetor uma vez. Para cada `x`, pergunte a uma **tabela hash** se `alvo - x` já apareceu; se não, guarde `x -> índice`."
  - "Em C não há hash pronta: ordene uma cópia dos pares `(valor, índice)` e use dois ponteiros (um em cada ponta), ou escreva uma tabela com endereçamento aberto."
---

O problema mais famoso das entrevistas, em versão stdin/stdout. Dado um vetor de inteiros e um alvo, encontre **os dois índices** cujos valores somam o alvo.

É garantido que existe **exatamente uma** resposta, e você não pode usar o mesmo elemento duas vezes.

## Entrada

A primeira linha tem $N$ ($2 \le N \le 2 \cdot 10^5$). A segunda tem os $N$ inteiros do vetor ($-10^9 \le a_i \le 10^9$). A terceira tem o alvo $T$ ($-2 \cdot 10^9 \le T \le 2 \cdot 10^9$).

## Saída

Os dois índices (base 0), o menor primeiro, separados por espaço.

## Exemplo

Entrada:

```
4
2 7 11 15
9
```

Saída:

```
0 1
```

Porque $a_0 + a_1 = 2 + 7 = 9$.

---

> Versão stdin/stdout de [LeetCode #1 Two Sum](https://leetcode.com/problems/two-sum/). Lá você implementa só a função; aqui, o programa inteiro.

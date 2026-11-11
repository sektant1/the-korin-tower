---
title: "Busca Binária"
difficulty: 2
tags: [busca, vetores, logaritmo]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 1
hints:
  - "Percorrer o vetor inteiro para cada consulta dá $N \\cdot Q = 5 \\cdot 10^9$ passos. Não cabe em 1 segundo."
  - "O vetor está ordenado: olhe o meio, decida para que lado ir e descarte a outra metade. São $\\log_2 N \\approx 17$ passos por consulta."
  - "Com repetidos, pare de descartar quando `v[meio] >= x`: mantenha o invariante \"a resposta está em `[lo, hi)`\" e, no fim, confira se `v[lo] == x`."
---

Um vetor ordenado é meio caminho andado: você acha qualquer valor olhando só $\log_2 N$ posições.

## Tarefa

Dado um vetor ordenado (pode ter repetidos) e `Q` consultas, imprima, para cada valor consultado, o índice da **primeira** ocorrência dele no vetor, ou `-1` se não existir. Índices começam em 0.

## Entrada

- Uma linha com $N$, com $1 \le N \le 10^5$.
- Uma linha com os $N$ inteiros, em ordem não decrescente, entre $-10^9$ e $10^9$.
- Uma linha com $Q$, com $1 \le Q \le 5 \cdot 10^4$.
- $Q$ linhas, cada uma com um inteiro a procurar.

## Saída

$Q$ linhas, uma resposta por consulta.

## Exemplo

Entrada:

```
7
1 3 3 3 8 10 15
4
3
15
4
1
```

Saída:

```
1
6
-1
0
```

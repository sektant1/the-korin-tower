---
title: Crivo de Eratóstenes
difficulty: 1
tags: [iniciante, vetores, primos, loops]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 4
hints:
  - "Testar cada número dividindo por todos os anteriores funciona, mas para $N = 2 \\cdot 10^5$ fica lento. O crivo é mais rápido e mais simples."
  - "Crie um vetor de `N + 1` marcas, todas verdadeiras. Para cada `i` a partir de 2 que ainda estiver marcado, desmarque `i*i`, `i*i + i`, `i*i + 2i`..."
  - "Só precisa correr `i` até `i * i <= N`. Depois, imprima os índices que sobraram marcados."
---

Eratóstenes, século III a.C.: para achar os primos até `N`, risque os múltiplos de 2, depois os de 3, depois os de 5... O que sobrar é primo.

## Tarefa

Imprima todos os primos de `2` até `N`, em ordem crescente, um por linha.

## Entrada

Uma linha com o inteiro $N$, com $2 \le N \le 2 \cdot 10^5$.

## Saída

Os primos até $N$, um por linha.

## Exemplo

Entrada:

```
20
```

Saída:

```
2
3
5
7
11
13
17
19
```

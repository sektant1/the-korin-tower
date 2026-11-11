---
title: Fila de Prioridade na Unha
difficulty: 3
tags: [heap, estruturas-de-dados, arvore]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 3
hints:
  - "Um vetor ordenado a cada `push` custa $O(N)$. Com $2 \\cdot 10^5$ operações isso passa do tempo. A estrutura certa é um **heap binário**."
  - "Heap num vetor: o filho de `i` está em `2i+1` e `2i+2`, o pai em `(i-1)/2`. `push` coloca no fim e sobe enquanto for menor que o pai; `pop` troca a raiz com o último e desce."
  - "Guarde o tamanho e cheque `vazia` antes de `pop`/`top`. O vetor pode começar com capacidade $Q$: nunca haverá mais elementos que operações."
---

Em C não existe `priority_queue`. Hoje você escreve a sua: um min-heap, a estrutura por trás de Dijkstra, Huffman e do escalonador do seu sistema operacional.

## Tarefa

Processe `Q` operações sobre uma fila de prioridade de inteiros:

- `push X`: insere `X`
- `pop`: remove e imprime o menor valor
- `top`: imprime o menor valor sem remover

`pop` e `top` numa fila vazia imprimem `vazia`.

## Entrada

Uma linha com $Q$, com $1 \le Q \le 2 \cdot 10^5$, e $Q$ linhas de operações. Valores entre $-10^9$ e $10^9$, com repetidos.

## Saída

Uma linha para cada `pop` e cada `top`, na ordem.

## Exemplo

Entrada:

```
7
push 5
push 2
top
push 9
pop
pop
pop
```

Saída:

```
2
2
5
9
```

---
title: "Dijkstra: Menor Caminho no Mapa"
difficulty: 3
tags: [grafos, heap, fila-de-prioridade, menor-caminho]
languages: [cpp, c]
timeLimitMs: 2000
memoryLimitMb: 256
order: 1
hints:
  - "Guarde o grafo como **lista de adjacência**. Em C, o formato CSR é ótimo: conte o grau de cada vértice, faça a soma de prefixos e preencha um vetor único de arestas."
  - "Distâncias somam até $10^5 \\cdot 10^9 = 10^{14}$: use `long long`/`int64_t`. Comece com tudo em infinito, menos a origem, que vale 0."
  - "Use uma fila de prioridade de pares `(distância, vértice)`. Em C++: `std::priority_queue` com `std::greater<>` para virar *min-heap*. Em C, escreva um heap binário num vetor."
  - "Não precisa de *decrease-key*: empilhe de novo quando achar uma distância menor, e ao tirar da fila **ignore** o par se `d > dist[v]` (entrada velha)."
  - "Pesos podem ser 0, e o grafo pode ter laços e arestas paralelas. O algoritmo lida com isso sem caso especial."
---

Dado um grafo **dirigido** com pesos não negativos, calcule a menor distância da origem $S$ até todos os vértices.

Com dezenas de milhares de vértices, o Dijkstra ingênuo $O(V^2)$ estoura o tempo. Use uma **fila de prioridade**: $O((V + E) \log V)$.

## Entrada

A primeira linha tem $N$, $M$ e $S$ ($1 \le N \le 10^5$, $0 \le M \le 2 \cdot 10^5$, $1 \le S \le N$). Cada uma das $M$ linhas seguintes tem `u v w`: uma aresta de `u` para `v` com peso $0 \le w \le 10^9$. Os vértices são numerados de $1$ a $N$.

## Saída

$N$ linhas: na linha $i$, a menor distância de $S$ até $i$, ou `-1` se $i$ não é alcançável.

## Exemplo

Entrada:

```
5 6 1
1 2 4
1 3 1
3 2 2
2 4 5
3 4 8
5 1 3
```

Saída:

```
0
3
1
8
-1
```

O caminho até o vértice 2 é $1 \to 3 \to 2$ (custo 3), mais barato que a aresta direta (custo 4). O vértice 5 tem aresta **saindo** para 1, mas nenhuma chegando, então é inalcançável.

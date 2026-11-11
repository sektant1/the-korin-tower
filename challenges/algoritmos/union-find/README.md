---
title: Union-Find: Quem Está Conectado
difficulty: 3
tags: [grafos, union-find, estruturas-de-dados]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 4
hints:
  - "Uma busca em largura por consulta é $O(N + M)$ cada: com $10^5$ consultas, estoura. Pré-processe os componentes uma vez."
  - "Union-Find: cada nó aponta para um pai; a raiz representa o componente. `find` sobe até a raiz; `union` liga uma raiz na outra."
  - "Sem otimização, uma corrente de $2 \\cdot 10^5$ nós faz `find` custar $O(N)$. Use **compressão de caminho** (ao subir, aponte cada nó direto para a raiz) e já basta."
---

Antes de Dijkstra, a pergunta mais simples sobre um grafo: dá para ir de `u` a `v`? Com muitas perguntas, a resposta eficiente é a estrutura de conjuntos disjuntos, o Union-Find.

## Tarefa

Um grafo não dirigido com `N` nós (`0` a `N-1`) e `M` arestas. Para cada consulta `u v`, responda `sim` se existe caminho entre `u` e `v`, e `nao` caso contrário.

## Entrada

- Uma linha com $N$ e $M$, com $1 \le N \le 2 \cdot 10^5$ e $0 \le M \le 2 \cdot 10^5$.
- $M$ linhas `u v` (pode haver laços e arestas repetidas).
- Uma linha com $Q$, com $1 \le Q \le 10^5$.
- $Q$ linhas `u v`.

## Saída

$Q$ linhas com `sim` ou `nao`.

## Exemplo

Entrada:

```
5 3
0 1
1 2
3 4
3
0 2
0 3
4 4
```

Saída:

```
sim
nao
sim
```

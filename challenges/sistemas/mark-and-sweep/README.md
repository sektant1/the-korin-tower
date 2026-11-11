---
title: "Coletor de Lixo: Mark & Sweep"
difficulty: 5
tags: [gc, grafos, memoria, dfs]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 128
order: 5
hints:
  - "É alcançabilidade em grafo dirigido: marque tudo que se alcança a partir das raízes (mark) e varra o resto (sweep)."
  - "Contagem de referências falharia aqui: ciclos mortos (A aponta B, B aponta A, ninguém aponta para eles) precisam ser coletados."
  - "A corrente tem $1.5 \\cdot 10^5$ objetos: recursão em profundidade estoura a pilha do C. Use uma pilha explícita num vetor (ou busca em largura)."
  - "Leia as referências para uma lista de adjacência compacta: um vetor com todas as referências e, para cada objeto, o início e o fim do trecho dele."
---

Um coletor de lixo não sabe o que é inútil; ele sabe o que é **inalcançável**. Mark & Sweep, o primeiro de todos (McCarthy, 1960), parte das raízes e marca tudo que consegue tocar. O que não foi marcado é devolvido.

## Tarefa

O heap tem `N` objetos, numerados de `0` a `N-1`. Cada objeto guarda referências para outros. Um conjunto de raízes (variáveis vivas) aponta para alguns deles. Liste os objetos que o coletor libera: os que não são alcançáveis a partir de nenhuma raiz, seguindo referências.

## Entrada

- Uma linha com $N$, com $1 \le N \le 2 \cdot 10^5$.
- $N$ linhas; a linha $i$ descreve o objeto $i$: um inteiro $k$ seguido de $k$ índices referenciados. A soma dos $k$ não passa de $4 \cdot 10^5$. Pode haver auto-referência e repetições.
- Uma linha com $R$ seguido de $R$ raízes.

## Saída

Os índices dos objetos coletados, em ordem crescente, um por linha. Se nada for coletado, `nada`.

## Exemplo

Entrada:

```
7
2 1 2
1 3
0
1 1
1 5
1 4
0
1 0
```

Saída:

```
4
5
6
```

`4` e `5` apontam um para o outro, mas ninguém vivo aponta para eles: é um ciclo morto. `6` está solto.

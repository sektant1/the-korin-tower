---
title: LRU Cache em O(1)
difficulty: 3
tags: [stl, hash, lista-ligada, cache, iteradores]
languages: [cpp]
timeLimitMs: 2000
memoryLimitMb: 128
order: 3
hints:
  - "Combine duas estruturas: uma `std::list<std::pair<int,int>>` com os itens do mais recente (frente) ao mais antigo (fundo), e um `std::unordered_map<int, iterador_da_lista>` para achar qualquer item em O(1)."
  - "`get` e `put` de chave existente: mova o nó para a frente com `lista.splice(lista.begin(), lista, it)`. O `splice` não invalida o iterador guardado no mapa."
  - "`put` de chave nova com o cache cheio: o mais antigo é `lista.back()`. Apague-o do mapa **e** da lista antes de inserir o novo, e devolva a chave removida."
  - "Atualizar o valor de uma chave existente **não** causa remoção, mesmo com o cache cheio."
---

Um cache **LRU** (*least recently used*) guarda no máximo $C$ itens. Quando enche, joga fora o item usado há mais tempo. É o que CPUs, bancos de dados e navegadores fazem o tempo todo.

Implemente a classe `LRUCache` do template. O `main` já está pronto; **não altere o `main`**.

## Operações

| Comando | Efeito | Saída |
|---|---|---|
| `get K` | devolve o valor de `K` e marca `K` como o mais recente | o valor, ou `-1` |
| `put K V` | grava `V` em `K` e marca `K` como o mais recente. Se `K` é nova e o cache já tem $C$ itens, remove o item menos recente antes | `evict X` se a chave `X` foi removida, senão nada |

As duas operações precisam rodar em **O(1)** (média).

## Entrada

A primeira linha tem a capacidade $C$ ($1 \le C \le 10^5$). Depois vêm até $2 \cdot 10^5$ comandos, um por linha. Chaves e valores são inteiros de $0$ a $10^9$.

## Saída

Uma linha para cada `get` e para cada `put` que removeu alguém.

## Exemplo

Entrada:

```
2
put 1 100
put 2 200
get 1
put 3 300
get 2
put 1 111
get 1
put 4 400
get 3
get 4
```

Saída:

```
100
evict 2
-1
111
evict 3
-1
400
```

Depois do `get 1`, a chave `2` virou a menos recente; por isso ela sai quando o `3` entra. O `put 1 111` só atualiza (a chave já existe), sem remover ninguém.

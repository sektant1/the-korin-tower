---
title: Tabela Hash do Zero
difficulty: 3
tags: [hash, malloc, structs, estruturas-de-dados]
languages: [c]
timeLimitMs: 2000
memoryLimitMb: 128
order: 5
hints:
  - "Comece com **encadeamento**: um vetor de `Entry*` (os baldes), e cada balde é uma lista ligada. Para achar o balde: `hash(chave) % capacidade`."
  - "Uma boa função de hash para strings é a FNV-1a: comece com `h = 1469598103934665603`, e para cada byte faça `h ^= byte; h *= 1099511628211;` (em `uint64_t`)."
  - "Se a capacidade for potência de 2, troque `% cap` por `& (cap - 1)`: mais rápido e dá o mesmo resultado."
  - "Com 200 mil chaves e 16 baldes, cada lista teria 12 mil nós. **Redimensione**: quando `count > 0.75 * cap`, dobre a capacidade e reinsira todos os nós (sem `malloc` novo, só reencadeie)."
  - "Remover de lista ligada sem caso especial para a cabeça: ande com um ponteiro para ponteiro (`Entry **pp = &baldes[i]`) e faça `*pp = (*pp)->next`."
---

Implemente um dicionário `string → inteiro` em C puro, sem bibliotecas. O `main` que lê os comandos já está pronto no template; você escreve as funções `ht_*`.

## Comandos

| Comando | Efeito | Saída |
|---|---|---|
| `set K V` | associa `V` à chave `K` (sobrescreve se já existir) | nada |
| `get K` | consulta | o valor, ou `nil` |
| `del K` | remove | `1` se removeu, `0` se não existia |
| `count` | | número de chaves |

As chaves têm de 1 a 32 caracteres `[a-z0-9_]`. Os valores são inteiros de 64 bits com sinal.

## Entrada

Até $2 \cdot 10^5$ comandos, um por linha, até o fim da entrada.

## Saída

Uma linha para cada `get`, `del` e `count`.

## Exemplo

Entrada:

```
set goku 9001
set vegeta 8000
get goku
set goku 9002
get goku
get kuririn
count
del vegeta
del vegeta
count
```

Saída:

```
9001
9002
nil
2
1
0
1
```

## Desempenho

Os testes ocultos têm dezenas de milhares de chaves. Uma lista simples, $O(n)$ por busca, estoura o tempo: você precisa de $O(1)$ em média, e isso exige **redimensionar** a tabela.

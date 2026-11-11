---
title: "Simulador de Cache"
difficulty: 5
tags: [arquitetura, cache, lru, bits]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 6
hints:
  - "Um endereço se divide em três campos: `bloco = endereco / B`, `conjunto = bloco % numConjuntos`, `tag = bloco / numConjuntos`. Como tudo é potência de dois, são deslocamentos e máscaras."
  - "Cada conjunto tem `A` vias. Guarde, por via, `valida`, `tag` e um carimbo de tempo da última vez que foi usada."
  - "No miss com o conjunto cheio, substitua a via de carimbo mais antigo (LRU). No hit, só atualize o carimbo."
---

Por que percorrer uma matriz por linhas é 10 vezes mais rápido que por colunas? A resposta mora na cache. Hoje você simula uma.

## A cache

- `S` bytes no total, blocos (linhas) de `B` bytes, associatividade `A` (vias por conjunto). `S`, `B` e `A` são potências de dois e `A` divide `S / B`. Logo há `S / (B * A)` conjuntos.
- Um endereço `e` cai no bloco `e / B`; o conjunto é `bloco mod conjuntos`; a tag é `bloco / conjuntos`.
- Um acesso é **hit** se alguma via do conjunto tem aquela tag. Senão é **miss**: o bloco entra no conjunto. Se não há via livre, sai a usada há mais tempo (LRU).
- A cache começa vazia. Só há leituras.

## Entrada

Uma linha com $S$, $B$ e $A$ (até $2^{20}$, $2^{10}$ e $64$). Depois, até $10^5$ linhas, cada uma com um endereço em hexadecimal com prefixo `0x`, menor que $2^{32}$.

## Saída

Duas linhas: `hits: H` e `misses: M`.

## Exemplo

Entrada:

```
64 16 1
0x0
0x4
0x40
0x0
0x10
```

Saída:

```
hits: 1
misses: 4
```

A cache tem 4 conjuntos de 1 via. `0x0` e `0x4` estão no mesmo bloco (hit no segundo). `0x40` cai no conjunto 0 e expulsa o bloco de `0x0`, então o `0x0` seguinte é miss.

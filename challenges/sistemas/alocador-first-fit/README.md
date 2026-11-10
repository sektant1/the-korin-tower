---
title: "Seu Próprio malloc: Alocador First-Fit"
difficulty: 4
tags: [malloc, free-list, memoria, ponteiros, coalescencia]
languages: [c]
timeLimitMs: 2000
memoryLimitMb: 128
order: 1
hints:
  - "Mantenha **todos** os blocos (livres e ocupados) numa lista duplamente ligada em ordem de endereço. Cada nó: `endereco`, `tamanho`, `livre`, `id`, `prev`, `next`. No começo há um único bloco livre `[0, H)`."
  - "Arredonde o pedido para múltiplo de 8: `(n + 7) & ~7`. É assim que o `malloc` de verdade garante alinhamento."
  - "`malloc`: ande do começo e pare no **primeiro** bloco livre com tamanho suficiente. Se sobrar espaço, divida: o bloco vira `[addr, addr+need)` ocupado e um novo nó livre `[addr+need, fim)` entra logo depois."
  - "Para achar o bloco de um `id` no `free` em O(1), guarde um vetor `bloco_do_id[id]` (os ids vão até $10^6$)."
  - "Coalescência: depois de marcar como livre, se o `next` também estiver livre, absorva-o; depois, se o `prev` estiver livre, deixe que ele absorva você. Assim nunca existem dois blocos livres vizinhos."
---

Implemente o coração de um `malloc`: um alocador **first-fit** sobre um heap simulado de $H$ bytes, com divisão de blocos e **coalescência** de blocos livres vizinhos.

Nada aqui usa memória de verdade: o heap é só um intervalo de endereços `[0, H)`, e você gerencia quem está usando o quê.

## Regras

- **`malloc ID N`**: o tamanho pedido é arredondado para o próximo múltiplo de 8. Procure, em ordem crescente de endereço, o **primeiro** bloco livre com tamanho suficiente. Se achar, ocupe o **início** dele (o resto continua livre) e imprima o endereço. Se não houver bloco grande o bastante, imprima `NULL`.
- **`free ID`**: libera o bloco alocado com esse `ID` e junta-o aos blocos livres imediatamente antes e depois, se existirem. Se `ID` não estiver alocado (nunca foi, ou já foi liberado, ou o `malloc` dele deu `NULL`), imprima `erro`.
- **`dump`**: imprima os blocos livres em ordem de endereço, no formato `livre: [a,b) [c,d) ...`, ou `livre: (nada)`.
- **`stats`**: imprima `usado U livre L maior M`, onde `M` é o tamanho do maior bloco livre (0 se não houver).

Cada `ID` é usado em no máximo um `malloc` que deu certo de cada vez. Um `ID` liberado pode voltar num `malloc` depois.

## Entrada

A primeira linha tem $H$ ($8 \le H \le 2^{24}$, múltiplo de 8). Depois vêm até $10^4$ comandos, um por linha. $1 \le ID \le 10^6$ e $1 \le N \le 2^{24}$.

## Saída

Uma linha por `malloc` (endereço ou `NULL`), por `free` que falhou (`erro`), por `dump` e por `stats`.

## Exemplo

Entrada:

```
64
malloc 1 10
malloc 2 8
malloc 3 48
dump
free 1
dump
malloc 4 20
free 2
dump
free 2
stats
```

Saída:

```
0
16
NULL
livre: [24,64)
livre: [0,16) [24,64)
24
livre: [0,24) [48,64)
erro
usado 24 livre 40 maior 24
```

Passo a passo: o pedido de 10 bytes vira 16 (`[0,16)`), o de 8 fica `[16,24)`, e o de 48 falha porque só restam 40 bytes livres. O `malloc 4 20` (vira 24) não cabe em `[0,16)`, então vai para `[24,48)`. Ao liberar o `2`, o bloco `[16,24)` se junta com `[0,16)` e vira `[0,24)`. O segundo `free 2` é um *double free*.

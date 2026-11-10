---
title: Truques com Bits
difficulty: 2
tags: [bits, inteiros, uint64, hackers-delight]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 3
hints:
  - "Use `uint64_t` (de `<stdint.h>`) e leia com `scanf(\"%\" SCNu64, &n)`, de `<inttypes.h>`. Os números vão até $2^{64}-1$, que não cabe em `long long` com sinal."
  - "Popcount: o truque de Kernighan `n &= n - 1` apaga o bit 1 mais baixo. Conte quantas vezes dá para fazer isso até `n` virar 0."
  - "Potência de 2 tem **exatamente um** bit ligado. Teste sem laço: `n != 0 && (n & (n - 1)) == 0`."
  - "Bit mais alto: desloque `n` para a direita até zerar, contando os passos. Para `n = 0` a resposta é `-1`."
  - "Código de Gray é uma linha só: `n ^ (n >> 1)`."
---

Responda, para cada número, quatro perguntas clássicas sobre a representação binária dele.

## Tarefa

Para cada inteiro sem sinal de 64 bits $n$, imprima:

1. **popcount**: quantos bits valem `1`;
2. **msb**: a posição do bit `1` mais significativo (o bit 0 é o menos significativo), ou `-1` se $n = 0$;
3. **potência de 2**: `sim` se $n$ é potência de 2, senão `nao` (0 não é potência de 2);
4. **Gray**: o código de Gray de $n$, isto é, $n \oplus (n \gg 1)$, em decimal.

Tente fazer sem `__builtin_popcount` e afins: o objetivo é entender os truques.

## Entrada

A primeira linha tem $T$ ($1 \le T \le 10^5$). Depois vêm $T$ linhas, cada uma com um inteiro $0 \le n \le 2^{64} - 1$.

## Saída

$T$ linhas no formato `popcount msb potencia gray`.

## Exemplo

Entrada:

```
4
0
1
12
18446744073709551615
```

Saída:

```
0 -1 nao 0
1 0 sim 1
2 3 nao 10
64 63 nao 9223372036854775808
```

$12 = 1100_2$: dois bits ligados, o mais alto na posição 3, e $1100 \oplus 0110 = 1010_2 = 10$.

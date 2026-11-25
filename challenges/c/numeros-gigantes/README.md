---
title: "BigInt"
difficulty: 3
tags: [bigint, strings, aritmetica, arrays]
languages: [c, cpp, python]
timeLimitMs: 2000
memoryLimitMb: 64
order: 4
hints:
  - "Guarde cada número como um vetor de dígitos ao contrário (`d[0]` é a unidade). Assim o índice `i` é a casa $10^i$ e o vai-um anda para índices maiores."
  - "Soma: percorra até o maior tamanho + 1, somando `a[i] + b[i] + vai_um`. O dígito é `% 10` e o novo vai-um é `/ 10`."
  - "Subtração: se `A < B`, calcule `B - A` e imprima um `-` na frente. Para comparar, compare primeiro o tamanho e, se empatar, as strings (`strcmp`)."
  - "Multiplicação de escola: `r[i + j] += a[i] * b[j]` para todo par, e só depois propague o vai-um uma vez. O resultado tem no máximo `la + lb` dígitos."
  - "No fim, remova zeros à esquerda (mas deixe pelo menos um dígito) e nunca imprima `-0`."
---

Os inteiros do C vão até $2^{63}-1$, e aqui os números têm até 1000 dígitos. Implemente soma, subtração e multiplicação do jeito que se faz no caderno.

## Entrada

Várias linhas (até 200), até o fim da entrada. Cada uma tem a forma

```
A op B
```

onde `op` é `+`, `-` ou `*`, e $A$, $B$ são inteiros não negativos com 1 a 1000 dígitos, sem zeros à esquerda (exceto o próprio `0`).

## Saída

Para cada linha, o resultado exato, sem zeros à esquerda. Resultados negativos (só possíveis na subtração) começam com `-`. Zero é sempre `0`, nunca `-0`.

## Exemplo

Entrada:

```
99999999999999999999 + 1
5 - 12
123456789 * 987654321
42 - 42
```

Saída:

```
100000000000000000000
-7
121932631112635269
0
```

## Limites de desempenho

As multiplicações maiores têm $1000 \times 1000$ dígitos. O algoritmo de escola, $O(n \cdot m)$, passa com folga. Karatsuba não é necessário, mas pode usar se quiser.

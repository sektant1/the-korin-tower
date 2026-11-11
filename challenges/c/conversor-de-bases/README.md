---
title: "Conversor de Bases"
difficulty: 1
tags: [iniciante, bases, aritmetica, strings]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 5
hints:
  - "Dividir por `B` repetidamente dá os dígitos de trás para a frente: o resto é o dígito, o quociente segue. Guarde num vetor e imprima invertido."
  - "Para dígitos acima de 9 use uma tabela: `\"0123456789ABCDEF\"[resto]`."
  - "$10^{18}$ não cabe em `int` nem em `long` de 32 bits. Use `unsigned long long` e leia com `%llu`."
  - "O zero é o único caso que não entra no laço: imprima `0` direto."
---

Antes de entender bits, entenda bases. O mesmo número se escreve de muitos jeitos: `255` é `11111111` em base 2, `377` em base 8 e `FF` em base 16.

## Tarefa

Para cada linha da entrada, converta o número `N` para a base `B` e imprima o resultado. Dígitos acima de 9 são as letras maiúsculas `A` a `F`.

## Entrada

Várias linhas, até o fim da entrada. Cada uma tem dois inteiros: $N$, com $0 \le N \le 10^{18}$, e a base $B$, com $2 \le B \le 16$.

## Saída

Uma linha por conversão, sem zeros à esquerda. O número zero é `0` em qualquer base.

## Exemplo

Entrada:

```
255 2
255 16
0 7
```

Saída:

```
11111111
FF
0
```

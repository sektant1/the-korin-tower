---
title: FizzBuzz
difficulty: 1
tags: [iniciante, loops, stdio]
languages: [c, fortran, pascal, d]
timeLimitMs: 1000
memoryLimitMb: 64
order: 1
hints:
  - "Leia o número com `scanf(\"%d\", &n)` e faça um `for` de `1` até `n` **inclusive**."
  - "O operador `%` dá o resto da divisão: `i % 3 == 0` significa que `i` é múltiplo de 3."
  - "Teste o caso **15** primeiro: um número múltiplo de 3 *e* de 5 é múltiplo de 15. A ordem dos `if` importa."
---

O desafio que separa os programadores dos não-programadores desde 2007.

## Tarefa

Leia um inteiro `N` da entrada padrão e imprima os números de `1` até `N`, um por linha, com estas regras:

- múltiplos de **3** viram `Fizz`
- múltiplos de **5** viram `Buzz`
- múltiplos de **3 e 5** viram `FizzBuzz`

## Entrada

Uma linha com o inteiro $N$, com $1 \le N \le 10^5$.

## Saída

$N$ linhas, conforme as regras acima.

## Exemplo

Entrada:

```
5
```

Saída:

```
1
2
Fizz
4
Buzz
```

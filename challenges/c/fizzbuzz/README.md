---
title: "FizzBuzz"
difficulty: 1
tags: [iniciante, loops, stdio]
languages: [c, cpp, rust]
timeLimitMs: 1000
memoryLimitMb: 64
order: 1
hints:
  - "Leia o número com `scanf(\"%d\", &n)` e faça um `for` de `1` até `n`, incluindo o `n`."
  - "O operador `%` dá o resto da divisão: `i % 3 == 0` significa que `i` é múltiplo de 3."
  - "Teste o 15 primeiro: múltiplo de 3 e de 5 é múltiplo de 15. A ordem dos `if` importa."
---

Pergunta de entrevista desde 2007, usada para ver se a pessoa consegue escrever um laço com `if`.

## Tarefa

Leia um inteiro `N` da entrada padrão e imprima os números de `1` até `N`, um por linha, trocando:

- múltiplos de 3 por `Fizz`
- múltiplos de 5 por `Buzz`
- múltiplos de 3 e 5 ao mesmo tempo por `FizzBuzz`

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

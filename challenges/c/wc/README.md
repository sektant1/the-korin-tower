---
title: "wc: Word Counting"
difficulty: 1
tags: [iniciante, stdio, unix, strings]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 2
hints:
  - "Leia um caractere por vez com `getchar()` até ele devolver `EOF`. Guarde o retorno num `int`, não num `char`: `EOF` não cabe em `char`."
  - "Bytes é fácil: some 1 a cada caractere lido. Linhas = quantos `'\\n'` apareceram (uma última linha sem `\\n` não conta, igual ao `wc` de verdade)."
  - "Para palavras, use um estado `dentro_de_palavra`. Uma palavra começa quando você sai de um espaço (`isspace`) e entra num caractere que não é espaço."
  - "Acentos: `ã` são 2 bytes em UTF-8. Você conta bytes, não letras, então não precisa fazer nada especial."
---

Escreva uma versão do `wc` do Unix que conta linhas, palavras e bytes da entrada padrão.

## Definições

Linhas é o número de caracteres `\n` na entrada.

Palavra é uma sequência máxima de caracteres que não são espaço em branco. Espaço em branco é espaço, `\t`, `\n`, `\v`, `\f` ou `\r`, o mesmo conjunto que `isspace` aceita no locale padrão do C.

Bytes é o total de bytes lidos. Em UTF-8, `ação` tem 4 letras e 6 bytes.

## Entrada

Um texto qualquer, possivelmente vazio, com até $10^6$ bytes.

## Saída

Uma linha com três inteiros separados por espaço: `linhas palavras bytes`.

## Exemplo

Entrada (note a quebra de linha no fim):

```
ola mundo
  tudo   bem?
```

Saída:

```
2 4 24
```

## Memória

Leia byte a byte, sem guardar o texto inteiro. É assim que `cat`, `grep` e `tr` funcionam. O programa tem que usar memória constante, independente do tamanho da entrada.

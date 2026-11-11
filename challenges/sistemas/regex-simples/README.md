---
title: "Regex de Bolso"
difficulty: 4
tags: [regex, recursao, strings, kernighan]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 3
hints:
  - "É o casador de Rob Pike em *The Practice of Programming*: três funções recursivas, menos de 40 linhas."
  - "`match` tenta casar a partir de cada posição do texto (ou só do começo, com `^`). `matchhere` casa o padrão no começo do texto. `matchstar` trata `c*`: tenta o resto com zero, uma, duas... repetições."
  - "Olhe o segundo caractere do padrão antes do primeiro: se for `*`, o primeiro é o que se repete. `$` só vale no fim do padrão, e casa só com texto vazio."
---

Antes de PCRE existia um casador de 30 linhas, escrito por Rob Pike, que já resolvia quase tudo. Hoje ele é seu.

## O dialeto

| padrão | casa |
|---|---|
| `c` | o caractere `c` |
| `.` | qualquer caractere |
| `c*` | zero ou mais `c` (e `.*`, zero ou mais de qualquer coisa) |
| `^` | o começo do texto (só no início do padrão) |
| `$` | o fim do texto (só no fim do padrão) |

Sem `^`, o padrão pode casar em qualquer posição do texto. `*` é guloso, mas recua: `a*ab` casa `aab`.

## Tarefa

Leia o padrão e, para cada linha de texto, responda se casa.

## Entrada

A primeira linha é o padrão, com 1 a 100 caracteres, só ASCII imprimível. As linhas seguintes, até o fim da entrada, são textos de até 1000 caracteres; uma linha vazia é um texto vazio.

## Saída

Para cada texto, `sim` ou `nao`.

## Exemplo

Entrada:

```
^k.*n$
karin
kamehameha
korin
```

Saída:

```
sim
nao
sim
```

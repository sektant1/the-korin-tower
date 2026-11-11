---
title: "Sudoku por Força Bruta Esperta"
difficulty: 5
tags: [backtracking, bits, recursao]
languages: [c, cpp]
timeLimitMs: 2000
memoryLimitMb: 64
order: 6
hints:
  - "Backtracking: ache uma casa vazia, tente os dígitos válidos, recorra; se nenhum funciona, desfaça e volte. Sudokus comuns resolvem em milissegundos."
  - "Para checar \"dígito válido\" em O(1), guarde três vetores de máscaras de bits: `linha[9]`, `coluna[9]`, `bloco[9]`. O bloco da casa `(r, c)` é `(r/3)*3 + c/3`."
  - "Os difíceis (como o do Arto Inkala) derrubam o backtracking ingênuo. Escolha sempre a casa vazia com **menos candidatos**: o número de ramos despenca."
  - "Confira as pistas iniciais antes de começar: duas pistas iguais na mesma linha é `impossivel` imediato, e o backtracking não detecta isso sozinho."
---

Nove linhas, nove colunas, nove blocos, cada um com os dígitos de 1 a 9 sem repetir. Resolver na mão leva uma tarde; resolver com backtracking leva milissegundos, se você podar certo.

## Tarefa

Resolva o Sudoku. Se não houver solução (pistas iniciais já se contradizem, ou nenhuma combinação fecha), imprima `impossivel`.

## Entrada

Nove linhas com nove caracteres cada: dígitos `1` a `9` ou `.` para casa vazia. Quando existe solução, ela é única.

## Saída

As nove linhas resolvidas, ou `impossivel`.

## Exemplo

Entrada:

```
53..7....
6..195...
.98....6.
8...6...3
4..8.3..1
7...2...6
.6....28.
...419..5
....8..79
```

Saída:

```
534678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
```

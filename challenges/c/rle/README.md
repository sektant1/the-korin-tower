---
title: "Compressão RLE"
difficulty: 2
tags: [strings, compressao, bytes]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 6
hints:
  - "Percorra a linha com dois índices: `i` marca o começo da sequência, `j` avança enquanto `s[j] == s[i]`."
  - "Linhas podem ser longas: leia com `fgets` num buffer grande (ou `getline`) e tire o `\\\\n` do fim antes de contar."
  - "Uma linha vazia vira uma linha vazia. Não imprima `0`."
---

Run-length encoding é a compressão mais simples que existe: `aaaabbc` vira `4a2b1c`. Foi assim que o formato PCX e os faxes economizavam bytes.

## Tarefa

Para cada linha da entrada, imprima a versão comprimida: cada sequência de caracteres iguais vira a contagem seguida do caractere.

## Entrada

Linhas de texto até o fim da entrada, cada uma com até $10^5$ caracteres, só letras ASCII (`a`-`z`, `A`-`Z`). Pode haver linhas vazias.

## Saída

Uma linha comprimida para cada linha de entrada. Linha vazia gera linha vazia.

## Exemplo

Entrada:

```
aaaabbc
KAMEHAMEHAAAAA
z
```

Saída:

```
4a2b1c
1K1A1M1E1H1A1M1E1H5A
1z
```

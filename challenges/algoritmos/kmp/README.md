---
title: "KMP"
difficulty: 4
tags: [strings, kmp, automato]
languages: [c, cpp, python]
timeLimitMs: 1000
memoryLimitMb: 64
order: 5
hints:
  - "O ingênuo compara o padrão em cada posição: $|T| \\cdot |P| = 10^{10}$ no pior caso. Há um teste feito para isso."
  - "Pré-calcule, para cada prefixo do padrão, o tamanho da maior borda (prefixo que também é sufixo). É a tabela de falhas do KMP."
  - "Ao errar na posição `k` do padrão, não volte no texto: volte no padrão para `falha[k-1]` e compare de novo. Depois de um casamento completo, faça o mesmo para achar sobreposições."
---

`strstr` só acha a primeira ocorrência. Aqui você precisa achar todas, em tempo linear. Alguns testes são montados para derrubar a busca ingênua.

## Tarefa

Dado um padrão `P` e um texto `T`, imprima todas as posições (a partir de 0) onde `P` ocorre em `T`, em ordem crescente, inclusive ocorrências sobrepostas.

## Entrada

Duas linhas: o padrão $P$ e o texto $T$, só letras minúsculas, com $1 \le |P| \le |T| \le 2 \cdot 10^5$.

## Saída

Uma posição por linha. Se não houver ocorrência, `nenhuma`.

## Exemplo

Entrada:

```
aba
abababa
```

Saída:

```
0
2
4
```

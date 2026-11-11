---
title: Maior Substring sem Repetição
difficulty: 2
tags: [janela-deslizante, strings, dois-ponteiros, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 3
hints:
  - "Testar toda substring é $O(N^2)$ ou pior. Pense numa **janela** `[i, j)` que só cresce para a direita."
  - "Guarde, para cada caractere, a **última posição** em que apareceu (um vetor de 128 ou 256 inteiros basta: a entrada é ASCII)."
  - "Ao avançar `j`, se `s[j]` apareceu em uma posição $\\ge i$, pule `i` para `ultima[s[j]] + 1`. A resposta é o maior `j - i + 1`."
---

Dada uma string, encontre o comprimento da **maior substring** (trecho contíguo) **sem caracteres repetidos**.

## Entrada

A primeira linha tem $T$ ($1 \le T \le 10^4$). Cada uma das $T$ linhas seguintes tem uma string não vazia de caracteres ASCII visíveis (sem espaços). A soma dos comprimentos não passa de $10^6$.

## Saída

Para cada caso, o comprimento pedido.

## Exemplo

Entrada:

```
4
abcabcbb
bbbbb
pwwkew
abba
```

Saída:

```
3
1
3
2
```

Em `abcabcbb` a resposta é `abc`; em `pwwkew` é `wke` (`pwke` é uma subsequência, não uma substring). Em `abba`, cuidado: ao chegar no último `a`, o início da janela já passou do primeiro `a`.

---

> Versão stdin/stdout de [LeetCode #3 Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/).

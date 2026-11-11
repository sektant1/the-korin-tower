---
title: Água da Chuva
difficulty: 3
tags: [dois-ponteiros, vetor, prefixos, leetcode]
languages: [c, cpp, rust]
timeLimitMs: 2000
memoryLimitMb: 256
order: 5
hints:
  - "A água em cima da coluna $i$ é $\\min(\\text{maior à esquerda}, \\text{maior à direita}) - h_i$, se isso for positivo."
  - "Dá para pré-calcular dois vetores: `maxEsq[i]` e `maxDir[i]`. $O(N)$ tempo, $O(N)$ memória. Já passa."
  - "Para $O(1)$ de memória: dois ponteiros, um em cada ponta, e dois máximos. Avance sempre o lado com a **menor** altura máxima: a água dele já está decidida."
  - "O total pode passar de 32 bits ($2 \\cdot 10^5$ colunas $\\times 10^5$ de altura). Some em `long long`/`i64`."
---

Um mapa de elevação é dado por $N$ colunas de largura 1 com alturas $h_i$. Choveu muito. **Quanta água** fica presa entre as colunas?

```
        #
    #~~~##~#
  #~##~#####
  0 1 0 2 1 0 1 3 2 1 2 1   ->  6 unidades
```

## Entrada

A primeira linha tem $N$ ($1 \le N \le 2 \cdot 10^5$). A segunda tem as $N$ alturas ($0 \le h_i \le 10^5$).

## Saída

O total de água presa.

## Exemplo

Entrada:

```
12
0 1 0 2 1 0 1 3 2 1 2 1
```

Saída:

```
6
```

---

> Versão stdin/stdout de [LeetCode #42 Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/).

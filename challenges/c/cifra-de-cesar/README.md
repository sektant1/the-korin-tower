---
title: Cifra de César
difficulty: 1
tags: [iniciante, strings, ascii]
languages: [c, cpp]
timeLimitMs: 1000
memoryLimitMb: 64
order: 3
hints:
  - "Letras são números: `'a'` vale 97 e `'z'` vale 122. `c - 'a'` dá a posição no alfabeto, de 0 a 25."
  - "Deslocar é `(pos + k) % 26`, e depois voltar para letra com `'a' + ...`. Maiúsculas usam `'A'`."
  - "Para `K` negativo, `%` em C pode dar resto negativo. Normalize antes: `k = ((k % 26) + 26) % 26`."
  - "Leia caractere a caractere com `getchar()` até `EOF`: qualquer coisa que não é letra passa igual, inclusive a quebra de linha."
---

A cifra mais antiga do mundo: cada letra anda `K` posições no alfabeto. `A` com `K = 3` vira `D`; `Z` dá a volta e vira `C`.

## Tarefa

Leia o deslocamento `K` e, depois, um texto de várias linhas. Imprima o texto cifrado.

- Letras minúsculas continuam minúsculas; maiúsculas, maiúsculas.
- Espaços, pontuação, dígitos e quebras de linha passam sem mudar.
- `K` pode ser negativo: aí as letras andam para trás.

## Entrada

A primeira linha tem o inteiro $K$, com $-25 \le K \le 25$. As linhas seguintes, até o fim da entrada, são o texto. Pode haver linhas vazias.

## Saída

O texto cifrado, linha por linha, na mesma ordem.

## Exemplo

Entrada:

```
3
Ola, Mundo!
xyz
```

Saída:

```
Rod, Pxqgr!
abc
```

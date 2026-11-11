---
title: "Interpretador Brainf*ck"
difficulty: 5
tags: [interpretador, turing, bytes, fita]
languages: [c, cpp]
timeLimitMs: 2000
memoryLimitMb: 64
order: 4
hints:
  - "Oito instruções e uma fita de 30000 bytes. O único cuidado de verdade é o par `[` `]`: pré-calcule para cada colchete o índice do par, com uma pilha, antes de executar."
  - "Células são `unsigned char`: `255 + 1` vira `0` sozinho em C. Não use `int` para a fita."
  - "A entrada do programa (`,`) é o que vem **depois** da primeira linha. Leia o programa com `fgets` e o resto com `getchar()`; em `EOF`, grave `0`."
  - "Conte as instruções executadas e pare em $10^6$. Sem isso, `+[]` trava o seu juiz."
---

A menor linguagem Turing-completa que existe: oito símbolos, uma fita, um ponteiro. Escrever o interpretador é um rito de passagem.

## A máquina

Fita de 30000 células de um byte (0 a 255, com volta), ponteiro começando na célula 0, e um programa com os símbolos:

| símbolo | efeito |
|---|---|
| `>` `<` | move o ponteiro para a direita / esquerda |
| `+` `-` | incrementa / decrementa a célula atual (módulo 256) |
| `.` | escreve o byte da célula atual na saída |
| `,` | lê um byte da entrada para a célula atual; no fim da entrada, grava `0` |
| `[` | se a célula atual é 0, pula para depois do `]` correspondente |
| `]` | se a célula atual não é 0, volta para depois do `[` correspondente |

Qualquer outro caractere no programa é comentário e deve ser ignorado.

## Erros

- colchetes sem par: imprima `erro: colchetes` antes de executar qualquer coisa
- ponteiro saindo da fita: `erro: fita` e pare
- mais de $10^6$ instruções executadas: `erro: limite de passos` e pare

A mensagem de erro vem depois do que já foi escrito, numa linha própria.

## Entrada

A primeira linha é o programa (até $10^4$ caracteres). Tudo depois da quebra de linha é a entrada do programa, byte a byte.

## Saída

Exatamente os bytes escritos pelo programa, e a mensagem de erro, se houver.

## Exemplo

Entrada:

```
,[.,]
ola korin
```

Saída:

```
ola korin
```

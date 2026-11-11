---
title: "Máquina Virtual de Pilha"
difficulty: 4
tags: [vm, interpretador, bytecode, pilha]
languages: [c, cpp]
timeLimitMs: 2000
memoryLimitMb: 64
order: 2
hints:
  - "Leia todo o programa para um vetor de instruções antes de executar: os saltos precisam enxergar o programa inteiro."
  - "Um `switch` sobre o opcode e um `pc` (contador de programa) bastam. `jmp` troca o `pc`; todo o resto faz `pc++`."
  - "Confira o tamanho da pilha **antes** de cada operação: `add` precisa de 2 valores, `print` de 1. Em erro, imprima a mensagem e pare na hora."
  - "Divisão em C já trunca em direção a zero e `%` segue o sinal do dividendo: é exatamente o pedido. Use `long long` e, para somar sem UB, faça a conta em `unsigned long long`."
---

Toda linguagem vira, em algum ponto, instruções simples executadas em sequência. A sua tarefa é a máquina que executa.

## A máquina

Uma pilha de inteiros de 64 bits com sinal e um contador de programa `pc`, que começa em 0. Instruções (`L` é um índice de instrução, a partir de 0):

| instrução | efeito |
|---|---|
| `push N` | empilha `N` |
| `pop` | descarta o topo |
| `dup` | duplica o topo |
| `swap` | troca os dois do topo |
| `over` | empilha uma cópia do segundo elemento (`a b` → `a b a`) |
| `add` `sub` `mul` `div` `mod` | `a b` → `a op b` (o topo é `b`); `div` trunca em direção a zero, `mod` tem o sinal de `a` |
| `print` | desempilha e imprime o valor numa linha |
| `jmp L` | pula para `L` |
| `jz L` | desempilha; se for zero, pula para `L` |
| `jnz L` | desempilha; se não for zero, pula para `L` |
| `halt` | para |

A execução também para quando o `pc` passa da última instrução. Soma, subtração e multiplicação dão a volta em 64 bits (complemento de dois).

## Erros

Ao detectar um erro, imprima a mensagem numa linha e pare:

- operação sem valores suficientes na pilha: `erro: pilha vazia`
- `div` ou `mod` por zero: `erro: divisao por zero`
- salto para fora do programa: `erro: salto invalido`
- mais de 100000 valores na pilha: `erro: pilha cheia`
- mais de $10^6$ instruções executadas: `erro: limite de passos`

## Entrada

Uma linha com o número de instruções $N$, com $1 \le N \le 10^4$, e $N$ linhas, uma instrução por linha. `N` em `push` cabe em 64 bits com sinal.

## Saída

Tudo que `print` imprimiu, na ordem, e a mensagem de erro, se houver.

## Exemplo

Entrada:

```
9
push 5
dup
print
push 1
sub
dup
jnz 1
pop
halt
```

Saída:

```
5
4
3
2
1
```

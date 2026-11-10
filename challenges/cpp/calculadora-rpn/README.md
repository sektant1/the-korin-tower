---
title: Calculadora RPN (HP-12C)
difficulty: 2
tags: [pilha, parsing, strings, stl]
languages: [cpp, c]
timeLimitMs: 1000
memoryLimitMb: 64
order: 2
hints:
  - "Leia linha a linha (`std::getline`) e separe os tokens com um `std::istringstream`. Cada linha é uma expressão independente, com a pilha zerada."
  - "Número ou operador? `-` sozinho é operador; `-7` é número. Teste se o token tem mais de um caractere ou se o primeiro é dígito."
  - "Operador binário: tire `b` do topo, depois `a`, e empilhe `a op b`. A ordem importa: `10 3 -` é `10 - 3`."
  - "Erros possíveis: pilha com menos operandos que o operador precisa, divisão ou resto por zero, e terminar com 0 ou 2+ itens na pilha. Em qualquer um, a linha inteira vale `erro`."
  - "Em C e C++, `/` trunca em direção a zero e `%` tem o sinal do dividendo: `-7 2 /` dá `-3` e `-7 2 %` dá `-1`. É exatamente o que a saída espera."
---

Antes das calculadoras com parênteses existia a **notação polonesa reversa**: os operandos vêm primeiro, o operador depois, e uma pilha resolve tudo. `3 4 + 2 *` é $(3 + 4) \times 2$.

## Tokens

| Token | Efeito na pilha (topo à direita) |
|---|---|
| inteiro (ex.: `42`, `-7`) | empilha o número |
| `+` `-` `*` `/` `%` | `a b → (a op b)` |
| `dup` | `a → a a` |
| `swap` | `a b → b a` |
| `drop` | `a → ` |

`/` e `%` seguem as regras do C: divisão truncada em direção a zero.

## Entrada

Até 1000 linhas, cada uma com uma expressão de 1 a 1000 tokens separados por espaço. Todos os valores intermediários cabem em 64 bits com sinal.

## Saída

Para cada linha, o único valor que sobrou na pilha, ou `erro` se a expressão for inválida: faltou operando, houve divisão ou resto por zero, ou a pilha não terminou com exatamente um item.

## Exemplo

Entrada:

```
3 4 + 2 *
10 3 -
-7 2 /
-7 2 %
5 dup *
1 2 swap -
1 +
1 2
8 0 /
```

Saída:

```
14
7
-3
-1
25
1
erro
erro
erro
```

---
title: Linked List Genérica
difficulty: 3
tags: [templates, raii, ponteiros, regra-dos-tres]
languages: [cpp]
timeLimitMs: 2000
memoryLimitMb: 128
order: 1
hints:
  - "Guarde `head_`, `tail_` e `size_`. Com `tail_`, `push_back` fica O(1)."
  - "`pop_front` em lista de 1 elemento precisa zerar **também** o `tail_`. Esse é o bug nº 1."
  - "Para inverter: percorra a lista com três ponteiros (`prev`, `cur`, `next`) e no fim troque `head_` com `tail_`."
  - "Cópia profunda: no construtor de cópia, faça `push_back` de cada elemento de `other`. No `operator=`, use *copy-and-swap*: receba por valor e troque os campos com `std::swap`."
---

Implemente `LinkedList<T>`, uma lista simplesmente encadeada **genérica**, sem usar `std::list`, `std::vector` ou qualquer container da STL dentro da classe.

O `main` já está pronto no template: ele lê comandos da entrada e chama sua classe. **Não altere o `main`.**

## O que implementar

| Método | Comportamento |
|---|---|
| `push_front(x)` / `push_back(x)` | insere no início / fim, O(1) |
| `pop_front()` | remove o primeiro e devolve `std::optional<T>` (vazio se a lista estiver vazia) |
| `size()` | número de elementos |
| `reverse()` | inverte a lista **no lugar**, sem alocar nós novos |
| `find(x)` | índice da primeira ocorrência, ou `-1` |
| `for_each(f)` | chama `f(elem)` para cada elemento, em ordem |
| construtor de cópia, `operator=`, destrutor | cópia **profunda** e nenhum vazamento |

## Entrada

A primeira linha é o tipo dos elementos: `int` ou `string`. Depois vêm comandos, um por linha, até o fim da entrada:

```
push_front X | push_back X | pop_front | size | print
reverse | find X | snapshot | print_snapshot
```

`snapshot` copia a lista atual para uma segunda lista (`snap = list;`), e `print_snapshot` imprime essa cópia. Se a cópia for rasa, mudanças posteriores na lista original vão "vazar" para o snapshot.

## Saída

- `pop_front`: o valor removido, ou `vazia`
- `size`, `find`: um número
- `print` / `print_snapshot`: `[a, b, c]` (ou `[]`)

## Exemplo

```
int
push_back 1
push_back 2
push_front 0
print
reverse
print
pop_front
size
```

Saída:

```
[0, 1, 2]
[2, 1, 0]
2
2
```

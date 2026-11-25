---
title: "Vec<T>"
difficulty: 4
tags: [unsafe, alocação, genéricos, drop]
languages: [rust]
timeLimitMs: 3000
memoryLimitMb: 128
order: 1
hints:
  - "Campos: `ptr: NonNull<T>`, `cap: usize`, `len: usize`. Com `cap == 0`, use `NonNull::dangling()` e não aloque nada."
  - "Para crescer: `Layout::array::<T>(nova_cap)`, depois `alloc` (se `cap == 0`) ou `realloc` (caso contrário). Se o ponteiro voltar nulo, chame `std::alloc::handle_alloc_error`."
  - "`pop` não pode copiar: use `ptr::read(self.ptr.as_ptr().add(self.len))` depois de decrementar `len`. O valor sai da memória sem ser duplicado."
  - "`insert`/`remove` deslocam os elementos com `ptr::copy` (que aceita regiões sobrepostas, como `memmove`)."
  - "No `Drop`: primeiro `while self.pop().is_some() {}` (para rodar o drop de cada `T`), depois `dealloc` se `cap > 0`."
---

Reimplemente uma versão pequena de `Vec<T>` com alocação manual (`std::alloc`). Não pode usar `Vec`, `Box<[T]>` ou qualquer coleção da std dentro de `MyVec`.

O `main` que lê os comandos fica escondido e é anexado ao seu código na hora de rodar: você escreve só a struct, sem `fn main`.

## API

```rust
impl<T> MyVec<T> {
    fn new() -> Self;
    fn push(&mut self, x: T);
    fn pop(&mut self) -> Option<T>;
    fn get(&self, i: usize) -> Option<&T>;
    fn insert(&mut self, i: usize, x: T); // 0 <= i <= len (o driver garante)
    fn remove(&mut self, i: usize) -> T;  // 0 <= i <  len (o driver garante)
    fn len(&self) -> usize;
    fn capacity(&self) -> usize;
    fn as_slice(&self) -> &[T];
}
impl<T> Drop for MyVec<T> { ... }
```

### Regra de crescimento

Os testes conferem a capacidade. Ela começa em `0` e, quando lota, vai para $\max(4, 2 \cdot cap)$:

$$0 \to 4 \to 8 \to 16 \to 32 \to \dots$$

## Entrada

Primeira linha: `i64` ou `string`. Depois, comandos até o fim:

```
push X | pop | get I | insert I X | remove I | len | cap | print
```

## Saída

- `pop` e `get`: o valor, ou `None`
- `remove`: o valor removido
- `insert`/`remove` com índice inválido: `erro` (o `main` trata isso)
- `print`: `[a, b, c]`

## Exemplo

Entrada:

```
i64
push 10
push 20
insert 0 5
print
cap
remove 1
print
```

Saída:

```
[5, 10, 20]
4
10
[5, 20]
```

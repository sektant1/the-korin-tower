---
title: Referência do Markdown
description: Tudo o que o texto de um post aceita, com o resultado ao lado.
kind: referencia
series: bastidores
part: 2
tags: [biblioteca, markdown]
level: 1
date: 2026-11-12
draft: true
challenges: [fizzbuzz]
---

O texto usa Markdown com as extensões do GitHub (tabelas, listas de tarefa, ~~riscado~~), fórmulas em LaTeX e alguns atalhos da torre. HTML cru é ignorado.

## Títulos e sumário

Use `##` para seções e `###` para subseções. Eles entram no **sumário** (ao lado do texto em telas largas, ou no botão "Sumário" no celular) e ganham uma âncora `#` ao passar o mouse, para linkar direto.

`####` funciona, mas não entra no sumário. Não use `#`: o título do post já vem do frontmatter.

## Links

| Escreva | Vai para |
| --- | --- |
| `[FizzBuzz](desafio:fizzbuzz)` | [o desafio](desafio:fizzbuzz) |
| `[guia](doc:escrevendo-um-post)` | [outro post](doc:escrevendo-um-post) |
| `[seção](doc:escrevendo-um-post#series)` | [uma seção de outro post](doc:escrevendo-um-post#series) |
| `[série](serie:bastidores)` | [uma série](serie:bastidores) |
| `[site](https://cppreference.com)` | [link externo](https://en.cppreference.com), com uma setinha |

## Código

Blocos com a linguagem ganham cores, uma etiqueta e o botão **copiar**. Com `title="..."` aparece o nome do arquivo:

````md
```c title="ola.c"
#include <stdio.h>
```
````

```c title="ola.c"
#include <stdio.h>

int main(void) {
    printf("ola, torre\n");
    return 0;
}
```

```rust
fn main() {
    let v: Vec<u8> = Vec::new(); // não aloca nada
    println!("{}", v.capacity());
}
```

Código no meio da frase com crases: `malloc(sizeof *p)`. Teclas com `<kbd>` não funcionam (HTML cru é ignorado); escreva `Ctrl+C` em código mesmo.

## Caixas de aviso

Comece uma citação com o tipo entre `[! ]`. O título é opcional:

```md
> [!DICA] Título opcional
> Texto da dica.
```

> [!NOTA]
> Informação extra, que dá para pular. Também aceita `[!NOTE]` e `[!INFO]`.

> [!DICA] Atalho
> Algo que poupa tempo. Também `[!TIP]`.

> [!IMPORTANTE]
> O que não pode passar batido. Também `[!IMPORTANT]`.

> [!CUIDADO]
> Armadilha comum. Também `[!WARNING]` e `[!ATENCAO]`.

> [!PERIGO] Comportamento indefinido
> Pode apagar o seu HD (ou pior: funcionar na sua máquina). Também `[!CAUTION]`.

> [!SPOILER] Resposta do exercício
> Fica fechado até alguém clicar. Bom para soluções.

Citação comum (sem `[! ]`) continua sendo citação:

> Talk is cheap. Show me the code.

## Matemática

Na linha com `$...$`: o custo é $O(n \log n)$. Em bloco com `$$`:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## Tabelas e listas

| Tipo | Tamanho típico (x86-64) |
| --- | ---: |
| `char` | 1 |
| `int` | 4 |
| `void *` | 8 |

1. Listas numeradas
2. e com marcadores:
   - aninhadas também

- [x] lista de tarefas
- [ ] também funciona

## Imagens

Guarde em `biblioteca/assets/` e use o caminho relativo:

```md
![Pilha de chamadas](./assets/pilha.png)
```

PNG, JPG, GIF, WebP e SVG. Escreva sempre o texto alternativo: é o que leitor de tela lê.

---

Uma linha com `---` sozinha vira um separador, como o de cima.

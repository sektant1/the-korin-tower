---
title: Criando um desafio
description: "Da pasta vazia ao desafio no ar: enunciado, templates, solução, testes, driver oculto e verificação, com um exemplo completo."
kind: guia
series: bastidores
part: 4
tags: [desafios, testes]
date: 2026-11-26
draft: true
challenges: [fizzbuzz, tabela-hash]
---

Um desafio da torre é uma pasta em `challenges/`. Não tem painel nem banco para editar: os arquivos são o desafio, e o `npm run seed` copia tudo para o banco no deploy.

O exemplo deste guia é um desafio novo, "Soma dos pares", feito do zero.

## 1. Crie a pasta

A pasta fica em `challenges/<categoria>/<slug>/`. A categoria tem que existir em `challenges/categories.yml`, e o slug (nome da pasta) vira a URL: `/desafio/soma-dos-pares`.

```
challenges/algoritmos/soma-dos-pares/
  README.md            enunciado + configuração
  template.c           código inicial, um por linguagem
  template.py
  solution.c           solução de referência (opcional, mas use)
  solution.py
  tests/public/01-exemplo.in    testes que o jogador vê
  tests/public/01-exemplo.out
  tests/hidden/02-grande.in     testes que só rodam no :submit
  tests/hidden/02-grande.out
```

## 2. Escreva o README.md

O começo do arquivo é a configuração (frontmatter YAML). O resto é o enunciado em Markdown, com fórmulas em `$...$`.

````markdown title="challenges/algoritmos/soma-dos-pares/README.md"
---
title: Soma dos pares
difficulty: 1
tags: [laços, entrada-e-saída]
languages: [c, cpp, rust, python]
timeLimitMs: 1000
order: 9
hints:
  - "Um número é par quando `n % 2 == 0`."
  - "Cuidado: a soma passa de 2^31. Use 64 bits."
---

Some todos os números pares de uma lista.

## Entrada

Uma linha com $N$ ($1 \le N \le 10^5$) e uma linha com $N$ inteiros entre $-10^9$ e $10^9$.

## Saída

A soma dos pares.

## Exemplo

Entrada:
```
5
1 2 3 4 5
```
Saída:
```
6
```
````

| Campo | O que é |
|---|---|
| `title` | nome do desafio |
| `difficulty` | 1 a 5. É o andar da torre e vale 100 × dificuldade em pontos |
| `languages` | `c`, `cpp`, `rust`, `python`. Precisa de um `template.<ext>` para cada |
| `timeLimitMs` | limite **por teste**, calibrado em C (padrão 2000, máximo 5000). Python ganha 3x |
| `checker` | `exact` (padrão) ou `{ type: ppm, tolerance: 2, maxBadRatio: 0.01 }` para imagens |
| `hints` | dicas em Markdown, reveladas uma por vez. Cada uma tira 20% dos pontos |
| `order` | posição dentro da categoria |

## 3. Templates: só o ponto de partida

O template é o que aparece no editor. Ele não resolve nada: traz os `#include`/`use`/`import` que o desafio precisa e um `main` vazio.

```c title="template.c"
#include <stdio.h>

int main(void) {
    /* seu código aqui */
    return 0;
}
```

```python title="template.py"
import sys

# seu código aqui
```

Coloque só os imports que a solução de referência usa. Se o desafio é sobre escrever uma heap, não importe `heapq` no template do Python.

## 4. A solução de referência

`solution.<ext>` é a resposta oficial. Ela é a prova de que o desafio tem solução dentro do limite de tempo, e abre para o jogador quando ele resolve ou desiste.

```c title="solution.c"
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    long long soma = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        if (x % 2 == 0) soma += x;
    }
    printf("%lld\n", soma);
    return 0;
}
```

Escreva a solução de Python com leitura rápida (`sys.stdin.buffer.read().split()`) quando a entrada for grande: ela roda no navegador do jogador, e o teste mais pesado precisa caber no limite.

## 5. Testes

Cada teste é um par `NN-nome.in` / `NN-nome.out` com a entrada e a saída esperada, exatamente o que o programa lê e escreve.

- `tests/public/`: aparecem no enunciado e rodam no `:test`. Ponha o exemplo e um ou dois casos simples.
- `tests/hidden/`: só rodam no `:submit`. É onde ficam os casos de borda (lista vazia, negativos, o maior N) e os testes grandes que derrubam a solução lenta.

A comparação ignora espaços no fim das linhas, CRLF e linhas vazias no final. Fora isso, é exata.

Ocultos não são segredo: o painel mostra entrada e saída de todos (cortadas em 8 KB). Eles existem para o jogador não precisar testar a borda sozinho, não para esconder a resposta.

> Gere os `.out` rodando a solução de referência, nunca à mão: `python3 solution.py < tests/hidden/02-grande.in > tests/hidden/02-grande.out`.

### Quanto cabe

O lote inteiro (compilar e rodar todos os testes) tem **5 segundos**. Na prática:

- até uns 3 MB de entrada somando todos os testes;
- o teste mais pesado em C deve rodar em menos da metade do `timeLimitMs` (o `verify` avisa com ⚠ quando passa disso);
- saída de cada teste até 2 MB.

## 6. Driver oculto (o jogador escreve só a função)

No estilo LeetCode, o jogador implementa uma função ou classe e não escreve `main`. Para isso, crie `driver.<ext>`: ele é anexado **depois** do código do jogador, lê o stdin, chama a função e imprime.

```c title="template.c"
#include <stdint.h>

/* devolve a soma dos pares de v[0..n) */
int64_t soma_pares(const int64_t *v, int n);
```

```c title="driver.c"
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int64_t *v = malloc(sizeof *v * (size_t)n);
    for (int i = 0; i < n; i++) scanf("%lld", (long long *)&v[i]);
    printf("%lld\n", (long long)soma_pares(v, n));
    free(v);
    return 0;
}
```

- O driver vê tudo que o jogador declarou, então use os nomes e tipos do template.
- Em C/C++, os erros do driver aparecem como `tests.c:linha` (para não confundir com o código do jogador).
- Em C++ e Rust, ponha os helpers do driver num `namespace`/`mod` próprio para não colidir com nomes do jogador. Veja `challenges/cpp/linked-list-generica/driver.cpp` e `challenges/rust/vec-simplificado/driver.rs`.
- A solução de referência também não tem `main`: o `verify` anexa o driver a ela.
- Diga no enunciado que o `main` já existe e é anexado na hora de rodar.

## 7. Verifique e publique

```bash
npm run verify -- soma-dos-pares   # roda cada solução contra todos os testes
npm run seed                       # copia para o banco local
npm run dev                        # abra /desafio/soma-dos-pares
```

O `verify` precisa de `gcc`, `g++`, `rustc` e `python3` na máquina. Ele confere a estrutura do README, compila cada solução e roda todos os testes. No CI ele roda antes de todo deploy: desafio quebrado não chega ao site.

Para entrar numa trilha, acrescente o slug em `steps` de um item de `challenges/tracks.yml`.

## Checklist

- [ ] `README.md` com `title`, `difficulty`, `languages` e o enunciado com um exemplo
- [ ] um `template.<ext>` mínimo para cada linguagem
- [ ] `solution.<ext>` em pelo menos uma linguagem (de preferência todas)
- [ ] testes públicos com o exemplo do enunciado
- [ ] testes ocultos com as bordas e um caso grande
- [ ] `npm run verify -- <slug>` passando sem ⚠

---
title: Criando uma série
description: Do series.yml ao último post, passo a passo, com um exemplo de três partes.
kind: tutorial
series: bastidores
part: 3
tags: [biblioteca, series]
level: 1
date: 2026-11-12
draft: true
---

Uma série junta posts que devem ser lidos em ordem. Quem lê ganha a lista de partes, os botões de anterior e próxima, o progresso ("2/5 lidos") e um botão que leva direto à primeira parte não lida.

Neste tutorial vamos montar uma série de exemplo, **Ponteiros na unha**, com três partes.

## 1. Declare a série no series.yml

Toda série existe primeiro em `biblioteca/series.yml`. Abra o arquivo e acrescente um item:

```yaml title="biblioteca/series.yml"
- id: bastidores
  title: Bastidores da Biblioteca
  description: Como escrever e publicar posts na Biblioteca.

- id: ponteiros-na-unha
  title: Ponteiros na unha
  description: De endereço de memória a lista ligada genérica, em C.
  scene: 6
```

| Campo | Obrigatório | O que faz |
| --- | --- | --- |
| `id` | sim | Identificador usado nos posts e na URL (`/biblioteca/serie/ponteiros-na-unha`). Só minúsculas, números e hífens. |
| `title` | sim | Nome que aparece no índice, na página da série e no topo de cada parte. |
| `description` | não | Uma ou duas frases sobre o que a série cobre. |
| `scene` | não | Imagem do banner, de 1 a 8 (as mesmas dos andares). Sem ela, o site escolhe uma fixa a partir do `id`. |

> [!NOTA] A ordem do arquivo é a ordem do site
> As séries aparecem no índice na mesma ordem do `series.yml`, e o número do volume (VOL.01, VOL.02...) vem dessa posição. Quer destacar uma série nova? Coloque-a no topo.

> [!CUIDADO] Não troque o id depois de publicar
> O `id` está na URL da série e é como o navegador de cada leitor guarda o progresso. Para mudar o nome que aparece, mude só o `title`.

### Os cenários

| `scene` | Cenário |
| ---: | --- |
| 1 | Kame House |
| 2 | Torneio de Artes Marciais |
| 3 | Torre de Karin |
| 4 | Templo de Kami |
| 5 | Planeta do Kaioh |
| 6 | Planeta Namek |
| 7 | Jogos de Cell |
| 8 | Reino dos Kaioshin |

Todas as partes da série usam o cenário da série, a não ser que um post defina o próprio `scene:` no frontmatter.

## 2. Crie uma pasta para as partes

Não é obrigatório, mas deixa o repositório organizado: uma pasta por série, um arquivo por parte.

```text title="biblioteca/"
biblioteca/
├── series.yml
└── ponteiros-na-unha/
    ├── o-que-e-um-ponteiro.md
    ├── aritmetica-de-ponteiros.md
    └── lista-ligada-generica.md
```

O nome da pasta não importa para o site. A URL de cada post vem do nome do arquivo: `/biblioteca/o-que-e-um-ponteiro`.

> [!DICA] Nomes de arquivo sem número
> Evite `01-o-que-e-um-ponteiro.md`: o número vira parte da URL e fica errado se você reordenar. A ordem vem do `part`, não do nome.

## 3. Ligue cada post à série

No frontmatter de cada parte, diga a série e a posição:

```yaml title="ponteiros-na-unha/o-que-e-um-ponteiro.md"
---
title: O que é um ponteiro
description: Endereços, o operador & e o operador *.
kind: tutorial
series: ponteiros-na-unha
part: 1
tags: [c, ponteiros]
level: 1
date: 2026-11-20
---
```

```yaml title="ponteiros-na-unha/aritmetica-de-ponteiros.md"
---
title: Aritmética de ponteiros
kind: tutorial
series: ponteiros-na-unha
part: 2
tags: [c, ponteiros, arrays]
level: 2
date: 2026-11-27
---
```

```yaml title="ponteiros-na-unha/lista-ligada-generica.md"
---
title: Lista ligada genérica
kind: tutorial
series: ponteiros-na-unha
part: 3
tags: [c, ponteiros, estruturas]
level: 3
date: 2026-12-04
challenges: [linked-list-generica]
---
```

- `series` precisa ser exatamente o `id` do `series.yml`.
- `part` define a ordem. Os números não precisam ser seguidos: `10`, `20`, `30` funciona e deixa espaço para encaixar uma parte no meio sem renumerar as outras. O site sempre mostra "parte 1, 2, 3" na ordem.
- Uma série pode misturar tipos: um tutorial seguido de uma referência, por exemplo.

## 4. Confira antes do commit

```sh
npm run dev   # abra /biblioteca/serie/ponteiros-na-unha
npm test      # valida o series.yml e todos os posts
```

O `npm test` acusa os erros mais comuns com o nome do arquivo:

| Mensagem | Causa |
| --- | --- |
| `série 'x' não está em series.yml` | `series:` com erro de digitação, ou a série não foi declarada. |
| `série 'x' tem duas partes 2` | Dois posts com o mesmo `part`. |
| `'part' deve ser um inteiro >= 1` | `part: 0`, `part: 1.5` ou `part: dois`. |
| `'scene' vai de 1 a 8` | Cenário fora da lista. |

## 5. Publicando aos poucos

Não precisa escrever a série inteira antes de publicar:

- Com `draft: true`, a parte fica visível só para admin.
- Com uma `date` no futuro, a parte aparece sozinha no dia. No exemplo acima, as datas de 20/11, 27/11 e 04/12 lançam uma parte por semana sem você mexer em nada.

Quem lê só enxerga as partes já publicadas: com uma parte no ar, a série mostra "parte 1 de 1" e cresce conforme as outras saem. Série sem nenhuma parte publicada não aparece no índice.

> [!IMPORTANTE]
> Rascunhos e posts agendados nunca entram no feed RSS. Cada parte entra no feed no dia em que é publicada.

## 6. Mudanças depois de publicar

- **Reordenar**: troque os números de `part`. As URLs não mudam.
- **Inserir uma parte no meio**: use um número intermediário (com `part: 15` entre `10` e `20`) ou renumere as seguintes.
- **Tirar um post da série**: apague as linhas `series` e `part`. Ele continua no ar como post avulso.
- **Encerrar a série**: apague o item do `series.yml` e as linhas `series`/`part` dos posts. Se sobrar algum post apontando para a série, o `npm test` avisa.

## Resumo

1. Acrescente `id` e `title` (e, se quiser, `description` e `scene`) no `series.yml`.
2. Em cada post, `series: <id>` e `part: <número>`.
3. Rode `npm test`.
4. Publique parte por parte com `draft` ou datas futuras.

Para os outros campos do frontmatter, veja [Escrevendo um post](doc:escrevendo-um-post). Para o que dá para usar dentro do texto, a [referência do Markdown](doc:referencia-do-markdown).

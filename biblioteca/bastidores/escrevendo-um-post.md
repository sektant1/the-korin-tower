---
title: Escrevendo um post
description: Onde ficam os arquivos, o que vai no frontmatter e como séries, rascunhos e agendamento funcionam.
kind: guia
series: bastidores
part: 1
tags: [biblioteca, markdown]
date: 2026-11-12
draft: true
---

Cada post da Biblioteca é um arquivo `.md` dentro da pasta `biblioteca/` do repositório. Não tem banco nem painel: o arquivo é o post. Fez commit e deploy, está no ar.

## Onde fica o arquivo

Qualquer `.md` dentro de `biblioteca/` (em qualquer subpasta) vira um post. As subpastas servem só para organizar; a URL vem do nome do arquivo:

```text title="estrutura"
biblioteca/
├── series.yml                     ← lista das séries
├── assets/                        ← imagens
│   └── pilha.png
├── ponteiros/
│   ├── 01-o-que-e-um-ponteiro.md  ← /biblioteca/01-o-que-e-um-ponteiro
│   └── aritmetica.md
└── referencia-gdb.md              ← /biblioteca/referencia-gdb
```

Ficam de fora: `README.md`, arquivos começando com `_` (bom para anotações) e tudo dentro de `assets/`.

> [!DICA] URL bonita
> O nome do arquivo vira a URL. Para trocar sem renomear, use `slug: outro-nome` no frontmatter. Só minúsculas, números e hífens.

## O frontmatter

O bloco entre `---` no topo do arquivo diz o que o post é:

```yaml title="frontmatter completo"
---
title: Ponteiros sem medo           # obrigatório
date: 2026-11-12                    # obrigatório (AAAA-MM-DD)
description: Uma frase que aparece na lista e no feed.
kind: tutorial                      # tutorial | guia | referencia | artigo
series: ponteiros-na-unha           # id de uma série do series.yml
part: 1                             # posição na série
tags: [c, ponteiros, memoria]
level: 2                            # 1 a 5 esferas do dragão
challenges: [linked-list-generica]  # desafios para praticar
updated: 2026-11-20                 # quando revisou
draft: true                         # só admin vê
---
```

| Campo | Para que serve |
| --- | --- |
| `kind` | O selo colorido e o filtro do índice. Sem ele, vira `artigo`. |
| `tags` | Filtro por tag e o "leia também" no fim de cada post. |
| `level` | Mostra a dificuldade com esferas, na mesma escala dos desafios. |
| `challenges` | Gera a caixa **Pratique na torre** e, na página do desafio, um link de volta em "Leitura recomendada". |
| `updated` | Aparece como "atualizado em" e reordena o post para o topo da lista. |

### Os quatro tipos

- **Tutorial**: passo a passo, do zero até funcionar. Quem lê vai fazer junto.
- **Guia**: resolve um problema específico ("como depurar segfault com gdb").
- **Referência**: consulta rápida, para ficar aberta numa aba: tabelas, flags, APIs.
- **Artigo**: explicação, história, opinião.

## Séries

Uma série é uma sequência de posts lidos em ordem. Declare a série uma vez em `biblioteca/series.yml`:

```yaml title="biblioteca/series.yml"
- id: ponteiros-na-unha
  title: Ponteiros na unha
  description: De endereço de memória a lista ligada genérica.
```

E em cada post da série, `series: ponteiros-na-unha` e `part: 1`, `part: 2`... O site cuida do resto: a lista de séries no índice, a página da série, o "parte 2 de 5", os botões de anterior/próxima e o progresso de leitura.

> [!NOTA]
> A ordem das séries no índice é a ordem no `series.yml`. Série sem nenhum post publicado não aparece.

## Rascunho e agendamento

- `draft: true`: o post só aparece para admin (e para todo mundo rodando `npm run dev`), com a faixa **RASCUNHO**.
- `date` no futuro: o post fica escondido até o dia chegar (fuso de Brasília). É um agendamento sem precisar lembrar de publicar.

Nenhum dos dois entra no feed RSS.

## Conferindo antes do commit

```sh
npm run dev   # abra /biblioteca: rascunhos aparecem, texto atualiza ao salvar
npm test      # carrega a pasta inteira e acusa frontmatter errado
```

> [!CUIDADO] Erro de digitação derruba o índice
> Um post com frontmatter inválido (série que não existe, `part` repetida, data errada) faz o índice mostrar o erro em vez da lista. O `npm test` pega isso antes do deploy.

O que dá para escrever dentro do texto está na [referência do Markdown](doc:referencia-do-markdown).

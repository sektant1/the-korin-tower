# Biblioteca

Posts da página `/biblioteca`: tutoriais, guias, referências e artigos, em Markdown.
Os arquivos daqui **são** o conteúdo: não há seed nem banco. Fez commit e deploy, está no ar.

- `*.md` em qualquer subpasta viram posts (exceto `README.md`, arquivos começando com `_` e a pasta `assets/`).
- `series.yml` lista as séries.
- `assets/` guarda imagens; no Markdown use `![alt](./assets/arquivo.png)`.

Guia completo de escrita: `bastidores/escrevendo-um-post.md` (no site, em `/biblioteca/escrevendo-um-post`).

Validação: `npm test` inclui um teste que carrega esta pasta inteira e falha se algum frontmatter estiver errado.

# Fase 6: Treino fora da Torre (CLI + Estilo LeetCode)

Design da fase 6. As fases 1 a 5 vivem no navegador. Esta leva a torre para o terminal, no espírito das CLIs do LeetCode (`leetcode-cli`, `leetgo`), e aproveita para abrir uma categoria com os clássicos de entrevista.

## Objetivo

Quem usa Vim de verdade quer o **seu** Vim, com os plugins, o LSP e o `make` dele. Hoje o editor do site é o único caminho para testar e enviar. A fase 6 acrescenta um segundo caminho com as mesmas regras:

| Pergunta | Resposta |
|---|---|
| "Como resolvo no meu editor?" | `korin pick <slug>` baixa enunciado, template e testes públicos para uma pasta |
| "Como testo sem abrir o site?" | `korin test` (no servidor) ou `korin test --local` (gcc/rustc da sua máquina) |
| "E os pontos, dicas, rascunhos?" | `korin submit`, `korin hint`, `korin push`: a mesma API do site, com token |
| "Dá para treinar para entrevista?" | categoria **Estilo LeetCode**, com link para o problema original |

## O que entra

### 1. Tokens de API

- Tabela nova `ApiToken(id = sha256(token), userId, name, prefix, lastUsedAt, createdAt)`. Mesmo desenho da `Session`: o segredo só existe no cliente.
- Formato `korin_` + 40 caracteres base64url. O prefixo fixo deixa um `grep` achar vazamentos, e a página só mostra os 12 primeiros caracteres.
- Criados e revogados em `/conta` (janela "Tokens da CLI"), no máximo 10 por conta. O segredo aparece **uma vez**, junto com o comando `korin login` pronto para colar.
- `getCurrentUser()` passa a aceitar `Authorization: Bearer korin_...` além do cookie. Como o navegador nunca manda `Authorization` sozinho, o token não cria CSRF; e como a sessão por cookie tem prioridade, nada muda para quem está no site.
- `lastUsedAt` é atualizado com granularidade de uma hora, para não virar uma escrita por requisição.

### 2. API para a CLI

Quatro rotas novas, todas JSON, em `/api/cli`:

| Rota | Para quê | Login |
|---|---|---|
| `GET /api/cli/me` | `korin whoami`, validação do token | sim |
| `GET /api/cli/challenges[?category=]` | `korin list`: slug, dificuldade, linguagens, estado do jogador | opcional |
| `GET /api/cli/challenges/<slug>` | `korin pick`/`show`: Markdown cru, templates, testes públicos, rascunhos da conta | opcional |
| `GET /api/cli/daily` | `korin daily` | não |

O resto já existia e só ganhou o Bearer: `POST /api/run` (run/test/submit), `PUT .../draft`, `POST .../hints/<n>` (com `?format=md` devolve Markdown em vez de HTML), `GET .../solution`, `POST .../giveup`. **Testes ocultos continuam sem sair do servidor**: a rota do desafio manda só a quantidade.

### 3. A CLI (`cli/korin.mjs`)

- Um arquivo ESM, zero dependências, Node 22.7+. O próprio site a distribui em `/cli/korin.mjs`, e a página `/cli` explica a instalação (`curl ... -o ~/.local/bin/korin`). `korin update` baixa a versão nova de lá. `cli/package.json` deixa pronto um `npm publish` futuro.
- Configuração em `~/.config/korin/config.json` (modo 600): `url`, `token`, `language`. `KORIN_URL`/`KORIN_TOKEN` sobrescrevem, para scripts e CI.
- `korin pick` cria `./<slug>/` com `README.md` (cabeçalho + enunciado), `main.<ext>` (rascunho da conta se houver, senão template), `tests/NN.in|out` (só públicos) e `.korin.json` (slug, linguagem, limites). Os comandos seguintes acham essa pasta subindo os diretórios, como o git.
- `korin test --local` compila com a mesma tabela de comandos do runner local do servidor e compara com o mesmo critério do checker `exact` (ignora espaço no fim de linha e CRLF). Serve para iterar sem rede; os ocultos só rodam com `submit`.
- Saída no estilo de placar: `✔ 01-exemplo AC 12 ms`, primeira linha divergente nos WA públicos, `CLEAR! +300 pontos` no submit aprovado. Código de saída 1 em falha, para usar em `make`.

### 4. Categoria "Estilo LeetCode"

Sete desafios, em C, C++ e Rust, com os clássicos reescritos em stdin/stdout: Two Sum, parênteses válidos, maior substring sem repetição, fundir intervalos, os K mais frequentes, água da chuva e mediana de dois vetores ordenados. Cada um termina com o link do problema original. Trilha nova `maratona-de-entrevista` com os sete na ordem.

## Decisões e limites

- **Sem integração com a conta do LeetCode.** Enunciados e casos de teste do LeetCode são conteúdo deles; copiar seria violar os termos e deixaria o site refém de um scraper. Os desafios daqui são reescritos, com testes próprios e formato stdin/stdout (lá você escreve uma função; aqui, o programa inteiro). O link aponta para o original para quem quiser comparar ou resubmeter lá.
- **Token em vez de login com senha na CLI.** Senha no terminal acaba em histórico de shell; token é revogável sem trocar a senha e um por máquina.
- **Testes públicos vão para o disco, ocultos não.** É a mesma regra do site. `korin test --local` só cobre os públicos, e a CLI avisa.
- **Nada de sincronização automática.** `korin push` manda o rascunho quando você quiser; `pick` traz o rascunho quando existe. Sem watcher, sem conflito para resolver.
- **Desafios `shader` e `canvas` entram no `pick`** (para editar no seu editor) mas não no `test`/`submit`: continuam rodando no navegador. `korin open` abre a página.
- **Rate limit por usuário continua valendo** (`RUN_RATE_PER_MINUTE`). A CLI mostra o `retry-after`.

## Fora de escopo (candidatos a uma fase 7)

- Login pela CLI por *device flow* (abrir o navegador e aprovar).
- `korin watch`: rodar os testes locais a cada salvamento.
- Publicar `korin-cli` no npm (o `cli/package.json` já está pronto).
- Compilador WebAssembly no navegador (clang em um Web Worker) para C/C++ sem servidor. Resolveria o `run` sem runner externo, mas não o `submit`: os testes ocultos teriam de ir para o cliente. E não cobre Rust, Go, Zig, D, Pascal nem Fortran.

## Onde está o código

| Parte | Arquivos |
|---|---|
| Tokens | `src/lib/auth/tokens.ts`, `getCurrentUser` em `src/lib/auth/session.ts`, janela em `src/app/conta/` (`TokenForm.tsx`, `actions.ts`) |
| API da CLI | `src/app/api/cli/**`, `?format=md` em `src/app/api/challenges/[slug]/hints/[n]/route.ts` |
| CLI | `cli/korin.mjs`, `cli/package.json`; servida por `src/app/cli/korin.mjs/route.ts`; página `src/app/cli/page.tsx` |
| URL do site | `src/lib/site-url.ts` (APP_URL ou cabeçalhos da requisição) |
| Estilo LeetCode | `challenges/leetcode/*`, categoria em `challenges/categories.yml`, trilha em `challenges/tracks.yml` |
| Banco | `ApiToken` em `prisma/schema.prisma`, migração `20261112000000_fase_6_api_tokens` |

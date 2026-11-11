# 🗼 The Korin Tower

Repositório de desafios de programação para devs de baixo nível (C, C++, Rust, ray tracing, shaders...), com cara de homepage pessoal de 1998 e site de games da época, mas funcionando como app moderno: editor com Vim, compilação de verdade em sandbox e testes automáticos.

> Status: **Fase 6 completa** (CLI `korin` no estilo LeetCode, tokens de API, categoria "LeetCode"). Veja o [roadmap](#roadmap).

---

## Arquitetura

```
 Navegador                          Servidor (Next.js, Node)                   Sandbox
┌──────────────────────┐  HTTP   ┌──────────────────────────────────┐  HTTP  ┌──────────────┐
│ páginas (RSC)        │ ──────▶ │ App Router (páginas + /api)      │ ─────▶ │ Piston       │
│ CodeMirror 6 + Vim   │         │  ├ /api/run  → judge → Runner ───┼──────▶ │ (isolate,    │
│ terminal de saída    │ ◀────── │  │   rate limit + semáforo       │        │  sem rede)   │
│ PPM → <canvas>       │         │  ├ Prisma → PostgreSQL           │        └──────────────┘
│ GLSL → WebGL2        │         │  ├ markdown → HTML (KaTeX, hljs) │  HTTP  ┌──────────────┐
│ WASM → <iframe>      │         │  └ /api/build ───────────────────┼──────▶ │ wasm-builder │
└──────────────────────┘         └──────────────▲───────────────────┘        │ (emcc)       │
                                                │                            └──────────────┘
                                                │ npm run seed
                                   /challenges (Markdown + YAML + testes, no git)
```

- **Fonte de verdade dos desafios:** arquivos em `/challenges`, versionados no git. `npm run seed` importa para o banco (idempotente).
- **Execução:** `src/lib/runner` tem uma interface `Runner` com dois backends:
  - `piston`: sandbox via Docker (produção). Sem rede, com limites de tempo, memória, processos e tamanho de saída.
  - `local`: chama `gcc`/`g++`/`rustc` da sua máquina **sem sandbox**. Só para desenvolver sem Docker; é bloqueado com `NODE_ENV=production`.
- **Correção:** `src/lib/judge` roda os casos e compara a saída (`exact`, que ignora espaços no fim e CRLF, ou `ppm`, pixel a pixel com tolerância).
- **Testes ocultos** nunca saem do servidor: a resposta traz só nome, veredito e tempo.
- **GLSL** roda inteiro no navegador (WebGL2, uniforms `iTime`/`iResolution`/`iMouse`).
- **Contas (Fase 2):** usuário/senha (scrypt) ou GitHub OAuth, cadastro só com convite. Sessão em banco: o cookie `httpOnly` leva um token aleatório e o banco guarda só o sha256. Sem login dá para jogar tudo, com progresso no `localStorage`, mas sem pontos nem solução.
- **Progresso no servidor:** só `/api/run` (submit aprovado) marca "resolvido". A solução de referência só sai de `/api/challenges/<slug>/solution` para quem resolveu ou desistiu. Rascunhos, dicas reveladas e preferências do editor ficam na conta.
- **Canvas (Fase 4):** desafios `kind: canvas` são C/C++ com raylib ou SDL2. `/api/build` manda o código para o serviço `wasm-builder` (emcc), que devolve um único JS com o WASM embutido. O servidor só compila; quem executa é o navegador, num `<iframe sandbox="allow-scripts">` sem acesso a cookies nem ao DOM do site.
- **Comunidade (Fase 3):** trilhas vêm de `challenges/tracks.yml` pelo seed. Guestbook e comentários aceitam texto puro com `` `código` ``, blocos ```` ``` ```` e `||spoiler||`; só quem tem conta escreve. Cada submit aprovado guarda o código (`Submission`), que alimenta "soluções dos outros" (mesma regra da solução de referência) e os recordes. Medalhas não têm tabela: são calculadas do progresso (`src/lib/badges.ts`).
- **Torneio (Fase 5):** desafio do dia com bônus, sequências de dias, recordes de menor código e mais rápido, perfil público (`/jogador/<nome>`) e `/feed.xml`. Design em [docs/fase-5.md](docs/fase-5.md).
- **CLI (Fase 6):** `korin pick <slug>` baixa enunciado, template e testes públicos para uma pasta; `korin test`/`korin submit` usam a mesma `/api/run` do site, autenticados por token pessoal (`Authorization: Bearer korin_...`, gerado em `/conta`). A CLI é um arquivo Node servido pelo próprio site em `/cli/korin.mjs`. Design em [docs/fase-6.md](docs/fase-6.md).
- **Pontos:** 100 × dificuldade; resolver o desafio do dia no próprio dia vale +50%; cada dica revelada antes de resolver tira 20% (mínimo 20%); desistir zera aquele desafio (`src/lib/scoring.ts`). Shaders não têm testes, então não pontuam.

## A Torre (progressão)

Regras em `src/lib/tower.ts` (puras, com testes), usadas pelo servidor (`/api/run`, perfil, CLI) e pelo navegador (`src/components/Tower.tsx`):

- Cada **andar é uma dificuldade** (1 a 5), com um lugar de Dragon Ball por andar (`FLOOR_NAMES`, imagens em `public/andares`). O andar 1 está sempre aberto; o andar N+1 abre quando o jogador resolve 5 desafios com testes do andar N (ou todos, se há menos que 5). A torre tem 8 andares no mapa: os sem desafios ficam "em obras" e não abrem.
- **Detonados** (`challenges/tracks.yml`) são escadas: o próximo passo de um detonado abre mesmo com o andar trancado. O desafio do dia também abre sempre.
- Só desafios `stdio` contam para subir; shader e canvas seguem o andar mas são passos livres.
- **Esferas do Dragão**: uma por detonado zerado. Medalhas "Meio da Torre" e "Topo da Torre" ao abrir os andares 3 e 5.
- Convidado: a tranca é só no navegador (o progresso mora no `localStorage`). Com conta, `/api/run` recusa desafio trancado.
- A home mostra um único "continuar": detonado em andamento, senão o primeiro desafio aberto do andar atual.

## Estrutura de pastas

```
challenges/                    ← desafios (edite aqui)
  categories.yml               ← categorias e ordem do menu
  tracks.yml                   ← trilhas ("Detonados"): listas ordenadas de slugs
  <categoria>/<slug>/
    README.md                  ← frontmatter YAML + enunciado em Markdown
    NOTES.md                   ← notas do professor (opcional)
    template.<ext>             ← código inicial, um por linguagem
    solution.<ext>             ← solução de referência (opcional)
    tests/public/NN.in, NN.out ← testes visíveis
    tests/hidden/NN.in, NN.out ← testes ocultos
    assets/                    ← imagens usadas no enunciado (./assets/x.svg)
prisma/                        ← schema e migrações
scripts/
  seed.ts                      ← importa /challenges para o banco
  verify-challenges.ts         ← roda as soluções contra os testes
  piston-install.mjs           ← instala compiladores no Piston
wasm-builder/                  ← serviço emcc (raylib + SDL2) dos desafios canvas
  build.mjs                    ← compila um fonte; também roda sozinho em dev
  server.mjs, Dockerfile       ← HTTP mínimo e imagem
piston/                        ← imagem do Piston com gcc/rust/go/zig/nasm/pascal embutidos
  Dockerfile, install.cjs      ← instala os runtimes durante o build
cli/                           ← CLI `korin` (um arquivo, sem dependências) + package.json
docs/fase-5.md, fase-6.md      ← design das fases 5 e 6
src/
  app/                         ← páginas e rotas de API (App Router)
    api/run/                   ← compilar/executar/testar
    api/build/                 ← compilar desafios canvas para WASM
    api/challenges/[slug]/     ← dicas (uma por vez) e solução
    api/cli/                   ← lista, desafio (Markdown cru + testes públicos), desafio do dia, whoami
    cli/                       ← página de instalação e download da CLI
    desafio/[slug]/            ← página do desafio
  components/
    workspace/                 ← editor Vim, terminal de saída, PPM, shader, canvas WASM
    Retro.tsx, PixelSprite.tsx ← marquee, blink, under construction, sprites
  lib/
    languages.ts               ← lista única de linguagens
    challenge-loader.ts        ← lê e valida /challenges
    judge/                     ← correção e checkers
    tracks.ts, social.ts       ← trilhas; guestbook e comentários
    badges.ts, profile.ts      ← medalhas e cartão do jogador
    daily.ts, records.ts       ← desafio do dia; códigos aprovados e recordes
    runner/                    ← Piston, Godbolt e runner local
    site-url.ts                ← URL pública (APP_URL ou cabeçalhos)
    client/                    ← estado no navegador e parser de .vimrc
```

## Rodando localmente

Pré-requisitos: Node 22+, um PostgreSQL (`docker compose up -d db` ou um projeto no Supabase) e, para executar código, **um** dos dois:
- Docker (recomendado): roda o Piston;
- ou gcc/g++/rustc instalados, com `RUNNER=local` (sem sandbox, só para você).

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL e RUNNER (piston ou local)
docker compose up -d db       # PostgreSQL local (ou use a URL do Supabase no .env)
npx prisma migrate deploy     # cria as tabelas
npx prisma generate
npm run seed                  # importa /challenges
npm run invite -- --admin     # gera o convite do primeiro admin
npm run dev                   # http://localhost:3000 → /entrar → Criar conta
```

Com Piston, sem subir o app no Docker:

```bash
docker compose up -d --build piston piston-init   # 1ª vez baixa os runtimes (~2 GB) e demora
# no .env: RUNNER="piston" e PISTON_URL="http://localhost:2000"
# e exponha a porta: adicione `ports: ["127.0.0.1:2000:2000"]` ao serviço piston
```

Verificações:

```bash
npm test              # testes unitários (checkers, .vimrc)
npm run typecheck
npm run verify        # compila cada solução de referência e roda todos os testes
```

## Deploy (VPS)

```bash
docker compose up -d --build
```

Sobe `app` (porta 3000), `piston` e `wasm-builder` (só na rede interna) e `piston-init`. A primeira build demora: a imagem do Piston já vem com gcc (C, C++, D e Fortran), rust, go, zig, nasm e pascal embutidos (o gcc sozinho passa de 2 GB), e a do `wasm-builder` baixa o emsdk e compila a raylib. Depois disso a VPS sempre sobe com os compiladores instalados, sem depender de download no primeiro boot; o `piston-init` só confere e instala o que faltar. A cada subida o app roda as migrações e o seed. O Piston precisa de `privileged: true` e cgroup v2 no host (padrão no Ubuntu 22.04+). Coloque um proxy reverso com HTTPS na frente (Caddy ou nginx). Ele deve **sobrescrever** `X-Forwarded-For`, porque o rate limit usa esse cabeçalho.

Testes dentro do Docker (typecheck, unitários e as soluções de referência rodando no Piston):

```bash
docker compose --profile test run --rm test
```

O compose sobe PostgreSQL 17 (volume `pg-data`), o mesmo motor do Supabase. **GitHub Pages não serve**: o site precisa de servidor Node, banco e do Piston (`privileged`).

Primeiro admin na VPS: `docker compose exec app npx tsx scripts/invite.ts --admin`. Depois, gere convites em `/admin`.

Login com GitHub (opcional): crie um OAuth App com callback `<APP_URL>/api/auth/github/callback` e defina `APP_URL`, `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` (o compose lê do ambiente ou de um `.env` ao lado).

Para atualizar os desafios na VPS: `git pull && docker compose restart app`.

## Deploy (Vercel + Supabase)

O app Next.js inteiro (páginas, `/api`, login) roda na Vercel; o Supabase é só o PostgreSQL. A autenticação continua a própria do site (não usa Supabase Auth).

1. **Supabase:** crie o projeto. Em *Connect*, copie a URL do pooler em modo *Transaction* (porta 6543) para `DATABASE_URL` e a do modo *Session* (porta 5432) para `DIRECT_URL`.
2. **Vercel:** importe o repositório e defina as variáveis `DATABASE_URL`, `DIRECT_URL`, `APP_URL` (ex.: `https://korin.vercel.app`) e `RUNNER`. Com `RUNNER=godbolt` (o padrão recomendado para a Vercel) os desafios compilam e rodam na API pública do Compiler Explorer, sem servidor para manter; com `RUNNER=piston` é preciso também `PISTON_URL` (veja os limites abaixo). GitHub é opcional (`GITHUB_CLIENT_ID`/`SECRET`).
3. O script `vercel-build` roda `prisma migrate deploy`, o seed de `/challenges` e o build. Cada push atualiza os desafios.
4. Primeiro admin, sem tocar no banco: defina `ADMIN_BOOTSTRAP_CODE` (16+ caracteres, ex.: `openssl rand -hex 16`) na Vercel, faça o redeploy e cadastre-se em `/entrar` usando esse valor como código de convite. Só funciona enquanto não houver admin. Depois, gere convites em `/admin`. Alternativa: `npm run invite -- --admin` da sua máquina com o `.env` apontando para o Supabase.

Limites desse arranjo:
- **Godbolt:** uma compilação por teste (a API não separa compilar de executar), sem medição de memória, sandbox cortando em ~20 s e **stdout limitado a ~32 KB** (o processo é morto ao passar disso). Nos testes com saída maior o judge confere só o prefixo que chegou e avisa; é um veredito mais fraco. Com `RUNNER=piston` esse fallback entra automaticamente quando o Piston está fora do ar (`RUNNER_FALLBACK=none` desliga). As rotas `/api/run` e `/api/playground` declaram `maxDuration = 60` (teto do plano Hobby); um submit com muitos testes grandes pode encostar nisso. Para tráfego de verdade, suba um Piston.
- **O Piston não roda na Vercel nem no Supabase** (precisa de container `privileged`). Sem um `PISTON_URL` acessível, executar e enviar código falha com "runner indisponível". Suba o Piston numa VM (o serviço `piston` do compose) atrás de um proxy HTTPS que exija `Authorization: Bearer <PISTON_TOKEN>` (o app envia esse cabeçalho se `PISTON_TOKEN` estiver definido). Ele executa código arbitrário: não o deixe aberto.
- **O `wasm-builder` também não roda na Vercel.** Suba-o na mesma VM do Piston (`docker compose up -d wasm-builder`), atrás do mesmo proxy com token, e defina `WASM_BUILDER_URL` (e `WASM_BUILDER_TOKEN`). Sem ele, só os desafios `canvas` falham ("construtor indisponível"); o resto do site funciona. A resposta leva o JS com o WASM embutido (em geral menos de 2 MB; o teto de resposta de uma função na Vercel é 4,5 MB).
- Rate limit e limite de execuções simultâneas são em memória, por instância. Na Vercel cada instância tem o seu, então valem como teto aproximado.

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` roda em todo PR e push:

- **check:** typecheck, testes unitários, `next build`;
- **database:** Postgres limpo → `prisma migrate deploy` → confere se `schema.prisma` bate com as migrações (pega migração esquecida) → seed duas vezes (idempotente);
- **verify:** compila e testa as soluções de referência (runner local na VM do Actions);
- **deploy** (só push na `master`, depois dos três acima): `npm run db:deploy` no Supabase (migrações + desafios) e então `vercel build` + `vercel deploy --prebuilt --prod`. Um deploy por vez;
- **deploy-vps** (idem, quando `DEPLOY_TARGET=vps`): entra por SSH na VPS, roda `git pull --ff-only`, `docker compose up -d --build` e remove imagens antigas. O próprio `app` aplica as migrações e o seed ao subir. Também um deploy por vez.

O alvo é escolhido pela variável de repositório `DEPLOY_TARGET` (Settings → Secrets and variables → Actions → Variables): sem ela o deploy vai para a Vercel; com `vps`, vai para a VPS. Para a VPS, crie os segredos `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (chave privada ed25519 com acesso ao clone) e, se o clone não estiver em `/opt/the-korin-tower`, `VPS_PATH`. A VPS precisa ter Docker + Compose, o repositório clonado com o remoto configurado e um `.env` ao lado do `docker-compose.yml`.

O `vercel.json` desliga o deploy automático da Vercel na `master` (quem faz é o Actions, depois de migrar o banco). PRs continuam ganhando preview pela integração Git da Vercel; o build de preview não mexe no banco.

Configuração da Vercel, uma vez:
1. `npx vercel link` na sua máquina; copie `orgId` e `projectId` de `.vercel/project.json`.
2. Crie um token em vercel.com/account/tokens.
3. No GitHub (Settings → Secrets and variables → Actions) crie `DATABASE_URL`, `DIRECT_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Opcional: crie o environment `production` com aprovação manual.
4. As variáveis de runtime (`APP_URL`, `PISTON_URL`, ...) continuam no painel da Vercel.

Migrações rodam **antes** do código novo subir: prefira migrações que só acrescentam (coluna nova com default, tabela nova). Para remover/renomear, faça em dois deploys.

## CLI (`korin`)

Resolva no seu editor, com a mesma conta e as mesmas regras do site. Instruções completas em `/cli` no site; o resumo:

```bash
curl -fsSL https://<site>/cli/korin.mjs -o ~/.local/bin/korin && chmod +x ~/.local/bin/korin
korin login --url https://<site>      # cole um token gerado em /conta
korin list --todo
korin pick dois-numeros -l rust        # ./dois-numeros/ com README.md, main.rs, tests/ e .korin.json
cd dois-numeros && vim main.rs
korin test --local                     # testes públicos com o rustc da sua máquina
korin submit                           # todos os testes, no servidor; pontua
```

Outros comandos: `run` (stdin por pipe, `-i arquivo` ou o 1º teste), `push` (salva rascunho na conta), `hint`, `solution`, `giveup`, `daily --pick`, `open`, `config lang=cpp`, `update`. `KORIN_TOKEN`/`KORIN_URL` servem para scripts. O fonte é `cli/korin.mjs`; `cli/package.json` está pronto para um `npm publish` (`npm i -g korin-cli`).

## Adicionando um desafio

1. Crie `challenges/<categoria>/<slug>/README.md`:

   ```markdown
   ---
   title: Meu Desafio
   difficulty: 3              # 1 a 5
   tags: [ponteiros, parsing]
   languages: [c, cpp, rust]  # ids de src/lib/languages.ts
   timeLimitMs: 2000          # padrão 2000
   memoryLimitMb: 128         # padrão 256
   checker: exact             # ou: { type: ppm, tolerance: 2, maxBadRatio: 0.01 }
   kind: stdio                # "shader" (GLSL no navegador) ou "canvas" (C/C++ com raylib/SDL2 em WASM); ambos sem testes
   order: 1                   # ordem dentro da categoria
   hints:
     - "Primeira dica (Markdown)"
     - "Segunda dica"
   ---

   Enunciado em **Markdown**, com `código`, $fórmulas$ KaTeX e ![imagens](./assets/fig.svg).
   ```

2. Adicione `template.<ext>` para cada linguagem (`c`, `cpp`, `rs`, `go`, `zig`, `asm`, `d`, `pas`, `f90`, `frag`) e, se quiser, `solution.<ext>` e `NOTES.md`.
3. Crie os testes: `tests/public/01.in` + `01.out`, `tests/hidden/02.in` + `02.out`...
4. Rode `npm run verify -- <slug>` (a solução precisa passar) e `npm run seed`.

Categoria nova: adicione em `challenges/categories.yml` e crie a pasta.

Desafio `canvas`: `languages` só aceita `c` e `cpp`, e não há pasta `tests/`. A biblioteca é escolhida pelo `#include` do código (`raylib.h` ou `SDL2/SDL.h`). O laço `while (!WindowShouldClose())` de sempre funciona, porque o site compila com `-sASYNCIFY`; com SDL2, mantenha um `SDL_Delay` no laço para devolver o controle ao navegador.

Trilha nova: acrescente um item em `challenges/tracks.yml` (`id`, `title`, `description`, `steps`) e rode `npm run seed`. Só desafios `stdio` contam para zerar a trilha, e toda trilha precisa de pelo menos um.

Também dá para criar desafios em `/admin → Novo desafio`. Eles ficam só no banco (`sourceDir` nulo) e são editáveis lá. Os de `/challenges` só se editam no git. Se um slug criado pela web aparecer depois em `/challenges`, o seed sobrescreve. `npm run seed -- --prune` apaga desafios que sumiram do disco, junto com o progresso deles.

## Editor

- Vim ligado por padrão (desligue na toolbar ou em Configurações).
- Layout de IDE: enunciado | editor | painel com abas (Saída, Cheat codes, Solução), tudo visível sem rolar a página.
- Comandos ex: `:w` salva rascunho · `:run`/`:make` executa com o stdin da caixa · `:test` testes públicos · `:submit` todos · `:hint` próxima dica · `:stdin` foca a caixa de entrada (lá, `Ctrl+Enter` executa e `Esc` volta ao editor) · `:out` volta para a aba Saída · `:set theme=noite|fosforo|ambar|turbo|win98` · `:q` volta para a lista.
- `.vimrc` simplificado em Configurações: `map`, `nmap`, `imap`, `vmap`, variantes `noremap`, e `set theme=...`.
- Erros de compilação: clique em `main.c:12:5` para pular o cursor para a linha.
- Se o programa imprime um PPM **P3**, a imagem aparece no terminal de saída. P6 (binário) não sobrevive ao transporte como texto; use P3.

## Imagens próprias (public/fanart)

Coloque arquivos `.gif`, `.png`, `.jpg`, `.webp` ou `.svg` em `public/fanart/`. Não precisa de rebuild:

- `banner.*` aparece no cabeçalho;
- `mascote.*` aparece no topo da home;
- os demais vão para `/galeria` e para um slot aleatório na sidebar.

Textos do portal (mural de novidades e "Você sabia?") ficam em `src/lib/site-content.ts`. Easter egg: ↑↑↓↓←→←→BA fora do editor.

## Segurança

- Código de usuário só roda no Piston: sem rede, com limites de tempo, memória, processos e saída. Nunca use `RUNNER=local` num servidor acessível por outras pessoas.
- Flags de compilador passam por uma lista de flags permitidas (`src/lib/runner/flags.ts`). Isso bloqueia, por exemplo, `-include /etc/passwd`. O Piston usa flags fixas, então elas só valem no runner local.
- Rate limit por usuário logado, ou por IP sem login (`RUN_RATE_PER_MINUTE`); login e cadastro: 10/min por IP e limite de execuções simultâneas (`RUN_MAX_CONCURRENCY`), em memória.
- Tokens da CLI (`korin_...`) são guardados como sha256, mostrados uma única vez e revogáveis em `/conta`. Valem o mesmo que a sessão do dono; o navegador não os envia sozinho, então não há CSRF por essa via.
- Server Functions do admin conferem `isAdmin` uma a uma; quem não é admin recebe 404. Cookies `SameSite=Lax`, e revelar dica é `POST`, então um link externo não gasta dicas de ninguém.
- Dicas continuam públicas sem login (é um jogo entre convidados: dá para fugir da penalidade abrindo uma aba anônima).
- O Markdown dos desafios é tratado como confiável (vem do repositório e, na Fase 2, do admin). HTML cru é descartado.
- Guestbook e comentários **não** passam pelo Markdown: `src/lib/user-text.ts` quebra o texto em pedaços e o React desenha cada um como texto, então não existe HTML de usuário para sanitizar. Só contas escrevem, com limite de 5 mensagens por minuto; autor e admin apagam.
- O `wasm-builder` compila código de usuário, mas nunca o executa. Ele não guarda segredos (o compilador consegue ler arquivos do container com `#include`), roda sem capabilities e não é exposto. O JS gerado roda num iframe com `sandbox="allow-scripts"`: origem opaca, sem cookies da sessão.
- "Soluções dos outros" segue a regra da solução de referência. O placar de recordes é público, mas só mostra nome, linguagem e número.

## Roadmap

- [x] **Fase 1:** layout retrô, lista por categoria, página do desafio com editor Vim, execução C/C++/Rust com testes stdin/stdout, seed de `/challenges`. Também entraram o preview PPM e o canvas GLSL, necessários para os desafios de exemplo.
- [x] **Fase 2:** login (usuário/senha ou GitHub) e convites, progresso e rascunhos no banco, painel admin, Hall of Fame com pontos, solução liberada pelo servidor.
- [x] **Fase 3:** trilhas (`challenges/tracks.yml`), guestbook, comentários com spoiler, medalhas, soluções dos outros jogadores.
- [x] **Fase 4:** C/C++ com raylib/SDL2 via Emscripten (WASM) no canvas; D, Pascal e Fortran.
- [x] **Fase 5:** torneio: desafio do dia com bônus, sequências, recordes (menor código, mais rápido), perfil público e feed RSS. Design em [docs/fase-5.md](docs/fase-5.md).
- [x] **Fase 6:** CLI `korin` no estilo LeetCode (pick/test/submit do terminal), tokens de API, categoria "LeetCode" com link para os originais e trilha "Maratona de entrevista". Design em [docs/fase-6.md](docs/fase-6.md).

Limitações conhecidas das Fases 3 a 5:
- Desafios `shader` e `canvas` não têm "resolvido": não pontuam, não entram no desafio do dia e são passos livres nas trilhas.
- Recordes usam o **último** código aprovado de cada jogador por linguagem; o tempo vem do runner e é ruidoso.
- D e Pascal não têm solução de referência no repositório: o `npm run verify` do CI (runner local) só cobre C, C++, Rust e Fortran.

Limitações conhecidas da Fase 1:
- O Piston não informa memória em versões antigas (aparece `n/d`), e o runner local não mede memória.
- Com o Piston, cada teste recompila o programa (a API não separa compilação de execução).

# Motor de execução

Compila, roda e julga o código dos jogadores. Custo zero: nada de servidor de
compilação, só Vercel (plano grátis), o navegador do jogador e o Compiler
Explorer (API pública).

```ts
const r = await runner.runAndTest(code, "rust", testCases, { checker, timeLimitMs });
// r.compile, r.tests[i].verdict ("AC" | "WA" | "TLE" | "RE" | "OLE"), r.wallMs
```

## Quem roda o quê

| Linguagem | Onde | Por quê |
|---|---|---|
| C, C++, Rust | Compiler Explorer (`engines/godbolt.ts`), via `/api/run` no :test/:submit | Não existe toolchain C++/Rust em WASM que suba em menos de 5 s no navegador (clang em WASM tem dezenas de MB; rustc, centenas). O Piston público virou whitelist em 15/02/2026 (HTTP 401) e o Wandbox leva 4,4 s para um `return 0`. |
| Python | Pyodide num Web Worker (`engines/pyodide.ts`) | O core tem ~6 MB comprimidos; com cache sobe em ~1 s e roda testes pequenos em menos de 200 ms. |

`:run` no `/compilador` vai direto do navegador para o Compiler Explorer (CORS
liberado; o stdin é pequeno). `:test`/`:submit` de C/C++/Rust passam pela
Vercel, porque o upload do jogador é o gargalo: os testes ocultos chegam a
3 MB, e 1 MB levou 8 s para subir numa conexão doméstica. Da Vercel isso é
instantâneo, os ocultos não saem do servidor e o veredito é confiável.

## Prazo de 5 s

`createCodeRunner` abre um `AbortController` de 5 s (`DEADLINE_MS`) para
compilar e rodar o lote inteiro. Estourou: o `fetch` é abortado, ou o Worker
do Python é morto com `terminate()`. Testes que não chegaram a rodar viram TLE
com aviso. A subida do motor (baixar e iniciar o Pyodide) fica **fora** do
prazo: o clique espera o motor ficar pronto e só então o relógio começa.

Por teste vale `timeLimitMs` do desafio vezes `TIME_FACTOR` (Python 3x, os
limites foram calibrados em C), nunca acima dos 5 s.

## Lote num request só (`engines/batch.ts`)

O Compiler Explorer não separa compilar de executar, então um request por
teste paga a fila deles N vezes. Em vez disso, anexamos ao código um driver
que recebe todos os testes no stdin e roda cada um num processo filho:

- **C/C++:** `__attribute__((constructor))` que roda antes do `main`. O filho
  volta do construtor e segue até o `main` do jogador; o pai nunca volta. Tudo
  por syscall direta (x86-64 Linux, sem libc), então o código do jogador pode
  ter funções chamadas `read`, `write` ou `malloc`. stdin vai num `memfd` (sem
  deadlock); stdout/stderr vão por pipe, drenados com teto (OLE mata na hora).
  `PR_SET_DUMPABLE=0` faz o segfault morrer na hora, sem core dump.
- **Rust:** o `fn main` do jogador vira `__korin_user_main`, e o driver se
  reexecuta (`std::process::Command`) com `KORIN_CHILD=1` para cada teste.

Por teste volta uma linha `@@KORIN` com exit code, tempo, tamanho, o SHA-256
da saída normalizada (a mesma normalização de `judge/checker.ts`) e o começo de
stdout/stderr. Isso contorna o corte de 32 KB do stdout deles: o veredito vem
do hash e o painel mostra o começo. Checker `ppm` (tolerância por pixel) não
tem hash possível, e aí volta um request por teste.

Validação: `batch.test.ts` compila o driver com gcc/g++/rustc locais; o mesmo
código passou em todas as soluções de referência no sandbox do Compiler
Explorer (fork, pipe, memfd e prctl são permitidos lá).

## Python no navegador

- `engines/pyodide.worker.ts`: sobe o Pyodide uma vez; cada teste roda com
  globals novos e `sys.stdin`/`sys.stdout` em memória (`input()`, `print()`,
  `sys.stdin.buffer` funcionam).
- `engines/pyodide.ts`: um Worker, uma fila. Kill switch por teste (limite +
  250 ms): `terminate()` e outro Worker sobe em segundo plano, do cache.
- `runtime-cache.ts` + `public/runtime-sw.js`: o Service Worker serve os
  arquivos do Pyodide do disco (cache `korin-runtime-pyodide-<versão>`,
  cache-first; versões antigas são apagadas). Na primeira visita,
  `components/RuntimeWarmup.tsx` baixa o core com progresso real (bytes lidos do
  `ReadableStream`; o `Content-Length` do CDN vem comprimido e não serve de total).
- `browser.ts`: `preloadLanguages` sobe já o motor da linguagem selecionada e,
  quando o navegador fica ocioso, os das outras linguagens do desafio.

Trocar a versão do Pyodide: `PYODIDE_VERSION` e os tamanhos em
`engines/pyodide-assets.ts` (`curl -H 'Accept-Encoding: identity'` dá o
tamanho descomprimido).

## Medições (nov/2026, de uma conexão doméstica)

| Caso | Tempo |
|---|---|
| C++ simples, 1 request | ~0,9 s |
| Rust, compilar e rodar 1 teste | 1,3–3,3 s |
| Lote de 5–8 testes (C, C++, Rust), 1 request | 1,3–3,9 s |
| Python, testes de um desafio no CPython local (pior caso) | 0,9 s |
| Pyodide, subida com cache | ~1 s |

## Arquivos

| Arquivo | O quê |
|---|---|
| `types.ts` | `CodeRunner`, `TestCase` (entrada/saída ou unitário), `Engine` |
| `code-runner.ts` | prazo, montagem do harness, veredito |
| `engines/godbolt.ts` | Compiler Explorer (navegador e Node) |
| `engines/batch.ts` | driver do lote (C/C++ e Rust) |
| `engines/pyodide*.ts` | Python no Worker |
| `browser.ts` / `server.ts` | o runner de cada lado |
| `flags.ts` | flags de compilação permitidas |
| `../../../scripts/local-engine.ts` | gcc/rustc/python3 locais, só para o `npm run verify` |

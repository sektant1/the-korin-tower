# Fase 5: Torneio de Artes Marciais

Design da fase 5. As fases 1 a 4 entregam o que resolver e onde resolver; esta dá motivo para **voltar amanhã** e para **resolver de novo, melhor**.

## Objetivo

Hoje um desafio resolvido está morto: marcou `CLEAR!`, acabou. O Hall of Fame só premia quantidade. A fase 5 acrescenta três laços de retorno, todos em cima de dados que as fases 2 e 3 já gravam:

| Laço | Pergunta que responde | De onde vêm os dados |
|---|---|---|
| Desafio do dia | "O que eu faço hoje?" | tabela nova `DailyChallenge` |
| Sequência | "Vale a pena entrar hoje?" | `Progress.solvedAt` (já existia) |
| Recordes | "Dá para fazer melhor?" | `Submission` (fase 3) |

Mais dois itens de vitrine: perfil público e feed RSS.

## O que entra

### 1. Desafio do dia

- Um desafio `stdio` por dia, igual para todo mundo. O dia vira à meia-noite de Brasília (`src/lib/dates.ts`).
- Sorteado na **primeira visita** do dia e gravado em `DailyChallenge(day, challengeId)`. Gravar (em vez de derivar de um hash da data) mantém o sorteio estável se um desafio entrar ou sair no meio do dia, e deixa um histórico.
- Não repete nenhum dos últimos 7 sorteados, enquanto houver desafio suficiente.
- Duas visitas simultâneas: `createMany(..., skipDuplicates)` e releitura. Quem perde a corrida lê o que a outra gravou.
- **Bônus:** resolver no próprio dia vale **+50%** dos pontos daquele desafio. As regras antigas continuam: dicas descontam antes do bônus, quem desistiu não pontua. `Progress.dailyBonus` marca quem levou.
- Aparece na home (janela "Desafio do dia") e como faixa na página do desafio.

Shaders e desafios de canvas ficam de fora: não têm testes, então não existe "resolveu hoje".

### 2. Sequência (streak)

- Dias seguidos com **pelo menos um desafio resolvido** (qualquer um, não precisa ser o do dia).
- Calculada na hora a partir de `Progress.solvedAt`. Sem tabela, sem job noturno.
- A sequência atual conta até hoje **ou até ontem**: o dia de hoje ainda pode ser salvo, então ela não zera à meia-noite.
- Medalhas: *Treino Diário* (3 dias) e *Sala do Tempo* (7 dias), sobre a **melhor** sequência, para não sumirem depois.

### 3. Recordes por desafio

- Dois placares por desafio `stdio`: **menor código** (bytes UTF-8) e **mais rápido** (pior tempo entre os testes).
- Fonte: `Submission`, que guarda o último código aprovado de cada jogador por linguagem. Um jogador aparece uma vez por placar, com a melhor marca dele. Empate fica com quem chegou primeiro.
- O placar é **público** e mostra só nome, linguagem e número. O código continua trancado atrás da regra da solução (resolveu ou desistiu).
- Medalha *Recordista* para quem é o 1º em tamanho ou em tempo em algum desafio.

### 4. Perfil público

`/jogador/<nome>`: pontos, sequências, medalhas e desafios resolvidos. Hall of Fame, guestbook, comentários e recordes passam a ter link para o perfil. Nunca mostra código nem rascunho.

### 5. Feed RSS

`/feed.xml`: os 30 desafios mais novos, RSS 2.0, com `<link rel="alternate">` no `<head>`. Combina com a estética de 1998 e não custa nada.

## Decisões e limites

- **"Último aprovado" em vez de "melhor de todos os tempos".** Reenviar um código maior tira você do recorde. É mais simples (uma linha por jogador e linguagem), e o código mostrado em "soluções dos outros" é sempre o que está valendo no placar.
- **Tempo é ruidoso.** Vem do runner (`wall_time` do Piston; relógio de parede no runner local). Serve para separar O(n) de O(n²), não para disputar milissegundo. Se o runner não mede (Piston antigo), o envio fica fora do placar de tempo.
- **Quem desistiu pode copiar.** Desistir libera as soluções dos outros; reenviar uma delas entra no placar, sempre atrás do autor (empate é por data) e sem pontos. Aceito: o site é por convite.
- **Bônus do dia favorece quem tem tempo livre**, não quem é melhor. Por isso é 50% de um desafio, e não um multiplicador da conta.
- **Sem notificações, e-mail ou push.** O RSS é o único canal de saída.

## Fora de escopo (candidatos a uma fase 6)

- Duelos em tempo real e torneios com chave.
- Temporadas (zerar o ranking a cada N meses).
- Histórico de todas as submissões e gráfico de evolução.
- Votar em soluções dos outros.

## Onde está o código

| Parte | Arquivos |
|---|---|
| Dias e sequências | `src/lib/dates.ts` (+ teste) |
| Desafio do dia | `src/lib/daily.ts`, `src/lib/scoring.ts`, `recordSolve` em `src/lib/progress.ts` |
| Recordes | `src/lib/records.ts`, bloco "Recordes" em `src/app/desafio/[slug]/page.tsx` |
| Perfil | `src/lib/profile.ts`, `src/app/jogador/[username]/page.tsx` |
| RSS | `src/app/feed.xml/route.ts` |
| Banco | `DailyChallenge` e `Progress.dailyBonus` em `prisma/schema.prisma` |

# GDD: Saiyajin Survivors

> Rascunho 3 (26/11/2026). Substitui o "Proteja a Esfera". O estado da implementação está no §18.

## 1. Visão

Easter egg da Korin Tower. Junte as 7 esferas dos divisores, o Shenlong aparece e abre um
**survivors-like** do Dragon Ball: você anda, as técnicas disparam sozinhas, hordas vêm de todos os
lados, você escolhe upgrades a cada nível e tenta sobreviver 15 minutos até o chefe da saga.

- **Título:** **Saiyajin Survivors** (segue o padrão "X Survivors" do gênero).
- **Plataforma:** navegador desktop, só **teclado** (WASD/setas). Mobile e gamepad ficam fora.
- **Sessão:** 15 min por saga, mais o chefe.
- **Pilares:**
  1. **Poder que escala.** O fim de uma run tem que parecer um episódio de DBZ: tela cheia de feixes.
  2. **Fan service com mecânica.** Cada referência (Senzu, Radar, Kaioken, Shenlong, Sala do Tempo) é um sistema, não enfeite.
  3. **Sempre progride.** Toda run, mesmo perdida, rende Zeni e desbloqueios.

## 2. O que fica do jogo atual

| Fica | Muda |
|---|---|
| Gatilho das 7 esferas + cena do Shenlong (`ShenlongGame.tsx`) | `SphereDefense.tsx` é substituído (Vegeta fixo mirando com o mouse → herói andando com ataque automático) |
| Arte pré-renderizada em canvas offscreen (`art.ts`: orbs, cápsulas) | Personagens saem do DOM (`<img>` GIF) e passam a ser desenhados no canvas a partir de atlas |
| Cápsula Hoi-Poi como drop (`CapsuleArt.tsx`) | Os drops viram o "baú" do gênero |
| Tom dos textos em PT-BR, recorde no localStorage | O save passa a ser um objeto versionado (meta-progressão) |
| Cenários `public/zones_backgrounds/*` | Viram chão em tile das arenas |

## 3. Loop

**Loop de 30 s:** andar → técnicas acertam sozinhas → inimigos soltam **orbs de ki** (XP) → coletar → subir de nível → escolher 1 de 3 cartas.

**Loop da run (15 min):**
- Ondas por minuto ficam mais densas e trocam de composição.
- Um **elite** a cada ~2 min solta uma Cápsula (baú).
- As **Esferas do Dragão** aparecem no Radar ao longo da run.
- **Transformações** nas horas de aperto.
- Aos 15:00 entra o **chefe da saga**. Vencer libera a próxima saga.

**Loop de meta:** Zeni da run → **Treino na Torre Korin** (loja permanente) → conquistas desbloqueiam personagens, técnicas e sagas.

## 4. Controles

| Ação | Tecla |
|---|---|
| Mover | WASD / setas (8 direções, diagonal normalizada) |
| Transformar | Espaço (com o medidor cheio) |
| Pausar | Esc / P |
| Escolher carta | 1-4, ou setas + Enter |
| Reroll / Pular / Banir (na tela de nível) | R / S / B |

O código de jogo só lê **ações**, nunca teclas, e as teclas são remapeáveis no menu.

## 5. Personagens jogáveis (8)

Cada personagem tem uma técnica inicial, uma passiva própria e uma escada de transformação.

| Personagem | Técnica inicial | Passiva | Transformações | Desbloqueio |
|---|---|---|---|---|
| **Goku** | Kamehameha | Sangue Saiyajin: +10% XP | SSJ → SSJ2 → SSJ3 | Inicial |
| **Vegeta** | Rajada de Ki | Orgulho: +1% de dano a cada 10 kills (máx +30%) | SSJ → Super Vegeta | Chegar aos 10 min com Goku |
| **Gohan** | Masenko | Fúria Oculta: até +50% de dano com HP baixo | SSJ → SSJ2 | Vencer a Saga Cell |
| **Piccolo** | Makankosappo | Regeneração: 0,5 HP/s | Fusão com Kami (+área) | Vencer a Saga Freeza |
| **Trunks** | Espada do Futuro | +15% de velocidade de ataque | SSJ → Super Trunks | Derrotar Cell Jr. ×500 |
| **Gotenks** | Ataque dos Fantasmas Kamikaze | Projéteis +1 | SSJ → SSJ3 | Vencer a Saga Buu |
| **Hercule** (secreto) | Soco Dinamite (fraco) | Sorte ×2; inimigos às vezes "desmaiam de rir" (stun) | Pose de Campeão: inimigos param para olhar | Morrer antes de 1:00 três vezes |
| **Vegetto** (secreto final) | Espada de Ki | +20% em todos os atributos | SSJ (Vegetto Blue fica fora do escopo) | Vencer as 4 sagas com Goku e com Vegeta |

## 6. Técnicas (armas), 11

Nível máximo 8. São no máximo **6 técnicas + 6 passivas** por run. Cada técnica tem um análogo no gênero para guiar o balanceamento.

| Técnica | Comportamento | Análogo | Evolução (técnica nv. 8 + passiva) |
|---|---|---|---|
| Kamehameha | Feixe na direção do movimento, perfura | Whip/laser | + Kaioken → **Kamehameha x10** (feixe contínuo e largo) |
| Rajada de Ki | Esferas rápidas no inimigo mais próximo | Magic Wand | + Sala do Tempo → **Rajada Infinita** (sem recarga) |
| Masenko | Disparo sobre a cabeça, em leque | Knife | + Brinco Potara → **Masenko Supremo** |
| Makankosappo | Feixe fino a um inimigo aleatório, perfuração infinita | Lança | + Scouter → **Makankosappo Duplo** (crítico garantido) |
| Kienzan | Discos que vão e voltam, cortam tudo | Cross | + Ki Controlado → **Kienzan Teleguiado** |
| Taiyoken | Flash periódico que atordoa em área | Clock Lancet | + Água Ultra Divina → **Flash Solar Total** (congela a tela 3 s) |
| Barreira de Ki | Aura de dano em volta | Garlic | + Armadura Saiyajin → **Aura Divina** (cura ao matar) |
| Genki Dama | Esfera lenta que cai e explode em área enorme | Santa Water | + Bênção do Kaioh → **Genki Dama Universal** |
| Espada do Futuro | Cortes em arco dos dois lados | Whip | + Treino de Gravidade → **Burning Slash** |
| Bakuhatsuha | Explosões em pontos aleatórios perto dos inimigos | Lightning Ring | + Cauda Saiyajin → **Explosão Planetária** |
| Fantasmas Kamikaze | Fantasmas teleguiados que explodem | Peachone | + Grande Kaioh → **Super Fantasmas** |

**Técnicas exclusivas** (só o personagem dono pode evoluir, via transformação no nível máximo):
- **Final Flash** (Vegeta): carrega e solta um feixe gigante na direção do movimento.
- **Big Bang Attack** (Vegetto).

## 7. Passivas, 11

| Passiva | Efeito por nível (5 níveis) |
|---|---|
| Kaioken | +10% de dano |
| Sala do Tempo | −8% de recarga |
| Treino de Gravidade | +10% de velocidade de movimento |
| Armadura Saiyajin | +1 de defesa |
| Cauda Saiyajin | +20% de HP máximo |
| Scouter | +25% de raio de coleta, +5% de crítico |
| Água Ultra Divina | +10% de duração |
| Brinco Potara | +1 projétil (máx. 2 níveis) |
| Bênção do Kaioh | +10% de sorte |
| Ki Controlado | +10% de velocidade de projétil e área |
| Grande Kaioh | +8% de XP |
## 8. Sistemas especiais

### 8.1 Transformação (medidor de ki)
- O medidor enche com kills e coleta de orbs. Cheio, **Espaço** transforma por 15 s: sprite novo, aura, +40% de dano, +20% de velocidade e invulnerabilidade de 0,5 s na entrada (onda de choque que empurra os inimigos).
- O **nível do herói libera os degraus**: 1º nos nv. 10, 2º no 25, 3º no 40. Usa sempre o degrau mais alto disponível. Os degraus mais altos duram mais e drenam o medidor mais rápido.
- Cooldown de 20 s depois de destransformar.

### 8.2 Radar do Dragão + Shenlong
- Durante a saga aparecem as **7 Esferas**, uma a cada ~2 min, longe do jogador (600-1200 px). O HUD tem um **Radar** no canto que aponta para elas.
- Ir buscar é risco contra recompensa: fica longe da horda que você já "domou".
- Juntou as 7: o jogo pausa, o Shenlong aparece e oferece **1 desejo entre 3** sorteados:

| Desejo | Efeito |
|---|---|
| "Quero voltar à vida" | +1 reviver nesta run |
| "Quero a imortalidade" | Invulnerável por 60 s |
| "Quero ser o mais forte" | Evolui uma técnica elegível agora, ou +2 níveis em todas |
| "Quero ficar rico" | +3000 Zeni |
| "Destrua meus inimigos" | Limpa a tela e tira 30% do HP do chefe quando ele chegar |
| "Quero mais tempo" | O chefe aparece 2 min depois, com mais XP até lá |

- Uma invocação por run. Desejos de alto nível só aparecem se tiverem sido desbloqueados na loja.

### 8.3 Coletáveis
| Item | Origem | Efeito |
|---|---|---|
| Orb de ki azul/verde/vermelho | Todo inimigo | 1 / 10 / 50 XP. Orbs em excesso se fundem num só (performance) |
| Feijão de Senzu | Raro; caixotes | Cura 30% |
| Zeni | Inimigos, caixotes | Moeda da loja |
| Cápsula Hoi-Poi (baú) | Elites e chefes | 1, 3 ou 5 upgrades; dá evolução se houver uma elegível |
| Scouter de Varredura | Raro | Puxa todos os orbs da tela |
| Taiyoken | Raro | Congela os inimigos por 5 s |

## 9. Sagas (fases)

São 15 min cada. O mapa é infinito: o cenário da saga fica em tile espelhado (`zones_backgrounds/`) e tem caixotes destrutíveis.

| Saga | Cenário | Inimigos comuns | Elites (a cada ~2 min) | Chefe |
|---|---|---|---|---|
| **1. Freeza** (Namek) | `namek*.jpg` | Soldados do Freeza e Saibaman (LoG1 "Various") | Forças Ginyu (LoG1: Recoome, Burter, Jeice, Ginyu) | Freeza (forma final, HD) |
| **2. Androides / Cell** | `geros-laboratory`, `rocks`, `cellgame` | **Cell Jr.** (SB2) + robôs Red Ribbon (Advanced Adventure) | A16, A18, Dr. Gero, Cell imperfeito | Cell Perfeito (HD) |
| **3. Filmes** | `city*`, `sky`, `desert` | Robôs da Big Gete Star (robôs do Advanced Adventure recoloridos) | Cooler (LoG2), Zangya, Bojack | Broly (SB2) |
| **4. Buu** | `majinbase*`, `inside-buu`, `kaioh-shin-realm` | Majins do Babidi: Spopovich, Yamu, Puipui e NPCs (Buu's Fury) | Yakon, Dabura, Buu gordo | Kid Buu (HD) |

Os comuns vêm de jogos de ação/RPG de GBA (Legacy of Goku 1 e 2, Buu's Fury, Advanced Adventure). Eles são menores que os heróis do HD, e isso é bom: no gênero a bucha de canhão tem que ser pequena e numerosa. Escala inteira 2× com nearest-neighbor. Os do Buu's Fury têm 4 direções (frente, lado, costas), ótimo para perseguição.

**Curva da saga:** a densidade sobe a cada minuto. Aos 5:00 e aos 10:00 entra um enxame que fecha um anel em volta do jogador. Os elites têm barra de vida própria.

**Chefes:**
- Têm padrões de ataque reaproveitados do jogo atual (`volley`, `spiral`, `deathball`, `snipe`, `summon`).
- Viram uma arena fechada: uma barreira circular de ki impede fugir.
- Abaixo de 30% de HP o chefe fica **enfurecido**.

**Modo extra** (desbloqueado ao vencer tudo): *Torneio do Outro Mundo*, uma arena infinita com placar de sobrevivência.

## 10. Meta-progressão: Treino na Torre Korin

A moeda é o Zeni, e tudo fica salvo em `localStorage` (`korin:survivors-save`, com `version`).

| Upgrade | Níveis | Efeito |
|---|---|---|
| Vida | 5 | +10% de HP |
| Força | 5 | +5% de dano |
| Defesa | 3 | +1 de armadura |
| Velocidade | 3 | +5% de movimento |
| Área | 3 | +5% |
| Recarga | 3 | −3% |
| Coleta | 3 | +20% de raio |
| Sorte | 3 | +5% |
| Crescimento | 5 | +3% de XP |
| Ganância | 5 | +10% de Zeni |
| Reviver | 1 | +1 vida por run |
| Reroll / Pular / Banir | 3 cada | Usos por run |
| Desejos Lendários | 1 | Libera os desejos fortes do Shenlong |

O custo de cada compra sobe conforme o total já gasto, como no gênero. Tem um botão de **reembolso total**.

**Outras telas:** Conquistas internas (~30) que desbloqueiam personagens e técnicas; **Bestiário** com inimigos vistos e mortos; recordes por saga e personagem; **Créditos** (rippers, Sprite Database, Bandai/TOSE/Banpresto).

## 11. HUD

- Barra de XP no topo.
- Timer central.
- HP sob o herói.
- Medidor de ki com o ícone da transformação disponível.
- Slots de técnicas e passivas à esquerda (com nível).
- **Radar do Dragão** no canto inferior direito, com as esferas coletadas como 7 bolinhas.
- Contador de kills e Zeni.
- Barra do chefe ou elite no topo quando ativo.
- Números de dano (pool, limitados).

## 12. Arte

- **Base: SNES Hyper Dimension** (Goku, Vegeta, Gohan, Piccolo, Gotenks, Vegetto, Freeza, Cell, Buu gordo, Kid Buu). Inclui feixes, auras e SSJ3, ótimos para técnicas e transformações.
- **Complemento: Super Butouden 1/2/3**, reescalados para a altura do HD: Trunks, Hercule, Cell Jr., A16, A18, Dr. Gero, Broly, Bojack, Zangya, Dabura, Babidi, NPCs.
- **Arcade DBZ2 Super Battle:** só os sons. Os retratos podem servir para a seleção de personagem.
- **Pipeline:**
  1. Script `scripts/survivors/build-atlas.mjs` baixa as folhas para `scratch` (sem commit), aplica o color key do fundo (preto no HD, verde no SB2, magenta no arcade) e detecta quadros por componentes conexos (grade fixa quando existir).
  2. Uma tabela à mão (`anims.json`) diz quais quadros formam `idle`, `walk`, `cast`, `hurt`, `transform`.
  3. A saída são atlas PNG/WebP + JSON em `public/assets/survivors/`.
- **Normalização:** altura-alvo de ~64 px na tela para heróis, comuns de 40 a 56 px, chefes de 120 a 160 px. Os SNES escalam em inteiro com `imageSmoothingEnabled = false`.
- **Direção:** os sprites olham para a direita e são espelhados conforme o movimento.

## 13. Áudio

- Sons e música do pacote arcade DBZ2 (`DZrcd-Snd-.rar` e `DZrcd-Msc-.rar`, ~11,5 MB cada). O site bloqueia download automático, então você baixa pelo navegador e põe em `scratch/survivors-audio/` (sem commit). O script de assets extrai com `node-unrar-js` (WASM, sem sudo), corta e converte para `.ogg`/`.m4a` curtos em `public/assets/survivors/sfx/`.
- Mixer em WebAudio: o contexto é destravado no primeiro input, tem canais de SFX com limite de vozes por som (golpes repetidos não estouram), música em loop por saga e botão de mudo salvo no save.

## 14. Arquitetura técnica

- **Pasta:** `src/components/survivors/`. O `ShenlongGame.tsx` passa a montar `<SaiyajinSurvivors />` no lugar de `<SphereDefense />`. Ao terminar, `sphere-game/` é removido, mas os helpers de `art.ts` e `CapsuleArt.tsx` são movidos para a pasta nova.
- **Camadas:**
  - `sim/`: lógica pura com **timestep fixo de 60 Hz**, sem DOM, testável com vitest.
  - `render/`: Canvas 2D, câmera, interpolação.
  - `ui/`: React, só para menus, cartas de nível, loja e pausa.
  - `input/`: mapa de ações.
  - `audio/`.
- **Escala:** até ~500 inimigos e ~1000 projéteis e orbs.
  - Entidades em **pools** (structure-of-arrays para inimigos e orbs).
  - **Spatial hash** (células de 64 px) para colisão e para a busca do "mais próximo".
  - IA de perseguição barata com separação a ~10 Hz.
  - Os orbs se fundem acima de N na tela.
  - Nenhuma alocação no laço quente.
- **Desenho:** um `drawImage` por sprite a partir do atlas, sem `shadowBlur` no laço (lição do jogo atual), com brilhos pré-renderizados em canvas offscreen.
- **Determinismo:** RNG com seed por run, o que permite replays e testes de balanceamento headless.
- **Dados:** técnicas, passivas, inimigos, sagas e desejos ficam em tabelas TS (`data/`). O balanceamento mexe só em números.

## 15. Marcos

| # | Entrega | Critério |
|---|---|---|
| M1 | Loop com formas placeholder: Goku, Rajada + Kamehameha, um tipo de inimigo, XP, nível, cartas | Os 30 s são divertidos, 500 inimigos a 60 fps |
| M2 | Pipeline de atlas + Saga Cell completa (Cell Jr., elites, Cell) | Uma saga jogável de ponta a ponta |
| M3 | 11 técnicas, 11 passivas, evoluções, Cápsulas | Todas as evoluções obtíveis |
| M4 | Transformações + Radar/Shenlong | — |
| M5 | As outras 3 sagas, chefes, 8 personagens | — |
| M6 | Loja da Torre Korin, conquistas, bestiário, save | — |
| M7 | Áudio, juice (hit-stop, shake, flashes), balanceamento, créditos | Run completa sem bugs no Chrome e no Firefox |

## 16. Fontes de sprites (Sprite Database)

| Jogo | Página | Uso |
|---|---|---|
| DBZ Hyper Dimension (SNES) | /game/382 | Base: heróis HD, Freeza, Cell, Buu gordo, Kid Buu, Vegetto, Gotenks |
| Super Butouden 1 (SNES) | /game/383 | Trunks, Hercule, A16, A18, Dr. Gero, Cell imperfeito, efeitos |
| Super Butouden 2 (SNES) | /game/384 | Cell Jr., Broly, Bojack, Zangya |
| Super Butouden 3 (SNES) | /game/385 | Dabura, Babidi |
| DBZ2 Super Battle (Arcade) | /game/2641 | Sons e música; retratos |
| Legacy of Goku (GBA) | /game/977 | Soldados do Freeza, Saibaman, Forças Ginyu |
| Legacy of Goku II (GBA) | /game/978 | Cooler |
| Buu's Fury (GBA) | /game/976 | Spopovich, Yamu, Puipui, Yakon, NPCs |
| Advanced Adventure (GBA) | /game/974 | Robôs |

Os créditos vão para cada ripper (Kenman865, G.o.D., Zidane_Blake, Grim e outros), mais Sprite Database e Bandai/TOSE/Banpresto/Webfoot/Dimps.

## 17. Em aberto

- **Sons do arcade:** falta baixar `DZrcd-Snd-.rar` e `DZrcd-Msc-.rar` para `scratch/survivors-audio/`. Até lá os efeitos são sintetizados em WebAudio e não há música.
- **Torneio do Outro Mundo** (modo infinito) e **remapeamento de teclas** no menu ainda não existem.
- **Balanceamento:** só foi testado com o bot (`scripts/survivors/balance.ts`). Falta jogar de verdade.
- **Firefox:** o critério do M7 pede teste no Firefox; até agora só rodou no Chrome.

## 18. Estado da implementação (26/11/2026)

| Marco | Estado |
|---|---|
| M1 Loop | Pronto |
| M2 Atlas + saga | Pronto. Atlas com 46 sprites; as 4 sagas são jogáveis |
| M3 Técnicas | 11 técnicas, 11 evoluções e 4 exclusivas; 11 passivas; Cápsula com 1/3/5 prêmios |
| M4 Transformação + Shenlong | Pronto |
| M5 Sagas, chefes, personagens | Pronto: 4 sagas, 4 chefes, 14 elites, 8 personagens |
| M6 Loja, conquistas, bestiário, save | Pronto: 15 treinos, 31 conquistas, save v2 (migra o v1) |
| M7 Áudio, juice, créditos | Parcial: efeitos sintetizados, hit-stop, tremor, clarões, partículas, créditos. Sem música |
| Expansão (§19) | Pronta: 17 técnicas base com evolução, 17 passivas, 14 pergaminhos, 12 inimigos novos, Modo Pesadelo |

**Desvios do rascunho:**
- **Teclas:** Espaço transforma e Enter confirma. Pular carta é **X**, porque S já é andar para baixo. Sortear é R e banir é B.
- **Masenko** mira no inimigo mais próximo em vez de ir para onde o herói anda (com kite, o leque ia sempre para o lado vazio). A Espada e o Soco viram para o inimigo mais próximo ao alcance.
- **Técnicas exclusivas** entram como cartas só daquele personagem, em vez de via transformação: Final Flash (Vegeta), Espada de Ki e Big Bang Attack (Vegetto), Soco Dinamite (Hercule).
- **Desejos lendários** ("Quero ser o mais forte", "Destrua meus inimigos") exigem a compra "Esferas Lendárias".
- **Caixotes** são inimigos parados de 1 HP que soltam Senzu, Zeni, Scouter de Varredura, Taiyoken ou ki concentrado.
- **Sprites sem folha própria** foram recoloridos no build (`hue` no `anims.json`):
  - Saibaman: Cell Jr. verde.
  - Robôs Red Ribbon e Big Gete Star: Robô Sentinela do Advanced Adventure.
  - Cooler: Freeza HD.
  - Majin do Babidi: Yamu.
  - Dabura vem do WebP do jogo antigo.
- **Ordem das sagas:** Freeza → Cell → Filmes → Buu (cada vitória libera a próxima).

**Ferramentas:**

| Comando | O que faz |
|---|---|
| `node scripts/survivors/inspect.mjs <folha> [faixa] [gap]` | Gera prévias numeradas dos quadros de uma folha |
| `node scripts/survivors/zoom.mjs <prévia> x y w h` | Amplia um pedaço da prévia |
| `node scripts/survivors/build-atlas.mjs` | Gera `public/assets/survivors/atlas.json` e `atlas-0.png` a partir de `scripts/survivors/anims.json` |
| `node scripts/survivors/atlas-preview.mjs <saída.png>` | Gera uma folha de conferência do atlas |
| `npx tsx scripts/survivors/balance.ts [seed] [personagem] [saga] [mortal] [loja em JSON]` | Run do bot com resumo por minuto e, no fim, o dano recebido por origem |
| `npx tsx --test "src/components/survivors/**/*.test.ts"` | Os 23 testes da simulação |

Em desenvolvimento, `window.__ss.current` expõe o World e `window.__ssSim` as funções da simulação (`addTech`, `spawnEnemy`...) para testes no navegador.

## 19. Expansão (26/11/2026)

**Técnicas novas (6 + 6 evoluções), cada uma com um comportamento novo:**

| Técnica | Comportamento | Passiva | Evolução |
|---|---|---|---|
| Sokidan | Esferas em órbita, contínuas | Casco do Mestre Kame | Sokidan Galáctico: duas órbitas, cura por derrota |
| Kikoho | Anel que se expande do herói | Terceiro Olho | Shin Kikoho: anel gigante que atordoa |
| Hellzone Grenade | Esferas cercam um alvo, param e se fecham | Nuvem Voadora | Hellzone Supremo: três cercos |
| Renzoku Energy Dan | Saraivada de tiros por um tempo | Bastão Mágico | Chuva de Ki Infinita |
| Raio do Kaioshin | Relâmpago que salta entre inimigos | Radar do Dragão | Trovão Divino: atordoa |
| Rosquinha Galáctica | Anel que puxa a horda para o centro | Marca Majin | Super Rosquinha: explode no fim |

**Passivas novas (6):** Casco do Mestre Kame (regeneração), Terceiro Olho (dano crítico), Bastão Mágico (perfuração e empurrão), Nuvem Voadora (velocidade e esquiva), Radar do Dragão (Zeni e coleta), Marca Majin (dano, com maldição). Atributos novos: dano crítico, perfuração, maldição, esquiva e empurrão.

**Cartas:**
- **Carta dourada:** chance de 5% (vezes a sorte) de uma carta de técnica subir dois níveis.
- **Pergaminhos Secretos** aos 4:00 e aos 9:00: escolha 1 de 3 entre 14 modificadores da run, alguns com custo. Exemplos: Fúria do Oozaru (+35% de dano, -25% de HP), Pacto com Babidi (maldição por XP), Kaioken x20 (dano cresce sem levar golpe), Zanzoken, Chuva de Meteoros, Kiai. Aparecem no HUD.

**Inimigos:**
- **Comportamentos novos:** atirador (mantém distância e atira), kamikaze (para perto do herói, pisca e explode; morto antes, explode só nos inimigos vizinhos) e investida (os brutamontes avisam com uma faixa e disparam em linha reta).
- **8 comuns novos**, um atirador e um kamikaze por saga. Os kamikazes têm uma faísca de pavio sobre a cabeça.
- **4 elites novos:** Rei Cold, Robô Pirata Gigante, Metal Cooler, Boo Maligno.
- **Chefes com mais ataques:** laser (linha fina de aviso, depois o feixe) e chuva de meteoros (círculos que enchem antes de explodir). A investida dos elites e chefes também avisa antes. Chefes com 20 a 30 mil de HP.
- **Eventos:** debandadas aos 4:30, 8:30 e 12:30 (uma parede de inimigos atravessa a tela em linha reta) e cercos aos 5:00, 8:00 e 11:00.

**Dificuldade:**
- Mais inimigos a partir do minuto 4 e um elite a cada 90 s (o primeiro aos 2:00).
- O HP dos inimigos cresce mais rápido no fim. O dano deles sobe 6% por minuto depois dos 3:00.
- A curva de XP mantém o começo rápido e encarece os níveis depois do 20.
- **Modo Pesadelo:** liga na escolha de saga para sagas já vencidas. Inimigos com +50% de HP e dano e maldição +50%; o Zeni da run dobra.
- Com o bot (que joga mal), sem treinos ele morre por volta dos 3 minutos. Com treinos medianos da loja (vida 5, força 5, defesa 3, velocidade 3, área 3, recarga 3), venceu 2 de 4 runs e morreu entre 4 e 5 minutos nas outras.

**Loja:** mais 4 treinos (regeneração, crítico, Brinco Potara Antigo com +1 projétil, e Desafio do Senhor Kaioh, que é a maldição opcional).

**Meta:**
- Enciclopédia no menu: técnicas com a receita de evolução (a evolução aparece depois de descoberta), passivas e pergaminhos.
- 8 conquistas novas, 39 no total.

**Animação e efeitos:**
- Sistema de partículas que a simulação alimenta por uma fila de pedidos visuais (`w.fx*`). Ele usa o relógio do jogo, então pausa junto.
- Inimigos brotam do chão, quicam ao andar e, ao morrer, piscam branco e se achatam com faíscas. Elites e chefes têm aura pulsando; o chefe fica vermelho quando enfurecido.
- O herói quica e inclina ao andar, solta poeira, e quando transformado tem chamas de aura e imagens residuais.
- Explosões usam a animação de explosão do Advanced Adventure.
- Projéteis deixam rastro; os feixes têm bola de energia e ponto de impacto.
- Números de dano saltam ao aparecer. Há "LEVEL UP!" e "ESQUIVA!" flutuando, e bordas vermelhas com HP baixo.

**Correção importante:** com 700 orbs no chão, o XP novo ia para um orb sorteado, muitas vezes longe do herói, e na prática sumia: o nível travava. Agora o orb mais distante vem até onde o inimigo morreu e soma o valor.

## 20. Mais cartas e mecânicas de carta (26/11/2026)

**Mecânicas novas na tela de nível:**
- **União:** com duas técnicas da receita no nível 5 ou mais, uma carta de União pode aparecer (75% das vezes). Ela funde as duas numa técnica forte e libera um espaço. São 6:

  | União | Receita |
  |---|---|
  | Kamehameha Pai e Filho | Kamehameha + Masenko |
  | Saraivada Galick | Rajada + Renzoku |
  | Kienzan Trovão | Kienzan + Raio |
  | Genki Rosquinha | Genki Dama + Rosquinha |
  | Cerco Fantasma | Fantasmas + Hellzone |
  | Corte Galáctico | Espada + Kikoho |
- **Pactos:** cartas amaldiçoadas que aparecem a partir do nível 8 (12% das telas), até 3 por run. Cada um tem um ganho forte e um custo; são 8. Exemplos: Pacto do Imperador (+1 nível em tudo, -20% de HP) e Feitiço de Babidi (Cápsula de 3 prêmios, -15% de velocidade).
- **Itens:** cartas de uso imediato a partir do nível 3 (15% das telas): Ki Concentrado, Cápsula, Scouter de Varredura, Radar do Dragão, Água Sagrada, Bomba Capsule Corp, Treino Relâmpago.
- **Conjuntos:** 8 trios (ou duplas) de passivas; ter todas liga um bônus. A carta mostra o progresso ("Treino no Planeta do Kaioh 2/3") e o sorteio favorece passivas de conjuntos começados.
- **Travar (T):** a carta travada volta na próxima tela de nível. 1 trava por run, mais o treino "Selo do Kaioshin" (até +2) e o pacto Esferas Negras.
- **Passivas exclusivas:** uma por personagem (Instinto de Luta, Príncipe dos Saiyajins, Poder Oculto, Braços Elásticos, Esperança do Futuro, Ego de Fusão, Fã-Clube do Campeão, Arrogância Potara).

**Mais cartas:** 4 técnicas novas com evolução e 4 passivas que as evoluem.

| Técnica | Passiva | Evolução |
|---|---|---|
| Galick Ho | Orgulho Saiyajin | Galick Ho Final |
| Burning Attack | Roupa com Pesos | Burning Storm |
| Raio da Morte | Pose Especial Ginyu | Raio da Morte Supremo |
| Mafuba | Jarra de Arroz Elétrica | Mafuba Supremo |

Totais: 21 técnicas base com evolução, 6 uniões, 4 exclusivas, 29 passivas, 8 conjuntos, 8 pactos, 7 itens, 14 pergaminhos. Mais 6 conquistas (45 no total).

**Mais difícil:**
- Um elite a cada 75 s, em dupla a partir das 7:00.
- Até 700 inimigos (630 no minuto 13).
- O dano cresce 8% por minuto depois dos 3:00, e o HP cresce mais rápido no fim.
- Chefes com 23 a 34,5 mil de HP.

Com o bot:

| Treinos da loja | Resultado |
|---|---|
| Nenhum | Morre por volta dos 3:15 |
| Medianos | Morre entre 3:30 e 5:00 |
| Completos | Venceu 3 de 4 runs |

**Visual:**
- **Goku base:** agora vem do Super Butouden 2, com guarda, andar, a pose do Kamehameha e dano. O cabelo preto é feito no build (`hairBlack` no `anims.json` recolore só o amarelo do terço de cima do quadro). O SSJ também usa essa folha.
- **Feixes (Kamehameha, Galick Ho, Final Flash):** o herói carrega uma esfera nas mãos 0,5 s antes do disparo. O feixe avança da mão até a ponta e tem brilho ondulado, núcleo branco, espiral, riscos correndo e cabeça com raios de luz.

## 21. Interface em inglês (26/11/2026)

O jogo agora se chama **Saiyan Survivors** na tela, e todo o texto visível está em inglês.
- **Nomes:** seguem a dublagem americana de DBZ.
  - Técnicas: Spirit Bomb, Special Beam Cannon, Destructo Disc, Solar Flare, Galick Gun, Death Beam, Evil Containment Wave.
  - Personagens e inimigos: Frieza, Majin Buu, Vegito, Shenron.
- **Descrições:** curtas e consistentes. Atributos com nomes fixos: damage, area, cooldown, duration, move speed, armor, regen, crit chance/damage, pierce, dodge, knockback, luck, XP, Zeni, Curse.
- **Código:** comentários, ids e testes continuam em português.

**Interface:**
- **Cartas:**
  - faixa com o tipo da carta (Technique, Passive, Union, Pact, Item, Scroll);
  - ícone por comportamento de técnica (`ui/icons.ts`);
  - marcadores de nível com o nível novo piscando;
  - selos NEW, GOLDEN, MAX, "MAX · CAN EVOLVE" e exclusiva de personagem;
  - ganho em destaque, pactos separados em ganho (verde) e custo (vermelho), receita da união e dicas de evolução e de conjunto.
- **Tela de nível:** mostra a build atual numa faixa.
- **HUD:** barra de HP com números, espaços com ícone e marcadores de nível, as 7 esferas no canto e os pergaminhos com nome.
- **Pausa:** seções (Techniques, Passives, Modifiers) com receita de evolução marcada quando você já tem a passiva, e grade com 18 atributos.
- **Resultado:** quadros com tempo, nível, derrotas e Zeni.
- **Menus:** título com recordes em quadros, estrelas de dificuldade nas sagas, barra de progresso nas conquistas, comportamento dos inimigos no bestiário, e a Enciclopédia em abas.

## 22. Segunda leva de cartas (26/11/2026)

**7 técnicas novas, cada uma com passiva e evolução:**

| Técnica | Comportamento | Passiva | Evolução |
|---|---|---|---|
| Dodonpa (Dodon Ray) | lança no inimigo mais próximo | Quimono da Escola do Grou | Super Dodonpa |
| Kiai | onda curta com empurrão forte | Telecinese do Chaozu | Explosão Psíquica (atordoa) |
| Punho do Lobo (Wolf Fang Fist) | socos rápidos | Lenço do Bandido do Deserto | Novo Punho do Lobo |
| Canhão Eraser | bomba no meio da horda | Coroa de Controle | Meteoro Gigante (poça de ki) |
| Raio Doce (Candy Beam) | projétil teleguiado lento | Chocolate do Buu | Tempestade de Chocolate (cura) |
| Absorção de Energia | aura pequena que cura nas mortes | Chip do Dr. Gero | Energia Infinita |
| Imagem Residual (Afterimage) | tipo novo `trail`: zonas que ficam onde o herói passou | Escalada da Torre Korin | Exército de Imagens (atordoa) |

**5 exclusivas novas:** Punho do Dragão (Goku, feixe para onde anda), Kamehameha Definitivo (Gohan), Granada de Luz (Piccolo), Heat Dome Attack (Trunks), Soco Super Milagroso (Gotenks). Agora todo personagem tem ao menos uma.

**4 uniões novas:** Dupla do Grou (Dodonpa + Kiai), Lobo Fantasma (Punho do Lobo + Imagem Residual), Absorção Majin (Raio Doce + Absorção), Omega Blaster (Canhão Eraser + Bakuhatsuha).

**4 conjuntos novos:** Escola do Grou (Quimono + Telecinese + Terceiro Olho), Laboratório Red Ribbon (Chip + Roupa com Pesos + Armadura), Casa do Buu (Chocolate + Marca Majin), Bandido do Deserto (Lenço + Nuvem + Torre Korin).

**3 pactos novos:** Fúria Lendária (+50% dano, +15% velocidade / +40% Maldição, -2 armadura), Ritual do Velho Kaioshin (+1 nível em todas as passivas / +15% recarga), Absorção Perfeita (+20% área e duração, +1 perfuração / -20% XP e sorte).

**3 itens novos:** Cura do Dende (HP cheio, só com HP < 70%), Bola de Cristal da Uranai Baba (+2 rerolls, +1 banimento, +1 trava), Um Dia na Sala do Tempo (+1 nível numa técnica sua).

**Motor:** `extra.target` (`nearest`/`random`/`densest`/`strongest`/`facing`) substitui os testes por id do Final Flash e do Big Bang. `extra.homing` em `bolt` usa o modo de projétil 6 (orb teleguiado). O tipo `trail` reaproveita a zona `pool` com dano cheio e atordoamento. A conquista "Enciclopédia Saiyajin" conta as evoluções a partir dos dados.

Totais: 28 técnicas base com evolução, 10 uniões, 9 exclusivas, 36 passivas, 12 conjuntos, 11 pactos, 10 itens. Com o bot e sem loja, a run ainda morre entre 3:10 e 3:30.

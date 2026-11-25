---
title: "Bouncing Ball"
kind: canvas
difficulty: 1
tags: [raylib, game-loop, colisao, wasm]
languages: [c, cpp]
order: 1
hints:
  - "A cada quadro: `pos.x += vel.x * dt;` e o mesmo para `y`. `dt` vem de `GetFrameTime()` e está em segundos."
  - "Bateu na parede direita quando `pos.x + RAIO >= LARGURA`. Inverta o sinal: `vel.x = -vel.x;`. São quatro paredes."
  - "Se a bola passar um pouco da parede, ela pode ficar presa trocando de sinal todo quadro. Depois de inverter, recoloque-a dentro: `pos.x = LARGURA - RAIO;`."
---

Um game loop, um objeto que se move e colisão com as bordas.

O desafio roda no navegador. O C é compilado para WebAssembly com a [raylib](https://www.raylib.com/) e desenhado num canvas ao lado do editor, sem passar por servidor. Use `:run` (ou Executar) para compilar e ver o resultado. Não há comparação pixel a pixel: o `:submit` roda o programa por 3 segundos, tira um print do canvas e confere que algo foi desenhado. Se está certo ou não, quem julga é você olhando.

## Tarefa

O template abre uma janela de 640×360 e desenha uma bola parada. Faça a bola:

1. andar com velocidade constante, usando o tempo do quadro (`GetFrameTime()`), e não "pixels por quadro";
2. quicar nas quatro bordas da janela, sem nunca sair da tela;
3. mudar de cor a cada batida.

## O que você tem da raylib

| Função | Para quê |
|---|---|
| `GetFrameTime()` | segundos desde o quadro anterior |
| `DrawCircleV(pos, raio, cor)` | desenha a bola |
| `ClearBackground(cor)` | limpa a tela no começo do quadro |
| `DrawText(texto, x, y, tamanho, cor)` | texto na tela (ajuda a depurar) |
| `IsKeyDown(KEY_SPACE)` | teclado (clique no canvas antes, para ele ter o foco) |

`printf` também funciona: a saída aparece embaixo do canvas.

## Extras

- Deixe a gravidade puxar a bola (`vel.y += 900 * dt`) e perca um pouco de energia a cada quique.
- Faça `KEY_SPACE` dar um chute para cima.
- Troque a bola por 50 bolas num vetor.

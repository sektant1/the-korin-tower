---
title: Bolinha Quicando (raylib)
kind: canvas
difficulty: 1
tags: [raylib, game-loop, colisao, wasm]
languages: [c, cpp]
order: 1
hints:
  - "A cada quadro: `pos.x += vel.x * dt;` e o mesmo para `y`. `dt` vem de `GetFrameTime()` e está em **segundos**."
  - "Bateu na parede direita quando `pos.x + RAIO >= LARGURA`. Inverta o sinal: `vel.x = -vel.x;`. São quatro paredes."
  - "Se a bola passar um pouco da parede, ela pode ficar presa trocando de sinal todo quadro. Depois de inverter, recoloque-a dentro: `pos.x = LARGURA - RAIO;`."
---

Todo jogo começa assim: um **game loop**, um objeto que se move e uma colisão.

Este desafio roda **no seu navegador**. Seu C é compilado para WebAssembly com a [raylib](https://www.raylib.com/) e desenhado num canvas, ao lado do editor. Use `:run` (ou **Executar**) para compilar e ver o resultado. Não há testes automáticos nem pontos: o juiz é o seu olho.

## Tarefa

O template abre uma janela de 640×360 e desenha uma bola parada. Faça a bola:

1. andar com velocidade constante, usando o tempo do quadro (`GetFrameTime()`), e não "pixels por quadro";
2. **quicar** nas quatro bordas da janela, sem nunca sair da tela;
3. mudar de cor a cada batida.

## O que você tem da raylib

| Função | Para quê |
|---|---|
| `GetFrameTime()` | segundos desde o quadro anterior |
| `DrawCircleV(pos, raio, cor)` | desenha a bola |
| `ClearBackground(cor)` | limpa a tela no começo do quadro |
| `DrawText(texto, x, y, tamanho, cor)` | texto na tela (ótimo para depurar) |
| `IsKeyDown(KEY_SPACE)` | teclado (clique no canvas antes, para ele ter o foco) |

`printf` também funciona: a saída aparece embaixo do canvas.

## Para ir além

- Deixe a gravidade puxar a bola (`vel.y += 900 * dt`) e perca um pouco de energia a cada quique.
- Faça `KEY_SPACE` dar um chute para cima.
- Troque a bola por 50 bolas num vetor.

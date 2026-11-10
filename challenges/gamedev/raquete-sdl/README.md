---
title: Raquete no Teclado (SDL2)
kind: canvas
difficulty: 2
tags: [sdl2, input, game-loop, wasm]
languages: [c]
order: 2
hints:
  - "Não mova a raquete dentro do `SDL_KEYDOWN`: o sistema repete a tecla aos soquinhos. Leia o estado com `SDL_GetKeyboardState(NULL)` a cada quadro."
  - "`const Uint8 *teclas = SDL_GetKeyboardState(NULL);` e depois `if (teclas[SDL_SCANCODE_LEFT]) x -= VEL * dt;`."
  - "Para o tempo do quadro: guarde `SDL_GetTicks()` do quadro anterior e faça `dt = (agora - antes) / 1000.0f`."
  - "Prenda a raquete na tela: se `x < 0`, `x = 0`; se `x > LARGURA - raquete.w`, `x = LARGURA - raquete.w`."
---

Segundo passo de todo jogo: **ler o jogador**. Aqui você usa a SDL2 pura, sem motor nenhum por cima.

Este desafio roda **no seu navegador**: o C vira WebAssembly e a SDL2 desenha num canvas. Use `:run` para compilar. **Clique no canvas** para ele receber o teclado. Sem testes automáticos e sem pontos.

## Tarefa

O template abre uma janela de 640×360 e desenha uma raquete parada no pé da tela. Faça:

1. as setas `←` e `→` (ou `A` e `D`) moverem a raquete, com movimento **suave** enquanto a tecla estiver apertada;
2. a velocidade não depender do FPS (use o tempo entre quadros);
3. a raquete nunca sair da tela.

## O que você tem da SDL2

| Função | Para quê |
|---|---|
| `SDL_PollEvent(&e)` | esvazia a fila de eventos (faça todo quadro) |
| `SDL_GetKeyboardState(NULL)` | vetor com o estado atual de cada tecla |
| `SDL_GetTicks()` | milissegundos desde o início |
| `SDL_RenderFillRect(r, &rect)` | desenha um retângulo cheio |
| `SDL_Delay(ms)` | espera; no navegador é o que devolve o controle à página |

O `SDL_Delay(16)` do fim do laço é obrigatório aqui: sem ele a aba trava, porque o laço nunca deixa o navegador respirar.

## Para ir além

- Acrescente uma bola e transforme isto num Breakout de um tijolo só.
- Dê aceleração e atrito à raquete em vez de velocidade constante.

---
title: Tabuleiro de Xadrez Giratório
kind: shader
difficulty: 1
tags: [glsl, shader, coordenadas, rotacao, iniciante]
languages: [glsl]
order: 3
hints:
  - "Centralize e corrija a proporção: `vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;`. Agora `(0,0)` é o centro e um quadrado é um quadrado, em qualquer tamanho de tela."
  - "Rotação 2D: `mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }` e depois `p = rot(iTime) * p;`."
  - "Quadriculado: `vec2 cell = floor(p * 8.0);` e `float check = mod(cell.x + cell.y, 2.0);`. `check` vale 0 ou 1, alternando como num tabuleiro."
  - "Zoom pulsando: multiplique `p` por `1.0 + 0.5 * sin(iTime)` antes do `floor`."
  - "Escureça as bordas (vinheta): `col *= 1.0 - 0.6 * dot(p, p);`."
---

O "Hello, World" dos shaders: um tabuleiro de xadrez que **gira** e **pulsa**, ocupando a tela inteira.

Este desafio roda no navegador (WebGL2, estilo Shadertoy). Você escreve `mainImage`, que recebe a coordenada do pixel e devolve a cor dele. O mesmo código roda **em paralelo** para cada pixel da tela.

## Requisitos

1. Casas quadradas de verdade (não esticadas) em qualquer proporção de tela.
2. O tabuleiro gira em torno do **centro** da tela, com velocidade constante (`iTime`).
3. O tamanho das casas pulsa com o tempo.
4. Duas cores à sua escolha (não precisa ser preto e branco).
5. Bônus: vinheta escurecendo as bordas, ou o mouse (`iMouse`) controlando o ângulo.

## Uniforms

`iResolution` (`vec3`, pixels), `iTime` (`float`, segundos), `iMouse` (`vec4`).

Não há teste automático: quando o tabuleiro estiver girando liso e com casas quadradas, considere resolvido.

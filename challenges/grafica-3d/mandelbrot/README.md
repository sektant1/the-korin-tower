---
title: Mergulho no Conjunto de Mandelbrot
kind: shader
difficulty: 3
tags: [glsl, shader, fractal, numeros-complexos, demoscene]
languages: [glsl]
order: 4
hints:
  - "Cada pixel é um número complexo $c$. Comece em $z = 0$ e repita $z \\leftarrow z^2 + c$. Se $|z|$ passar de 2, o ponto **escapa**; conte em quantas iterações isso aconteceu."
  - "Quadrado complexo com `vec2`: `z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;`. Teste o escape com `dot(z, z) > 4.0` (evita a raiz quadrada)."
  - "GLSL ES não deixa o limite do `for` ser variável em todas as GPUs: use uma constante (`for (int i = 0; i < 256; i++)`) e `break` quando escapar."
  - "Zoom: `c = centro + p * escala`, com `escala = exp(-iTime * 0.3)` diminuindo com o tempo. Escolha um centro na borda do conjunto, por exemplo `vec2(-0.743643887, 0.131825904)`."
  - "Cor suave (sem faixas): `float sn = float(i) - log2(log2(dot(z, z))) + 4.0;` e use `sn` numa paleta de cossenos."
---

O fractal mais famoso da computação: para cada ponto $c$ do plano complexo, itere $z_{n+1} = z_n^2 + c$ começando de $z_0 = 0$. Os pontos onde $|z|$ **nunca** passa de 2 formam o conjunto de Mandelbrot; os outros escapam, uns mais rápido que outros.

Faça um shader que mergulha (zoom contínuo) numa região da borda do conjunto, colorindo pela velocidade de escape.

## Requisitos

1. Mapeie cada pixel para um número complexo, com proporção correta.
2. Itere até escapar ou até um limite fixo (pelo menos 200 iterações).
3. Pontos de dentro do conjunto ficam pretos; os de fora ganham cor pelo número de iterações.
4. O zoom avança com `iTime`, centrado num ponto interessante da borda.
5. Bônus: coloração suave (*smooth iteration count*), para não aparecerem faixas.

## Uniforms

`iResolution` (`vec3`), `iTime` (`float`), `iMouse` (`vec4`).

## Atenção à precisão

`float` no shader tem só ~7 dígitos. Depois de uns 20 segundos de zoom a imagem vira blocos: é o limite do `float` de 32 bits, não um bug seu. Faça o zoom reiniciar em ciclos (`mod(iTime, 20.0)`).

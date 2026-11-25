---
title: "Ray Marching"
kind: shader
difficulty: 4
tags: [glsl, shader, raymarching, sdf, iluminacao, sombras]
languages: [glsl]
order: 5
hints:
  - "Câmera: origem `ro = vec3(0, 1, -4)` e direção `rd = normalize(vec3(p, 1.5))`, onde `p` é a coordenada centralizada do pixel. O `1.5` controla o campo de visão."
  - "Uma SDF diz a distância até a superfície mais próxima. Esfera: `length(pos - centro) - raio`. Plano do chão: `pos.y`. A cena é o `min` das duas."
  - "Ray marching (*sphere tracing*): `t = 0`; repita: `d = mapa(ro + rd * t)`; se `d < 0.001`, acertou; senão `t += d`. Pare se `t > 50` (céu). Uns 100 passos bastam."
  - "Normal pelo gradiente da SDF: `vec2 e = vec2(0.001, 0); n = normalize(vec3(mapa(p+e.xyy)-mapa(p-e.xyy), mapa(p+e.yxy)-mapa(p-e.yxy), mapa(p+e.yyx)-mapa(p-e.yyx)));`."
  - "Sombra: marche do ponto atingido (um pouco acima, `pos + n * 0.01`) em direção à luz. Se bater em algo antes de chegar, está na sombra. Sombra suave: guarde `min(k * d / t)` ao longo do caminho."
---

No ray tracing tradicional a interseção do raio com cada objeto sai de uma fórmula. No ray marching a cena inteira é uma função de distância com sinal (SDF), e o raio anda em passos do tamanho da distância até a superfície mais próxima.

Monte uma cena 3D dentro de um fragment shader.

## Requisitos

1. Câmera em perspectiva olhando para a cena.
2. Pelo menos uma esfera sobre um plano (o chão), os dois definidos como SDF.
3. Normais calculadas pelo gradiente da SDF.
4. Iluminação difusa (Lambert) de uma luz direcional, mais uma luz ambiente fraca.
5. Sombra: o chão escurece embaixo da esfera.
6. Algo animado com `iTime` (a esfera quica, a luz gira, a câmera orbita...).
7. Bônus: sombra suave, chão quadriculado, *fog* pela distância, ou união suave (*smooth min*) de duas esferas.

## Uniforms

`iResolution` (`vec3`), `iTime` (`float`), `iMouse` (`vec4`).

Não há comparação pixel a pixel. O `:submit` renderiza dois frames (em `t=0` e `t=3`) e confere que a cena aparece. Com a esfera iluminada e fazendo sombra no chão, o desafio está resolvido. O [Sphere Ray Tracer](/desafio/ray-tracer-esfera) tem a mesma cena feita com a outra técnica, se quiser comparar.

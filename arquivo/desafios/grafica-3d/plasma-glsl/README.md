---
title: "Plasma Effect"
kind: shader
difficulty: 2
tags: [glsl, shader, demoscene, webgl]
languages: [glsl]
order: 2
hints:
  - "Normalize a coordenada: `vec2 uv = fragCoord / iResolution.xy;` Agora `uv` vai de 0 a 1 nos dois eixos."
  - "Plasma é soma de senos: `sin(uv.x * 10.0 + iTime)` + `sin(uv.y * 10.0 + iTime)` + `sin((uv.x + uv.y) * 10.0 + iTime)`..."
  - "Um seno de distância ao centro dá anéis: `sin(length(uv - 0.5) * 20.0 - iTime * 2.0)`."
  - "Transforme o valor `v` em cor com uma paleta de cossenos: `0.5 + 0.5 * cos(6.2831 * (v + vec3(0.0, 0.33, 0.67)))`."
---

Faça um plasma colorido e animado, o efeito que aparecia em toda demo dos anos 90.

O desafio roda no navegador, num canvas WebGL2 no estilo Shadertoy. Você escreve a função `mainImage` e o site faz o resto. Use `:run` (ou o botão Executar) para recompilar.

## Uniforms disponíveis

| Uniform | Tipo | Significado |
|---|---|---|
| `iResolution` | `vec3` | tamanho do canvas em pixels (`z` = 1) |
| `iTime` | `float` | segundos desde o início |
| `iMouse` | `vec4` | `xy` = posição do mouse com botão pressionado, `zw` = posição do clique |

## Requisitos

1. As cores devem mudar com o tempo (`iTime`).
2. O padrão deve variar no espaço com pelo menos três ondas de seno somadas.
3. Bônus: o mouse distorce o plasma.

Não há comparação pixel a pixel. O `:submit` renderiza dois frames no navegador (em `t=0` e `t=3`) e confere que o efeito aparece. Se aparecer, o desafio é dado como resolvido.

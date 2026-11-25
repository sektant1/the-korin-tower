# Arquivo

Conteúdo fora do site, guardado para voltar no futuro. Nada aqui é lido pelo
seed, pelo `verify` ou pelo build.

## desafios/

Desafios que dependiam do pipeline gráfico antigo (GLSL no WebGL2 e C/C++ com
raylib/SDL2 compilados para WASM pelo Emception). O motor de execução atual só
roda stdin/stdout e testes unitários em C, C++, Rust e Python, então eles
saíram do site e do banco (`npm run seed -- --prune`).

| Desafio | Tipo antigo | Categoria |
|---|---|---|
| `gamedev/bolinha-quicando` | canvas (raylib/SDL2) | gamedev |
| `gamedev/raquete-sdl` | canvas (SDL2) | gamedev |
| `grafica-3d/mandelbrot` | shader (GLSL) | grafica-3d |
| `grafica-3d/plasma-glsl` | shader (GLSL) | grafica-3d |
| `grafica-3d/raymarching-sdf` | shader (GLSL) | grafica-3d |
| `grafica-3d/xadrez-giratorio` | shader (GLSL) | grafica-3d |

Para trazer um de volta: mova a pasta para `challenges/<categoria>/`, recrie a
categoria em `challenges/categories.yml` se for o caso, e reimplemente o tipo
(`kind`) no loader e no motor. O código do pipeline antigo está no histórico do
git, antes do commit que removeu o Emception.

### Trilha removida (`challenges/tracks.yml`)

```yaml
- id: do-pixel-ao-ray-marching
  title: Do pixel ao ray marching
  description: Aqueça com shaders no navegador, trace uma esfera pixel a pixel num PPM e termine marchando raios em GLSL.
  steps:
    - xadrez-giratorio
    - plasma-glsl
    - mandelbrot
    - ray-tracer-esfera
    - raymarching-sdf
```

### Categoria removida (`challenges/categories.yml`)

```yaml
- id: gamedev
  name: Game Dev
  icon: joystick
  description: Game loops, física, colisão e ECS.
```

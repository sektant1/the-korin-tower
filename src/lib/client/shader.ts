"use client";
// Shader estilo Shadertoy (mainImage) — compilação e render fora do componente
// ShaderCanvas, para poder julgar um frame em momento determinístico (iTime fixo).
// O "teste" de um desafio de shader é: compila e desenha algo que não seja uma
// tela de cor única. O frame vira PPM P3 e segue para o servidor.

export const PRELUDE = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
out vec4 korinFragColor;
`;
const PRELUDE_LINES = PRELUDE.split("\n").length - 1;
export const EPILOGUE = `
void main() { mainImage(korinFragColor, gl_FragCoord.xy); }
`;
export const VERTEX = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }
`;

export interface ShaderError {
  line: number | null;
  message: string;
}

/** "ERROR: 0:12: 'x' : undeclared identifier" -> linha no código do usuário */
export function parseShaderLog(log: string): ShaderError[] {
  return log
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(?:ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/.exec(l);
      if (!m) return { line: null, message: l };
      const line = Number(m[1]) - PRELUDE_LINES;
      return { line: line >= 1 ? line : null, message: m[2] };
    });
}

/** Compila e liga o programa; devolve os erros (vazio = OK). */
export function buildShaderProgram(gl: WebGL2RenderingContext, source: string): { program: WebGLProgram | null; errors: ShaderError[] } {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, PRELUDE + source + EPILOGUE);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const errors = parseShaderLog(gl.getShaderInfoLog(fs) ?? "erro de compilação");
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return { program: null, errors };
  }
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const errors = parseShaderLog(gl.getShaderInfoLog(vs) ?? "erro no vertex shader");
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return { program: null, errors };
  }
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return { program: null, errors: parseShaderLog(gl.getProgramInfoLog(prog) ?? "erro de link") };
  }
  return { program: prog, errors: [] };
}

/** Triângulo que cobre a tela inteira. */
const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

/**
 * Renderiza UM frame com iTime fixo num canvas fora da tela e devolve PPM P3
 * (mesmo formato dos desafios stdio, então a saída aparece como imagem).
 * Retorna null se o shader não compilar (erros vão em `errors`).
 */
export function renderShaderPpm(source: string, time: number, size = 128): { ppm: string; errors: ShaderError[] } | { ppm: null; errors: ShaderError[] } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
  if (!gl) return { ppm: null, errors: [{ line: null, message: "Seu navegador não suporta WebGL2." }] };
  const { program, errors } = buildShaderProgram(gl, source);
  if (!program) return { ppm: null, errors };

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);
  gl.uniform3f(gl.getUniformLocation(program, "iResolution"), size, size, 1);
  gl.uniform1f(gl.getUniformLocation(program, "iTime"), time);
  gl.uniform4f(gl.getUniformLocation(program, "iMouse"), 0, 0, 0, 0);
  gl.viewport(0, 0, size, size);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  const px = new Uint8Array(size * size * 4);
  gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.deleteProgram(program);
  gl.deleteBuffer(buf);

  // readPixels entrega de baixo para cima; PPM é de cima para baixo.
  const lines: string[] = [`P3`, `${size} ${size}`, `255`];
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      lines.push(`${px[i]} ${px[i + 1]} ${px[i + 2]}`);
    }
  }
  return { ppm: lines.join("\n") + "\n", errors: [] };
}

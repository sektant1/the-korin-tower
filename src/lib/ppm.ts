// Parser de PPM P3 (ASCII). P6 é binário e não sobrevive ao transporte como
// texto UTF-8 (runner -> JSON -> browser), então desafios devem usar P3.
export interface PpmImage {
  width: number;
  height: number;
  maxval: number;
  data: Uint8ClampedArray; // RGB, normalizado para 0..255
}

export function looksLikePpm(text: string): boolean {
  return /^\s*P3\s/.test(text);
}

export function parsePpm(text: string): PpmImage {
  // Remove comentários (# até o fim da linha) e quebra em tokens.
  const tokens = text.replace(/#[^\n]*/g, " ").trim().split(/\s+/);
  if (tokens[0] !== "P3") throw new Error("não é PPM P3 (cabeçalho deve começar com P3)");
  const width = Number(tokens[1]);
  const height = Number(tokens[2]);
  const maxval = Number(tokens[3]);
  if (![width, height, maxval].every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error("cabeçalho PPM inválido: esperado 'P3 <largura> <altura> <maxval>'");
  }
  if (width * height > 4096 * 4096) throw new Error("imagem grande demais");
  const expected = width * height * 3;
  const values = tokens.slice(4);
  if (values.length < expected) {
    throw new Error(`PPM incompleto: ${values.length} de ${expected} valores`);
  }
  const data = new Uint8ClampedArray(expected);
  for (let i = 0; i < expected; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) throw new Error(`valor inválido no pixel ${Math.floor(i / 3)}: '${values[i]}'`);
    data[i] = Math.round((v / maxval) * 255);
  }
  return { width, height, maxval, data };
}

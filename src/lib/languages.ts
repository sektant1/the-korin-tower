// Fonte única das linguagens. Usada pelo loader, pelo runner e pelo editor.
export const LANGUAGES = {
  c: { label: "C", ext: "c", file: "main.c", piston: "c" },
  cpp: { label: "C++", ext: "cpp", file: "main.cpp", piston: "c++" },
  rust: { label: "Rust", ext: "rs", file: "main.rs", piston: "rust" },
  go: { label: "Go", ext: "go", file: "main.go", piston: "go" },
  zig: { label: "Zig", ext: "zig", file: "main.zig", piston: "zig" },
  nasm: { label: "Assembly x86-64 (NASM)", ext: "asm", file: "main.asm", piston: "nasm64" },
  // Fase 4. D e Fortran vêm no pacote gcc do Piston; Pascal é o pacote "pascal" (fpc).
  d: { label: "D", ext: "d", file: "main.d", piston: "d" },
  pascal: { label: "Pascal", ext: "pas", file: "main.pas", piston: "pascal" },
  fortran: { label: "Fortran", ext: "f90", file: "main.f90", piston: "fortran" },
  // GLSL roda no navegador (WebGL2), nunca no runner.
  glsl: { label: "GLSL", ext: "frag", file: "shader.frag", piston: null },
} as const;

export type LanguageId = keyof typeof LANGUAGES;

export function isLanguageId(x: unknown): x is LanguageId {
  return typeof x === "string" && Object.hasOwn(LANGUAGES, x);
}

// stdio: compila no servidor e passa por testes. shader: GLSL no navegador.
// canvas (Fase 4): C/C++ com raylib ou SDL2, compilado para WASM e rodando num <canvas>.
export type ChallengeKind = "stdio" | "shader" | "canvas";
export const CHALLENGE_KINDS: readonly ChallengeKind[] = ["stdio", "shader", "canvas"];

/** Linguagens que o construtor WASM (emcc) aceita. */
export type CanvasLanguage = "c" | "cpp";
export function isCanvasLanguage(x: unknown): x is CanvasLanguage {
  return x === "c" || x === "cpp";
}

export type Checker =
  | { type: "exact" }
  | { type: "ppm"; tolerance: number; maxBadRatio: number };

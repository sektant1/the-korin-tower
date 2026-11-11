// Fonte única das linguagens. Usada pelo loader, pelo runner e pelo editor.
// A torre é sobre C, C++ e Rust (mais GLSL nos shaders e C/C++ no canvas).
export const LANGUAGES = {
  c: { label: "C", ext: "c", file: "main.c", piston: "c" },
  cpp: { label: "C++", ext: "cpp", file: "main.cpp", piston: "c++" },
  rust: { label: "Rust", ext: "rs", file: "main.rs", piston: "rust" },
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

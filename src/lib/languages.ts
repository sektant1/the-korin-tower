// Fonte única das linguagens. Usada pelo loader, pelo runner e pelo editor.
export const LANGUAGES = {
  c: { label: "C", ext: "c", file: "main.c", piston: "c" },
  cpp: { label: "C++", ext: "cpp", file: "main.cpp", piston: "c++" },
  rust: { label: "Rust", ext: "rs", file: "main.rs", piston: "rust" },
  go: { label: "Go", ext: "go", file: "main.go", piston: "go" },
  zig: { label: "Zig", ext: "zig", file: "main.zig", piston: "zig" },
  nasm: { label: "Assembly x86-64 (NASM)", ext: "asm", file: "main.asm", piston: "nasm64" },
  // GLSL roda no navegador (WebGL2), nunca no runner.
  glsl: { label: "GLSL", ext: "frag", file: "shader.frag", piston: null },
} as const;

export type LanguageId = keyof typeof LANGUAGES;

export function isLanguageId(x: unknown): x is LanguageId {
  return typeof x === "string" && Object.hasOwn(LANGUAGES, x);
}

export type ChallengeKind = "stdio" | "shader";

export type Checker =
  | { type: "exact" }
  | { type: "ppm"; tolerance: number; maxBadRatio: number };

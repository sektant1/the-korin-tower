// Fonte única das linguagens. Usada pelo loader, pelo motor de execução e pelo editor.
// `file`: nome do arquivo nas mensagens de erro (vira link clicável no painel).
export const LANGUAGES = {
  c: { label: "C", ext: "c", file: "main.c" },
  cpp: { label: "C++", ext: "cpp", file: "main.cpp" },
  rust: { label: "Rust", ext: "rs", file: "main.rs" },
  python: { label: "Python", ext: "py", file: "main.py" },
} as const;

export type LanguageId = keyof typeof LANGUAGES;

export const LANGUAGE_IDS = Object.keys(LANGUAGES) as LanguageId[];

/** "C / C++ / Rust / Python": sempre na ordem de LANGUAGES, não na ordem do README. */
export function languageList(langs: readonly LanguageId[]): string {
  return [...langs].sort((a, b) => LANGUAGE_IDS.indexOf(a) - LANGUAGE_IDS.indexOf(b)).map((l) => LANGUAGES[l].label).join(" / ");
}

export function isLanguageId(x: unknown): x is LanguageId {
  return typeof x === "string" && Object.hasOwn(LANGUAGES, x);
}

/** Linguagens que aceitam flags de compilação do usuário (Opções → flags). */
export function acceptsFlags(l: LanguageId): l is "c" | "cpp" {
  return l === "c" || l === "cpp";
}

// Todo desafio é stdio: lê stdin e escreve stdout, julgado por testes de entrada/saída
// e, opcionalmente, por testes unitários (um harness com asserts anexado ao código).
// A coluna `kind` do banco continua existindo para quando outro tipo voltar.
export type ChallengeKind = "stdio";
export const CHALLENGE_KINDS: readonly ChallengeKind[] = ["stdio"];

export type Checker =
  | { type: "exact" }
  | { type: "ppm"; tolerance: number; maxBadRatio: number };

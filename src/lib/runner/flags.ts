// Flags de compilador vêm do usuário: só aceitamos uma lista fechada.
// Sem isso, coisas como `-include /etc/passwd` ou `@arquivo` vazariam
// arquivos do servidor pelas mensagens de erro do compilador.
const ALLOWED = [
  /^-O[0-3sgz]?$/,
  /^-W(all|extra|error|pedantic|shadow|conversion|no-unused-(variable|parameter|function))$/,
  /^-pedantic$/,
  /^-g[0-3]?$/,
  /^-std=(c|gnu)(89|99|11|17|23)$/,
  /^-std=(c|gnu)\+\+(11|14|17|20|23)$/,
  /^-fsanitize=(address|undefined|leak)(,(address|undefined|leak))*$/,
  /^-fno-omit-frame-pointer$/,
  /^-D[A-Za-z_][A-Za-z0-9_]*(=[A-Za-z0-9_]*)?$/,
  /^-lm$/,
];

export function sanitizeFlags(raw: unknown): { flags: string[]; rejected: string[] } {
  if (typeof raw !== "string" || !raw.trim()) return { flags: [], rejected: [] };
  const parts = raw.trim().split(/\s+/).slice(0, 20);
  const flags: string[] = [];
  const rejected: string[] = [];
  for (const p of parts) (ALLOWED.some((r) => r.test(p)) ? flags : rejected).push(p);
  return { flags, rejected };
}

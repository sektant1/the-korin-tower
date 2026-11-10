// Dias do site: "AAAA-MM-DD" no fuso de Brasília. Usado pelo desafio do dia e pelas sequências.
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

export function siteDay(date: Date = new Date()): string {
  return DAY.format(date);
}

/** Dia anterior a um "AAAA-MM-DD" (aritmética em UTC: sem horário de verão no meio). */
export function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface Streak {
  /** dias seguidos até hoje (ou até ontem: o dia de hoje ainda pode ser salvo) */
  current: number;
  best: number;
}

/** Sequências de dias com pelo menos um desafio resolvido. `days` pode ter repetidos e vir fora de ordem. */
export function computeStreak(days: Iterable<string>, today: string): Streak {
  const set = new Set(days);
  let best = 0;
  for (const day of set) {
    if (set.has(previousDay(day))) continue; // só conta a partir do primeiro dia de cada sequência
    let n = 0;
    // Avança dia a dia: o próximo de `d` é o dia cujo anterior é `d`.
    for (let d = new Date(`${day}T00:00:00Z`); set.has(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1)) n++;
    best = Math.max(best, n);
  }
  let current = 0;
  let cursor = set.has(today) ? today : previousDay(today);
  while (set.has(cursor)) {
    current++;
    cursor = previousDay(cursor);
  }
  return { current, best };
}

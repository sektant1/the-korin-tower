// Pontos do Hall of Fame. Calculados uma vez, no momento em que o desafio é resolvido.
//   base = 100 × dificuldade
//   cada dica revelada antes de resolver tira 20% da base (mínimo de 20%)
//   quem desistiu (viu a solução) antes de resolver não pontua
//   resolver o desafio do dia no próprio dia vale 50% a mais (Fase 5)
export const HINT_PENALTY = 0.2;
export const MIN_FACTOR = 0.2;
export const DAILY_BONUS = 0.5;

export function pointsFor(difficulty: number, hintsRevealed: number, gaveUp: boolean, daily = false): number {
  if (gaveUp) return 0;
  const factor = Math.max(MIN_FACTOR, 1 - HINT_PENALTY * Math.max(0, hintsRevealed));
  return Math.round(100 * difficulty * factor * (daily ? 1 + DAILY_BONUS : 1));
}

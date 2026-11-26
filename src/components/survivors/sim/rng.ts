// RNG com seed (mulberry32): a simulação só sorteia por aqui, então a mesma seed e as mesmas
// entradas dão a mesma run (replays, testes headless de balanceamento).
export interface Rng {
  next(): number; // [0, 1)
  range(a: number, b: number): number;
  int(n: number): number; // [0, n)
  pick<T>(xs: readonly T[]): T;
  chance(p: number): boolean;
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + next() * (b - a),
    int: (n) => Math.floor(next() * n),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    chance: (p) => next() < p,
  };
}

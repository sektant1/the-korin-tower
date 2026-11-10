import "server-only";

// Em memória, por processo. Suficiente para uma VPS com uma instância.
// /api/run usa o id do usuário logado; login e anônimos usam o IP.

const hits = new Map<string, number[]>();

export function rateLimit(key: string, perMinute: number): { ok: true } | { ok: false; retryAfterS: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) {
    hits.set(key, recent);
    return { ok: false, retryAfterS: Math.ceil((60_000 - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  }
  return { ok: true };
}

/** Limita quantas execuções rodam ao mesmo tempo no servidor. */
export class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

/** Atenção: x-forwarded-for só é confiável atrás de um proxy reverso que o sobrescreve. */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}

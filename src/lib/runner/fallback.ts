import type { BatchRequest, BatchResult, Runner } from "./types";

/**
 * Tenta o runner principal; se ele estiver fora do ar (erro de rede, 401 de
 * whitelist, 5xx), roda no reserva e registra no log. Erros de compilação do
 * código do usuário não são "fora do ar": o principal devolve normalmente.
 *
 * Caso de uso: Vercel com RUNNER=piston apontando para um Piston que sumiu
 * (a API pública virou whitelist em 2026) cai para o Compiler Explorer em vez
 * de responder "runner indisponível".
 */
export class FallbackRunner implements Runner {
  readonly name: string;

  constructor(
    private readonly primary: Runner,
    private readonly reserve: Runner,
  ) {
    this.name = primary.name;
  }

  async runBatch(req: BatchRequest): Promise<BatchResult> {
    try {
      return await this.primary.runBatch(req);
    } catch (e) {
      console.warn(`[runner] ${this.primary.name} indisponível (${(e as Error).message}); usando ${this.reserve.name}`);
      const r = await this.reserve.runBatch(req);
      return r; // qual runner respondeu é detalhe de infra: fica no log, não na tela do jogador
    }
  }
}

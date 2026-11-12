// SHA-256 da saída esperada (normalizada como o checker exact faz). Os testes
// ocultos vão para o navegador só com a entrada e esse hash: o jogador roda
// tudo localmente sem ver a resposta. Web Crypto existe no navegador e no Node.
import { normalizeOutput } from "./checker";

export async function outputSha256(output: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeOutput(output)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

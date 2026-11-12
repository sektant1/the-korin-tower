// Quem confere o :submit dos desafios stdio em C/C++.
//
//   "client" (padrão): o navegador compila e roda TODOS os testes, inclusive os
//     ocultos (que chegam só com o hash da resposta), e o servidor apenas
//     registra o resultado. Nada é compilado nem executado no servidor; dá
//     para hospedar no plano grátis. Custo: quem quiser trapacear consegue
//     forjar o envio.
//   "server": o navegador ainda compila e roda os públicos, mas manda o .wasm e
//     o servidor executa os ocultos (worker_threads do Node). Ocultos não saem
//     do servidor. Ative com NEXT_PUBLIC_SUBMIT_VERIFY=server (vale
//     no build: o cliente lê a mesma variável).
export type SubmitVerify = "client" | "server";

export function submitVerify(): SubmitVerify {
  return process.env.NEXT_PUBLIC_SUBMIT_VERIFY === "server" ? "server" : "client";
}

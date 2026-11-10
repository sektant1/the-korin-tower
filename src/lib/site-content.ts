// Conteúdo "editorial" do portal. Edite à vontade.

/** Mural de novidades da home (mais recente primeiro). */
export const NEWS: { date: string; text: string }[] = [
  { date: "10/11/2026", text: "A torre está no ar! 5 desafios, editor Vim e compilador de verdade." },
  { date: "10/11/2026", text: "Junte as 7 Esferas do Dragão resolvendo desafios. Dizem que um dragão aparece..." },
  { date: "10/11/2026", text: "Em construção: login, ranking (Torneio de Artes Marciais) e guestbook." },
];

/** "Você sabia?": um por visita, sorteado no servidor. */
export const FACTS: string[] = [
  "C nasceu no Bell Labs no começo dos anos 70, para reescrever o Unix.",
  "`malloc` quase nunca pede memória ao sistema a cada chamada: ele reaproveita blocos e só às vezes chama `brk`/`mmap`.",
  "O CHIP-8 tem só 35 instruções. É o emulador perfeito para começar.",
  "Em x86-64, `xor eax, eax` é o jeito mais curto de zerar um registrador, e ainda zera os 32 bits de cima de `rax`.",
  "Um ray tracer simples cabe em menos de 100 linhas de C. O de Andrew Kensler cabia no verso de um cartão de visita!",
  "No Rust, `Vec<T>` vazio não aloca nada: o ponteiro é `NonNull::dangling()`.",
  "`-fsanitize=address` encontra use-after-free e buffer overflow em tempo de execução, com uma pilha bonitinha.",
  "Shaders rodam a mesma função para cada pixel, em paralelo, sem saber o que os vizinhos estão fazendo.",
  "O Mestre Karin vive no topo da torre há séculos. Seu código legado talvez também.",
];

/** Frases do easter egg (código Konami). */
export const KONAMI_LINES = ["KA...", "ME...", "HA...", "ME...", "HAAAAAA!!!"];

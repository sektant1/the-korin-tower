---
name: code-runner
description: Arquitetura e manutenção do motor de compilação e testes (C, C++, Rust, Python) client-side/híbrido com limite de <5s e custo $0.
---

# Regras do Motor de Execução (The Korin Tower)

Sempre que criar, refatorar ou debugar a execução de código dos desafios, siga estritamente:

1. **Orçamento Zero ($0):** Nunca sugira Docker, AWS Lambda pago, Fly.io ou servidores dedicados. O sistema roda 100% na Vercel (plano gratuito) + Browser do usuário + Supabase.
2. **Latência Máxima (< 5 segundos):**
   - **Python:** Usar Pyodide em Web Worker com preload em background e cache no IndexedDB/Cache API.
   - **C / C++:** Usar toolchain WASM leve em Web Worker com cache local; se exceder 5s de boot, usar fallback via API gratuita (Piston/Wandbox).
   - **Rust:** Usar adaptador via API gratuita rápida (ex: Piston API) para evitar downloads pesados de `rustc.wasm` no cliente.
3. **Isolamento e Segurança:**
   - Todo código client-side roda em um **Web Worker** isolado.
   - Implementar timeout rígido de **5000ms** usando `worker.terminate()` para interromper loops infinitos (`while(1)`).
4. **Escopo Limpo:** Ignorar SDL2, raylib e GLSL. Focar apenas em compilação padrão, `stdin`/`stdout` e asserções unitárias (`assert`).
5. **Pesquisa:** Consultar `context7` e `gh-grep` antes de adicionar qualquer biblioteca WASM ou wrapper de worker.


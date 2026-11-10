import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import type { CanvasLanguage } from "@/lib/languages";

// Fase 4: desafios "canvas" (C/C++ com raylib ou SDL2) viram WASM e rodam no navegador.
// O servidor só COMPILA (com emcc); nunca executa o resultado.
//   WASM_BUILDER_URL  serviço `wasm-builder` do docker-compose (produção)
//   RUNNER=local      sem URL: chama o emcc da sua máquina, só para desenvolver
export interface WasmBuild {
  ok: boolean;
  /** avisos e erros do compilador */
  output: string;
  /** JavaScript com o WASM embutido (só quando ok) */
  js?: string;
}

export class BuilderUnavailable extends Error {}

async function remote(url: string, language: CanvasLanguage, source: string): Promise<WasmBuild> {
  let res: Response;
  try {
    res = await fetch(`${url.replace(/\/$/, "")}/build`, {
      method: "POST",
      // WASM_BUILDER_TOKEN: para um construtor remoto atrás de um proxy que exige token.
      headers: {
        "content-type": "application/json",
        ...(process.env.WASM_BUILDER_TOKEN ? { authorization: `Bearer ${process.env.WASM_BUILDER_TOKEN}` } : {}),
      },
      body: JSON.stringify({ language, source }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    throw new BuilderUnavailable(`construtor WASM não respondeu: ${(e as Error).message}`);
  }
  const body = (await res.json().catch(() => null)) as WasmBuild | null;
  if (!body || typeof body.ok !== "boolean") throw new BuilderUnavailable(`construtor WASM respondeu ${res.status}`);
  if (!res.ok) throw new BuilderUnavailable(body.output || `construtor WASM respondeu ${res.status}`);
  return body;
}

/** Dev sem Docker: mesmo script do container, rodando aqui. Sem sandbox nenhum. */
function local(language: CanvasLanguage, source: string): Promise<WasmBuild> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), "wasm-builder", "build.mjs")], { windowsHide: true });
    const out: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => out.push(c));
    child.stderr.resume();
    child.on("error", (e) => reject(new BuilderUnavailable(`não consegui iniciar o construtor local: ${e.message}`)));
    child.on("close", () => {
      try {
        resolve(JSON.parse(Buffer.concat(out).toString("utf8")) as WasmBuild);
      } catch {
        reject(new BuilderUnavailable("o construtor local não devolveu uma resposta válida"));
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify({ language, source }));
  });
}

export async function buildWasm(language: CanvasLanguage, source: string): Promise<WasmBuild> {
  const url = process.env.WASM_BUILDER_URL;
  if (url) return remote(url, language, source);
  if (process.env.RUNNER === "local" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_UNSAFE_LOCAL_RUNNER === "1")) {
    return local(language, source);
  }
  throw new BuilderUnavailable("construtor WASM não configurado (defina WASM_BUILDER_URL)");
}

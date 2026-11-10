// Compila C/C++ (raylib ou SDL2) para um único arquivo JS com o WASM embutido, usando emcc.
// Sem dependências: roda no container `wasm-builder` (server.mjs) e, em dev, direto na sua
// máquina (o site chama `node wasm-builder/build.mjs` com o pedido em JSON no stdin).
//
//   echo '{"language":"c","source":"int main(){}"}' | node wasm-builder/build.mjs
//
// Variáveis: EMCC (padrão "emcc"), RAYLIB_WEB_DIR (pasta com include/raylib.h e lib/libraylib.a
// compilada com PLATFORM_WEB), BUILD_TIMEOUT_MS (padrão 60000).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_SOURCE = 64 * 1024;
const MAX_LOG = 64 * 1024;
const TIMEOUT_MS = Number(process.env.BUILD_TIMEOUT_MS) || 60_000;
const FILES = { c: "main.c", cpp: "main.cpp" };

/** Argumentos do emcc. A biblioteca é escolhida pelo #include do próprio código. */
export function emccArgs(language, source, raylibDir = process.env.RAYLIB_WEB_DIR) {
  const args = [
    FILES[language],
    "-o",
    "out.js",
    language === "c" ? "-std=c17" : "-std=c++20",
    "-O1",
    "-Wall",
    "-sSINGLE_FILE=1", // o .wasm vai em base64 dentro do .js: um arquivo só para o navegador
    "-sENVIRONMENT=web",
    "-sALLOW_MEMORY_GROWTH=1",
    "-sASYNCIFY", // deixa o `while (!WindowShouldClose())` de sempre funcionar no navegador
    "-sEXIT_RUNTIME=1",
  ];
  if (/#\s*include\s*[<"]SDL/.test(source)) args.push("-sUSE_SDL=2");
  if (/#\s*include\s*[<"](raylib|raymath|rlgl)\.h/.test(source)) {
    if (!raylibDir) throw new Error("raylib não está instalada no construtor (defina RAYLIB_WEB_DIR)");
    args.push(`-I${path.join(raylibDir, "include")}`, `-L${path.join(raylibDir, "lib")}`, "-lraylib", "-sUSE_GLFW=3", "-DPLATFORM_WEB");
  }
  return args;
}

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    // Ambiente mínimo: nada do processo pai (tokens, URLs) chega ao compilador,
    // que pode ser induzido a ler arquivos com #include ou .incbin.
    const env = {};
    for (const k of ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TEMP", "TMP", "EMSDK", "EM_CONFIG", "EM_CACHE", "EMSDK_NODE", "EMSDK_PYTHON"]) {
      if (process.env[k]) env[k] = process.env[k];
    }
    // No Windows o emcc é um .bat: precisa de shell, e o shell recebe uma linha só.
    // Os argumentos são fixos ou caminhos nossos (nada vem do usuário), mas vão entre aspas por via das dúvidas.
    const quote = (a) => (/[\s"&|<>^]/.test(a) ? `"${a.replaceAll('"', '\\"')}"` : a);
    const child =
      process.platform === "win32"
        ? spawn([cmd, ...args].map(quote).join(" "), { cwd, env, windowsHide: true, shell: true })
        : spawn(cmd, args, { cwd, env, windowsHide: true });
    let log = "";
    const collect = (chunk) => {
      if (log.length < MAX_LOG) log += chunk.toString("utf8");
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);
    const done = (code, extra = "") => {
      clearTimeout(timer);
      resolve({ code, log: log.slice(0, MAX_LOG) + extra, timedOut });
    };
    child.on("error", (e) => done(null, `\n[korin] falha ao iniciar '${cmd}': ${e.message}`));
    child.on("close", (code) => done(code));
  });
}

/** @returns {Promise<{ ok: boolean, output: string, js?: string }>} */
export async function build({ language, source }) {
  if (!Object.hasOwn(FILES, language)) return { ok: false, output: "linguagem inválida (use c ou cpp)" };
  if (typeof source !== "string" || !source.trim()) return { ok: false, output: "código vazio" };
  if (source.length > MAX_SOURCE) return { ok: false, output: `código maior que ${MAX_SOURCE / 1024} KB` };

  let args;
  try {
    args = emccArgs(language, source);
  } catch (e) {
    return { ok: false, output: e.message };
  }
  const dir = await mkdtemp(path.join(tmpdir(), "korin-wasm-"));
  try {
    await writeFile(path.join(dir, FILES[language]), source);
    const r = await run(process.env.EMCC || "emcc", args, dir);
    // Caminhos do diretório temporário não interessam a quem lê o erro.
    const output = r.log.replaceAll(dir + path.sep, "").replaceAll(dir, "").trim();
    if (r.timedOut) return { ok: false, output: `${output}\n[korin] compilação passou de ${TIMEOUT_MS / 1000}s e foi interrompida`.trim() };
    const out = path.join(dir, "out.js");
    if (r.code !== 0 || !existsSync(out)) return { ok: false, output: output || `emcc saiu com código ${r.code}` };
    return { ok: true, output, js: await readFile(out, "utf8") };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Modo linha de comando: pedido em JSON no stdin, resposta em JSON no stdout.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let result;
  try {
    result = await build(JSON.parse(input));
  } catch (e) {
    result = { ok: false, output: `pedido inválido: ${e.message}` };
  }
  process.stdout.write(JSON.stringify(result));
}

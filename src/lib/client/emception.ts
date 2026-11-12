"use client";

// Compilação C/C++ no navegador, sem compilador no servidor.
//
// O Emception roda o clang/wasm-ld num Web Worker e baixa a toolchain do
// `manifest.json` versionado (`@gameguild/emception-toolchain`) pelo CDN, com
// cache no IndexedDB. O servidor não vê nem compila o código do jogador: só
// entrega o site. Dois alvos saem daqui:
//
//   - desafios stdio (`compileStdio`): um .wasm WASI puro, que roda num Web
//     Worker (:run, :test) e vai para o servidor no :submit, onde o MESMO
//     executor (src/lib/wasm/wasi-core.mjs) roda os testes ocultos;
//   - desafios canvas (`compileCanvas`/`startCanvas`): raylib, SDL2 ou SDL3
//     com o runtime Emscripten do Emception, desenhando num <canvas>.
//
// Requisitos do navegador: SharedArrayBuffer, que exige a página em
// cross-origin isolation (COOP/COEP, configurados em next.config.ts).

import { ToolchainPreset } from "emception";
import type {
  BrowserEmceptionAPI,
  CanvasArtifact,
  CanvasBuildResult,
  CanvasSession,
  CanvasToolchain,
} from "@gameguild/emception-browser";
import type { CanvasLanguage } from "@/lib/languages";
import { ENV_IMPORTS } from "@/lib/wasm/wasi-core.mjs";

const CWD = "/home/user";
const OBJECT_PATH = "/tmp/korin-canvas.o";
const WASM_PATH = "/home/user/korin-canvas.wasm";
const STDIO_OBJECT = "/tmp/korin-stdio.o";
const STDIO_WASM = `${CWD}/korin-stdio.wasm`;
/** Biblioteca padrão do Emscripten compilada para wasm32 (libc, libc++, dlmalloc...). */
const SYSLIB = "/usr/lib/emscripten/cache-lib/wasm32-emscripten";
/** Pilha do programa do jogador: 8 MB, como o padrão do Linux (o wasm-ld dá só 64 KB). */
const STACK_BYTES = 8 * 1024 * 1024;
/** Um passo do clang/wasm-ld que passa disso travou (já vimos o lld morrer em silêncio). */
const TOOL_TIMEOUT_MS = 180_000;
/**
 * A toolchain parada segura centenas de MB (LLVM + VFS) no worker. Depois disso
 * sem compilar, o worker é encerrado; a próxima compilação sobe outro com os
 * bundles já no cache do navegador (segundos, não o download inteiro).
 */
const IDLE_DISPOSE_MS = 5 * 60_000;
/** Juízes costumam compilar com -O2; o preset do Emception usa -O1. */
const STDIO_OPT = "-O2";

export type CanvasCompilePhase = "loading" | "compiling" | "linking";
export type StdioLanguage = "c" | "cpp";

export interface CanvasCompileOptions {
  language: CanvasLanguage;
  source: string;
  onPhase?: (phase: CanvasCompilePhase) => void;
}

export interface CanvasCompileResult {
  ok: boolean;
  output: string;
  artifact?: CanvasArtifact;
}

export interface CanvasRunOptions {
  onStdout?: (text: string) => void;
  onStderr?: (text: string) => void;
}

export interface StdioCompileOptions {
  language: StdioLanguage;
  source: string;
  /** flags já validadas por `sanitizeFlags` (as que o cc1 não entende viram aviso) */
  flags?: string[];
  /** vira o `--max-memory` do binário; o servidor confere no :submit */
  memoryLimitMb: number;
  onPhase?: (phase: CanvasCompilePhase) => void;
}

export interface StdioCompileResult {
  ok: boolean;
  /** diagnósticos do clang e do wasm-ld (vazio quando não há avisos) */
  output: string;
  warnings: string[];
  wasm?: Uint8Array;
}

type EmceptionModule = typeof import("@gameguild/emception-browser");

let emceptionPromise: Promise<BrowserEmceptionAPI> | null = null;
let modulePromise: Promise<EmceptionModule> | null = null;

/** URL do manifest da toolchain. Sem a variável, usa o padrão versionado do pacote (jsDelivr). */
function manifestUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_EMCEPTION_MANIFEST_URL || undefined;
}

function crossOriginIsolated(): boolean {
  const value = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;
  return value === undefined ? true : value;
}

/** Diagnóstico para a UI: sem SharedArrayBuffer o worker do Emception não inicia. */
export function browserWasmProblem(): string | null {
  if (typeof window === "undefined") return "a compilação WASM só roda no navegador";
  if (typeof SharedArrayBuffer === "undefined") {
    return "este navegador não expõe SharedArrayBuffer; tente Chrome, Edge ou Firefox atualizado";
  }
  if (!crossOriginIsolated()) {
    return "a página não está cross-origin isolated (COOP/COEP); o compilador no navegador não consegue iniciar";
  }
  return null;
}

async function loadModule(): Promise<EmceptionModule> {
  modulePromise ??= import("@gameguild/emception-browser").catch((e: unknown) => {
    modulePromise = null;
    throw e;
  });
  return modulePromise;
}

let idleTimer: ReturnType<typeof setTimeout> | undefined;
let busyCount = 0;

/** Marca uso da toolchain: enquanto houver compilação em curso, nada de descartar. */
async function withToolchain<T>(fn: (em: BrowserEmceptionAPI) => Promise<T>): Promise<T> {
  busyCount++;
  clearTimeout(idleTimer);
  try {
    return await fn(await getEmception());
  } finally {
    if (--busyCount === 0) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(disposeEmception, IDLE_DISPOSE_MS);
    }
  }
}

/**
 * Começa a baixar/subir a toolchain sem esperar (ex.: na 1ª tecla no editor de
 * C/C++), para o :run não pagar o boot inteiro. Silencioso se não der.
 */
export function prewarmEmception(language?: string): void {
  if (browserWasmProblem()) return;
  const stdio = language === "c" || language === "cpp" ? language : null;
  if (emceptionPromise && (!stdio || prewarmed.has(stdio))) return;
  if (stdio) prewarmed.add(stdio);
  // Além de subir a toolchain, deixa pronto o runtime do link (o 1º acesso baixa
  // e extrai o bundle cache-misc, ~2 s) enquanto o jogador ainda está digitando.
  void withToolchain(async (em) => {
    if (stdio) await stageArchive(em, runtimeLib(stdio));
  }).catch(() => {});
}
const prewarmed = new Set<string>();

/** Uma única toolchain por aba: o primeiro boot baixa o manifest e os bundles. */
export async function getEmception(): Promise<BrowserEmceptionAPI> {
  const problem = browserWasmProblem();
  if (problem) throw new Error(problem);
  emceptionPromise ??= loadModule()
    .then(({ createEmception }) =>
      createEmception({
        tty: "none",
        manifestUrl: manifestUrl(),
      }),
    )
    .catch((e: unknown) => {
      emceptionPromise = null;
      throw e;
    });
  return emceptionPromise;
}

/** Encerra o worker e libera a memória da toolchain (`force`: mesmo no meio de uma compilação travada). */
export function disposeEmception(force = false): void {
  clearTimeout(idleTimer);
  if (busyCount > 0 && !force) return; // compilando: o timer de ocioso volta a correr no fim
  prewarmed.clear();
  const pending = emceptionPromise;
  emceptionPromise = null;
  modulePromise = null;
  if (pending) void pending.then((em) => em.dispose()).catch(() => {});
}

type ToolResult = Awaited<ReturnType<BrowserEmceptionAPI["run"]>>;

/**
 * Roda uma ferramenta com teto de tempo. Se o processo WASM travar (o kernel do
 * Emception só avisa no console), descartamos a toolchain inteira: a próxima
 * compilação sobe um worker novo, com os bundles já no cache do navegador.
 */
async function runTool(emception: BrowserEmceptionAPI, tool: string, argv: string[], opts: Parameters<BrowserEmceptionAPI["run"]>[2]): Promise<ToolResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      disposeEmception(true);
      reject(new Error(`${tool} travou (mais de ${TOOL_TIMEOUT_MS / 1000} s); tente de novo`));
    }, TOOL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([emception.run(tool, argv, opts), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Diagnósticos sem o caminho do VFS, para o painel linkar `main.c:12:5`. */
function tidy(text: string): string {
  return text.replaceAll(`${CWD}/`, "").trim();
}

function outputOf(...results: (ToolResult | undefined)[]): string {
  return results
    .flatMap((r) => (r ? [r.stdout, r.stderr] : []))
    .map(tidy)
    .filter(Boolean)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// stdio: C/C++ -> WASI
// ---------------------------------------------------------------------------

/**
 * O preset do Emception chama o `clang -cc1` direto (sem driver), então nem toda
 * flag de linha de comando existe lá. Aplica as que fazem sentido e explica as outras.
 */
export function cc1Flags(base: string[], flags: string[]): { argv: string[]; warnings: string[] } {
  const argv = [...base];
  const warnings: string[] = [];
  const replace = (test: (a: string) => boolean, value: string) => {
    const at = argv.findIndex(test);
    if (at === -1) argv.push(value);
    else argv[at] = value;
  };
  for (const f of flags) {
    if (/^-O[0-3sz]$/.test(f)) replace((a) => /^-O/.test(a), f);
    else if (f === "-O" || f === "-Og") replace((a) => /^-O/.test(a), "-O1");
    else if (f.startsWith("-std=")) replace((a) => a.startsWith("-std="), f);
    else if (/^-(W|D|pedantic)/.test(f)) argv.push(f);
    else if (f === "-lm") continue; // libm já vem dentro da libc do Emscripten
    else warnings.push(`${f}: sem efeito no compilador do navegador`);
  }
  return { argv, warnings };
}

/**
 * Algumas bibliotecas (o runtime WASI puro, a SDL2) moram no bundle
 * `cache-misc`, que o Emception não pré-aquece para o wasm-ld. Com `-lnome` o
 * lld espera um arquivo que nunca chega (trava em silêncio); com o caminho
 * completo do .a na linha de comando, o Emception o pré-aquece antes do link.
 * Aqui lemos o .a uma vez (baixa e extrai o bundle, ~2 s) para que esse
 * pré-aquecimento saia do cache em memória (scripts/patch-emception.mjs).
 * Não copiamos para o workspace: lá a leitura passa pelo IndexedDB e chegou a
 * levar 8 s por link.
 */
const staged = new WeakMap<BrowserEmceptionAPI, Map<string, Promise<string>>>();

function stageArchive(emception: BrowserEmceptionAPI, name: string): Promise<string> {
  let byName = staged.get(emception);
  if (!byName) staged.set(emception, (byName = new Map()));
  let ready = byName.get(name);
  if (!ready) {
    const path = `${SYSLIB}/${name}`;
    ready = (async () => {
      const lib = await emception.workspace.readFile(path);
      if (!lib?.length) throw new Error(`${name} não veio da toolchain`);
      return path;
    })();
    ready.catch(() => byName.delete(name));
    byName.set(name, ready);
  }
  return ready;
}

/**
 * `<bits/stdc++.h>` é do GCC; a libc++ não tem. Muita gente de maratona usa,
 * então damos um equivalente (sem <thread>/<mutex>: a libc++ daqui não tem threads).
 */
const SHIM_INCLUDE = `${CWD}/.korin/include`;
const STDCXX_HEADERS = (
  "cassert cctype cerrno cfloat climits clocale cmath csetjmp csignal cstdarg cstddef cstdint cstdio cstdlib cstring ctime cwchar cwctype " +
  "algorithm any array bitset charconv chrono complex deque exception functional initializer_list iomanip ios iosfwd iostream istream iterator " +
  "limits list map memory numeric optional ostream queue random ratio set sstream stack stdexcept string string_view tuple type_traits typeindex " +
  "typeinfo unordered_map unordered_set utility valarray variant vector bit numbers span"
).split(" ");
const shimReady = new WeakMap<BrowserEmceptionAPI, Promise<void>>();

const STDCXX_BODY = `// equivalente ao <bits/stdc++.h> do GCC (Korin Tower)\n#pragma once\n${STDCXX_HEADERS.map((h) => `#include <${h}>`).join("\n")}\n`;

function ensureShims(emception: BrowserEmceptionAPI): Promise<void> {
  let ready = shimReady.get(emception);
  if (!ready) {
    ready = emception.workspace.writeFile(`${SHIM_INCLUDE}/bits/stdc++.h`, STDCXX_BODY);
    ready.catch(() => shimReady.delete(emception));
    shimReady.set(emception, ready);
  }
  return ready;
}

/** Runtime WASI puro; o C++ usa a variante com catch (exceções nativas do wasm). */
const runtimeLib = (language: StdioLanguage) => (language === "cpp" ? "libstandalonewasm-memgrow-pure.a" : "libstandalonewasm-nocatch-memgrow-pure.a");
const runtimePath = (language: StdioLanguage) => `${SYSLIB}/${runtimeLib(language)}`;
/**
 * Exceções C++ nativas do WebAssembly (o que o -fwasm-exceptions do driver passaria ao cc1),
 * no formato "legacy" (try/catch): roda em todo navegador atual e no Node 22, e casa com
 * as bibliotecas `-legacyexcept` da toolchain.
 */
const WASM_EH_CC1 = ["-exception-model=wasm", "-target-feature", "+exception-handling", "-mllvm", "-wasm-enable-eh", "-mllvm", "-wasm-use-legacy-eh=1"];

/** Linha do wasm-ld para um programa WASI puro, com crt1 (que dá flush no exit) e teto de memória. */
export function stdioLinkArgv(language: StdioLanguage, objectPath: string, wasmPath: string, memoryLimitMb: number): string[] {
  const maxMemory = Math.max(memoryLimitMb, 16) * 1024 * 1024;
  return [
    "wasm-ld",
    objectPath,
    "-o",
    wasmPath,
    `-L${SYSLIB}`,
    `${SYSLIB}/crt1.o`,
    "-z",
    `stack-size=${STACK_BYTES}`,
    `--max-memory=${maxMemory}`,
    // Funções que a libc espera do JS (fuso, localtime, relógio) viram imports de `env`,
    // implementados em wasi-core.mjs; compileStdio recusa qualquer outro import.
    "--allow-undefined",
    // A libc standalone do Emscripten não esvazia o stdio no exit (quem faz isso é o glue JS);
    // o executor chama fflush(NULL) no fim, senão a última linha sem \n some.
    "--export=fflush",
    // Sem a seção de nomes/debug: o binário que sobe no :submit fica bem menor.
    "--strip-all",
    ...(language === "cpp" ? ["-lc++-legacyexcept", "-lc++abi-legacyexcept", "-lunwind-legacyexcept"] : []),
    "-lc",
    "-ldlmalloc",
    "-lcompiler_rt",
    // memgrow: malloc cresce a memória até o --max-memory; pure: só imports WASI, nada de JS do Emscripten.
    runtimePath(language),
  ];
}

/** Compila C/C++ para um .wasm WASI puro (ou devolve o erro do clang/wasm-ld). */
export async function compileStdio(opts: StdioCompileOptions): Promise<StdioCompileResult> {
  const problem = browserWasmProblem();
  if (problem) return { ok: false, output: problem, warnings: [] };
  return withToolchain(() => compileStdioNow(opts));
}

async function compileStdioNow(opts: StdioCompileOptions): Promise<StdioCompileResult> {
  opts.onPhase?.("loading");
  const [emception, { TOOLCHAIN_PRESETS }] = await Promise.all([getEmception(), loadModule()]);
  const preset = TOOLCHAIN_PRESETS[opts.language === "cpp" ? ToolchainPreset.CPP : ToolchainPreset.C];
  if (!("compileArgv" in preset)) throw new Error("preset nativo indisponível na toolchain");

  const src = opts.language === "cpp" ? `${CWD}/main.cpp` : `${CWD}/main.c`;
  await emception.workspace.writeFile(src, opts.source);
  // Sem apagar o .o/.wasm da vez anterior: o clang e o wasm-ld sobrescrevem, e só
  // lemos a saída depois de conferir o exit code (cada apagar é mais uma ida ao IndexedDB).

  opts.onPhase?.("compiling");
  let base = preset.compileArgv({ sourcePath: src, objectPath: STDIO_OBJECT }).map((a) => (/^-O/.test(a) ? STDIO_OPT : a));
  if (opts.language === "cpp") {
    await ensureShims(emception);
    base = insertInclude(base, SHIM_INCLUDE);
    base = [base[0], base[1], ...WASM_EH_CC1, ...base.slice(2)]; // base[1] é o -cc1
  }
  const { argv, warnings } = cc1Flags(base, opts.flags ?? []);
  const compile = await runTool(emception, preset.compileTool, argv, { cwd: CWD });
  if (compile.exitCode !== 0) return { ok: false, output: outputOf(compile) || "o clang falhou sem mensagem", warnings };

  opts.onPhase?.("linking");
  await stageArchive(emception, runtimeLib(opts.language));
  const link = await runTool(emception, "wasm-ld", stdioLinkArgv(opts.language, STDIO_OBJECT, STDIO_WASM, opts.memoryLimitMb), { cwd: CWD });
  if (link.exitCode !== 0) return { ok: false, output: outputOf(compile, link) || "o wasm-ld falhou sem mensagem", warnings };

  const wasm = await emception.workspace.readFile(STDIO_WASM);
  if (!wasm) return { ok: false, output: "o wasm-ld não produziu o arquivo .wasm", warnings };
  // Com --allow-undefined, um símbolo que ninguém define (typo, função só declarada)
  // vira import: devolve como o erro de link que ele seria.
  const missing = WebAssembly.Module.imports(await WebAssembly.compile(wasm.slice()))
    .filter((i) => i.module !== "wasi_snapshot_preview1" && !(i.module === "env" && ENV_IMPORTS.includes(i.name)))
    .map((i) => `wasm-ld: error: undefined symbol: ${i.name}`);
  if (missing.length) return { ok: false, output: [outputOf(compile, link), ...missing].filter(Boolean).join("\n"), warnings };
  return { ok: true, output: outputOf(compile, link), warnings, wasm };
}

// ---------------------------------------------------------------------------
// canvas: raylib / SDL2 / SDL3
// ---------------------------------------------------------------------------

function sourcePath(language: CanvasLanguage): string {
  return language === "cpp" ? `${CWD}/main.cpp` : `${CWD}/main.c`;
}

function isRaylib(source: string): boolean {
  return /#\s*include\s*[<"](raylib|raymath|rlgl)\.h/.test(source);
}

function isSDL2(source: string): boolean {
  return /#\s*include\s*[<"](SDL2\/)?SDL\.h/.test(source) && !/#\s*include\s*[<"]SDL3\//.test(source);
}

function isSDL3(source: string): boolean {
  return /#\s*include\s*[<"]SDL3\//.test(source);
}

function toolchainFor(language: CanvasLanguage, source: string): ToolchainPreset | null {
  if (isRaylib(source)) {
    return language === "cpp" ? ToolchainPreset.Raylib_CPP : ToolchainPreset.Raylib_C;
  }
  if (isSDL3(source)) {
    return language === "cpp" ? ToolchainPreset.SDL_CPP : ToolchainPreset.SDL_C;
  }
  return null;
}

function canvasOutput(result: CanvasBuildResult | { compile?: ToolResult; link?: ToolResult }): string {
  const compile = "compile" in result ? result.compile : undefined;
  const link = "link" in result ? result.link : undefined;
  return outputOf(compile, link);
}

function insertInclude(argv: string[], include: string): string[] {
  // Depois dos includes padrão e antes do -std; a ordem só precisa manter o
  // include da SDL2 antes de qualquer cabeçalho de mesmo nome.
  const at = argv.findIndex((arg) => arg.startsWith("-std="));
  return at === -1 ? [...argv, "-internal-isystem", include] : [...argv.slice(0, at), "-internal-isystem", include, ...argv.slice(at)];
}

/**
 * A toolchain do Emception tem presets prontos para raylib e SDL3. A SDL2 dos
 * desafios antigos usa os mesmos cabeçalhos/biblioteca que o preset Allegro
 * carrega (libSDL2.a + runtime Emscripten), então montamos a linha do clang e
 * do wasm-ld com esses artefatos e reaproveitamos o runtime do Allegro.
 */
async function buildSDL2(
  emception: BrowserEmceptionAPI,
  language: CanvasLanguage,
  source: string,
  onPhase?: (phase: CanvasCompilePhase) => void,
): Promise<CanvasBuildResult> {
  const { TOOLCHAIN_PRESETS } = await loadModule();
  const native = TOOLCHAIN_PRESETS[language === "cpp" ? ToolchainPreset.CPP : ToolchainPreset.C];
  const canvas = TOOLCHAIN_PRESETS[ToolchainPreset.Allegro_C];
  if (!("compileArgv" in native) || !("linkArgv" in canvas)) {
    throw new Error("preset nativo indisponível na toolchain");
  }

  const src = sourcePath(language);
  const paths = { sourcePath: src, objectPath: OBJECT_PATH, wasmPath: WASM_PATH };
  await emception.workspace.writeFile(src, source);

  const runOptions = {
    cwd: CWD,
    preloadBundles: ["llvm", "usr-include", "cache-misc", "emscripten-core"],
  };
  const compile = await runTool(emception, native.compileTool, insertInclude(native.compileArgv(paths), "/usr/include/SDL2"), runOptions);
  if (compile.exitCode !== 0) return { phase: "compile", compile };

  onPhase?.("linking");
  const sdl2 = await stageArchive(emception, "libSDL2.a");
  const link = await runTool(
    emception,
    canvas.linkTool,
    canvas
      .linkArgv(paths)
      .filter((arg) => !arg.includes("liballegro"))
      .map((arg) => (arg === "/usr/lib/libSDL2.a" ? sdl2 : arg)),
    runOptions,
  );
  if (link.exitCode !== 0) return { phase: "link", compile, link };

  const runtimePath = "/usr/lib/emscripten/allegro-runtime.mjs";
  const [runtimeGlue, wasm] = await Promise.all([
    emception.workspace.readFile(runtimePath),
    emception.workspace.readFile(WASM_PATH),
  ]);
  if (!runtimeGlue) throw new Error(`runtime da SDL2 ausente na toolchain: ${runtimePath}`);
  if (!wasm) throw new Error("o wasm-ld não produziu o arquivo .wasm");

  return {
    phase: "ready",
    compile,
    link,
    runtimeProfile: "allegro-runtime",
    runtimePath,
    wasmPath: WASM_PATH,
    runtimeGlue,
    wasm,
  };
}

/** Compila o fonte para um artefato WASM (ou devolve o erro do clang/wasm-ld). */
export async function compileCanvas(opts: CanvasCompileOptions): Promise<CanvasCompileResult> {
  const problem = browserWasmProblem();
  if (problem) return { ok: false, output: problem };
  return withToolchain(() => compileCanvasNow(opts));
}

async function compileCanvasNow(opts: CanvasCompileOptions): Promise<CanvasCompileResult> {
  opts.onPhase?.("loading");
  const emception = await getEmception();
  const src = sourcePath(opts.language);
  await emception.workspace.writeFile(src, opts.source);

  opts.onPhase?.("compiling");
  const toolchain = toolchainFor(opts.language, opts.source);
  const result = toolchain
    ? await emception.canvas.build({
        toolchain: toolchain as CanvasToolchain,
        sourcePath: src,
        cwd: CWD,
        objectPath: OBJECT_PATH,
        wasmPath: WASM_PATH,
      })
    : isSDL2(opts.source)
      ? await buildSDL2(emception, opts.language, opts.source, opts.onPhase)
      : null;

  if (!result) {
    return {
      ok: false,
      output: "desafio de canvas precisa incluir raylib.h ou SDL2/SDL.h (SDL3 também funciona)",
    };
  }

  if (result.phase !== "ready") {
    return { ok: false, output: canvasOutput(result) || `falha na fase de ${result.phase}` };
  }

  return { ok: true, output: canvasOutput(result), artifact: result };
}

/** Quantas chamadas seguidas de emscripten_sleep toleramos (sem JSPI) antes de concluir que é um laço `while` travando a aba. */
const SLEEP_CALLS_LIMIT = 240;

/** JSPI (WebAssembly JS Promise Integration): Chrome/Edge 137+. */
interface Jspi {
  Suspending: new (fn: (...args: number[]) => Promise<unknown>) => unknown;
  promising: (fn: (...args: number[]) => unknown) => (...args: number[]) => Promise<unknown>;
}
function jspi(): Jspi | null {
  const wa = WebAssembly as unknown as Partial<Jspi>;
  return typeof wa.Suspending === "function" && typeof wa.promising === "function" ? (wa as Jspi) : null;
}

/** Sinal para desenrolar a pilha de um main suspenso quando a sessão para. */
class Stopped extends Error {}

/**
 * O runtime Emscripten do Emception não tem Asyncify, então `emscripten_sleep`
 * (que a raylib chama em `WindowShouldClose()` e o SDL em `SDL_Delay`) não
 * existe no glue. Com JSPI, ele vira um import que SUSPENDE o wasm até o
 * próximo quadro: o laço clássico `while (!WindowShouldClose())` devolve o
 * controle ao navegador a cada volta, sem recompilar nada. Sem JSPI, dormir
 * vira nada e um laço que insiste em dormir é interrompido com uma explicação.
 * Outras funções que faltam viram stubs que devolvem 0 (com aviso).
 */
function withEnvStubs(runtimeGlue: Uint8Array, needed: Set<string>, onStderr?: (text: string) => void) {
  const warned = new Set<string>();
  const api = jspi();
  let stopped = false;
  let sleeps = 0;
  const sleepFallback = () => {
    if (++sleeps > SLEEP_CALLS_LIMIT) {
      sleeps = 0;
      throw new Error("este navegador não suspende WebAssembly (sem JSPI): troque o `while (!WindowShouldClose())` por `emscripten_set_main_loop(quadro, 0, 1)`, ou use Chrome/Edge atualizado");
    }
  };
  const sleepAsync = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (stopped) return reject(new Stopped());
      const wake = () => (stopped ? reject(new Stopped()) : resolve());
      // Quadros curtos seguem o vsync; esperas longas usam o relógio.
      if (ms <= 20) requestAnimationFrame(wake);
      else setTimeout(wake, ms);
    });
  const stub = (name: string) => {
    if (name === "emscripten_sleep") return api ? new api.Suspending(sleepAsync) : sleepFallback;
    return () => {
      if (!warned.has(name)) {
        warned.add(name);
        onStderr?.(`aviso: ${name} não existe no navegador; a chamada devolveu 0\n`);
      }
      return 0;
    };
  };
  const suspendsMain = api !== null && needed.has("emscripten_sleep");

  /** main promising: roda em segundo plano e o glue recebe 'unwind' (o "main loop continua" do Emscripten). */
  const wrapMain = (main: unknown) => {
    if (!suspendsMain || typeof main !== "function") return main;
    const run = api!.promising(main as (...args: number[]) => unknown);
    return (...args: number[]) => {
      run(...args).then(
        (code) => onStderr?.(`programa terminou (código ${Number(code) | 0})\n`),
        (e: unknown) => {
          if (e instanceof Stopped || stopped) return;
          onStderr?.(`erro: ${e instanceof Error ? e.message : String(e)}\n`);
        },
      );
      throw "unwind";
    };
  };

  const url = URL.createObjectURL(new Blob([runtimeGlue.slice()], { type: "application/javascript" }));
  return {
    stop: () => {
      stopped = true;
    },
    deps: {
      importModule: async (moduleUrl: string) => {
        const ns = (await import(/* webpackIgnore: true */ moduleUrl)) as { default?: (config: Record<string, unknown>) => unknown };
        const factory = ns.default;
        if (typeof factory !== "function") return ns;
        const wrapped = (config: Record<string, unknown>) => {
          const instantiate = config.instantiateWasm as ((imports: Record<string, Record<string, unknown>>, receive: (instance: WebAssembly.Instance) => unknown) => unknown) | undefined;
          if (typeof instantiate !== "function") return factory(config);
          return factory({
            ...config,
            instantiateWasm: (imports: Record<string, Record<string, unknown>>, receive: (instance: WebAssembly.Instance) => unknown) => {
              const env = { ...imports.env };
              for (const name of needed) if (!(name in env)) env[name] = stub(name);
              if (suspendsMain) {
                // Com JSPI dormir de verdade funciona: o glue (sem Asyncify) diria o contrário.
                // A SDL2 só chama emscripten_sleep no SDL_Delay se emscripten_has_asyncify() for 1;
                // sem isso ela espera em laço ocupado e trava a aba.
                env.emscripten_sleep = stub("emscripten_sleep");
                if (needed.has("emscripten_has_asyncify")) env.emscripten_has_asyncify = () => 1;
              }
              return instantiate({ ...imports, env }, (instance) => {
                if (!suspendsMain) return receive(instance);
                // exports é congelado (um Proxy não pode mentir sobre ele): cópia com o main trocado.
                const exports: Record<string, unknown> = { ...instance.exports };
                for (const name of ["main", "__main_argc_argv"]) if (name in exports) exports[name] = wrapMain(exports[name]);
                return receive(new Proxy(instance, { get: (t, prop, recv) => (prop === "exports" ? exports : Reflect.get(t, prop, recv)) }));
              });
            },
          });
        };
        return { ...ns, default: wrapped };
      },
      createModuleUrl: () => url,
      revokeModuleUrl: (u: string) => URL.revokeObjectURL(u),
    },
  };
}

/**
 * O runtime do Emscripten (GLFW da raylib, SDL) põe ouvintes de teclado na
 * página inteira (window/document) e dá preventDefault em Backspace, Tab,
 * setas...: com um jogo rodando, o editor ao lado perdia essas teclas e vários
 * atalhos do Vim. E ninguém tirava esses ouvintes ao parar o programa, então o
 * problema seguia para outras páginas até recarregar.
 *
 * Enquanto o programa roda, os ouvintes que ele registra em window/document
 * são embrulhados e anotados: teclado só chega ao jogo com o canvas em foco
 * ("clique no canvas"), e parar o programa remove tudo o que ele registrou.
 */
const KEY_EVENTS = new Set(["keydown", "keyup", "keypress"]);
let releaseListeners: (() => void) | null = null;

function sandboxListeners(canvas: HTMLCanvasElement): () => void {
  releaseListeners?.(); // um programa por vez: o anterior já devia ter parado
  type Listener = EventListenerOrEventListenerObject;
  const added: { target: EventTarget; type: string; wrapped: Listener; options?: boolean | AddEventListenerOptions }[] = [];
  const wrappedOf = new WeakMap<object, Listener>();
  const targets: EventTarget[] = [window, document];
  const originals = targets.map((t) => ({ target: t, add: t.addEventListener, remove: t.removeEventListener }));

  for (const { target, add, remove } of originals) {
    const own = target as EventTarget & { addEventListener: typeof add; removeEventListener: typeof remove };
    own.addEventListener = function (type: string, listener: Listener | null, options?: boolean | AddEventListenerOptions) {
      if (!listener) return;
      let wrapped: Listener = listener;
      if (KEY_EVENTS.has(type)) {
        const call = typeof listener === "function" ? listener : (e: Event) => listener.handleEvent(e);
        wrapped = function (this: unknown, e: Event) {
          if (document.activeElement !== canvas) return; // tecla do editor, do stdin...: não é do jogo
          return call.call(this, e);
        };
        wrappedOf.set(listener, wrapped);
      }
      added.push({ target, type, wrapped, options });
      return add.call(target, type, wrapped, options);
    };
    own.removeEventListener = function (type: string, listener: Listener | null, options?: boolean | EventListenerOptions) {
      if (!listener) return;
      const wrapped = wrappedOf.get(listener) ?? listener;
      const at = added.findIndex((a) => a.target === target && a.type === type && a.wrapped === wrapped);
      if (at !== -1) added.splice(at, 1);
      return remove.call(target, type, wrapped, options);
    };
  }

  const release = () => {
    for (const { target, add, remove } of originals) {
      const own = target as EventTarget & { addEventListener: typeof add; removeEventListener: typeof remove };
      // Volta ao método do protótipo (removendo o embrulho próprio do objeto).
      if (own.addEventListener !== add) delete (own as { addEventListener?: unknown }).addEventListener;
      if (own.removeEventListener !== remove) delete (own as { removeEventListener?: unknown }).removeEventListener;
    }
    for (const a of added.splice(0)) a.target.removeEventListener(a.type, a.wrapped, a.options);
    if (releaseListeners === release) releaseListeners = null;
  };
  releaseListeners = release;
  return release;
}

/** Executa o artefato compilado no canvas da página (fora do iframe, mas isolado no WASM). */
export async function startCanvas(
  artifact: CanvasArtifact,
  canvas: HTMLCanvasElement,
  opts: CanvasRunOptions = {},
): Promise<CanvasSession> {
  const { startCanvasArtifact } = await loadModule();
  const module = await WebAssembly.compile(artifact.wasm.slice());
  const needed = new Set(WebAssembly.Module.imports(module).filter((i) => i.module === "env" && i.kind === "function").map((i) => i.name));
  const env = withEnvStubs(artifact.runtimeGlue, needed, opts.onStderr);
  const release = sandboxListeners(canvas);
  let session: CanvasSession;
  try {
    session = await startCanvasArtifact(artifact, { canvas, onStdout: opts.onStdout, onStderr: opts.onStderr }, env.deps);
  } catch (e) {
    release();
    throw e;
  }
  return {
    ...session,
    stop() {
      env.stop(); // desenrola um main suspenso no emscripten_sleep
      session.stop();
      release(); // devolve o teclado (e tudo o mais que o programa escutava) à página
    },
  };
}

"use client";

// Compilação C/C++ no navegador, sem construtor no servidor.
//
// O Emception roda o clang/wasm-ld num Web Worker e baixa a toolchain do
// `manifest.json` versionado (`@gameguild/emception-toolchain`) pelo CDN.
// O servidor não vê nem compila o código do jogador: só entrega o site.
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

const CWD = "/home/user";
const OBJECT_PATH = "/tmp/korin-canvas.o";
const WASM_PATH = "/home/user/korin-canvas.wasm";

export type CanvasCompilePhase = "loading" | "compiling" | "linking";

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
    return "a página não está cross-origin isolated (COOP/COEP); o construtor no navegador não consegue iniciar";
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

function sourcePath(language: CanvasLanguage): string {
  return language === "cpp" ? "/home/user/main.cpp" : "/home/user/main.c";
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

function outputOf(result: CanvasBuildResult | { compile?: { stdout: string; stderr: string }; link?: { stdout: string; stderr: string } }): string {
  const parts: string[] = [];
  const compile = "compile" in result ? result.compile : undefined;
  const link = "link" in result ? result.link : undefined;
  if (compile) parts.push(compile.stdout, compile.stderr);
  if (link) parts.push(link.stdout, link.stderr);
  return parts
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
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
  await emception.workspace.deleteFile(OBJECT_PATH).catch(() => {});
  await emception.workspace.deleteFile(WASM_PATH).catch(() => {});

  const runOptions = {
    cwd: CWD,
    preloadBundles: ["llvm", "usr-include", "cache-misc", "emscripten-core"],
  };
  const compile = await emception.run(native.compileTool, insertInclude(native.compileArgv(paths), "/usr/include/SDL2"), runOptions);
  if (compile.exitCode !== 0) return { phase: "compile", compile };

  onPhase?.("linking");
  const link = await emception.run(
    canvas.linkTool,
    canvas.linkArgv(paths).filter((arg) => !arg.includes("liballegro")),
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

  opts.onPhase?.("loading");
  const emception = await getEmception();
  const src = sourcePath(opts.language);
  await emception.workspace.writeFile(src, opts.source);
  await emception.workspace.deleteFile(WASM_PATH).catch(() => {});

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
    return { ok: false, output: outputOf(result) || `falha na fase de ${result.phase}` };
  }

  return { ok: true, output: outputOf(result), artifact: result };
}

/** Executa o artefato compilado no canvas da página (fora do iframe, mas isolado no WASM). */
export async function startCanvas(
  artifact: CanvasArtifact,
  canvas: HTMLCanvasElement,
  opts: CanvasRunOptions = {},
): Promise<CanvasSession> {
  const emception = await getEmception();
  return emception.canvas.start(artifact, {
    canvas,
    onStdout: opts.onStdout,
    onStderr: opts.onStderr,
  });
}

/** Encerra o worker e libera a memória da toolchain. */
export function disposeEmception(): void {
  const pending = emceptionPromise;
  emceptionPromise = null;
  modulePromise = null;
  if (pending) void pending.then((em) => em.dispose()).catch(() => {});
}

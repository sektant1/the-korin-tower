import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O compilador C/C++ roda no navegador (Emception/clang num Web Worker) e
  // precisa de SharedArrayBuffer. Isso só existe em página cross-origin
  // isolated; os dois cabeçalhos abaixo são o que ativa o recurso. A toolchain
  // vem do jsDelivr (CORS liberado); para servir você mesmo, copie a pasta cdn/
  // de @gameguild/emception-toolchain e aponte NEXT_PUBLIC_EMCEPTION_MANIFEST_URL.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  // O worker do Emception importa o shim de subprocess do CPython com `?raw`
  // (sintaxe do Vite). O raw-loader transforma o .py em string para o Turbopack.
  turbopack: {
    rules: {
      "*.py": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  // Na Vercel cada rota vira uma função que só leva os arquivos que o bundler enxerga.
  // Estes são lidos do disco em tempo de execução (readdir/readFile), então vão junto.
  outputFileTracingIncludes: {
    "/**": ["./public/fanart/**/*"], // banner/mascote/fan art no layout
    "/galeria": ["./public/assets/dragon-ball-gifs/**/*"],
    "/challenge-assets/**": ["./challenges/**/assets/**/*"],
    // Biblioteca: posts em Markdown lidos do disco (src/lib/biblioteca).
    "/biblioteca/**": ["./biblioteca/**/*.md", "./biblioteca/series.yml"],
    "/biblioteca-assets/**": ["./biblioteca/assets/**/*"],
    "/feed.xml": ["./biblioteca/**/*.md", "./biblioteca/series.yml"],
    "/desafio/**": ["./biblioteca/**/*.md", "./biblioteca/series.yml"],
    "/cli/korin.mjs": ["./cli/korin.mjs"], // a CLI é servida pelo site (Fase 6)
    // Só no modo NEXT_PUBLIC_SUBMIT_VERIFY=server: o navegador manda o .wasm e um worker_thread do Node roda os ocultos.
    "/api/run": ["./src/lib/wasm/wasi-worker.node.mjs", "./src/lib/wasm/wasi-core.mjs"],
    "/install.sh": ["./cli/install.sh"],
    "/install.ps1": ["./cli/install.ps1"],
  },
};

export default nextConfig;

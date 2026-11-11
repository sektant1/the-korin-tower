import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O compilador C/C++ roda no navegador (Emception/clang num Web Worker) e
  // precisa de SharedArrayBuffer. Isso só existe em página cross-origin
  // isolated; os dois cabeçalhos abaixo são o que ativa o recurso.
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
    "/cli/korin.mjs": ["./cli/korin.mjs"], // a CLI é servida pelo site (Fase 6)
    "/install.sh": ["./cli/install.sh"],
    "/install.ps1": ["./cli/install.ps1"],
  },
};

export default nextConfig;

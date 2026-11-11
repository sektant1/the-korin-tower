import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

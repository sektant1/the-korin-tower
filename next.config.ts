import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Na Vercel cada rota vira uma função que só leva os arquivos que o bundler enxerga.
  // Estes são lidos do disco em tempo de execução (readdir/readFile), então vão junto.
  outputFileTracingIncludes: {
    "/**": ["./public/fanart/**/*"], // banner/mascote/fan art no layout
    "/galeria": ["./public/assets/dragon-ball-gifs/**/*"],
    "/challenge-assets/**": ["./challenges/**/assets/**/*"],
  },
};

export default nextConfig;

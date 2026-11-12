// Veredito dos desafios que desenham (shader GLSL e canvas raylib/SDL): o
// navegador renderiza/roda e fotografa dois frames (PPM P3 128x128). Passa se
// algum deles tiver mais de uma cor: tela de cor única é "não desenhou nada".
// O MESMO código roda no navegador (veredito na hora, sem servidor) e no
// servidor (que só reconfere antes de dar os pontos).
import { parsePpm, type PpmImage } from "@/lib/ppm";
import type { TestOutcome } from "./judge";

export const MAX_FRAMES = 2;
export const MAX_FRAME_CHARS = 512 * 1024;

/** Quantas cores distintas a imagem tem (para no limite dado). */
export function distinctColors(img: PpmImage, stopAt = 2): number {
  const seen = new Set<number>();
  for (let i = 0; i < img.data.length && seen.size <= stopAt; i += 3) {
    seen.add((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]);
  }
  return seen.size;
}

/** Valida e confere os frames; lança Error com a causa se vierem malformados. */
export function framesOutcome(frames: unknown, name: string): TestOutcome {
  const list = (Array.isArray(frames) ? frames : []).slice(0, MAX_FRAMES);
  if (!list.length || list.some((f) => typeof f !== "string" || f.length > MAX_FRAME_CHARS)) throw new Error("frames ausentes ou grandes demais");
  const images = (list as string[]).map((f) => parsePpm(f));
  const pass = images.some((img) => distinctColors(img) >= 2);
  return {
    name,
    hidden: false,
    verdict: pass ? "AC" : "WA",
    message: pass ? undefined : "roda, mas desenha uma tela de cor única — o efeito pedido não aparece",
    timeMs: null,
    memoryKb: null,
    exitCode: 0,
    input: "",
    expected: "",
    stdout: list[list.length - 1] as string,
    stderr: "",
  };
}

export const FRAME_TEST_NAME = {
  shader: "frame 128x128 em iTime=0 e iTime=3",
  canvas: "frames do canvas 1 s e 3 s depois de iniciar",
} as const;

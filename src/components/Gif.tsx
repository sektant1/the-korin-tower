import type { Gif as GifInfo } from "@/lib/gifs";

/** <img> de GIF animado com tamanho fixo (evita layout pulando enquanto carrega). */
export function Gif({
  gif,
  height,
  alt = "",
  className,
  pixelated = true,
}: {
  gif: GifInfo;
  /** altura desejada; a largura segue a proporção original */
  height?: number;
  alt?: string;
  className?: string;
  pixelated?: boolean;
}) {
  const h = height ?? gif.h;
  const w = Math.round((gif.w * h) / gif.h);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- GIF animado, next/image não anima
    <img
      src={gif.src}
      width={w}
      height={h}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`gif ${pixelated ? "pixelated" : ""} ${className ?? ""}`}
      loading="lazy"
    />
  );
}

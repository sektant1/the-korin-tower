"use client";
import { useEffect, useMemo, useRef } from "react";
import { parsePpm } from "@/lib/ppm";

export function PpmView({ text, label }: { text: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parsed = useMemo(() => {
    try {
      return { img: parsePpm(text), error: null };
    } catch (e) {
      return { img: null, error: (e as Error).message };
    }
  }, [text]);

  useEffect(() => {
    const img = parsed.img;
    const ctx = canvas.current?.getContext("2d");
    if (!img || !ctx) return;
    const rgba = new ImageData(img.width, img.height);
    for (let p = 0; p < img.width * img.height; p++) {
      rgba.data[p * 4] = img.data[p * 3];
      rgba.data[p * 4 + 1] = img.data[p * 3 + 1];
      rgba.data[p * 4 + 2] = img.data[p * 3 + 2];
      rgba.data[p * 4 + 3] = 255;
    }
    ctx.putImageData(rgba, 0, 0);
  }, [parsed]);

  if (!parsed.img) return <p className="out-err">PPM inválido: {parsed.error}</p>;
  // Escala inteira para imagens pequenas não virarem um borrão.
  const scale = Math.max(1, Math.min(8, Math.floor(320 / Math.max(parsed.img.width, parsed.img.height))));
  return (
    <figure className="ppm-view">
      <canvas
        ref={canvas}
        width={parsed.img.width}
        height={parsed.img.height}
        style={{ width: parsed.img.width * scale, maxWidth: "100%" }}
        role="img"
        aria-label={`${label}: imagem ${parsed.img.width}x${parsed.img.height}`}
      />
      <figcaption>
        {label} · {parsed.img.width}×{parsed.img.height}
      </figcaption>
    </figure>
  );
}

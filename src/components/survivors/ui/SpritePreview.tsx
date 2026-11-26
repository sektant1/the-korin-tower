"use client";
// Retrato animado de um sprite do atlas (seleção de personagem, bestiário). Sem atlas, mostra um
// disco na cor do placeholder.
import { useEffect, useRef } from "react";
import { disc } from "../render/art";
import { drawSprite, loadSprites } from "../render/sprites";

export function SpritePreview({ sprite, color, size = 96, anim = "idle", dim = false }: { sprite: string; color: string; size?: number; anim?: string; dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    loadSprites();
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    let raf = 0;
    const t0 = performance.now();
    const draw = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingEnabled = false;
      const t = (performance.now() - t0) / 1000;
      // sprites têm ~64 px de altura no mundo: aqui ampliamos para caber no quadro
      g.setTransform(size / 80, 0, 0, size / 80, 0, 0);
      if (!drawSprite(g, sprite, anim, t, 40, 74, false, dim)) {
        const d = disc(color, 16, dim);
        g.drawImage(d, 40 - d.width / 2, 44 - d.height / 2);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [sprite, color, size, anim, dim]);
  return <canvas ref={ref} width={size} height={size} className="ss-portrait" style={dim ? { filter: "brightness(0)" } : undefined} />;
}

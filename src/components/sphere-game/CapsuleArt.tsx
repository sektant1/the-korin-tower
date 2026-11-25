// Arte vetorial no estilo Capsule Corp (as cápsulas da Bulma): corpo metálico arredondado,
// faixa preta com listras verdes e o logo, gargalo e pino na ponta. Usada no HUD do jogo
// (barras de vida e KI, painéis) e, convertida em imagem, nos itens que caem.
import type { ReactNode } from "react";

export type Metal = "gold" | "copper" | "red" | "blue" | "silver";

// claro (reflexo) → base → sombra
export const METALS: Record<Metal, [string, string, string]> = {
  gold: ["#fff3b0", "#efbf2c", "#9a6a0c"],
  copper: ["#f6cbb8", "#c27a60", "#6b3727"],
  red: ["#ffc2c2", "#e5414d", "#851322"],
  blue: ["#cfe6ff", "#3a86e8", "#18407c"],
  silver: ["#ffffff", "#c9d2dc", "#6b7684"],
};

const STRIPE = "#39e639";
const LINE = "#1b1208";

/* ---------- logo ---------- */

/** Logo da Capsule Corp: anel com um "C" e o ponto no meio (desenho próprio, simplificado). */
function logoPaths(cx: number, cy: number, r: number, color: string) {
  const c = r * 0.62;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${r * 0.2}"/>
<path d="M ${cx + c * 0.7} ${cy - c * 0.7} A ${c} ${c} 0 1 0 ${cx + c * 0.7} ${cy + c * 0.7}" fill="none" stroke="${color}" stroke-width="${r * 0.26}" stroke-linecap="round"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.16}" fill="${color}"/>`;
}

export function CCLogo({ size = 20, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logoPaths(12, 12, 10, color) }} />
  );
}

/* ---------- cápsula (item) ---------- */

/** SVG da cápsula na diagonal, como as das imagens de referência. Lado: 64. */
export function capsuleSvg(metal: Metal): string {
  const [hi, base, lo] = METALS[metal];
  const id = `m-${metal}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
<defs>
  <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${hi}"/><stop offset="0.45" stop-color="${base}"/><stop offset="1" stop-color="${lo}"/>
  </linearGradient>
</defs>
<g transform="rotate(-40 32 32)">
  <rect x="49" y="26" width="6" height="12" rx="1.5" fill="url(#${id})" stroke="${LINE}" stroke-width="1.5"/>
  <rect x="54" y="23" width="7" height="18" rx="3" fill="url(#${id})" stroke="${LINE}" stroke-width="1.5"/>
  <rect x="5" y="20" width="46" height="24" rx="12" fill="url(#${id})" stroke="${LINE}" stroke-width="2"/>
  <rect x="17" y="20" width="26" height="24" fill="#16110c"/>
  <rect x="18.5" y="20" width="3" height="24" fill="${STRIPE}"/>
  <rect x="38.5" y="20" width="3" height="24" fill="${STRIPE}"/>
  ${logoPaths(30, 32, 6, "#ffffff")}
  <rect x="5" y="20" width="46" height="24" rx="12" fill="none" stroke="${LINE}" stroke-width="2"/>
  <rect x="10" y="23" width="30" height="4" rx="2" fill="#ffffff" opacity="0.45"/>
</g>
</svg>`;
}

export const capsuleDataUrl = (metal: Metal) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(capsuleSvg(metal))}`;

export function CapsuleIcon({ metal, size = 28 }: { metal: Metal; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- SVG gerado em código
  return <img src={capsuleDataUrl(metal)} width={size} height={size} alt="" />;
}

/* ---------- barra-cápsula ---------- */

/**
 * Barra no formato de cápsula deitada: casco metálico, janela escura que enche, faixa preta com
 * as listras verdes e o logo na ponta esquerda, gargalo e pino na direita.
 */
export function CapsuleBar({
  value,
  metal = "silver",
  fill,
  label,
  blink,
  className,
}: {
  value: number; // 0..1
  metal?: Metal;
  fill: string;
  label?: ReactNode;
  blink?: boolean;
  className?: string;
}) {
  const [hi, base, lo] = METALS[metal];
  const v = Math.max(0, Math.min(1, value));
  const id = `cb-${metal}`;
  // janela: x 44..262 (218 de largura)
  return (
    <div className={`capsule-bar ${blink ? "blink" : ""} ${className ?? ""}`}>
      <svg width="300" height="36" viewBox="0 0 300 36" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hi} />
            <stop offset="0.45" stopColor={base} />
            <stop offset="1" stopColor={lo} />
          </linearGradient>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* pino e gargalo */}
        <rect x="270" y="12" width="10" height="12" rx="2" fill={`url(#${id})`} stroke={LINE} strokeWidth="1.5" />
        <rect x="279" y="8" width="14" height="20" rx="4" fill={`url(#${id})`} stroke={LINE} strokeWidth="1.5" />
        {/* casco */}
        <rect x="2" y="2" width="270" height="32" rx="16" fill={`url(#${id})`} stroke={LINE} strokeWidth="2" />
        {/* faixa com o logo */}
        <rect x="16" y="2" width="24" height="32" fill="#16110c" />
        <rect x="17" y="2" width="3" height="32" fill={STRIPE} />
        <rect x="36" y="2" width="3" height="32" fill={STRIPE} />
        <g dangerouslySetInnerHTML={{ __html: logoPaths(28, 18, 6, "#ffffff") }} />
        {/* janela */}
        <rect x="44" y="8" width="218" height="20" rx="10" fill="#0b1420" stroke={LINE} strokeWidth="1.5" />
        <rect x="46" y="10" width={214 * v} height="16" rx="8" fill={fill} />
        {[0.25, 0.5, 0.75].map((t) => (
          <rect key={t} x={44 + 218 * t} y="10" width="1.5" height="16" fill="#0b1420" opacity="0.6" />
        ))}
        <rect x="46" y="10" width="214" height="16" rx="8" fill={`url(#${id}-glass)`} />
      </svg>
      {label && <span className="capsule-bar-label">{label}</span>}
    </div>
  );
}

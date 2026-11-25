import { getAvatar } from "@/lib/avatars";

export type AvatarSize = "xs" | "sm" | "md" | "lg";
const PX: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 64, lg: 112 };

/** Avatar de perfil: o GIF dentro de uma moldura quadrada. `id` nulo ou desconhecido = o padrão. */
export function Avatar({ id, size = "md", className }: { id: string | null | undefined; size?: AvatarSize; className?: string }) {
  const a = getAvatar(id);
  const px = PX[size];
  return (
    <span className={`avatar avatar-${size} ${className ?? ""}`} title={a.name}>
      {/* eslint-disable-next-line @next/next/no-img-element -- GIF animado, next/image não anima */}
      <img src={a.gif.src} width={px} height={px} alt="" loading="lazy" className="pixelated" />
    </span>
  );
}

/* Convidado: silhueta pixel art com "?" dourado, nas cores do site (20x20, sem imagem externa). */
const GUEST_ROWS = [
  "....................",
  ".......oooooo.......",
  ".....oobbbbbboo.....",
  "....obbbbqqbbbbo....",
  "....olbbqbbqbbbo....",
  "...olbbbbbbqbbbbo...",
  "...olbbbbbqbbbbbo...",
  "...obbbbbbqbbbbbo...",
  "...obbbbbbbbbbbbo...",
  "....obbbbbqbbbbo....",
  "....obbbbbbbbbbo....",
  ".....oobbbbbboo.....",
  ".......oooooo.......",
  "....oooobbbboooo....",
  "..oolbbbbbbbbbbboo..",
  ".olbbbbbbbbbbbbbbbo.",
  ".olbbbbbbbbbbbbbbbo.",
  "olbbbbbbbbbbbbbbbbbo",
  "olbbbbbbbbbbbbbbbbbo",
  "olbbbbbbbbbbbbbbbbbo",
];
const GUEST_COLORS: Record<string, string> = { o: "#0a0614", b: "#5c4a90", l: "#8a76c4", q: "#ffd21f" };
// estrelas do fundo, como o céu do site
const GUEST_STARS: [number, number, string][] = [
  [2, 2, "#fff"],
  [17, 3, "#ffff99"],
  [1, 9, "#99ccff"],
  [18, 10, "#fff"],
];

/** Avatar de quem não entrou: genérico, sem ser nenhum personagem. */
export function GuestAvatar({ size = "md", className }: { size?: AvatarSize; className?: string }) {
  const px = PX[size];
  return (
    <span className={`avatar avatar-${size} ${className ?? ""}`} title="Convidado">
      <svg viewBox="0 0 20 20" width={px} height={px} shapeRendering="crispEdges" aria-hidden="true">
        <rect width="20" height="20" fill="#171028" />
        {GUEST_STARS.map(([x, y, c]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c} />
        ))}
        {GUEST_ROWS.flatMap((row, y) =>
          [...row].map((ch, x) => (ch in GUEST_COLORS ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={GUEST_COLORS[ch]} /> : null)),
        )}
      </svg>
    </span>
  );
}

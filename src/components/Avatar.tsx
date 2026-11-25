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

import { BADGES, type Badge } from "@/lib/badges";

/** Estante de medalhas: as conquistadas acesas, as outras apagadas (com a dica de como ganhar). */
export function BadgeShelf({ earned }: { earned: Badge[] }) {
  const have = new Set(earned.map((b) => b.id));
  return (
    <ul className="badge-shelf" aria-label={`Medalhas: ${earned.length} de ${BADGES.length}`}>
      {BADGES.map((b) => (
        <li key={b.id} className={have.has(b.id) ? "medal on" : "medal"} title={b.description}>
          <span className="medal-icon" aria-hidden="true">
            {b.icon}
          </span>
          <span className="medal-name">{b.name}</span>
          <span className="sr-only">
            {have.has(b.id) ? " (conquistada): " : " (bloqueada): "}
            {b.description}
          </span>
        </li>
      ))}
    </ul>
  );
}

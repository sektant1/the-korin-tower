import { activeAchievements, GROUP_LABELS, type AchievementGroup } from "@/lib/achievements";
import type { UnlockedAchievement } from "@/lib/achievements-server";
import { avatarsUnlockedBy } from "@/lib/avatars";
import { TRACKS_ENABLED } from "@/lib/features";
import { Avatar } from "./Avatar";

const WHEN = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

/** Conquistas que contam agora (as de features desligadas ficam de fora). */
export const visibleAchievements = () => activeAchievements({ tracks: TRACKS_ENABLED });

/**
 * Estante de conquistas, agrupada. Conquistadas acesas com a data; as outras apagadas com
 * a dica de como ganhar; as secretas ficam "???" até alguém descobrir.
 */
export function AchievementShelf({ unlocked }: { unlocked: UnlockedAchievement[] }) {
  const when = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));
  const list = visibleAchievements();
  const groups = Object.keys(GROUP_LABELS) as AchievementGroup[];
  return (
    <div className="achievements">
      {groups.map((g) => {
        const items = list.filter((a) => a.group === g);
        if (!items.length) return null;
        const got = items.filter((a) => when.has(a.id)).length;
        return (
          <section key={g} className="achievement-group" aria-label={GROUP_LABELS[g]}>
            <h3 className="achievement-group-title">
              {GROUP_LABELS[g]} <span className="dim">{got}/{items.length}</span>
            </h3>
            <ul className="badge-shelf">
              {items.map((a) => {
                const date = when.get(a.id);
                const hidden = a.secret && !date;
                const reward = avatarsUnlockedBy(a.id)[0];
                const tip = hidden ? "Conquista secreta" : a.description;
                return (
                  <li key={a.id} className={`medal ${date ? "on" : ""} ${a.secret ? "secret" : ""}`} title={tip}>
                    <span className="medal-icon" aria-hidden="true">
                      {hidden ? "??" : a.icon}
                    </span>
                    <span className="medal-name">{hidden ? "???" : a.name}</span>
                    {date && <span className="medal-date">{WHEN.format(date)}</span>}
                    {reward && !hidden && (
                      <span className="medal-reward" title={`Libera o avatar ${reward.name}`}>
                        <Avatar id={reward.id} size="xs" />
                      </span>
                    )}
                    <span className="sr-only">
                      {date ? ` (conquistada em ${WHEN.format(date)}): ` : " (bloqueada): "}
                      {tip}
                      {reward && !hidden ? `. Libera o avatar ${reward.name}.` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** "12 de 20" contando só as conquistas visíveis. */
export function achievementCount(unlocked: UnlockedAchievement[]): { got: number; total: number } {
  const list = visibleAchievements();
  const ids = new Set(unlocked.map((u) => u.id));
  return { got: list.filter((a) => ids.has(a.id)).length, total: list.length };
}

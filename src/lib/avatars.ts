// Avatares de perfil. Cada um é livre, vem de uma conquista ou é exclusivo de admin.
// Liberar um avatar novo por andar, pontos, segredo etc. = criar a conquista em
// src/lib/achievements.ts e apontar o avatar para ela. Uma regra só, um toast só.
//
// O id fica gravado em User.avatar: não troque ids existentes.

import { getAchievement } from "@/lib/achievements";
import type { Gif } from "@/lib/gifs";

export type AvatarUnlock = { kind: "free" } | { kind: "achievement"; id: string } | { kind: "admin" };

export interface Avatar {
  id: string;
  /** nome original do personagem/golpe, em inglês */
  name: string;
  gif: Gif;
  unlock: AvatarUnlock;
}

/**
 * GIFs recortados em public/assets/avatars/<id>.gif (sem a margem vazia dos sprites).
 * Gerados por scripts/trim-avatars.py a partir de public/assets/dragon-ball-gifs.
 */
const avatarGif = (id: string, w: number, h: number): Gif => ({ src: `/assets/avatars/${id}.gif`, w, h });

const free: AvatarUnlock = { kind: "free" };
const by = (id: string): AvatarUnlock => ({ kind: "achievement", id });

export const DEFAULT_AVATAR_ID = "goku";

export const AVATARS: Avatar[] = [
  { id: "goku", name: "Goku", gif: avatarGif("goku", 51, 93), unlock: free },
  { id: "fighting-stance-goku", name: "Fighting Stance Goku", gif: avatarGif("fighting-stance-goku", 73, 65), unlock: free },
  { id: "dragon-ball", name: "Dragon Ball", gif: avatarGif("dragon-ball", 50, 50), unlock: free },

  // Torre
  { id: "super-saiyan-goku", name: "Super Saiyan Goku", gif: avatarGif("super-saiyan-goku", 52, 140), unlock: by("primeiro-andar") },
  { id: "krillin", name: "Krillin", gif: avatarGif("krillin", 131, 56), unlock: by("andar-2") },
  { id: "future-trunks", name: "Future Trunks", gif: avatarGif("future-trunks", 124, 166), unlock: by("andar-3") },
  { id: "super-saiyan-4-goku", name: "Super Saiyan 4 Goku", gif: avatarGif("super-saiyan-4-goku", 118, 135), unlock: by("andar-5") },
  { id: "gotenks", name: "Gotenks", gif: avatarGif("gotenks", 67, 68), unlock: by("topo") },

  // Desafios
  { id: "piccolo", name: "Piccolo", gif: avatarGif("piccolo", 72, 105), unlock: by("sete-esferas") },
  { id: "super-saiyan-trunks", name: "Super Saiyan Trunks", gif: avatarGif("super-saiyan-trunks", 48, 83), unlock: by("sem-senzu") },
  { id: "cell", name: "Cell", gif: avatarGif("cell", 93, 112), unlock: by("boss") },
  { id: "goten-and-trunks", name: "Goten & Trunks", gif: avatarGif("goten-and-trunks", 138, 80), unlock: by("poliglota") },
  { id: "super-saiyan-2-goku", name: "Super Saiyan 2 Goku", gif: avatarGif("super-saiyan-2-goku", 54, 86), unlock: by("ki-1000") },
  { id: "vegeta", name: "Vegeta", gif: avatarGif("vegeta", 143, 116), unlock: by("ki-9000") },
  { id: "bardock", name: "Bardock", gif: avatarGif("bardock", 81, 115), unlock: by("recordista") },

  // Dedicação
  { id: "flying-kick-goku", name: "Flying Kick Goku", gif: avatarGif("flying-kick-goku", 89, 106), unlock: by("desafio-do-dia") },
  { id: "kaioken-goku", name: "Kaioken Goku", gif: avatarGif("kaioken-goku", 53, 87), unlock: by("treino-diario") },
  { id: "super-saiyan-gohan", name: "Super Saiyan Gohan", gif: avatarGif("super-saiyan-gohan", 97, 131), unlock: by("sala-do-tempo") },

  // Social
  { id: "majin-buu", name: "Majin Buu", gif: avatarGif("majin-buu", 70, 88), unlock: by("livro-de-visitas") },
  { id: "android-16", name: "Android 16", gif: avatarGif("android-16", 170, 155), unlock: by("comentarista") },

  // Segredos e exclusivos
  { id: "solar-flare-krillin", name: "Solar Flare Krillin", gif: avatarGif("solar-flare-krillin", 96, 87), unlock: by("coruja") },
  { id: "kamehameha-goku", name: "Kamehameha Goku", gif: avatarGif("kamehameha-goku", 135, 115), unlock: by("konami") },
  { id: "dragon-fist-goku", name: "Dragon Fist Goku", gif: avatarGif("dragon-fist-goku", 174, 175), unlock: { kind: "admin" } },
];

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export function getAvatar(id: string | null | undefined): Avatar {
  return (id && BY_ID.get(id)) || BY_ID.get(DEFAULT_AVATAR_ID)!;
}

export interface Unlocker {
  /** ids das conquistas desbloqueadas */
  achievements: ReadonlySet<string>;
  isAdmin: boolean;
}

export function isAvatarUnlocked(avatar: Avatar, who: Unlocker): boolean {
  switch (avatar.unlock.kind) {
    case "free":
      return true;
    case "admin":
      return who.isAdmin;
    case "achievement":
      return who.achievements.has(avatar.unlock.id);
  }
}

/** Avatares que uma conquista libera (para o toast e a estante). */
export function avatarsUnlockedBy(achievementId: string): Avatar[] {
  return AVATARS.filter((a) => a.unlock.kind === "achievement" && a.unlock.id === achievementId);
}

/** Como liberar, em uma frase curta (vazio para os livres). Segredo continua segredo. */
export function unlockHint(avatar: Avatar): string {
  const u = avatar.unlock;
  if (u.kind === "free") return "";
  if (u.kind === "admin") return "exclusivo de admin";
  const a = getAchievement(u.id);
  if (!a) return "indisponível";
  return a.secret ? "conquista secreta" : `conquista "${a.name}"`;
}

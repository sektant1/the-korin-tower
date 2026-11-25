// Conquistas. As regras são puras: recebem as estatísticas do jogador e dizem se ele já
// ganhou. Quem grava, notifica e libera avatares é src/lib/achievements-server.ts.
//
// Os ids ficam gravados no banco (UserAchievement): nunca troque o id de uma conquista
// existente. Para aposentar uma, tire `earned` e deixe-a como `retired: true`.

import { FLOORS } from "@/lib/tower";

export interface SolvedStat {
  categoryId: string;
  difficulty: number;
  hintsRevealed: number;
  dailyBonus: boolean;
  /** hora (0 a 23, fuso de Brasília) em que foi resolvido; null se não houver data */
  hour: number | null;
}

export interface AchievementStats {
  solved: SolvedStat[];
  points: number;
  tracksDone: number;
  guestbookSigned: boolean;
  comments: number;
  bestStreak: number;
  /** desafios em que o jogador tem o menor código ou o menor tempo */
  records: number;
  /** andar mais alto aberto na torre (1 a FLOORS) */
  floorsOpen: number;
}

export type AchievementGroup = "torre" | "desafios" | "dedicacao" | "social" | "segredo";

export const GROUP_LABELS: Record<AchievementGroup, string> = {
  torre: "Torre",
  desafios: "Desafios",
  dedicacao: "Dedicação",
  social: "Social",
  segredo: "Segredos",
};

export interface Achievement {
  id: string;
  name: string;
  /** dois ou três caracteres ASCII, desenhados como um selo */
  icon: string;
  description: string;
  group: AchievementGroup;
  /** nome e descrição ficam escondidos ("???") até desbloquear */
  secret?: boolean;
  /**
   * Regra calculada a partir das estatísticas. Sem ela, a conquista é de evento:
   * só é gravada por unlockEventAchievement (ex.: o código Konami).
   */
  earned?(s: AchievementStats): boolean;
  /** some da lista se a feature dela estiver desligada (ex.: trilhas) */
  requires?: "tracks";
}

const MID_FLOOR = Math.ceil(FLOORS / 2);

export const ACHIEVEMENTS: Achievement[] = [
  // Torre
  { id: "primeiro-andar", group: "torre", name: "Primeiro Andar", icon: "1F", description: "Resolveu o primeiro desafio.", earned: (s) => s.solved.length >= 1 },
  { id: "andar-2", group: "torre", name: "Torneio de Artes Marciais", icon: "2F", description: "Chegou ao andar 2.", earned: (s) => s.floorsOpen >= 2 },
  { id: "andar-3", group: "torre", name: "Meio da Torre", icon: "1/2", description: `Chegou ao andar ${MID_FLOOR}.`, earned: (s) => s.floorsOpen >= MID_FLOOR },
  { id: "andar-5", group: "torre", name: "Planeta do Kaioh", icon: "5F", description: "Chegou ao andar 5.", earned: (s) => s.floorsOpen >= 5 },
  { id: "topo", group: "torre", name: "Topo da Torre", icon: "^^", description: "Chegou ao último andar.", earned: (s) => s.floorsOpen >= FLOORS },

  // Desafios
  { id: "sete-esferas", group: "desafios", name: "Sete Esferas", icon: "x7", description: "Resolveu 7 desafios.", earned: (s) => s.solved.length >= 7 },
  {
    id: "sem-senzu",
    group: "desafios",
    name: "Sem Senzu",
    icon: "0?",
    description: "Resolveu um desafio de dificuldade 3 ou mais sem revelar nenhuma dica.",
    earned: (s) => s.solved.some((p) => p.difficulty >= 3 && p.hintsRevealed === 0),
  },
  { id: "boss", group: "desafios", name: "Derrotou um BOSS", icon: "B!", description: "Resolveu um desafio de dificuldade 5.", earned: (s) => s.solved.some((p) => p.difficulty === 5) },
  {
    id: "poliglota",
    group: "desafios",
    name: "Poliglota",
    icon: "3L",
    description: "Resolveu desafios em 3 categorias diferentes.",
    earned: (s) => new Set(s.solved.map((p) => p.categoryId)).size >= 3,
  },
  { id: "ki-1000", group: "desafios", name: "Ki 1000", icon: "KI", description: "Chegou a 1000 pontos.", earned: (s) => s.points >= 1000 },
  { id: "ki-9000", group: "desafios", name: "É Mais de 8000!", icon: "9K", description: "Passou de 8000 pontos.", earned: (s) => s.points > 8000 },
  { id: "recordista", group: "desafios", name: "Recordista", icon: "#1", description: "Tem o menor código ou o menor tempo em algum desafio.", earned: (s) => s.records >= 1 },
  { id: "detonado", group: "desafios", name: "Trilha completa", icon: "OK", description: "Concluiu uma trilha inteira.", requires: "tracks", earned: (s) => s.tracksDone >= 1 },

  // Dedicação
  {
    id: "desafio-do-dia",
    group: "dedicacao",
    name: "Desafio do Dia",
    icon: "24",
    description: "Resolveu o desafio do dia no próprio dia.",
    earned: (s) => s.solved.some((p) => p.dailyBonus),
  },
  { id: "treino-diario", group: "dedicacao", name: "Treino Diário", icon: "3D", description: "Resolveu desafios em 3 dias seguidos.", earned: (s) => s.bestStreak >= 3 },
  { id: "sala-do-tempo", group: "dedicacao", name: "Sala do Tempo", icon: "7D", description: "Resolveu desafios em 7 dias seguidos.", earned: (s) => s.bestStreak >= 7 },

  // Social
  { id: "livro-de-visitas", group: "social", name: "Assinou o Livro", icon: "GB", description: "Deixou um recado no guestbook.", earned: (s) => s.guestbookSigned },
  { id: "comentarista", group: "social", name: "Comentarista", icon: ">>", description: "Escreveu 3 comentários em desafios.", earned: (s) => s.comments >= 3 },

  // Segredos
  {
    id: "coruja",
    group: "segredo",
    secret: true,
    name: "Coruja",
    icon: "zZ",
    description: "Resolveu um desafio entre meia-noite e 5 da manhã.",
    earned: (s) => s.solved.some((p) => p.hour !== null && p.hour < 5),
  },
  { id: "konami", group: "segredo", secret: true, name: "Código Konami", icon: "↑↑", description: "Digitou o código Konami em alguma página." },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

/** Conquistas visíveis com as features ligadas agora. */
export function activeAchievements(features: { tracks: boolean }): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.requires !== "tracks" || features.tracks);
}

/** Ids que as estatísticas garantem agora (as de evento nunca aparecem aqui). */
export function earnedAchievementIds(stats: AchievementStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.earned?.(stats)).map((a) => a.id);
}

/** Conquista que só se ganha por evento (sem regra), como o Konami. */
export const isEventAchievement = (id: string) => !!BY_ID.get(id) && !BY_ID.get(id)!.earned;

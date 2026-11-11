// Medalhas (Fase 3). Não há tabela: são calculadas na hora a partir do que o jogador já fez,
// então uma medalha nova vale retroativamente e nada precisa de migração.

import { FLOORS } from "@/lib/tower";

export interface BadgeStats {
  solved: { categoryId: string; difficulty: number; hintsRevealed: number; dailyBonus: boolean }[];
  points: number;
  tracksDone: number;
  guestbookSigned: boolean;
  comments: number;
  bestStreak: number;
  /** desafios em que o jogador tem o menor código ou o menor tempo */
  records: number;
  /** andar mais alto aberto na torre (1 a 5) */
  floorsOpen: number;
}

export interface Badge {
  id: string;
  name: string;
  /** dois ou três caracteres ASCII, desenhados como um selo */
  icon: string;
  description: string;
  earned(s: BadgeStats): boolean;
}

export const BADGES: Badge[] = [
  { id: "primeiro-andar", name: "Primeiro Andar", icon: "1F", description: "Resolveu o primeiro desafio.", earned: (s) => s.solved.length >= 1 },
  { id: "sete-esferas", name: "Sete Esferas", icon: "x7", description: "Resolveu 7 desafios.", earned: (s) => s.solved.length >= 7 },
  {
    id: "sem-senzu",
    name: "Sem Senzu",
    icon: "0?",
    description: "Resolveu um desafio de dificuldade 3 ou mais sem revelar nenhuma dica.",
    earned: (s) => s.solved.some((p) => p.difficulty >= 3 && p.hintsRevealed === 0),
  },
  { id: "boss", name: "Derrotou um BOSS", icon: "B!", description: "Resolveu um desafio de dificuldade 5.", earned: (s) => s.solved.some((p) => p.difficulty === 5) },
  {
    id: "poliglota",
    name: "Poliglota",
    icon: "3L",
    description: "Resolveu desafios em 3 categorias diferentes.",
    earned: (s) => new Set(s.solved.map((p) => p.categoryId)).size >= 3,
  },
  { id: "ki-1000", name: "Ki 1000", icon: "KI", description: "Chegou a 1000 pontos.", earned: (s) => s.points >= 1000 },
  { id: "detonado", name: "Detonado", icon: "OK", description: "Zerou um detonado inteiro.", earned: (s) => s.tracksDone >= 1 },
  { id: "andar-3", name: "Meio da Torre", icon: "1/2", description: `Chegou ao andar ${Math.ceil(FLOORS / 2)}.`, earned: (s) => s.floorsOpen >= Math.ceil(FLOORS / 2) },
  { id: "topo", name: "Topo da Torre", icon: "^^", description: "Chegou ao último andar.", earned: (s) => s.floorsOpen >= FLOORS },
  { id: "livro-de-visitas", name: "Assinou o Livro", icon: "GB", description: "Deixou um recado no guestbook.", earned: (s) => s.guestbookSigned },
  { id: "comentarista", name: "Comentarista", icon: ">>", description: "Escreveu 3 comentários em desafios.", earned: (s) => s.comments >= 3 },
  {
    id: "desafio-do-dia",
    name: "Desafio do Dia",
    icon: "24",
    description: "Resolveu o desafio do dia no próprio dia.",
    earned: (s) => s.solved.some((p) => p.dailyBonus),
  },
  { id: "treino-diario", name: "Treino Diário", icon: "3D", description: "Resolveu desafios em 3 dias seguidos.", earned: (s) => s.bestStreak >= 3 },
  { id: "sala-do-tempo", name: "Sala do Tempo", icon: "7D", description: "Resolveu desafios em 7 dias seguidos.", earned: (s) => s.bestStreak >= 7 },
  { id: "recordista", name: "Recordista", icon: "#1", description: "Tem o menor código ou o menor tempo em algum desafio.", earned: (s) => s.records >= 1 },
];

export function earnedBadges(stats: BadgeStats): Badge[] {
  return BADGES.filter((b) => b.earned(stats));
}

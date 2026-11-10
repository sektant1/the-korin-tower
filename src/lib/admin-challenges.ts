// Formato do editor de desafios do painel admin (cliente ↔ Server Function).
import type { LanguageId } from "@/lib/languages";

export interface ChallengeInput {
  /** slug antes da edição; null = desafio novo */
  originalSlug: string | null;
  slug: string;
  title: string;
  category: string;
  difficulty: number;
  kind: "stdio" | "shader";
  languages: LanguageId[];
  tags: string; // separadas por vírgula
  checker: "exact" | "ppm";
  tolerance: number;
  maxBadRatio: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  order: number;
  statement: string;
  notes: string;
  hints: string[];
  templates: Partial<Record<LanguageId, string>>;
  solutions: Partial<Record<LanguageId, string>>;
  tests: { name: string; input: string; expected: string; hidden: boolean }[];
}

export type SaveState = { error?: string } | undefined;

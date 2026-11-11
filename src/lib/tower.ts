// A Torre: regras de progressão, puras e compartilhadas entre servidor e navegador.
//
//   - Cada andar é uma dificuldade (1 a 5). Os andares acima disso existem no mapa, mas
//     estão em obras: um andar sem desafios não abre nem conta como alcançado.
//   - O andar 1 está sempre aberto. O andar N+1 abre quando você resolve NEED desafios
//     com testes do andar N (ou todos, se o andar tem menos que isso).
//   - Detonados são escadas: o próximo passo de um detonado em andamento abre mesmo
//     que o andar dele ainda esteja trancado. O desafio do dia também abre sempre.
//   - Só desafios com testes (stdio) têm "resolvido" e contam para subir. Shader e
//     canvas são passos livres: seguem o andar, mas não contam.
//   - Esferas do Dragão: uma por detonado zerado.
//
// O progresso vem da conta (logado) ou do localStorage (convidado): o formato é o mesmo.

export const FLOORS = 8;
export const NEED_PER_FLOOR = 2;

export type ProgressMap = Record<string, "solved" | "gaveup" | undefined>;

export interface TowerChallenge {
  slug: string;
  title: string;
  difficulty: number;
  kind: "stdio" | "shader" | "canvas";
  categoryId: string;
  categoryName: string;
}

export interface TowerTrack {
  id: string;
  title: string;
  steps: string[];
}

export interface TowerData {
  challenges: TowerChallenge[];
  tracks: TowerTrack[];
  /** slug do desafio do dia, se houver */
  daily: string | null;
}

export interface FloorStatus {
  n: number;
  open: boolean;
  /** desafios no andar (todos os tipos) */
  total: number;
  /** desafios com testes */
  scored: number;
  /** resolvidos entre os com testes */
  solved: number;
  /** quantos ainda faltam resolver aqui para abrir o andar de cima (0 = já abriu ou é o topo) */
  missingForNext: number;
}

/** Cada andar é um lugar da subida: do mar até o mundo dos Kaioshin. Imagens em public/andares. */
export const FLOOR_NAMES: Record<number, string> = {
  1: "Kame House",
  2: "Torneio de Artes Marciais",
  3: "Torre de Karin",
  4: "Templo de Kami",
  5: "Planeta do Kaioh",
  6: "Planeta Namek",
  7: "Jogos de Cell",
  8: "Reino dos Kaioshin",
};
export const FLOOR_IMAGES: Record<number, string> = {
  1: "/andares/1-kame-house.jpg",
  2: "/andares/2-torneio.jpg",
  3: "/andares/3-torre-de-karin.jpg",
  4: "/andares/4-templo-de-kami.jpg",
  5: "/andares/5-planeta-do-kaioh.jpg",
  6: "/andares/6-namek.jpg",
  7: "/andares/7-jogos-de-cell.jpg",
  8: "/andares/8-reino-dos-kaioshin.jpg",
};
/** Que parte da imagem mostrar quando ela é cortada (background-position). */
const FLOOR_FOCUS: Record<number, string> = {
  1: "center 60%",
  2: "center 55%",
  3: "center 38%",
  4: "center 15%",
  5: "center 45%",
  6: "center 50%",
  7: "center 45%",
  8: "center 50%",
};
/** Estilo inline do cenário de um andar, para faixas e fundos. */
export function floorScene(n: number): { backgroundImage: string; backgroundPosition: string } {
  return { backgroundImage: `url(${FLOOR_IMAGES[n]})`, backgroundPosition: FLOOR_FOCUS[n] ?? "center" };
}

export const floorOf = (c: Pick<TowerChallenge, "difficulty">) => Math.min(FLOORS, Math.max(1, c.difficulty));
export const isScored = (c: Pick<TowerChallenge, "kind">) => c.kind === "stdio";
const solved = (p: ProgressMap, slug: string) => p[slug] === "solved";

/** Quantos resolvidos o andar precisa para abrir o de cima. */
function needOn(data: TowerData, n: number): number {
  const scored = data.challenges.filter((c) => floorOf(c) === n && isScored(c)).length;
  return Math.min(NEED_PER_FLOOR, scored);
}

export function floors(data: TowerData, progress: ProgressMap): FloorStatus[] {
  const out: FloorStatus[] = [];
  let open = true;
  for (let n = 1; n <= FLOORS; n++) {
    const here = data.challenges.filter((c) => floorOf(c) === n);
    const scored = here.filter(isScored);
    const done = scored.filter((c) => solved(progress, c.slug)).length;
    const need = needOn(data, n);
    out.push({ n, open, total: here.length, scored: scored.length, solved: done, missingForNext: n === FLOORS ? 0 : Math.max(0, need - done) });
    open = open && scored.length > 0 && done >= need;
  }
  return out;
}

/** Andar mais alto aberto. */
export function currentFloor(data: TowerData, progress: ProgressMap): number {
  return floors(data, progress).filter((f) => f.open).length;
}

/** O desafio é o próximo passo de algum detonado (todos os passos com testes antes dele resolvidos)? */
export function isTrackNext(data: TowerData, progress: ProgressMap, slug: string): boolean {
  const bySlug = new Map(data.challenges.map((c) => [c.slug, c]));
  return data.tracks.some((t) => {
    const i = t.steps.indexOf(slug);
    if (i < 0) return false;
    return t.steps.slice(0, i).every((s) => {
      const c = bySlug.get(s);
      return !c || !isScored(c) || solved(progress, s);
    });
  });
}

export function isOpen(data: TowerData, progress: ProgressMap, slug: string): boolean {
  const c = data.challenges.find((x) => x.slug === slug);
  if (!c) return true; // desafio fora do manifesto (ex.: criado agora no admin): não trava ninguém
  if (progress[slug]) return true; // já resolvido ou desistiu: sempre dá para voltar
  if (slug === data.daily) return true;
  const f = floors(data, progress)[floorOf(c) - 1];
  if (f.open) return true;
  return isTrackNext(data, progress, slug);
}

export interface LockInfo {
  floor: number;
  /** andar que precisa ser trabalhado para abrir este */
  from: number;
  missing: number;
}

/** Por que está trancado: qual andar abaixo ainda precisa de resolvidos. */
export function lockInfo(data: TowerData, progress: ProgressMap, slug: string): LockInfo | null {
  if (isOpen(data, progress, slug)) return null;
  const c = data.challenges.find((x) => x.slug === slug)!;
  const fs = floors(data, progress);
  const floor = floorOf(c);
  // O primeiro andar fechado abaixo do alvo é o que trava a subida.
  const from = fs.find((f) => f.n < floor && f.missingForNext > 0) ?? fs[floor - 2];
  return { floor, from: from.n, missing: from.missingForNext };
}

/** Passos de um detonado: o próximo é o primeiro com testes ainda não resolvido. */
export function trackNextStep(data: TowerData, progress: ProgressMap, trackId: string, after?: string): string | null {
  const t = data.tracks.find((x) => x.id === trackId);
  if (!t) return null;
  const bySlug = new Map(data.challenges.map((c) => [c.slug, c]));
  const pending = (s: string) => {
    const c = bySlug.get(s);
    return !!c && (!isScored(c) || !solved(progress, s));
  };
  const start = after ? t.steps.indexOf(after) + 1 : 0;
  return t.steps.slice(start).find(pending) ?? t.steps.find(pending) ?? null;
}

export function tracksDone(data: TowerData, progress: ProgressMap): number {
  const bySlug = new Map(data.challenges.map((c) => [c.slug, c]));
  return data.tracks.filter((t) => {
    const scored = t.steps.filter((s) => {
      const c = bySlug.get(s);
      return c && isScored(c);
    });
    return scored.length > 0 && scored.every((s) => solved(progress, s));
  }).length;
}

export interface NextStep {
  slug: string;
  /** detonado pelo qual chegamos a ele, se foi por um */
  trackId: string | null;
  reason: "track" | "floor" | "below";
}

/**
 * O que fazer agora. Prioridade: continuar um detonado já começado; depois o primeiro
 * desafio com testes ainda aberto no andar atual; depois qualquer um aberto abaixo.
 */
export function nextStep(data: TowerData, progress: ProgressMap, opts: { trackId?: string | null; after?: string } = {}): NextStep | null {
  const bySlug = new Map(data.challenges.map((c) => [c.slug, c]));
  const pendingScored = (slug: string) => {
    const c = bySlug.get(slug);
    return !!c && isScored(c) && !solved(progress, slug);
  };
  if (opts.trackId) {
    const s = trackNextStep(data, progress, opts.trackId, opts.after);
    if (s) return { slug: s, trackId: opts.trackId, reason: "track" };
  }
  // Detonado começado e não terminado: continua ele.
  for (const t of data.tracks) {
    const started = t.steps.some((s) => solved(progress, s));
    const s = started ? trackNextStep(data, progress, t.id) : null;
    if (s && pendingScored(s)) return { slug: s, trackId: t.id, reason: "track" };
  }
  const fs = floors(data, progress);
  const top = fs.filter((f) => f.open).length;
  for (let n = top; n >= 1; n--) {
    const c = data.challenges.find((x) => floorOf(x) === n && pendingScored(x.slug) && isOpen(data, progress, x.slug));
    if (c) return { slug: c.slug, trackId: null, reason: n === top ? "floor" : "below" };
  }
  return null;
}

/** Resolvidos com testes, no total. */
export function solvedCount(data: TowerData, progress: ProgressMap): number {
  return data.challenges.filter((c) => isScored(c) && solved(progress, c.slug)).length;
}

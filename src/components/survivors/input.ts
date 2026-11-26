// Teclado → ações. O jogo só lê ações ("left", "pause"...), nunca teclas: remapear é trocar
// esta tabela.
export type Action = "up" | "down" | "left" | "right" | "pause" | "confirm" | "transform" | "reroll" | "skip" | "banish" | "lock" | "mute" | "card1" | "card2" | "card3" | "card4";

export const BINDINGS: Record<Action, string[]> = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  pause: ["Escape", "KeyP"],
  confirm: ["Enter", "NumpadEnter"],
  transform: ["Space"],
  reroll: ["KeyR"],
  skip: ["KeyX"],
  banish: ["KeyB"],
  lock: ["KeyT"],
  mute: ["KeyM"],
  card1: ["Digit1", "Numpad1"],
  card2: ["Digit2", "Numpad2"],
  card3: ["Digit3", "Numpad3"],
  card4: ["Digit4", "Numpad4"],
};

const BY_CODE = new Map<string, Action>();
for (const [action, codes] of Object.entries(BINDINGS) as [Action, string[]][]) for (const c of codes) BY_CODE.set(c, action);

export class Keyboard {
  private held = new Set<Action>();
  private pressed: Action[] = []; // apertos desde o último consume(): nenhum se perde entre ticks

  constructor(private target: Window) {
    target.addEventListener("keydown", this.down);
    target.addEventListener("keyup", this.up);
    target.addEventListener("blur", this.clear);
  }

  dispose() {
    this.target.removeEventListener("keydown", this.down);
    this.target.removeEventListener("keyup", this.up);
    this.target.removeEventListener("blur", this.clear);
  }

  private down = (e: KeyboardEvent) => {
    const a = BY_CODE.get(e.code);
    if (!a) return;
    // não rouba teclas de campos de texto nem atalhos do navegador
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (!e.repeat) this.pressed.push(a);
    this.held.add(a);
  };
  private up = (e: KeyboardEvent) => {
    const a = BY_CODE.get(e.code);
    if (a) this.held.delete(a);
  };
  private clear = () => this.held.clear();

  isHeld(a: Action) {
    return this.held.has(a);
  }

  /** Ações apertadas desde a última chamada. */
  consume(): Action[] {
    const out = this.pressed;
    this.pressed = [];
    return out;
  }

  move() {
    return {
      mx: (this.held.has("right") ? 1 : 0) - (this.held.has("left") ? 1 : 0),
      my: (this.held.has("down") ? 1 : 0) - (this.held.has("up") ? 1 : 0),
    };
  }
}

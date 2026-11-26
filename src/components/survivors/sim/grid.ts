// Spatial hash dos inimigos: reconstruído a cada tick (barato com arrays tipados), serve para
// colisão de golpes, separação da horda e "inimigo mais próximo". Sem alocação no laço.
export class Grid {
  readonly cell: number;
  private readonly size: number; // células por lado da tabela (hash com wrap)
  private readonly head: Int32Array;
  private readonly next: Int32Array;

  constructor(cell: number, capacity: number, size = 128) {
    this.cell = cell;
    this.size = size;
    this.head = new Int32Array(size * size);
    this.next = new Int32Array(capacity);
  }

  private key(cx: number, cy: number) {
    const s = this.size;
    return (((cx % s) + s) % s) * s + (((cy % s) + s) % s);
  }

  clear() {
    this.head.fill(-1);
  }

  insert(i: number, x: number, y: number) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    this.next[i] = this.head[k];
    this.head[k] = i;
  }

  /** Chama fn(i) para cada item nas células que cobrem o círculo (x, y, r). fn devolve true para parar. */
  query(x: number, y: number, r: number, fn: (i: number) => boolean | void) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c),
      x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c),
      y1 = Math.floor((y + r) / c);
    // a tabela dá a volta: uma área maior que ela visitaria a mesma célula duas vezes
    const span = Math.min(x1 - x0, this.size - 1);
    const spanY = Math.min(y1 - y0, this.size - 1);
    for (let cx = x0; cx <= x0 + span; cx++)
      for (let cy = y0; cy <= y0 + spanY; cy++) {
        for (let i = this.head[this.key(cx, cy)]; i !== -1; i = this.next[i]) if (fn(i)) return;
      }
  }
}

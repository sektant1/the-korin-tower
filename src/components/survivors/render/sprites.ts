// Atlas de sprites gerado por scripts/survivors/build-atlas.mjs (public/assets/survivors/).
// Cada sprite tem animações (idle, move, cast, hurt...) com quadros [x, y, w, h] numa imagem do
// atlas; todos olham para a direita, ancorados no centro da base, e têm uma escala de exibição.
// Sem atlas (ou sem aquela chave), o renderizador desenha o placeholder.

type Ctx = CanvasRenderingContext2D;

export interface AnimData {
  img: number;
  fps: number;
  frames: [number, number, number, number, number?][]; // x, y, w, h, página (padrão: img)
}
export interface SpriteData {
  scale: number; // px do mundo por px da folha
  anims: Record<string, AnimData>;
}
interface AtlasJson {
  images: string[];
  sprites: Record<string, SpriteData>;
}

const BASE = "/assets/survivors/";
let atlas: AtlasJson | null = null;
let images: HTMLImageElement[] = [];
let whites: HTMLCanvasElement[] = [];
let loading = false;

export function loadSprites() {
  if (loading || typeof window === "undefined") return;
  loading = true;
  fetch(`${BASE}atlas.json`)
    .then((r) => (r.ok ? (r.json() as Promise<AtlasJson>) : null))
    .then((json) => {
      if (!json) return;
      const imgs = json.images.map((src) => {
        const img = new Image();
        img.src = BASE + src;
        return img;
      });
      return Promise.all(imgs.map((img) => img.decode().then(() => img))).then((ok) => {
        images = ok;
        // silhueta branca de cada página: o "pisca" de quem leva golpe
        whites = ok.map((img) => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const g = c.getContext("2d")!;
          g.drawImage(img, 0, 0);
          g.globalCompositeOperation = "source-in";
          g.fillStyle = "#ffffff";
          g.fillRect(0, 0, c.width, c.height);
          return c;
        });
        atlas = json;
      });
    })
    .catch(() => {
      /* sem atlas: placeholders */
    });
}

export function hasSprite(key: string) {
  return !!atlas?.sprites[key];
}

export function spriteHeight(key: string) {
  const s = atlas?.sprites[key];
  if (!s) return 0;
  const a = s.anims.idle ?? Object.values(s.anims)[0];
  return a ? a.frames[0][3] * s.scale : 0;
}

/**
 * Desenha `key` na animação `anim` (cai em idle) com os pés em (x, y). `t` é o relógio da
 * animação em s; `flip` espelha (olhando para a esquerda). Devolve false se não há sprite.
 */
export function drawSprite(ctx: Ctx, key: string, anim: string, t: number, x: number, y: number, flip: boolean, white = false, size = 1) {
  const s = atlas?.sprites[key];
  if (!s) return false;
  const a = s.anims[anim] ?? s.anims.idle ?? Object.values(s.anims)[0];
  if (!a) return false;
  const f = a.frames[Math.floor(t * a.fps) % a.frames.length];
  const pg = f[4] ?? a.img;
  const img = white ? whites[pg] : images[pg];
  if (!img) return false;
  const k = s.scale * size;
  const w = f[2] * k,
    h = f[3] * k;
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, f[0], f[1], f[2], f[3], -w / 2, -h, w, h);
    ctx.restore();
  } else ctx.drawImage(img, f[0], f[1], f[2], f[3], x - w / 2, y - h, w, h);
  return true;
}

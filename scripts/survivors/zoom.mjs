// Uso: node scripts/survivors/zoom.mjs <prévia.png> x y w h [escala=3] — recorta e amplia uma prévia.
import sharp from "sharp";
const [f, x, y, w, h, k = 3] = process.argv.slice(2);
await sharp(f).extract({ left: +x, top: +y, width: +w, height: +h }).resize(+w * +k, +h * +k, { kernel: "nearest" }).toFile(f.replace(/\.png$/, `-z${x}_${y}.png`));

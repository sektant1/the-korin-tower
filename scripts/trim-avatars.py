"""Gera os GIFs de avatar recortados em public/assets/avatars/.

Muitos sprites têm margem vazia (e o personagem anda pelo quadro), então o avatar
ficava minúsculo na moldura. Aqui calculamos a caixa que contém o personagem em
TODOS os quadros e cortamos o resto, mantendo animação, tempos e transparência.

    python3 scripts/trim-avatars.py

Rode de novo ao trocar um GIF em src/lib/avatars.ts (a lista SOURCES espelha lá).
"""
from pathlib import Path
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/dragon-ball-gifs"
OUT = ROOT / "public/assets/avatars"
PAD = 2

# arquivo de origem -> nome do avatar recortado
SOURCES = {
    "8.gif": "goku.gif",
    "goku.gif": "fighting-stance-goku.gif",
    "dragon-sphere-z.gif": "dragon-ball.gif",
    "gokuwon.gif": "super-saiyan-goku.gif",
    "k_fire.gif": "krillin.gif",
    "3a.gif": "future-trunks.gif",
    "Goku4kick.gif": "super-saiyan-4-goku.gif",
    "Gotenkspowerup.gif": "gotenks.gif",
    "piccalocape2.gif": "piccolo.gif",
    "transparente/t_ssj.gif": "super-saiyan-trunks.gif",
    "transparente/c_kickhd.gif": "cell.gif",
    "FUSION2.gif": "goten-and-trunks.gif",
    "GokuHDelectric.gif": "super-saiyan-2-goku.gif",
    "v_do.gif": "vegeta.gif",
    "transparente/b_powerup.gif": "bardock.gif",
    "gokukicks.gif": "flying-kick-goku.gif",
    "gokutyoken.gif": "kaioken-goku.gif",
    "grandattack.gif": "super-saiyan-gohan.gif",
    "b_push.gif": "majin-buu.gif",
    "bye16.gif": "android-16.gif",
    "k_flare.gif": "solar-flare-krillin.gif",
    "Goku3Kame.gif": "kamehameha-goku.gif",
    "Shenryuken4.gif": "dragon-fist-goku.gif",
}

# Região máxima (x0, y0, x1, y1) para sprites cujo golpe atravessa a tela inteira.
CLIP = {
    "Goku3Kame.gif": (0, 0, 135, 195),
}


def content_box(frame: Image.Image, bg):
    """Caixa do que não é fundo: transparente, ou a cor do canto (GIF sem transparência)."""
    rgba = frame.convert("RGBA")
    alpha_box = rgba.getchannel("A").point(lambda a: 255 if a > 0 else 0).getbbox()
    if bg is None:
        return alpha_box
    # fundo sólido: tudo que difere da cor do canto
    diff = Image.new("L", rgba.size, 0)
    px, dp = rgba.load(), diff.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and (abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])) > 40:
                dp[x, y] = 255
    return diff.getbbox()


def trim(src: Path, dst: Path):
    im = Image.open(src)
    frames = [f.copy() for f in ImageSequence.Iterator(im)]
    clip = CLIP.get(src.relative_to(SRC).as_posix())
    if clip:
        frames = [f.convert("RGBA").crop(clip) for f in frames]
    first = frames[0].convert("RGBA")
    corner = first.getpixel((0, 0))
    bg = None if corner[3] == 0 else corner[:3]  # canto opaco = GIF com fundo sólido
    boxes = [b for b in (content_box(f, bg) for f in frames) if b]
    if not boxes:
        raise SystemExit(f"{src.name}: nenhum pixel de personagem")
    x0 = max(0, min(b[0] for b in boxes) - PAD)
    y0 = max(0, min(b[1] for b in boxes) - PAD)
    fw, fh = frames[0].size
    x1 = min(fw, max(b[2] for b in boxes) + PAD)
    y1 = min(fh, max(b[3] for b in boxes) + PAD)
    durations = [f.info.get("duration", im.info.get("duration", 100)) for f in frames]
    out = [f.convert("RGBA").crop((x0, y0, x1, y1)) for f in frames]
    # Uma paleta só para a animação inteira (255 cores + o índice 255 transparente).
    # Paleta por quadro deixa o índice transparente inconsistente e o navegador
    # mostra quadros vazios ou fundo opaco.
    strip = Image.new("RGB", (out[0].width, out[0].height * len(out)))
    for i, f in enumerate(out):
        strip.paste(f.convert("RGB"), (0, i * f.height))
    palette = strip.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    flat = palette.getpalette()[: 255 * 3]
    # índice 255 = transparente; cor improvável para nenhum pixel real cair nele
    flat += [0] * (255 * 3 - len(flat)) + [255, 0, 254]
    palette.putpalette(flat)
    frames_p = []
    for f in out:
        q = f.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
        q.paste(255, mask=f.getchannel("A").point(lambda a: 255 if a < 128 else 0))
        frames_p.append(q)
    frames_p[0].save(
        dst,
        save_all=True,
        append_images=frames_p[1:],
        duration=durations,
        loop=im.info.get("loop", 0),
        transparency=255,
        disposal=2,
        optimize=False,
    )
    return x1 - x0, y1 - y0


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for src, name in SOURCES.items():
        w, h = trim(SRC / src, OUT / name)
        print(f'"{name}": [{w}, {h}],')

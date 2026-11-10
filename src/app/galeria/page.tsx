import type { Metadata } from "next";
import { FlameTitle, UnderConstruction, Window } from "@/components/Retro";
import { captionOf, getFanart, listGifArchive } from "@/lib/fanart";

export const metadata: Metadata = { title: "Galeria" };

export default async function GalleryPage() {
  const [{ gallery, banner, mascot }, archive] = await Promise.all([getFanart(), listGifArchive()]);
  const all = [banner, mascot, ...gallery].filter((x): x is string => Boolean(x));

  return (
    <>
      <FlameTitle>GALERIA</FlameTitle>

      <Window title="Fan art e imagens">
        {all.length ? (
          <ul className="gallery">
            {all.map((src) => (
              <li key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element -- GIFs animados, tamanho livre */}
                <img src={src} alt={captionOf(src)} loading="lazy" />
                <span>{captionOf(src)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p>
              Nenhuma imagem ainda. Coloque arquivos <code>.gif</code>, <code>.png</code>, <code>.jpg</code>, <code>.webp</code> ou{" "}
              <code>.svg</code> em <code>public/fanart/</code> e recarregue a página.
            </p>
            <p className="dim small">
              <code>banner.*</code> vai para o cabeçalho e <code>mascote.*</code> para o topo da home.
            </p>
            <UnderConstruction what="Galeria esperando suas imagens" />
          </>
        )}
      </Window>

      <Window title={`Arquivo de GIFs (${archive.length})`}>
        <ul className="gallery">
          {archive.map((src) => (
            <li key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element -- GIFs animados, tamanho livre */}
              <img src={src} alt={captionOf(src)} loading="lazy" />
              <span>{captionOf(src)}</span>
            </li>
          ))}
        </ul>
      </Window>

    </>
  );
}

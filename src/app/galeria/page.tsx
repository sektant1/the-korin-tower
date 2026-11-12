import type { Metadata } from "next";
import { FlameTitle, PageBanner, UnderConstruction, Window } from "@/components/Retro";
import { captionOf, getFanart, listGifArchive } from "@/lib/fanart";
import { PAGE_SCENES } from "@/lib/scenes";
import { GIFS } from "@/lib/gifs";

export const metadata: Metadata = { title: "Galeria" };

export default async function GalleryPage() {
  const [{ gallery, banner, mascot }, archive] = await Promise.all([getFanart(), listGifArchive()]);
  const all = [banner, mascot, ...gallery].filter((x): x is string => Boolean(x));

  return (
    <>
      <FlameTitle>GALERIA</FlameTitle>
      <PageBanner
        image={PAGE_SCENES.galeria}
        lead="Fan art da torre e o arquivo de GIFs do site."
        stats={[
          { n: all.length, label: "fan arts" },
          { n: archive.length, label: "GIFs" },
        ]}
        gif={GIFS.android18}
        gifHeight={90}
      />

      <Window title="Fan art">
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
          <UnderConstruction what="Nenhuma fan art ainda" />
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

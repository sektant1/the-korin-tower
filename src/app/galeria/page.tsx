import type { Metadata } from "next";
import {
  ALL_BUTTONS,
  ButtonWall,
  PageBanner,
  UnderConstruction,
  Window,
} from "@/components/Retro";
import { captionOf, getFanart, listGifArchive } from "@/lib/fanart";
import { PAGE_SCENES } from "@/lib/scenes";

export const metadata: Metadata = { title: "Galeria" };

export default async function GalleryPage() {
  const [{ gallery, banner, mascot }, archive] = await Promise.all([
    getFanart(),
    listGifArchive(),
  ]);
  const all = [banner, mascot, ...gallery].filter((x): x is string =>
    Boolean(x),
  );

  return (
    <>
      <PageBanner
        title="GALERIA"
        image={PAGE_SCENES.galeria}
        lead="Fanarts, botões 88x31 e os GIFs usados no site."
        stats={[
          { n: all.length, label: "fanarts" },
          { n: archive.length, label: "GIFs" },
          { n: ALL_BUTTONS.length, label: "botões" },
        ]}
      />

      <Window title="Art Gallery">
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
          <UnderConstruction what="Nenhuma art ainda" />
        )}
      </Window>

      <Window title={`Botões 88x31 (${ALL_BUTTONS.length})`}>
        <p className="dim small">
          Todos os botões do site, inclusive os que não aparecem nas laterais. Créditos em{" "}
          <a href="/buttons/CREDITS.txt">CREDITS.txt</a>.
        </p>
        <ButtonWall kinds={ALL_BUTTONS} className="buttons-88-all" />
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

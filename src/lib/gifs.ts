// Caminhos dos GIFs em public/assets/dragon-ball-gifs (fonte única).
// Os de transparente/ são cópias com o fundo branco/preto removido.
const BASE = "/assets/dragon-ball-gifs";
const T = `${BASE}/transparente`;

export interface Gif {
  src: string;
  w: number;
  h: number;
}

const g = (src: string, w: number, h: number): Gif => ({ src, w, h });

export const GIFS = {
  logo: g(`${T}/logo-dbz.gif`, 183, 65),
  sphere: g(`${BASE}/dragon-sphere-z.gif`, 50, 50),
  goku: g(`${BASE}/goku.gif`, 83, 72),
  gokuStand: g(`${BASE}/8.gif`, 77, 100),
  vegeta: g(`${BASE}/v_do.gif`, 151, 127),
  gokuSsj: g(`${BASE}/goku_ssjf.gif`, 500, 637),
  gokuKick: g(`${BASE}/g_kick.gif`, 91, 87),
  gokuKame: g(`${BASE}/g_kame.gif`, 256, 77),
  gokuDuo: g(`${BASE}/g_g.gif`, 200, 100),
  powerUp: g(`${T}/b_powerup.gif`, 137, 136),
  buuBlast: g(`${BASE}/BuuBlast.gif`, 234, 128),
  hell: g(`${BASE}/16_hell.gif`, 256, 90),
  cellKick: g(`${T}/c_kickhd.gif`, 147, 159),
  cellMeteor: g(`${T}/c_meteo.gif`, 155, 125),
  friezaDisc: g(`${BASE}/f_disc.gif`, 256, 87),
  brolyFire: g(`${BASE}/br_fire2.gif`, 319, 165),
  android18: g(`${BASE}/18_fire2.gif`, 320, 133),
  gokuWon: g(`${BASE}/gokuwon.gif`, 119, 144),
  gokuElectric: g(`${BASE}/GokuHDelectric.gif`, 106, 135),
  piccolo: g(`${BASE}/piccalocape2.gif`, 78, 127),
  krillinFlight: g(`${BASE}/k_flight.gif`, 242, 153),
  trunks: g(`${T}/t_ssj.gif`, 64, 105),
  gotenksPowerUp: g(`${BASE}/Gotenkspowerup.gif`, 106, 135),
  loading: g(`${BASE}/loading.gif`, 20, 20),
  guestbookButton: g(`${BASE}/GuestWorldbutton.gif`, 87, 31),
  navCommunity: g(`${BASE}/community.gif`, 150, 33),
  navDragonBall: g(`${BASE}/dragonball.gif`, 150, 33),
  navSite: g(`${BASE}/site.gif`, 150, 33),
} as const;

/** Arquivos que não entram na galeria: anúncio real, duplicata com fundo e a folha de sprites (cenário com chroma key, não é uma imagem pronta). */
export const GALLERY_SKIP = new Set(["alladvantage-bu2.gif", "logo-dbz.gif", "korin-tower.png"]);
export const GIF_DIR = "public/assets/dragon-ball-gifs";

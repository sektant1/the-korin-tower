#!/usr/bin/env python3
"""
Download GIF files linked from JKwok44's archived Dragon Ball GIF lists.

Source pages:
  https://web.archive.org/web/20001018130842/http://members.aol.com/jkwok44/gif/giflist.html
  https://web.archive.org/web/20001018152648/http://members.aol.com/jkwok44/gif/giflist2.html

Install:
  py -m pip install requests beautifulsoup4

Run from any directory:
  py download_korins_gifs.py
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

PAGES = [
    (
        "https://web.archive.org/web/20001018130842/http://members.aol.com/jkwok44/gif/giflist.html",
        "20001018130842",
    ),
    (
        "https://web.archive.org/web/20001018152648/http://members.aol.com/jkwok44/gif/giflist2.html",
        "20001018152648",
    ),
]

# Script location: <project>/scrapper/download_korins_gifs.py
# Output: <project>/public/assets/dragon-ball-gifs/
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "assets" / "dragon-ball-gifs"
DELAY_SECONDS = 1.0
TIMEOUT = (15, 60)
MAX_RETRIES = 1

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; archival-personal-scraper/1.0)"
})


def get(url: str) -> requests.Response:
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(url, timeout=TIMEOUT)
            if response.status_code == 429 or response.status_code >= 500:
                wait = min(60, 2 ** attempt * 2)
                print(f"  HTTP {response.status_code}; aguardando {wait}s: {url}")
                time.sleep(wait)
                continue
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            wait = min(60, 2 ** attempt * 2)
            print(f"  Erro ({exc}); nova tentativa em {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Falha após {MAX_RETRIES} tentativas: {url}") from last_error


def unwrap_wayback(url: str) -> str:
    """Turn a Wayback replay URL back into its original URL."""
    match = re.search(r"web\.archive\.org/web/\d+(?:id_|if_|im_)?/(https?://.+)$", url)
    return match.group(1) if match else url


def is_gif_url(url: str) -> bool:
    path = unquote(urlparse(unwrap_wayback(url)).path).lower()
    return path.endswith(".gif")


def safe_filename(url: str, index: int) -> str:
    path_name = Path(unquote(urlparse(unwrap_wayback(url)).path)).name
    path_name = re.sub(r"[^A-Za-z0-9._-]+", "_", path_name).strip("._")
    if not path_name or not path_name.lower().endswith(".gif"):
        path_name = f"gif_{index:03d}.gif"
    return path_name[:150]


def replay_url(original_url: str, timestamp: str) -> str:
    original_url = unwrap_wayback(original_url)
    return f"https://web.archive.org/web/{timestamp}id_/{original_url}"


def collect_gif_links(page_url: str, timestamp: str) -> list[str]:
    print(f"[PAGE] {page_url}")
    html = get(page_url).text
    soup = BeautifulSoup(html, "html.parser")
    found = []

    # GIFs linked by the list entries, plus GIFs used as image elements.
    for tag in soup.find_all(["a", "img"]):
        attr = "href" if tag.name == "a" else "src"
        value = tag.get(attr)
        if not value:
            continue
        absolute = urljoin(page_url, value.strip())
        original = unwrap_wayback(absolute)
        if is_gif_url(original):
            found.append(original)

    # De-duplicate while retaining order.
    return list(dict.fromkeys(found))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_links: list[tuple[str, str]] = []

    for page_url, timestamp in PAGES:
        try:
            links = collect_gif_links(page_url, timestamp)
            print(f"  GIFs encontrados nesta página: {len(links)}")
            all_links.extend((link, timestamp) for link in links)
        except Exception as exc:
            print(f"[ERRO] Não foi possível ler a página: {exc}")

    # De-duplicate by original URL; keep the first page's capture timestamp.
    unique: dict[str, str] = {}
    for link, timestamp in all_links:
        unique.setdefault(link, timestamp)

    print(f"\nTotal de URLs GIF únicas: {len(unique)}")
    manifest = []
    used_names: set[str] = set()
    success = 0

    for index, (original_url, timestamp) in enumerate(unique.items(), start=1):
        name = safe_filename(original_url, index)
        stem, suffix = Path(name).stem, Path(name).suffix
        candidate = name
        serial = 2
        while candidate.lower() in used_names:
            candidate = f"{stem}_{serial}{suffix}"
            serial += 1
        name = candidate
        used_names.add(name.lower())

        destination = OUTPUT_DIR / name
        if destination.exists() and destination.stat().st_size > 0:
            print(f"[EXISTS] {name}")
            success += 1
            manifest.append({
                "filename": name, "original_url": original_url,
                "archive_timestamp": timestamp, "status": "already_present",
                "bytes": destination.stat().st_size,
            })
            continue

        archive_url = replay_url(original_url, timestamp)
        try:
            response = get(archive_url)
            content_type = response.headers.get("Content-Type", "").lower()
            data = response.content

            # Avoid saving Wayback error pages or HTML responses with a .gif suffix.
            if "text/html" in content_type or not data:
                raise ValueError(f"Resposta não parece ser GIF (Content-Type: {content_type})")
            if not (data[:6] in (b"GIF87a", b"GIF89a")):
                raise ValueError("O conteúdo recebido não possui assinatura GIF87a/GIF89a")

            destination.write_bytes(data)
            digest = hashlib.sha256(data).hexdigest()
            success += 1
            print(f"[{index}/{len(unique)}] OK {name} ({len(data):,} bytes)")
            manifest.append({
                "filename": name, "original_url": original_url,
                "archive_timestamp": timestamp, "status": "downloaded",
                "bytes": len(data), "sha256": digest,
            })
        except Exception as exc:
            print(f"[{index}/{len(unique)}] FALHOU {name}: {exc}")
            manifest.append({
                "filename": name, "original_url": original_url,
                "archive_timestamp": timestamp, "status": "failed",
                "error": str(exc),
            })
        time.sleep(DELAY_SECONDS)

    (OUTPUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUTPUT_DIR / "CREDITS.txt").write_text(
        "Arquivos coletados das listas arquivadas de JKwok44.\n"
        "As páginas originais solicitam que os criadores dos GIFs recebam crédito.\n"
        "Consulte manifest.json para URL de origem e timestamp de cada arquivo.\n"
        "Os direitos dos GIFs pertencem aos respectivos criadores e/ou titulares.\n",
        encoding="utf-8",
    )

    print("\nConcluído.")
    print(f"Baixados/já existentes: {success}/{len(unique)}")
    print(f"Falhas: {len(unique) - success}")
    print(f"Diretório: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

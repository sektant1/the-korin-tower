#!/usr/bin/env python3
"""Download GIFs listed by the archived AOL pages and package them into a ZIP.

Run from the scrapper directory:
    py download_korin_gifs.py

Output:
    ../public/assets/dragon-ball-gifs/   extracted files + manifest + credits
    ../public/assets/dragon-ball-gifs.zip
"""

from __future__ import annotations

import json
import re
import sys
import time
import zipfile
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

import requests

TARGET_DATE = "20001018130842"
BASE_ORIGINAL = "http://members.aol.com/jkwok44/"
CDX_URL = "https://web.archive.org/cdx/search/cdx"
WAYBACK_RAW = "https://web.archive.org/web/{timestamp}id_/{url}"
LIST_PAGES = [
    "https://web.archive.org/web/20001018130842id_/http://members.aol.com/jkwok44/gif/giflist.html",
    "https://web.archive.org/web/20001018130842id_/http://members.aol.com/jkwok44/gif/giflist2.html",
]

SCRIPT_DIR = Path(__file__).resolve().parent
ASSET_ROOT = (SCRIPT_DIR / ".." / "public" / "assets").resolve()
OUTPUT_DIR = ASSET_ROOT / "dragon-ball-gifs"
ZIP_PATH = ASSET_ROOT / "dragon-ball-gifs.zip"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; personal-archive-downloader/1.0; contact: local-user)"
})


def request_with_retry(url: str, *, params=None, timeout=60, stream=False):
    for attempt in range(7):
        try:
            response = SESSION.get(url, params=params, timeout=timeout, stream=stream)
            if response.status_code == 429 or 500 <= response.status_code < 600:
                wait = min(90, 4 * (2 ** attempt))
                retry_after = response.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    wait = max(wait, int(retry_after))
                response.close()
                print(f"[retry] HTTP {response.status_code}; waiting {wait}s")
                time.sleep(wait)
                continue
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            if attempt == 6:
                raise
            wait = min(90, 3 * (2 ** attempt))
            print(f"[retry] {exc}; waiting {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Could not fetch {url}")


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ("href", "src", "data-src"):
            value = attrs.get(key)
            if value:
                self.links.append(value.strip())


def is_gif(url: str) -> bool:
    path = urlparse(url).path.lower()
    return path.endswith(".gif")


def normalize_original(url: str) -> str:
    url = url.strip()
    if url.startswith("//"):
        url = "http:" + url
    if url.startswith("/"):
        url = urljoin(BASE_ORIGINAL, url)
    return url


def is_in_target_site(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.hostname is not None and parsed.hostname.lower() == "members.aol.com" and parsed.path.lower().startswith("/jkwok44/")


def timestamp_distance(ts: str) -> int:
    # Lexicographic date distance is sufficient after parsing YYYYMMDDhhmmss.
    from datetime import datetime
    try:
        a = datetime.strptime(ts, "%Y%m%d%H%M%S")
        b = datetime.strptime(TARGET_DATE, "%Y%m%d%H%M%S")
        return abs(int((a - b).total_seconds()))
    except ValueError:
        return 10**18


def query_cdx(prefix: str) -> list[dict]:
    params = {
        "url": prefix,
        "matchType": "prefix",
        "output": "json",
        "fl": "original,timestamp,mimetype,statuscode,digest,length",
        "filter": "statuscode:200",
        "limit": "100000",
        "gzip": "false",
    }
    print(f"[CDX] {prefix}")
    response = request_with_retry(CDX_URL, params=params)
    payload = response.json()
    if not payload:
        return []
    # CDX JSON begins with a field-name row.
    rows = payload[1:] if isinstance(payload[0], list) and payload[0][0] == "original" else payload
    records = []
    for row in rows:
        if not isinstance(row, list) or len(row) < 4:
            continue
        original, timestamp, mimetype, status = row[:4]
        if str(status) != "200":
            continue
        records.append({
            "original": original,
            "timestamp": timestamp,
            "mimetype": mimetype,
            "statuscode": status,
            "digest": row[4] if len(row) > 4 else "",
            "length": row[5] if len(row) > 5 else "",
        })
    print(f"[CDX] {len(records)} successful captures")
    time.sleep(3)
    return records


def choose_best_capture(records: list[dict]) -> dict:
    return min(records, key=lambda r: timestamp_distance(r["timestamp"]))


def parse_list_pages() -> set[str]:
    discovered = set()
    for page_url in LIST_PAGES:
        print(f"[HTML] Reading {page_url}")
        response = request_with_retry(page_url)
        parser = LinkParser()
        parser.feed(response.text)
        for raw in parser.links:
            candidate = normalize_original(urljoin(page_url, raw))
            # urljoin against a Wayback replay URL can retain the archive host;
            # translate replay links back to their original AOL URL.
            match = re.search(r"/web/\d{1,14}(?:id_)?/(https?://.*)$", candidate)
            if match:
                candidate = match.group(1)
            candidate = candidate.split("#", 1)[0]
            if is_gif(candidate) and is_in_target_site(candidate):
                discovered.add(candidate)
        time.sleep(3)
    print(f"[HTML] {len(discovered)} GIF links found in the two list pages")
    return discovered


def safe_filename(original_url: str) -> str:
    parsed = urlparse(original_url)
    path = unquote(parsed.path).replace("\\", "/")
    name = Path(path).name or "image.gif"
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    # Keep duplicate basenames from different subfolders distinct.
    parent = Path(path).parent.name
    if parent and parent.lower() != "gif":
        name = f"{parent}_{name}"
    return name


def main():
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    listed_gifs = parse_list_pages()

    # Query the GIF directory directly as a second source. CDX prefix matching
    # returns archived resources under this path; it is documented by IA.
    cdx_records = query_cdx("members.aol.com/jkwok44/gif/")
    cdx_records += query_cdx("members.aol.com/JKwok44/gif/")

    grouped = defaultdict(list)
    for record in cdx_records:
        original = record["original"]
        if is_gif(original) and is_in_target_site(original):
            grouped[original].append(record)

    # Prefer the closest capture to the requested 2000 date for each URL.
    selected = {url: choose_best_capture(items) for url, items in grouped.items()}

    # For GIFs found in the lists but absent from the directory CDX response,
    # ask CDX for that exact URL's capture history.
    missing = sorted(listed_gifs - set(selected))
    for index, original in enumerate(missing, 1):
        print(f"[CDX exact] {index}/{len(missing)} {original}")
        records = query_cdx(original.replace("http://", "").replace("https://", ""))
        records = [r for r in records if r["original"].rstrip("/").lower() == original.rstrip("/").lower()]
        if records:
            selected[original] = choose_best_capture(records)

    # Include only assets that are actually referenced by the list pages or
    # that are indexed as GIFs inside the site's /gif/ directory.
    print(f"\n[RESULT] {len(selected)} unique GIF URLs selected")
    manifest = []
    used_names = set()
    downloaded = 0
    failed = []

    for index, (original, record) in enumerate(sorted(selected.items()), 1):
        filename = safe_filename(original)
        stem, suffix = Path(filename).stem, Path(filename).suffix
        candidate = filename
        counter = 2
        while candidate.lower() in used_names:
            candidate = f"{stem}_{counter}{suffix}"
            counter += 1
        filename = candidate
        used_names.add(filename.lower())
        destination = OUTPUT_DIR / filename
        archive_url = WAYBACK_RAW.format(timestamp=record["timestamp"], url=original)
        print(f"[{index}/{len(selected)}] {filename}")
        try:
            if destination.exists() and destination.stat().st_size > 0:
                size = destination.stat().st_size
            else:
                response = request_with_retry(archive_url, timeout=90, stream=True)
                content_type = response.headers.get("Content-Type", "").lower()
                chunks = []
                total = 0
                for chunk in response.iter_content(chunk_size=64 * 1024):
                    if chunk:
                        chunks.append(chunk)
                        total += len(chunk)
                data = b"".join(chunks)
                if not data or (b"<html" in data[:500].lower() and "image/gif" not in content_type):
                    raise ValueError(f"Response does not look like a GIF (Content-Type: {content_type})")
                if not data.startswith((b"GIF87a", b"GIF89a")):
                    raise ValueError(f"Downloaded content is not a GIF (Content-Type: {content_type})")
                destination.write_bytes(data)
                size = len(data)
                time.sleep(2)
            downloaded += 1
            manifest.append({
                "filename": filename,
                "original_url": original,
                "archive_url": archive_url,
                "timestamp": record["timestamp"],
                "bytes": size,
            })
        except Exception as exc:
            failed.append({"url": original, "error": str(exc)})
            print(f"  [FAILED] {exc}")

    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps({
        "target_date": TARGET_DATE,
        "source_pages": LIST_PAGES,
        "downloaded_count": downloaded,
        "failed": failed,
        "files": manifest,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    credits_path = OUTPUT_DIR / "CREDITS.txt"
    credits_path.write_text(
        "Archived GIF collection\n"
        "Source list pages:\n" + "\n".join(LIST_PAGES) + "\n\n"
        "Original source directory: http://members.aol.com/jkwok44/gif/\n"
        "Archive target date: " + TARGET_DATE + "\n\n"
        "The files may be subject to their respective creators' copyright. "
        "This archive preserves the source URLs and capture timestamps in manifest.json.\n",
        encoding="utf-8",
    )

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in sorted(OUTPUT_DIR.iterdir()):
            if file_path.is_file():
                archive.write(file_path, arcname=f"dragon-ball-gifs/{file_path.name}")

    print("\n========== DONE ==========")
    print(f"Downloaded/available: {downloaded}")
    print(f"Failed: {len(failed)}")
    print(f"Folder: {OUTPUT_DIR}")
    print(f"ZIP: {ZIP_PATH}")
    if failed:
        print("Some GIFs could not be retrieved. Details are in manifest.json.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        sys.exit(130)
    except Exception as exc:
        print(f"\nFATAL: {exc}", file=sys.stderr)
        sys.exit(1)

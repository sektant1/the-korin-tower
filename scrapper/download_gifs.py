
import hashlib
import re
import time
from collections import deque
from pathlib import Path
from urllib.parse import unquote, urlencode, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ============================================================
# CONFIGURATION
# ============================================================

TARGET_DATE = "20001019015201"

CDX_URL = "https://web.archive.org/cdx/search/cdx"

OUTPUT = Path("../public/assets").resolve()
OUTPUT.mkdir(parents=True, exist_ok=True)

REQUEST_DELAY = 3
MAX_RETRIES = 8
MAX_PAGES = 10000

# Legacy AOL address variations
ROOTS = [
    "http://members.aol.com/Jkwok44/",
    "http://members.aol.com/jkwok44/",
    "http://members.aol.com:80/Jkwok44/",
    "http://members.aol.com:80/jkwok44/",
    "https://members.aol.com/Jkwok44/",
    "https://members.aol.com/jkwok44/",
]

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
})

visited_pages = set()
page_queue = deque()
gif_urls = {}


# ============================================================
# HTTP
# ============================================================

def request(url, retries=MAX_RETRIES):

    for attempt in range(retries):

        try:
            response = SESSION.get(
                url,
                timeout=60
            )

            if response.status_code == 429:

                retry = response.headers.get("Retry-After")

                wait = (
                    int(retry)
                    if retry and retry.isdigit()
                    else min(60 * (attempt + 1), 600)
                )

                print(f"[429] Waiting {wait}s")
                time.sleep(wait)
                continue

            if response.status_code in (500, 502, 503, 504):
                time.sleep(min(15 * (attempt + 1), 120))
                continue

            response.raise_for_status()

            time.sleep(REQUEST_DELAY)
            return response

        except requests.RequestException as error:

            print(f"[RETRY] {error}")
            time.sleep(min(15 * (attempt + 1), 120))

    print(f"[FAILED] {url}")
    return None


# ============================================================
# CDX API
# ============================================================

def get_cdx_records():

    records = {}

    queries = [
        {
            "url": "members.aol.com",
            "matchType": "host",
        },
        {
            "url": "members.aol.com/jkwok44/",
            "matchType": "prefix",
        },
        {
            "url": "members.aol.com/Jkwok44/",
            "matchType": "prefix",
        },
        {
            "url": "members.aol.com:80/Jkwok44/",
            "matchType": "prefix",
        },
        {
            "url": "members.aol.com:80/jkwok44/",
            "matchType": "prefix",
        },
    ]

    for query in queries:

        params = {
            **query,
            "output": "json",
            "filter": "statuscode:200",
            "fl": "original,timestamp,mimetype,statuscode",
            "limit": "100000",
        }

        url = CDX_URL + "?" + urlencode(params)

        print(f"\n[CDX] Querying {query['url']}")

        response = request(url)

        if not response:
            continue

        try:
            data = response.json()
        except ValueError:
            print("[CDX] Invalid JSON response")
            print(response.text[:500])
            continue

        if not isinstance(data, list) or len(data) <= 1:
            print("[CDX] No records returned")
            continue

        for row in data[1:]:

            if len(row) < 3:
                continue

            original, timestamp, mimetype = row[:3]

            # Only resources belonging to the target directory
            parsed = urlparse(original)
            path = parsed.path.lower()

            if "jkwok44" not in path and "jkwok44" not in original.lower():
                continue

            records.setdefault(original, []).append({
                "timestamp": timestamp,
                "mimetype": mimetype,
            })

        print(f"[CDX] Total collected: {len(records)}")

    if not records:
        print("\n[DEBUG] CDX returned no matching resources.")
        print("Try opening this URL in your browser:")
        print(
            "https://web.archive.org/cdx/search/cdx?"
            "url=members.aol.com&matchType=host&output=json&limit=10"
        )

        raise RuntimeError(
            "No archived resources found. "
            "Check CDX availability and the diagnostic URL."
        )

    return records


def closest_capture(captures):

    return min(
        captures,
        key=lambda item: abs(
            int(item["timestamp"]) - int(TARGET_DATE)
        )
    )


# ============================================================
# URL HELPERS
# ============================================================

def normalize_url(url):

    return url.split("#")[0].strip()


def is_internal(url):

    host = (urlparse(url).hostname or "").lower()

    return host in (
        "members.aol.com",
        "www.members.aol.com",
    )


def is_gif(url):

    return urlparse(url).path.lower().endswith(".gif")


def is_html(url):

    path = urlparse(url).path.lower()

    return (
        path.endswith(".html")
        or path.endswith(".htm")
        or path.endswith("/")
    )


def archive_url(timestamp, original):

    return (
        f"https://web.archive.org/web/"
        f"{timestamp}id_/{original}"
    )


# ============================================================
# HTML EXTRACTION
# ============================================================

def extract_resources(html, page_url):

    soup = BeautifulSoup(html, "html.parser")

    links = set()

    for tag in soup.find_all(
        ["a", "img", "source", "iframe", "frame"]
    ):

        for attribute in ("href", "src"):

            value = tag.get(attribute)

            if value:
                links.add(urljoin(page_url, value))

        srcset = tag.get("srcset", "")

        for item in srcset.split(","):

            candidate = item.strip().split(" ")[0]

            if candidate:
                links.add(urljoin(page_url, candidate))

    # CSS inline
    for tag in soup.find_all(style=True):

        for match in re.findall(
            r"url\(['\"]?([^'\")]+)",
            tag["style"],
            re.IGNORECASE
        ):
            links.add(urljoin(page_url, match))

    # CSS stylesheets embedded in HTML
    for tag in soup.find_all("style"):

        if tag.string:

            for match in re.findall(
                r"url\(['\"]?([^'\")]+)",
                tag.string,
                re.IGNORECASE
            ):
                links.add(urljoin(page_url, match))

    return {
        normalize_url(link)
        for link in links
        if urlparse(link).scheme in ("http", "https")
    }


# ============================================================
# CRAWLER
# ============================================================

def crawl_page(url, timestamp):

    if url in visited_pages:
        return

    visited_pages.add(url)

    print(f"\n[PAGE {len(visited_pages)}] {url}")

    response = request(
        archive_url(timestamp, url)
    )

    if not response:
        return

    content_type = response.headers.get(
        "Content-Type", ""
    ).lower()

    if "html" not in content_type:
        return

    resources = extract_resources(
        response.text,
        url
    )

    for resource in resources:

        if is_gif(resource):

            gif_urls.setdefault(
                resource,
                timestamp
            )

        elif is_internal(resource) and is_html(resource):

            if resource not in visited_pages:
                page_queue.append(
                    (resource, timestamp)
                )

    print(f"  Resources: {len(resources)}")
    print(f"  GIFs discovered: {len(gif_urls)}")


# ============================================================
# DOWNLOAD
# ============================================================

def safe_filename(url):

    name = unquote(
        Path(urlparse(url).path).name
    )

    if not name:
        name = "image.gif"

    name = re.sub(
        r'[<>:"/\\|?*]',
        "_",
        name
    )

    digest = hashlib.sha1(
        url.encode()
    ).hexdigest()[:8]

    return f"{Path(name).stem}_{digest}.gif"


def download_gif(original, timestamp):

    destination = OUTPUT / safe_filename(original)

    if destination.exists():

        if destination.read_bytes().startswith(b"GIF8"):
            print(f"[EXISTS] {destination.name}")
            return True

    response = request(
        archive_url(timestamp, original)
    )

    if not response:
        return False

    content = response.content

    if not content.startswith(b"GIF8"):

        print(f"[INVALID] {original}")
        return False

    destination.write_bytes(content)

    print(
        f"[DOWNLOADED] {destination.name} "
        f"({len(content):,} bytes)"
    )

    return True


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("AOL WAYBACK GIF ARCHIVER")
    print("=" * 60)

    print(f"Output: {OUTPUT}")
    print(f"Target date: {TARGET_DATE}")

    records = get_cdx_records()

    print(f"\n[CDX] {len(records)} resources found")

    # Queue all discovered HTML pages
    for original, captures in records.items():

        capture = closest_capture(captures)

        if "html" in capture["mimetype"].lower():

            page_queue.append((
                original,
                capture["timestamp"]
            ))

        elif is_gif(original):

            gif_urls[original] = capture["timestamp"]

    # Queue the original known pages as a fallback
    for root in ROOTS:

        for page in range(1, 100):

            url = urljoin(
                root,
                f"gif{page}.html"
            )

            if url not in visited_pages:
                page_queue.append((
                    url,
                    TARGET_DATE
                ))

    # Crawl pages
    while page_queue:

        if len(visited_pages) >= MAX_PAGES:
            print("[LIMIT] Maximum page count reached")
            break

        url, timestamp = page_queue.popleft()

        if url in visited_pages:
            continue

        crawl_page(
            url,
            timestamp
        )

    # Download GIFs
    print("\n" + "=" * 60)
    print("DOWNLOADING")
    print("=" * 60)

    total = len(gif_urls)
    downloaded = 0

    for index, (original, timestamp) in enumerate(
        gif_urls.items(),
        1
    ):

        print(f"\n[{index}/{total}] {original}")

        if download_gif(original, timestamp):
            downloaded += 1

    print("\n" + "=" * 60)
    print("RESULT")
    print("=" * 60)

    print(f"Pages inspected: {len(visited_pages)}")
    print(f"GIFs discovered: {total}")
    print(f"GIFs downloaded/existing: {downloaded}")
    print(f"Destination: {OUTPUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()


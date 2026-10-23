#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_geetapress_covers.py -- cover images for Gita Press books that have none, taken from the publisher's own shops (https://geetapress.org, and the older https://gitapress.org whose catalogue has English titles only).

tools/data/geetapress_cover_map.json says which of our books is which shop product (title match, checked by hand):
    { "<book>.html": { "code": ..., "slug": ..., "image": "/uploads/media....webp", "siteTitle": "...", "host": "https://gitapress.org" (default geetapress.org) } }

For every book in that map that has no cover yet the script
  * downloads the product's first picture (the front cover),
  * shrinks it to 600 px wide and < 60 KB as .webp -> assets/covers/<slug>.webp  (slug as tools/book_converter.py makes it),
  * adds the book to COVER_OVERRIDES in swadhyay-app.js (one write at the end).
Books that already have a cover are left alone.

    python tools/import_geetapress_covers.py            # dry run: what would be fetched
    python tools/import_geetapress_covers.py --apply
"""
import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from book_converter import devanagari_to_slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "swadhyay-app.js"
COVERS = ROOT / "assets" / "covers"
MAP = ROOT / "tools" / "data" / "geetapress_cover_map.json"
SITE = "https://geetapress.org"
MAX_KB, WIDTH = 60, 600


def download(path, host=SITE):
    req = urllib.request.Request(host + path, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("download failed: " + path)


def shrink(raw):
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    for q in (82, 74, 66, 58, 50, 42, 34):
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= MAX_KB * 1024:
            return buf.getvalue(), im.size, q
    # still too big: scale down further
    while im.width > 360:
        im = im.resize((int(im.width * 0.88), int(im.height * 0.88)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=50, method=6)
        if buf.tell() <= MAX_KB * 1024:
            return buf.getvalue(), im.size, 50
    return buf.getvalue(), im.size, 50


def covered_files(text):
    b0 = text.index("var COVER_OVERRIDES = {")
    b1 = text.index("};", b0)
    import re
    return set(re.findall(r'"([^"]+\.html)"\s*:', text[b0:b1]))


def write(p, s):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8") if isinstance(s, str) else s)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    apply = "--apply" in sys.argv
    mp = json.loads(MAP.read_text(encoding="utf-8"))
    text = APP_JS.read_bytes().decode("utf-8")
    have = covered_files(text)
    todo = [f for f in mp if f not in have]
    print("in map: %d | already covered: %d | to fetch: %d" % (len(mp), len(mp) - len(todo), len(todo)))
    if not apply:
        return
    COVERS.mkdir(parents=True, exist_ok=True)
    used = {p.stem for p in COVERS.iterdir()}
    entries, sizes = [], []
    for n, f in enumerate(todo, 1):
        slug = devanagari_to_slug(f[:-5])
        base, k = slug, 2
        while slug in used:
            slug = "%s-%d" % (base, k)
            k += 1
        used.add(slug)
        try:
            data, size, q = shrink(download(mp[f]["image"], mp[f].get("host", SITE)))
        except Exception as e:
            print("  FAILED", f, e)
            continue
        write(COVERS / (slug + ".webp"), data)
        entries.append('    "%s": "assets/covers/%s.webp",' % (f, slug))
        sizes.append(len(data) / 1024)
        print("  %3d/%d %-50s %s %dx%d q%d %.1f KB" % (n, len(todo), f[:-5][:48], slug, size[0], size[1], q, len(data) / 1024))
        time.sleep(0.15)
    marker = "var COVER_OVERRIDES = {\n"
    nl = "\r\n" if "\r\n" in text else "\n"
    marker = "var COVER_OVERRIDES = {" + nl
    i = text.index(marker) + len(marker)
    text = text[:i] + nl.join(entries) + nl + text[i:]
    write(APP_JS, text)
    print("added %d covers | avg %.1f KB | max %.1f KB" % (len(entries), sum(sizes) / max(1, len(sizes)), max(sizes or [0])))


if __name__ == "__main__":
    main()

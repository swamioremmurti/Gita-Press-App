#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
link_sachche_images.py -- put the 23 pictures of "सच्चे और ईमानदार बालक" into the book.

The book's HTML already has the 23 picture paragraphs (<img src="image/Untitled.png%20N_fmt.png">, N = 1 .. 23) at the right place in each story; the
files themselves (NNNNN-image-NNNNN.png of the converted folder, N-th file = N-th picture) are optimised to <= 200 KB (book_converter.optimize_image),
saved as image/sachche-eemaandaar-baalak-NN.jpg and linked.  The export's own <style> block and ": प्रथम पृष्ठ" in the title are dropped (the reader
uses master.css only).

    python tools/link_sachche_images.py "<converted images folder>"
"""
import re
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "सच्चे और ईमानदार बालक"
BOOK = BOOKS / (NAME + ".html")
IMG_DIR = BOOKS / "image"
BACKUP = ROOT / "backups" / "before-sachche-images"
DATA_JS = ROOT / "swadhyay-data.js"


def write(p, data):
    data = data if isinstance(data, bytes) else data.encode("utf-8")
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(data)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    pics = sorted(Path(sys.argv[1]).glob("*.png"))
    s = BOOK.read_text(encoding="utf-8")
    refs = re.findall(r'<img[^>]*src="image/Untitled\.png%20(\d+)_fmt\.png"[^>]*>', s)
    if [int(x) for x in refs] != list(range(1, len(refs) + 1)) or len(refs) != len(pics):
        raise SystemExit("%d picture paragraphs (%s), %d files" % (len(refs), refs[:3], len(pics)))
    BACKUP.mkdir(parents=True, exist_ok=True)
    if not (BACKUP / BOOK.name).exists():
        shutil.copy2(BOOK, BACKUP / BOOK.name)

    total = 0

    def img(m):
        nonlocal total
        n = int(m.group(1))
        blob, ext = bc.optimize_image(pics[n - 1].read_bytes(), ".png", 200 * 1024)
        name = "sachche-eemaandaar-baalak-%02d%s" % (n, ext)
        write(IMG_DIR / name, blob)
        total += len(blob)
        return '<img class="frame-1" src="image/%s" alt="">' % name
    s = re.sub(r'<img[^>]*src="image/Untitled\.png%20(\d+)_fmt\.png"[^>]*>', img, s)

    s = re.sub(r"<title>[^<]*</title>", "<title>%s</title>" % NAME, s)
    s = re.sub(r"\s*<style>.*?</style>", "", s, count=1, flags=re.S)
    write(BOOK, s)
    size = round(BOOK.stat().st_size / 1024, 1)
    print("linked", len(pics), "pictures, %.1f MB" % (total / 1048576), "| book %.1f KB" % size)

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])


if __name__ == "__main__":
    main()

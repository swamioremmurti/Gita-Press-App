#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
set_cover_from_image.py -- make an image the cover of a book: white borders cropped, 600 px wide (smaller if needed), < 60 KB .webp in
assets/covers/<slug>.webp, and the book's entry in COVER_OVERRIDES (swadhyay-app.js) added or pointed at the new file.

    python tools/set_cover_from_image.py "<image>" "<book file>.html"
"""
import io
import re
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from book_converter import devanagari_to_slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "swadhyay-app.js"
COVERS = ROOT / "assets" / "covers"


def write(p, data):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(data)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    src, book = Path(sys.argv[1]), sys.argv[2]
    if not book.endswith(".html"):
        book += ".html"
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(int)
    white = (a > 228).all(axis=-1)
    cols, rows = white.mean(axis=0), white.mean(axis=1)
    x0, x1 = int(np.argmax(cols < 0.5)), len(cols) - int(np.argmax(cols[::-1] < 0.5))
    y0, y1 = int(np.argmax(rows < 0.5)), len(rows) - int(np.argmax(rows[::-1] < 0.5))
    c = im.crop((x0, y0, x1, y1))
    for wd in (600, 560, 520, 480, 440, 400):
        r = c.resize((wd, round(c.height * wd / c.width)), Image.LANCZOS) if c.width > wd else c
        for q in (82, 74, 66, 58, 50, 42, 34):
            buf = io.BytesIO()
            r.save(buf, "WEBP", quality=q, method=6)
            if buf.tell() <= 60 * 1024:
                break
        if buf.tell() <= 60 * 1024:
            break
    text = APP_JS.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in text else "\n"
    mk = "var COVER_OVERRIDES = {" + nl
    b0 = text.index(mk)
    b1 = text.index("};", b0)
    m = re.search(r'"' + re.escape(book) + r'"\s*:\s*"(assets/covers/[^"]+)"', text[b0:b1])
    if m:
        rel = m.group(1)
    else:
        rel = "assets/covers/%s.webp" % devanagari_to_slug(book[:-5])
        i = b0 + len(mk)
        text = text[:i] + '    "%s": "%s",' % (book, rel) + nl + text[i:]
        write(APP_JS, text.encode("utf-8"))
    out = ROOT / rel
    if out.suffix != ".webp":                      # an older .jpg/.png cover: the entry keeps its path, so write the same format
        buf = io.BytesIO()
        r.save(buf, "JPEG" if out.suffix == ".jpg" else "PNG", quality=85)
    write(out, buf.getvalue())
    print("%s -> %s %dx%d %.1f KB" % (book, rel, r.width, r.height, buf.tell() / 1024))


if __name__ == "__main__":
    main()

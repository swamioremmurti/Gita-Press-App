#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shrink_covers.py -- every picture in assets/covers/ under 40 KB.  The file name and format stay (the pages point at them): .webp stays .webp,
.jpg stays .jpg.  A picture over the limit is first re-saved at lower quality (not below 40), and only if that is not enough is it made
a little narrower, step by step.  (Quality is never taken below 62 -- losing pixels hurts a cover less than losing detail.)  Originals are copied to backups/before-covers-40kb/ first.

    python tools/shrink_covers.py [limit_kb]
"""
import io
import shutil
import sys
import time
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
COVERS = ROOT / "assets" / "covers"
BACKUP = ROOT / "backups" / "before-covers-40kb"
LIMIT = int(sys.argv[1]) * 1024 if len(sys.argv) > 1 else 40 * 1024


def encode(im, fmt, q):
    buf = io.BytesIO()
    if fmt == "WEBP":
        im.save(buf, "WEBP", quality=q, method=6)
    else:
        im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
    return buf.getvalue()


def shrink(path):
    fmt = "WEBP" if path.suffix.lower() == ".webp" else "JPEG"
    im = Image.open(path).convert("RGB")
    width = im.width
    qualities = (82, 76, 70, 66, 62) if fmt == "WEBP" else (84, 78, 72, 68, 64)
    while True:
        cur = im if im.width == width else im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        for q in qualities:
            data = encode(cur, fmt, q)
            if len(data) <= LIMIT:
                return data, cur.size, q
        width = int(width * 0.93)
        if width < 300:
            return data, cur.size, qualities[-1]


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
    BACKUP.mkdir(parents=True, exist_ok=True)
    done = skipped = 0
    before = after = 0
    worst = 0
    for p in sorted(COVERS.iterdir()):
        if p.suffix.lower() not in (".webp", ".jpg", ".jpeg"):
            continue
        size = p.stat().st_size
        if size <= LIMIT:
            skipped += 1
            continue
        if not (BACKUP / p.name).exists():
            shutil.copy2(p, BACKUP / p.name)
        data, dim, q = shrink(p)
        write(p, data)
        done += 1
        before += size
        after += len(data)
        worst = max(worst, len(data))
    print("shrunk %d | already small %d | %.1f MB -> %.1f MB | largest now %.1f KB" % (done, skipped, before / 1048576, after / 1048576, worst / 1024))


if __name__ == "__main__":
    main()

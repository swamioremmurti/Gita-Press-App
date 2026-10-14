#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rename_toc_ids.py -- rename every  toc_marker-4-1-2  anchor id to  Chapter_4_1_2.

  toc_marker-N, toc_marker-N-M, toc_marker-N-M-K   ->   Chapter_N, Chapter_N_M, Chapter_N_M_K

It rewrites, in one pass, every place the old id appears:
  - the books (id="..." and the in-book links href="#...")
  - assets/data/v1/gita/chNN.json and assets/audio/gita/index.json (the shloka anchors the home card and the
    reader's play buttons use)

The change is lossless and reversible (Chapter_N_M_K <-> toc_marker-N-M-K); before writing, every file is
transformed back in memory (books: only id="..." / href="#..." values) and compared with the original, and the run
stops if they differ. Pictures named Chapter_6_1_fmt.jpeg and the like are not ids and are never touched. Files are
read and written as raw bytes, so line endings and everything else stay exactly as they were.

    python tools/rename_toc_ids.py            # do it
    python tools/rename_toc_ids.py --check    # only count
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
DATA_JSON = list((ROOT / "assets" / "data" / "v1" / "gita").glob("ch*.json")) + [ROOT / "assets" / "audio" / "gita" / "index.json"]

OLD = re.compile(r"toc_marker-(\d+(?:-\d+)*)")
NEW = re.compile(r'((?:id|href)="#?)Chapter_(\d+(?:_\d+)*)(?=")')


def forward(s):
    return OLD.sub(lambda m: "Chapter_" + m.group(1).replace("-", "_"), s)


def backward(s):
    return NEW.sub(lambda m: m.group(1) + "toc_marker-" + m.group(2).replace("_", "-"), s)


def main():
    check = "--check" in sys.argv
    files = sorted(BOOKS.rglob("*.html")) + DATA_JSON
    changed = renamed = 0
    for f in files:
        raw = f.read_bytes()
        s = raw.decode("utf-8")
        n = len(OLD.findall(s))
        if not n:
            continue
        out = forward(s)
        if "toc_marker" in out:
            raise SystemExit("an id was left unconverted in " + str(f))
        if f.suffix == ".html" and backward(out) != s:
            raise SystemExit("not reversible, stopping: " + str(f))
        changed += 1
        renamed += n
        if not check:
            f.write_bytes(out.encode("utf-8"))
    print(("would rename" if check else "renamed"), renamed, "ids in", changed, "files")


if __name__ == "__main__":
    main()

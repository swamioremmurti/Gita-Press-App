#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rename_cover_classes.py -- the title-page classes  Title-Page---<X>  become  cover-<X>  in master.css and in every book.

  Title-Page---Sub-Head   -> cover-subtitle        (the one book that used it; master.css had no rule for it)
  Titel-Page---Shri-Hari  -> cover-Shri-Hari       (the old misspelling)
  Title-Page--Sub-Title   -> cover-Sub-Title-2     (a different look from Title-Page---Sub-Title, so it cannot share its name)
  Title-Page--caption     -> cover-caption
  Title-Page-Subheading   -> cover-Subheading
  every other Title-Page---<X> -> cover-<X>        (letter case kept: master.css keeps Sub-heading / subheading / Subheading apart)

Only whole class tokens are renamed (in class="..." and in the CSS of a book's own <style>); nothing else in a file is touched, line endings
included.  Changed books are first copied to backups/before-cover-class-rename/.

    python tools/rename_cover_classes.py            # dry run
    python tools/rename_cover_classes.py --apply
"""
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
BACKUP = ROOT / "backups" / "before-cover-class-rename"

SPECIAL = {
    "Title-Page---Sub-Head": "cover-subtitle",
    "Titel-Page---Shri-Hari": "cover-Shri-Hari",
    "Title-Page--Sub-Title": "cover-Sub-Title-2",
    "Title-Page--caption": "cover-caption",
    "Title-Page-Subheading": "cover-Subheading",
}
TOKEN = re.compile(r"(?<![\w-])(Titel-Page---[\w-]+|Title-Page---[\w-]+|Title-Page--[\w-]+|Title-Page-[\w-]+)(?![\w-])")


def new_name(old):
    if old in SPECIAL:
        return SPECIAL[old]
    for pre in ("Title-Page---", "Titel-Page---"):
        if old.startswith(pre):
            return "cover-" + old[len(pre):]
    raise SystemExit("no rule for " + old)


def read(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(p, s):
    for _ in range(8):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    apply = "--apply" in sys.argv
    files = sorted(BOOKS.glob("*.html")) + [ROOT / "master.css"]
    changed, total = 0, 0
    seen = {}
    for p in files:
        s = read(p)
        n = [0]

        def sub(m):
            n[0] += 1
            nn = new_name(m.group(1))
            seen[m.group(1)] = nn
            return nn

        out = TOKEN.sub(sub, s)
        if not n[0]:
            continue
        changed += 1
        total += n[0]
        if apply:
            BACKUP.mkdir(parents=True, exist_ok=True)
            if not (BACKUP / p.name).exists():
                shutil.copy2(p, BACKUP / p.name)
            write(p, out)
    print("files changed:", changed, "| tokens renamed:", total, "| applied" if apply else "| dry run")
    for k in sorted(seen):
        print("  %-36s -> %s" % (k, seen[k]))


if __name__ == "__main__":
    main()

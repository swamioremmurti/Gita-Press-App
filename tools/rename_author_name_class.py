#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rename_author_name_class.py -- char-style-override-1  ->  author_name   in master.css and in every book.

  author_name (was char-style-override-1): black, normal style, normal weight, font-size 1em  (it was 0.714em)

Only whole class tokens are renamed; changed books are copied to backups/before-author-name-rename/ first.

    python tools/rename_author_name_class.py            # dry run
    python tools/rename_author_name_class.py --apply
"""
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
BACKUP = ROOT / "backups" / "before-author-name-rename"
OLD, NEW = "char-style-override-1", "author_name"
TOKEN = re.compile(r"(?<![\w-])" + re.escape(OLD) + r"(?![\w-])")
RULE = ["color:black;", "font-size:1em;", "font-style:normal;", "font-weight:normal;"]


def read(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(p, s):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    apply = "--apply" in sys.argv
    changed = total = 0
    for p in sorted(BOOKS.glob("*.html")):
        s = read(p)
        n = len(TOKEN.findall(s))
        if not n:
            continue
        changed += 1
        total += n
        if apply:
            BACKUP.mkdir(parents=True, exist_ok=True)
            if not (BACKUP / p.name).exists():
                shutil.copy2(p, BACKUP / p.name)
            write(p, TOKEN.sub(NEW, s))
    print("books changed:", changed, "| tokens:", total, "| applied" if apply else "| dry run")

    css_path = ROOT / "master.css"
    css = read(css_path)
    nl = "\r\n" if "\r\n" in css else "\n"
    m = re.search(r"span\." + re.escape(OLD) + r" \{[^}]*\}", css)
    if not m:
        print("no rule for", OLD, "(already renamed?)")
        return
    css = css[:m.start()] + "span.%s {%s%s%s}" % (NEW, nl, nl.join("\t" + r for r in RULE) + nl, "") + css[m.end():]
    if apply:
        BACKUP.mkdir(parents=True, exist_ok=True)
        if not (BACKUP / "master.css").exists():
            shutil.copy2(css_path, BACKUP / "master.css")
        write(css_path, css)
        print("master.css updated")


if __name__ == "__main__":
    main()

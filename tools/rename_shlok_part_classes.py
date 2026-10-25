#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rename_shlok_part_classes.py -- char-style-override-14 / -15 / -16  ->  Shlok-part-2 / Shlok-part-3 / Shlok-part-4  in master.css and in every book.

  Shlok-part-2  (was -14): blue, normal style, bold            (no font-size)
  Shlok-part-3  (was -15): darkgreen, 1em, normal, normal weight
  Shlok-part-4  (was -16): orange, 1em, normal, normal weight

Only whole class tokens are renamed; changed books are copied to backups/before-shlok-part-rename/ first.

    python tools/rename_shlok_part_classes.py            # dry run
    python tools/rename_shlok_part_classes.py --apply
"""
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
BACKUP = ROOT / "backups" / "before-shlok-part-rename"
MAP = {"char-style-override-14": "Shlok-part-2", "char-style-override-15": "Shlok-part-3", "char-style-override-16": "Shlok-part-4"}
TOKEN = re.compile(r"(?<![\w-])(char-style-override-1[456])(?![\w-])")
RULES = {
    "Shlok-part-2": ["color:blue;", "font-style:normal;", "font-weight:bold;"],
    "Shlok-part-3": ["color:darkgreen;", "font-size:1em;", "font-style:normal;", "font-weight:normal;"],
    "Shlok-part-4": ["color:orange;", "font-size:1em;", "font-style:normal;", "font-weight:normal;"],
}


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
            write(p, TOKEN.sub(lambda m: MAP[m.group(1)], s))
    print("books changed:", changed, "| tokens:", total, "| applied" if apply else "| dry run")

    css_path = ROOT / "master.css"
    css = read(css_path)
    nl = "\r\n" if "\r\n" in css else "\n"
    for old, new in MAP.items():
        pat = re.compile(r"span\." + re.escape(old) + r" \{[^}]*\}")
        m = pat.search(css)
        if not m:
            print("no rule for", old, "(already renamed?)")
            continue
        body = nl.join("\t" + r for r in RULES[new])
        css = css[:m.start()] + "span.%s {%s%s%s}" % (new, nl, body + nl, "") + css[m.end():]
    if apply:
        if not (BACKUP / "master.css").exists():
            BACKUP.mkdir(parents=True, exist_ok=True)
            shutil.copy2(css_path, BACKUP / "master.css")
        write(css_path, css)
        print("master.css updated")


if __name__ == "__main__":
    main()

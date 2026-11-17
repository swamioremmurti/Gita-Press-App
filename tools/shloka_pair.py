#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shloka_pair.py -- apply the "Shloka Pair" style to a book: every two consecutive <p class="Shlok"> lines
(line 1 ending in । , line 2 ending in ॥ N॥) become one block

    <p class="Shlok shloka-pair">line 1<br/>line 2 ॥<span class="shloka-no">N॥</span></p>

master.css (p.Shlok.shloka-pair) sets every block to the same width (14em) with both lines flush left and right, so the । of
line 1 and the first ॥ of line 2 end on one vertical and the verse number hangs outside. Phones (<720px) stay centred.
A verse whose lines are longer than 14em gets the extra class shloka-wide (own width) -- add it by hand.

    python tools/shloka_pair.py "<book>.html" ["<text of the heading after which to start>"]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"

PAIR = re.compile(r'(\t*)<p class="Shlok">([^<\n]*?।)\s*</p>(\r?\n)\t*<p class="Shlok">([^<\n]*?॥)\s*([^\s<॥]+॥)\s*((?:<span[^>]*></span>)?)</p>')


def main():
    name = sys.argv[1] if sys.argv[1].endswith(".html") else sys.argv[1] + ".html"
    p = BOOKS / name
    t = p.read_text(encoding="utf-8")
    start = t.index(sys.argv[2]) if len(sys.argv) > 2 else 0
    n = [0]

    def f(m):
        n[0] += 1
        return '%s<p class="Shlok shloka-pair">%s<br/>%s<span class="shloka-no">%s</span>%s</p>' % (
            m.group(1), m.group(2).rstrip(), m.group(4), m.group(5), m.group(6))

    out = t[:start] + PAIR.sub(f, t[start:])
    with open(p, "w", encoding="utf-8", newline="") as fh:
        fh.write(out)
    print("%s: %d verses set as shloka-pair" % (name, n[0]))


if __name__ == "__main__":
    main()

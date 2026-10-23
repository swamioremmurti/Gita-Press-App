#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_sadhan_kalpataru.py -- (re)import "साधन-कल्पतरु" from  "साधन-कल्पतरु प्रथम पृष्ठ.html"  into the library, the way every Gita Press book is processed:

  * the head is the library's (master.css linked, nothing else), the title is the book's own;
  * the "प्रथम पृष्ठ" / "अंतिम पृष्ठ" labels (the export's own contents markers) are dropped;
  * the title page's "गीता सेवा ट्रस्ट" line (class Title-Page---Gita-Seva-Trust, which master.css does not have) becomes the library's publisher
    note, class cover-Publisher-Note: "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"; no other mention of it remains
    (the script stops if one does);
  * the contents anchors toc_marker-N-M become Chapter_N_M (ids and in-book links);
  * footnotes: the reader turns a footnote into a tap-to-open modal (swadhyay-footnotes.js) when the note starts with a mark it knows --
    "*", "[१]", "(१)", "१." -- and that mark is found in the text before it.  This book has notes numbered "१-श्रुति ..." or "१-<tab>श्रुति ..."
    (a hyphen after the number); they are written "१. श्रुति ..." so the reader knows them;
  * every class left in the book is one master.css defines (the library's own page wrappers epub-page / page-break / Basic-Graphics-Frame aside);
    the script stops if one is not;
  * the colons typed for visarga ("नम:") are put right afterwards with tools/fix_visarga_colon.py --only "साधन-कल्पतरु.html".

The book already in the library is first copied to backups/before-sadhan-kalpataru-reimport/.

    python tools/build_sadhan_kalpataru.py "C:\\Users\\me\\Downloads\\साधन-कल्पतरु प्रथम पृष्ठ.html"
"""
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "साधन-कल्पतरु"
OUT = BOOKS / (NAME + ".html")
BACKUP = ROOT / "backups" / "before-sadhan-kalpataru-reimport"
MASTER_CSS = ROOT / "master.css"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
<style>
body {
  font-family: Georgia, "Noto Serif Devanagari", serif;
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  line-height: 1.6;
}
.page-break {
  margin: 2rem 0;
  border: none;
  border-top: 1px dashed #ccc;
}
.epub-page {
  margin-bottom: 1rem;
}
</style>
</head>

""" % NAME


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
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    s = read(Path(sys.argv[1]))
    s = HEAD + s[s.index("<body"):]

    # the export's own "प्रथम पृष्ठ" / "अंतिम पृष्ठ" labels
    s, n_labels = re.subn(r'[ \t]*<p id="toc_marker-\d+" class="First-End-Page-text[^"]*"[^>]*>(?:(?!</p>).)*?(?:प्रथम पृष्ठ|अंतिम पृष्ठ)(?:(?!</p>).)*?</p>[ \t]*\n?',
                          "", s, flags=re.S)

    # the title page's publisher line
    s, n_note = re.subn(r'<p class="Title-Page---Gita-Seva-Trust[^"]*"[^>]*>[^<]*(?:<span[^>]*></span>)?</p>',
                        '<p class="cover-Publisher-Note">%s</p>' % NOTE, s)
    if n_note != 1:
        raise SystemExit("the 'गीता सेवा ट्रस्ट' title-page line was not found exactly once (%d)" % n_note)
    if re.search(r"गीता\s*सेवा\s*ट्रस्ट|Gita-Seva|Gita Seva", s):
        raise SystemExit("a mention of गीता सेवा ट्रस्ट is left")

    # contents anchors
    s = re.sub(r"toc_marker-(\d+(?:-\d+)*)", lambda m: "Chapter_" + m.group(1).replace("-", "_"), s)

    # footnotes numbered "१-<tab>" -> "१. "
    fn_re = re.compile(r'(<p\b[^>]*class="Footnote[^"]*"[^>]*>(?:<span[^>]*>)?)([०-९0-9]+)[ \t]*[-\u2013][ \t]*(?=[^\s०-९0-9])')
    s, n_fn = fn_re.subn(lambda m: "%s%s. " % (m.group(1), m.group(2)), s)

    # classes: every one must be defined in master.css
    css = read(MASTER_CSS)
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', s):
        used.update(m.group(1).split())
    missing = sorted(c for c in used if c not in defined)
    if missing:
        raise SystemExit("classes master.css does not have: %s" % missing)

    if OUT.exists():
        BACKUP.mkdir(parents=True, exist_ok=True)
        if not (BACKUP / OUT.name).exists():
            shutil.copy2(OUT, BACKUP / OUT.name)
    write(OUT, s)
    print("wrote", OUT.name, "| %.1f KB" % (len(s.encode("utf-8")) / 1024), "| labels dropped:", n_labels, "| footnote marks rewritten:", n_fn,
          "| classes used:", len(used), "| toc_marker left:", s.count("toc_marker"))


if __name__ == "__main__":
    main()

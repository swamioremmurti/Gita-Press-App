#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ganesh_sahasranama.py -- bring "श्रीगणेशसहस्रनामस्तोत्रम् प्रथम पृष्ठ.html" into the library as श्रीगणेशसहस्रनामस्तोत्रम्.html.

The source is a Gita Press book export, so it already uses the library's classes; what is done to it is what every Gita Press book got:

  * the head is the library's (master.css linked, nothing else), the title is the book's own;
  * the "प्रथम पृष्ठ" and "अंतिम पृष्ठ" labels (the export's own contents markers) are dropped;
  * the title page's "गीता सेवा ट्रस्ट" line (class Title-Page---Gita-Seva-Trust, which master.css does not have) becomes the library's publisher
    note, class cover-Publisher-Note:  "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"; no other mention of it remains
    (the script stops if one does);
  * the contents anchors toc_marker-N become Chapter_N (as in every other book; see tools/rename_toc_ids.py);
  * every class left in the book is one master.css defines (the library's own page wrappers epub-page / page-break / Basic-Graphics-Frame aside);
  * the book is registered in swadhyay-data.js (Gita Press book, Stotra evam Naamavali).

The colons typed for visarga ("नम:") are put right afterwards with tools/fix_visarga_colon.py --only "श्रीगणेशसहस्रनामस्तोत्रम्.html".

    python tools/build_ganesh_sahasranama.py "C:\\Users\\me\\Downloads\\श्रीगणेशसहस्रनामस्तोत्रम् प्रथम पृष्ठ.html"
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "श्रीगणेशसहस्रनामस्तोत्रम्"
OUT = BOOKS / (NAME + ".html")
DATA_JS = ROOT / "swadhyay-data.js"
MASTER_CSS = ROOT / "master.css"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"

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

STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    s = Path(sys.argv[1]).read_text(encoding="utf-8")
    s = HEAD + s[s.index("<body"):]

    # the export's own "प्रथम पृष्ठ" / "अंतिम पृष्ठ" labels
    s, n1 = re.subn(r'\s*<p id="toc_marker-\d+" class="First-End-Page-text[^"]*">(?:(?!</p>).)*?(?:प्रथम पृष्ठ|अंतिम पृष्ठ)(?:(?!</p>).)*?</p>', "", s, flags=re.S)

    # the title page's publisher line
    s, n2 = re.subn(r'<p class="Title-Page---Gita-Seva-Trust para-style-override-2">[^<]*<span></span></p>',
                    '<p class="cover-Publisher-Note para-style-override-2">%s<span></span></p>' % NOTE, s)
    if n2 != 1:
        raise SystemExit("the 'गीता सेवा ट्रस्ट' title-page line was not found exactly once (%d)" % n2)
    if re.search(r"गीता\s*सेवा\s*ट्रस्ट|Gita-Seva|Gita Seva", s):
        raise SystemExit("a mention of गीता सेवा ट्रस्ट is left")

    # contents anchors
    s = re.sub(r"toc_marker-(\d+(?:-\d+)*)", lambda m: "Chapter_" + m.group(1).replace("-", "_"), s)

    # classes: every one must be defined in master.css
    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', s):
        used.update(m.group(1).split())
    missing = sorted(c for c in used if c not in defined)
    if missing:
        raise SystemExit("classes master.css does not have: %s" % missing)

    OUT.write_text(s, encoding="utf-8", newline="")
    print("wrote", OUT, "| labels dropped:", n1, "| publisher note set | classes used:", len(used))

    # register in swadhyay-data.js
    d = DATA_JS.read_text(encoding="utf-8")
    entry_key = '"file":  "%s.html"' % NAME
    size = round(OUT.stat().st_size / 1024, 1)
    if entry_key in d:
        print("already registered in swadhyay-data.js")
    else:
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Stotra evam Naamavali",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (NAME, size))
        k = d.rindex("}\n];")
        d = d[:k + 1] + ",\n" + entry + d[k + 2:]
        with open(DATA_JS, "w", encoding="utf-8", newline="") as fh:
            fh.write(d)
        print("registered in swadhyay-data.js (%s KB)" % size)


if __name__ == "__main__":
    main()

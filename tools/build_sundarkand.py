#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_sundarkand.py -- import "सुन्दरकाण्ड (सटीक)" from its Gita Press export into the library.

  * master.css head; wrappers (Basic-Graphics-Frame) and styling-only spans removed; pages stay <section class="page" data-page="N">, split at bare <hr>;
  * "प्रथम पृष्ठ" / "अंतिम पृष्ठ" labels, the closing label page and empty page-break paragraphs dropped;
  * export class names -> master.css names (MAP, BY_TEXT); the "गीता सेवा ट्रस्ट" title line becomes the publisher note;
  * toc_marker-N -> Chapter_N.
Stops if a class is left that master.css lacks, or if any wording differs from the source apart from the lines named above.
Afterwards: python tools/fix_visarga_colon.py --only "सुन्दरकाण्ड (सटीक).html"

    python -I tools/build_sundarkand.py "C:\\Users\\me\\Downloads\\सुन्दरकाण्ड (सटीक) प्रथम पृष्ठ.html"
"""
import html
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = "सुन्दरकाण्ड (सटीक)"
OUT = ROOT / "Gita Press Books" / "Gita Press Books" / (NAME + ".html")
NOTE = "गीताप्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"

MAP = {
    "Titel-Page---Shri-Hari": "cover-Shri-Hari",
    "Title-Page---Book-Name": "cover-Book-Name",
    "Title-Page---Tvamev-mata": "cover-Tvamev-mata",
    "Title-Page---Author-Name": "cover-Author-Name",
    "Content": "Heading",                # the section headings (contents entries)
    "SHLOL-Black": "Shlok-Black",        # आरती and the opening सोरठा
    "SHLOK-Color-1": "Shlok",            # श्लोक, दोहा, सोरठा, छन्द: the same style as the चौपाई
    "Shlok-Color-2": "Shlok",            # चौपाई
    "chapterend2": "ChapterEnd1",
    "Shlok-Number": "Shlok Italik",      # the labels दोहा, सोरठा, छन्द
}
BY_TEXT = {                              # the export's unnamed paragraphs, by their wording
    "श्रीमद्गोस्वामी तुलसीदासजीविरचित": "cover-Sub-Heading",
    "श्रीजानकीवल्लभो विजयते": "Shrihari",
    "श्लोक": "Uvaacha",
}

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
<style>
body {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
</style>
</head>

<body>
""" % NAME


def plain(s):
    return " ".join(html.unescape(re.sub(r"<[^>]*>", "", s)).replace("\xa0", " ").split())


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = Path(sys.argv[1]).read_text(encoding="utf-8")
    if re.search(r"<script|<iframe|\son\w+\s*=|javascript:", src, re.I):
        raise SystemExit("the source holds active content")
    css = (ROOT / "master.css").read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | {"page"}

    pages, kept, wanted = [], [], []
    for number, body in re.findall(r'<section class="epub-page" data-page="(\d+)">(.*?)</section>', src, re.S):
        lines = []
        for attrs, inner in re.findall(r"<p\b([^>]*)>(.*?)</p>", body, re.S):
            classes = re.search(r'class="([^"]*)"', attrs).group(1).split()
            first = classes[0]
            text = plain(inner)
            if first == "First-End-Page-text" or (first == "Page-Break" and not text):
                continue
            inner = re.sub(r"</?span\b[^>]*>", "", inner).rstrip()
            inner = inner or "&nbsp;"
            if first == "Title-Page---Gita-Seva-Trust":
                cls, inner = "cover-Publisher-Note", NOTE
                text = NOTE
            elif first == "No-Paragraph-Style":
                cls = BY_TEXT[text]
            else:
                cls = MAP.get(first, first)
            if not set(cls.split()) <= defined:
                raise SystemExit("master.css has no class " + cls)
            anchor = re.search(r'id="toc_marker-(\d+)"', attrs)
            if cls == "Main-Heading":
                inner = inner.replace(" (", " <br>(")       # the सोपान on its own line
            whole = ' data-whole-page="1"' if cls == "Heading" and text == "सुन्दरकाण्ड" else ""      # the reader keeps the whole काण्ड on one page
            lines.append('<p%s class="%s"%s>%s</p>' % (' id="Chapter_%s"' % anchor.group(1) if anchor else "", cls, whole, inner))
            if text:
                wanted.append(text)
                kept.append(plain(inner))
        if lines:
            pages.append('<section class="page" data-page="%s">\n%s\n</section>\n' % (number, "\n".join(lines)))

    out = HEAD + "\n<hr>\n\n".join(pages) + "\n</body>\n</html>\n"

    # nothing lost or changed: every worded paragraph of the source (labels aside, publisher line replaced) is in the book, in order
    got = [t for t in (plain(x) for x in re.findall(r"<p\b[^>]*>(.*?)</p>", out, re.S)) if t]
    if got != wanted or kept != wanted:
        raise SystemExit("the wording differs from the source")
    source_text = [plain(x) for x in re.findall(r"<p\b[^>]*>(.*?)</p>", src, re.S)]
    lost = [t for t in source_text if t and t not in got]
    if re.search("गीता\\s*सेवा\\s*ट्रस्ट", out):
        raise SystemExit("a mention of गीता सेवा ट्रस्ट is left")

    for _ in range(8):
        try:
            OUT.write_bytes(out.encode("utf-8"))
            break
        except OSError:
            time.sleep(1.5)
    else:
        raise SystemExit("could not write %s" % OUT)
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| pages", len(pages), "| paragraphs", len(got))
    print("source lines not carried over:", lost)
    print("classes:", sorted({c for m in re.findall(r'class="([^"]*)"', out) for c in m.split()}))


if __name__ == "__main__":
    main()

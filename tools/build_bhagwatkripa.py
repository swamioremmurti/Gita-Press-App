#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_bhagwatkripa.py -- import "भगवत्कृपा" (Shri Hanuman Prasad Poddar's writings on God's grace, Gitavatika Prakashan) from the typed Word file भगवत्कृपा.docx.

    title page    cover-Shri-Hari / cover-Book-Name / cover-Author-Name / cover-Publisher-Note
    निवेदन        Heading (the publisher's note; its two lines of verse are Shlok; "— प्रकाशक" at the right)
    भगवत्कृपा     Heading with the opening words, then the 30 pieces (Heading2 of the docx) as Sub-Headings; verses -> Shlok, their reference -> Shlok-Right
The helpers are those of tools/build_ramsukhdas_docx.py.  The cover is the picture the user gave (bhagwat-kripa.webp).

    python tools/build_bhagwatkripa.py "<भगवत्कृपा.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, esc, tidy, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402

NAME = "भगवत्कृपा"
OUT = BOOKS / (NAME + ".html")
AUTHOR = "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार"
PUBLISHER = "गीतावाटिका प्रकाशन, गोरखपुर"


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)
    portrait = ""                                                     # the sketch of Shri Poddarji, between the book's name and the author's name
    if len(sys.argv) > 2:
        src = Path(sys.argv[2])
        blob, ext = bc.optimize_image(src.read_bytes(), src.suffix.lower(), 200 * 1024)
        pname = "bhagwatkripa-poddar" + ext
        write(BOOKS / "image" / pname, blob)
        portrait = '\t\t\t<p class="Image"><span><img class="frame-1" src="image/%s" alt="श्रद्धेय श्रीभाईजी हनुमानप्रसाद पोद्दार"></span></p>\n' % pname
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         + portrait +
         '\t\t\t<p class="cover-Author-Name">हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (NAME, "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    i_niv = next(i for i, p in enumerate(P) if p["st"] == "Heading2" and tidy(p["t"]) == "निवेदन")
    i_h1 = next(i for i, p in enumerate(P) if p["st"] == "Heading1")
    i_h2a = next(i for i, p in enumerate(P) if p["st"] == "Heading2" and i > i_niv and tidy(p["t"]) == "भगवत्कृपा")

    def text(p):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt:
            return
        if p["st"] == "Shlok":
            for ln in [tidy(x) for x in p["t"].split("\n") if tidy(x)]:
                b.add("Shlok", ln)
        elif p["st"] == "Shlokref":
            b.add("Shlok-Right", txt)
        else:
            b.add("Normal", txt)

    # निवेदन
    b.heading("निवेदन", "Heading", OM)
    for i in range(i_niv + 1, i_h2a):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or txt == OM or "[PB]" in txt or "\u0005" in p["t"]:
            continue
        if txt.startswith("— प्रकाशक") or txt.startswith("—प्रकाशक"):
            b.add("TXT-Right", "— प्रकाशक")
        elif txt.startswith(("अब तो सतत", "यों कर दिया")):
            b.add("Shlok", txt)
        else:
            text(p)

    # भगवत्कृपा: the opening words (before and after the Heading1 of the docx), then the pieces
    b.heading(NAME, "Heading", OM)
    n = 0
    for i in range(i_h2a + 1, len(P)):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        if p["st"] == "Heading1":
            continue
        if p["st"] == "Heading2":
            n += 1
            b.add("Sub-Heading", txt)
            continue
        if not txt or txt == "/" or "\u0005" in p["t"]:
            continue
        text(p)

    out = b.html()
    ids = validate(out)
    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| pieces:", n)

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Pravachan",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

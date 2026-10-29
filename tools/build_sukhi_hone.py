#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_sukhi_hone.py -- import "सुखी होनेके उपाय" (Shri Hanuman Prasad Poddar's talks; Gitavatika Prakashan) from the OCR Word file
"Sukhi_Hone_ke_Upai_continuous_print_book.docx".  Same layout and helpers as tools/build_prem_saras.py:

    title page    cover-Shri-Hari / cover-Book-Name / the portrait of the docx / cover-Author-Name / the Gitavatika note
    नम्र निवेदन   Heading;  the 9 talks, a Heading each ("१. साधनामय जीवन");  the life sketch of Bhaiji
    inside        verses (lines under one another) -> Shlok; "(गीता ७/२५)" source lines -> Shlok-Right; the last talk ends with three short extracts
                  (the Heading2 titles -> Sub-Heading; their lines, cut by the print's width, are joined; their sources -> Shlok-Right)
    dropped       the printed contents list, the "* * *" and "× × ×" rows, the OCR's strip of broken print (it hides the end of a Gita verse: "च॥")
    repaired      the Gita quotations that the OCR cut across a page ("मय्येव मन आधत्स्व मयि बुद्धिं निवेशय’ (गीता १२/८)")

    python tools/build_sukhi_hone.py "<Sukhi_Hone_ke_Upai_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, tidy, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402
from build_prem_saras import BLANK, DEV, PUBLISHER, AUTHOR, IMG_DIR, fix, hyphens, is_ref, lines_of  # noqa: E402

NAME = "सुखी होनेके उपाय"
OUT = BOOKS / (NAME + ".html")
EXTRACTS = {578, 580, 582}                                        # "( ... पुस्तकसे )" lines at the end of the last talk
CLOSING = "आलोक : विस्तृत जानकारीके लिये गीतावाटिका प्रकाशन, गोरखपुरसे प्रकाशित ‘श्रीभाईजी – एक अलौकिक विभूति’ पुस्तक अवश्य पढ़ें।"


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    blob, ext = bc.optimize_image(z.read("word/media/image1.png"), ".png", 200 * 1024)
    write(IMG_DIR / ("sukhi-hone-ke-upaay-01" + ext), blob)
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="Image"><span><img class="frame-1" src="image/sukhi-hone-ke-upaay-01%s" alt=""></span></p>\n'
         '\t\t\t<p class="cover-Author-Name">हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        NAME, ext, "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_niv, i_toc = h1[names.index("नम्र निवेदन")], h1[names.index("विषय-सूची")]
    body = [i for i in h1 if i > i_toc]
    i_star = next(i for i, p in enumerate(P) if i > body[-2] and tidy(p["t"]).startswith("* * * * * * *") and P[i + 1]["st"] == "Heading2")

    def para(i, p):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["figs"] or p["st"] == "Title" or txt == OM or BLANK.fullmatch(txt):
            return
        if p["jc"] == "right":
            for ln in lines_of(p):
                b.add("TXT-Right", fix(ln))
            return
        if i in EXTRACTS:
            b.add("Shlok-Right", fix(txt))
            return
        if is_ref(txt):
            b.add("Shlok-Right", fix(txt))
            return
        if p["st"] == "Heading2":
            b.add("Sub-Heading", fix(txt))
            return
        if p["jc"] == "center":
            b.add("Normal" if len(txt) > 50 else "Sub-Heading", fix(txt))
            return
        if p["jc"] == "both":
            b.add("Normal", fix(txt))
            return
        ls = lines_of(p)
        if i > i_star or (len(ls) == 1 and len(txt) > 110):         # the last extracts: lines cut by the print's width are one paragraph
            b.add("Normal", fix(txt))
        else:
            for ln in ls:
                b.add("Shlok", fix(ln))

    b.heading("नम्र निवेदन", "Heading", OM)
    for i in range(i_niv + 1, i_toc):
        p = P[i]
        if tidy(p["t"]) == "प्रकाशक":
            b.add("TXT-Right", "— प्रकाशक")
        elif p["st"] != "Heading1":
            para(i, p)

    n = 0
    for kk, hi in enumerate(body):
        end = body[kk + 1] if kk + 1 < len(body) else len(P)
        title = tidy(P[hi]["t"].replace("\n", " "))
        m = re.fullmatch(r"\(([०-९0-9]+)\)\s*(.*)", title)
        if m:
            n += 1
            b.heading("%s. %s" % (m.group(1).translate(DEV), hyphens(m.group(2))), "Heading", OM)
        else:
            b.heading(fix(title.replace("/", " ")), "Heading", OM)
        skip = 0
        for i in range(hi + 1, end):
            p = P[i]
            if skip:
                skip -= 1
                continue
            txt = tidy(p["t"].replace("\n", " "))
            if txt.startswith("मच्चिता मद्गतप्राणा") and P[i + 1]["figs"]:   # the "च॥" ending the verse is in a strip of broken print
                ls = lines_of(p)
                b.add("Shlok", fix(ls[0]))
                b.add("Shlok", fix(ls[1]) + " च॥")
                skip = 1
                continue
            if txt.endswith("(गीता १२/") and tidy(P[i + 1]["t"]) == "८)":   # a Gita quotation cut by the page: "... (गीता १२/" | "८)"
                b.add("Normal", fix(txt.replace("आधत्स्व ' मयि", "आधत्स्व मयि")) + "८)")
                b.add("Normal", "‘मय्यर्पितमनोबुद्धि’ (गीता ८/७)")
                skip = 2
                continue
            if kk == len(body) - 1 and txt.startswith("आलोक"):
                b.add("Normal", CLOSING)
                skip = 1
                continue
            if txt.startswith(("* वन्दे", "“वन्दे", "‘वन्दे")):
                b.add("Shlok", "वन्दे महापुरुष ते चरणारविन्दम्")
                continue
            para(i, p)

    out = b.html()
    ids = validate(out)
    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| talks:", n)

    d = DATA_JS.read_text(encoding="utf-8")
    mm = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if mm:
        write(DATA_JS, d[:mm.start()] + mm.group(1) + str(size) + d[mm.end():])
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Pravachan",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k2 = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k2 + 1] + "," + nl + entry + d[k2 + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

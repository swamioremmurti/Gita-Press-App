#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_kaliya.py -- import "कालियनागपर कृपा" (Shri Hanuman Prasad Poddar's talks; Gitavatika Prakashan) from the OCR Word file
"Kaliya_Naag_par_Kripa_continuous_print_book.docx".  Same layout and helpers as tools/build_prem_saras.py / build_sukhi_hone.py:

    title page    cover-Shri-Hari / cover-Book-Name / the portrait of the docx / cover-Author-Name / the Gitavatika note
    नम्र निवेदन   Heading;  the 14 pieces, a Heading each ("१. मंगलाचरण");  the life sketch of Bhaiji
    inside        verses (lines under one another) -> Shlok; "(पद सं० ११७७)" source lines -> Shlok-Right; "[ ... पुस्तकसे ... ]" -> Shlok-Right
    dropped       the printed contents list and the "* * *" rows
    repaired      what the OCR cut across a page: the "(पद सं० ११४६)" references, the lines "... श्रीभरत-" / "चरित्र ...", the quotations "“तत् | प्राणाः ..."

    python tools/build_kaliya.py "<Kaliya_Naag_par_Kripa_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, tidy, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402
from build_prem_saras import BLANK, DEV, PUBLISHER, AUTHOR, IMG_DIR, fix, hyphens, is_ref, lines_of  # noqa: E402

NAME = "कालियनागपर कृपा"
OUT = BOOKS / (NAME + ".html")
CLOSING = "आलोक : विस्तृत जानकारीके लिये गीतावाटिका प्रकाशन, गोरखपुरसे प्रकाशित ‘श्रीभाईजी – एक अलौकिक विभूति’ पुस्तक अवश्य पढ़ें।"
JOIN_NEXT = {175, 323}                                            # a quotation cut by the page: the next paragraph is its rest


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    blob, ext = bc.optimize_image(z.read("word/media/image1.png"), ".png", 200 * 1024)
    write(IMG_DIR / ("kaliyanag-par-kripa-01" + ext), blob)
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="Image"><span><img class="frame-1" src="image/kaliyanag-par-kripa-01%s" alt=""></span></p>\n'
         '\t\t\t<p class="cover-Author-Name">हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        NAME, ext, "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_niv, i_toc = h1[names.index("नम्र निवेदन")], h1[names.index("विषय-सूची")]
    body = [i for i in h1 if i > i_toc]

    def para(i, p):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["figs"] or p["st"] == "Title" or txt == OM or BLANK.fullmatch(txt):
            return
        if p["jc"] == "right":
            for ln in lines_of(p):
                b.add("TXT-Right", fix(ln))
            return
        if is_ref(txt) or (txt.startswith("[") and txt.endswith("]") and "पुस्तकसे" in txt):
            b.add("Shlok-Right", fix(txt))
            return
        if p["jc"] == "center":
            b.add("Normal" if len(txt) > 50 else "Sub-Heading", fix(txt))
            return
        if p["jc"] == "both":
            b.add("Normal", fix(txt))
            return
        ls = lines_of(p)
        if len(ls) == 1 and len(txt) > 110:
            b.add("Normal", fix(txt))
        else:
            for ln in ls:
                b.add("Shlok", fix(ln))

    # नम्र निवेदन, with the cuts of the page put right
    b.heading("नम्र निवेदन", "Heading", OM)
    for i in range(i_niv + 1, i_toc):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        if i in (16, 19, 23, 27, 26, 18) or p["st"] == "Heading1":
            continue
        if i == 15 or i == 22:                                       # a verse whose reference "(पद सं० " | "११४६) ..." is cut by the page
            ls = lines_of(p)
            last = re.sub(r"\s*\(पद सं०$", "", ls[-1])
            for ln in ls[:-1] + [last]:
                b.add("Shlok", fix(ln))
            m = re.match(r"([०-९]+\))\s*(.*)", tidy(P[i + 1]["t"]))
            b.add("Shlok-Right", "(पद सं० %s" % m.group(1))
            if m.group(2):
                b.add("Normal", fix(m.group(2).replace("तथा, ढाँचा", "तथा, 'ढाँचा")))   # the opening quote is on the other page
            continue
        if i == 17:
            b.add("Normal", fix(txt))
            b.add("Normal", fix(tidy(P[18]["t"]) + " " + tidy(P[19]["t"])))
            continue
        if i == 25:
            b.add("Normal", fix(txt + " " + tidy(P[26]["t"]) + tidy(P[27]["t"])))   # "... श्रीभरत-" + "चरित्र ..."
            continue
        if tidy(p["t"]) == "प्रकाशक":
            b.add("TXT-Right", "— प्रकाशक")
        else:
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
            if i in JOIN_NEXT:
                b.add("Normal", fix(txt + " " + tidy(P[i + 1]["t"])))
                skip = 1
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
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| pieces:", n)

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

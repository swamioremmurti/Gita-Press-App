#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_braj_bhav.py -- import "ब्रज-भाव" (edited by Shri Hanuman Prasad Poddar; Gitavatika Prakashan) from the OCR Word file
"Braj_Madhurya_Bhav_continuous_print_book.docx".

    title page    cover-Shri-Hari / cover-Book-Name / the picture of the docx / cover-subtitle / cover-Author-Name (सम्पादक) / the Gitavatika note (two lines)
    नम्र निवेदन   Heading;  then the 15 pieces of the book, a Heading each ("१. प्राक्कथन" ... "१५. श्रीसूरदास-मदनमोहनजी"), and the life sketch of Bhaiji
    inside        "झाँकी N" + its Heading2 -> one Sub-Heading; the short unpunctuated lines the OCR left as plain text -> Sub-Heading; poems (lines under one another) ->
                  Shlok; "(पद-रत्नाकर, ...)" / "(कल्याण वर्ष ...)" -> Shlok-Right; "(लेखक--...)" and "[एक भाव-विश्लेषण]" -> Bole
    dropped       the printed contents list, the running titles, the "* * * *" rows, the OCR's strips of broken print, the closing picture (the same drawing)
Helpers (quotes, OCR slips) are those of tools/build_ramsukhdas_docx.py.  No cover yet: the user supplies it.

    python tools/build_braj_bhav.py "<Braj_Madhurya_Bhav_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, esc, tidy, ocr_fix, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402

NAME = "ब्रज-भाव"
OUT = BOOKS / (NAME + ".html")
IMG_DIR = BOOKS / "image"
AUTHOR = "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार"
PUBLISHER = "गीतावाटिका प्रकाशन, गोरखपुर"
DEV = str.maketrans("0123456789", "०१२३४५६७८९")


def lines_of(p):
    return [tidy(x) for x in p["t"].split("\n") if tidy(x)]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    blob, ext = bc.optimize_image(z.read("word/media/image1.png"), ".png", 200 * 1024)
    write(IMG_DIR / ("braj-bhav-01" + ext), blob)
    i_title2 = next(i for i, p in enumerate(P) if p["st"] == "Title" and i > 5)
    subtitle = " ".join(lines_of(P[i_title2 + 1]))
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="Image"><span><img class="frame-1" src="image/braj-bhav-01%s" alt=""></span></p>\n'
         '\t\t\t<p class="cover-subtitle">%s</p>\n\t\t\t<p class="cover-Author-Name">सम्पादक — हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        NAME, ext, esc(subtitle), "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_niv, i_toc = h1[names.index("नम्र निवेदन")], h1[names.index("विषय-सूची")]
    body_h1 = [i for i in h1 if i > i_toc]

    def has_cons(t):
        return bool(re.search(r"[क-ह]", t))

    def para(i, p, state):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["figs"] or p["st"] == "Title" or txt == OM:
            return
        if p["st"] == "Heading2":
            label = state.pop("jhanki", None)
            b.add("Sub-Heading", ("%s — %s" % (label, txt)) if label else txt)
            return
        if p["jc"] == "right":
            for ln in lines_of(p):
                b.add("TXT-Right", ln)
            return
        if p["jc"] == "center":
            if re.fullmatch(r"[\*×\s]+", txt) or not has_cons(txt) or len(txt) <= 2:
                return                                             # "* * *" rows, the OCR's stray marks
            if re.fullmatch(r"\(\s*[०-९0-9]+\s*\)", txt):
                return                                             # the number of a piece (it is in its Heading)
            if re.fullmatch(r"झाँकी\s*[०-९0-9]+", txt):
                title = state.pop("title", None)
                if title:
                    b.add("Sub-Heading", "%s — %s" % (txt, title))        # the plain line before "झाँकी N" is that piece's title
                else:
                    state["jhanki"] = txt
                return
            if txt.startswith("[") and "विश्" in txt:
                b.add("Bole", txt)
                return
            if txt.startswith("(लेखक"):
                b.add("Bole", txt)
                return
            if txt.startswith("(") and len(txt) <= 70:
                b.add("Shlok-Right", txt if txt.endswith(")") else txt + ")")
                return
            for ln in lines_of(p):
                b.add("Shlok", ocr_fix(ln))
            return
        label = state.pop("jhanki", None)
        if label:
            b.add("Sub-Heading", label)
        if txt.startswith("(लेखक"):
            b.add("Bole", txt)
        elif p["jc"] == "both":
            b.add("Normal", ocr_fix(txt))
        else:                                                      # no alignment: poem lines, a signature, or a short heading the OCR left plain
            ls = lines_of(p)
            nxt = next((q for q in P[i + 1:i + 3] if tidy(q["t"])), None)
            plain = len(ls) == 1 and len(txt) < 45 and not re.search(r"[।॥,'\"“”‘’…]", txt)
            if plain and nxt is not None and nxt["jc"] == "center" and re.fullmatch(r"झाँकी\s*[०-९0-9]+", tidy(nxt["t"])):
                state["title"] = txt                               # the title of the next "झाँकी"
            elif plain and (nxt is None or (nxt["jc"] == "center" and re.fullmatch(r"[\*×\s]+", tidy(nxt["t"])))):
                b.add("TXT-Right", txt)                            # a signature at the end of a piece
            else:
                for ln in ls:
                    b.add("Shlok", ocr_fix(ln))

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for p in P[i_niv + 1:i_toc]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt:
            continue
        if txt.startswith("कृष्णस्य पूर्णतमता") or txt.startswith("पूर्णता पूर्णतरता"):
            b.add("Shlok", txt)
        elif p["jc"] == "center" and txt.startswith("("):
            b.add("Shlok-Right", txt)
        else:
            para(0, p, {})

    # the pieces
    n = 0
    for k, hi in enumerate(body_h1):
        end = body_h1[k + 1] if k + 1 < len(body_h1) else len(P)
        title = names[h1.index(hi)].replace("/", " ")
        if "जीवन झाँकी" in title:
            b.heading(title, "Heading", OM)
        else:
            n += 1
            b.heading("%s. %s" % (str(n).translate(DEV), title), "Heading", OM)
        state = {}
        for i in range(hi + 1, end):
            if P[i]["figs"]:
                continue
            para(i, P[i], state)

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

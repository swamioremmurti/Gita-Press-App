#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_bhakti_rahasya.py -- import "भक्ति-रहस्य" (म०म०पं० गोपीनाथ कविराज, edited by Shri Hanuman Prasad Poddar; Gitavatika Prakashan) from the OCR Word file
"Bhagti_Rahsya_continuous_print_book.docx".

    title page    cover-Shri-Hari / cover-Book-Name / the picture of the docx / cover-Author-Name (लेखक, सम्पादक) / the publisher's note
    प्राक्कथन     Heading (with the portrait of Kaviraj); प्रकाशकीय निवेदन  Heading
    १ .. ११       the eleven articles, a Heading each ("१. भक्ति रहस्य"); the "(१)", "(२)" numbers inside an article are Sub-Headings; the Heading2 lines of the docx
                  that are verses (with । or ॥) are Shlok, the other Heading2 lines Sub-Headings; "(कल्याण वर्ष ...)" source lines -> Shlok-Right
    the end       रस-सिद्ध संत श्रद्धेय भाईजी ... की जीवन झाँकी  Heading
    dropped       the printed contents list, the running titles, the "* * * * *" rows between the articles
The helpers (quotes, OCR slips, registration) are those of tools/build_ramsukhdas_docx.py.  No cover yet: the user supplies it.

    python tools/build_bhakti_rahasya.py "<Bhagti_Rahsya_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, esc, tidy, ocr_fix, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402

NAME = "भक्ति-रहस्य"
OUT = BOOKS / (NAME + ".html")
IMG_DIR = BOOKS / "image"
AUTHOR = "महामहोपाध्याय पं० गोपीनाथ कविराज"
PUBLISHER = "गीतावाटिका प्रकाशन, गोरखपुर"
DEV = str.maketrans("0123456789", "०१२३४५६७८९")


def is_verse(t):
    return bool(re.search(r"[।॥]", t))


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    def picture(target, name):
        blob, ext = bc.optimize_image(z.read("word/" + target), ".png", 200 * 1024)
        name += ext
        write(IMG_DIR / name, blob)
        return '<p class="Image"><span><img class="frame-1" src="image/%s" alt=""></span></p>' % name

    pics = [(i, p["figs"][0]) for i, p in enumerate(P) if p["figs"]]
    title_pic = picture(pics[0][1], "bhakti-rahasya-01")
    portrait = picture(pics[1][1], "bhakti-rahasya-02")

    i_lekhak = next(i for i, p in enumerate(P) if p["t"].startswith("लेखक"))
    lekhak, sampadak = [tidy(x) for x in P[i_lekhak]["t"].split("\n") if tidy(x)][:2]
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n\t\t\t%s\n'
         '\t\t\t<p class="cover-Author-Name">%s</p>\n\t\t\t<p class="cover-Author-Name">%s</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        NAME, title_pic, esc(re.sub(r"—\s*", "— ", lekhak)), esc(re.sub(r"—\s*", "— ", sampadak)), "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_prak, i_pub, i_toc = (h1[names.index(x)] for x in ("प्राक्कथन", "प्रकाशकीय निवेदन", "विषय-सूची"))
    body_h1 = [i for i in h1 if i > i_toc]
    i_end = len(P)

    def para(p, in_book=True):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt:
            return
        if p["jc"] == "right":
            for ln in [tidy(x) for x in p["t"].split("\n") if tidy(x)]:
                b.add("TXT-Right", ln)
            return
        if p["jc"] == "center":
            if re.fullmatch(r"[\*\s]+", txt) or txt == OM:
                return
            if txt.startswith("(") and len(txt) <= 70:
                b.add("Shlok-Right", txt if txt.endswith(")") else txt + ")")
                return
            for ln in [tidy(x) for x in p["t"].split("\n") if tidy(x)]:
                b.add("Shlok", ocr_fix(ln))
            return
        b.add("Normal", ocr_fix(txt))

    # प्राक्कथन, प्रकाशकीय निवेदन
    b.heading("प्राक्कथन", "Heading", OM)
    b.add("Image", '<span><img class="frame-1" src="%s" alt="म०म०पं० गोपीनाथ कविराज"></span>' % re.search(r'src="([^"]+)"', portrait).group(1), raw=True)
    for p in P[i_prak + 1:i_pub]:
        if not p["figs"]:
            para(p)
    b.heading("प्रकाशकीय निवेदन", "Heading", OM)
    for p in P[i_pub + 1:i_toc]:
        para(p)

    # the articles
    n_art = 0
    for k, hi in enumerate(body_h1):
        end = body_h1[k + 1] if k + 1 < len(body_h1) else i_end
        title = names[h1.index(hi)]
        is_last = k == len(body_h1) - 1
        if is_last:
            b.heading(title.replace("\n", " ").replace("/", " "), "Heading", OM)
        else:
            n_art += 1
            b.heading("%s. %s" % (str(n_art).translate(DEV), title), "Heading", OM)
        for i in range(hi + 1, end):
            p = P[i]
            txt = tidy(p["t"].replace("\n", " "))
            if p["figs"] or not txt:
                continue
            if p["st"] == "Title" or txt == OM:
                continue
            if p["st"] == "Heading2":
                if is_verse(txt):
                    b.add("Shlok", ocr_fix(txt))
                else:
                    b.add("Sub-Heading", txt)
                continue
            m = re.fullmatch(r"\(\s*([०-९0-9]+)\s*\)", txt)
            if p["jc"] == "center" and m:
                nxt = next((q for q in P[i + 1:i + 4] if tidy(q["t"]) or q["st"]), None)
                if nxt is not None and nxt["st"] in ("Heading1", "Title"):
                    continue                                          # the number of the article, already in its Heading
                b.add("Sub-Heading", "(%s)" % m.group(1).translate(DEV))
                continue
            para(p)

    out = b.html()
    ids = validate(out)
    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| articles:", n_art)

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

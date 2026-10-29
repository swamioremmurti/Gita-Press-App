#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_prem_saras.py -- import two Gitavatika Prakashan books (Shri Hanuman Prasad Poddar's talks) from the OCR Word files:
    "प्रेम और प्रेमी"  <- Prem_Aur_Premi_continuous_print_book.docx
    "सरस-प्रसंग"     <- Saras_Parsang_continuous_print_book.docx

    title page    cover-Shri-Hari / cover-Book-Name / the portrait of the docx / cover-Author-Name / the Gitavatika note (two lines)
    नम्र निवेदन   Heading (Saras also: प्रकाशकीय निवेदन);  then the pieces, a Heading each ("१. शरणागति"; an untitled piece "(७१)"), and the life sketch of Bhaiji
    inside        poems/verses (lines under one another) -> Shlok; "(रा०च०मा०/...)" source lines -> Shlok-Right; the labels inside प्रेम-शतक and the titles of
                  its hymns -> Sub-Heading
    dropped       the printed contents list, the "* * *" rows between the pieces, the OCR's strips of broken print (the four line-endings they hide in the
                  Kavitavali verse of Prem are put back), the "· · ·" row in the middle of a verse, the rule before the closing note
Helpers (quotes, OCR slips) are those of tools/build_ramsukhdas_docx.py.  No cover yet: the user supplies it.

    python tools/build_prem_saras.py prem  "<Prem_Aur_Premi_continuous_print_book.docx>"
    python tools/build_prem_saras.py saras "<Saras_Parsang_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, esc, tidy, ocr_fix, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402

IMG_DIR = BOOKS / "image"
AUTHOR = "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार"
PUBLISHER = "गीतावाटिका प्रकाशन, गोरखपुर"
SLUG = {"प्रेम और प्रेमी": "prem-aur-premi", "सरस-प्रसंग": "saras-prasang"}
DEV = str.maketrans("0123456789", "०१२३४५६७८९")
DEVD = "ऀ-ॿ"
BLANK = re.compile(r"[\*\s·×─]+")
REF = re.compile(r"\(.{1,50}\)")


def hyphens(t):
    return re.sub("(?<=[%s])–(?=[%s])" % (DEVD, DEVD), "-", t)


def fix(t):
    t = hyphens(ocr_fix(t))
    t = re.sub(r"\*\s*सत्कथा’", "‘सत्कथा’", t)
    t = t.replace("तुलसी ' जेहि", "तुलसी जेहि")
    return t.replace("सहापुरुष", "महापुरुष").replace("रामसुखदासनी खदासजी", "रामसुखदासजी")


def lines_of(p):
    return [tidy(x) for x in p["t"].split("\n") if tidy(x)]


def is_ref(t):
    return bool(REF.fullmatch(t)) and bool(re.search(r"[०-९0-9]|पद", t))


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("prem", "saras"):
        raise SystemExit(__doc__)
    which = sys.argv[1]
    NAME = "प्रेम और प्रेमी" if which == "prem" else "सरस-प्रसंग"
    OUT = BOOKS / (NAME + ".html")
    z, P, _ = read_docx(sys.argv[2])
    b = Book(NAME)

    blob, ext = bc.optimize_image(z.read("word/media/image1.png"), ".png", 200 * 1024)
    pic = SLUG[NAME] + "-01"
    write(IMG_DIR / (pic + ext), blob)
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="Image"><span><img class="frame-1" src="image/%s%s" alt=""></span></p>\n'
         '\t\t\t<p class="cover-Author-Name">हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        NAME, pic, ext, "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_toc = h1[names.index("विषय-सूची" if which == "prem" else "विषय–सूची")]
    body = [i for i, q in enumerate(P) if i > i_toc and (q["st"] == "Heading1" or (q["st"] == "Heading2" and "जीवन झाँकी" in q["t"]))]
    i_niv = next(i for i, p in enumerate(P) if tidy(p["t"]).startswith("नम्र निवेदन"))

    def para(i, p, in_piece=True):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["figs"] or p["st"] == "Title" or txt == OM or BLANK.fullmatch(txt):
            return
        if p["jc"] == "right":
            for ln in lines_of(p):
                b.add("TXT-Right", fix(ln))
            return
        if is_ref(txt):
            b.add("Shlok-Right", fix(txt))
            return
        if p["st"] == "Heading2":
            b.add("Sub-Heading", fix(txt))
            return
        if p["jc"] == "center":
            b.add("Sub-Heading", fix(txt))                           # the labels of प्रेम-शतक
            return
        if p["jc"] == "both":
            b.add("Normal", fix(txt))
            return
        ls = lines_of(p)                                           # no alignment: verse lines (or a stray single line)
        if len(ls) == 1 and len(txt) > 110:
            b.add("Normal", fix(txt))
        else:
            for ln in ls:
                b.add("Shlok", fix(ln))

    # निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    stop = i_toc
    k = i_niv + 1
    if which == "prem":
        i7 = next(i for i in range(k, stop) if tidy(P[i]["t"]).endswith("अबतक"))
        for i in range(k, stop):
            p = P[i]
            if i == i7:                                            # the paragraph is cut by the page: "अबतक" | "वेणुगीत ... ," | "श्रीरासपञ्चाध्यायी ..."
                b.add("Normal", fix(tidy(p["t"]) + " " + tidy(P[i + 1]["t"]) + " " + tidy(P[i + 2]["t"])))
            elif i in (i7 + 1, i7 + 2):
                continue
            elif tidy(p["t"]) == "प्रकाशक":
                b.add("TXT-Right", "— प्रकाशक")
            else:
                para(i, p)
    else:
        for i in range(k, stop):
            p = P[i]
            txt = tidy(p["t"].replace("\n", " "))
            if p["st"] == "Heading2" and txt.startswith("प्रकाशकीय"):
                b.heading("प्रकाशकीय निवेदन", "Heading", OM)
            elif p["st"] == "Heading1":
                continue
            elif p["jc"] == "" and txt.startswith("श्रूयतां"):
                for ln in lines_of(p):
                    b.add("Shlok", fix(ln))
            elif p["jc"] == "" and len(txt) > 110:
                b.add("Normal", fix(txt))
            else:
                para(i, p)

    # the pieces
    n = 0
    for kk, hi in enumerate(body):
        end = body[kk + 1] if kk + 1 < len(body) else len(P)
        title = tidy(P[hi]["t"].replace("\n", " "))
        m = re.fullmatch(r"\(([०-९0-9]+)\)\s*(.*)", title)
        if m:
            n += 1
            b.heading(("%s. %s" % (m.group(1).translate(DEV), hyphens(m.group(2)))) if m.group(2) else "(%s)" % m.group(1).translate(DEV), "Heading", OM)
        else:
            b.heading(fix(title.replace("/", " ")), "Heading", OM)
        state = {"skip": 0}
        for i in range(hi + 1, end):
            p = P[i]
            if state["skip"]:
                state["skip"] -= 1
                continue
            txt = tidy(p["t"].replace("\n", " "))
            if which == "prem" and txt.startswith("तिन्ह तें खर"):   # Kavitavali, उत्तर० ४०: the line endings sit in four strips of broken print
                tails = ("वै।", "द्वै॥", "च्वै।", "ह्वै॥")
                b.add("Shlok", fix(txt) + " " + tails[0])
                for j, nxt in enumerate(P[i + 2:i + 7:2], 1):
                    b.add("Shlok", fix(tidy(nxt["t"])) + " " + tails[j])
                state["skip"] = 7
                continue
            if which == "saras" and txt.startswith("किमर्थ निन्दसे"):  # a verse cut by a row of dots
                b.add("Shlok", fix(txt))
                for ln in lines_of(P[i + 2]):
                    b.add("Shlok", fix(ln))
                state["skip"] = 2
                continue
            if which == "prem" and kk == len(body) - 1 and txt.startswith("आलोक"):
                b.add("Normal", "आलोक : विस्तृत जानकारीके लिये गीतावाटिका प्रकाशन, गोरखपुरसे प्रकाशित ‘श्रीभाईजी – एक अलौकिक विभूति’ पुस्तक अवश्य पढ़ें।")
                state["skip"] = 1
                continue
            if which == "saras" and kk == len(body) - 1 and txt.startswith("आलोक"):
                b.add("Normal", "आलोक : विस्तृत जानकारीके लिये गीतावाटिका प्रकाशन, गोरखपुरसे प्रकाशित ‘श्रीभाईजी – एक अलौकिक विभूति’ पुस्तक अवश्य पढ़ें।")
                state["skip"] = 1
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

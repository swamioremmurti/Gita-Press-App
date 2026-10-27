#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_payo_param_bishramu.py -- import "पायो परम बिश्रामु" (Gita Prakashan, Swami Ramsukhdasji's talks) from the OCR Word file "37_continuous_print_book.docx".

Laid out like "मैं नहीं, मेरा नहीं" (tools/build_ramsukhdas_docx.py, whose helpers it uses):
    title page   cover-* lines;  नम्र निवेदन  Heading;  the book's own Heading with, under it, the Sub-Headings
    मंगलाचरण     the verses and the introduction, which ends at "... ऐसी प्रार्थना है।'" (the "* * *" inside it is not a break)
    १, २, ३ ...  every text between two "* * *" after the मंगलाचरण is a numbered sub-chapter (the questions "श्रोता—" in bold)
    the end      the short article "क्या मृत्युके बाद नेत्रदान उचित है?" is a Heading of its own; the publisher's catalogue is left out
The cover is the first picture of the docx.  The text is the OCR as it stands apart from the certain slips (OCR_FIX) and the quotes.

    python tools/build_payo_param_bishramu.py "<37_continuous_print_book.docx>" "<where to save the cover picture .png>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_ramsukhdas_docx import Book, esc, tidy, fix_quotes, ocr_fix, read_docx, validate, register, write, OM, PUBLISHER, BOOKS  # noqa: E402

NAME = "पायो परम बिश्रामु"
OUT = BOOKS / (NAME + ".html")
DEV = str.maketrans("0123456789", "०१२३४५६७८९")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    def lines(p):
        return [tidy(x) for x in p["t"].split("\n") if tidy(x)]

    def idx(pred, start=0):
        return next(i for i, p in enumerate(P) if i >= start and pred(p))

    i_niv = idx(lambda p: p["st"] == "Heading1" and tidy(p["t"]) == "नम्र निवेदन")
    i_main = idx(lambda p: p["st"] == "Heading2" and tidy(p["t"]) == "मंगलाचरण")
    i_end_mang = idx(lambda p: "ऐसी प्रार्थना है" in p["t"], i_main)
    i_art = idx(lambda p: p["st"] == "Heading2" and "नेत्रदान" in p["t"])
    i_cat = idx(lambda p: "कल्याणकारी साहित्य" in p["t"], i_art)

    sub = tidy(" ".join(tidy(p["t"]) for p in P[4:6]).replace("|", "").replace("[ ", "").strip())
    sub = "[ " + re.sub(r"\s*\]\s*$", "", sub) + " ]"
    tr = ocr_fix(fix_quotes(" ".join(tidy(p["t"].replace("\n", " ")) for p in P[10:14])))
    b.title_page(OM, sub, [tr], ["संकलन तथा सम्पादन — राजेन्द्र कुमार धवन", PUBLISHER,
                                "%sके मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।" % PUBLISHER])

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for p in P[i_niv + 1:i_main - 2]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["jc"] == "center" or p["st"]:
            continue
        if txt.startswith("श्रीगंगादशहरा निवेदक"):
            continue
        if txt.startswith("वि० सं०"):
            b.add("TXT-Right", "निवेदक—राजेन्द्र कुमार धवन")
            b.add("TXT-Right", "श्रीगंगादशहरा, " + re.sub(r"\s*राजेन्द्र कुमार धवन\s*$", "", txt))
            continue
        t = ocr_fix(fix_quotes(txt))
        b.add("Normal", '<span class="rg-it">%s</span>' % esc(t) if p["all_italic"] else t, raw=p["all_italic"])

    def text(p, chapters_state):
        """one paragraph of the talks / the article"""
        t, txt = p["t"], tidy(p["t"].replace("\n", " "))
        if not re.search(r"[ऀ-ॿ]", txt):
            return
        if p["jc"] == "center":
            for ln in lines(p):
                b.add("Shlok", ocr_fix(ln))
            return
        txt = ocr_fix(fix_quotes(txt))
        if re.fullmatch(r"\([^()]{3,70}\)", txt):
            b.add("Shlok-Right", txt)
        elif re.match(r"श्रोता\s*[-—–]", txt):
            b.add("TXT-Bold", re.sub(r"^श्रोता\s*[-—–]+\s*", "श्रोता—", txt))
        elif re.match(r"स्वामीजी\s*[-—–]", txt):
            b.add("Normal", re.sub(r"^स्वामीजी\s*[-—–]+\s*", "स्वामीजी—", txt))
        elif p["all_italic"]:
            b.add("Normal", '<span class="rg-it">%s</span>' % esc(txt), raw=True)
        else:
            b.add("Normal", txt)

    # the book's heading, मंगलाचरण, then the numbered talks
    b.heading(NAME, "Heading", OM)
    b.add("Sub-Heading", "मंगलाचरण")
    n = 0
    pending = False
    for i in range(i_main + 1, i_art - 3):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        if p["jc"] == "center" and re.fullmatch(r"[\*\s]+", txt) and txt:
            if i > i_end_mang:
                n += 1
                pending = True
            continue
        if not txt:
            continue
        if pending and re.search(r"[ऀ-ॿ]", txt):
            b.heading(str(n).translate(DEV), "Sub-Heading")
            pending = False
        text(p, None)

    # the article
    b.heading("क्या मृत्युके बाद नेत्रदान उचित है?", "Heading", OM)
    for p in P[i_art + 1:i_cat - 2]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt:
            continue
        if txt.startswith("( परमश्रद्धेय"):
            b.add("Bole", txt)
        elif txt.startswith("-सत्संगके फूल"):
            b.add("TXT-Right", "—‘सत्संगके फूल’ पुस्तकसे")
        else:
            text(p, None)

    out = b.html()
    ids = validate(out)
    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (OUT.stat().st_size / 1024), "| chapters:", ids, "| numbered sub-chapters:", n)
    if len(sys.argv) > 2:
        write(Path(sys.argv[2]), z.read("word/media/image1.png"))
        print("cover picture saved to", sys.argv[2])
    register(NAME, None, OUT)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ramsukhdas_talks.py -- import the OCR Word files of Swami Ramsukhdasji's talks (Gita Prakashan) that share one layout:

    python tools/build_ramsukhdas_talks.py payo  "<37_continuous_print_book.docx>" "<cover picture .png to write>"     # पायो परम बिश्रामु
    python tools/build_ramsukhdas_talks.py ban   "<27_continuous_print_book.docx>" "<cover picture .png to write>"     # बन गये आप अकेले सब कुछ

Layout (the helpers come from tools/build_ramsukhdas_docx.py):
    title page    cover-* lines;   नम्र निवेदन   Heading;   then the book's own Heading with the Sub-Headings
    मंगलाचरण      the verses and the introduction, which ends at "... ऐसी प्रार्थना है।'" (the "* * *" inside it is not a break)
    १, २, ३ ...   every text between two "* * *" after the मंगलाचरण is a numbered sub-chapter ("श्रोता—" questions in bold)
    the end       one short appendix as a Heading of its own (payo: the article on eye donation; ban: "मूल भागवत"); the publisher's catalogue is left out
The cover is the first picture of the docx; the other pictures are ornaments.  The text is the OCR as it stands apart from the certain slips (OCR_FIX) and the quotes.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_ramsukhdas_docx import Book, esc, tidy, fix_quotes, ocr_fix, read_docx, validate, register, write, OM, PUBLISHER, BOOKS  # noqa: E402

DEV = str.maketrans("0123456789", "०१२३४५६७८९")
PROFILES = {
    "payo": {"name": "पायो परम बिश्रामु", "sub": (4, 6), "tr": (10, 14), "date": "श्रीगंगादशहरा",
             "main": lambda p: p["st"] == "Heading2" and tidy(p["t"]) == "मंगलाचरण",
             "app": lambda p: p["st"] == "Heading2" and "नेत्रदान" in p["t"], "app_title": "क्या मृत्युके बाद नेत्रदान उचित है?"},
    "ban": {"name": "बन गये आप अकेले सब कुछ", "sub": (5, 7), "tr": (11, 15), "date": "श्रीकृष्णजन्माष्टमी",
            "main": lambda p: tidy(p["t"]) == "मंगलाचरण",
            "app": lambda p: p["st"] == "Heading1" and tidy(p["t"]) == "मूल भागवत", "app_title": "मूल भागवत"},
}


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in PROFILES:
        raise SystemExit(__doc__)
    pr = PROFILES[sys.argv[1]]
    NAME = pr["name"]
    OUT = BOOKS / (NAME + ".html")
    z, P, _ = read_docx(sys.argv[2])
    b = Book(NAME)

    def lines(p):
        return [tidy(x) for x in p["t"].split("\n") if tidy(x)]

    def idx(pred, start=0):
        return next(i for i, p in enumerate(P) if i >= start and pred(p))

    i_niv = idx(lambda p: p["st"] == "Heading1" and tidy(p["t"]) == "नम्र निवेदन")
    i_main = idx(pr["main"], i_niv)
    i_end_mang = idx(lambda p: "ऐसी प्रार्थना है" in p["t"], i_main)
    i_app = idx(pr["app"])
    i_stop = idx(lambda p: "वाणीपर आधारित" in p["t"] or "कल्याणकारी साहित्य" in p["t"] or ("महाराजके" in p["t"] and "प्रवचनोंका सार-संग्र" in p["t"]), i_app)   # where the publisher's pages begin
    while i_stop > i_app + 1 and (not tidy(P[i_stop - 1]["t"]) or tidy(P[i_stop - 1]["t"]) == OM):
        i_stop -= 1

    sub = " ".join(tidy(p["t"]) for p in P[pr["sub"][0]:pr["sub"][1]])
    sub = "[ " + re.sub(r"^\[\s*|\s*[\]|]\s*$", "", sub) + " ]"
    tr = ocr_fix(fix_quotes(" ".join(tidy(p["t"].replace("\n", " ")) for p in P[pr["tr"][0]:pr["tr"][1]])))
    b.title_page(OM, sub, [tr], ["संकलन तथा सम्पादन — राजेन्द्र कुमार धवन", PUBLISHER,
                                "%sके मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।" % PUBLISHER])

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for p in P[i_niv + 1:i_main]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["jc"] == "center" or p["st"]:
            continue
        if txt.startswith(pr["date"] + " निवेदक"):
            continue
        if txt.startswith("वि० सं०"):
            b.add("TXT-Right", "निवेदक—राजेन्द्र कुमार धवन")
            b.add("TXT-Right", pr["date"] + ", " + re.sub(r"\s*राजेन्द्र कुमार धवन\s*$", "", txt))
            continue
        t = ocr_fix(fix_quotes(txt))
        b.add("Normal", '<span class="rg-it">%s</span>' % esc(t) if p["all_italic"] else t, raw=p["all_italic"])

    def text(p):
        """one paragraph of the talks / the appendix"""
        txt = tidy(p["t"].replace("\n", " "))
        if not re.search(r"[ऀ-ॿ]", txt):
            return
        if p["jc"] == "center":
            for ln in lines(p):
                ln = ocr_fix(ln)
                b.add("Uvaacha" if re.search(r"वाच$", ln) and len(ln) < 25 else "Shlok", ln)
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
    n, pending = 0, False
    for i in range(i_main + 1, i_app):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        if p["jc"] == "center" and txt and re.fullmatch(r"[\*\s]+", txt):
            if i > i_end_mang:
                n += 1
                pending = True
            continue
        if not txt or not re.search(r"[ऀ-ॿ]", txt) or txt == OM:
            continue
        if pending:
            b.heading(str(n).translate(DEV), "Sub-Heading")
            pending = False
        text(p)

    # the appendix
    b.heading(pr["app_title"], "Heading", OM)
    for p in P[i_app + 1:i_stop]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or txt == OM:
            continue
        if txt.startswith("( परमश्रद्धेय"):
            b.add("Bole", txt)
        elif txt.startswith("-सत्संगके फूल"):
            b.add("TXT-Right", "—‘सत्संगके फूल’ पुस्तकसे")
        else:
            text(p)

    out = b.html()
    ids = validate(out)
    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (OUT.stat().st_size / 1024), "| chapters:", ids, "| numbered sub-chapters:", n)
    if len(sys.argv) > 3:
        write(Path(sys.argv[3]), z.read("word/media/image1.png"))
        print("cover picture saved to", sys.argv[3])
    register(NAME, None, OUT)


if __name__ == "__main__":
    main()

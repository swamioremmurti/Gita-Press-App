#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_rahasyamayi_vartalap.py -- import "रहस्यमयी वार्ता" (Gita Prakashan, Swami Ramsukhdasji's questions and answers, from a hand-written diary) from the OCR
Word file "33_continuous_print_book.docx".

Same mapping as tools/build_ramsukhdas_docx.py (which it imports from):
    title page   cover-Shri-Hari / cover-Book-Name / two cover-subtitle lines / Tavmev-Mata--pita / cover-Publisher-Note
    नम्र निवेदन  Heading;  the 58 topics (अहम्, आचार-व्यवहार ... "है" (सत्तामात्र)) Heading each, one reader page each
    परिशिष्ट     Heading (the picture of the docx sits at its top) with the Sub-Headings अंतरंग वार्ता and विविध
    "प्रश्न—" -> TXT-Bold, "स्वामीजी—" and the rest -> Normal, centred lines (verses) -> Shlok, "(मानस ...)" -> Shlok-Right
    dropped      the printed contents list, the "===::0::===" rows between the topics, the ornaments, the publisher's catalogue at the end
The OCR's slips in the headings (परमात्मप्रामि, शारीर, सत्सणग ...) and the certain ones in the text are mended, the quotes made ‘ ’ / “ ”; the rest of the text is
the OCR as it stands.  The cover is the first picture of the docx.

    python tools/build_rahasyamayi_vartalap.py "<33_continuous_print_book.docx>" "<where to save the cover picture .png>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
import build_ramsukhdas_docx as base  # noqa: E402
from build_ramsukhdas_docx import normalize_quotes, Book, esc, tidy, fix_quotes, ocr_fix, read_docx, validate, register, write, OM, PUBLISHER, BOOKS  # noqa: E402

NAME = "रहस्यमयी वार्ता"
OUT = BOOKS / (NAME + ".html")
IMG_DIR = BOOKS / "image"
HEADING_FIX = {"परमात्मप्रामि": "परमात्मप्राप्ति", "शारीर": "शरीर", "सत्सणग": "सत्संग", "` वासुदेवः सर्वम्‌ '": "‘वासुदेवः सर्वम्’",
               "“है ' ( सत्तामात्र )": "‘है’ ( सत्तामात्र )", "अहम्‌": "अहम्"}
Q_RE = re.compile(r"^(?:प्रश्न|प्रश्‍न|प्रशन|प्रश्क|प्रजन|प्रजशन)\s*[-—–]+\s*")
A_RE = re.compile(r"^स्वामीजी\s*[-—–]+\s*")


def is_mark_row(t):
    return not re.search(r"[क-ह]", t)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    # the pictures: the first is the cover, the 5th the sage at his diary (top of the appendix); the other four are ornaments
    b = Book(NAME)

    # title page
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">%s</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="cover-subtitle">[ हस्तलिखित डायरीसे ]</p>\n\t\t\t<p class="cover-subtitle">[ विविध विषयोंसे सम्बन्धित प्रश्न और परमश्रद्धेय स्वामीजी श्रीरामसुखदासजी महाराज द्वारा उनके उत्तर ]</p>\n'
         '\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n') % (OM, NAME)
    for ln in ("त्वमेव माता च पिता त्वमेव", "त्वमेव बन्धुश्च सखा त्वमेव।", "त्वमेव विद्या द्रविणं त्वमेव", "त्वमेव सर्वं मम देवदेव॥"):
        t += '\t\t\t<p class="Tavmev-Mata--pita">%s</p>\n' % ln
    tr = " ".join(tidy(p["t"]) for p in P[11:15])
    t += '\t\t\t<p class="Tavmev-Mata--pita">%s</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n' % esc(normalize_quotes(tr))
    for ln in ("लेखक — राजेन्द्र कुमार धवन", PUBLISHER, "%sके मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।" % PUBLISHER):
        t += '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % esc(ln)
    b.pages.append(t + "\t\t</div>\n")

    i_niv = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "नम्र निवेदन")
    i_body = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and i > i_niv + 40)          # the first topic (after the contents list)
    i_end = next(i for i, p in enumerate(P) if "श्रीकृष्णा" in p["t"] and "॥" in p["t"] and i > 2900)
    i_pic = next(i for i, p in enumerate(P) if any(f.endswith("image5.png") for f in p["figs"]))

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for p in P[i_niv + 1:i_niv + 14]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["jc"] == "center" or p["st"] or txt.startswith("विषय"):
            continue
        if txt.startswith("श्रीकृष्णजन्माष्टमी निवेदक"):
            continue
        if txt.startswith("वि० सं०"):
            b.add("TXT-Right", "निवेदक—राजेन्द्र कुमार धवन")
            b.add("TXT-Right", "श्रीकृष्णजन्माष्टमी, " + re.sub(r"\s*राजेन्द्र कुमार धवन\s*$", "", txt))
            continue
        b.add("Normal", ocr_fix(fix_quotes(txt)))

    # the topics
    n_topics = n_q = 0
    pic = None
    for i in range(i_body, i_end):
        p = P[i]
        t, txt = p["t"], tidy(p["t"].replace("\n", " "))
        if p["figs"]:
            if i == i_pic:
                blob, ext = bc.optimize_image(z.read("word/media/image5.png"), ".png", 200 * 1024)
                name = "rahasyamayi-vartalap-01" + ext
                write(IMG_DIR / name, blob)
                pic = name                                                # set under the heading परिशिष्ट, which follows
            continue
        if not txt:
            continue
        if p["st"] == "Heading1":
            h = HEADING_FIX.get(txt, txt)
            if h in ("अंतरंग वार्ता", "विविध"):
                b.add("Sub-Heading", h)
            elif h == "परिशिष्ट":
                b.heading(h, "Heading", OM)
                b.add("Image", '<span><img class="frame-1" src="image/%s" alt=""></span>' % pic, raw=True)
            else:
                b.heading(h, "Heading", OM)
                n_topics += 1
            continue
        if p["jc"] == "center" and is_mark_row(txt):
            continue                                                  # "===::0::===" between the topics, or an empty ornament line
        if p["jc"] == "center":
            for ln in [tidy(x) for x in t.split("\n") if tidy(x)]:
                b.add("Shlok", ocr_fix(ln))
            continue
        txt = ocr_fix(fix_quotes(txt))
        if Q_RE.match(txt):
            n_q += 1
            b.add("TXT-Bold", Q_RE.sub("प्रश्न—", txt))
        elif A_RE.match(txt):
            b.add("Normal", A_RE.sub("स्वामीजी—", txt))
        elif re.fullmatch(r"\([^()]{3,70}\)", txt):
            b.add("Shlok-Right", txt)
        else:
            b.add("Normal", txt)
    b.add("Chapter-End-Text", "॥ श्रीकृष्णार्पणमस्तु ॥")

    out = b.html()
    n = validate(out)
    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (OUT.stat().st_size / 1024), "| chapters:", n, "| topics:", n_topics, "| questions:", n_q)
    if len(sys.argv) > 2:
        write(Path(sys.argv[2]), z.read("word/media/image1.png"))
        print("cover picture saved to", sys.argv[2])
    register(NAME, None, OUT)


if __name__ == "__main__":
    main()

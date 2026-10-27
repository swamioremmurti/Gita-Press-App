#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_saras_bhajanavali.py -- import "सरस भजनावली" (भाग-१) by बजरंगलाल सोनी (Gita Prakashan) from the OCR Word file "25_continuous_print_book.docx".

The songs are clean OCR; the group titles (Heading1 in italics) were read through a wrong font map ("ढ" for "ह", "ग)िता" for "गीता" ...), so they are set
from HEADINGS below, which I made out from each title and the first line of its songs; the ones I could only guess are marked in GUESSED (said so to the user).

    title page    cover-Shri-Hari / cover-Book-Name / cover-subtitle (भाग-१) / cover-Author-Name / cover-Publisher-Note
    नम्र निवेदन    Heading;   सरस भजनावली (भाग-१)   Heading with the 90 groups of songs as Sub-Headings; each song: Numbers "(१)" + Shlok lines,
                  "तर्ज—..." lines -> Sholk, "॥2॥" -> "॥२॥"
    dropped       the printed list of first lines "पद सूची" (the reader has its own contents)
The cover is the picture the user gave (saras-bhajanavali.webp).

    python tools/build_saras_bhajanavali.py "<25_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_ramsukhdas_docx import Book, esc, tidy, ocr_fix, read_docx, validate, write, OM, PUBLISHER, BOOKS, DATA_JS  # noqa: E402

NAME = "सरस भजनावली"
OUT = BOOKS / (NAME + ".html")
AUTHOR = "बजरंगलाल सोनी"
DEV = str.maketrans("0123456789", "०१२३४५६७८९")

# the 91 Heading1 paragraphs after the book title (index = order in the book); None = the OCR is right as it stands
HEADINGS = [
    "गणेश-वन्दन", None, None, "गुरुजन-वन्दन", "हमारे सर्वस्व", None, "गायक या नालायक", "प्रियतम से वार्तालाप", "गीता-स्तुति", "हरि-मुख की वाणी गीता",
    "प्यारी-प्यारी गीता", "गीता-जयन्ती", "गीता-उपदेश", "गीता-अमृत-संजीवनी", "हरि-हृदयेश्वरी गीता", "प्रभु का हृदय गीता", None,
    "गीता की दीक्षा और आज की शिक्षा", None, None, "हमारा धन गीता", None, "गीता-गायक श्रीकृष्ण (लोक-गीत)", None,
    None, "पाप कर्म मनुष्य कामना से करता है, ईश्वर नहीं कराता", None, "गीताजी की आरती", None, "गौ-रक्षा के पद (राजस्थानीमें)", None,
    "गौ-सेवा से कल्याण", "गौ-वध बन्द न करने वालोंको वोट न दें", "गौ-हत्यारों को ललकार", "गौ-भक्तों की चेतावनी", "गौमाता की करुण पुकार",
    "विधर्मियों का राज्य", "प्रभु से दीनतापूर्वक प्रार्थना", "गौमाता की आरती", "गैया मैया की आरती", None, "गंगाजी सहित पाँच ‘ग’", None,
    "गंगा-स्नान व सत्संग की महिमा", None, "हरि-गुण गाने की प्रेरणा", "सत्संग की उत्कण्ठा", "सत्संग में अपने साथी-सम्बन्धी को भी लायें", None,
    "सम्बन्ध की दृढ़ स्वीकृति", None, None, "मीठा मेवा", None, "माताएँ हरि-भक्त पैदा करें (राजस्थानीमें)", "बड़े कुल की माता-बहनों से (लोकगीत)",
    "बहनों का गहना", "भारतीय नारी", "ब्रह्मचर्य-रक्षा", None, "आडम्बररहित भक्ति करें", None, "उस दिन को याद करें", "हरि-भक्ति के रंग", "हरि-माया का खेल",
    None, "माताओं को चेतावनी", "गर्भस्थ शिशु की आह", None, "प्रभु से दीनतापूर्वक प्रार्थना", "प्रभु से आत्मीयतापूर्वक उद्गार",
    "सत्संग करनेवाले भाई-बहनों से निवेदन", "म्हारी सच्चिदानन्दमयी माता", "प्रियतम की याद", "दर्शन-लालसा", "प्रियतम से अपनी स्थिति का वर्णन",
    "माया-पति परमेश्वर", "पूर्ण शरणागति", "विश्व के निर्माणकर्ता", "प्रभुकी आश्चर्यमयी कृपा", "वासुदेवः सर्वम्", None, "विराट-रूप भगवान की स्तुति",
    "श्याम से नित्य सम्बन्ध", "अलबेला यार", None, None, "वैष्णवजन की पहचान", "दर्शन की भीख", "सत्संगी भाई-बहनों से राम-राम", None,
]
GUESSED = ["गणेश-वन्दन (OCR: ठदन्व्द्न)", "गायक या नालायक (OCR: गायक उतर लायक)", "गंगाजी सहित पाँच ‘ग’ (OCR: ... ग? उक्ष्‌)"]


def song_lines(t):
    lines = [tidy(x) for x in t.split("\n") if tidy(x)]
    out = []
    for ln in lines:
        ln = ocr_fix(ln)
        ln = ln.replace("॥।॥", "॥१॥")
        ln = re.sub(r"॥\s*(\d+)\s*॥", lambda m: "॥%s॥" % m.group(1).translate(DEV), ln)
        out.append(ln)
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, _ = read_docx(sys.argv[1])
    b = Book(NAME)

    i_niv = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "नम्र निवेदन")
    i_book = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "सरस भजनावली")
    heads = [i for i, p in enumerate(P) if p["st"] == "Heading1" and i > i_book + 1]
    if len(heads) != len(HEADINGS):
        raise SystemExit("%d group headings, %d in HEADINGS" % (len(heads), len(HEADINGS)))

    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">%s</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
         '\t\t\t<p class="cover-subtitle">(भाग-१)</p>\n\t\t\t<p class="cover-Author-Name">%s</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t</div>\n') % (
        OM, NAME, AUTHOR, PUBLISHER, "%sके मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।" % PUBLISHER)
    b.pages.append(t)

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for p in P[i_niv + 1:i_niv + 5]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or txt.startswith("श्रीरामनवमी निवेदक"):
            continue
        if txt.startswith("वि०सं०"):
            b.add("TXT-Right", "निवेदक—राजेन्द्र कुमार धवन")
            b.add("TXT-Right", "श्रीरामनवमी, " + re.sub(r"\s*राजेन्द्र कुमार धवन\s*$", "", txt))
            continue
        b.add("Normal", txt)

    b.heading("सरस भजनावली (भाग-१)", "Heading", OM)
    n_songs = 0
    bounds = heads + [len(P)]
    for gi, hi in enumerate(heads):
        title = HEADINGS[gi] or tidy(P[hi]["t"])
        # the "पाप कर्म ..." line has no song under it: it is the first half of the next title (HEADINGS carries the whole)
        if not any(P[j]["t"].strip() for j in range(hi + 1, bounds[gi + 1])) and gi + 1 < len(heads):
            continue
        b.add("Sub-Heading", title)
        for p in P[hi + 1:bounds[gi + 1]]:
            txt = p["t"].strip()
            if not txt:
                continue
            if re.fullmatch(r"\(\s*[०-९0-9]+\s*\)", txt):
                n_songs += 1
                b.add("Numbers", txt.translate(DEV))
                continue
            lines = song_lines(p["t"])
            for ln in lines:
                if re.match(r"(तर्ज|धुन|राग)\s*[-—–]", ln):
                    b.add("Sholk", re.sub(r"^(तर्ज|धुन|राग)\s*[-—–]+\s*", r"\1—", ln))
                elif len(lines) >= 6 and len(ln) < 28 and not re.search(r"[।॥,;!?]", ln):
                    b.add("Uvaacha", ln)
                else:
                    b.add("Shlok", ln)

    out = b.html()
    ids = validate(out)
    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| groups:", out.count('class="Sub-Heading"'), "| songs:", n_songs)

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Bajans",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k2 = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k2 + 1] + "," + nl + entry + d[k2 + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

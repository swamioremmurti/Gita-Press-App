#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_bhaiji_jaisa.py -- import two more Gitavatika Prakashan books from the OCR Word files (helpers: tools/build_prem_saras.py):
    "भाईजी चरितामृत"      <- Bhai_ji_Chirtamrit_continuous_print_book.docx   (Shri Poddarji's life in his own words and letters; 84 sections)
    "जैसा बीज वैसा फल"    <- Jaisa_beej_waisa_fal_continuous_print_book.docx  (accounts from Kalyan about karma and its fruit; 62 pieces + 3 poems)

    title page    cover-Shri-Hari / cover-Book-Name / (Jaisa: the portrait of the docx) / cover-Author-Name / the Gitavatika note
    sections      a Heading each (Heading2 of the Bhaiji docx, "(१) ..." of the Jaisa docx -> "१. ...");  the end of Jaisa: the life sketch of Bhaiji
    inside        verses -> Shlok;  "(कल्याण वर्ष ...)", "(गीता ११/३६)" and the senders' names -> Shlok-Right;  letter endings ("आपका - हनुमान") -> TXT-Right;
                  the short lines that are titles of parts -> Sub-Heading, numbered parts ("(१)", "[२]", "२") are numbered again in order (the OCR repeats some)
    dropped       the printed contents list, the "* * *" rows between the parts, the OCR's strip of broken print

    python tools/build_bhaiji_jaisa.py bhaiji "<Bhai_ji_Chirtamrit_continuous_print_book.docx>"
    python tools/build_bhaiji_jaisa.py jaisa  "<Jaisa_beej_waisa_fal_continuous_print_book.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from build_ramsukhdas_docx import Book, tidy, read_docx, validate, write, OM, BOOKS, DATA_JS  # noqa: E402
from build_prem_saras import BLANK, DEV, PUBLISHER, IMG_DIR, fix as base_fix, hyphens, is_ref, lines_of  # noqa: E402

CLOSING = "आलोक : विस्तृत जानकारीके लिये गीतावाटिका प्रकाशन, गोरखपुरसे प्रकाशित ‘श्रीभाईजी – एक अलौकिक विभूति’ पुस्तक अवश्य पढ़ें।"
AUTHOR = "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार"
DEVNUM = "०-९0-9"
SIGN = re.compile(r"^(?:(?:केवल )?(?:आपका|तुम्हारा|तम्हारा|अनुगत|भवदीय)(?: भाई)?\s*[-–]?\s*(?:हनुमान\S*(?: पोद्दार)?)?|हनुमान(?:प्रसाद)?(?: पोद्दार)?)$")
BHAIJI_SUB = {131, 133, 135, 137, 139, 148, 150, 152, 158, 168, 336, 382, 469, 500, 519, 586, 591, 594, 626, 629, 1193, 1201, 1206}


def fix(t):
    t = re.sub(r"[“‘*`']\s*कल्याण\s*['’]\s*", "‘कल्याण’ ", t)
    t = re.sub(r"“कल्याण\s+", "‘कल्याण’ ", t)
    t = t.replace("पोद्दा,", "पोद्दार,").replace("पोद्दा ", "पोद्दार ")
    return base_fix(t)


class Seq:
    """Numbers of the parts inside one section, set right: a number that does not go up is the one after the last."""
    def __init__(self):
        self.last = 0

    def next(self, n):
        self.last = 1 if n == 1 else (n if n > self.last else self.last + 1)
        return self.last


def num_of(t):
    m = re.fullmatch(r"[\(\[]\s*([%s]+)\s*[\)\]]|([%s]+)" % (DEVNUM, DEVNUM), t)
    if not m:
        return None
    s = (m.group(1) or m.group(2)).translate(str.maketrans("०१२३४५६७८९", "0123456789"))
    return int(s)


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("bhaiji", "jaisa"):
        raise SystemExit(__doc__)
    which = sys.argv[1]
    NAME = "भाईजी चरितामृत" if which == "bhaiji" else "जैसा बीज वैसा फल"
    OUT = BOOKS / (NAME + ".html")
    z, P, _ = read_docx(sys.argv[2])
    b = Book(NAME)

    pic = ""
    if which == "jaisa":
        blob, ext = bc.optimize_image(z.read("word/media/image1.png"), ".png", 200 * 1024)
        write(IMG_DIR / ("jaisa-beej-waisa-fal-01" + ext), blob)
        pic = '\t\t\t<p class="Image"><span><img class="frame-1" src="image/jaisa-beej-waisa-fal-01%s" alt=""></span></p>\n' % ext
    t = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n' % NAME
         + pic +
         '\t\t\t<p class="cover-Author-Name">हनुमानप्रसाद पोद्दार</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
         '\t\t\t<p class="cover-Publisher-Note">%s के मूल ग्रंथ</p>\n\t\t\t<p class="cover-Publisher-Note">— सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n\t\t</div>\n') % (
        "गीतावाटिका प्रकाशन, गीतावाटिका - गोरखपुर")
    b.pages.append(t)

    h1 = [i for i, p in enumerate(P) if p["st"] == "Heading1"]
    names = [tidy(P[i]["t"].replace("\n", " ")) for i in h1]
    i_toc = h1[names.index("विषय-सूची")]
    if which == "bhaiji":
        body = [i for i, p in enumerate(P) if i > i_toc and p["st"] == "Heading2"]
    else:
        body = [i for i in h1 if i > i_toc]

    seq = Seq()
    seq_skip = []

    def end_of_sentence_tail(txt):
        k = max(txt.rfind("।"), txt.rfind("?"), txt.rfind("!"), txt.rfind("॥"), txt.rfind("’"), txt.rfind("'"), txt.rfind("”"))
        return k

    def para(i, p):
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["figs"] or p["st"] == "Title" or txt == OM or BLANK.fullmatch(txt):
            return
        n = num_of(txt)
        if n is not None and len(txt) <= 6:
            b.add("Sub-Heading", "(%s)" % str(seq.next(n)).translate(DEV))
            return
        m = re.fullmatch(r"\(\s*([%s]+)\)\s*(.+)" % DEVNUM, txt)
        if m and p["jc"] == "both" and len(txt) < 60:                      # "( १) श्रीमद्भगवद्गीता"
            b.add("Sub-Heading", "(%s) %s" % (m.group(1), fix(m.group(2))))
            return
        if p["jc"] == "right":
            for ln in lines_of(p):
                b.add("TXT-Right", fix(ln))
            return
        if SIGN.fullmatch(txt):
            b.add("TXT-Right", fix(txt))
            return
        if which == "bhaiji" and i in BHAIJI_SUB:
            b.add("Sub-Heading", fix(txt))
            return
        mb = re.fullmatch(r"\[\s*(.+?)\s*\]", txt)
        if mb and not re.fullmatch(r"[%s]+" % DEVNUM, mb.group(1)):         # "[विदेहराजका अनुपम त्याग]": the title of a part
            b.add("Sub-Heading", fix(mb.group(1)))
            return
        if txt.startswith("आचार्य श्रीगदाधर रामानुजम"):
            b.add("Shlok-Right", fix(txt))
            return
        if p["jc"] == "center":
            if is_ref(txt) or re.fullmatch(r"\(.{1,60}\)", txt):
                b.add("Shlok-Right", fix(txt))
            elif len(txt) <= 90 and txt[0] != "(" and (txt[0] in "-–" or "कल्याण" in txt or "पद" in txt or "पोद्दार" in txt or not re.search(r"[।॥?!,]", txt)):
                b.add("Shlok-Right", fix(re.sub(r"^[-–]+\s*", "— ", txt)))
            else:
                b.add("Normal", fix(txt))
            return
        if p["jc"] == "both":
            nxt = tidy(P[i + 1]["t"]) if i + 1 < len(P) else ""
            if re.match(r"^--?\s*\S", txt) and len(txt) < 60:                  # "--हनुमानप्रसाद पोद्दार": the sender at the end of a piece
                b.add("Shlok-Right", fix(re.sub(r"^[-–]+\s*", "— ", txt)))
                return
            if which == "jaisa" and len(txt) <= 70 and not re.search(r"[।॥?!\.\)’”'\",\-:—]$|--$", txt)                     and not txt.endswith(("उवाच", "ोवाच")) and txt[0] not in "“‘'\"" and "।" not in txt:
                if P[i + 1]["jc"] == "center" and nxt.startswith("(कल्याण"):
                    b.add("Shlok-Right", fix(txt))                             # the sender's name, before the reference
                elif txt.endswith(("के", "की", "का", "तथा", "और", "एवं")) and 0 < len(nxt) < 40 and not nxt.startswith(("(", "[")) and P[i + 1]["jc"] == "both":
                    b.add("Sub-Heading", fix(txt + " " + nxt))                  # a title cut over two lines
                    seq_skip.append(i + 1)
                else:
                    b.add("Sub-Heading", fix(txt))
                return
            b.add("Normal", fix(txt))
            return
        ls = lines_of(p)                                                  # no alignment: verse lines, or a stray line
        if len(ls) == 1 and (len(txt) > 110 or txt.endswith("उवाच") or txt.endswith("उवाच--") or re.search(r"[:\-–]$", txt) and len(txt) < 40 and "।" not in txt):
            b.add("Normal", fix(txt))
        elif len(ls) == 1 and len(txt) < 45 and not re.search(r"[।॥?!,'’”]", txt):
            b.add("Sub-Heading", fix(txt))
        else:
            for ln in ls:
                b.add("Shlok", fix(ln))

    # the opening, before the first section
    if which == "jaisa":
        b.heading("नम्र निवेदन", "Heading", OM)
        i_niv = h1[names.index("नम्र निवेदन")]
        for i in range(i_niv + 1, i_toc):
            p = P[i]
            if p["st"] != "Heading1":
                para(i, p)

    n = 0
    skip = 0
    for kk, hi in enumerate(body):
        end = body[kk + 1] if kk + 1 < len(body) else len(P)
        title = tidy(P[hi]["t"].replace("\n", " "))
        m = re.fullmatch(r"\(([०-९0-9]+)\)\s*(.*)", title)
        if which == "jaisa" and m:
            n += 1
            ttl = hyphens(m.group(2))
            ttl = "इस" + ttl if ttl.startswith("स हाथ दे") else ttl      # the OCR lost the first letter
            b.heading("%s. %s" % (m.group(1).translate(DEV), fix(ttl)), "Heading", OM)
        else:
            n += 1
            b.heading(fix(title.replace("/", " ")), "Heading", OM)
        if which == "jaisa":
            seq.last = 0                                                 # (Bhaiji: the numbers run on across the sections that follow each other)
        skip = 0
        for i in range(hi + 1, end):
            p = P[i]
            if skip:
                skip -= 1
                continue
            if i in seq_skip:
                continue
            txt = tidy(p["t"].replace("\n", " "))
            if which == "bhaiji" and p["figs"]:                          # "सकल अंग पद-बिमुख ..." is the first line of a verse: its end "है।" is in the strip
                continue
            if which == "jaisa" and p["jc"] == "both" and i + 1 < end and tidy(P[i + 1]["t"]) and len(tidy(P[i + 1]["t"])) < 25 and P[i + 1]["jc"] == "both" \
                    and tidy(P[i + 1]["t"])[0] not in "[(" and not re.search(r"[।॥?!\)’”'\.:—-]$", txt) and len(txt) > 70:
                k = end_of_sentence_tail(txt)                           # a paragraph that ends with the title of the next part, cut by the page
                if k > 0 and len(txt) - k < 80:
                    b.add("Normal", fix(txt[:k + 1]))
                    b.add("Sub-Heading", fix(txt[k + 1:].strip() + " " + tidy(P[i + 1]["t"])))
                    skip = 1
                    continue
            if kk == len(body) - 1 and txt.startswith("आलोक"):
                b.add("Normal", CLOSING)
                skip = 1
                continue
            if txt.startswith(("* वन्दे", "“वन्दे", "‘वन्दे")):
                b.add("Shlok", "वन्दे महापुरुष ते चरणारविन्दम्")
                continue
            if which == "bhaiji" and p["st"] == "" and txt.startswith("है तुलसिहिं"):
                b.add("Shlok", fix(txt))
                continue
            para(i, p)

    out = b.html()
    if which == "bhaiji":                                                    # the verse of the section "सकल अंग पद-बिमुख ..."
        out = out.replace("मुख नाम की ओट लई</p>", "मुख नाम की ओट लई है।</p>", 1)
    ids = validate(out)
    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| chapters:", ids, "| sections:", n)

    d = DATA_JS.read_text(encoding="utf-8")
    mm = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if mm:
        write(DATA_JS, d[:mm.start()] + mm.group(1) + str(size) + d[mm.end():])
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k2 = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k2 + 1] + "," + nl + entry + d[k2 + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

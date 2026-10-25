#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_panchratna_gita.py -- import "श्रीपंचरत्नगीता" (Gita Press) from "Extracted Book (8).html" into the library.

The export comes from an e-book (Calibre class names block_27, block_28 ...), so every class is mapped to master.css classes:

    title page     cover-Shri-Hari / cover-Book-Name / cover-subtitle / Tavmev-Mata--pita / cover-Publisher-Note   (cover-picture page and the printed
                   contents, whose links pointed into the e-book's files, are dropped: the reader has its own contents list)
    Heading        गीता-करन्यास-ध्यानादि (2), गीता-माहात्म्यम् (3), श्रीमद्भगवद्गीता (4, with the 18 अध्याय as Sub-Headings 4_1 .. 4_18), आरती (5),
                   विष्णुसहस्रनामस्तोत्रम् (6), भीष्मस्तवराज (7), अनुस्मृति (8), गजेन्द्रमोक्ष (9)
    verses         block_27 / block_20 -> Shlok      their number "(२। १३)" -> "१३॥" after the ॥ of the shloka (Shlok-reference only if no shloka line precedes)      speaker lines ("अर्जुन उवाच") and labels -> Uvaacha
    prose          विनियोग / न्यास -> Gadya          colophons "ॐ तत्सदिति … अध्याय:" -> Chapter-End-Text
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --only "श्रीपंचरत्नगीता.html".

    python tools/build_panchratna_gita.py "<Extracted Book (8).html>"
"""
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "श्रीपंचरत्नगीता"
OUT = BOOKS / (NAME + ".html")
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
SECTION = re.compile(r'<section class="epub-page" data-page="\d+">(.*?)</section>', re.S)

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME

SUBTITLE = "श्रीमद्भगवद्गीतामाहात्म्यादिसहिता श्रीविष्णुसहस्रनामस्तोत्रभीष्मस्तवराजानुस्मृतिगजेन्द्रमोक्षसहिता च"
# the top-level Headings after the Gita, in the order of the book (the text of the h1 of the export -> the id number)
TOP = {"आरती": 5, "अथ विष्णुसहस्रनामस्तोत्रम्": 6, "भीष्मस्तवराज:": 7, "अथ अनुस्मृति:": 8, "अथ गजेन्द्रमोक्ष:": 9}


def write(p, s):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def text_of(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h).replace("&nbsp;", " ")).replace("\xa0", " ").strip()


def inline(h):
    h = re.sub(r"<br\b[^>]*>", "", h)
    h = re.sub(r"</?span[^>]*>", "", h)
    return re.sub(r"\s+", " ", h).strip()


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = Path(sys.argv[1]).read_text(encoding="utf-8")
    secs = SECTION.findall(src)
    if len(secs) != 28:
        raise SystemExit("unexpected structure: %d sections" % len(secs))
    secs[6] = secs[6] + "\n" + secs[7]                           # the third अध्याय runs over two pages of the e-book
    body_secs = [secs[3], secs[4], secs[5], secs[6]] + secs[8:]

    pages = []
    title = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
             '\t\t\t<p class="cover-subtitle">%s</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव माता च पिता त्वमेव</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव बन्धुश्च सखा त्वमेव।</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव विद्या द्रविणं त्वमेव</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव सर्वं मम देवदेव॥</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t</div>\n') % (NAME, SUBTITLE, NOTE)
    pages.append(title)

    gita_n = 0                                                    # the अध्याय in hand (Sub-Heading 4_n)
    cur = None

    def start(pb="&nbsp;"):
        nonlocal cur
        if cur is not None and len(cur) == 1:                     # nothing but the page-break line so far: keep that page
            if pb != "&nbsp;":
                cur[0] = '\t\t\t<p class="Page-Break">%s</p>\n' % pb
            return
        if cur is not None:
            pages.append('\n<div class="Basic-Graphics-Frame">\n' + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % pb]

    for si, sec in enumerate(body_secs):
        pb = None
        first = True
        for m in re.finditer(r'<(h1|p)\b([^>]*)>(.*?)</\1>', sec, re.S):
            tag, attrs, h = m.groups()
            cm = re.search(r'class="([^"]*)"', attrs)
            cls = cm.group(1) if cm else ""
            txt = text_of(h)
            if not txt:
                continue
            if cls == "block_":                                   # "॥ ॐ श्रीपरमात्मने नम:॥" -- the line at the top of a page
                start(txt)
                first = False
                continue
            if first:
                start()
                first = False
            if tag == "h1":
                if "ध्याय:" in txt:
                    gita_n += 1
                    if gita_n > 1:
                        start()
                    cur.append('\t\t\t<p id="Chapter_4_%d" class="Sub-Heading">%s</p>\n' % (gita_n, txt))
                else:
                    n = TOP[txt]
                    start()
                    cur.append('\t\t\t<p id="Chapter_%d" class="Heading">%s</p>\n' % (n, txt))
                continue
            if cls == "block_1" and si == 0:                      # the page that opens with विनियोग / न्यास / ध्यान
                cur.append('\t\t\t<p id="Chapter_2" class="Heading">गीता-करन्यास-ध्यानादिः</p>\n')
                continue
            if cls == "block_24":                                 # "श्रीमद्भगवद्गीता" over the 18 अध्याय
                cur.append('\t\t\t<p id="Chapter_4" class="Heading">%s</p>\n' % txt)
                continue
            if cls == "block_14":
                if txt == "अथ गीतामाहात्म्यम्":
                    start()
                    cur.append('\t\t\t<p id="Chapter_3" class="Heading">%s</p>\n' % txt)
                else:
                    cur.append('\t\t\t<p class="Uvaacha">%s</p>\n' % inline(h))
            elif cls in ("block_27", "block_20"):
                cur.append('\t\t\t<p class="Shlok">%s</p>\n' % inline(h))
            elif cls in ("block_28", "block_66"):
                ref = re.sub(r"(?<=[०-९]) (?=[०-९])", "", inline(h))
                num = re.sub(r"[()\s]", "", ref).split("।")[-1]          # "(२। १३)" -> "१३": the verse number, set after the ॥ of the shloka
                if cur and re.fullmatch(r'\t\t\t<p class="Shlok">[^<]*</p>\n', cur[-1]) and re.fullmatch(r"[०-९]+", num):
                    cur[-1] = cur[-1].replace("</p>", " %s॥</p>" % num)
                else:
                    cur.append('\t\t\t<p class="Shlok-reference">%s</p>\n' % ref)
            elif cls == "block_15":
                cur.append('\t\t\t<p class="Gadya">%s</p>\n' % inline(h))
            elif cls in ("block_36", "block_036"):
                cur.append('\t\t\t<p class="Chapter-End-Text">%s</p>\n' % inline(h))
            else:
                raise SystemExit("unmapped paragraph class %s: %s" % (cls, txt[:60]))
    start()
    pages.append('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="Page-Break">&nbsp;</p>\n\t\t</div>\n')
    if gita_n != 18:
        raise SystemExit("expected 18 अध्याय, found %d" % gita_n)

    # the last line of a shloka (it ends with ॥, with or without its verse number) is followed by an extra 1em (master.css: p.Shlok.shloka-end)
    pages = [re.sub(r'<p class="Shlok">([^<]*॥\s*(?:[०-९]+\s*॥)?\s*)</p>', r'<p class="Shlok shloka-end">\1</p>', p) for p in pages]
    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(pages)) + "\n\n</body>\n</html>"

    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    classes = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        classes.update(m.group(1).split())
    bad = sorted(c for c in classes if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if re.search(r"calibre|block_|text_\d|Gita-Seva|गीता\s*सेवा", out):
        raise SystemExit("a leftover of the export remains")
    ids = re.findall(r'id="(Chapter_[\d_]+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")

    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| pages:", len(pages), "| ids:", ids)

    d = DATA_JS.read_text(encoding="utf-8")
    if '"file":  "%s.html"' % NAME not in d:
        size = round(OUT.stat().st_size / 1024, 1)
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Gita",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (NAME, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

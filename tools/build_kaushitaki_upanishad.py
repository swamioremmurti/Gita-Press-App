#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_kaushitaki_upanishad.py -- import "कौषीतकिब्राह्मणोपनिषत् (सानुवाद)" (स्वामी महेशानन्द गिरि, मेहता चेरीटेबिल प्रज्ञालय ट्रस्ट)
from the Word file "कौषीतकिब्राह्मणोपनिषत्_final.docx" into the library.

The docx: styles Heading2 (the invocation, "(सानुवाद)", "॥ शान्तिमन्त्रः ॥") / Heading1 (title, आमुख, the four अध्याय) / Shlok (the
Sanskrit mantra, one paragraph each) / plain paragraphs (its Hindi translation) / Chapter-End; no pictures, no footnotes. Mapping
(master.css classes only):

    title page    cover-Shri-Hari (the invocation) / cover-Book-Name / cover-subtitle (सानुवाद) / cover-Author-Name (the honorifics and
                  "स्वामी महेशानन्द गिरि जी महाराज की आज्ञानुसार", three lines) / cover-Publisher-Note (the trust, address, "द्वारा धर्मार्थ वितरित")
    Heading1      Heading, id Chapter_N, one reader page each: आमुख, शान्तिमन्त्रः, the four अध्याय
    Shlok         Shlok;   plain paragraph -> Normal;   the "भगवत्पादीयो / स्वामी महेशानन्दगिरिः" signature -> TXT-Right
    Chapter-End   Chapter-End-Text
  * The verse numbers ॥९॥ ॥१९॥ ॥२९॥ were typed as ॥६॥ ॥१६॥ ॥२६॥ (a digit mix-up); they are put right where the run of numbers makes it plain.
  * The colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --apply --only "कौषीतकिब्राह्मणोपनिषत्.html".

    python tools/build_kaushitaki_upanishad.py "<कौषीतकिब्राह्मणोपनिषत्_final.docx>"
"""
import re
import sys
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "कौषीतकिब्राह्मणोपनिषत्"
OUT = BOOKS / (NAME + ".html")
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
AUTHOR = "स्वामी महेशानन्द गिरि"
PUBLISHER = "मेहता चेरीटेबिल प्रज्ञालय ट्रस्ट"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME

DEVA = "०१२३४५६७८९"


def write(p, data):
    data = data if isinstance(data, bytes) else data.encode("utf-8")
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(data)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tidy(t):
    t = t.replace(" ", " ").replace("\t", " ")
    return re.sub(r" {2,}", " ", t).strip()


def to_int(s):
    return int("".join(str(DEVA.index(c)) for c in s))


def to_deva(n):
    return "".join(DEVA[int(c)] for c in str(n))


def read_docx(path):
    d = zipfile.ZipFile(path).read("word/document.xml").decode("utf8")
    body = d[d.index("<w:body>"):]
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", body, re.S):
        st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        s = ""
        for m in re.finditer(r"<w:t[^>]*>([^<]*)</w:t>|<w:br[^>]*/>|<w:tab/>", p):
            if m.group(1) is not None:
                s += m.group(1)
            elif m.group(0).startswith("<w:tab"):
                s += " "
            else:
                s += "\n"
        paras.append({"st": st.group(1) if st else "", "t": s})
    return paras


def fix_verse_numbers(P):
    """॥९॥ / ॥१९॥ / ॥२९॥ typed as ...६ : inside one chapter a number below the one before it, whose +3 continues the run."""
    prev = None
    n_fix = 0
    for p in P:
        if p["st"] == "Heading1":
            prev = None
        if p["st"] != "Shlok":
            continue
        ms = list(re.finditer(r"॥\s*([०-९]+)\s*॥", p["t"]))
        if not ms:
            continue
        n = to_int(ms[-1].group(1))
        if prev is not None and n < prev and n + 3 == prev + 1:
            t = p["t"]
            a, b = ms[-1].span(1)
            p["t"] = t[:a] + to_deva(n + 3) + t[b:]
            n += 3
            n_fix += 1
        prev = n
    return n_fix


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    P = read_docx(sys.argv[1])
    n_fix = fix_verse_numbers(P)

    pages, cur = [], None
    chap_no = 1

    def new_page(top="&nbsp;"):
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % top]

    def add(cls, text, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, esc(text)))

    # title page: paragraphs 0-4 (invocation, title, (सानुवाद), the honorifics block, the trust block)
    inv = tidy(P[0]["t"])
    honor = [tidy(x) for x in P[3]["t"].split("\n") if tidy(x)]
    trust = [tidy(x) for x in P[4]["t"].split("\n") if tidy(x)]
    if tidy(P[1]["t"]) != NAME or len(honor) != 3 or len(trust) != 3:
        raise SystemExit("the title page is not what this script expects")
    title = ['\n<div class="Basic-Graphics-Frame">\n', '\t\t\t<p class="cover-Shri-Hari">%s</p>\n' % esc(inv),
             '\t\t\t<p class="cover-Book-Name">%s</p>\n' % NAME, '\t\t\t<p class="cover-subtitle">%s</p>\n' % esc(tidy(P[2]["t"]))]
    title += ['\t\t\t<p class="cover-Author-Name">%s</p>\n' % esc(x) for x in honor]
    title += ['\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % esc(x) for x in trust]
    title.append("\t\t</div>\n")
    pages.append("".join(title))

    start = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "आमुख")
    n_para = 0
    for i in range(start, len(P)):
        p = P[i]
        txt = tidy(p["t"].replace("\n", " "))
        st = p["st"]
        if st in ("Heading1", "Heading2"):
            chap_no += 1
            new_page("ॐ श्रीपरमात्मने नमः" if chap_no == 2 else "&nbsp;")
            add("Heading", txt, ' id="Chapter_%d"' % chap_no)
            continue
        if not txt:
            continue                                    # an empty paragraph only marked the page break
        if cur is None:
            continue
        n_para += 1
        if st == "Shlok":
            add("Shlok", txt)
        elif st == "Chapter-End":
            add("Chapter-End-Text", txt)
        elif i == 9:                                    # "भगवत्पादीयो" / "स्वामी महेशानन्दगिरिः" (right aligned under the आमुख)
            lines = [tidy(x) for x in p["t"].split("\n") if tidy(x)]
            if lines != ["भगवत्पादीयो", "स्वामी महेशानन्दगिरिः"]:
                raise SystemExit("the signature paragraph moved: %r" % lines)
            for x in lines:
                add("TXT-Right", x)
        else:
            add("Normal", txt)
    new_page()                                          # flush the last page

    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")
    if "TXT-Right" not in out:
        raise SystemExit("the signature was not set right-aligned")

    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| chapters:", len(ids), "| paragraphs:", n_para, "| verse numbers fixed:", n_fix)

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Upanishad",\n        "author":  "",\n        "tikakar":  "%s",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

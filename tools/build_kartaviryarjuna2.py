#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_kartaviryarjuna2.py -- import "श्री कार्तवीर्यार्जुन मन्त्र 2" (भाग - २: विनियोग, करन्यास, अङ्गन्यास, अक्षरन्यास, ध्यान एवं मालामन्त्र, हिन्दी भावार्थ सहित) from
"Kartaviryarjuna_Mantra_Part_2_Hindi_Meaning.docx" into the library as a कल्याण सेवा ट्रस्ट book (category स्तोत्र एवं नामावली), the companion of
"श्री कार्तवीर्यार्जुन मन्त्र 1" (tools/build_kartaviryarjuna.py).

The docx has no Word styles, only tables and plain paragraphs.  Each block is a one-row table of two cells: the first has a "❖ label" line and the Sanskrit lines,
the second "हिन्दी भावार्थ एवं विधान:" and the Hindi lines (some are "• ..." or "१. ..." lists).  Mapping (master.css classes only):

    title page    cover-Book-Name / cover-subtitle ("(भाग - २)" and the contents line), the trust's logo (image/kartaviryarjuna-2.png), cover-Publisher-Note
    intro box     Heading "माहात्म्य एवं विधान" + Normal
    "॥ N. ... ॥"   Heading (id Chapter_N, one reader page each) + Sub-Heading (the "— ... —" line without the dashes)
    "❖ label"     TXT-Bold (the "❖" dropped; a trailing "(श्लोक N)" dropped, as in भाग १; a label that repeats the one before it is left out)
    Sanskrit line  Shlok (a line in brackets: Normal);  "हिन्दी भावार्थ एवं विधान:" span.strong in a Normal paragraph, its lines (also "•" / "१." ones) Normal
    "❖ ❖ ❖"       dropped;  closing two lines  Chapter-End-Text

    python tools/build_kartaviryarjuna2.py "<Kartaviryarjuna_Mantra_Part_2_Hindi_Meaning.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402
import build_lomashi_shiksha as L  # noqa: E402  (its reader for paragraphs and tables)

NAME = "श्री कार्तवीर्यार्जुन मन्त्र 2"
OUT = b.BOOKS / (NAME + ".html")
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "kartaviryarjuna-2.png"
LOGO_SRC = "neetishatakn-1.png"
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % "श्री कार्तवीर्यार्जुन मन्त्र (भाग २)")
MEAN = "हिन्दी भावार्थ एवं विधान:"


def lines(p):
    return [b.tidy(x) for x in b.plain(p).split("\n") if b.tidy(x)]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    items = L.read_items(sys.argv[1])
    stat = {"parts": 0, "blocks": 0, "shlok": 0, "meaning_lines": 0, "labels": 0, "labels_dropped": 0}

    t0, t1 = b.tidy(b.plain(items[0])), b.tidy(b.plain(items[1]))
    m = re.fullmatch(r"(.*?)\s*\(भाग\s*-\s*२\)", t0)
    if not m or "table" not in items[2]:
        raise SystemExit("the title page is not what this script expects: %r" % t0)
    if not (b.IMG_DIR / LOGO).exists():
        b.write(b.IMG_DIR / LOGO, (b.IMG_DIR / LOGO_SRC).read_bytes())
    title = ['\n<div class="Basic-Graphics-Frame">\n',
             '\t\t\t<p class="cover-Book-Name">%s</p>\n' % b.esc(m.group(1)),
             '\t\t\t<p class="cover-subtitle">(भाग - २)</p>\n',
             '\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(t1),
             '\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
             'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n' % (LOGO, PUBLISHER),
             '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % PUBLISHER, "\t\t</div>\n"]
    pages = ["".join(title)]
    cur = None
    chap = 0
    last_label = [None]

    def new_page():
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n']

    def add(cls, html, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    def heading(text):
        nonlocal chap
        chap += 1
        stat["parts"] += 1
        new_page()
        add("Heading", b.esc(text), ' id="Chapter_%d"' % chap)
        last_label[0] = None

    for it in items[2:]:
        if "table" in it:
            cells = [c for row in it["table"] for c in row]
            if len(cells) == 1 and b.tidy(b.plain(cells[0][0])).startswith("माहात्म्य एवं विधान"):       # the introduction box
                heading("माहात्म्य एवं विधान")
                txt = b.inline_html(cells[0][0])
                txt = re.sub(r'^<span class="strong">\s*माहात्म्य एवं विधान:\s*</span>\s*', "", txt)
                add("Normal", txt)
                continue
            stat["blocks"] += 1
            for p in [p for c in cells for p in c]:
                ls = lines(p)
                if not ls:
                    continue
                if ls[0].startswith("❖"):                                      # the Sanskrit cell
                    label = re.sub(r"\s*\(श्लोक\s*[०-९0-9]+\)\s*$", "", ls[0].lstrip("❖ ").strip())
                    if label != last_label[0]:
                        stat["labels"] += 1
                        add("TXT-Bold", b.esc(label))
                    else:
                        stat["labels_dropped"] += 1
                    last_label[0] = label
                    for ln in ls[1:]:
                        if ln.startswith("("):
                            add("Normal", b.esc(ln))
                        else:
                            stat["shlok"] += 1
                            add("Shlok", b.esc(ln))
                elif ls[0].startswith(MEAN):                                    # the Hindi cell
                    rest = ls[1:]
                    if rest and not re.match(r"[•०-९]", rest[0]):                 # the label and a first plain paragraph
                        add("Normal", '<span class="strong">%s</span> %s' % (b.esc(MEAN), b.esc(rest[0])))
                        rest = rest[1:]
                    else:
                        add("Normal", '<span class="strong">%s</span>' % b.esc(MEAN))
                    for ln in rest:
                        stat["meaning_lines"] += 1
                        add("Normal", b.esc(ln))
                else:
                    raise SystemExit("an unexpected table paragraph: %r" % ls[0])
            continue
        txt = b.tidy(b.plain(it).replace("\n", " "))
        if not txt or re.fullmatch(r"(❖\s*)+", txt):
            continue
        if txt.startswith("॥ श्री दत्तात्रेयार्पण"):
            for ln in lines(it):
                add("Chapter-End-Text", b.esc(ln))
        elif txt.startswith("॥"):
            heading(txt)
        elif txt.startswith("—") and txt.endswith("—"):
            add("Sub-Heading", b.esc(txt.strip("— ").strip()))
        else:
            raise SystemExit("an unexpected paragraph: %r" % txt)
    new_page()                                                      # flush the last page

    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    css = b.MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | b.STRUCTURAL
    used = set()
    for mm in re.finditer(r'class="([^"]*)"', out):
        used.update(mm.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if "\u0003" in out or "\u0001" in out or "❖" in out:
        raise SystemExit("a Word marker or a ❖ is left")
    if re.search(r"श्लोक\s*[०-९0-9]+\s*\)", out):
        raise SystemExit("a 'श्लोक N' label is left")
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")

    b.write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| stats:", stat)

    d = b.DATA_JS.read_text(encoding="utf-8")
    mm = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if mm:
        b.write(b.DATA_JS, d[:mm.start()] + mm.group(1) + str(size) + d[mm.end():])
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Stotra evam Naamavali",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        b.write(b.DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

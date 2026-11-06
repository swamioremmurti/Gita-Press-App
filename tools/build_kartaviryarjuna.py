#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_kartaviryarjuna.py -- import "श्री कार्तवीर्यार्जुन मन्त्र 1" (भाग - १) (संस्कृत मूल श्लोक एवं सविस्तार हिन्दी अर्थ सहित: ध्यान, विनियोग एवं न्यास, बीजमन्त्र-सहित
मन्त्रात्मक श्लोक) from "Kartaviryarjuna_Mantra_Part_1_Hindi_Meaning.docx" into the library as a कल्याण सेवा ट्रस्ट book (category स्तोत्र एवं नामावली).

The docx has no Word styles, only tables and plain paragraphs.  Every verse is a one-row table: a cell with the line "श्लोक N" and the verse lines, and a cell with
"हिन्दी भावार्थ: ...".  The "श्लोक N" label lines are NOT carried over (the verse's own closing number "॥ N॥" stays).  Mapping (master.css classes only):

    title page    cover-Shri-Hari (invocation, one line each) / cover-Book-Name / cover-subtitle (भाग - १, what it contains), the trust's logo
                  (image/kartaviryarjuna-1.png) and cover-Publisher-Note "कल्याण सेवा ट्रस्ट"
    intro box     Heading "माहात्म्य एवं परिचय" + Normal
    "॥ अथ ... ॥"   Heading (id Chapter_N, one reader page each) + Sub-Heading (the "— ... —" line without the dashes)
    verse         Shlok, one paragraph per line;  meaning  Normal with span.strong label
    "❖ ❖ ❖"       dropped (the pages separate the parts);  closing two lines  Chapter-End-Text

    python tools/build_kartaviryarjuna.py "<Kartaviryarjuna_Mantra_Part_1_Hindi_Meaning.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402
import build_lomashi_shiksha as L  # noqa: E402  (its reader for paragraphs and tables)

NAME = "श्री कार्तवीर्यार्जुन मन्त्र 1"
OUT = b.BOOKS / (NAME + ".html")
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "kartaviryarjuna-1.png"
LOGO_SRC = "neetishatakn-1.png"
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % "श्री कार्तवीर्यार्जुन मन्त्र (भाग १)")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    items = L.read_items(sys.argv[1])
    stat = {"parts": 0, "verses": 0, "shlok": 0, "labels_removed": 0, "meanings": 0}

    t0 = b.tidy(b.plain(items[0]))
    t1 = b.tidy(b.plain(items[1]))
    t2 = b.tidy(b.plain(items[2]))
    m = re.fullmatch(r"(.*?)\s*\(भाग\s*-\s*१\)", t0)
    if not m or "table" not in items[3]:
        raise SystemExit("the title page is not what this script expects: %r" % t0)
    if not (b.IMG_DIR / LOGO).exists():
        b.write(b.IMG_DIR / LOGO, (b.IMG_DIR / LOGO_SRC).read_bytes())
    invocation = ["॥ " + x.strip() + " ॥" for x in re.split(r"\s*॥\s*", t2) if x.strip()]
    title = ['\n<div class="Basic-Graphics-Frame">\n'] + ['\t\t\t<p class="cover-Shri-Hari">%s</p>\n' % b.esc(x) for x in invocation]
    title += ['\t\t\t<p class="cover-Book-Name">%s</p>\n' % b.esc(m.group(1)),
              '\t\t\t<p class="cover-subtitle">(भाग - १)</p>\n',
              '\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(t1),
              '\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
              'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n' % (LOGO, PUBLISHER),
              '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % PUBLISHER, "\t\t</div>\n"]
    pages = ["".join(title)]
    cur = None
    chap = 0

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

    for it in items[3:]:
        if "table" in it:
            cells = [c for row in it["table"] for c in row]
            pars = [p for c in cells for p in c]
            first = b.tidy(b.plain(pars[0]).split("\n")[0]) if pars else ""
            if len(cells) == 1 and first.startswith("माहात्म्य एवं परिचय"):          # the introduction box
                heading("माहात्म्य एवं परिचय")
                txt = b.inline_html(pars[0])
                txt = re.sub(r'^<span class="strong">\s*माहात्म्य एवं परिचय:\s*</span>\s*', "", txt)
                add("Normal", txt)
                continue
            for p in pars:
                lines = [b.tidy(x) for x in b.plain(p).split("\n") if b.tidy(x)]
                if lines and re.fullmatch(r"श्लोक\s*[०-९0-9]+", lines[0]):          # a verse: drop the "श्लोक N" label
                    stat["labels_removed"] += 1
                    stat["verses"] += 1
                    for ln in lines[1:]:
                        stat["shlok"] += 1
                        add("Shlok", b.esc(ln))
                elif lines and lines[0].startswith("हिन्दी भावार्थ"):
                    stat["meanings"] += 1
                    add("Normal", b.inline_html(p))
                elif lines:
                    raise SystemExit("an unexpected table paragraph: %r" % lines[0])
            continue
        txt = b.tidy(b.plain(it).replace("\n", " "))
        if not txt or re.fullmatch(r"(❖\s*)+", txt):
            continue
        if txt.startswith("॥ अथ"):
            heading(txt)
        elif txt.startswith("—") and txt.endswith("—"):
            add("Sub-Heading", b.esc(txt.strip("— ").strip()))
        elif txt.startswith("॥ श्री दत्तात्रेयो"):
            for ln in [b.tidy(x) for x in b.plain(it).split("\n") if b.tidy(x)]:
                add("Chapter-End-Text", b.esc(ln))
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
    if "\u0003" in out or "\u0001" in out:
        raise SystemExit("a Word marker is left")
    if re.search(r">\s*श्लोक\s*[०-९0-9]+\s*<", out):
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

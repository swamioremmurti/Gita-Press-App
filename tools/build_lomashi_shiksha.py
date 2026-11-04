#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_lomashi_shiksha.py -- import "सामवेदीया लोमशी शिक्षा" (कौथुम-राणायनीयशाखीय स्वरध्वनिवैज्ञानिक शिक्षाग्रन्थ, आठ खण्ड, मूलश्लोक + पदच्छेद +
प्रतिपदार्थ + भावार्थ) from "Samavediya_Lomashi_Shiksha_Complete.docx" into the library as a कल्याण सेवा ट्रस्ट book.

The docx has no Word styles, only bold / italic runs and tables: a title, an italic subtitle, a one-cell "ग्रन्थ-परिचय" box, eight "... खण्डः (खण्ड N: विषय)"
headings, and for every verse: "श्लोक N" / a one-cell table holding the two lines of the verse / "पदच्छेदः:" paragraph / a two-column word-meaning table /
the Hindi sense; the colophon (परिशिष्टम्) at the end has the same shape. 76 verses, 153 tables, no pictures, no footnotes. Mapping (master.css classes):

    title page    cover-Book-Name / cover-subtitle (the two italic lines), then the trust's logo (image/lomashishiksha-1.png) and cover-Publisher-Note
                  "कल्याण सेवा ट्रस्ट" (as in नारदीयशिक्षा / नीतिशतकं)
    intro box     Heading "ग्रन्थ-परिचय एवं विषय-संक्षेप" + Normal
    खण्ड heading  Heading "प्रथमः खण्डः" (id Chapter_N, one reader page each) + Sub-Heading "खण्ड १: ग्रन्थप्रतिज्ञा, ..."; परिशिष्टम् -> Heading
    "श्लोक N"      Sub-Heading-2
    verse cell    Shlok, one paragraph per line
    पदच्छेदः      Normal: bold label (span.strong) + italic words (span.inline-28)
    word table    table.Samagri-Table: th.Samagri-Table-Head, td.Samagri-Table-Cell (the Sanskrit word bold)
    Hindi sense   Normal
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --apply --only "<file>".

    python tools/build_lomashi_shiksha.py "<Samavediya_Lomashi_Shiksha_Complete.docx>"
"""
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402  (its run / paragraph helpers)

TITLE = "सामवेदीया लोमशी शिक्षा"
NAME = TITLE
OUT = b.BOOKS / (NAME + ".html")
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "lomashishiksha-1.png"
LOGO_SRC = "neetishatakn-1.png"                         # the trust's logo, the picture the other trust books carry on the title page
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % TITLE)


def read_items(path):
    d = zipfile.ZipFile(path).read("word/document.xml").decode("utf8")
    body = d[d.index("<w:body>"):]
    items = []
    for m in re.finditer(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", body, re.S):
        s = m.group(0)
        if s.startswith("<w:tbl>"):
            rows = []
            for tr in re.findall(r"<w:tr[ >].*?</w:tr>", s, re.S):
                rows.append([[b.parse_par(p, {}, {}) for p in re.findall(r"<w:p[ >].*?</w:p>", tc, re.S)] for tc in re.findall(r"<w:tc>.*?</w:tc>", tr, re.S)])
            items.append({"table": rows})
        else:
            items.append(b.parse_par(s, {}, {}))
    return items


def lines_of(par):
    return [b.tidy(x) for x in b.plain(par).split("\n") if b.tidy(x)]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    items = read_items(sys.argv[1])
    pages, cur = [], None
    chap_no = 0
    stat = {"khanda": 0, "verses": 0, "shlok": 0, "word_tables": 0, "rows": 0}

    def new_page():
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n']

    def add(cls, html, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    def heading(text):
        nonlocal chap_no
        chap_no += 1
        new_page()
        add("Heading", b.esc(text), ' id="Chapter_%d"' % chap_no)

    # --- title page: the bold title, the italic subtitle (two lines), the logo and the publisher
    if b.tidy(b.plain(items[0])) != TITLE or "table" in items[1]:
        raise SystemExit("the title page is not what this script expects")
    if not (b.IMG_DIR / LOGO).exists():
        b.write(b.IMG_DIR / LOGO, (b.IMG_DIR / LOGO_SRC).read_bytes())
    title = ['\n<div class="Basic-Graphics-Frame">\n', '\t\t\t<p class="cover-Book-Name">%s</p>\n' % TITLE]
    title += ['\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(x) for x in lines_of(items[1])]
    title.append('\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
                 'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n' % (LOGO, PUBLISHER))
    title.append('\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % PUBLISHER)
    title.append("\t\t</div>\n")
    pages.append("".join(title))

    for n, it in enumerate(items[2:], 2):
        if "table" in it:
            rows = it["table"]
            if len(rows) == 1 and len(rows[0]) == 1:
                pars = rows[0][0]
                if pars and pars[0]["pieces"] and pars[0]["pieces"][0][1] and re.search(r"[:：]\s*$", b.plain(pars[0]).strip()) and len(pars) > 1:
                    # the introduction box: a bold heading line and the text
                    heading(re.sub(r"\s*[:：]\s*$", "", b.tidy(b.plain(pars[0]))))
                    for p in pars[1:]:
                        if b.tidy(b.plain(p)):
                            add("Normal", b.inline_html(p))
                else:                                           # the verse: one paragraph per line
                    stat["verses"] += 1
                    for p in pars:
                        for ln in lines_of(p):
                            stat["shlok"] += 1
                            add("Shlok", b.esc(ln))
            else:                                               # the word-meaning table
                stat["word_tables"] += 1
                h = ['\t\t\t<table class="Samagri-Table">\n']
                for ri, row in enumerate(rows):
                    cells = []
                    for cell in row:
                        txt = "<br>".join(b.inline_html(p) for p in cell if b.tidy(b.plain(p)))
                        cells.append(('<th class="Samagri-Table-Head">%s</th>' if ri == 0 else '<td class="Samagri-Table-Cell">%s</td>') % txt)
                    stat["rows"] += 1
                    h.append("\t\t\t\t<tr>" + "".join(cells) + "</tr>\n")
                h.append("\t\t\t</table>\n")
                cur.append("".join(h))
            continue
        txt = b.tidy(b.plain(it).replace("\n", " "))
        if not txt:
            continue
        bold_first = bool(it["pieces"]) and it["pieces"][0][1]
        m = re.fullmatch(r"(\S+ः खण्डः) \((.*)\)", txt) if bold_first else None       # "प्रथमः खण्डः (खण्ड १: विषय)"
        if m:
            stat["khanda"] += 1
            heading(m.group(1))
            add("Sub-Heading", b.esc(m.group(2)))
        elif bold_first and txt.startswith("परिशिष्टम्"):
            heading(txt)
        elif bold_first and re.fullmatch(r"श्लोक [०-९0-9]+", txt):
            add("Sub-Heading-2", b.esc(txt))
        else:
            add("Normal", b.inline_html(it))
    new_page()                                                      # flush the last page

    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    css = b.MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | b.STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if "\u0003" in out or "\u0001" in out:
        raise SystemExit("a Word marker is left")
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")

    b.write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| chapters:", len(ids), "| stats:", stat)

    d = b.DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        d = d[:m.start()] + m.group(1) + str(size) + d[m.end():]
        b.write(b.DATA_JS, d)
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        b.write(b.DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

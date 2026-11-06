#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_navagraha_manjari.py -- import "नवग्रह-मन्त्र-मञ्जरी" (ग्रहवार सार्थ अनुष्ठान सङ्ग्रह: for each of the nine grahas the gayatri mantras, japa mantras with
viniyoga / rishyadi nyasa / dhyana, agamokta and puranic mantras with meaning, vedokta sabija japa with dehangnyasa, samidha and the dana table; then the appendix)
from "नवग्रह-मन्त्र-मञ्जरी (ग्रहवार सार्थ अनुष्ठान सङ्ग्रह).docx" into the library as a कल्याण सेवा ट्रस्ट book (category स्तोत्र एवं नामावली).

The docx uses Word styles (Title / Heading1-3) plus bold for the Sanskrit text.  Mapping (master.css classes only):

    title page      cover-Book-Name, cover-subtitle (the subtitle, the docx's own title and its subtitle), the trust's logo (image/navagraha-1.png), cover-Publisher-Note
    "मङ्गलाचरणम्", "भूमिका (प्रस्तावना)", "प्रथमः खण्डः — ...", "परिशिष्टम् ..."   Heading (id Chapter_N, one reader page each); a khanda's "— name" is its Sub-Heading
    Heading2 ("१. ...")  Sub-Heading-2;  Heading3 ("(क) विनियोगः")  TXT-Bold
    a bold line ending in ॥ / । (mantra, shloka, viniyoga)  Shlok;  a bold line ending in ":" ("प्रथम गायत्री:")  TXT-Bold;  any other line  Normal (bold parts span.strong)
    the bullets of the preface  Normal "• ...";  tables  Samagri-Table (as in build_lomashi_shiksha.py)

    python tools/build_navagraha_manjari.py "<नवग्रह-मन्त्र-मञ्जरी ....docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402
import build_lomashi_shiksha as L  # noqa: E402  (its reader for paragraphs and tables)

NAME = "नवग्रह-मन्त्र-मञ्जरी"
SUBTITLE = "(ग्रहवार सार्थ अनुष्ठान सङ्ग्रह)"
OUT = b.BOOKS / (NAME + ".html")
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "navagraha-1.png"
LOGO_SRC = "neetishatakn-1.png"
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % NAME)


def line_groups(par):
    """A paragraph split at its line breaks: [(all_bold, text, html)]."""
    groups, cur = [], []
    for pc in par["pieces"]:
        if pc[2] == "\n":
            groups.append(cur)
            cur = []
        else:
            cur.append(pc)
    groups.append(cur)
    out = []
    for g in groups:
        sub = dict(par)
        sub["pieces"] = g
        text = b.tidy("".join(p[2] for p in g))
        if not text:
            continue
        solid = [p for p in g if p[2].strip()]
        out.append((bool(solid) and all(p[1] for p in solid), text, b.inline_html(sub)))
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    items = L.read_items(sys.argv[1])
    stat = {"khanda": 0, "shlok": 0, "labels": 0, "tables": 0, "rows": 0, "bullets": 0}
    pages, cur = [], None
    chap = 0

    def new_page():
        nonlocal cur
        if cur is not None:
            pages.append('\n<div class="Basic-Graphics-Frame">\n' + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n']

    def add(cls, html, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    def heading(text):
        nonlocal chap
        chap += 1
        new_page()
        add("Heading", b.esc(text), ' id="Chapter_%d"' % chap)

    texts = [("" if "table" in it else b.tidy(b.plain(it).replace("\n", " "))) for it in items]
    first = next(i for i, t in enumerate(texts) if t)
    if texts[first] != "अथ नवग्रह-विधान-कल्पतरुः" or items[first + 1].get("st") != "Heading1":
        raise SystemExit("the title page is not what this script expects: %r" % texts[first])

    # --- title page
    if not (b.IMG_DIR / LOGO).exists():
        b.write(b.IMG_DIR / LOGO, (b.IMG_DIR / LOGO_SRC).read_bytes())
    title = ['\n<div class="Basic-Graphics-Frame">\n', '\t\t\t<p class="cover-Book-Name">%s</p>\n' % b.esc(NAME),
             '\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(SUBTITLE),
             '\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(texts[first]),
             '\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(texts[first + 1]),
             '\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
             'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n' % (LOGO, PUBLISHER),
             '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % PUBLISHER, "\t\t</div>\n"]
    pages.append("".join(title))

    in_preface_list = False
    for n in range(first + 2, len(items)):
        it, txt = items[n], texts[n]
        if "table" in it:
            rows = it["table"]
            stat["tables"] += 1
            h = ['\t\t\t<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%">\n', '\t\t\t<table class="Samagri-Table">\n']   # wide tables scroll sideways on a phone
            for ri, row in enumerate(rows):
                cells = []
                for cell in row:
                    t = "<br>".join(b.inline_html(p) for p in cell if b.tidy(b.plain(p)))
                    cells.append(('<th class="Samagri-Table-Head">%s</th>' if ri == 0 else '<td class="Samagri-Table-Cell">%s</td>') % t)
                stat["rows"] += 1
                h.append("\t\t\t\t<tr>" + "".join(cells) + "</tr>\n")
            h.append("\t\t\t</table>\n\t\t\t</div>\n")
            cur.append("".join(h))
            continue
        if not txt:
            continue
        st = it.get("st", "")
        m = re.fullmatch(r"(\S+ः खण्डः)\s*—\s*(.+)", txt)
        if m:                                                           # "प्रथमः खण्डः — श्रीसूर्यनारायणः"
            stat["khanda"] += 1
            heading(m.group(1))
            add("Sub-Heading", b.esc(m.group(2)))
            in_preface_list = False
        elif txt in ("मङ्गलाचरणम्", "भूमिका (प्रस्तावना)") or txt.startswith("परिशिष्टम्"):
            heading(txt.split(" (General")[0])
            in_preface_list = False
        elif st == "Heading2":
            add("Sub-Heading-2", b.esc(txt))
        elif st == "Heading3":
            add("TXT-Bold", b.esc(txt))
        elif st in ("", "Title", "Heading1"):
            if txt.startswith("प्रत्येक ग्रह खण्ड में"):
                in_preface_list = True
                add("Normal", b.inline_html(it))
                continue
            for bold, text, html in line_groups(it):
                if in_preface_list:
                    stat["bullets"] += 1
                    add("Normal", "• " + html)
                elif bold and re.search(r"[॥।]\s*$", text) and not text.startswith("हवन समिधा"):
                    stat["shlok"] += 1
                    add("Shlok", b.esc(text))
                elif bold and text.endswith(":"):
                    stat["labels"] += 1
                    add("TXT-Bold", b.esc(text))
                else:
                    add("Normal", html)
        else:
            raise SystemExit("an unexpected style %r: %r" % (st, txt))
    new_page()                                                          # flush the last page

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
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")

    b.write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| chapters:", len(ids), "| stats:", stat)

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

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_naradiya_shiksha.py -- import "नारदीय शिक्षा" (संस्कृत मूल सहित हिन्दी अध्ययन संस्करण, नवम्बर २०२६) from
"Naradiya_Formatted_Expanded_Hindi.docx" into the library.

The docx: Title / Subtitle / plain lines (title page), Heading1 (प्राक्कथन, सम्पादकीय पद्धति, विषयसूची, अध्ययन की भूमिका, the 16 अध्याय, the
three परिशिष्ट), Heading2 (the "प्रपाठक N कण्डिका M" title of each chapter's text; in ch. 1 also "विस्तृत विवेचन" / "अध्ययन प्रश्न", which later chapters
style as Heading3), Shlok (the mantra, one paragraph with a line break between its two lines), padard (the word meanings), plain paragraphs (the
Hindi sense and the discussion), 2 tables; no pictures, no footnotes. Mapping (master.css classes only):

    title page    cover-Book-Name / cover-subtitle / cover-Author-Name (the two lines of the "परम्परागत ..." note) / cover-Publisher-Note (structure and date),
                  then the trust's logo (image/naradiyashiksha-1.png) and cover-Publisher-Note "कल्याण सेवा ट्रस्ट" (the publisher, as in नीतिशतकं)
    Heading1      Heading, id Chapter_N, one reader page each;  "अध्याय 1  स्वरविज्ञान ..." -> "अध्याय १ — स्वरविज्ञान ..."
    Heading2      Sub-Heading ("प्रपाठक १, कण्डिका १ — मूल इकाइयाँ १४" and the section titles of the भूमिका); "विस्तृत विवेचन" / "अध्ययन प्रश्न" -> Sub-Heading-2
    Shlok         Shlok, one paragraph per line ("।।" -> "॥")
    padard / plain   Normal;  a wholly bold paragraph -> TXT-Bold;  bold glossary term -> span.strong + " — "
    tables        table.Samagri-Table (th.Samagri-Table-Head, td.Samagri-Table-Cell-Center); the second Word table holds two tables, split at "उद्देश्य | वृत्ति"
    ASCII digits in headings and the contents list become Devanagari digits.
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --apply --only "नारदीयशिक्षा.html".

    python tools/build_naradiya_shiksha.py "<Naradiya_Formatted_Expanded_Hindi.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402  (its docx reader and inline-run helpers)

ROOT = b.ROOT
BOOKS = b.BOOKS
NAME = "नारदीयशिक्षा"
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "naradiyashiksha-1.png"                          # the trust's logo: the picture the other trust books (नीतिशतकं ...) carry on the title page
LOGO_SRC = "neetishatakn-1.png"
TITLE = "नारदीय शिक्षा"
OUT = BOOKS / (NAME + ".html")
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % TITLE)
SUBS2 = {"विस्तृत विवेचन", "अध्ययन प्रश्न"}
ASCII = str.maketrans("0123456789", b.DEVA)


def deva(t):
    return t.translate(ASCII)


def spaced(par):
    """the paragraph's text with line breaks kept as \\n"""
    return "".join(t for _, _, t in par["pieces"]).replace("\u0003", " ")


def sep(par, joiner):
    """text where a run of two or more spaces (the docx's field separator) becomes the joiner"""
    return b.tidy(re.sub(r" {2,}", "\u0002", spaced(par).replace("\n", " ")).replace("\u0002", " %s " % joiner))


def verse_text(t):
    return b.esc(b.tidy(t)).replace("।।", "॥")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, items, notes, fn_no = b.read_docx(sys.argv[1])
    if notes or any(it.get("figs") for it in items if "table" not in it):
        raise SystemExit("this docx has footnotes or pictures; the script does not handle them")

    pages, cur = [], None
    chap_no = 0
    stat = {"heading": 0, "sub": 0, "sub2": 0, "shlok": 0, "bold_par": 0, "glossary": 0, "tables": 0}

    def new_page():
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n']

    def add(cls, html, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    # --- title page: everything before the first Heading1
    first_h = next(i for i, it in enumerate(items) if it.get("st") == "Heading1")
    head = items[:first_h]
    lines = [[b.tidy(x) for x in spaced(it).split("\n") if b.tidy(x)] for it in head]
    if b.tidy(spaced(head[0])) != TITLE or head[1]["st"] != "Subtitle":
        raise SystemExit("the title page is not what this script expects: %r" % lines)
    sub = [x for ls in lines[1:3] for x in ls]                      # Subtitle and the line under it
    author = lines[4]                                               # "परम्परागत नारदप्रणीत ग्रन्थ" / "प्रस्तुत पाठ पर आधारित ..."
    note = [x for ls in lines[5:] for x in ls]                      # structure, date, edition
    title = ['\n<div class="Basic-Graphics-Frame">\n', '\t\t\t<p class="cover-Book-Name">%s</p>\n' % TITLE]
    title += ['\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(deva(x)) for x in sub]
    title += ['\t\t\t<p class="cover-Author-Name">%s</p>\n' % b.esc(deva(x)) for x in author]
    title += ['\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % b.esc(deva(x)) for x in note]
    if not (b.IMG_DIR / LOGO).exists():
        b.write(b.IMG_DIR / LOGO, (b.IMG_DIR / LOGO_SRC).read_bytes())
    title.append('\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
                 'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n' % (LOGO, PUBLISHER))
    title.append('\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % PUBLISHER)
    title.append("\t\t</div>\n")
    pages.append("".join(title))

    for it in items[first_h:]:
        if "table" in it:
            groups, g = [], []
            for row in it["table"]:
                if row == ["उद्देश्य", "वृत्ति"] and g:             # a second table sharing the Word table
                    groups.append(g)
                    g = []
                g.append(row)
            groups.append(g)
            for rows in groups:
                stat["tables"] += 1
                h = ['\t\t\t<table class="Samagri-Table">\n']
                for ri, row in enumerate(rows):
                    h.append("\t\t\t\t<tr>" + "".join(
                        ('<th class="Samagri-Table-Head">%s</th>' if ri == 0 else '<td class="Samagri-Table-Cell-Center">%s</td>') % b.esc(c) for c in row) + "</tr>\n")
                h.append("\t\t\t</table>\n")
                cur.append("".join(h))
            continue
        st = it["st"]
        if st == "Heading1":
            chap_no += 1
            stat["heading"] += 1
            new_page()
            add("Heading", b.esc(deva(sep(it, "—"))), ' id="Chapter_%d"' % chap_no)
            continue
        if st in ("Heading2", "Heading3"):
            t = b.tidy(spaced(it))
            if t in SUBS2:
                stat["sub2"] += 1
                add("Sub-Heading-2", b.esc(t))
            else:
                stat["sub"] += 1
                if t.startswith("प्रपाठक"):                         # "प्रपाठक 1  कण्डिका 1  मूल इकाइयाँ 14"
                    m = re.fullmatch(r"(प्रपाठक \d+) +(कण्डिका \d+) +(.*)", re.sub(r" {2,}", "  ", spaced(it).strip()))
                    t = "%s, %s — %s" % (m.group(1), m.group(2), m.group(3)) if m else t
                add("Sub-Heading", b.esc(deva(t)))
            continue
        if st == "Shlok":
            for ln in spaced(it).split("\n"):
                if b.tidy(ln):
                    stat["shlok"] += 1
                    add("Shlok", verse_text(ln))
            continue
        txt = b.tidy(spaced(it).replace("\n", " "))
        if not txt:
            continue
        pcs = [p for p in it["pieces"] if p[2].strip()]
        if pcs and all(p[1] for p in pcs) and not any(p[0] for p in pcs):          # a wholly bold paragraph
            stat["bold_par"] += 1
            add("TXT-Bold", b.esc(txt))
        elif pcs and pcs[0][1] and not any(p[1] for p in pcs[1:]) and re.match(r"\S[^\n]*?  ", pcs[0][2]):   # glossary: bold term, definition
            term, rest = b.tidy(pcs[0][2]), b.tidy("".join(p[2] for p in it["pieces"][it["pieces"].index(pcs[0]) + 1:]))
            stat["glossary"] += 1
            add("Normal", '<span class="strong">%s</span> — %s' % (b.esc(term), b.esc(rest)))
        else:
            add("Normal", b.inline_html(it))
    new_page()                                                      # flush the last page

    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"
    out = out.replace("।।", "॥")

    css = b.MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | b.STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if "\u0003" in out or "\u0002" in out or "\u0001" in out:
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
        d = re.sub(r'("file":  "%s\.html".*?"publisher":  )"[^"]*"' % re.escape(NAME), lambda mm: mm.group(1) + '"%s"' % PUBLISHER, d, count=1, flags=re.S)
        b.write(b.DATA_JS, d)
        print("sizeKB and publisher updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        b.write(b.DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

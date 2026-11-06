#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ashtalakshmi.py -- import "श्रीअष्टलक्ष्मीमहामन्त्रम्" (ऋषि, छन्द, देवता, करन्यास, अङ्गन्यास, ध्यान श्लोक एवं हिन्दी अर्थ सहित; नौ खण्ड --
श्रीलक्ष्मीनारायण और आठ लक्ष्मी) from "Shree_Ashtalakshmi_MahaMantram.docx" into the library as a कल्याण सेवा ट्रस्ट book (category स्तोत्र एवं नामावली).

The docx has no real Word styles, only tables (the headings, the verses) and paragraphs, so everything is read as a stream of lines and sorted by what the
line is.  Mapping (master.css classes only):

    title page    cover-Shri-Hari (the two invocations) / cover-Book-Name / cover-subtitle, then the trust's logo (image/ashtalakshmi-1.png) and
                  cover-Publisher-Note "कल्याण सेवा ट्रस्ट" (as in नारदीयशिक्षा)
    "१. श्री…"     Heading, id Chapter_N, one reader page for each of the nine deities
    "॥ विनियोगः ॥" etc.   Sub-Heading (विनियोगः / करन्यासः एवं हृदयादि अङ्गन्यासः / ध्यानम् एवं हिन्दी भावार्थ / मूलमन्त्रम्)
    the विनियोग sentence  Normal;  "करन्यासः" / "हृदयादि अङ्गन्यासः"  TXT-Bold;  each न्यास line, ध्यान line, मूलमन्त्र  Shlok
    "हिन्दी भावार्थ: …" / "हिन्दी अर्थ: …" / "अर्थ: …"   Normal, the label in span.strong
    closing line  Chapter-End-Text

    python tools/build_ashtalakshmi.py "<Shree_Ashtalakshmi_MahaMantram.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402
import build_lomashi_shiksha as L  # noqa: E402  (its reader for paragraphs and tables)

NAME = "श्रीअष्टलक्ष्मीमहामन्त्रम्"
OUT = b.BOOKS / (NAME + ".html")
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "ashtalakshmi-1.png"
LOGO_SRC = "neetishatakn-1.png"
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % NAME)
SUBS = {"विनियोगः": "vin", "करन्यासः एवं हृदयादि अङ्गन्यासः": "nyas", "ध्यानम् एवं हिन्दी भावार्थ": "dhyan", "मूलमन्त्रम्": "mool"}
MEANING = re.compile(r"^(हिन्दी भावार्थ:|हिन्दी अर्थ:|अर्थ:)\s*(.*)$")


def lines_of_item(it):
    """every non-empty line of a paragraph or table, in order"""
    out = []
    if "table" in it:
        for row in it["table"]:
            for cell in row:
                for p in cell:
                    out += [b.tidy(x) for x in b.plain(p).split("\n") if b.tidy(x)]
    else:
        out += [b.tidy(x) for x in b.plain(it).split("\n") if b.tidy(x)]
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    items = L.read_items(sys.argv[1])
    lines = [ln for it in items for ln in lines_of_item(it)]
    stat = {"sections": 0, "sub": 0, "shlok": 0, "meaning": 0, "normal": 0}

    # title page: the lines before the first numbered section
    first = next(i for i, ln in enumerate(lines) if re.match(r"^[०-९]+\.\s", ln))
    head = lines[:first]
    if len(head) != 4 or head[2] != NAME.replace("श्रीअष्टलक्ष्मी", "श्रीअष्टलक्ष्मी"):
        raise SystemExit("the title page is not what this script expects: %r" % head)
    if not (b.IMG_DIR / LOGO).exists():
        b.write(b.IMG_DIR / LOGO, (b.IMG_DIR / LOGO_SRC).read_bytes())
    title = ['\n<div class="Basic-Graphics-Frame">\n',
             '\t\t\t<p class="cover-Shri-Hari">%s</p>\n' % b.esc(head[0]),
             '\t\t\t<p class="cover-Shri-Hari">%s</p>\n' % b.esc(head[1]),
             '\t\t\t<p class="cover-Book-Name">%s</p>\n' % b.esc(head[2]),
             '\t\t\t<p class="cover-subtitle">%s</p>\n' % b.esc(head[3]),
             '\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
             'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n' % (LOGO, PUBLISHER),
             '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % PUBLISHER, "\t\t</div>\n"]
    pages = ["".join(title)]
    cur = None
    chap = 0
    sub = None

    def new_page():
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n']

    def add(cls, html, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    for ln in lines[first:]:
        if re.match(r"^[०-९]+\.\s", ln):
            chap += 1
            stat["sections"] += 1
            new_page()
            add("Heading", b.esc(ln), ' id="Chapter_%d"' % chap)
            sub = None
            continue
        m = re.fullmatch(r"॥\s*(.*?)\s*॥", ln)
        if m and m.group(1) in SUBS:
            sub = SUBS[m.group(1)]
            stat["sub"] += 1
            add("Sub-Heading", b.esc(ln))
            continue
        if ln.startswith("॥ इति") or ln.startswith("❖ शुभं"):
            add("Chapter-End-Text", b.esc(ln))
            continue
        mm = MEANING.match(ln)
        if mm:
            stat["meaning"] += 1
            add("Normal", '<span class="strong">%s</span> %s' % (b.esc(mm.group(1)), b.esc(mm.group(2))))
            continue
        label = ln.lstrip("❖ ").strip()
        if label in ("करन्यासः", "हृदयादि अङ्गन्यासः"):
            add("TXT-Bold", b.esc(label))
            continue
        if sub == "vin":
            stat["normal"] += 1
            add("Normal", b.esc(ln))
        else:
            stat["shlok"] += 1
            add("Shlok", b.esc(ln))
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
    if len(ids) != len(set(ids)) or chap != 9:
        raise SystemExit("expected 9 sections, got %d" % chap)

    b.write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| stats:", stat)

    d = b.DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        b.write(b.DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
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

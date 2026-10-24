#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge_gyan_satsang.py -- one book out of two:  "ज्ञान मणि माला" + "सत्संग माला"  (both by श्रीमगनलाल हरिभाई व्यास, Gita Press)
->  "ज्ञान-मणिमाला तथा सत्संग माला".

The new file has one title page (the combined title), the निवेदन (identical in the two books, so printed once), the text of the first book
(its Heading), the text of the second (its Heading, chapter id renumbered), then the usual blank closing page.  The two old books stay on disk
but are hidden (HIDDEN_BOOKS in swadhyay-app.js) and their old addresses open the new book (SLUG_ALIASES); the new book is appended to
swadhyay-data.js.  (Same method as tools/merge_ishwar_avatar.py.)

    python tools/merge_gyan_satsang.py
"""
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
A = BOOKS / "ज्ञान मणि माला.html"
B = BOOKS / "सत्संग माला.html"
TITLE = "ज्ञान-मणिमाला तथा सत्संग माला"
OUT = BOOKS / (TITLE + ".html")
DATA_JS = ROOT / "swadhyay-data.js"
APP_JS = ROOT / "swadhyay-app.js"
SECTION = re.compile(r'<section class="epub-page" data-page="\d+">(.*?)</section>', re.S)


def read(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(p, s):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    a, b = read(A), read(B)
    sa, sb = SECTION.findall(a), SECTION.findall(b)
    if len(sa) != 4 or len(sb) != 4 or sa[1] != sb[1]:
        raise SystemExit("unexpected structure")
    head = a[:a.index("<body")]
    head = re.sub(r"<title>.*?</title>", "<title>%s</title>" % TITLE, head, count=1, flags=re.S)
    title_page = sa[0].replace('>ज्ञान-मणिमाला</p>', '>%s</p>' % TITLE, 1)
    assert TITLE in title_page
    text_a = sa[2]
    text_b = sb[2].replace('id="Chapter_3"', 'id="Chapter_4"', 1)
    assert 'id="Chapter_4"' in text_b
    parts = [title_page, sa[1], text_a, text_b, sa[3]]
    hr = '\n\n<hr class="page-break">\n\n'
    body = hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(parts))
    out = head + "<body>\n\n" + body + "\n\n</body>\n</html>"
    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| headings:",
          re.findall(r'<p id="(Chapter_\d+)" class="Heading">([^<]*)</p>', out))

    d = read(DATA_JS)
    if '"file":  "%s.html"' % TITLE not in d:
        size = round(OUT.stat().st_size / 1024, 1)
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "श्रीमगनलाल हरिभाई व्यास",\n'
                 '        "tikakar":  "",\n        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (TITLE, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")

    app = read(APP_JS)
    nl = "\r\n" if "\r\n" in app else "\n"
    new = TITLE + ".html"
    if '"gyan-mani-mala"' not in app:
        anchor = '    "अवतार-का-सिद्धान्त": "ईश्वर दयालु और न्यायकारी है और अवतार का सिद्धान्त.html"'
        assert app.count(anchor) == 1
        add = (anchor + "," + nl +
               '    /* the two books that were merged into "%s": their old addresses open it */' % TITLE + nl +
               '    "gyan-mani-mala": "%s",' % new + nl +
               '    "satsang-mala": "%s",' % new + nl +
               '    "ज्ञान-मणि-माला": "%s",' % new + nl +
               '    "सत्संग-माला": "%s"' % new)
        app = app.replace(anchor, add)
        anchor2 = '    "श्रीकृष्ण विज्ञान.html": true      '        # the HIDDEN_BOOKS line (the one in NON_GITA_PRESS_BOOKS has a comma)
        assert app.count(anchor2) == 1
        app = app.replace(anchor2, '    "श्रीकृष्ण विज्ञान.html": true,     ' + nl +
                          '    "ज्ञान मणि माला.html": true,                                       // merged into "%s"' % TITLE + nl +
                          '    "सत्संग माला.html": true                                           // (same)')
        write(APP_JS, app)
        print("aliases + hidden updated")


if __name__ == "__main__":
    main()

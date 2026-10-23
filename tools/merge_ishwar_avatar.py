#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge_ishwar_avatar.py -- one book out of two:  "ईश्वर दयालु और न्यायकारी है"  +  "अवतार का सिद्धान्त"  (both by श्रद्धेय श्रीजयदयालजी गोयन्दका,
Gita Press)  ->  "ईश्वर दयालु और न्यायकारी है और अवतार का सिद्धान्त".

The new file has one title page (the combined title), then the text of the first book (its Heading), then the text of the second book (its
Heading, id renumbered so the chapter ids stay unique), then the usual blank closing page.  Nothing else of the two books is changed.

The two old books stay on disk but are hidden in the library (HIDDEN_BOOKS in swadhyay-app.js -- hiding, not deleting, keeps every other book's
numeric id, and with it the readers' saved places, unchanged) and their old addresses lead to the new book (SLUG_ALIASES).
The new book is appended to swadhyay-data.js.

    python tools/merge_ishwar_avatar.py
"""
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
A = BOOKS / "ईश्वर दयालु और न्यायकारी है.html"
B = BOOKS / "अवतार का सिद्धान्त.html"
TITLE = "ईश्वर दयालु और न्यायकारी है और अवतार का सिद्धान्त"
OUT = BOOKS / (TITLE + ".html")
DATA_JS = ROOT / "swadhyay-data.js"
SECTION = re.compile(r'<section class="epub-page" data-page="\d+">(.*?)</section>', re.S)


def read(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(p, s):
    for _ in range(8):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def main():
    a, b = read(A), read(B)
    secs_a, secs_b = SECTION.findall(a), SECTION.findall(b)
    if len(secs_a) != 3 or len(secs_b) != 3:
        raise SystemExit("unexpected structure: %d / %d sections" % (len(secs_a), len(secs_b)))
    head = a[:a.index("<body")]
    title_page = secs_a[0].replace("ईश्वर दयालु और न्यायकारी है</p>", TITLE + "</p>", 1)
    assert TITLE in title_page
    text_a = secs_a[1]
    text_b = secs_b[1].replace('id="Chapter_2"', 'id="Chapter_3"', 1)
    assert 'id="Chapter_3"' in text_b
    end_page = secs_a[2]
    hr = '\n\n<hr class="page-break">\n\n'
    parts = [title_page, text_a, text_b, end_page]
    body = hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(parts))
    out = head + "<body>\n\n" + body + "\n\n</body>\n</html>"
    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| headings:", re.findall(r'<p id="(Chapter_\d+)" class="Heading">([^<]*)</p>', out))

    d = read(DATA_JS)
    key = '"file":  "%s.html"' % TITLE
    if key in d:
        print("already registered")
        return
    size = round(OUT.stat().st_size / 1024, 1)
    entry = ('    {\n        "file":  "%s.html",\n        "category":  "Pravachan",\n        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",\n        "tikakar":  "",\n'
             '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (TITLE, size))
    nl = "\r\n" if "\r\n" in d else "\n"                     # the catalogue keeps its own line endings
    entry = entry.replace("\n", nl)
    k = d.rindex("}" + nl + "];")
    write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
    print("registered in swadhyay-data.js (%s KB)" % size)


if __name__ == "__main__":
    main()

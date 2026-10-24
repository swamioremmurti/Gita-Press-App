#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge_gita_padhne_tyag.py -- one book out of two:  "गीता पढ़ने के लाभ" (which already ends with the गजलगीता text)  +  "त्याग से भगवत्प्राप्ति"
(both by श्रद्धेय श्रीजयदयालजी गोयन्दका, Gita Press)  ->  "गीता पढ़ने के लाभ ( त्याग से भगवत्प्राप्ति गजलगीता सहित)".

Order inside the new book: title page (combined title), गीता पढ़नेके लाभ, the अनुक्रमणिका, त्यागसे भगवत्प्राप्ति (with its उपसंहार), गजलगीता, the usual
blank closing page.  The standalone गजलगीता stays a book of its own (nothing is done to it).  The two merged books stay on disk but are hidden
(HIDDEN_BOOKS), their old addresses open the new book (SLUG_ALIASES), the new book keeps the cover of "गीता पढ़ने के लाभ", and its title is kept
exactly as written (TITLE_OVERRIDES).

    python tools/merge_gita_padhne_tyag.py
"""
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
A = BOOKS / "गीता पढ़ने के लाभ.html"
B = BOOKS / "त्याग से भगवत्प्राप्ति.html"
TITLE = "गीता पढ़ने के लाभ ( त्याग से भगवत्प्राप्ति गजलगीता सहित)"
OUT = BOOKS / (TITLE + ".html")
DATA_JS = ROOT / "swadhyay-data.js"
APP_JS = ROOT / "swadhyay-app.js"
COVER = "assets/covers/geetaa-parhne-ke-laabh.webp"
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
    if len(sa) != 5 or len(sb) != 4:
        raise SystemExit("unexpected structure: %d / %d sections" % (len(sa), len(sb)))
    head = re.sub(r"<title>.*?</title>", "<title>%s</title>" % TITLE, a[:a.index("<body")], count=1, flags=re.S)
    title_page = re.sub(r'(<p class="cover-Book-Name[^"]*">)[^<]*(</p>)', lambda m: m.group(1) + TITLE + m.group(2), sa[0], count=1)
    assert TITLE in title_page
    # chapter ids: A keeps 2, 3 (लाभ, अनुक्रमणिका); B's two become 4, 5; A's गजलगीता (was 4) becomes 6
    gajal = sa[3].replace('id="Chapter_4"', 'id="Chapter_6"', 1)
    tyag = sb[1].replace('id="Chapter_2"', 'id="Chapter_4"', 1)
    upasamhar = sb[2].replace('id="Chapter_3"', 'id="Chapter_5"', 1)
    for s, cid in ((gajal, "Chapter_6"), (tyag, "Chapter_4"), (upasamhar, "Chapter_5")):
        assert 'id="%s"' % cid in s
    parts = [title_page, sa[1], sa[2], tyag, upasamhar, gajal, sa[4]]
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
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Gita",\n        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",\n'
                 '        "tikakar":  "",\n        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (TITLE, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")

    app = read(APP_JS)
    nl = "\r\n" if "\r\n" in app else "\n"
    new = TITLE + ".html"
    if '"gita-parhane-ke-labh"' not in app:
        # old addresses -> the new book
        anchor = '    "सत्संग-माला": "ज्ञान-मणिमाला तथा सत्संग माला.html"'
        assert app.count(anchor) == 1
        app = app.replace(anchor, anchor + "," + nl +
                          '    /* the two books merged into "%s" */' % TITLE + nl +
                          '    "gita-parhane-ke-labh": "%s",' % new + nl +
                          '    "tyag-se-bhagavatprapti": "%s",' % new + nl +
                          '    "गीता-पढ़ने-के-लाभ": "%s",' % new + nl +
                          '    "त्याग-से-भगवत्प्राप्ति": "%s"' % new)
        # hidden
        anchor = '    "सत्संग माला.html": true                                           // (same)'
        assert app.count(anchor) == 1
        app = app.replace(anchor, '    "सत्संग माला.html": true,                                          // (same)' + nl +
                          '    "गीता पढ़ने के लाभ.html": true,                                     // merged into "%s"' % TITLE + nl +
                          '    "त्याग से भगवत्प्राप्ति.html": true                                  // (same)')
        # cover (the one of "गीता पढ़ने के लाभ") and the title exactly as written
        mk = "var COVER_OVERRIDES = {" + nl
        i = app.index(mk) + len(mk)
        app = app[:i] + '    "%s": "%s",' % (new, COVER) + nl + app[i:]
        mk = "  var TITLE_OVERRIDES = {" + nl
        i = app.index(mk) + len(mk)
        app = app[:i] + '    "%s": "%s",' % (new, TITLE) + nl + app[i:]
        write(APP_JS, app)
        print("aliases, hidden, cover, title updated")


if __name__ == "__main__":
    main()

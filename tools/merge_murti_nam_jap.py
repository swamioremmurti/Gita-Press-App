#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge_murti_nam_jap.py -- one book out of two:  "मूर्ति पूजा" + "नाम जप की महिमा"  (both by श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज, Gita Press)
->  "मूर्तिपूजा-नाम-जपकी महिमा".

One title page (the combined title), the text of मूर्तिपूजा, the text of नाम-जपकी महिमा (chapter id renumbered), the blank closing page.
The two old books stay on disk but are hidden (HIDDEN_BOOKS); their old addresses open the new book (SLUG_ALIASES); the title keeps its
hyphens (TITLE_OVERRIDES).  Same method as tools/merge_dharm_bhagavan.py.

    python tools/merge_murti_nam_jap.py
"""
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
A = BOOKS / "मूर्ति पूजा.html"
B = BOOKS / "नाम जप की महिमा.html"
TITLE = "मूर्तिपूजा-नाम-जपकी महिमा"
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
    if len(sa) != 3 or len(sb) != 3:
        raise SystemExit("unexpected structure: %d / %d sections" % (len(sa), len(sb)))
    head = a[:a.index("<body")]
    head = re.sub(r"<title>.*?</title>", "<title>%s</title>" % TITLE, head, count=1, flags=re.S)
    title_page = re.sub(r'(<p class="cover-Book-Name[^"]*">)[^<]*(</p>)', lambda m: m.group(1) + TITLE + m.group(2), sa[0], count=1)
    assert TITLE in title_page
    text_b = sb[1].replace('id="Chapter_2"', 'id="Chapter_3"', 1)
    assert 'id="Chapter_3"' in text_b
    parts = [title_page, sa[1], text_b, sa[2]]
    hr = '\n\n<hr class="page-break">\n\n'
    body = hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(parts))
    out = head + "<body>\n\n" + body + "\n\n</body>\n</html>"
    write(OUT, out)
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    assert len(ids) == len(set(ids)) == 2, ids
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| ids:", ids)

    d = read(DATA_JS)
    if '"file":  "%s.html"' % TITLE not in d:
        size = round(OUT.stat().st_size / 1024, 1)
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Pravachan",\n        "author":  "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",\n'
                 '        "tikakar":  "",\n        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (TITLE, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")

    app = read(APP_JS)
    nl = "\r\n" if "\r\n" in app else "\n"
    new = TITLE + ".html"
    if '"murti-puja"' not in app:
        anchor = '    "भगवान्-क्या-है": "धर्म क्या है भगवान् क्या है.html"'
        assert app.count(anchor) == 1
        app = app.replace(anchor, anchor + "," + nl +
                          '    /* the two books merged into "%s" */' % TITLE + nl +
                          '    "murti-puja": "%s",' % new + nl +
                          '    "nam-jap-ki-mahima": "%s",' % new + nl +
                          '    "मूर्ति-पूजा": "%s",' % new + nl +
                          '    "नाम-जप-की-महिमा": "%s"' % new)
        anchor = '    "भगवान् क्या है.html": true'
        assert app.count(anchor) == 1
        i = app.index(anchor)
        j = app.index(nl, i)
        line = app[i:j]
        app = app[:i] + line.replace('true  ', 'true, ', 1) + nl + \
            '    "मूर्ति पूजा.html": true,                                           // merged into "%s"' % TITLE + nl + \
            '    "नाम जप की महिमा.html": true                                        // (same)' + app[j:]
        mk = "  var TITLE_OVERRIDES = {" + nl
        i = app.index(mk) + len(mk)
        app = app[:i] + '    "%s": "%s",' % (new, TITLE) + nl + app[i:]
        write(APP_JS, app)
        print("aliases, hidden, title updated")


if __name__ == "__main__":
    main()

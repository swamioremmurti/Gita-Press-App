#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
merge_dharm_bhagavan.py -- one book out of two:  "धर्म क्या है" + "भगवान् क्या है"  (both by श्रद्धेय श्रीजयदयालजी गोयन्दका, Gita Press)
->  "धर्म क्या है? भगवान् क्या है ?".

(The file on disk has no "?" -- Windows does not allow it in a name -- and TITLE_OVERRIDES gives the title as written.)
Title page (the combined title), the text of धर्म क्या है, the chapters of भगवान् क्या है (ids renumbered 3..8), the blank closing page.
The two old books stay on disk but are hidden (HIDDEN_BOOKS) and their old addresses open the new book (SLUG_ALIASES).

    python tools/merge_dharm_bhagavan.py
"""
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
A = BOOKS / "धर्म क्या है.html"
B = BOOKS / "भगवान् क्या है.html"
TITLE = "धर्म क्या है? भगवान् क्या है ?"
FILE_STEM = "धर्म क्या है भगवान् क्या है"
OUT = BOOKS / (FILE_STEM + ".html")
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
    if len(sa) != 3 or len(sb) != 8:
        raise SystemExit("unexpected structure: %d / %d sections" % (len(sa), len(sb)))
    head = re.sub(r"<title>.*?</title>", "<title>%s</title>" % TITLE, a[:a.index("<body")], count=1, flags=re.S)
    title_page = re.sub(r'(<p class="cover-Book-Name[^"]*">)[^<]*(</p>)', lambda m: m.group(1) + TITLE + m.group(2), sa[0], count=1)
    assert TITLE in title_page
    chapters_b = []
    for sec in sb[1:7]:
        cid = re.search(r'id="Chapter_(\d+)"', sec).group(1)
        chapters_b.append(sec.replace('id="Chapter_%s"' % cid, 'id="Chapter_%d"' % (int(cid) + 1), 1))
    parts = [title_page, sa[1]] + chapters_b + [sa[2]]
    hr = '\n\n<hr class="page-break">\n\n'
    body = hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(parts))
    out = head + "<body>\n\n" + body + "\n\n</body>\n</html>"
    write(OUT, out)
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    assert len(ids) == len(set(ids)) == 7, ids
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| ids:", ids)

    d = read(DATA_JS)
    if '"file":  "%s.html"' % FILE_STEM not in d:
        size = round(OUT.stat().st_size / 1024, 1)
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Pravachan",\n        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",\n'
                 '        "tikakar":  "",\n        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (FILE_STEM, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")

    app = read(APP_JS)
    nl = "\r\n" if "\r\n" in app else "\n"
    new = FILE_STEM + ".html"
    if '"dharm-kya-hai"' not in app:
        anchor = '    "त्याग-से-भगवत्प्राप्ति": "गीता पढ़ने के लाभ ( त्याग से भगवत्प्राप्ति गजलगीता सहित).html"'
        assert app.count(anchor) == 1
        app = app.replace(anchor, anchor + "," + nl +
                          '    /* the two books merged into "%s" */' % TITLE + nl +
                          '    "dharm-kya-hai": "%s",' % new + nl +
                          '    "bhagavan-kya-hai": "%s",' % new + nl +
                          '    "धर्म-क्या-है": "%s",' % new + nl +
                          '    "भगवान्-क्या-है": "%s"' % new)
        anchor = '    "त्याग से भगवत्प्राप्ति.html": true  '
        assert app.count(anchor) == 1
        i = app.index(anchor)
        j = app.index(nl, i)
        line = app[i:j]
        app = app[:i] + line.replace('true  ', 'true, ', 1) + nl + \
            '    "धर्म क्या है.html": true,                                         // merged into "%s"' % TITLE + nl + \
            '    "भगवान् क्या है.html": true                                         // (same)' + app[j:]
        mk = "  var TITLE_OVERRIDES = {" + nl
        i = app.index(mk) + len(mk)
        app = app[:i] + '    "%s": "%s",' % (new, TITLE) + nl + app[i:]
        write(APP_JS, app)
        print("aliases, hidden, title updated")


if __name__ == "__main__":
    main()

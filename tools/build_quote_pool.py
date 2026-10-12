#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_quote_pool.py -- gather the short sayings for the home page's "Quote of the day".

Reads the five quotation books in the library and writes server/lib/quotes-pool.json:
one entry per saint with every saying that is short enough to sit in the hero card.
The pool stays on the server; /api/quote-of-the-day (server/lib/quotes.js) picks one saying per
saint for each day, so the browser downloads four sayings, not the whole pool.

Sayings are the plain TXT paragraphs of each book. Prefaces, verse sections, letters and any
paragraph that talks about the book itself are left out, and so is anything longer than
MAX_CHARS (it would not fit the card).

Run:  python tools/build_quote_pool.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
OUT = ROOT / "server" / "lib" / "quotes-pool.json"

MIN_CHARS, MAX_CHARS = 35, 140

# saint -> display name, the library's author label (for the author link), and the books
SAINTS = [
    {"key": "ramsukhdas", "name": "स्वामी श्रीरामसुखदासजी महाराज", "author": "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज",
     "books": [("अमृत बिन्दु.html", "अमृत-बिन्दु", ()),
               ("सागरके मोती.html", "सागर के मोती", ())]},
    {"key": "goyandka", "name": "सेठजी श्रीजयदयालजी गोयन्दका", "author": "श्रद्धेय श्रीजयदयालजी गोयन्दका",
     "books": [("अमृत वचन.html", "अमृत वचन", ("शिक्षाप्रद पत्र", "गजलगीता", "उड़ जायगा"))]},
    {"key": "poddar", "name": "श्रीहनुमानप्रसादजी पोद्दार", "author": "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार",
     "books": [("संत वाणी.html", "संत वाणी", ())]},
    {"key": "sharnanand", "name": "स्वामी श्रीशरणानन्दजी महाराज", "author": "स्वामी शरणानन्द जी महाराज",
     "books": [("क्रान्तिकारी सन्तवाणी.html", "क्रान्तिकारी सन्तवाणी", ())]},
]

# sections that are front matter / the publisher's own pages, in every book
SKIP_HEADINGS = ("प्राक्कथन", "नम्र निवेदन", "निवेदन", "भूमिका", "प्रस्तावना", "सम्पादकीय", "प्रार्थना", "उपोद्घात",
                 "विषय-सूची", "विषयसूची", "प्रकाशन", "संत-वन्दना")
# a saying that is really about the book, a reference, or not a complete thought
BAD = re.compile(r"पुस्तक|पाठक|प्रकाशक|प्रकाशन|अध्याय|देखें|देखिये|देखिए|पृष्ठ|संस्करण|\[|\]|http|www|\d{3,}")
END = tuple("।॥?!”’\"'.)")
NUM_LEAD = re.compile(r"^\s*[\(\[]?[०-९0-9]+[\)\]]?\s*[.\-–—)]*\s*")
NUM_TAIL = re.compile(r"\s*॥\s*[०-९0-9]+\s*॥?\s*$")
ZW = "‌‍"


def plain(h):
    h = re.sub(r"<[^>]+>", " ", h).replace("&nbsp;", " ")
    h = re.sub(r"&#x27;|&#39;", "'", h).replace("&amp;", "&").replace("&quot;", '"')
    return re.sub(r"\s+", " ", h).strip()


def norm(s):
    return re.sub(r"[\s\-" + ZW + "]+", "", s)


def sayings(path, skip_extra):
    html = path.read_text(encoding="utf-8")
    skip = [norm(x) for x in SKIP_HEADINGS + tuple(skip_extra)]
    out, skipping = [], True            # nothing before the first real section counts
    for m in re.finditer(r'<p\b[^>]*class="([^"]*)"[^>]*>(.*?)</p>', html, re.S):
        cls, inner = m.group(1).split()[0] if m.group(1).split() else "", m.group(2)
        if cls in ("Heading", "Sub-Heading"):
            h = norm(plain(inner))
            skipping = any(x and x in h for x in skip)
            continue
        if skipping or not cls.startswith("TXT") or cls.startswith("TXT-Right"):
            continue
        t = plain(inner)
        t = NUM_LEAD.sub("", t)
        t = NUM_TAIL.sub("॥", t) if "॥" in t[-6:] else t
        t = re.sub(r"\s+([।॥,?!])", r"\1", t).strip()
        if not (MIN_CHARS <= len(t) <= MAX_CHARS) or not t.endswith(END) or BAD.search(t):
            continue
        out.append(t)
    return out


def main():
    pool = []
    for saint in SAINTS:
        books, quotes, seen = [], [], set()
        for bi, (fname, title, skip_extra) in enumerate(saint["books"]):
            books.append({"file": fname, "title": title})
            for t in sayings(BOOKS / fname, skip_extra):
                if t not in seen:
                    seen.add(t)
                    quotes.append([bi, t])
        print(f"{saint['name']}: {len(quotes)} sayings from {len(books)} book(s)")
        pool.append({"key": saint["key"], "name": saint["name"], "author": saint["author"], "books": books, "quotes": quotes})
    OUT.write_text(json.dumps(pool, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("wrote", OUT, f"({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

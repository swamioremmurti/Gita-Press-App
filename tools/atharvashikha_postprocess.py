#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
atharvashikha_postprocess.py -- tidy the converter's output for "अथर्वशिखोपनिषत्" (source: अथर्वशिखोपनिषत्.docx).

    python tools/book_converter.py convert "अथर्वशिखोपनिषत्.docx" --title "अथर्वशिखोपनिषत्" --author "" --category Upanishad \
        --publisher other --chapter-heading-styles "Heading 1" --sub-heading-styles "Heading 2" --shlok-style Shlok
    python tools/atharvashikha_postprocess.py

Same treatment as neeti_shatakam_postprocess.py (re-running is safe, it is meant to run on a fresh conversion):
  * title page: the converter drops the opening verse of the Word file; the page becomes title, [2 blank lines], the verse, [2 blank lines],
    logo (100px, centred), "कल्याण सेवा ट्रस्ट" (the book has no author);
  * the भूमिका: the Word file has it as plain text under an empty heading that holds the logo; it becomes the chapter "भूमिका" (one reader page);
    its four numbered headings are Inner-Headings;
  * the labels of the commentary ("अन्वय:", "अन्वय एवं पदच्छेद:", "भावार्थ:") are bold lines (TXT-Bold);
  * verse numbers: "॥ १॥" -> "॥ १ ॥".
Unlike the other books, tools/fix_visarga_colon.py is NOT run on this one: its colons are real (the labels above, "तार (तारक): ...") and
its visargas are already typed correctly.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "अथर्वशिखोपनिषत्.html"
DATA_JS = ROOT / "swadhyay-data.js"
PUBLISHER = "कल्याण सेवा ट्रस्ट"
OPENING = ["ओङ्कारार्थतया भातं तुर्योङ्काराग्रभासुरम् ।", "तुर्यतुर्यंत्रिपाद्रामं स्वमात्रं कलयेऽन्वहम् ॥"]
GAP = '<p class="TXT" style="margin:0">&nbsp;</p>\n\t\t\t' * 2
IMG = "image/atharvashikhopanishat-1.png"
LOGO_P = re.compile(r'\s*<p class="TXT" style="text-align:center;[^"]*"><img src="' + re.escape(IMG) + r'"[^>]*></p>')
LABELS = ("अन्वय:", "अन्वय एवं पदच्छेद:", "भावार्थ:")


def main():
    s = BOOK.read_text(encoding="utf-8")

    # the भूमिका: the empty heading / logo / publisher line go; "भूमिका" is the heading (as it already is here, or via the empty heading)
    a = s.index('class="Heading">भूमिका</p>')
    b = s.index('<hr class="page-break">', a)
    part = re.sub(r'<p class="TXT">([०-९]\. [^<]{0,120})</p>', r'<p class="Inner-Heading">\1</p>', s[a:b])
    s = s[:a] + part + s[b:]

    # title page: title, [2 blank lines] the opening verse [2 blank lines], logo (100px, centred), publisher
    head = s[:s.index('<hr class="page-break">')]
    if OPENING[0] not in head:
        m = LOGO_P.search(s)
        s = s[:m.start()] + s[m.end():]
        i = s.index("</p>", s.index('class="cover-Book-Name"')) + 4
        verses = "\n\t\t\t" + GAP + "".join('<p class="Shlok">%s</p>\n\t\t\t' % v for v in OPENING) + GAP.rstrip("\t\n")
        logo = ('\n\t\t\t<p class="TXT" style="text-align:center;text-indent:0;margin:1em 0"><img src="%s" alt="%s" '
                'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>'
                '\n\t\t\t<p class="cover-Publisher-Note">%s</p>' % (IMG, PUBLISHER, PUBLISHER))
        s = s[:i] + verses + logo + s[i:]

    # commentary labels
    for lab in LABELS:
        s = s.replace('<p class="TXT">%s</p>' % lab, '<p class="TXT-Bold">%s</p>' % lab)

    # verse numbers
    s = re.sub(r"(॥ [०-९]+)॥</p>", r"\1 ॥</p>", s)

    BOOK.write_text(s, encoding="utf-8", newline="")

    # publisher in the catalogue
    with open(DATA_JS, encoding="utf-8", newline="") as fh:
        d = fh.read()
    i = d.index('"file":  "अथर्वशिखोपनिषत्.html"')
    j = d.index('"publisher":  ""', i)
    if j - i < 400:
        d = d[:j] + '"publisher":  "%s"' % PUBLISHER + d[j + len('"publisher":  ""'):]
        with open(DATA_JS, "w", encoding="utf-8", newline="") as fh:
            fh.write(d)
    print("labels:", sum(s.count('<p class="TXT-Bold">%s</p>' % x) for x in LABELS), " Inner-Headings:", s.count('class="Inner-Heading"'),
          " verse numbers:", len(re.findall(r"॥ [०-९]+ ॥</p>", s)))


if __name__ == "__main__":
    main()

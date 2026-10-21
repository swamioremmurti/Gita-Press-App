#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
neeti_shatakam_postprocess.py -- tidy the converter's output for "नीतिशतकं" (source: नीतिशतकं भर्तृहरिकृत.docx).

    python tools/book_converter.py convert "नीतिशतकं भर्तृहरिकृत.docx" --title "नीतिशतकं" --author "भर्तृहरि" --category "Siksha evam Katha" \
        --publisher other --chapter-heading-styles "Heading 1,Heading 2" --shlok-style Shlok --drop-chapters "नीतिशतकं"
    python tools/neeti_shatakam_postprocess.py

(the Word file's "Heading 1 नीतिशतकं" is only a divider above its eleven "Heading 2" पद्धतियाँ, so it is left out; each पद्धति is a chapter)

What it fixes (re-running is safe, it is meant to run on a fresh conversion -- same idea as chanakya_niti_postprocess.py):
  * the title page: the converter drops the opening verse ("दिक्कालाद्य...") that stands under the title in the Word file; the page becomes
    title, [2 blank lines], the verse, [2 blank lines], author, logo (100px, centred), "कल्याण सेवा ट्रस्ट";
  * the भूमिका: the Word file has it as plain text under an empty heading that holds the logo; it becomes the chapter "भूमिका" (one reader page),
    its four numbered headings are Inner-Headings (they neither split the page nor appear in the contents), the signature is right-aligned;
  * verse numbers: "॥ १॥" -> "॥ १ ॥".
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "नीतिशतकं.html"
PUBLISHER = "कल्याण सेवा ट्रस्ट"
OPENING = ["दिक्कालाद्यनवच्छिन्नानन्तचिन्मात्रमूर्तये ।", "स्वानुभूत्येकमानाय नमः शान्ताय तेजसे ॥"]
GAP = '<p class="TXT" style="margin:0">&nbsp;</p>\n\t\t\t' * 2
LOGO_P = re.compile(r'\s*<p class="TXT" style="text-align:center;[^"]*"><img src="image/neetishatakn-1\.png"[^>]*></p>')


def main():
    s = BOOK.read_text(encoding="utf-8")

    # the भूमिका: the empty heading, the logo and the publisher line go; "भूमिका" becomes the heading
    if '<p id="Chapter_1" class="Heading"></p>' in s:
        s = s.replace('<p id="Chapter_1" class="Heading"></p>', '<p id="Chapter_1" class="Heading">भूमिका</p>', 1)
        s = LOGO_P.sub("", s, count=1)
        s = s.replace('\n\t\t\t<p class="TXT">%s</p>' % PUBLISHER, "", 1)
        s = s.replace('\n\t\t\t<p class="TXT">भूमिका</p>', "", 1)
    a = s.index('class="Heading">भूमिका</p>')
    b = s.index('<hr class="page-break">', a)
    part = re.sub(r'<p class="TXT">([०-९]\. [^<]{0,120})</p>', r'<p class="Inner-Heading">\1</p>', s[a:b])
    part = part.replace('<p class="TXT">ने. नरेंद्र साई</p>', '<p class="TXT-Right"><b><i>ने. नरेंद्र साई</i></b></p>')
    s = s[:a] + part + s[b:]

    # title page: title, [2 blank lines] the opening verse [2 blank lines], author, logo (100px, centred), publisher
    if OPENING[0] not in s.split('<hr class="page-break">')[0]:
        am = re.search(r'\s*<p class="Title-Page---Author-Name">[^<]*</p>', s)
        author = am.group(0).strip()
        s = s[:am.start()] + s[am.end():]
        i = s.index("</p>", s.index('class="Title-Page---Book-Name"')) + 4
        verses = "\n\t\t\t" + GAP + "".join('<p class="Shlok">%s</p>\n\t\t\t' % v for v in OPENING) + GAP + author
        logo = ('\n\t\t\t<p class="TXT" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/neetishatakn-1.png" alt="%s" '
                'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>'
                '\n\t\t\t<p class="Title-Page---Publisher-Note">%s</p>' % (PUBLISHER, PUBLISHER))
        s = s[:i] + verses + logo + s[i:]

    # verse numbers
    s = re.sub(r"(॥ [०-९]+)॥</p>", r"\1 ॥</p>", s)

    BOOK.write_text(s, encoding="utf-8", newline="")
    print("verse numbers:", len(re.findall(r"॥ [०-९]+ ॥</p>", s)), " Inner-Headings:", s.count('class="Inner-Heading"'), " logos:", s.count("neetishatakn-1.png"))


if __name__ == "__main__":
    main()

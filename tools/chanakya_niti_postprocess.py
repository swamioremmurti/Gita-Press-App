#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
chanakya_niti_postprocess.py -- tidy the converter's output for "चाणक्य नीति" (source: चाणक्य नीति.docx).

    python tools/book_converter.py convert "चाणक्य नीति.docx" --title "चाणक्य नीति" --author "कौटिल्य विष्णुगुप्त (चाणक्य)" \
        --category "Siksha evam Katha" --publisher other --chapter-heading-styles "Heading 1" --shlok-style Shlok
    python tools/chanakya_niti_postprocess.py

What it fixes (re-running is safe):
  * the title page: the converter drops the two opening verses that stand before the logo in the Word file ("कौटिल्यं कुटिलं ..."); they are put back
    after the title, with two blank lines on each side, then the author, the logo, and the publisher (कल्याण सेवा ट्रस्ट) is added under the logo;
  * the logo is capped at 100px wide;
  * verse numbers: "॥ ०६-१५" (chapter-verse, the closing danda missing) -> "॥ ६-१५ ॥";
  * the lion picture of verse ६-१६ was written between the two lines of the verse -> placed after that verse's meaning;
  * the भूमिका's signature line is right-aligned (TXT-Right);
  * the five numbered headings of the भूमिका ("१. ऐतिहासिक पृष्ठभूमि ...") are Inner-Headings (not Sub-Headings: the भूमिका stays one chapter / one reader page, and they are not listed in the contents).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "चाणक्य नीति.html"
PUBLISHER = "कल्याण सेवा ट्रस्ट"
OPENING = ["कौटिल्यं कुटिलं क्रूरं चणकात्मजमीश्वरम् ।", "नीतिशास्त्रप्रणेतारं वन्देऽहं ज्ञानसागरम् ॥"]
D = str.maketrans("०१२३४५६७८९", "0123456789")
DD = str.maketrans("0123456789", "०१२३४५६७८९")
IMG_P = re.compile(r'\s*<p class="TXT" style="text-align:center;[^"]*"><img src="image/chaanaky-neeti-2\.png"[^>]*></p>')


def main():
    s = BOOK.read_text(encoding="utf-8")

    # title page: title, [2 blank lines] the opening verses [2 blank lines], author, logo, publisher
    if OPENING[0] not in s:
        am = re.search(r'\s*<p class="cover-Author-Name">[^<]*</p>', s)
        author = am.group(0).strip()
        s = s[:am.start()] + s[am.end():]
        i = s.index('<p class="TXT" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/chaanaky-neeti-1.png"')
        gap = '<p class="TXT" style="margin:0">&nbsp;</p>\n\t\t\t' * 2
        verses = gap + "".join('<p class="Shlok">%s</p>\n\t\t\t' % v for v in OPENING) + gap + author + "\n\t\t\t"
        s = s[:i] + verses + s[i:]
        j = s.index("</p>", i + len(verses)) + 4
        s = s[:j] + '\n\t\t\t<p class="cover-Publisher-Note">%s</p>' % PUBLISHER + s[j:]

    # the logo on the title page is at most 100px wide
    s = re.sub(r'(<img src="image/chaanaky-neeti-1\.png")[^>]*>', r'\1 alt="कल्याण सेवा ट्रस्ट" style="display:block;width:100px;max-width:100%;height:auto;margin:1em auto">', s)

    # verse numbers
    def vnum(m):
        ch, vs = int(m.group(2).translate(D)), int(m.group(3).translate(D))
        return "%s ॥ %s-%s ॥</p>" % (m.group(1), str(ch).translate(DD), str(vs).translate(DD))
    s = re.sub(r'(<p class="Shlok">[^<]*?)\s*॥?\s*([०-९]{2})-([०-९]{2})\s*</p>', vnum, s)

    # the picture of verse ६-१६ goes after that verse's meaning
    m = IMG_P.search(s)
    if m:
        img = m.group(0).strip()
        s = s[:m.start()] + s[m.end():]
        k = s.index("सर्वारम्भेण तत्कार्यं सिंहादेकं प्रचक्षते")
        k = s.index("</p>", s.index('<p class="TXT">', k)) + 4          # end of the meaning paragraph below the verse
        s = s[:k] + "\n\t\t\t" + img + s[k:]

    # भूमिका: the numbered headings
    a = s.index('class="Heading">भूमिका</p>')
    b = s.index('<hr class="page-break">', a)
    part = re.sub(r'<p class="TXT">([०-९]\. [^<]{0,120})</p>', r'<p class="Inner-Heading">\1</p>', s[a:b])
    s = s[:a] + part + s[b:]

    s = s.replace('<p class="TXT">ने. नरेंद्र साई</p>', '<p class="TXT-Right"><b><i>ने. नरेंद्र साई</i></b></p>')   # the भूमिका's signature, right-aligned in the Word file

    BOOK.write_text(s, encoding="utf-8", newline="")
    print("verse numbers:", len(re.findall(r"॥ [०-९]+-[०-९]+ ॥</p>", s)), " headings in भूमिका:", part.count('class="Inner-Heading"'))


if __name__ == "__main__":
    main()

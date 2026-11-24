#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
krishnank_vaigyanik.py -- the Word file "कृष्णावतारपर वैज्ञानिक दृष्टि.docx" (the whole article) as the book's own markup.
Used by build_krishnank.py, which puts the result in place of the short भूमिका the first issue carried.

Mapping: Heading 1 -> Heading, Heading 2 -> Sub-Heading, "Shlok" -> Shlok (one line each), source lines "(ऋग्वेद)" -> TXT-Right,
Normal -> Normal, Word footnotes -> "[१]" in the text and a Footnotes paragraph "[१] ..." under the paragraph.
Typing rules (as for the Chakra books): Word's "–" between letters -> hyphen, "–" with a space or a quote next to it -> "—";
"।।" -> "॥"; no space before । or ॥.
"""
import re
import zipfile
from html import escape

import docx

DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# the closing poem, which Word keeps as one long paragraph per stanza: split into its lines (rhyme: तारे/मतवारे/सारे …)
POEM = [
    ("refrain", ["नटवर! आज रचाओ रास।", "स्वर्णनृत्यसे आलोकित हो, क्षिति जल तल आकाश।"]),
    ("१", ["चन्द्र नवग्रह प्रमुदित तारे", "प्रेमवारुणी पी मतवारे", "छाया-पथपर हिल-मिल सारे", "करें मधुरतम हास-विलास।", "नटवर! आज रचाओ रास॥"]),
    ("२", ["बिहँस कौमुदी मद-नयनोंसे", "गगन-गीतमय मृदु बचनोंसे", "स्वर्ग-विभूति सरस सयनोंसे", "करें प्रवाहित रस उल्लास।", "नटवर! आज रचाओ रास॥"]),
    ("३", ["प्रकृति-सुन्दरीके रग-रगमें", "जल-चर थल-चर नभ-चर खगमें", "चेत अचेत प्राणिमय जगमें", "मधु-कम्पनका हो आभास।", "नटवर! आज रचाओ रास॥"]),
    ("४", ["स्वर्ग-नृत्य सँग डोले सारा", "व्योम क्षितिज शशि-मण्डल प्यारा", "लय-तालोंका कलरव न्यारा", "क्षणमें भर दे हृदयाकाश।", "नटवर! आज रचाओ रास॥"]),
    ("५", ["भुवन-मोहिनी वंशीके कल-", "नाद-निस्सरित दल-सम चञ्चल", "आरोहावरोहसे प्रतिपल", "गूँजे स्वर्ग मर्त्य आवास।", "नटवर! आज रचाओ रास॥"]),
]


def norm(s):
    s = s.replace("‌", "").replace("‍", "").replace(" ", " ")
    s = s.replace("।।", "॥")
    # a dash: hyphen between two ordinary characters, otherwise the long dash (spaces around it dropped)
    s = re.sub(r"(?<=[^\s’”)।,;:?!'\"])–(?=[^\s‘“(])", "-", s)
    s = re.sub(r"\s*–\s*", "—", s)
    s = re.sub(r"\s+([।॥])", r"\1", s)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s.strip()


def clean_note(t):
    return norm(t)


def convert(path, chapter_id="Chapter_9"):
    d = docx.Document(path)
    z = zipfile.ZipFile(path)
    notes = {}
    fx = z.read("word/footnotes.xml").decode("utf8")
    for m in re.finditer(r'<w:footnote [^>]*w:id="(\d+)"[^>]*>(.*?)</w:footnote>', fx, re.S):
        notes[int(m.group(1))] = clean_note(re.sub(r"<[^>]+>", "", re.sub(r"</w:p>", " ", m.group(2))))

    out = []
    n_note = 0
    paras = d.paragraphs
    first_h1 = True
    i = 0
    poem_start = next(k for k, p in enumerate(paras) if p.style.name == "Heading 1" and k > 0)
    while i < len(paras):
        p = paras[i]
        style = p.style.name
        if i >= poem_start:
            break
        # text with footnote marks
        pieces, pending = [], []
        for r in p.runs:
            refs = r._r.findall(".//" + W + "footnoteReference")
            if refs:
                for ref in refs:
                    n_note += 1
                    pieces.append("[%s]" % str(n_note).translate(DIGITS))
                    pending.append((n_note, notes[int(ref.get(W + "id"))]))
            else:
                pieces.append(r.text)
        text = norm("".join(pieces))
        if not text:
            i += 1
            continue
        if style == "Heading 1":
            out.append('\t\t\t<p id="%s" class="Heading">%s</p>' % (chapter_id, escape(text, quote=False)))
        elif style == "Heading 2":
            out.append('\t\t\t<p class="Sub-Heading">%s</p>' % escape(text, quote=False))
        elif i == 1:
            out.append('\t\t\t<p class="Nayash">%s</p>' % escape(text, quote=False))
        elif style == "Shlok":
            m = re.match(r"^(.*?)\s*(\([^()]{2,40}\))$", text)
            if m and m.group(1):
                out.append('\t\t\t<p class="Shlok">%s</p>' % escape(m.group(1), quote=False))
                out.append('\t\t\t<p class="TXT-Right">%s</p>' % escape(m.group(2), quote=False))
            else:
                out.append('\t\t\t<p class="Shlok">%s</p>' % escape(text, quote=False))
        else:
            cite = re.match(r"^\([^()]{2,60}\)$", text) and sum(1 for r in p.runs if r.italic) >= len(p.runs) / 2
            out.append('\t\t\t<p class="%s">%s</p>' % ("TXT-Right" if cite else "Normal", escape(text, quote=False)))
        for n, nt in pending:
            out.append('\t\t\t<p class="Footnotes">[%s] %s</p>' % (str(n).translate(DIGITS), escape(nt, quote=False)))
        i += 1

    # the closing poem
    out.append('\t\t\t<p class="Heading">%s</p>' % escape(norm(paras[poem_start].text), quote=False))
    for no, lines in POEM:
        if no != "refrain":
            out.append('\t\t\t<p class="Nayash">(%s)</p>' % no)
        for ln in lines:
            out.append('\t\t\t<p class="Shlok">%s</p>' % escape(ln, quote=False))
    sig = norm(paras[poem_start + 7].text)
    out.append('\t\t\t<p class="TXT-Right">%s</p>' % escape(sig, quote=False))
    return "\n".join(out) + "\n", n_note


if __name__ == "__main__":
    import sys
    html, n = convert(sys.argv[1])
    print(html[:3000])
    print("... footnotes:", n)

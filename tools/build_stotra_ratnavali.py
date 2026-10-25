#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_stotra_ratnavali.py -- import "स्तोत्ररत्नावली" (Gita Press) from "Extracted Book (7).html" into the library.

The export comes from an e-book (Calibre class names: block_23, text_8 ...), so every class is mapped to the library's master.css classes,
the way the other stotra books (देवीस्तोत्ररत्नाकर ...) are laid out:

    title page        cover-Shri-Hari / cover-Book-Name / Tavmev-Mata--pita / cover-Publisher-Note   (the book's cover picture page is dropped)
    निवेदन            Heading (Chapter_2), Normal, TXT-Right
    7 groups          h1 -> Heading (Chapter_3 .. Chapter_9)         "विनयस्तोत्राणि", "शिवस्तोत्राणि" ...
    80 stotras        h2 -> Sub-Heading (Chapter_G_M), one reader page each
    verses            block_23 -> Shlok          translation  block_24 -> Normal       speaker lines (अर्जुन उवाच) -> Uwach
    "इति ... सम्पूर्णम्" -> Chapter-End-Text      "अर्जुनने पूछा—" (the speaker prefix of a translation) -> span char-style-override-3
  * the printed contents page is dropped (its links pointed into the e-book's files; the reader has its own contents list);
  * the 25 end-notes ("Notes" pages) are moved next to the place that points at them and written "N. text" in class Footnotes, so the reader's
    tap-to-open modal (swadhyay-footnotes.js) opens each from its raised number;
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --only "स्तोत्ररत्नावली.html".

    python tools/build_stotra_ratnavali.py "<Extracted Book (7).html>"
"""
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "स्तोत्ररत्नावली"
OUT = BOOKS / (NAME + ".html")
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
SECTION = re.compile(r'<section class="epub-page" data-page="\d+">(.*?)</section>', re.S)
DEV = "०१२३४५६७८९"

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME


def dev(n):
    return "".join(DEV[int(c)] for c in str(n))


def write(p, s):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def text_of(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h).replace("&nbsp;", " ")).replace("\xa0", " ").strip()


def inline(h, notes, used):
    """the inline markup of one paragraph: wrappers unwrapped, a speaker prefix styled, the note references turned into raised numbers"""
    def ref(m):
        n = int(m.group(1))
        used.append(n)
        return "<sup>%s</sup>" % dev(n)
    h = re.sub(r'<sup class="calibre\d+"><a id="back_note_\d+"[^>]*role="doc-noteref">(\d+)</a></sup>', ref, h)
    h = re.sub(r'<br\b[^>]*>', "", h)
    h = re.sub(r'<b class="calibre(?:10|1)">(.*?)</b>', r'<span class="char-style-override-3">\1</span>', h, flags=re.S)
    h = re.sub(r'<span class="text_(?:10|18)">(.*?)</span>', r'<span class="char-style-override-3">\1</span>', h, flags=re.S)
    for _ in range(3):                                           # every other styled wrapper: unwrap
        h = re.sub(r'<span class="text_\d*">(.*?)</span>', r"\1", h, flags=re.S)
    h = re.sub(r'<span style="[^"]*">(.*?)</span>', r"\1", h, flags=re.S)
    h = re.sub(r"<span></span>", "", h)
    return h.strip()


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = Path(sys.argv[1]).read_text(encoding="utf-8")
    secs = SECTION.findall(src)

    # ---- the end-notes
    notes = {}
    for x in secs[11:]:
        for m in re.finditer(r'<dl id="note_(\d+)" class="footnote\d*">.*?<dd[^>]*>(.*?)</dd></dl>', x, re.S):
            body = re.sub(r"</?p\b[^>]*>", " ", m.group(2))
            body = re.sub(r"</?span[^>]*>", "", body)
            body = re.sub(r"\s+", " ", body).strip()
            body = re.sub(r"^[.\s]+", "", body)
            notes[int(m.group(1))] = body
    if len(notes) != 25:
        raise SystemExit("expected 25 notes, found %d" % len(notes))
    used = []

    # ---- the title page and the निवेदन
    title = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ ॐ श्रीपरमात्मने नम:॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव माता च पिता त्वमेव</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव बन्धुश्च सखा त्वमेव।</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव विद्या द्रविणं त्वमेव</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव सर्वं मम देवदेव॥</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
             '\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t</div>\n') % (NAME, NOTE)
    nv = secs[2]
    paras = re.findall(r'<p class="(block_\d*)"[^>]*>(.*?)</p>', nv, re.S)
    nivedan = '\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="Page-Break">॥ श्रीहरि:॥</p>\n\t\t\t<p id="Chapter_2" class="Heading">निवेदन</p>\n'
    for cls, h in paras:
        if cls == "block_9":
            nivedan += '\t\t\t<p class="Normal">%s</p>\n' % inline(h, notes, used)
        elif cls == "block_10":
            nivedan += '\t\t\t<p class="TXT-Right">%s</p>\n' % inline(h, notes, used)
    nivedan += "\t\t</div>\n"

    # ---- the seven groups
    pages = [title, nivedan]
    stotras = 0
    gid = 2                                                      # chapter number of the heading in force (a section may hold two: श्रीकृष्ण / विविधदेव)
    m_no = 0
    for x in secs[4:11]:
        cur = None                                               # the page being filled: list of lines
        def flush():
            if cur is not None:
                pages.append('\n<div class="Basic-Graphics-Frame">\n' + "".join(cur) + "\t\t</div>\n")
        for m in re.finditer(r'<(h1|h2|p)\b([^>]*)>(.*?)</\1>', x, re.S):
            tag, attrs, h = m.group(1), m.group(2), m.group(3)
            cm = re.search(r'class="([^"]*)"', attrs)
            cls = cm.group(1) if cm else ""
            txt = text_of(h)
            if tag == "h1":
                flush()
                gid += 1
                m_no = 0
                cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n', '\t\t\t<p id="Chapter_%d" class="Heading">%s</p>\n' % (gid, txt.strip("[] "))]
                continue
            if tag == "h2":
                m_no += 1
                stotras += 1
                if cur is not None and m_no == 1:                # the first stotra shares the group's page
                    pass
                else:
                    flush()
                    cur = ['\t\t\t<p class="Page-Break">&nbsp;</p>\n']
                cur.append('\t\t\t<p id="Chapter_%d_%d" class="Sub-Heading">%s</p>\n' % (gid, m_no, txt))
                continue
            if cur is None or not txt:
                continue                                          # blanks and the page-break anchors
            before = len(used)
            inner = inline(h, notes, used)
            if cls == "block_":
                continue                                          # "ॐ", "सर्वेभ्यो देवेभ्यो नम:" over the group's first page
            if cls == "block_20":
                continue
            elif cls == "block_23":
                k = "Shlok"
            elif cls in ("block_24", "block_73"):
                k = "Normal"
            elif cls in ("block_26", "block_29"):
                k = "Chapter-End-Text" if re.search(r"सम्पूर्णम्|^॥?\s*इति", txt) else "Uwach"
            elif cls in ("block_41", "block_85", "block_32", "block_75", "block_74"):
                k = "Uwach"
            elif cls == "block_76":
                k = "Shlok"
            elif cls == "block_56":
                k = "Gadya"
            elif cls == "block_14":
                k = "Normal"
            else:
                raise SystemExit("unmapped paragraph class %s: %s" % (cls, txt[:60]))
            cur.append('\t\t\t<p class="%s">%s</p>\n' % (k, inner))
            for n in used[before:]:                               # the notes this paragraph points at, right after it
                cur.append('\t\t\t<p class="Footnotes">%s. %s</p>\n' % (dev(n), notes[n]))
        flush()
    pages.append('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="Page-Break">&nbsp;</p>\n\t\t</div>\n')

    missing = sorted(set(range(1, 26)) - set(used))
    if missing or len(used) != len(set(used)):
        raise SystemExit("notes not placed once each: missing %s, used %d" % (missing, len(used)))

    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(pages)) + "\n\n</body>\n</html>"

    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    classes = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        classes.update(m.group(1).split())
    bad = sorted(c for c in classes if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if re.search(r"calibre|block_|text_\d|Gita-Seva|गीता\s*सेवा", out):
        raise SystemExit("a leftover of the export remains")

    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| pages:", len(pages), "| stotras:", stotras, "| notes placed:", len(used))

    d = DATA_JS.read_text(encoding="utf-8")
    if '"file":  "%s.html"' % NAME not in d:
        size = round(OUT.stat().st_size / 1024, 1)
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Stotra evam Naamavali",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (NAME, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

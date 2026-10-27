#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_garud_puran_saroddhar.py -- import "गरुडपुराण-सारोद्धार" (Gita Press, with Hindi translation) from the Word file
"GarudPuran-Unicode-Revised.docx" into the library.

The docx is the book's text typed out of the printed edition: styles Title / Heading1 (chapter) / Heading2 (the chapter's title line) /
Heading3 (the speaker: "सूत उवाच") / shlok (the verses; the lines of a verse are separated by line breaks) / plain paragraphs (the
translation), six pictures (each is a scan of two plates side by side, with their captions), two Word footnotes, and star notes ("* ...",
typed as paragraphs under the paragraph that carries the "*").  Mapping (master.css classes only):

    title page        cover-Shri-Hari / cover-Book-Name / cover-subtitle (सानुवाद) / Tavmev-Mata--pita / cover-Publisher-Note
    Heading1          Heading  (id Chapter_N, one reader page each: नम्र निवेदन, the 16 अध्याय, गरुडपुराण-श्रवणका फल)
    Heading2          Sub-Heading (the chapter's title)
    Heading3          Uvaacha
    shlok / verse     Shlok, one paragraph per line; a one-line verse with a single । in the middle is set as two lines
    colophons         "इति गरुडपुराणे ... ॥ १ ॥" and "॥ इस प्रकार ... अध्याय पूरा हुआ ॥" -> Chapter-End-Text
    translation       Normal;  "* ..." notes and the two Word notes -> Footnotes ("*" marks; the reader opens them in a modal)
    pictures          each docx picture is cut into its two plates (captions kept), <= 200 KB each, image/garud-saroddhar-NN.jpg,
                      Image paragraphs at the place of the docx picture
    dropped           the printed contents list, the second title page, the running titles, everything after the last colophon
                      (the printed list of Gita Press shops, which the scan turned into noise)
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --apply --only "गरुडपुराण-सारोद्धार.html".

    python tools/build_garud_puran_saroddhar.py "<GarudPuran-Unicode-Revised.docx>"
"""
import io
import re
import sys
import time
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
IMG_DIR = BOOKS / "image"
NAME = "गरुडपुराण-सारोद्धार"
OUT = BOOKS / (NAME + ".html")
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
LAST_PARA = 1915                        # "॥ इस प्रकार गरुडपुराण सारोद्धार सम्पूर्ण हुआ ॥": nothing after it belongs to the book

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME


def write(p, data):
    data = data if isinstance(data, bytes) else data.encode("utf-8")
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(data)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tidy(t):
    t = t.replace(" ", " ").replace("\t", " ")
    return re.sub(r" {2,}", " ", t).strip()


def read_docx(path):
    z = zipfile.ZipFile(path)
    d = z.read("word/document.xml").decode("utf8")
    body = d[d.index("<w:body>"):]
    rels = {}
    for m in re.finditer(r"<Relationship [^>]*>", z.read("word/_rels/document.xml.rels").decode()):
        i, t = re.search(r'Id="([^"]+)"', m.group(0)), re.search(r'Target="([^"]+)"', m.group(0))
        if i and t:
            rels[i.group(1)] = t.group(1)
    notes = {}
    f = z.read("word/footnotes.xml").decode("utf8")
    for m in re.finditer(r'<w:footnote [^>]*w:id="(\d+)"[^>]*>(.*?)</w:footnote>', f, re.S):
        txt = tidy(re.sub(r"<[^>]+>", "", m.group(2)))
        if txt:
            notes[m.group(1)] = txt
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", body, re.S):
        st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        s, figs = "", []
        for m in re.finditer(r'<w:t[^>]*>([^<]*)</w:t>|<w:br w:type="page"/>|<w:br[^>]*/>|<w:tab/>|<w:footnoteReference w:id="(\d+)"/>|r:embed="(rId\d+)"', p):
            if m.group(1) is not None:
                s += m.group(1)
            elif m.group(2):
                s += "\u0001%s\u0002" % m.group(2)
            elif m.group(3):
                figs.append(rels[m.group(3)])
            elif m.group(0).startswith("<w:br w:type"):
                pass
            elif m.group(0).startswith("<w:tab"):
                s += " "
            else:
                s += "\n"
        paras.append({"st": st.group(1) if st else "", "t": s, "figs": figs})
    return z, paras, notes


def shlok_lines(t):
    lines = [tidy(x) for x in t.split("\n") if tidy(x)]
    out = []
    for ln in lines:
        # a one-line verse with exactly one । in the middle -> two lines
        m = re.fullmatch(r"([^।॥]+?)\s*।\s*([^।॥]+॥.*)", ln)
        if len(lines) == 1 and m:
            out.extend([m.group(1) + " ।", m.group(2)])
        else:
            out.append(ln)
    return out


def split_plates(blob):
    """one scan with two plates side by side (+ a vertical page reference at the right) -> the plates, trimmed, captions kept"""
    import numpy as np
    im = Image.open(io.BytesIO(blob)).convert("L")
    a = np.asarray(im) < 200
    cols = a.sum(axis=0) > 0
    runs, start = [], None
    for x, v in enumerate(cols):
        if v and start is None:
            start = x
        elif not v and start is not None:
            runs.append([start, x])
            start = None
    if start is not None:
        runs.append([start, len(cols)])
    merged = []
    for r in runs:                                                 # gaps under 8 px belong to one block (the vertical page reference stands further off)
        if merged and r[0] - merged[-1][1] < 8:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    plates = [r for r in merged if r[1] - r[0] > 150]
    out = []
    rgb = Image.open(io.BytesIO(blob)).convert("RGB")
    for x0, x1 in plates:
        sub = a[:, x0:x1]
        rows = np.where(sub.sum(axis=1) > 0)[0]
        y0, y1 = rows[0], rows[-1] + 1
        out.append(rgb.crop((max(0, x0 - 6), max(0, y0 - 6), min(rgb.width, x1 + 6), min(rgb.height, y1 + 6))))
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, P, notes = read_docx(sys.argv[1])
    P = P[:LAST_PARA + 1]
    if "सम्पूर्ण हुआ" not in P[LAST_PARA]["t"]:
        raise SystemExit("paragraph %d is not the last line" % LAST_PARA)

    # pictures: plates, in the order of the book
    IMG_DIR.mkdir(exist_ok=True)
    for old in IMG_DIR.glob("garud-saroddhar-*"):
        old.unlink()
    plate_names, plate_total, n_plate = {}, 0, 0
    for p in P:
        for target in p["figs"]:
            if target in plate_names:
                continue
            names = []
            for im in split_plates(z.read("word/" + target)):
                n_plate += 1
                buf = io.BytesIO()
                im.save(buf, "PNG")
                blob, ext = bc.optimize_image(buf.getvalue(), ".png", 200 * 1024)
                name = "garud-saroddhar-%02d%s" % (n_plate, ext)
                write(IMG_DIR / name, blob)
                plate_total += len(blob)
                names.append(name)
            plate_names[target] = names

    pages, cur = [], None
    chap_no = 1

    def new_page(top="&nbsp;"):
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % top]

    def add(cls, text, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, esc(text)))

    title = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n'
             '\t\t\t<p class="cover-subtitle">सानुवाद</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव माता च पिता त्वमेव</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव बन्धुश्च सखा त्वमेव।</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">त्वमेव विद्या द्रविणं त्वमेव</p>\n\t\t\t<p class="Tavmev-Mata--pita">त्वमेव सर्वं मम देवदेव॥</p>\n'
             '\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t</div>\n') % (NAME, NOTE)
    pages.append(title)

    # body: from "नम्र निवेदन" (skipping the printed contents list "विषय-सूची" and the page headers)
    start = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "नम्र निवेदन")
    skip_contents = False
    n_star = n_word = n_verse_extra = 0
    for i in range(start, len(P)):
        p = P[i]
        t = p["t"]
        txt = tidy(t.replace("\n", " "))
        if p["st"] == "Title":
            continue
        if p["st"] == "Heading1":
            skip_contents = txt.startswith("विषय")
            if skip_contents:
                continue
            chap_no += 1
            new_page("॥ श्रीहरिः ॥" if chap_no <= 3 else "&nbsp;")
            add("Heading", txt, ' id="Chapter_%d"' % chap_no)
            continue
        if skip_contents:
            if p["st"] == "shlok" and txt.startswith("॥ श्रीहरिः"):
                skip_contents = False
            continue
        if cur is None:
            continue
        if p["figs"]:
            for target in p["figs"]:
                for name in plate_names[target]:
                    cur.append('\t\t\t<p class="Image"><span><img class="frame-1" src="image/%s" alt=""></span></p>\n' % name)
            if not txt:
                continue
        if not txt:
            continue
        if p["st"] == "Heading2":
            add("Sub-Heading", txt)
        elif p["st"] == "Heading3":
            add("Uvaacha", txt)
        elif re.match(r"(॥ ?)?इति गरुडपुराणे|॥ ?इति (गरुड|श्री)|॥ ?इस प्रकार गरुडपुराण", txt):
            for ln in [tidy(x) for x in t.split("\n") if tidy(x)]:
                add("Chapter-End-Text", ln)
        elif p["st"] == "shlok" or i in VERSE_PARAS:
            if p["st"] == "shlok" and txt.startswith("॥ श्रीहरिः"):
                continue                                           # the running "॥ श्रीहरिः ॥" over a chapter title
            for ln in shlok_lines(t):
                add("Shlok", ln)
        elif txt.startswith("—") and txt.endswith("॥") and len(txt) < 60:
            add("TXT-Right", re.sub(r"\s*॥\s*श्रीहरि:?\s*॥\s*$", "", txt))
        elif txt.startswith("*"):
            n_star += 1
            add("Footnotes", txt)
        else:
            marks = re.findall("\u0001(\\d+)\u0002", t)
            body = tidy(re.sub("\u0001\\d+\u0002", "*", t.replace("\n", " ")))
            add("Normal", body)
            for m in marks:
                n_word += 1
                add("Footnotes", "* " + notes[m])
    pages.append('\n<div class="Basic-Graphics-Frame">\n' + "".join(cur) + "\t\t</div>\n")        # the last page
    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if "\u0001" in out or "\u0003" in out:
        raise SystemExit("a Word marker is left")
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")

    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| chapters:", len(ids), "| star notes:", n_star, "| Word notes:", n_word,
          "| plates: %d, %.1f MB" % (n_plate, plate_total / 1048576))

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Purans",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (NAME, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


VERSE_PARAS = {79, 95, 232, 1327}       # Sanskrit verses the docx left in the plain style


if __name__ == "__main__":
    main()

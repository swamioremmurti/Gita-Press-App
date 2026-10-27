#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ramsukhdas_docx.py -- import two Gita Prakashan books of Swami Ramsukhdasji that come as Word files.

    python tools/build_ramsukhdas_docx.py kaliyug "<यह कलियुग है .docx>"
    python tools/build_ramsukhdas_docx.py mai-nahin "<31_continuous_print_book.docx>"

kaliyug    "यह कलियुग है!" -- a clean typed text (styles Title / Subtitle / Heading1 / Heading2 / Shlok / Shlokref / plain).  The book was already in the library from
           an older rough import; this replaces it in place (same file name, so its cover, slug and entry stay; the old file is copied to backups/before-ramsukhdas-docx/).
mai-nahin  "मैं नहीं, मेरा नहीं" -- the OCR of the printed book (talks in questions and answers, "* * *" between the talks).  A new book.  The OCR's
           typical slips are mended only where they are certain (डस->इस ...), the quotes are made ‘ ’ / “ ”; the rest of the text is the OCR as it stands.

Common mapping (master.css classes only): title page cover-Shri-Hari / cover-Book-Name / cover-subtitle / Tavmev-Mata--pita / cover-Publisher-Note, Heading1 -> Heading
(id Chapter_N, one reader page each), Heading2 -> Sub-Heading, verses (shlok; centred bold lines in the OCR) -> Shlok, the "(मानस, ...)" reference line -> Shlok-Right,
the questions of a talk ("श्रोता—") -> TXT-Bold, everything else Normal, each "* * *" opens the next sub-chapter (Sub-Heading १, २, ३ ... under the Heading "मैं नहीं, मेरा नहीं", after the Sub-Heading मंगलाचरण), a wholly italic paragraph -> Normal with span.rg-it.
The printed contents list, the publisher's catalogue and the OCR's stray marks are left out; the publisher stays "गीता प्रकाशन, गोरखपुर" (these are not Gita Press books).
"""
import html
import io
import re
import shutil
import sys
import time
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ocr_quotes import normalize_quotes  # noqa: E402

ROOT =Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
BACKUP = ROOT / "backups" / "before-ramsukhdas-docx"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
PUBLISHER = "गीता प्रकाशन, गोरखपुर"
OM = "॥ ॐ श्रीपरमात्मने नमः ॥"
AUTHOR = "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज"

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

"""


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
    if "word/footnotes.xml" in z.namelist():
        f = z.read("word/footnotes.xml").decode("utf8")
        for m in re.finditer(r'<w:footnote [^>]*w:id="(\d+)"[^>]*>(.*?)</w:footnote>', f, re.S):
            txt = tidy(re.sub(r"<[^>]+>", "", m.group(2)))
            if txt:
                notes[m.group(1)] = txt
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", body, re.S):
        st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        jc = re.search(r'<w:jc w:val="([^"]+)"', p)
        s, runs_it, any_text = "", [], False
        figs = [rels[x] for x in re.findall(r'r:embed="(rId\d+)"', p) if x in rels]
        for r in re.findall(r"<w:r[ >].*?</w:r>", p, re.S):
            rt = ""
            for m in re.finditer(r'<w:t[^>]*>([^<]*)</w:t>|<w:br[^>]*/>|<w:tab/>|<w:footnoteReference w:id="(\d+)"/>', r):
                if m.group(1) is not None:
                    rt += m.group(1)
                elif m.group(2):
                    rt += "\u0001%s\u0002" % m.group(2)
                elif m.group(0).startswith("<w:tab"):
                    rt += " "
                elif "w:type=\"page\"" not in m.group(0):
                    rt += "\n"
            if rt.strip():
                runs_it.append("<w:i/>" in r)
            s += rt
        paras.append({"st": st.group(1) if st else "", "jc": jc.group(1) if jc else "", "t": s, "all_italic": bool(runs_it) and all(runs_it), "figs": figs})
    return z, paras, notes


def fix_quotes(t):
    """OCR quotes: a leading * ` or “ with a closing ' or ” is a “...” quote; glued "*word" opens a ‘ quote; straight ' pairs become ‘ ’"""
    t = t.strip()
    if re.match(r"^[*`“\"]", t) and re.search(r"['”\"]\s*[।॥.]?$", t):
        t = "“" + t[1:].lstrip()
        t = re.sub(r"['\"”]\s*([।॥.]?)$", r"”\1", t)
    elif t.startswith("*"):
        t = "“" + t[1:].lstrip()
    if t.startswith("‘") and t.count("‘") == 1 and re.search(r"'\s*[।॥.]?$", t):                  # ‘ ... '  (the OCR closes with a straight quote)
        t = re.sub(r"'(\s*[।॥.]?)$", r"’\1", t)
    t = re.sub(r"(?<=[\s\-—])\*(?=[ऀ-ॿ])", "‘", t)
    t = re.sub(r"([।॥.])\s*\*(?=\s*\()", r"\1”", t)                  # "।* (date)": the closing quote of the sentence before the reference
    if t.count("'") % 2 == 0:
        out, n = [], 0
        for ch in t:
            if ch == "'":
                out.append("‘" if n % 2 == 0 else "’")
                n += 1
            else:
                out.append(ch)
        t = "".join(out)
    return t


OCR_FIX = [(r"\bडसीलिये\b", "इसीलिये"), (r"\bडस\b", "इस"), (r"\bडतना\b", "इतना"), (r"\bडुन्हें\b", "उन्हें"), (r"भक्तियोण", "भक्तियोग"), (r"विश्वासमार्ण", "विश्वासमार्ग"),
           (r"महात्या बन जायें\.", "महात्मा बन जायँ,"), (r"सुढुर्लथ सहात्पा", "सुदुर्लभ महात्मा"), (r"संसारयें", "संसारमें"), (r"लोगोका", "लोगोंका"),
           (r"ऐसा में चाहता", "ऐसा मैं चाहता"), (r"भगवानू", "भगवान्"), (r"ः:", "ः"), (r"श्रीधगवानुवाच", "श्रीभगवानुवाच"), (r"श्यामसख्या", "श्यामसखा"), (r"इयामसखा", "श्यामसखा"), (r"ख्ा", "खा"), (r"मद्ूप", "मद्रूप"),
           (r"सुदुर्लध सहात्पा", "सुदुर्लभ महात्मा")]


def ocr_fix(t):
    for a, b in OCR_FIX:
        t = re.sub(a, b, t)
    return t


class Book:
    def __init__(self, name):
        self.name = name
        self.pages = []
        self.cur = None
        self.chap = 1

    def page(self, top="&nbsp;"):
        self.flush()
        self.cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % top]

    def flush(self):
        if self.cur is not None and len(self.cur) > 1:
            self.pages.append('\n<div class="Basic-Graphics-Frame">\n' + "".join(self.cur) + "\t\t</div>\n")
        self.cur = None

    def add(self, cls, text, attrs="", raw=False):
        m = re.fullmatch(r'<span class="rg-it">(.*)</span>', text, re.S) if raw else None
        if m:                                                         # a wholly italic paragraph: its text is set right, the span stays
            text = '<span class="rg-it">%s</span>' % esc(normalize_quotes(html.unescape(m.group(1))))
        elif not raw:
            text = esc(normalize_quotes(text))
        self.cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, text))

    def heading(self, text, cls="Heading", top="&nbsp;"):
        if cls == "Heading":
            self.page(top)
            self.chap += 1
            self.add("Heading", text, ' id="Chapter_%d"' % self.chap)
        else:
            self.add(cls, text)

    def title_page(self, shri, subtitle, tavmev_extra, publisher_lines):
        t = '\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Shri-Hari">%s</p>\n\t\t\t<p class="cover-Book-Name">%s</p>\n' % (esc(shri), esc(self.name))
        t += '\t\t\t<p class="cover-subtitle">%s</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n' % esc(subtitle)
        for ln in ("त्वमेव माता च पिता त्वमेव", "त्वमेव बन्धुश्च सखा त्वमेव।", "त्वमेव विद्या द्रविणं त्वमेव", "त्वमेव सर्वं मम देवदेव॥"):
            t += '\t\t\t<p class="Tavmev-Mata--pita">%s</p>\n' % ln
        for ln in tavmev_extra:
            t += '\t\t\t<p class="Tavmev-Mata--pita">%s</p>\n' % esc(normalize_quotes(ln))
        t += '\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n'
        for ln in publisher_lines:
            t += '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % esc(ln)
        self.pages.insert(0, t + "\t\t</div>\n")

    def html(self):
        self.flush()
        hr = '\n\n<hr class="page-break">\n\n'
        return HEAD % self.name + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(self.pages)) + "\n\n</body>\n</html>"


def validate(out):
    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if "\u0001" in out:
        raise SystemExit("a Word marker is left")
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")
    return len(ids)


def register(name, entry_extra, out_path):
    d = DATA_JS.read_text(encoding="utf-8")
    size = round(out_path.stat().st_size / 1024, 1)
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(name), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated:", size)
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Pravachan",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (name, AUTHOR, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


# ------------------------------------------------------------------------------------------------------------------ यह कलियुग है!
def build_kaliyug(path):
    name = "यह कलियुग है!"
    out_path = BOOKS / (name + ".html")
    z, P, notes = read_docx(path)
    b = Book(name)
    start = next(i for i, p in enumerate(P) if p["st"] == "Heading1")
    sub = tidy(next(p for p in P if p["st"] == "Subtitle")["t"])
    b.title_page(OM, sub, [], ["संकलन तथा सम्पादन — राजेन्द्र कुमार धवन", PUBLISHER,
                                "%sके मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।" % PUBLISHER])
    # the translation of the title-page verse ("‘हे प्रभो ! ...’"), set under the four lines
    tv = next(tidy(p["t"].replace("\n", " ")) for p in P[:start] if tidy(p["t"]).startswith("‘हे प्रभो"))
    b.pages[0] = b.pages[0].replace('\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n\t\t\t<p class="cover-Publisher-Note">',
                                    '\t\t\t<p class="Tavmev-Mata--pita">%s</p>\n\t\t\t<p class="Tavmev-Mata--pita">&nbsp;</p>\n\t\t\t<p class="cover-Publisher-Note">' % esc(tv), 1)
    n_note = 0
    for p in P[start:]:
        t, txt = p["t"], tidy(p["t"].replace("\n", " "))
        if not txt:
            continue
        if p["st"] == "Heading1":
            b.heading(txt, "Heading", OM)
        elif p["st"] == "Heading2":
            b.heading(txt, "Sub-Heading")
        elif p["st"] == "Shlok":
            for ln in [tidy(x) for x in t.split("\n") if tidy(x)]:
                b.add("Shlok", ln)
        elif p["st"] == "Shlokref":
            b.add("Shlok-Right", txt)
        else:
            marks = re.findall("\u0001(\\d+)\u0002", t)
            body = tidy(re.sub("\u0001\\d+\u0002", "*", t.replace("\n", " ")))
            if p["all_italic"]:
                b.add("Normal", '<span class="rg-it">%s</span>' % esc(body), raw=True)
            else:
                b.add("Normal", body)
            for m in marks:
                n_note += 1
                b.add("Footnotes", "* " + notes[m])
    out = b.html()
    n = validate(out)
    if out_path.exists():
        BACKUP.mkdir(parents=True, exist_ok=True)
        if not (BACKUP / out_path.name).exists():
            shutil.copy2(out_path, BACKUP / out_path.name)
    write(out_path, out)
    print("wrote", out_path.name, "| %.1f KB" % (out_path.stat().st_size / 1024), "| chapters:", n, "| notes:", n_note)
    register(name, None, out_path)


# ------------------------------------------------------------------------------------------------------------------ मैं नहीं, मेरा नहीं
def build_mai_nahin(path):
    name = "मैं नहीं, मेरा नहीं"
    out_path = BOOKS / (name + ".html")
    z, P, _ = read_docx(path)
    b = Book(name)

    def lines(p):
        return [tidy(x) for x in p["t"].split("\n") if tidy(x)]

    i_nivedan = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "नम्र निवेदन")
    i_main = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "मंगलाचरण")
    i_app = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]).startswith("परमात्मप्राप्ति"))
    i_end = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and "कल्याणकारी साहित्य" in tidy(p["t"]))
    # the title page: the lines between the title and "नम्र निवेदन"
    sub = " ".join(tidy(p["t"]) for p in P[4:6])
    tr = " ".join(tidy(p["t"].replace("\n", " ")) for p in P[10:14])
    b.title_page(OM, sub, [tr], ["संकलन तथा सम्पादन — राजेन्द्र कुमार धवन", PUBLISHER])

    def body(lo, hi, chapters=False):
        n_sep = 0
        pending = False                                               # a "* * *" was met: the next text opens a new chapter, headed ९, १० ...
        for p in P[lo:hi]:
            t, txt = p["t"], tidy(p["t"].replace("\n", " "))
            if not txt:
                continue
            if p["st"] == "Heading1":
                b.heading(ocr_fix(txt), "Sub-Heading")
                continue
            if p["jc"] == "center" and re.fullmatch(r"[\*\s]+", txt):
                n_sep += 1
                if chapters:
                    pending = True
                else:
                    b.add("center", "*&nbsp;&nbsp;*&nbsp;&nbsp;*", raw=True)
                continue
            if pending and re.search(r"[ऀ-ॿ]", txt):
                b.heading(str(n_sep).translate(str.maketrans("0123456789", "०१२३४५६७८९")), "Sub-Heading")
                pending = False
            if not re.search(r"[ऀ-ॿ]", txt):
                continue                                              # the OCR's stray marks
            if p["jc"] == "center":
                for ln in lines(p):
                    b.add("Shlok", ocr_fix(ln))
                continue
            txt = ocr_fix(fix_quotes(txt))
            if re.fullmatch(r"\([^()]{3,70}\)", txt):
                b.add("Shlok-Right", txt)
            elif re.match(r"श्रोता\s*[-—–]", txt):
                b.add("TXT-Bold", re.sub(r"^श्रोता\s*[-—–]+\s*", "श्रोता—", txt))
            elif re.match(r"स्वामीजी\s*[-—–]", txt):
                b.add("Normal", re.sub(r"^स्वामीजी\s*[-—–]+\s*", "स्वामीजी—", txt))
            else:
                b.add("Normal", txt)
        return n_sep

    # नम्र निवेदन
    b.heading("नम्र निवेदन", "Heading", OM)
    for p in P[i_nivedan + 1:i_nivedan + 12]:
        txt = tidy(p["t"].replace("\n", " "))
        if not txt or p["jc"] == "center" or p["st"]:
            continue
        if txt.startswith("गुरुपूर्णिमा निवेदक"):
            continue
        if txt.startswith("वि० सं०"):
            b.add("TXT-Right", "निवेदक—राजेन्द्र कुमार धवन")
            b.add("TXT-Right", "गुरुपूर्णिमा, " + txt.split(" राजेन्द्र")[0])
            continue
        b.add("Normal", ocr_fix(fix_quotes(txt)))
    # the talks
    b.heading(name, "Heading", OM)                                # the book's own heading; under it the sub-chapters: मंगलाचरण (ends at "सर्वेभ्यो नमो नमः ।"), then every text between two "* * *" as १, २, ३ ...
    b.add("Sub-Heading", "मंगलाचरण")
    n_sep = body(i_main + 1, i_app - 2, chapters=True)
    # the three paths (a pamphlet the book prints at its end)
    b.heading("परमात्मप्राप्तिके तीन मुख्य मार्ग", "Heading", OM)
    note = tidy(P[i_app - 2]["t"].replace("\n", " "))
    if note.startswith("[ निम्नलिखित"):
        b.add("Normal", '<span class="rg-it">%s</span>' % esc(ocr_fix(fix_quotes(note))), raw=True)
    body(i_app + 1, i_end - 2)

    out = b.html()
    n = validate(out)
    write(out_path, out)
    print("wrote", out_path.name, "| %.1f KB" % (out_path.stat().st_size / 1024), "| chapters:", n, "| separators:", n_sep)
    # the cover: the first picture of the docx (the printed front cover)
    cover = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    if cover:
        write(cover, z.read("word/media/image1.png"))
        print("cover picture saved to", cover)
    register(name, None, out_path)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    {"kaliyug": build_kaliyug, "mai-nahin": build_mai_nahin}[sys.argv[1]](sys.argv[2])

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_chakra_docx.py -- import four typed Word books of Sudarshan Singh 'Chakra' as library books (master.css classes only).

    python tools/build_chakra_docx.py jeevan  "<जीवन–निर्माण.docx>"
    python tools/build_chakra_docx.py kalki   "<kalki avataar.docx>"
    python tools/build_chakra_docx.py braj    "<ब्रज का एक दिन.docx>"
    python tools/build_chakra_docx.py manov   "<भारतीय मनोविज्ञान.docx>"
    (add  --cover <file.png>  to also save the docx's first picture, the printed front cover, for tools/set_cover_from_image.py)

Mapping: title page cover-Book-Name / cover-subtitle / cover-Author-Name (/ cover-Publisher-Note), Heading1 -> Heading (id Chapter_N, one reader page each),
Heading2 -> Sub-Heading, centred lines of a song / verse -> Shlok, the signature lines -> TXT-Right, pictures -> p.Image > img.frame-N (webp in image/<slug>-NN.webp),
Word footnotes -> "[१]" in the text and <p class="Footnotes">[१] ...</p> after the citing paragraph (what swadhyay-footnotes.js links).
Word's printed contents list, page numbers and empty paragraphs are left out.  Typing fixes: Word's en dash "–" is a hyphen inside a word (मल–त्याग -> मल-त्याग),
a dash "—" where it introduces speech or an aside, "।।" -> "॥", straight quotes -> ‘ ’ / “ ”, a space after a danda that runs into the next word.
"""
import io
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_ramsukhdas_docx import BOOKS, DATA_JS, ROOT, Book, esc, tidy, validate, write  # noqa: E402
from ocr_quotes import normalize_quotes  # noqa: E402

from PIL import Image  # noqa: E402

IMG_DIR = BOOKS / "image"
AUTHOR = "सुदर्शनसिंह ‘चक्र’"
DEVD = "०१२३४५६७८९"
dev = lambda n: str(n).translate(str.maketrans("0123456789", DEVD))  # noqa: E731


# ------------------------------------------------------------------------------------------------------------------ reading the docx
def read(path):
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
            txt = tidy(re.sub(r"<[^>]+>", " ", m.group(2)))
            if txt:
                notes[m.group(1)] = txt
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", body, re.S):
        st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        jc = re.search(r'<w:jc w:val="([^"]+)"', p)
        figs = [rels[x] for x in re.findall(r"r:embed=\"(rId\d+)\"", p) if x in rels]
        segs = []                                               # (text, bold, italic)
        for r in re.findall(r"<w:r[ >].*?</w:r>", p, re.S):
            b = bool(re.search(r'<w:b(/>| w:val="(1|true)"/>)', r))
            i = bool(re.search(r'<w:i(/>| w:val="(1|true)"/>)', r))
            for m in re.finditer(r'<w:t[^>]*>([^<]*)</w:t>|<w:br[^>]*/>|<w:tab/>|<w:footnoteReference w:id="(\d+)"/>', r):
                if m.group(1) is not None:
                    segs.append((m.group(1).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">"), b, i))
                elif m.group(2):
                    segs.append(("\u0001%s\u0002" % m.group(2), False, False))
                elif 'w:type="page"' not in m.group(0):
                    segs.append((" ", False, False))
        paras.append({"st": st.group(1) if st else "", "jc": jc.group(1) if jc else "", "segs": segs, "figs": figs,
                      "t": "".join(s[0] for s in segs)})
    return z, paras, notes


# ------------------------------------------------------------------------------------------------------------------ text fixes
def _cls(c):
    if not c:
        return "END"
    if c in DEVD or c.isdigit():
        return "9"
    if "ऀ" <= c <= "ॿ" or c.isalpha():
        return "D"
    if c.isspace():
        return "S"
    if c in "‘“\"'(":
        return "Q("
    if c in "’”)":
        return "Q)"
    return "o"


def dashes(t, heading=False):
    """Word typed every dash as an en dash: a hyphen inside a word, a dash where it introduces speech or an aside, a range between numbers"""
    t = t.replace("–’", "—‘").replace("– ’", "—‘").replace("–”", "—“")
    out = []
    for i, ch in enumerate(t):
        if ch != "–":
            out.append(ch)
            continue
        a, b = _cls(t[i - 1] if i else ""), _cls(t[i + 1] if i + 1 < len(t) else "")
        if a == "D" and b == "D":
            out.append("-")
        elif a == "9" and b == "9":
            out.append("–")
        else:
            out.append("—")
    t = "".join(out)
    t = re.sub(r"\s*—\s*", "—", t)
    if heading:
        t = t.strip("—- ").strip()
    return t


def straight_quotes(t):
    """straight " pairs -> “ ”  (the Word text types them around a phrase that has ‘ ’ inside)"""
    if '"' not in t:
        return t
    out, n = [], 0
    for ch in t:
        if ch == '"':
            out.append("“" if n % 2 == 0 else "”")
            n += 1
        else:
            out.append(ch)
    return "".join(out)


def fix(t, heading=False):
    t = straight_quotes(t.replace("।।", "॥"))
    t = re.sub(r"(?<![०-९])([।॥])(?=[ऀ-ॿ])(?![०-९])", r"\1 ", t)          # a danda that runs into the next word (not "९।१२।१५")
    t = re.sub(r" +([,;?!])", r"\1", t)
    t = dashes(t, heading)
    t = t.replace("ÿ", "")
    return tidy(t)


def inline(p, note_no=None, keep_spans=True):
    """paragraph runs -> html: partial bold / italic become span.bold / span.rg-it, Word footnote marks become [N]"""
    segs = [s for s in p["segs"]]
    allb = bool(segs) and all(b for t, b, i in segs if t.strip())
    alli = bool(segs) and all(i for t, b, i in segs if t.strip())
    out, marks = [], []
    for t, b, i in segs:
        for m in re.split("(\u0001\\d+\u0002)", t):
            if not m:
                continue
            mk = re.fullmatch("\u0001(\\d+)\u0002", m)
            if mk:
                marks.append(mk.group(1))
                out.append(("[%s]" % dev(note_no(mk.group(1))), False, False))
            else:
                out.append((m, b and not allb, i and not alli))
    # merge neighbouring runs of the same look, then fix each merged piece and wrap
    merged = []
    for t, b, i in out:
        if merged and merged[-1][1] == b and merged[-1][2] == i:
            merged[-1][0] += t
        else:
            merged.append([t, b, i])
    plain = "".join(m[0] for m in merged)
    html = ""
    fixed_all = fix(plain)
    if not any(m[1] or m[2] for m in merged) or not keep_spans:
        return esc(normalize_quotes(fixed_all)), marks, allb, alli
    for t, b, i in merged:
        h = esc(normalize_quotes(fix(t))) if t.strip() else esc(t)
        if t.strip() and (b or i):
            lead, trail = re.match(r"\s*", t).group(0), re.search(r"\s*$", t).group(0)
            cls = "bold" if b else "rg-it"
            h = lead + '<span class="%s">%s</span>' % (cls, esc(normalize_quotes(fix(t)))) + trail
        html += h
    return tidy(html), marks, allb, alli


# ------------------------------------------------------------------------------------------------------------------ pictures
def save_pictures(z, slug, figs_in_order, width_cap=900):
    """figs: list of docx media targets (media/imageN.ext) -> webp files image/<slug>-NN.webp; returns {target: (file name, frame class)}"""
    IMG_DIR.mkdir(exist_ok=True)
    out = {}
    for n, target in enumerate(figs_in_order, 1):
        if target in out:
            continue
        im = Image.open(io.BytesIO(z.read("word/" + target))).convert("RGB")
        w, h = im.size
        cap = width_cap if w >= h else 640
        if w > cap:
            im = im.resize((cap, round(h * cap / w)), Image.LANCZOS)
        name = "%s-%02d.webp" % (slug, n)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=82, method=6)
        write(IMG_DIR / name, buf.getvalue())
        out[target] = (name, "frame-1" if w >= h * 1.15 else "frame-3")
    return out


class B(Book):
    """Book with picture paragraphs, footnotes and the plain title page of these books"""
    def image(self, name, frame):
        self.cur.append('\t\t\t<p class="Image"><span><img class="%s" src="image/%s" alt=""></span></p>\n' % (frame, name))

    def title(self, title, sub, author, publisher_line=None, extra=(), pic=None):
        t = '\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="cover-Book-Name">%s</p>\n' % esc(title)
        for s in sub:
            t += '\t\t\t<p class="cover-subtitle">%s</p>\n' % esc(s)
        if pic:
            t += '\t\t\t<p class="Image"><span><img class="%s" src="image/%s" alt=""></span></p>\n' % (pic[1], pic[0])
        t += '\t\t\t<p class="cover-Author-Name">%s</p>\n' % esc(author)
        for s in extra:
            t += '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % esc(s)
        if publisher_line:
            t += '\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % esc(publisher_line)
        self.pages.insert(0, t + "\t\t</div>\n")


QFIX = []


def balance(html):
    """a paragraph that opens one ‘ quote more than it closes (the Word text forgot the closing mark): close it at the end"""
    plain = re.sub(r"<[^>]+>", "", html)
    if plain.count("‘") == plain.count("’") + 1 and plain.count("“") == plain.count("”"):
        QFIX.append(plain[:40])
        return html + "’"
    if plain.count("“") == plain.count("”") + 1 and plain.count("‘") == plain.count("’"):
        QFIX.append(plain[:40])
        return html + "”"
    return html


def heading_text(p):
    return fix(re.sub("\u0001\\d+\u0002", "", p["t"].replace("\n", " ")), heading=True)


def skip(p):
    return not tidy(p["t"]) and not p["figs"]


def register(slug_file, category, author, publisher, out_path, non_gp):
    d = DATA_JS.read_text(encoding="utf-8")
    size = round(out_path.stat().st_size / 1024, 1)
    name = out_path.stem
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(name), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated:", size)
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "%s",\n        "author":  "%s",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (name, category, author, publisher, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")
    if non_gp:
        a = ROOT / "swadhyay-app.js"
        s = a.read_text(encoding="utf-8")
        key = '"%s.html": true' % name
        if key not in s:
            i = s.index("var NON_GITA_PRESS_BOOKS = {") + len("var NON_GITA_PRESS_BOOKS = {")
            nl = "\r\n" if "\r\n" in s[i:i + 5] else "\n"
            write(a, s[:i] + nl + "    " + key + "," + s[i:])
            print("added to NON_GITA_PRESS_BOOKS")


# ------------------------------------------------------------------------------------------------------------------ the notes
class Notes:
    def __init__(self, notes):
        self.notes, self.order = notes, {}

    def number(self, wid):
        if wid not in self.order:
            self.order[wid] = len(self.order) + 1
        return self.order[wid]


def add_para(b, p, cls="Normal", notes=None, nn=None):
    html, marks, allb, alli = inline(p, nn.number if nn else None)
    if not html.strip():
        return
    html = balance(html)
    if allb and cls == "Normal" and "<span" not in html:
        html = '<span class="bold">%s</span>' % html
    elif alli and cls == "Normal" and "<span" not in html:
        html = '<span class="rg-it">%s</span>' % html
    b.cur.append('\t\t\t<p class="%s">%s</p>\n' % (cls, html))
    for m in marks:
        txt = fix(notes[m]) if notes and m in notes else ""
        b.cur.append('\t\t\t<p class="Footnotes">[%s] %s</p>\n' % (dev(nn.number(m)), esc(normalize_quotes(txt))))


# ------------------------------------------------------------------------------------------------------------------ the four books
def finish(b, name, key):
    out = b.html()
    n = validate(out)
    out_path = BOOKS / (name + ".html")
    write(out_path, out)
    if QFIX:
        print("closing quote added in %d paragraphs" % len(QFIX))
        for q in QFIX[:40]:
            print("    ", q)
    print("wrote", out_path.name, "| %.1f KB" % (out_path.stat().st_size / 1024), "| chapters:", n)
    return out_path


def build_jeevan(z, P, notes):
    name = "जीवन-निर्माण"
    b = B(name)
    pics = save_pictures(z, "jeevan-nirman", [f for p in P for f in p["figs"]][1:])        # the first picture is the cover
    b.title(name, ["[कहानियाँ]"], AUTHOR)
    i0 = next(i for i, p in enumerate(P) if p["st"] == "Heading1")
    i_toc = next(i for i, p in enumerate(P) if p["st"] == "TOCHeading")
    i_first = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and i > i_toc)
    seg = list(range(i0, i_toc)) + list(range(i_first, len(P)))
    for i in seg:
        p = P[i]
        if p["st"] == "Heading1":
            b.heading(heading_text(p), "Heading", "॥ श्रीहरिः ॥" if False else "&nbsp;")
            continue
        t = tidy(p["t"])
        if re.fullmatch(r"[\d०-९]{1,3}", t) or re.match(r"पृष्ठ\s*\d+", t):
            continue                                                                    # a page number that came along in the Word text
        if p["figs"] and p["figs"][0] in pics:
            b.image(*pics[p["figs"][0]])
        t = re.sub(r"^पृष्ठ\s*\d+\s*", "", t)
        if not tidy(re.sub("\u0001\\d+\u0002", "", p["t"])):
            continue
        if t == "लेखक":
            b.cur.append('\t\t\t<p class="TXT-Right">लेखक</p>\n')
            continue
        q = dict(p)
        q["segs"] = [(re.sub(r"^\s*पृष्ठ\s*\d+\s*", "", s[0]) if k == 0 else s[0], s[1], s[2]) for k, s in enumerate(p["segs"])]
        add_para(b, q, "Normal")
    return finish(b, name, "jeevan")


def build_kalki(z, P, notes):
    name = "कल्कि अवतार"
    b = B(name)
    figs = [f for p in P for f in p["figs"]]
    pics = save_pictures(z, "kalki-avatar", figs[1:])
    nn = Notes(notes)
    b.title(name, ["अथवा", "कलियुग का अन्त"], AUTHOR, pic=pics[figs[1]])
    i0 = next(i for i, p in enumerate(P) if p["st"] == "IntenseQuote")
    done = False
    quote_open = False                                                                  # "धर्म सम्राट ... महराज का" belongs to the heading "आशीर्वाद" under it
    for i in range(i0, len(P)):
        p = P[i]
        if skip(p):
            continue
        t = tidy(p["t"])
        if p["st"] == "Heading1":
            if quote_open:
                b.chap += 1
                b.add("Heading", heading_text(p), ' id="Chapter_%d"' % b.chap)
                quote_open = False
            else:
                b.heading(heading_text(p), "Heading", "&nbsp;")
            continue
        if p["st"] == "Heading2":
            b.add("Sub-Heading", heading_text(p))
            continue
        if p["st"] == "IntenseQuote":
            if b.cur is None:
                b.page("&nbsp;")
                quote_open = True
            b.cur.append('\t\t\t<p class="Normal center"><span class="bold">%s</span></p>\n' % esc(fix(t)))
            continue
        if p["st"] == "right-bold":
            b.cur.append('\t\t\t<p class="TXT-Right">%s</p>\n' % esc(normalize_quotes(fix(t))))
            continue
        if p["st"] == "Shlok":
            b.cur.append('\t\t\t<p class="Shlok">%s</p>\n' % esc(fix(t)))
            continue
        if t.startswith("।। समाप्त") or t.startswith("॥ समाप्त") or t == "।।समाप्त।।":
            b.cur.append('\t\t\t<p class="Chapter-End-Text">॥ समाप्त ॥</p>\n')
            b.page("&nbsp;")                                                            # the closing page: pictures, the place, the author
            done = True
            continue
        if p["figs"]:
            for f in p["figs"]:
                if f in pics:
                    b.image(*pics[f])
        if not tidy(re.sub("\u0001\\d+\u0002", "", p["t"])):
            continue
        if p["jc"] == "center" and not done and len(t) < 70:
            b.cur.append('\t\t\t<p class="Shlok">%s</p>\n' % esc(normalize_quotes(fix(t))))
        elif p["jc"] == "center":
            add_para(b, p, "Normal center", notes, nn)
        else:
            add_para(b, p, "Normal", notes, nn)
    if len(nn.order) != len(notes):
        raise SystemExit("footnotes used %d of %d" % (len(nn.order), len(notes)))
    return finish(b, name, "kalki")


def build_braj(z, P, notes):
    name = "ब्रज का एक दिन"
    b = B(name)
    figs = [f for p in P for f in p["figs"]]
    pics = save_pictures(z, "braj-ka-ek-din", figs[1:])
    b.title(name, [], "सुदर्शन सिंह ‘चक्र’", extra=["संरक्षक — हनुमद्धाम, श्री राम अध्यात्म प्रन्यास, शुकतीर्थ"], pic=pics[figs[1]])
    i0 = next(i for i, p in enumerate(P) if p["st"] == "Heading1")
    i_idx = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "अनुक्रमणिका")
    i_mang = next(i for i, p in enumerate(P) if p["st"] == "Heading1" and tidy(p["t"]) == "मंगलाचरण")
    seg = list(range(i0, i_idx)) + list(range(i_mang, len(P)))
    in_mang = False
    prev_img = False
    for i in seg:
        p = P[i]
        t = tidy(p["t"])
        was_img, prev_img = prev_img, bool(p["figs"] and not t)
        if p["st"] == "Heading1":
            in_mang = (t == "मंगलाचरण")
            b.heading(heading_text(p), "Heading", "&nbsp;")
            continue
        if p["st"] == "Heading2":
            b.add("Sub-Heading", heading_text(p))
            continue
        if p["figs"]:
            for f in p["figs"]:
                if f in pics:
                    b.image(*pics[f])
        if not t:
            continue
        if in_mang and not p["st"]:
            b.cur.append('\t\t\t<p class="Shlok">%s</p>\n' % esc(normalize_quotes(fix(t))))
        elif (p["jc"] == "center" and i > i_mang + 20) or was_img:
            add_para(b, p, "Normal center")
        else:
            add_para(b, p, "Normal")
    return finish(b, name, "braj")


def build_manov(z, P, notes):
    name = "भारतीय मनोविज्ञान"
    b = B(name)
    b.title(name, [], AUTHOR, publisher_line="आनन्द कानन प्रकाशन")
    i0 = next(i for i, p in enumerate(P) if p["st"] == "Heading1")
    want = 0
    for p in P[i0:]:
        t = tidy(p["t"])
        if not t:
            continue
        if p["st"] == "Heading1":
            h = heading_text(p)
            m = re.match(r"^([०-९]+)\s*:\s*(.*)$", h)
            if m:
                want += 1
                if m.group(1) != dev(want):
                    print("chapter number %s in the docx is %s: set to %s" % (h, m.group(1), dev(want)))
                h = "%s: %s" % (dev(want), m.group(2))
            b.heading(h, "Heading", "&nbsp;")
            continue
        if p["st"] == "ref":
            b.cur.append('\t\t\t<p class="Shlok-Right">%s</p>\n' % esc(normalize_quotes(fix(t))))
            continue
        add_para(b, p, "Normal")
    return finish(b, name, "manov")


BOOKS_CFG = {
    "jeevan": (build_jeevan, "Siksha evam Katha", "", True),
    "kalki": (build_kalki, "Siksha evam Katha", "", True),
    "braj": (build_braj, "Siksha evam Katha", "श्री राम अध्यात्म प्रन्यास, हनुमद्धाम, शुकतीर्थ", True),
    "manov": (build_manov, "Siksha evam Katha", "आनन्द कानन प्रकाशन", True),
}

if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    cover = None
    if "--cover" in args:
        k = args.index("--cover")
        cover = Path(args[k + 1])
        del args[k:k + 2]
    if len(args) < 2 or args[0] not in BOOKS_CFG:
        raise SystemExit(__doc__)
    z, P, notes = read(args[1])
    fn, cat, pub, non_gp = BOOKS_CFG[args[0]]
    out_path = fn(z, P, notes)
    if cover:
        first = next(f for p in P for f in p["figs"])
        write(cover, z.read("word/" + first))
        print("cover picture saved to", cover)
    register(out_path.stem, cat, AUTHOR, pub, out_path, non_gp)

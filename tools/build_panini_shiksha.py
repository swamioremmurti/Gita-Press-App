#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_panini_shiksha.py -- import "पाणिनीयशिक्षा" (त्रिनयनभाष्य, चिन्तामणि हिन्दी भाषान्तर; अवस्थी बच्चूलाल ज्ञान / बालकृष्ण शर्मा,
कालिदास अकादेमी, उज्जैन, वि.सं. २०५०) from "पाणिनीयशिक्षा_स्वरूपित_समीक्षित.docx" into the library.

The docx: Title / Heading1 (समर्पणम्, समर्पण, पुरस्क्रिया, अवतरणिका, अथ पाणिनीयशिक्षा, परिशिष्ट (क)-(ङ), उपसंहार, शब्दानुक्रमणी) / Heading2 /
Verse (the shikshā kārikās, Sanskrit lines) / Quotation / SanskritCommentary (the Sanskrit bhāṣya) / plain paragraphs (the Hindi
translation) / IndexEntry; 7 diagrams, 2 tables, 10 Word footnotes, 144 Word comments (the scan-page provenance of the OCR, not part of the book).
Mapping (master.css classes only):

    title page    cover-Book-Name / cover-subtitle (the three title lines) / cover-Author-Name (भाष्यकृत् ... सहसम्पादकः) /
                  cover-Publisher-Note (प्रकाशकः ... वि.सं. २०५०)
    Heading1      Heading, id Chapter_N, one reader page each (a page break before a Quotation page = a page of its own)
    Heading2      Sub-Heading when it is a section title (intro, appendices, upasamhara: short, no sentence end); in the
                  main text, where Word used Heading2 for the numbered items of the commentary, Normal
    Verse/Quotation   Shlok (a line in Hindi, which the OCR styled as Verse, -> Normal);  "(स्रोत, ११३)" citations -> Shlok-Right
    SanskritCommentary / plain / IndexEntry   Normal  (index: "term — reference")
    italic / bold / bold-italic runs in Normal / Footnotes   inline-28 / strong / inline-10
    footnote      "[१]" in the text, and "[१] note" Footnotes paragraphs right after it (the reader opens them in a modal)
    diagram       p.Image > span > img.frame-1 (image/panini-shiksha-NN.*)
    table         table.Samagri-Table (th.Samagri-Table-Head, td.Samagri-Table-Cell-Center)
    dropped       the running title "पाणिनीयशिक्षा" that the scan turned into a paragraph, empty paragraphs, the comments
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --apply --only "पाणिनीयशिक्षा.html".

    python tools/build_panini_shiksha.py "<पाणिनीयशिक्षा_स्वरूपित_समीक्षित.docx>"
"""
import re
import sys
import time
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
IMG_DIR = BOOKS / "image"
NAME = "पाणिनीयशिक्षा"
OUT = BOOKS / (NAME + ".html")
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
TIKAKAR = "अवस्थी बच्चूलाल ज्ञान"
TRANSLATOR = "बालकृष्ण शर्मा"
PUBLISHER = "कालिदास अकादेमी, उज्जैन"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
DEVA = "०१२३४५६७८९"

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME

# right-aligned closing lines (place, date, signature) the docx left as plain paragraphs
RIGHT_LINES = {"दीपावली २०५० वि.", "विद्वानों का वशंवद", "बच्चूलाल अवस्थी 'ज्ञान'", "कालिदास अकादेमी, उज्जैन", "रामनवमी", "विक्रमाब्द २०५०",
               "आचार्यकुल", "कालिदास अकादेमी", "उज्जयिनी"}
HINDI_WORDS = {"को", "का", "की", "के", "है", "हैं", "से", "में", "जो", "यह", "इस", "उस", "और", "ही", "भी", "कि", "था", "थे", "गया", "जाता", "होता"}
# pictures set as real text with their signs drawn as inline SVGs (image/panini-shiksha-06-*.svg): no. 6 (the Katyayana-parishishta lines on the
# gunkara) and no. 7 (the Taittiriya-pratishakhya verse); each is a list of (paragraph class, html)
SIGN_H = '<img class="inline-sign" src="image/panini-shiksha-06-hrasva.svg" alt="ह्रस्व चिह्न">'
SIGN_D = '<img class="inline-sign" src="image/panini-shiksha-06-dirgha.svg" alt="दीर्घ चिह्न">'
SIGN_A = '<img class="inline-sign" src="image/panini-shiksha-05-anusvara.svg" alt="अनुस्वार का आदेश">'
# the signs inside verse lines (Shlok red, #c10202) are red copies of the black ones used in prose
SIGN_H_R = SIGN_H.replace("06-hrasva", "05-hrasva")
SIGN_D_R = SIGN_D.replace("06-dirgha", "05-dirgha")
# picture no. 4 (the four signs of the yamas, one under another, with their names) is text; its signs come from one traced strip
# (image/panini-shiksha-04-signs.svg, four signs stacked) cut into four SVGs by the y-bands (in the strip's units) measured on the drawing
SIGN_STRIP = "panini-shiksha-04-signs.svg"
SIGN_BANDS = [("hrasva", 0.0, 6.35), ("dirgha", 19.25, 27.55), ("anunasika", 35.4, 39.4), ("akshara", 44.15, 52.464096)]


# the jihvamuliya and upadhmaniya signs (U+1CF5, U+1CF6), which the reader's fonts draw as an "X", is drawn as one SVG (a cup above a cap) in the table cells
JIHVA_IMG = '<img class="jihva-sign" src="image/panini-shiksha-jihvamuliya.svg" alt="जिह्वामूलीय">'


def cell_html(c):
    return esc(c).replace("\u1cf5", JIHVA_IMG).replace("\u1cf6", JIHVA_IMG)


def sign_crops():
    src = IMG_DIR / SIGN_STRIP
    if not src.exists():
        raise SystemExit("%s is missing" % src)
    svg = src.read_text(encoding="utf-8")
    root_end = svg.index(">", svg.index("<svg"))
    root = svg[:root_end]
    if not re.search(r'viewBox="0 0 9\.8831635 52\.464096"', root):
        raise SystemExit("the sign strip is not the drawing this script expects")
    for nm, y0, y1 in SIGN_BANDS:
        r = re.sub(r'viewBox="[^"]*"', 'viewBox="0 %s 9.8831635 %s"' % (y0, round(y1 - y0, 4)), root)
        r = re.sub(r'(\s)width="[^"]*"', lambda m: m.group(1) + 'width="9.8831635mm"', r)
        r = re.sub(r'(\s)height="[^"]*"', lambda m: '%sheight="%smm"' % (m.group(1), round(y1 - y0, 4)), r)
        write(IMG_DIR / ("panini-shiksha-04-%s.svg" % nm), r + svg[root_end:])


def sign_row(nm, label):
    return ("sign-row", '<span class="sign-cell"><img class="sign-col" src="image/panini-shiksha-04-%s.svg" alt=""></span> - %s' % (nm, label))


TEXT_FOR_IMAGE = {
    4: [sign_row("hrasva", "ह्रस्व"), sign_row("dirgha", "दीर्घ"), sign_row("anunasika", "अनुनासिक चिह्न"), sign_row("akshara", "यह अक्षर"),
        ("sign-row", "( इन को चार यम भी कहते हैं ) - वर्णोच्चारणशिक्षा, पृ. ११")],
    5: [("Shlok", "अथानुस्वारस्य " + SIGN_A + " इत्यादेशः शषसहरेफेषु।"),
        ("Shlok", "तस्य त्रैविध्यमाख्यातं ह्रस्व-दीर्घ-गुरुभेदैः।"),
        ("Shlok", "दीर्घात् परो ह्रस्वो ( " + SIGN_H_R + " ) ह्रस्वात् परो दीर्घः"),
        ("Shlok", "( " + SIGN_D_R + " ) गुरौ परे गुरुः ( " + SIGN_H_R + " )।")],
    6: [("Normal", "अर्थात् अनुस्वार के स्थान पर गुंकार का प्रयोग होता है, यदि परवर्ती व्यंजन श, ष, स, ह तथा रेफ हों। वह ह्रस्व-दीर्घ-गुरुभेदों से त्रिधा विभक्त है "
                   "(ह्रस्व तथा गुरु का लिपिचिह्न एक ही रहता है)। ह्रस्व का चिह्न " + SIGN_H + " है और दीर्घ को " + SIGN_D + " लिखा जाता है। "
                   "(उक्त उद्धरण शुक्लयजुर्वेदसंहिता के परिशिष्ट में आया है।)")],
    7: [("Shlok", "पदक्रमविशेषज्ञो वर्णक्रमविचक्षणः।"),
        ("Shlok", "स्वरमात्राविभागज्ञो गच्छेदाचार्यस ँ् सदम्॥"),
        ("Shlok-Right", "(तैत्तिरीयप्रातिशाख्य, २४.६)")],
}
CITATION =re.compile(r"\([^()]{2,130}\)\s*[।॥]?")
FMT_CLASS ={(True, False): "inline-28", (False, True): "strong", (True, True): "inline-10"}


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
    t = t.replace(" ", " ").replace("\t", " ").replace("​", "")
    return re.sub(r" {2,}", " ", t).strip()


def to_deva(n):
    return "".join(DEVA[int(c)] for c in str(n))


def flag(rpr, tag):
    m = re.search(r"<w:%s(?: w:val=\"([^\"]*)\")?/>" % tag, rpr)
    return bool(m) and m.group(1) not in ("0", "false")


def parse_par(p, rels, fn_no):
    """-> dict(st, pieces=[(italic, bold, text)], figs, fns); text carries \\n for a line break and \\u0003 for a tab"""
    st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
    pieces, figs, fns = [], [], []
    for r in re.findall(r"<w:r[ >].*?</w:r>", p, re.S):
        rp = re.search(r"<w:rPr>.*?</w:rPr>", r, re.S)
        rp = rp.group(0) if rp else ""
        it, bd = flag(rp, "i"), flag(rp, "b")
        txt = ""
        for m in re.finditer(r'<w:t[^>]*>([^<]*)</w:t>|<w:tab/>|<w:br[^>]*/>|<w:footnoteReference w:id="(\d+)"/>|r:embed="(rId\d+)"', r):
            if m.group(1) is not None:
                txt += m.group(1).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
            elif m.group(2):
                fid = m.group(2)
                fns.append(fid)
                txt += "[%s]" % to_deva(fn_no[fid])
            elif m.group(3):
                figs.append(rels[m.group(3)])
            elif m.group(0).startswith("<w:tab"):
                txt += "\u0003"
            else:
                txt += "\n"
        if txt:
            pieces.append((it, bd, txt))
    return {"st": st.group(1) if st else "", "pieces": pieces, "figs": figs, "fns": fns}


def plain(par, tab=" "):
    return "".join(t for _, _, t in par["pieces"]).replace("\u0003", tab)


def inline_html(par, tab=" "):
    """the paragraph's runs -> HTML, italic / bold runs in their inline class; spaces collapsed, ends trimmed"""
    merged = []
    for it, bd, t in par["pieces"]:
        t = t.replace("\n", " ").replace("\u0003", tab)
        if merged and merged[-1][0] == (it, bd):
            merged[-1][1] += t
        else:
            merged.append([(it, bd), t])
    text = "".join(t for _, t in merged)
    lead = len(text) - len(text.lstrip("  "))
    out, pos = [], 0
    for (it, bd), t in merged:
        seg = t
        if pos < lead:                                       # trim leading space across runs
            cut = min(len(seg), lead - pos)
            seg = seg[cut:]
        pos += len(t)
        if not seg:
            continue
        seg = esc(seg)
        out.append('<span class="%s">%s</span>' % (FMT_CLASS[(it, bd)], seg) if (it or bd) and seg.strip() else seg)
    html = "".join(out)
    html = html.replace(" ", " ")
    html = re.sub(r" {2,}", " ", html)
    html = re.sub(r"(<span class=\"[^\"]+\">) +", r" \1", html)         # a space just inside a span's start goes outside
    html = re.sub(r" +(</span>)", r"\1 ", html)
    html = re.sub(r" {2,}", " ", html)
    return html.strip()


def read_docx(path):
    z = zipfile.ZipFile(path)
    d = z.read("word/document.xml").decode("utf8")
    body = d[d.index("<w:body>"):]
    rels = {}
    for m in re.finditer(r"<Relationship [^>]*>", z.read("word/_rels/document.xml.rels").decode()):
        i, t = re.search(r'Id="([^"]+)"', m.group(0)), re.search(r'Target="([^"]+)"', m.group(0))
        if i and t:
            rels[i.group(1)] = t.group(1)
    f = z.read("word/footnotes.xml").decode("utf8")
    notes, fn_no = {}, {}
    for m in re.finditer(r'<w:footnote [^>]*w:id="(\d+)"[^>]*>(.*?)</w:footnote>', f, re.S):
        paras = []
        for p in re.findall(r"<w:p[ >].*?</w:p>", m.group(2), re.S):
            s = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
            s = s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            if tidy(s):
                paras.append(tidy(s))
        if paras:
            notes[m.group(1)] = paras
            fn_no[m.group(1)] = len(fn_no) + 1
    items = []
    for m in re.finditer(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", body, re.S):
        s = m.group(0)
        if s.startswith("<w:tbl>"):
            rows = []
            for tr in re.findall(r"<w:tr[ >].*?</w:tr>", s, re.S):
                rows.append([tidy("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", tc))) for tc in re.findall(r"<w:tc>.*?</w:tc>", tr, re.S)])
            items.append({"table": rows})
        else:
            par = parse_par(s, rels, fn_no)
            par["pbb"] = "pageBreakBefore" in s
            items.append(par)
    return z, items, notes, fn_no


def is_hindi(t):
    return any(w in HINDI_WORDS for w in re.split(r"[\s,;:।॥()'\"‘’\-—]+", t))


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, items, notes, fn_no = read_docx(sys.argv[1])
    order = {v: k for k, v in fn_no.items()}

    IMG_DIR.mkdir(exist_ok=True)
    for old in IMG_DIR.glob("panini-shiksha-*"):
        if old.suffix != ".svg":                            # a hand-drawn SVG put in image/ replaces the scanned diagram of that number
            old.unlink()
    sign_crops()
    img_names, n_img = {}, 0

    pages, cur = [], None
    chap_no = 0
    section = ""
    stat = {"hindi_verse": 0, "running": 0, "sub": 0, "h2_normal": 0, "notes": 0, "tables": 0, "right": 0, "cite": 0}

    def new_page(top="&nbsp;"):
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % top]

    def add(cls, html, attrs=""):
        if section.startswith("परिशिष्ट (ग)"):                  # the two signs in this appendix's text are the SVG too, as in its table
            html = html.replace("\u1cf5", JIHVA_IMG).replace("\u1cf6", JIHVA_IMG)
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    # --- title page: the Title paragraph and the thirteen plain lines after it
    first_h = next(i for i, it in enumerate(items) if it.get("st") == "Heading1")
    tl = [tidy(plain(it)) for it in items[:first_h]]
    if tl[0] != NAME or len(tl) != 14:
        raise SystemExit("the title page is not what this script expects: %r" % tl)
    title = ['\n<div class="Basic-Graphics-Frame">\n', '\t\t\t<p class="cover-Book-Name">%s</p>\n' % NAME]
    title += ['\t\t\t<p class="cover-subtitle">%s</p>\n' % esc(x) for x in tl[1:4]]
    title += ['\t\t\t<p class="cover-Author-Name">%s</p>\n' % esc(x) for x in tl[4:10]]
    title += ['\t\t\t<p class="cover-Publisher-Note">%s</p>\n' % esc(x) for x in tl[10:14]]
    title.append("\t\t</div>\n")
    pages.append("".join(title))

    for it in items[first_h:]:
        if "table" in it:
            rows = it["table"]
            stat["tables"] += 1
            h = ['\t\t\t<table class="Samagri-Table">\n']
            for ri, row in enumerate(rows):
                h.append("\t\t\t\t<tr>" + "".join(
                    ('<th class="Samagri-Table-Head">%s</th>' if ri == 0 else '<td class="Samagri-Table-Cell-Center">%s</td>') % cell_html(c) for c in row) + "</tr>\n")
            h.append("\t\t\t</table>\n")
            cur.append("".join(h))
            continue
        st = it["st"]
        txt = tidy(plain(it).replace("\n", " "))
        for target in it["figs"]:
            if target not in img_names:
                n_img += 1
                if n_img in TEXT_FOR_IMAGE:                 # a scanned line of text, set as real text with its two signs as inline SVGs
                    img_names[target] = None
                    for cls, html in TEXT_FOR_IMAGE[n_img]:
                        add(cls, html)
                    continue
                if (IMG_DIR / ("panini-shiksha-%02d.svg" % n_img)).exists():
                    name = "panini-shiksha-%02d.svg" % n_img
                else:
                    blob, ext = bc.optimize_image(z.read("word/" + target), Path(target).suffix.lower(), 250 * 1024)
                    name = "panini-shiksha-%02d%s" % (n_img, ext)
                    write(IMG_DIR / name, blob)
                img_names[target] = name
            if img_names[target]:
                cur.append('\t\t\t<p class="Image"><span><img class="frame-1" src="image/%s" alt=""></span></p>\n' % img_names[target])
        if st == "Heading1":
            chap_no += 1
            section = txt
            new_page()
            add("Heading", esc(txt), ' id="Chapter_%d"' % chap_no)
            continue
        if it["pbb"] and cur is not None:
            new_page()                                      # a page of its own (the epigraph verses)
        if not txt:
            continue
        if re.fullmatch(r"%s\s*(/\s*[०-९0-9]+)?" % NAME, txt):
            stat["running"] += 1                            # the running title of a scanned page
            continue

        fn_here = it["fns"]
        if st == "Heading2":
            core = re.sub(r"[\s\-—~]+$", "", txt)
            if not section.startswith("अथ पाणिनीयशिक्षा") and len(core) <= 58 and not re.search(r"[।॥)]$|[।॥]", core):
                stat["sub"] += 1
                add("Sub-Heading", esc(core))
                continue
            stat["h2_normal"] += 1
            st = ""
        if st != "IndexEntry" and CITATION.fullmatch(txt):      # a source reference standing alone, "(ऋग्वेदप्रातिशाख्यम् १. ५२)": right aligned
            stat["cite"] += 1
            if st in ("Verse", "Quotation"):
                add("Shlok-Right", esc(txt))
            else:
                add("TXT-Right", inline_html(it))
            continue
        if st in ("Verse", "Quotation"):
            lines = [tidy(x) for x in plain(it).split("\n") if tidy(x)]
            for ln in lines:
                if is_hindi(ln):
                    stat["hindi_verse"] += 1
                    add("Normal", esc(ln))
                else:
                    add("Shlok", esc(ln))
        elif st == "IndexEntry":
            add("Normal", inline_html(it, " — "))
        elif txt in RIGHT_LINES or (txt.startswith("—") and len(txt) < 50):
            stat["right"] += 1
            add("TXT-Right", esc(txt))
        else:
            add("Normal", inline_html(it))
        for fid in fn_here:                                 # the notes of the footnotes cited in this paragraph, right after it
            for k, ptxt in enumerate(notes[fid]):
                stat["notes"] += 1
                add("Footnotes", esc(("[%s] " % to_deva(fn_no[fid]) if k == 0 else "") + ptxt))
    new_page()                                              # flush the last page

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
    if "\u0003" in out or "\u0001" in out:
        raise SystemExit("a Word marker is left")
    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")
    marks = len(re.findall(r"\[[०-९]+\]", out))
    if marks != 2 * len(notes):
        raise SystemExit("footnote marks %d, expected %d" % (marks, 2 * len(notes)))

    write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| chapters:", len(ids), "| images:", n_img, "| stats:", stat)

    d = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "",\n        "tikakar":  "%s",\n'
                 '        "translator":  "%s",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, TIKAKAR, TRANSLATOR, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_hanuman_ank.py -- one-off converter for the Kalyan special issue "श्रीहनुमान-अङ्क".

Source   : two raw extractions (calibre epub -> HTML) kept in backups/hanuman-ank-source/
             श्रीहनुमान-अङ्क.html                     the book (338 epub pages, endnotes at the back,
                                                        notes 199-216 missing)
             श्रीहनुमान-अङ्क_missing foot notes.html   the missing endnotes (199-222)
Styles   : the book's own stylesheet (block_N classes) is summarised in tools/hanuman_ank_styles.py;
           it decides which master.css class each paragraph gets.
Pictures : C:\\Users\\megha\\Downloads\\network-images\\श्रीहनुमान-अङ्क  (cover + the Kalyan emblem that
           opens each part; the two bracket images and the other small files are decoration only)
Output   : Gita Press Books/Gita Press Books/श्रीहनुमान-अङ्क.html in the project's book format
           (master.css classes, h1 -> Heading, section titles -> Sub-Heading, endnotes inline),
           image/hanuman-ank-emblem.jpg (<= 200 KB) and assets/covers/hanuman-ank.jpg.

Run:  python tools/build_hanuman_ank.py [--dry-run]
"""
import argparse
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import book_converter as bc            # optimize_image(), to_deva(), BOOK_TEMPLATE_HEAD
from hanuman_ank_styles import style

BOOKS_DIR = ROOT / "Gita Press Books" / "Gita Press Books"
IMAGE_DIR = BOOKS_DIR / "image"
COVERS_DIR = ROOT / "assets" / "covers"
BACKUP_DIR = ROOT / "backups" / "hanuman-ank-source"
DL = Path(r"C:\Users\megha\Downloads")
SRC_NAME = "श्रीहनुमान-अङ्क.html"
NOTES_NAME = "श्रीहनुमान-अङ्क_missing foot notes.html"
PICS_DIR = DL / "network-images" / "श्रीहनुमान-अङ्क"
COVER_FILE = "00001-image-00001.jpg"
EMBLEM_FILE = "00004-image-00004.jpg"
OUT_NAME = "श्रीहनुमान-अङ्क.html"
SLUG = "hanuman-ank"

ZW = "\u200c\u200d"
BOLD_SPANS = {1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 18, 20, 21, 24, 25, 27}
ITALIC_SPANS = {2, 7, 9, 18, 23, 27}


# ------------------------------------------------------------------ text helpers
def plain(h):
    s = re.sub(r"<[^>]+>", " ", h).replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", re.sub("[" + ZW + "]", "", s)).strip()


def _span(m):
    cls = re.search(r'class="(?:text_|calibre)(\d+)"', m.group(1))
    n = int(cls.group(1)) if cls else -1
    kind = "text" if "text_" in m.group(1) else "calibre"
    inner = m.group(2)
    if kind == "text":
        if n in ITALIC_SPANS:
            inner = "<i>" + inner + "</i>"
        if n in BOLD_SPANS:
            inner = "<b>" + inner + "</b>"
    return inner


def clean_inline(h):
    """Paragraph inner HTML -> tidy inline HTML: endnote markers become private-use tokens, emphasis
    spans become <b>/<i>, links/other spans are unwrapped, tabs become spaces; only b, i, sub, sup
    and br survive."""
    h = re.sub(r'<sup[^>]*>\s*<a[^>]*class="noteref"[^>]*>(\d+)</a>\s*</sup>',
               lambda m: "\ue000" + m.group(1) + "\ue001", h, flags=re.S)
    h = re.sub(r'<span[^>]*class="tab[^"]*"[^>]*>\s*</span>', " ", h)
    for _ in range(5):
        h = re.sub(r"<span([^>]*)>((?:(?!<span).)*?)</span>", _span, h, flags=re.S)
    h = re.sub(r"<a\b[^>]*>(.*?)</a>", r"\1", h, flags=re.S)
    h = re.sub(r"<b\b[^>]*>", "<b>", h)
    h = re.sub(r"<sup\b[^>]*>", "<sup>", h)
    h = re.sub(r"<br[^>]*>", "<br>", h)
    h = re.sub(r"<(?!/?(?:b|i|sub|sup|br)\b)[^>]+>", "", h)
    h = h.replace("&nbsp;", " ")
    h = re.sub(r"<b>\s*</b>|<i>\s*</i>", "", h)
    h = re.sub(r"</b>(\s*)<b>", r"\1", h)
    h = re.sub(r"</i>(\s*)<i>", r"\1", h)
    h = re.sub(r"\s*<br>\s*", "<br>", h)
    h = re.sub(r"[ \t\r\n]+", " ", h).strip()
    return h


def render(h):
    return re.sub("\ue000(\\d+)\ue001", lambda m: f"<sup>[{bc.to_deva(int(m.group(1)))}]</sup>", h)


def strip_markers(h):
    return re.sub("\ue000\\d+\ue001", "", h)


# ------------------------------------------------------------------ class -> master.css class
SEP_RE = re.compile(r"^[\s×*\-—•.]+$")
NUM_RE = re.compile(r"^[\(\[]?\s*[०-९0-9]+\s*[\)\]]?$")


def classify(cls, tag, text, html):
    """-> [(master.css class, html)] for a body paragraph ([] for spacers)."""
    if not text:
        return []
    a, b, sz, col = style(cls)
    if SEP_RE.match(text) and ("×" in text or "*" in text):
        return [("Bole", " ".join(ch for ch in text if ch in "×*"))]
    if tag == "h1" or cls == "block_2":
        return [("Heading", html)]
    if a == "c" and b and sz >= 1.5:
        if cls in ("block_119", "block_229"):
            return [("Sub-Heading", html)]
        if cls == "block_131":
            return [("Sub-Heading-2", html)]
        if cls in ("block_212", "block_213"):
            return [("Shlok-Number", html)]
        return [("Heading", html)]
    if a == "c" and b and sz > 1.0:                       # 1.25em bold centred
        if NUM_RE.match(text):
            return [("Shlok-Number", html)]
        if cls == "block_128":
            return [("Sub-Heading", html)]                # section titles inside an article
        return [("Bole", html)]                           # छप्पय / दोहा style labels
    if a == "f":
        if cls == "block_29":                             # <b>verse line</b> (source)
            m = re.match(r"\s*<b>(.*?)</b>\s*(.*)$", html, re.S)
            if m and plain(m.group(2)):
                return [("Shlok", m.group(1).strip()), ("Text-Right", m.group(2).strip())]
        return [("Shlok", html)]
    if a == "r":
        return [("Shlok-Right" if (b and col == "#840202") else "Text-Right", html)]
    if a == "c":
        if NUM_RE.match(text):
            return [("Shlok-Number", html)]
        if b:
            return [("Shlok" if col in ("#840202", "#54110A", "#F80000") else "Bole", html)]
        if col == "#840202":
            return [("Shlok", html)]
        if "उवाच" in text and len(text) < 40:
            return [("Uwach", html)]
        if text.startswith(("(", "॥")) or len(text) <= 70:
            return [("Bole", html)]
        return [("Uwach", html)]
    # justified / left
    if col == "#840202":
        return [("Shlok" if len(text) <= 200 else "Text", html)]
    if b and len(text) <= 10:
        return [("Bole", html)]
    return [("Text", html)]


def note_class(cls):
    a = style(cls)[0]
    return "Footnotes-Right" if a == "r" else ("Footnotes-Center" if a in ("c", "f") else "Footnotes")


# ------------------------------------------------------------------ pages / notes
def split_pages(src):
    return re.split(r'<hr class="page-break">', src)


def read_notes(pages):
    notes = {}
    for pg in pages:
        for m in re.finditer(r'<dl[^>]*id="note_(\d+)"[^>]*>(.*?)</dl>', pg, re.S):
            items = []
            for pm in re.finditer(r"<p\b([^>]*)>(.*?)</p>", m.group(2), re.S):
                t = clean_inline(pm.group(2))
                if plain(t):
                    c = (re.search(r'class="([^"]*)"', pm.group(1)) or [0, ""])[1].split()[0]
                    items.append((note_class(c), t))
            if items:
                notes[int(m.group(1))] = items
    return notes


def header_band_lines(block):
    """The issue banner (वर्ष ४९ ... संख्या १ ...) is a table of divs with two bracket images."""
    block = re.sub(r"<img[^>]*>", "", block)
    lines = [plain(x) for x in re.split(r"</?div[^>]*>|<br\s*/?>|</?t[dr][^>]*>", block)]
    return [x for x in lines if x]


def fix_header_band(pg):
    def sub(m):
        return "".join(f'<p class="__bole">{l}</p>' for l in header_band_lines(m.group(0)))
    return re.sub(r'<table class="table_">.*?</table>', sub, pg, flags=re.S)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    for n in (SRC_NAME, NOTES_NAME):
        if not (BACKUP_DIR / n).exists():
            shutil.copy2(DL / n, BACKUP_DIR / n)
    src = (BACKUP_DIR / SRC_NAME).read_text(encoding="utf-8", errors="ignore")
    extra = (BACKUP_DIR / NOTES_NAME).read_text(encoding="utf-8", errors="ignore")
    pages = split_pages(src)

    notes_start = next(i for i, p in enumerate(pages) if re.search(r"<h1[^>]*>\s*Notes\s*</h1>", p))
    body_pages = [p for i, p in enumerate(pages[1:notes_start], 1)
                  if 'class="list1"' not in p            # the book's own contents page (the reader has one)
                  and "block_1\"" not in p]               # the title page, rebuilt below as the cover

    # ---- endnotes: main file, plus the missing ones from the second file
    notes = read_notes(pages[notes_start:])
    extra_notes = read_notes(split_pages(extra))
    added, differing = [], []
    for k, v in extra_notes.items():
        if k not in notes:
            notes[k] = v
            added.append(k)
        elif [t for _, t in notes[k]] != [t for _, t in v]:
            differing.append(k)
    marker_ids = {int(x) for x in re.findall(r'class="noteref"[^>]*>(\d+)<', "".join(pages[1:notes_start]))}
    missing = sorted(marker_ids - set(notes))

    # ---- walk the pages, building reader sections
    sections = []
    cur = None
    pending = []
    kinds = {}
    verse_kinds = {"Shlok", "Shlok-Right", "Shlok-Number", "Bole", "Uwach", "Sub-Heading-2"}
    tok = re.compile(r"<img\b[^>]*>|<(?:p|h1)\b[^>]*>.*?</(?:p|h1)>", re.S)
    classes_seen = {}

    def flush_notes():
        nonlocal pending
        for n in pending:
            for i, (cls, t) in enumerate(notes.get(n, [])):
                text = (f"[{bc.to_deva(n)}] " + t) if i == 0 else t
                cur["items"].append((cls, text))
                kinds[cls] = kinds.get(cls, 0) + 1
        pending = []

    def start_section(pulled):
        nonlocal cur
        cur = {"items": list(pulled), "head": None}
        sections.append(cur)

    emblem_n = 0
    for pg in body_pages:
        pg = fix_header_band(pg)
        page_mark = (cur, len(cur["items"])) if cur is not None else None
        part_opener = False
        for m in tok.finditer(pg):
            piece = m.group(0)
            imgs = re.findall(r"<img\b[^>]*>", piece)
            for im in imgs:
                if "calibre18" in im:                       # the Kalyan emblem
                    if cur is None:
                        start_section([])
                    cur["items"].append(("Image", None))
                    emblem_n += 1
                    part_opener = True
            piece = re.sub(r"<img\b[^>]*>", "", piece)
            mm = re.match(r"<(p|h1)\b([^>]*)>(.*)</\1>", piece, re.S)
            if not mm:
                continue
            tag, attrs, inner = mm.groups()
            cls = (re.search(r'class="([^"]*)"', attrs) or [0, ""])[1].split()[0]
            html_in = clean_inline(inner)
            text = plain(strip_markers(html_in))
            if cls == "__bole":
                res = [("Bole", html_in)] if text else []
            elif cls == "block_":
                res = [("Page-Break", html_in)] if text else []
            else:
                res = classify(cls, tag, text, html_in)
            if text:
                classes_seen.setdefault(cls, res[0][0] if res else None)
            for kind, h in res:
                if kind == "Heading":
                    pulled = []
                    if cur is not None:
                        if part_opener and page_mark and page_mark[0] is cur:
                            pulled = cur["items"][page_mark[1]:]
                            del cur["items"][page_mark[1]:]
                        else:
                            while cur["items"] and cur["items"][-1][0] in ("Image", "Page-Break"):
                                pulled.insert(0, cur["items"].pop())
                    if pending and cur is not None:
                        flush_notes()
                    start_section(pulled)
                    cur["head"] = plain(strip_markers(h))
                    page_mark, part_opener = None, False
                elif cur is None:
                    start_section([])
                ids = [int(x) for x in re.findall("\ue000(\\d+)\ue001", h)]
                cur["items"].append((kind, h))
                kinds[kind] = kinds.get(kind, 0) + 1
                pending += ids
                if kind in ("Text", "Text-Right", "Heading", "Sub-Heading") or (kind not in verse_kinds and pending):
                    flush_notes()
    if pending:
        flush_notes()
    sections[:] = [s for s in sections if s["items"]]

    # ---- assemble HTML
    hn = 0
    out_sections = []
    for si, sec in enumerate(sections):
        lines = []
        for kind, val in sec["items"]:
            if kind == "Image":
                lines.append('\t\t\t<p class="TXT" style="text-align:center;text-indent:0;margin:1em 0">'
                             f'<img src="image/{SLUG}-emblem.jpg" alt="" '
                             'style="width:70%;min-width:240px;max-width:520px;height:auto"></p>')
            elif kind in ("Heading", "Sub-Heading"):
                hn += 1
                lines.append(f'\t\t\t<p id="toc_marker-{hn}" class="{kind}">{strip_markers(val)}</p>')
            elif kind == "Sub-Heading-2":
                lines.append(f'\t\t\t<p class="{kind}">{strip_markers(val)}</p>')
            else:
                lines.append(f'\t\t\t<p class="{kind}">{render(val)}</p>')
        out_sections.append(f'<section class="epub-page" data-page="{si + 2}">\n' + "\n".join(lines) + "\n</section>")

    cover = ('<section class="epub-page" data-page="1">\n<div>\n'
             '\t\t\t<p class="Titel-Page---Shri-Hari">॥ श्रीहरि:॥</p>\n'
             '\t\t\t<p class="Title-Page---Book-Name">श्रीहनुमान-अङ्क</p>\n'
             '\t\t\t<p class="Title-Page---Sub-Title">कल्याण — उनचासवें वर्षका विशेषाङ्क (परिशिष्टाङ्कसहित)</p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">&nbsp;</p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव माता च पिता त्वमेव   </p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव बन्धुश्च सखा त्वमेव। </p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव विद्या द्रविणं त्वमेव   </p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव सर्वं मम देवदेव॥</p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">&nbsp;</p>\n'
             '\t\t\t<p class="Title-Page---Publisher-Note para-style-override-2">गीता प्रेस के मूल ग्रंथ — '
             'सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।<span></span></p>\n\t\t</div>\n</section>')
    head = bc.BOOK_TEMPLATE_HEAD.format(title="श्रीहनुमान-अङ्क")
    html = head + "\n\n<hr class=\"page-break\">\n\n".join([cover] + out_sections) + "\n\n</body>\n</html>\n"

    # ---- report
    used_notes = sum(1 for s in sections for it in s["items"] if it[0].startswith("Footnotes") and it[1].startswith("["))
    print(f"source pages: {len(pages)} | content pages used: {len(body_pages)} | endnote pages from {notes_start}")
    print(f"reader sections: {len(sections)} (+ cover) | headings numbered (Heading + Sub-Heading): {hn} | emblems: {emblem_n}")
    print("paragraph classes written:", dict(sorted(kinds.items(), key=lambda x: -x[1])))
    print(f"notes in source: {len(notes)} (added from the missing-notes file: {len(added)}; "
          f"present in both but different text: {differing}) | footnote blocks placed inline: {used_notes}")
    print(f"note markers with no note text: {missing}")
    print(f"size: {len(html.encode('utf-8')) / 1024:.0f} KB")
    if args.dry_run:
        print("[dry-run] nothing written")
        return html, sections, classes_seen

    (BOOKS_DIR / OUT_NAME).write_text(html, encoding="utf-8")
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    eblob, _ = bc.optimize_image((PICS_DIR / EMBLEM_FILE).read_bytes(), ".jpg")
    (IMAGE_DIR / f"{SLUG}-emblem.jpg").write_bytes(eblob)
    cblob, _ = bc.optimize_image((PICS_DIR / COVER_FILE).read_bytes(), ".jpg")
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    (COVERS_DIR / f"{SLUG}.jpg").write_bytes(cblob)
    print(f"wrote emblem ({len(eblob) // 1024} KB) and cover ({len(cblob) // 1024} KB)")
    return html, sections, classes_seen


if __name__ == "__main__":
    main()

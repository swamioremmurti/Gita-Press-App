#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_bhakt_charitank.py -- one-off converter for the Kalyan special issue "भक्त-चरिताङ्क".

Source  : the raw extraction that was in the library as कल्याण_भक्त-चरिताङ्क.html (326 epub pages
          with its full calibre stylesheet and 159 <img> slots whose blob: addresses are dead).
          A copy is kept in backups/before-bhakt-charitank/ and used as the source, so this script
          can be re-run after the library file has been replaced.
Pictures: the 160 files captured from the reader (C:\\Users\\megha\\Downloads\\network-images\\
          bhakt_charitank), re-matched to the 159 slots by tools/bhakt_charitank_images.json
          (edit that file to correct a match, then re-run).
Output  : Gita Press Books/Gita Press Books/भक्त-चरिताङ्क.html in the project's book format
          (master.css classes, one reader page per story, endnotes moved inline), the pictures
          (each <= 200 KB) in the book image/ folder, the cover in assets/covers/, and a review
          page tools/bhakt_charitank_review.html showing every story next to its picture.

Run:  python tools/build_bhakt_charitank.py [--dry-run]
"""
import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import book_converter as bc   # optimize_image(), to_deva()

BOOKS_DIR = ROOT / "Gita Press Books" / "Gita Press Books"
IMAGE_DIR = BOOKS_DIR / "image"
COVERS_DIR = ROOT / "assets" / "covers"
BACKUP_DIR = ROOT / "backups" / "before-bhakt-charitank"
OLD_NAME = "कल्याण_भक्त-चरिताङ्क.html"
OUT_NAME = "भक्त-चरिताङ्क.html"
SRC_COPY = BACKUP_DIR / OLD_NAME
PICS_DIR = Path(r"C:\Users\megha\Downloads\network-images\bhakt_charitank")
MAP_FILE = HERE / "bhakt_charitank_images.json"
REVIEW_FILE = HERE / "bhakt_charitank_review.html"
SLUG = "bhakt-charitank"

FIRST_STORY_PAGE, FIRST_NOTE_PAGE = 2, 265     # page indexes in the source (0 cover, 1 contents)

ZW = "\u200c\u200d"


# ------------------------------------------------------------------ text helpers
def plain(h):
    s = re.sub(r"<[^>]+>", " ", h).replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", re.sub("[" + ZW + "]", "", s)).strip()


def clean_inline(h):
    """Paragraph inner HTML -> tidy inline HTML: footnote markers become <sup>[१]</sup>, links and
    spans are unwrapped (tab spans become a space), <b> kept, everything else dropped."""
    h = re.sub(r'<sup[^>]*>\s*<a[^>]*id="back_note_(\d+)"[^>]*>.*?</a>\s*</sup>',
               lambda m: "\ue000" + m.group(1) + "\ue001", h, flags=re.S)
    h = re.sub(r'<span[^>]*class="tab[^"]*"[^>]*>\s*</span>', " ", h)
    for _ in range(4):
        h = re.sub(r"<span[^>]*>((?:(?!<span).)*?)</span>", r"\1", h, flags=re.S)
    h = re.sub(r"<a\b[^>]*>(.*?)</a>", r"\1", h, flags=re.S)
    h = re.sub(r"<b\b[^>]*>", "<b>", h)
    h = re.sub(r"<b>\s*</b>", "", h)
    h = re.sub(r"</b>(\s*)<b>", r"\1", h)
    h = re.sub(r"<br[^>]*>", "<br>", h)
    h = re.sub(r"<(?!/?(?:b|br)\b)[^>]+>", "", h)
    h = re.sub(r"[ \t\r\n]+", " ", h).strip()
    return h


def render(h):
    return re.sub("\ue000(\\d+)\ue001", lambda m: f"<sup>[{bc.to_deva(int(m.group(1)))}]</sup>", h)


# ------------------------------------------------------------------ class -> master.css class
def parse_css(css):
    defs = {}
    for m in re.finditer(r"\.([A-Za-z_0-9]+)\s*\{([^}]*)\}", css):
        defs.setdefault(m.group(1), m.group(2))
    return defs


def props(defs, cls):
    d = defs.get(cls, "")
    g = lambda k: (re.search(r"(?<![-\w])" + k + r"\s*:\s*([^;]+)", d) or [None, ""])[1].strip()
    sz = g("font-size")
    return {"align": g("text-align"), "weight": g("font-weight"), "style": g("font-style"),
            "color": g("color").upper(), "size": float(sz[:-2]) if sz.endswith("em") else 1.0}


# explicit decisions for the classes whose job is clear from the content
EXPLICIT = {
    "block_": "Page-Break",        # "॥ श्रीहरि:॥" above the foreword
    "block_35": "Heading",         # श्रीनारदीयभक्तिसूत्राणि / श्रीशाण्डिलीयभक्तिसूत्राणि (small centred title)
}


def classify(defs, cls, text):
    """-> master.css class for a paragraph, or None when it is just an empty spacer."""
    if not text:
        return None
    if cls in EXPLICIT:
        return EXPLICIT[cls]
    p = props(defs, cls)
    if p["align"] == "center" and p["weight"] == "bold" and p["size"] >= 1.5 and len(text) < 90:
        return "Heading"                                   # story titles, foreword, aarti, sutra titles
    if p["align"] == "right":
        return "Text-Right"                                # sources, signatures
    if p["align"] == "center":
        if p["style"] == "italic":
            return "Uwach"
        if p["color"] == "#54110A":
            return "Shlok"                                 # the book's verse colour
        return "Bole"                                      # captions, sub-labels, black verse lines
    if p["color"] == "#54110A":
        return "Shlok"                                     # justified bold sutra lines
    if p["color"] == "#716F13":
        return "Footnotes"
    return "Text"


# ------------------------------------------------------------------ picture matching
def sorted_pictures():
    def key(n):
        m = re.match(r"(\d+)-image-\d+(?: \((\d+)\))?\.(\w+)", n)
        return (int(m.group(1)), int(m.group(2) or 0)) if m else (10 ** 6, 0)
    return sorted(os.listdir(PICS_DIR), key=key)


def default_mapping(files, n_slots):
    """Slot -> file. The captured files keep the book's order but shifted: file i belongs to
    story i+1 from story 10 onward (story 9, भक्त राजा सुरथ, has no picture), with a few local
    swaps found by looking at the pictures. File 0 is the cover; the last file is the cover of
    a different book (महात्मा विदुर) and is not used."""
    pic = [f for f in files if not f.startswith("महात्मा")]
    slot_to_idx = {}
    for s in range(1, n_slots + 1):
        if s <= 8:
            slot_to_idx[s] = s
        elif s == 9:
            continue
        else:
            slot_to_idx[s] = s - 1
    slot_to_idx[1], slot_to_idx[2] = 2, 1                  # Krishna invocation / Narada sutras
    slot_to_idx[43], slot_to_idx[44] = 43, 42              # Tukaram / Samarth Ramdas (swapped)
    slot_to_idx[127], slot_to_idx[128] = 127, 126          # Gopinathacharya (Manas placard) / Sarayudas
    return {str(s): pic[i] for s, i in slot_to_idx.items() if i < len(pic)}, pic[0]


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    if not SRC_COPY.exists():
        shutil.copy2(BOOKS_DIR / OLD_NAME, SRC_COPY)
    src = SRC_COPY.read_text(encoding="utf-8", errors="ignore")
    defs = parse_css("\n".join(re.findall(r"<style[^>]*>(.*?)</style>", src, re.S)))
    pages = re.split(r'<hr class="page-break">', src)

    # ---- pictures -> slots
    files = sorted_pictures()
    n_slots = len(re.findall(r"<img\b", src))
    default, cover_file = default_mapping(files, n_slots)
    if MAP_FILE.exists():
        mp = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    else:
        mp = {"note": "slot number (1 = first picture in the book) -> file in " + str(PICS_DIR) +
                      ". Slots left out have no picture. Edit and re-run build_bhakt_charitank.py.",
              "cover": cover_file, "slots": default}
        if not args.dry_run:
            MAP_FILE.write_text(json.dumps(mp, ensure_ascii=False, indent=1), encoding="utf-8")
    slot_file = mp["slots"]

    # ---- footnote texts (the "Notes" pages at the end)
    notes = {}
    for pg in pages[FIRST_NOTE_PAGE:]:
        m = re.search(r'<dl[^>]*id="note_(\d+)"', pg)   # kept as TEXT: "011" and "11" are different notes
        if not m:
            continue
        items = []
        for pm in re.finditer(r"<p\b([^>]*)>(.*?)</p>", pg[m.start():], re.S):
            t = clean_inline(pm.group(2))
            if plain(t):
                c = (re.search(r'class="([^"]*)"', pm.group(1)) or [0, ""])[1].split()[0] if 'class="' in pm.group(1) else ""
                items.append((c, t))
        if items:
            notes[m.group(1)] = items

    marker_ids = set(re.findall(r'id="back_note_(\d+)"', "".join(pages[FIRST_STORY_PAGE:FIRST_NOTE_PAGE])))
    orphan_notes = set(notes) - marker_ids

    # ---- walk the story pages, building sections
    sections = []          # {"items": [(kind, html_or_text, note_ids)], "head": str}
    cur = None
    slot = 0
    unknown = {}
    pending_notes = []
    kinds = {}
    verse_kinds = {"Shlok", "Bole", "Uwach"}
    tok = re.compile(r"<img\b[^>]*>|<p\b[^>]*>.*?</p>", re.S)

    def flush_notes():
        nonlocal pending_notes
        for n in pending_notes:
            for i, (c, t) in enumerate(notes.get(n, [])):
                cls = "Footnotes-Right" if props(defs, c)["align"] == "right" else (
                      "Footnotes-Center" if props(defs, c)["align"] == "center" else "Footnotes")
                text = (f"[{bc.to_deva(int(n))}] " + t) if i == 0 else t
                cur["items"].append((cls, text, None))
                kinds[cls] = kinds.get(cls, 0) + 1
        pending_notes = []

    def start_section(pulled):
        nonlocal cur
        cur = {"items": list(pulled), "head": None}
        sections.append(cur)

    for pi in range(FIRST_STORY_PAGE, FIRST_NOTE_PAGE):
        for m in tok.finditer(pages[pi]):
            piece = m.group(0)
            # every picture sits inside a <p> wrapper: handle the picture(s) first, then the text
            for _img in re.findall(r"<img\b[^>]*>", piece):
                slot += 1
                f = slot_file.get(str(slot))
                if f is not None and cur is not None:
                    cur["items"].append(("Image", slot, None))
                elif f is not None:
                    cur = {"items": [("Image", slot, None)], "head": None}
                    sections.append(cur)
            piece = re.sub(r"<img\b[^>]*>", "", piece)
            attrs, inner = re.match(r"<p\b([^>]*)>(.*)</p>", piece, re.S).groups()
            cls = (re.search(r'class="([^"]*)"', attrs) or [0, ""])[1].split()[0]
            html_in = clean_inline(inner)
            text = plain(re.sub("\ue000\\d+\ue001", "", html_in))
            kind = classify(defs, cls, text)
            if kind is None:
                continue
            # one note's marker lost its <sup> formatting and survives only as a trailing "51" on
            # a heading: strip it and attach that note under the heading instead
            if kind == "Heading":
                om = re.search(r"(\d{1,3})$", text)
                if om and om.group(1) in orphan_notes:
                    html_in = re.sub(om.group(1) + r"\s*$", "", html_in).rstrip()
                    text = text[: -len(om.group(1))].rstrip()
                    html_in += "" + om.group(1) + ""
            if kind == "Heading":
                if text in ("भक्त-वाणी", "भक्त वाणी"):
                    kind = "Sub-Heading"                   # a section inside a story, not a new page
            if kind == "Heading":
                # a picture / invocation line just above a title belongs to that title's page
                pulled = []
                if cur is not None:
                    while cur["items"] and cur["items"][-1][0] in ("Image", "Page-Break"):
                        pulled.insert(0, cur["items"].pop())
                if pending_notes and cur is not None:
                    flush_notes()
                start_section(pulled)
                cur["head"] = text
            elif cur is None:
                start_section([])
            ids = re.findall("\ue000(\\d+)\ue001", html_in)
            cur["items"].append((kind, html_in, None))
            kinds[kind] = kinds.get(kind, 0) + 1
            pending_notes += ids
            if kind in ("Text", "Text-Right", "Footnotes", "Heading", "Sub-Heading") or (
                    kind not in verse_kinds and pending_notes):
                flush_notes()
            unknown.setdefault(cls, kind)
    if pending_notes:
        flush_notes()
    sections[:] = [s for s in sections if s["items"]]      # drop sections that only held spacers

    # ---- number headings, assemble HTML
    hn = 0
    out_sections = []
    toc_ids = {}
    for si, sec in enumerate(sections):
        lines = []
        for kind, val, _ in sec["items"]:
            if kind == "Image":
                f = slot_file[str(val)]
                lines.append(f'\t\t\t<p class="TXT" style="text-align:center;text-indent:0;margin:1em 0">'
                             f'<img src="image/{SLUG}-{val:03d}.jpg" alt="" '
                             f'style="width:{WIDTH.get(val, 45)}%;min-width:240px;max-width:100%;height:auto"></p>')
            elif kind in ("Heading", "Sub-Heading"):
                hn += 1
                title = re.sub("\\d+", "", val)     # a note marker never stays in a title
                lines.append(f'\t\t\t<p id="toc_marker-{hn}" class="{kind}">{title}</p>')
            else:
                lines.append(f'\t\t\t<p class="{kind}">{render(val)}</p>')
        out_sections.append(f'<section class="epub-page" data-page="{si + 2}">\n' + "\n".join(lines) + "\n</section>")

    cover = ('<section class="epub-page" data-page="1">\n<div>\n'
             '\t\t\t<p class="Titel-Page---Shri-Hari">॥ श्रीहरि:॥</p>\n'
             '\t\t\t<p class="Title-Page---Book-Name">भक्त-चरिताङ्क</p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">&nbsp;</p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव माता च पिता त्वमेव   </p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव बन्धुश्च सखा त्वमेव। </p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव विद्या द्रविणं त्वमेव   </p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">त्वमेव सर्वं मम देवदेव॥</p>\n'
             '\t\t\t<p class="Title-Page---Tvamev-mata">&nbsp;</p>\n'
             '\t\t\t<p class="Title-Page---Publisher-Note para-style-override-2">गीता प्रेस के मूल ग्रंथ — '
             'सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।<span></span></p>\n\t\t</div>\n</section>')
    head = bc.BOOK_TEMPLATE_HEAD.format(title="भक्त-चरिताङ्क")
    html = head + "\n\n<hr class=\"page-break\">\n\n".join([cover] + out_sections) + "\n\n</body>\n</html>\n"

    # ---- report
    placed = sorted(int(v) for k, kd, _ in [it for s in sections for it in s["items"]] if k == "Image" for v in [kd])
    heads = sum(1 for s in sections if s["head"])
    print(f"slots in book: {n_slots} | pictures placed: {len(placed)} | slots without a picture: "
          f"{[s for s in range(1, n_slots + 1) if str(s) not in slot_file]}")
    print(f"reader pages (sections): {len(sections)} (+ cover) | headings numbered: {hn} | notes in source: {len(notes)}")
    print("paragraph classes written:", dict(sorted(kinds.items(), key=lambda x: -x[1])))
    used_notes = sum(1 for s in sections for it in s["items"] if it[0].startswith("Footnotes") and str(it[1]).startswith("["))
    print(f"footnote blocks placed inline: {used_notes} of {len(notes)}")
    print(f"size: {len(html.encode('utf-8')) / 1024:.0f} KB")
    if args.dry_run:
        print("[dry-run] nothing written")
        return html, sections, slot_file, files, mp

    # ---- write book, pictures, cover, review page
    (BOOKS_DIR / OUT_NAME).write_text(html, encoding="utf-8")
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    sizes = []
    for s in placed:
        blob = (PICS_DIR / slot_file[str(s)]).read_bytes()
        blob, ext = bc.optimize_image(blob, ".jpg")
        (IMAGE_DIR / f"{SLUG}-{s:03d}.jpg").write_bytes(blob)
        sizes.append(len(blob))
    cblob, _ = bc.optimize_image((PICS_DIR / mp["cover"]).read_bytes(), ".jpg")
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    (COVERS_DIR / f"{SLUG}.jpg").write_bytes(cblob)
    print(f"wrote {len(placed)} pictures (max {max(sizes) // 1024} KB, total {sum(sizes) / 1048576:.1f} MB) and the cover ({len(cblob) // 1024} KB)")
    write_review(sections, slot_file)
    return html, sections, slot_file, files, mp


WIDTH = {}   # slot -> display width %, filled from the source stylesheet below


def write_review(sections, slot_file):
    rows = []
    cur_title = ""
    for s in sections:
        if s["head"]:
            cur_title = s["head"]
        for kind, val, _ in s["items"]:
            if kind == "Image":
                rows.append((val, cur_title))
    cells = "".join(
        f'<figure><img loading="lazy" src="../Gita Press Books/Gita Press Books/image/{SLUG}-{n:03d}.jpg">'
        f'<figcaption><b>{n}</b> {t}</figcaption></figure>' for n, t in rows)
    REVIEW_FILE.write_text(
        '<!doctype html><meta charset="utf-8"><title>भक्त-चरिताङ्क — picture check</title>'
        '<style>body{font-family:sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}'
        'figure{margin:0;text-align:center}img{width:100%;height:230px;object-fit:contain;background:#f4efe6}figcaption{font-size:13px;margin-top:4px}</style>'
        '<h2>Does each picture match the story named under it? (number = picture slot)</h2><div class="g">' + cells + '</div>',
        encoding="utf-8")
    print("review page:", REVIEW_FILE)


if __name__ == "__main__":
    # display widths come from each <img>'s calibre class in the source stylesheet
    _src = (SRC_COPY if SRC_COPY.exists() else BOOKS_DIR / OLD_NAME).read_text(encoding="utf-8", errors="ignore")
    _defs = parse_css("\n".join(re.findall(r"<style[^>]*>(.*?)</style>", _src, re.S)))
    for _i, _m in enumerate(re.finditer(r'<img[^>]*class="([^"]*)"', _src), 1):
        _w = re.search(r"width:\s*([\d.]+)%", _defs.get(_m.group(1).split()[0], ""))
        WIDTH[_i] = int(float(_w.group(1))) if _w else 45
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_tattvavivechani_padachhed.py -- turn the gitapress.org EPUB extract of
"श्रीमद्भगवद्गीता : तत्त्वविवेचनी हिन्दी-टीका (पदच्छेद, अन्वयसहित)" into the library's book-HTML format.

Source : "Extracted Book (4).html"  (one <section class="epub-page"> per EPUB page, classes block_N)
Output : Gita Press Books/Gita Press Books/श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html

What it does
  * drops the book's own विषय-सूची page (the reader has its own contents drawer)
  * one <p class="Heading"> per section / अध्याय; inside an अध्याय every shloka (or shloka-group such as
    ४-६) is its own <p class="Sub-Heading">श्लोक N</p>, which the reader lists as a sub-chapter.
    A shloka's own सम्बन्ध— paragraph(s), the speaker line (X उवाच), the verse, its पदच्छेद, the
    word-meaning table, the translation and the प्रश्न/उत्तर commentary all stay together under it.
  * turns the word-meaning tables into one पदच्छेद paragraph (as the existing पदच्छेद book does)
  * footnotes (EPUB "Notes") move to sit right under the paragraph that cites them
  * the three pictures that matter are inlined as SVG (tables) or saved as small webp files

Usage:  python tools/build_tattvavivechani_padachhed.py [--src PATH] [--dry-run]
"""
import argparse
import html as htmlmod
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
OUT_NAME = "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html"
DEFAULT_SRC = Path(r"C:\Users\megha\Downloads\Extracted Book (4).html")
NET_IMAGES = Path(r"C:\Users\megha\Downloads\network-images")
SVG_NIRAKAR = NET_IMAGES / "00040-image-00040.svg"          # निराकार / निराकार-साकार / साकार table
SVG_SHLOK = NET_IMAGES / "00040-image-00040 (1).svg"        # अं० श्लोक table
TITLE_IMG = "image/tv-padachhed-title.webp"
NIVEDAN_IMG = "image/tv-padachhed-hastlikhit-nivedan.webp"
BOOK_TITLE = "श्रीमद्भगवद्गीता तत्त्वविवेचनी (पदच्छेद-अन्वयसहित)"

DEVA = "०१२३४५६७८९"


def deva(n):
    return "".join(DEVA[int(c)] for c in str(n))


def undeva(s):
    return int("".join(str(DEVA.index(c)) for c in s))


# ------------------------------------------------------------------ reading -
BLOCK_RE = re.compile(r'<(table|ul|ol|dl)\b[^>]*>.*?</\1>|<(p|h[1-6]|div|blockquote)\b[^>]*>.*?</\2>', re.S)


class Blk:
    __slots__ = ("tag", "cls", "html", "text", "page", "out_cls")

    def __init__(self, html, page):
        self.html = html
        self.page = page
        self.tag = re.match(r"<(\w+)", html).group(1)
        m = re.match(r'<\w+[^>]*\bclass="([^"]*)"', html)
        self.cls = m.group(1) if m else ""
        t = re.sub(r"<sup\b[^>]*>.*?</sup>", "", html, flags=re.S)       # footnote refs are not text
        t = re.sub(r"<[^>]+>", "", t)
        t = htmlmod.unescape(t).replace("\xa0", " ")
        self.text = re.sub(r"\s+", " ", t).strip()
        self.out_cls = None


def read_blocks(src):
    s = Path(src).read_text(encoding="utf-8")
    body = s[s.index("<body>") + 6:]
    pages = re.split(r'\s*<hr class="page-break">\s*', body)
    out = []
    for pi, p in enumerate(pages):
        p = re.sub(r"^\s*<section[^>]*>", "", p.strip())
        p = re.sub(r"</section>\s*$", "", p)
        for m in BLOCK_RE.finditer(p):
            out.append(Blk(m.group(0), pi))
    return out


# ----------------------------------------------------------- inline cleaning -
def inner_html(b):
    m = re.match(r"<\w+[^>]*>(.*)</\w+>\s*$", b.html, re.S)
    return m.group(1) if m else b.html


def clean_inline(h):
    """Keep <b>/<i>/<sup>/<br>; drop spans, links, classes, tabs, images. Footnote refs become \x01N\x02 markers."""
    h = re.sub(r'<sup[^>]*>\s*<a[^>]*class="noteref"[^>]*>\s*(\d+)\s*</a>\s*</sup>', lambda m: "\x01" + m.group(1) + "\x02", h)
    h = re.sub(r'<span[^>]*class="tab1?"[^>]*>.*?</span>', " ", h, flags=re.S)
    h = re.sub(r"<img\b[^>]*>", "", h)
    h = re.sub(r"</?a\b[^>]*>", "", h)
    h = re.sub(r"</?span\b[^>]*>", "", h)
    h = re.sub(r"<br\b[^>]*>", " ", h)                      # the EPUB's page-break <br>s fall mid-sentence
    h = re.sub(r"<(b|i|sup|sub)\b[^>]*>", r"<\1>", h)
    h = h.replace("\xa0", " ").replace("&nbsp;", " ")
    h = re.sub(r"[ \t\r\n]+", " ", h)
    h = re.sub(r"</b>\s*<b>", " ", h)
    h = re.sub(r"</i>\s*<i>", " ", h)
    h = re.sub(r"<(b|i)>\s*</\1>", "", h)
    h = re.sub(r"\s+(</(?:b|i)>)", r"\1 ", h)
    return re.sub(r"\s+", " ", h).strip()


def plain(h):
    return re.sub(r"\s+", " ", htmlmod.unescape(re.sub(r"<[^>]+>", "", h)).replace("\x01", "").replace("\x02", "")).strip()


# -------------------------------------------------------------- footnotes ----
def collect_notes(blocks):
    notes = {}
    rest = []
    for b in blocks:
        if b.tag == "dl" and "footnote" in b.cls:
            n = int(re.search(r'id="note_(\d+)"', b.html).group(1))
            paras = []
            for m in re.finditer(r"<p\b[^>]*>(.*?)</p>", b.html, re.S):
                t = clean_inline(m.group(1))
                if plain(t):
                    paras.append(t)
            notes[n] = paras
        elif b.tag == "h2" and b.text == "Notes":
            continue
        else:
            rest.append(b)
    return notes, rest


# ----------------------------------------------------------- word tables -----
def table_to_padachhed(b):
    """Word-meaning table -> one paragraph: <b>word</b> = meaning, ... (column by column, top to bottom)."""
    items = []
    for td in re.finditer(r"<td\b[^>]*>(.*?)</td>", b.html, re.S):
        for p in re.finditer(r"<p\b[^>]*>(.*?)</p>", td.group(1), re.S):
            t = clean_inline(p.group(1))
            t = re.sub(r"</?b>|</?i>", "", t)
            t = t.strip()
            if not plain(t):
                continue
            if "=" in t:
                w, m = t.split("=", 1)
                items.append((w.strip(), m.strip()))
            else:
                items.append((t, ""))
    parts = []
    for i, (w, m) in enumerate(items):
        seg = "<b>%s</b> = %s" % (w, '<span class="pm">%s</span>' % m if m else "")
        if i < len(items) - 1 and not re.search(r"[,;]$", plain(m)):
            seg += ","
        parts.append(seg)
    return " ".join(parts)


# source (EPUB) paragraph classes that mean something on their own, found by reading the extract:
VERSE_CLS = {"block_27", "block_88", "block_89", "block_102", "block_65", "block_106", "block_107"}   # quoted verses / Hindi couplets
RIGHT_CLS = {"block_30", "block_64", "block_98", "block_92", "block_128"}                              # "(महा०, भीष्म० ४३। १)" source lines
CENTER_CLS = {"block_85", "block_90", "block_109", "block_80", "block_67", "block_4", "block_17", "block_41", "block_61"}  # पुष्पिका, ॐ lines

# ------------------------------------------------------------ patterns ------
MARK_RE = re.compile(r"॥\s*([०-९]+(?:\s*[-–—]\s*[०-९]+)?)\s*॥?\s*$")
SPEAKER_RE = re.compile(r"^(?:[\w\u0900-\u097F:]+\s+)?[\w\u0900-\u097F:]*उवाच\s*$|^श्रीभगवानुवाच$")


def mark_of(b):
    if b.tag != "p":
        return None
    m = MARK_RE.search(b.text)
    return m.group(1) if m else None


def is_speaker(b):
    return b.tag == "p" and len(b.text) < 45 and "उवाच" in b.text and not b.text.startswith("सम्बन्ध")


def is_sambandh(b):
    return b.tag == "p" and b.text.startswith("सम्बन्ध")


def is_qa(b):
    return b.tag == "p" and re.match(r"^(प्रश्न|उत्तर)\s*—", b.text) is not None


def is_word_table(b):
    return b.tag == "table" and "=" in b.text


# ------------------------------------------------------------ the build -----
class Report:
    def __init__(self):
        self.lines = []

    def warn(self, msg):
        self.lines.append(msg)


MARK_ANY = re.compile(r"॥\s*([०-९]+)\s*॥?")


def is_pad_line(b):
    """पदच्छेद lines are comma-separated words (the verse lines themselves carry no commas)."""
    return b.tag == "p" and ("," in b.text) and not is_sambandh(b) and not is_qa(b) and not is_speaker(b)


def is_loose_word(b):
    """A 'word = meaning' fragment the EPUB left outside its table."""
    return b.tag == "p" and "=" in b.text and len(b.text) < 100 and not is_qa(b) and not is_sambandh(b)


def marks_in(lines):
    out = []
    for b in lines:
        for m in MARK_ANY.finditer(b.text):
            out.append(undeva(m.group(1)))
    return out


def locate_units(chap, rep, label):
    """chap: list of Blk (after the chapter's h1). Returns one dict per word-meaning table (group of tables)."""
    units = []
    prev_tail = 0
    n = len(chap)
    i = 0
    prev_last = 0
    while i < n:
        if not is_word_table(chap[i]) or i < prev_tail:
            i += 1
            continue
        grp = [i]
        j = i + 1
        while j < n and (is_word_table(chap[j]) or is_loose_word(chap[j])):
            grp.append(j)
            j += 1
        t0, t_last = grp[0], grp[-1]
        # --- पदच्छेद lines directly above the table
        k = t0 - 1
        # the line touching the table is always a पदच्छेद line (it may be a single word, so no comma)
        if k >= prev_tail and chap[k].tag == "p" and not is_sambandh(chap[k]) and not is_qa(chap[k]):
            k -= 1
        while k >= prev_tail and is_pad_line(chap[k]):
            k -= 1
        pad_start = k + 1
        if pad_start == t0:
            rep.warn("%s: table #%d has no पदच्छेद lines above it: %r" % (label, t0, chap[t0 - 1].text[:60]))
            i = j
            continue
        n_pad = t0 - pad_start
        # --- the verse lines above them: same class, same kind of paragraph
        e = pad_start - 1
        star = None
        if e >= prev_tail and chap[e].tag == "p" and chap[e].text.startswith("*"):
            star = e                     # a "* ..." parallel passage printed between the verse and its पदच्छेद
            e -= 1
        if e < prev_tail or chap[e].tag != "p":
            rep.warn("%s: table #%d has no verse lines above its पदच्छेद" % (label, t0))
            i = j
            continue
        cls = chap[e].cls
        s0 = e
        def verse_line(x):
            return chap[x].tag == "p" and chap[x].cls == cls and not is_speaker(chap[x]) and not is_sambandh(chap[x]) and not is_qa(chap[x])
        while s0 - 1 >= prev_tail and (e - s0 + 1) < n_pad + 2:
            if verse_line(s0 - 1):
                s0 -= 1
            elif is_speaker(chap[s0 - 1]) and s0 - 2 >= prev_tail and verse_line(s0 - 2):
                s0 -= 1                      # "अर्जुन उवाच" standing between two verses of one group
            else:
                break
        if (e - s0 + 1) >= n_pad + 2:
            rep.warn("%s: table #%d: %d verse lines vs %d पदच्छेद lines (check)" % (label, t0, e - s0 + 1, n_pad))
        # --- verse numbers this unit touches
        vm = marks_in(chap[s0:e + 1]) or marks_in(chap[pad_start:t0])
        if vm:
            first, last = min(vm), max(vm)
            if not MARK_ANY.search(chap[e].text):      # the last line is the opening of the next verse
                last += 1
        else:
            first = last = prev_last + 1
            rep.warn("%s: table #%d has no verse numbers; assumed %d" % (label, t0, first))
        prev_last = last
        # --- speaker line and सम्बन्ध— paragraph(s) above the verse
        sp = s0 - 1 if s0 - 1 >= prev_tail and is_speaker(chap[s0 - 1]) else None
        head_from = sp if sp is not None else s0
        u0 = head_from
        q = None
        for y in range(head_from - 1, prev_tail - 1, -1):
            if is_sambandh(chap[y]):
                q = y
                break
        if q is not None:
            between = chap[q + 1:head_from]
            if all(b.tag == "p" and not is_qa(b) for b in between):
                u0 = q
            else:
                rep.warn("%s: सम्बन्ध (+%d) is separated from श्लोक %d by commentary; left in the previous unit" % (label, q, first))
        units.append(dict(u0=u0, sp=sp, s0=s0, k=e, star=star, pad=(pad_start, t0 if star is None else t0), t=t0, grp=grp,
                          first=deva(first), last=deva(last), nums=(first, last)))
        prev_tail = t_last + 2         # the translation paragraph follows the table(s)
        i = j
    return units


def loose_to_padachhed(b):
    t = plain(clean_inline(inner_html(b)))
    w, m = t.split("=", 1)
    return "<b>%s</b> = %s" % (w.strip(), '<span class="pm">%s</span>' % m.strip())


def build(src, dry=False):
    rep = Report()
    blocks = read_blocks(src)
    notes, blocks = collect_notes(blocks)

    # drop the cover (svg wrapper) and the book's own contents page
    toc_pages = {b.page for b in blocks if "विषय-सूची" in b.text and b.cls == "block_18"}
    blocks = [b for b in blocks if b.page not in toc_pages and b.tag != "div"]

    def find(text, cls=None, start=0, tag=None):
        for i in range(start, len(blocks)):
            b = blocks[i]
            if b.text == text and (cls is None or b.cls == cls) and (tag is None or b.tag == tag):
                return i
        raise SystemExit("not found: " + text)

    # ---- anchors --------------------------------------------------------------------------
    i_title_end = find("जयदयाल गोयन्दका", "block_9")
    i_nivedan = find("निवेदन", "block_11")
    i_namra = find("नम्र निवेदन", "block_25")
    chap_idx = [i for i, b in enumerate(blocks) if b.tag == "h1" and re.search(r"ऽध्याय:?$|^अथाष्टमोऽध्याय", b.text)]
    if len(chap_idx) != 18:
        raise SystemExit("expected 18 chapter headings, found %d" % len(chap_idx))
    i_mbh = find("महाभारतमें श्रीगीताजीका माहात्म्य", tag="h1")

    html_parts = []          # finished <section> strings
    state = {"K": 0, "m": 0, "j": 0, "used_notes": set()}

    # ------------------------------------------------------------------ rendering ---------
    def P(cls, inner, extra=""):
        return '<p%s class="%s">%s</p>' % (extra, cls, inner)

    def resolve_notes(inner, heading=False):
        """Replace \x01N\x02 markers; returns (inner_html, [note paragraphs])."""
        found = []

        def sub(m):
            n = int(m.group(1))
            found.append(n)
            return "" if heading else "<sup>[%s]</sup>" % deva(n)
        inner = re.sub(r"\x01(\d+)\x02", sub, inner)
        out = []
        for n in found:
            if n in state["used_notes"]:
                continue
            state["used_notes"].add(n)
            paras = notes.get(n)
            if not paras:
                rep.warn("note %d cited but missing" % n)
                continue
            for pi, t in enumerate(paras):
                label = "" if heading else ("<b>[%s]</b> " % deva(n) if pi == 0 else "")
                out.append(P("Footnotes", label + t))
        return inner, out

    def emit(cls, inner, heading=False, extra=""):
        inner, fn = resolve_notes(inner, heading)
        return [P(cls, inner, extra)] + fn

    def heading(text, level="Heading"):
        """level: Heading | Sub-Heading | Sub-Heading-2. Returns the <p> with its anchor id."""
        if level == "Heading":
            state["K"] += 1
            state["m"] = 0
            state["j"] = 0
            hid = "Chapter_%d" % state["K"]
        elif level == "Sub-Heading":
            state["m"] += 1
            state["j"] = 0
            hid = "Chapter_%d_%d" % (state["K"], state["m"])
        else:
            state["j"] += 1
            hid = "Chapter_%d_%d_%d" % (state["K"], state["m"], state["j"])
        return hid

    section = None

    def open_section(title, first=False):
        nonlocal section
        if section is not None:
            html_parts.append(section)
        section = []

    def add(lines):
        section.extend(lines)

    def add_heading(text_html, level):
        inner, fn = resolve_notes(text_html, heading=True)
        hid = heading(plain(inner), level)
        add(['<p id="%s" class="%s">%s</p>' % (hid, level, inner)] + fn)

    # ---- generic block -> paragraph (outside the verse header) -------------------------------
    verse_classes = set()        # source classes seen carrying shloka lines (filled while processing units)

    def generic(b, prev_cls):
        h = clean_inline(inner_html(b))
        t = b.text
        if b.tag == "h1":
            return ("H", h)
        if b.tag == "h2":
            return ("S", h)
        if b.tag in ("h3", "h4"):
            return ("S2", h)
        if is_sambandh(b):
            h = re.sub(r"^(?:<b>)?\s*सम्बन्ध\s*—\s*(?:</b>)?", "<b>सम्बन्ध—</b>", h, count=1)
            return ("P", "Sambandh", h)
        if re.match(r"^प्रश्न\s*—", t):
            return ("P", "Prashna", h)
        if re.match(r"^उत्तर\s*—", t):
            # the first answer of a verse is wrapped in one big <b> by the EPUB export: print it as normal text
            m = re.match(r"^(.*?उत्तर\s*—)\s*<b>(.*)</b>$", h)
            if m and "<b>" not in m.group(2):
                h = m.group(1) + m.group(2)
            return ("P", "Uttar", h)
        if b.cls in VERSE_CLS:
            return ("P", "Shlok", h)
        if b.cls in RIGHT_CLS:
            return ("P", "Shlok-Right", h)
        if is_speaker(b):
            return ("P", "Uvaacha", h)
        if b.cls in CENTER_CLS:
            return ("P", "Shlok-Subject", h)
        return ("P", "TXT", h)

    # ---- the book-level sections --------------------------------------------------------------
    # title page ---------------------------------------------------------------------------------
    open_section("title")
    add([
        P("Titel-Page---Shri-Hari", "॥ श्रीहरि:॥"),
        P("Title-Page---Book-Name", "श्रीमद्भगवद्गीता"),
        P("Title-Page---Sub-Heading", "तत्त्वविवेचनी"),
        P("Title-Page---Sub-Heading", "हिन्दी-टीका पदच्छेद, अन्वयसहित"),
        '<p class="Title-Page---Tvamev-mata"><img src="%s" alt="श्रीकृष्ण और गौ" style="max-width:180px;height:auto"></p>' % TITLE_IMG,
        P("Title-Page---Translater-Author-Name", "टीकाकार—"),
        P("Title-Page---Author-Name", "जयदयाल गोयन्दका"),
    ])

    # निवेदन (publisher's note) ---------------------------------------------------------------------
    open_section("nivedan")
    add_heading("निवेदन", "Heading")
    i = i_nivedan + 1
    while blocks[i].text != "—प्रकाशक":
        b = blocks[i]
        if b.tag == "p" and plain(b.html) and b.text != "॥ श्रीहरि: ॥":
            add(emit("TXT", clean_inline(inner_html(b))))
        i += 1
    add([P("TXT-Right", "—प्रकाशक")])

    # नम्र निवेदन (author's preface) + its sub-sections -----------------------------------------------
    open_section("namra")
    add_heading("नम्र निवेदन", "Heading")
    i = i_namra + 1
    stop = find("टीकाके सम्बन्धमें कुछ ज्ञातव्य बातें", tag="h1")
    prev_cls = None
    while i < stop:
        b = blocks[i]
        i += 1
        if not plain(b.html) or b.tag in ("table", "ul", "ol", "dl"):
            continue
        h = clean_inline(inner_html(b))
        if b.tag == "h2":
            add_heading(h, "Sub-Heading")
            prev_cls = None
        elif b.tag in ("h3", "h4"):
            add_heading(h, "Sub-Heading-2")
            prev_cls = None
        elif b.cls in ("block_26", "block_27"):
            add(emit("Shlok", h))
            prev_cls = "Shlok"
        elif b.cls == "block_30" and prev_cls == "Shlok":
            add(emit("Shlok-Right", h))
        elif b.cls == "block_33":
            add(emit("Sub-Heading-3", h))
            prev_cls = None
        elif b.cls == "block_34":
            add(emit("TXT-Right", h))
        else:
            add(emit("TXT", h))
            prev_cls = None

    # the h1 sections between the preface and chapter 1 ------------------------------------------------
    i = stop
    first_chap = chap_idx[0]
    img_blocks = [x for x in range(stop, first_chap) if "<img" in blocks[x].html]
    if len(img_blocks) != 3:
        raise SystemExit("expected 3 pictures between the preface and chapter 1, found %d" % len(img_blocks))
    hand_idx = img_blocks[-1]                      # the author's handwritten note
    prayer_blocks = [b for b in blocks[hand_idx + 1:first_chap] if plain(b.html)]
    while i < hand_idx:
        b = blocks[i]
        i += 1
        if b.tag == "h1" and plain(b.html) == "":
            # empty h1 holding the first picture (निराकार table): becomes the inline SVG below the heading before
            continue
        if b.tag == "h1":
            open_section(b.text)
            add_heading(clean_inline(inner_html(b)), "Heading")
            if b.text == "गीतामें ध्यान-सम्बन्धी श्लोक":
                add([svg_block(SVG_NIRAKAR, "tv-nirakar")])
            elif b.text == "गीतामें भगवत्प्राप्तिके साधनविषयक श्लोकोंकी संख्या":
                add([svg_block(SVG_SHLOK, "tv-shlok-sankhya")])
            continue
        if b.tag in ("table", "ul", "ol", "dl") or not plain(b.html):
            continue
        if b.text.startswith("॥") and len(b.text) < 40 and "श्रीहरि" in b.text:
            continue
        h = clean_inline(inner_html(b))
        if b.tag == "p" and b.cls == "block_38":
            add(emit("Uvaacha", h))
        elif b.cls in ("block_27",):
            add(emit("Shlok", h))
        elif b.cls == "block_40":
            add(emit("Shlok-Subject", h))
        elif b.cls in ("block_29", "block_37", "block_14", "block_39"):
            add(emit("TXT", h))
        else:
            add(emit("TXT", h))

    # the author's handwritten note + opening prayers, then the 18 chapters ---------------------------------
    open_section("hastlikhit")
    add_heading("लेखकका हस्तलिखित निवेदन", "Heading")
    add(['<p class="TXT" style="text-align:center"><img src="%s" alt="जयदयाल गोयन्दकाका हस्तलिखित निवेदन" '
         'style="max-width:100%%;height:auto"></p>' % NIVEDAN_IMG])

    # opening prayer lines are the blocks between the handwritten page and chapter 1 (already skipped above)
    chap_idx.append(i_mbh)
    stats = []
    anomalies = Counter()
    for ci in range(18):
        a, z = chap_idx[ci], chap_idx[ci + 1]
        seg = blocks[a + 1:z]
        label = "अध्याय %d" % (ci + 1)
        open_section(label)
        if ci == 0:
            for pb in prayer_blocks:
                cls_ = "Shlok" if pb.cls == "block_27" else "Shlok-Subject"
                add([P(cls_, clean_inline(inner_html(pb)))])
        add_heading(clean_inline(inner_html(blocks[a])), "Heading")
        units = locate_units(seg, rep, label)
        marks_seen = []
        first_u0 = units[0]["u0"] if units else len(seg)
        # intro (before the first unit)
        def emit_generic(b, prev):
            if not plain(b.html) or b.tag in ("table", "ul", "ol", "dl"):
                return prev
            if b.text.startswith("॥") and "श्रीहरि" in b.text and len(b.text) < 40:
                return prev
            g = generic(b, prev)
            if g[0] == "S":
                add_heading(g[1], "Sub-Heading")
                return None
            if g[0] == "S2":
                add_heading(g[1], "Sub-Heading-2")
                return None
            if g[0] == "H":
                add_heading(g[1], "Heading")
                return None
            add(emit(g[1], g[2]))
            return g[1]
        prev = None
        for b in seg[:first_u0]:
            prev = emit_generic(b, prev)
        bounds = [u["u0"] for u in units] + [len(seg)]
        for ui, u in enumerate(units):
            lbl = "श्लोक " + (u["first"] if u["first"] == u["last"] else "%s-%s" % (u["first"], u["last"]))
            add_heading(lbl, "Sub-Heading")
            marks_seen.append(u["nums"])
            # header: सम्बन्ध paragraph(s) -> speaker -> verse
            idx = u["u0"]
            while idx < (u["sp"] if u["sp"] is not None else u["s0"]):
                b = seg[idx]
                idx += 1
                if not plain(b.html):
                    continue
                h = clean_inline(inner_html(b))
                if is_sambandh(b):
                    h = re.sub(r"^(?:<b>)?\s*सम्बन्ध\s*—\s*(?:</b>)?", "<b>सम्बन्ध—</b>", h, count=1)
                add(emit("Sambandh", h))
            if u["sp"] is not None:
                add(emit("Uvaacha", clean_inline(inner_html(seg[u["sp"]]))))
            for y in range(u["s0"], u["k"] + 1):
                b = seg[y]
                if is_speaker(b):
                    add(emit("Uvaacha", clean_inline(inner_html(b))))
                    continue
                verse_classes.add(b.cls)
                add(emit("Shlok", clean_inline(inner_html(b))))
            if u["star"] is not None:
                add(emit("Footnotes", clean_inline(inner_html(seg[u["star"]]))))
            for y in range(u["pad"][0], u["pad"][1]):
                add(emit("Shlok-L", clean_inline(inner_html(seg[y]))))
            add(emit("Padchched-1", " ".join(table_to_padachhed(seg[g]) if seg[g].tag == "table" else loose_to_padachhed(seg[g]) for g in u["grp"])))
            # translation + commentary up to the next unit
            prev = None
            tr = u["grp"][-1] + 1
            for y in range(tr, bounds[ui + 1]):
                b = seg[y]
                if y == tr and b.tag == "p":
                    add(emit("TXT-Bold", clean_inline(inner_html(b))))
                    prev = "TXT-Bold"
                    continue
                prev = emit_generic(b, prev)
        stats.append((ci + 1, len(units), marks_seen))

    html_parts.append(section)

    # closing sections: महाभारतमें ..., आरती -------------------------------------------------------------
    section = None
    i = i_mbh
    open_section("mbh")
    cur_prev = None
    while i < len(blocks):
        b = blocks[i]
        i += 1
        if not plain(b.html) or b.tag in ("table", "ul", "ol", "dl"):
            continue
        h = clean_inline(inner_html(b))
        if b.tag == "h1":
            if section:
                html_parts.append(section)
            section = []
            add_heading(h, "Heading")
            cur_prev = None
        elif b.cls == "block_88":
            add(emit("Shlok", h))
            cur_prev = "Shlok"
        elif b.cls == "block_128" and cur_prev == "Shlok":
            add(emit("Shlok-Right", h))
        else:
            add(emit("TXT", h))
            cur_prev = None
    html_parts.append(section)
    html_parts = [p for p in html_parts if p]

    # ---- sanity checks --------------------------------------------------------------------------
    expected = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78]   # Gita Press numbering (ch. 13 has 34)
    for (ch, n_units, marks), exp in zip(stats, expected):
        covered = set()
        for a_, z_ in marks:
            covered |= set(range(a_, z_ + 1))
        missing = sorted(set(range(1, exp + 1)) - covered)
        extra = sorted(x for x in covered if x > exp or x < 1)
        if missing or extra:
            rep.warn("अध्याय %d: expected verses 1-%d, units=%d, missing=%s, extra=%s" % (ch, exp, n_units, missing[:12], extra[:12]))
    unused = sorted(set(notes) - state["used_notes"])
    if unused:
        rep.warn("notes never placed: %s" % unused[:20])
    return html_parts, rep, stats, verse_classes


def svg_block(path, uid):
    """Inline an SVG table: scope its <style> to this picture so it cannot leak into the page, make it fluid."""
    s = Path(path).read_text(encoding="utf-8").strip()
    s = re.sub(r"^<\?xml[^>]*\?>\s*", "", s)
    m = re.search(r"<style>(.*?)</style>", s, re.S)
    css = m.group(1) if m else ""
    # prefix every selector with the figure id
    def scope(css_text):
        out = []
        for rule in re.finditer(r"([^{}]+)\{([^{}]*)\}", css_text):
            sels = ", ".join("#%s %s" % (uid, x.strip()) for x in rule.group(1).split(","))
            out.append("%s{%s}" % (sels, rule.group(2).strip()))
        return "\n".join(out)
    s = s.replace(m.group(0), "<style>\n%s\n</style>" % scope(css)) if m else s
    s = re.sub(r'<svg\b[^>]*>', lambda mm: '<svg xmlns="http://www.w3.org/2000/svg" id="%s" viewBox="%s" role="img" '
               'style="display:block;width:100%%;max-width:900px;height:auto;margin:.6rem auto">'
               % (uid, re.search(r'viewBox="([^"]+)"', mm.group(0)).group(1)), s, count=1)
    return '<div class="svg-table" style="margin:0 0 1rem">%s</div>' % s


HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">

<title>{title} : प्रथम पृष्ठ</title>

<link rel="stylesheet" href="../../master.css">
<style>
  body {{
    font-family: Georgia, serif;
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
    line-height: 1.6;
  }}

  .page-break {{
    margin: 2rem 0;
    border: none;
    border-top: 1px dashed #ccc;
  }}

  .epub-page {{
    margin-bottom: 1rem;
  }}
  span.pm {{ font-weight: normal; }}
</style>

</head>

<body>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(DEFAULT_SRC))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    parts, rep, stats, vc = build(a.src, a.dry_run)
    sections = []
    for n, p in enumerate(parts, 1):
        sections.append('<section class="epub-page" data-page="%d">\n<div>\n\t\t\t%s\n\t\t</div>\n</section>' % (n, "\n\t\t\t".join(p)))
    out = HEAD.format(title=BOOK_TITLE) + "\n<hr class=\"page-break\">\n\n".join(sections) + "\n\n</body>\n</html>\n"
    print("sections:", len(parts), " chapters:", len(stats), " units:", sum(s[1] for s in stats), " size: %.0f KB" % (len(out.encode("utf-8")) / 1024))
    for ch, n, _ in stats:
        print("  अध्याय %2d: %d sub-chapters" % (ch, n))
    print("verse-line source classes:", sorted(vc))
    print("WARNINGS (%d):" % len(rep.lines))
    for ln in rep.lines[:60]:
        print("  -", ln)
    if not a.dry_run:
        (BOOKS / OUT_NAME).write_text(out, encoding="utf-8")
        print("written:", BOOKS / OUT_NAME)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_shankara_upanishads.py -- turn the gitapress.org EPUB extracts of the two Gita Press Upanishads "with Shankara bhashya"
(तैत्तिरीयोपनिषद्, श्वेताश्वतरोपनिषद् -- "मन्त्रार्थ, शाङ्करभाष्य और भाष्यार्थसहित") into the library's book-HTML format.

The target format is the one of the library's existing प्रश्नोपनिषद् (also Gita Press, with the bhashya):

    cover (text)                          cover-* / Numbers / No-Paragraph-Style ...   (same as प्रश्नोपनिषद्; the cover picture is a separate job)
    निवेदन / प्रस्तावना                   Heading + Normal, the translator's signature TXT-Right
    title page                            Page-Break (ॐ / तत्सद्ब्रह्मणे नमः), Heading <title>, Normal<em>subtitle</em>, Shlok, Sub-Heading-2 शान्तिपाठ
    chapter (वल्ली / अध्याय)              Heading                         (one reader chapter)
    अनुवाक (तैत्तिरीय) / topic (श्वेताश्वतर)   Sub-Heading                     (one reader page each)
    topic title inside an अनुवाक          Sub-Heading-2
    the mantra                            Shlok            (a mantra of the तैत्तिरीय keeps its id="Mantr_N")
    its Hindi translation                 Normal
    the bhashya (Sanskrit)                Bhashya-Sanskrit (a bold lemma line of the तैत्तिरीय bhashya: span.bold)
    the bhashya's Hindi translation       Normal
    a verse quoted in the bhashya         Shlok-Black, its reference "(गीता ३। १७)" Shlok-reference
    "इति ... अनुवाक: ॥ २॥" and the like   Chapter-End-Text
    footnotes (EPUB "Notes")              <sup>[१]</sup> in the text and, right under the paragraph that cites it, <p class="Footnotes"><b>[१]</b> ...</p>
                                          (which swadhyay-footnotes.js turns into a tap-to-open note; as in the तत्त्वविवेचनी import)
    the तैत्तिरीय's मन्त्राणां वर्णानुक्रमणिका   Heading + a table (Samagri-Table classes)

Dropped: the cover picture (a blob: SVG), the book's own title page and विषय-सूची (the reader has its own contents), the publisher's
list of other books.

How a source paragraph is told Sanskrit from Hindi:
  * तैत्तिरीय: the bhashya comes in <div class="parent"><div class="a_part">Sanskrit</div><div class="b_part">Hindi</div></div>; outside them a
    paragraph with id="Mantr_N" is a mantra, everything else is told by the language score.
  * श्वेताश्वतर: paragraphs follow each other flat (the Calibre classes only record the font), so the language is scored: the share of the words
    that are Hindi function words or carry a Hindi postposition (का की के को से में पर ...).  Sanskrit paragraphs score under 0.1,
    Hindi ones over 0.2; the ones in between are printed for a look.

    python tools/build_shankara_upanishads.py [tai|shvet|both] [--src DIR] [--dry-run]
    (the colons the source types for visarga are put right by the script itself)
"""
import argparse
import collections
import html as htmlmod
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
DEFAULT_SRC = Path(r"C:\Users\megha\Downloads")
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}

BOOKS_CFG = {
    "tai": {
        "src": "तैत्तिरीयोपनिषद्.html",
        "out": "तैत्तिरीयोपनिषद् (शांकरभाष्य).html",
        "title": "तैत्तिरीयोपनिषद्",
        "numbers": "(कृष्णयजुर्वेदीय तैत्तिरीयारण्यक)",
        "subtitle": "[मन्त्रार्थ, शाङ्करभाष्य और भाष्यार्थसहित]",
        "intro": "निवेदन",
        "signature": ["अनुवादक"],
        "chapter_h": "h1",           # the tag of a chapter title (वल्ली)
        "sub_h": "h2",               # the tag of an अनुवाक
        "topic_h": "h3",             # the tag of a topic title
        "mode": "parent",            # bhashya in parent/a_part/b_part
        "mantra_classes": {"block_28", "block_38"},
        "verse_classes": set(),
        "sanskrit_classes": {"block_28", "block_52", "block_60", "block_67", "block_77", "block_95", "block_120", "block_30", "block_124", "block_"},
        "hindi_classes": set(),
        "min_footnotes": 20,
    },
    "shvet": {
        "src": "श्वेताश्वतरोपनिषद्.html",
        "out": "श्वेताश्वतरोपनिषद् (शांकरभाष्य).html",
        "title": "श्वेताश्वतरोपनिषद्",
        "numbers": "(कृष्णयजुर्वेदीय)",
        "subtitle": "[मन्त्रार्थ, शांकरभाष्य और भाष्यार्थसहित]",
        "intro": "प्रस्तावना",
        "signature": ["विनीत", "अनुवादक"],
        "chapter_h": "h1",
        "sub_h": None,               # the topic titles are paragraphs (block_21), taken as Sub-Heading
        "topic_h": None,
        "mode": "flat",
        "mantra_classes": {"block_13", "block_40"},
        "verse_classes": {"block_12", "block_27", "block_29", "block_31"},
        "sub_classes": {"block_21"},
        # classes whose language is fixed (the rest -- block_11, block_24 -- are scored)
        "sanskrit_classes": {"block_23", "block_30", "block_32", "block_28", "block_25", "block_22", "block_36", "block_33", "block_4", "block_16"},
        "hindi_classes": {"block_42", "block_35"},
        "min_footnotes": 65,
    },
}

DEVA = "०१२३४५६७८९"


def deva(n):
    return "".join(DEVA[int(c)] for c in str(n))

# ----------------------------------------------------------------------------------------------------------------- the tree --


class Node:
    __slots__ = ("tag", "attrs", "kids", "parent")

    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.kids, self.parent = tag, attrs, [], parent

    @property
    def cls(self):
        return self.attrs.get("class", "") or ""


class TreeBuilder(HTMLParser):
    VOID = {"br", "hr", "img", "meta", "link", "input", "col"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root", {}, None)
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = Node(tag, dict(attrs), self.stack[-1])
        self.stack[-1].kids.append(n)
        if tag not in self.VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].kids.append(Node(tag, dict(attrs), self.stack[-1]))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].kids.append(data)


def parse(path):
    tb = TreeBuilder()
    tb.feed(Path(path).read_text(encoding="utf-8"))
    return tb.root


def find_all(node, pred, out=None):
    out = [] if out is None else out
    for k in node.kids:
        if isinstance(k, Node):
            if pred(k):
                out.append(k)
            find_all(k, pred, out)
    return out


def plain(node, skip_sup=True):
    parts = []
    for k in node.kids:
        if isinstance(k, str):
            parts.append(k)
        elif k.tag == "sup" and skip_sup:
            continue
        elif k.tag == "br":
            parts.append(" ")
        else:
            parts.append(plain(k, skip_sup))
    return re.sub(r"\s+", " ", "".join(parts).replace("\xa0", " ")).strip()


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(node):
    """The inline HTML of a block: text, the footnote references, the italic speaker marks (पूर्व०— / सिद्धान्ती—) and line breaks.
    Every other wrapper (the Calibre spans, bold Sanskrit wrappers, links) is dropped."""
    out = []
    for k in node.kids:
        if isinstance(k, str):
            out.append(esc(k.replace("\xa0", " ")))
        elif k.tag == "sup":
            a = next((x for x in find_all(k, lambda n: n.tag == "a")), None)
            num = re.sub(r"\D", "", plain(a, False)) if a is not None else ""
            if num:
                out.append("\x01%s\x02" % num)     # the reference; Out.add makes it <sup>[१]</sup> and puts the note under the paragraph
            else:
                out.append(inline(k))
        elif k.tag == "i":
            inner = inline(k)
            if inner.strip():
                out.append('<span class="rg-it">%s</span>' % inner)
        elif k.tag == "br":
            out.append(" ")            # a line break in the middle of a sentence (the print's line/page end), not a verse line
        else:
            out.append(inline(k))
    s = "".join(out)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"</span>(\s*)<span class=\"rg-it\">", r"\1", s)        # two italic runs in a row
    s = re.sub(r"\s*<br>\s*", "<br>", s)
    s = re.sub(r"^(?:<br>)+|(?:<br>)+$", "", s.strip())
    return s.strip()


# ------------------------------------------------------------------------------------------------------------ the language --
HI_WORDS = set("""है हैं हो होता होती होते हुआ हुई हुए था थी थे गया गयी गये गई जाता जाती जाते जाय सकता सकती सकते करता करती करते करना
करनेवाला करे करें और जो यह इस उस वह ये वे कि से में को का की के पर तो भी नहीं लिये लिए क्योंकि अर्थात् तथा किन्तु परन्तु अथवा यदि तब तभी
जब जहाँ वहाँ यहाँ कहते कहा कहती कहलाता रहता रहती रहते रहा रही रहे देता देती देते देना लेता लेते लेना बनता बनती बने बना आदि अपने अपना
अपनी सब सभी कोई कुछ किसी जिस जिसे जिन उन उसे इसे उन्हें इन्हें हमें हम तू तुम मैं मुझे मेरा मेरी मेरे ही तक द्वारा समान सहित रहित वाला
वाली वाले""".split())
HI_SUFFIX = re.compile(r"[ऀ-ॿ]{3,}(?:का|की|के|को|से|में|पर|ने|ही|भी|तक)$")


def hindi_score(t):
    toks = re.findall(r"[ऀ-ॿ]+", t)
    if not toks:
        return 0.0
    n = sum(1 for w in toks if w.strip("।॥") in HI_WORDS or HI_SUFFIX.match(w.strip("।॥")))
    return n / len(toks)


AMBIGUOUS = []


def bold_ratio(node):
    """the share of the paragraph's letters that sit inside <b> -- the Sanskrit bhashya of श्वेताश्वतर is wrapped in bold"""
    tot = len(plain(node))
    inb = sum(len(plain(b)) for b in find_all(node, lambda n: n.tag == "b"))
    return inb / tot if tot else 0.0


def is_hindi(t, where="", node=None, cfg=None):
    if cfg is not None and node is not None:
        if node.cls in cfg["sanskrit_classes"]:
            return False
        if node.cls in cfg["hindi_classes"]:
            return True
        if bold_ratio(node) > 0.9:
            return False
    sc = hindi_score(t)
    if 0.08 <= sc <= 0.2:
        AMBIGUOUS.append((round(sc, 2), where, t[:90]))
    return sc >= 0.12


END_RE = re.compile(r"((नुवाक|ध्याय):\s*॥\s*[०-९]+\s*॥|^इति श्रीमद्|^इति श्रीमत्|^श्रीमच्छङ्कर|^भगवत्प्रणीते|^समाप्त|^॥\s*समाप्त"
                    r"|^॥\s*ॐ तत्सत्\s*॥|^॥\s*हरि:\s*ॐ तत्सत्\s*॥)")
REF_RE = re.compile(r"^\(.{2,40}\)\s*।?$")


# --------------------------------------------------------------------------------------------------------------- the pieces --
def flatten(root):
    """[ (section_no, kind, node, ctx) ] in document order.  kind: p h1 h2 h3 table dl;  ctx: 'A' / 'B' inside a parent block, else ''."""
    items = []
    body = next(n for n in find_all(root, lambda n: n.tag == "body"))
    sections = [n for n in body.kids if isinstance(n, Node) and n.tag == "section"]
    for si, sec in enumerate(sections):
        def walk(node, ctx):
            for k in node.kids:
                if not isinstance(k, Node):
                    continue
                if k.tag in ("p", "h1", "h2", "h3", "table", "dl"):
                    items.append((si, k.tag, k, ctx))
                elif k.tag == "div":
                    c = k.cls.split()
                    walk(k, "A" if "a_part" in c else "B" if "b_part" in c else ctx)
                elif k.tag in ("ol", "ul", "li"):
                    items.append((si, "toc", k, ctx))
        walk(sec, "")
    return items, len(sections)


class Out:
    def __init__(self, notes):
        self.pages, self.cur = [], []
        self.notes, self.used = notes, []

    def new_page(self, merge_heading=False):
        """a Heading with nothing after it yet keeps the next Sub-Heading on its page"""
        if merge_heading and len(self.cur) == 1 and self.cur[0].startswith('<p class="Heading"'):
            return
        if self.cur:
            self.pages.append("".join(self.cur))
        self.cur = []

    def add(self, cls, inner, attrs=""):
        found = [int(x) for x in re.findall(r"\x01(\d+)\x02", inner)]
        inner = re.sub(r"\x01(\d+)\x02", lambda m: "<sup>[%s]</sup>" % deva(int(m.group(1))), inner)
        self.cur.append('<p%s class="%s">%s</p>\n' % (attrs, cls, inner))
        for n in found:                       # each note sits right under the paragraph that cites it
            if n in self.used:
                raise SystemExit("note %d is cited twice" % n)
            self.used.append(n)
            for pi, t in enumerate(self.notes[n]):
                self.cur.append('<p class="Footnotes">%s%s</p>\n' % ("<b>[%s]</b> " % deva(n) if pi == 0 else "", t))

    def raw(self, s):
        self.cur.append(s)

    def finish(self):
        self.new_page()
        return self.pages


def cover(cfg):
    L = ['<div class="Basic-Graphics-Frame">\n',
         '\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः॥ </p>\n',
         '\t\t\t<p class="cover-Book-Name">%s</p>\n' % cfg["title"],
         '\t\t\t<p class="Numbers"><span class="rg-it">%s</span></p>\n' % cfg["numbers"],
         '\t\t\t<p class="No-Paragraph-Style para-style-override-2"><span class="inline_shlok">%s</span></p>\n' % cfg["subtitle"],
         '\t\t\t<p class="cover-Tvamev-mata">&nbsp;</p>\n']
    for line in ("त्वमेव माता च पिता त्वमेव", "त्वमेव बन्धुश्च सखा त्वमेव।", "त्वमेव विद्या द्रविणं त्वमेव", "त्वमेव सर्वं मम देवदेव॥ "):
        L.append('\t\t\t<p class="cover-Tvamev-mata">%s</p>\n' % line)
    L += ['\t\t\t<p class="cover-Tvamev-mata">&nbsp;</p>\n',
          '\t\t\t<p class="cover-Author-Name"><span class="bold">भाष्यकार—</span>जगद्गुरु आदि शंकराचार्य</p>\n',
          '\t\t\t<p class="cover-Publisher-Note para-style-override-3">गीताप्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।'
          '<span class="quote"></span></p>\n', "</div>\n"]
    return "".join(L)


def read_notes(items):
    notes = {}
    for si, kind, node, ctx in items:
        if kind != "dl":
            continue
        dt = next(iter(find_all(node, lambda n: n.tag == "dt")), None)
        dd = next(iter(find_all(node, lambda n: n.tag == "dd")), None)
        num = re.search(r"\d+", plain(dt, False)).group(0)
        paras = [inline(p) for p in find_all(dd, lambda n: n.tag == "p")] or [inline(dd)]
        notes[int(num)] = [p for p in paras if p]
    return notes


def build(key, src_dir, dry):
    cfg = BOOKS_CFG[key]
    root = parse(Path(src_dir) / cfg["src"])
    items, n_sections = flatten(root)
    notes = read_notes(items)
    items = [it for it in items if it[1] != "dl"]

    # sections to drop: the cover picture, the book's title page, the contents, the publisher's list
    drop = set()
    for si, kind, node, ctx in items:
        t = plain(node) if kind != "toc" else ""
        if kind == "toc" or t in ("विषय-सूची", "गीताप्रेस, गोरखपुरसे प्रकाशित") or t.startswith("सानुवाद"):
            drop.add(si)
    drop.add(0)
    notes_at = next(n for n, (si, kind, node, ctx) in enumerate(items) if kind == "h1" and plain(node) == "Notes")
    body_items = [it for n, it in enumerate(items) if n < notes_at and it[0] not in drop]
    skipped = [(it[1], plain(it[2])[:70]) for n, it in enumerate(items) if n < notes_at and it[0] in drop and it[1] != "toc" and plain(it[2])]

    # in श्वेताश्वतर the topic titles are paragraphs; two in a row are one title wrapped over two lines
    merged = []
    for it in body_items:
        si, kind, node, ctx = it
        if (kind == "p" and node.cls in cfg.get("sub_classes", ()) and merged and merged[-1][1] == "p"
                and merged[-1][2].cls in cfg.get("sub_classes", ()) and plain(node)):
            prev = merged[-1]
            prev_text = prev[4] if len(prev) > 4 and prev[4] else plain(prev[2])
            merged[-1] = (prev[0], "p", prev[2], "", prev_text + " " + plain(node))
            continue
        merged.append(it)
    body_items = merged

    out = Out(notes)
    state = "start"          # start -> preface -> title -> body
    in_first_chapter = False
    n_mantra = n_para = 0
    for it in body_items:
        si, kind, node, ctx = it[:4]
        override = it[4] if len(it) > 4 else None
        text = override or plain(node)
        if not text:
            continue
        cls = node.cls

        # ---- the preface and the title page
        if state in ("start", "preface", "title") and kind == "p" and text == cfg["intro"]:
            out.new_page(); out.add("Heading", esc(text)); state = "preface"; continue
        if state == "preface":
            if text == "ॐ":
                state = "title"
            elif text in cfg["signature"]:
                out.add("TXT-Right", esc(text)); continue
            else:
                body = inline(node)
                if cls in (cfg["verse_classes"] | cfg["mantra_classes"]) or (cls in ("block_12", "block_13") and not is_hindi(text, "preface")):
                    out.add("Shlok-Black", body)
                else:
                    out.add("Normal", body)
                continue
        if state == "title":
            if kind == "p" and text == "ॐ":
                out.new_page(); out.add("Page-Break", "ॐ"); continue
            if kind == "p" and text.startswith("तत्सद्ब्रह्मणे"):
                out.add("Page-Break", "तत्सद्ब्रह्मणे नमः"); continue
            if kind == "p" and text == cfg["title"]:
                out.add("Heading", esc(text)); continue
            if kind == "p" and text.startswith("मन्त्रार्थ"):
                out.add("Normal", "<em>%s</em>" % esc(text)); continue
            if kind in ("h1", "h2", "h3") and text.startswith("शान्तिपाठ"):
                out.add("Sub-Heading-2", "शान्तिपाठ"); continue
            if kind == "p":
                if cls not in (cfg["verse_classes"] | cfg["mantra_classes"]) and is_hindi(text, "title", node, cfg):
                    out.add("Normal", inline(node))
                else:
                    out.add("Shlok", inline(node))
                continue
            state = "body"          # the first chapter title
        # ---- the body
        if kind == "h1":
            if text.startswith("शान्तिपाठ") or not re.search(r"वल्ली|अध्याय", text):
                out.new_page(); out.add("Heading", esc(text.rstrip(":"))); continue
            out.new_page(); out.add("Heading", esc(text.rstrip(":"))); continue
        if kind == "h2":
            out.new_page(text != "शान्तिपाठ")
            out.add("Heading" if text == "शान्तिपाठ" else "Sub-Heading", esc(text)); continue
        if kind == "h3":
            out.add("Sub-Heading-2", esc(text)); continue
        if kind == "table":
            out.raw(index_table(node)); continue
        if kind != "p":
            continue
        n_para += 1
        if text in ("॥ श्रीहरि:॥", "ॐ") and not mid_attr_early(node):
            continue                    # the decoration at the top of a printed page
        if cls in cfg.get("sub_classes", ()):
            out.new_page(text.rstrip(":") != "शान्तिपाठ"); out.add("Heading" if text.rstrip(":") == "शान्तिपाठ" else "Sub-Heading", esc(text.rstrip(":"))); continue
        if text == "मन्त्राणां वर्णानुक्रमणिका":
            out.new_page(); out.add("Heading", esc(text)); continue
        body = inline(node)
        mid = node.attrs.get("id", "")
        mid_attr = ' id="%s"' % mid if mid.startswith("Mantr_") else ""
        if cfg["mode"] == "parent" and ctx in ("A", "B"):
            sc = hindi_score(text)
            if (ctx == "A" and sc > 0.3) or (ctx == "B" and sc < 0.1 and len(text) > 40):
                AMBIGUOUS.append((round(sc, 2), "PARENT-" + ctx, text[:90]))
        if cfg["mode"] == "parent" and ctx == "A":
            if cls == "block_37":
                out.add("Bhashya-Sanskrit", '<span class="bold">%s</span>' % body)
            else:
                out.add("Bhashya-Sanskrit", body)
            continue
        if cfg["mode"] == "parent" and ctx == "B":
            out.add("Normal", body); continue
        if mid_attr:
            n_mantra += 1
            out.add("Shlok", body, mid_attr); continue
        hindi = False if cls in (cfg["mantra_classes"] | cfg["verse_classes"]) else is_hindi(text, cls, node, cfg)
        if hindi:
            out.add("Normal", body)
        elif END_RE.search(text):
            out.add("Chapter-End-Text", body)
        elif REF_RE.match(text):
            out.add("Shlok-reference", body)
        elif cls in cfg["mantra_classes"]:
            n_mantra += 1
            out.add("Shlok", body)
        elif cls in cfg["verse_classes"]:
            out.add("Shlok-Black", body)
        else:
            out.add("Bhashya-Sanskrit", body)

    pages = [cover(cfg)] + out.finish()

    # a Hindi paragraph the print cut after a hyphen ("भक्ति-" / "युक्त पुरुषोंके ...") is one paragraph again
    pages = [re.sub(r'(?<=[ऀ-ॿ])-</p>\n<p class="Normal">', "-", pg) for pg in pages]
    hr = '\n<hr class="page-break">\n\n'
    head = ('<!DOCTYPE html>\n<html lang="hi">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>%s</title>\n<link rel="stylesheet" href="../../master.css">\n</head>\n\n' % esc(Path(cfg["out"]).stem))
    doc = head + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">\n%s</section>\n' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n</body>\n</html>\n"
    doc = doc.replace("</section>\n\n<hr", "</section>\n<hr")

    # the source types the ASCII colon for visarga ("नम:", "मह: है"); in these two books every colon that follows a Devanagari letter is a visarga
    # (checked by eye: the Hindi-block cases tools/fix_visarga_colon.py leaves alone -- "आत्मन:—", "भू: हैं", "उपक्रम:" -- are all visargas)
    doc = re.sub(r"(?<=[ऀ-ॿ]):", "ः", doc)

    # ---- checks
    css =MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', doc):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if sorted(out.used) != sorted(notes):
        raise SystemExit("footnote references %s do not match the notes %s" % (sorted(out.used), sorted(notes)))
    if len(notes) < cfg["min_footnotes"] - 1:
        raise SystemExit("only %d notes" % len(notes))
    ids = re.findall(r'id="(Mantr_\d+)"', doc)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate Mantr ids")
    for h in re.findall(r'href="#(Mantr_\d+)"', doc):
        if h not in ids:
            raise SystemExit("index link to a missing mantra: " + h)
    if re.search(r"calibre|block_|blob:", doc):
        raise SystemExit("source residue left")

    # every Devanagari letter of the kept source text is in the output (the headings and notes are in it too)
    def dev(s):
        s = re.sub(r"<[^>]+>", "", s)
        s = htmlmod.unescape(s)
        return collections.Counter(c for c in s if "ऀ" <= c <= "ॿ")
    kept = collections.Counter()
    for it in body_items:
        node = it[2]
        kept += dev(it[4] if len(it) > 4 and it[4] else plain(node))
    for n in notes:
        for p in notes[n]:
            kept += dev(p)
    got = dev(doc)
    lost = {c: kept[c] - got[c] for c in kept if kept[c] > got[c]}
    # the closing/opening title lines are written again by this script, so a surplus in the output is expected; a shortage is not
    if lost:
        print("   !! letters missing from the output:", lost)

    stats = collections.Counter(re.findall(r'<p[^>]*class="([^"]+)"', doc))
    print("%s: %d pages, %d notes, mantras %d; dropped %d source paragraphs" % (cfg["out"], len(pages), len(notes), n_mantra, len(skipped)))
    print("   ", dict(stats.most_common()))
    for s in skipped[:12]:
        print("    dropped:", s)
    if dry:
        return None
    dest = BOOKS / cfg["out"]
    for _ in range(10):
        try:
            dest.write_bytes(doc.encode("utf-8"))
            break
        except OSError:
            time.sleep(1.5)
    print("   wrote", dest.name, round(dest.stat().st_size / 1024, 1), "KB")
    return dest


def mid_attr_early(node):
    return node.attrs.get("id", "").startswith("Mantr_")


def index_table(node):
    rows = find_all(node, lambda n: n.tag == "tr")
    L = ['<table class="Samagri-Table">\n']
    for ri, tr in enumerate(rows):
        cells = find_all(tr, lambda n: n.tag == "td")
        L.append("<tr>")
        for ci, td in enumerate(cells):
            t = esc(plain(td))
            # the source links each prateeka to its mantra; the reader shows one Sub-Heading page at a time and a link to another page
            # does nothing, so the prateekas are plain text
            if ri == 0:
                L.append('<th class="Samagri-Table-Head">%s</th>' % t)
            elif ci == 0:
                L.append('<td class="Samagri-Table-Cell">%s</td>' % t)
            else:
                L.append('<td class="Samagri-Table-Cell-Center">%s</td>' % t)
        L.append("</tr>\n")
    L.append("</table>\n")
    return "".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("which", nargs="?", default="both", choices=["tai", "shvet", "both"])
    ap.add_argument("--src", default=str(DEFAULT_SRC))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    for key in (["tai", "shvet"] if a.which == "both" else [a.which]):
        build(key, a.src, a.dry_run)
        if AMBIGUOUS:
            print("   ambiguous language (score, class, text):")
            for x in AMBIGUOUS[:40]:
                print("     ", x)
            AMBIGUOUS.clear()


if __name__ == "__main__":
    main()

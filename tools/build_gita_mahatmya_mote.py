#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_gita_mahatmya_mote.py -- re-process "श्रीमद्भगवद्गीता-माहात्म्यसहित" (मोटे अक्षरोंमें, हिन्दी-टीकासहित)
so that every paragraph carries a class of the site's master.css instead of the EPUB's own block_NN classes.

Source : the calibre/EPUB extract (classes block_NN, text_N, calibre N, its own <style> blocks).  The first run keeps a copy in
         backups/before-reprocess-mahatmya-mote/ ; later runs read that copy (--src overrides).
Output : Gita Press Books/Gita Press Books/श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html   (master.css only -- no in-page CSS)

How the class is chosen
  1. the paragraph's look is read from the book's own in-page CSS (colour, bold, italic, alignment, size), together with what the
     text inside it does (a paragraph wrapped in <b>, an italic lead-in ...);
  2. that look is matched with the nearest class of master.css (same measures read from master.css) among the classes that make
     sense for the place the paragraph sits in (title page / heading / body verse + prose / footnote);
  3. the few roles a look cannot tell apart (speaker line "X उवाच", "ॐ श्रीपरमात्मने नम:", the end-of-chapter formula) are fixed
     by their wording.
  Run with --table to print which source class became which master class.

Structure (the reader cuts a chapter at every Heading and its pages at every Sub-Heading):
  title page ; निवेदन ; आरती                                   (Sub-Headings on the title page's chapter)
  per अध्याय K : Heading   "श्रीमद्भगवद्गीताके ... अध्यायका माहात्म्य"   (+ the माहात्म्य text)
                 Sub-Heading "अथ ...ऽध्याय:"  (+ the shlokas)
                 Sub-Heading "... अध्याय"      (+ the Hindi tika)
  गीता-आरती                                                    (Heading)
  the EPUB's विषय-सूची page is dropped (the reader has its own contents); footnotes ("Notes") move to sit under the paragraph that
  cites them, as in the other converted books.

Usage:  python tools/build_gita_mahatmya_mote.py [--src PATH] [--table] [--dry-run]
"""
import argparse
import html as htmlmod
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
OUT = BOOKS / "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html"
BACKUP_DIR = ROOT / "backups" / "before-reprocess-mahatmya-mote"
MASTER = ROOT / "master.css"
BOOK_TITLE = "श्रीमद्भगवद्गीता-माहात्म्यसहित"
DEVA = "०१२३४५६७८९"


def deva(n):
    return "".join(DEVA[int(c)] for c in str(n))


# ------------------------------------------------------------------ css reading --------------------------------------------
NAMED = {"black": (0, 0, 0), "red": (255, 0, 0), "navy": (0, 0, 128), "teal": (0, 128, 128), "maroon": (128, 0, 0),
         "darkblue": (0, 0, 139), "darkslateblue": (72, 61, 139), "mediumvioletred": (199, 21, 133), "blueviolet": (138, 43, 226),
         "white": (255, 255, 255), "blue": (0, 0, 255), "green": (0, 128, 0)}


def parse_color(v):
    v = (v or "").strip().lower()
    if not v:
        return (0, 0, 0)
    if v in NAMED:
        return NAMED[v]
    m = re.match(r"#([0-9a-f]{3}|[0-9a-f]{6})$", v)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    return (0, 0, 0)


def parse_decls(text):
    d = {}
    for part in text.split(";"):
        if ":" in part:
            k, v = part.split(":", 1)
            d[k.strip().lower()] = v.strip()
    return d


def em(v, default=1.0):
    m = re.match(r"([\d.]+)\s*(em|pt|px|rem)?", v or "")
    if not m:
        return default
    n = float(m.group(1))
    u = m.group(2) or "em"
    return n if u in ("em", "rem") else n / 16.0 if u == "px" else n / 12.0


def read_rules(css):
    """{class: declarations} for plain  .name { ... }  rules (the only kind the EPUB uses for its paragraph and span classes)."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"url\([^)]*\)", "url()", css)
    out = {}
    for m in re.finditer(r"(?m)(?:^|\})\s*(?:[a-z0-9]+)?\.([A-Za-z][\w-]*)\s*\{([^{}]*)\}", css):
        out.setdefault(m.group(1), {}).update(parse_decls(m.group(2)))
    return out


def look_of(d, base_em=1.0):
    """The measures a class is compared on."""
    w = (d.get("font-weight") or "").lower()
    return {
        "color": parse_color(d.get("color")),
        "bold": w == "bold" or (w.isdigit() and int(w) >= 600),
        "italic": (d.get("font-style") or "").lower() == "italic",
        "align": (d.get("text-align") or "left").lower(),
        "size": em(d.get("font-size"), base_em),
    }


def distance(a, b, size_scale):
    """How far apart two looks are (0 = same).  Size is compared as a bucket: big (heading-like) or normal."""
    dc = sum((x - y) ** 2 for x, y in zip(a["color"], b["color"])) ** 0.5 / 441.7
    d = 2.2 * dc
    d += 1.0 * (a["bold"] != b["bold"])
    d += 0.9 * (a["italic"] != b["italic"])
    al = {"justify": "justify", "left": "justify", "center": "center", "right": "right"}
    d += 1.6 * (al.get(a["align"], "justify") != al.get(b["align"], "justify"))
    d += 0.7 * ((a["size"] >= size_scale) != (b["size"] >= size_scale))
    return d


# master.css classes the paragraphs can become, grouped by the place they sit in
ZONES = {
    "title": ["Title-Page---Book-Name", "Title-Page---Sub-Title", "Title-Page---Sub-Heading", "Title-Page---Tvamev-mata",
              "Title-Page---Publisher-Note", "Title-Page---Author-Name", "Titel-Page---Shri-Hari"],
    "body": ["Shlok", "Shlok-L", "Shlok-Color", "Shlok-Subject", "Uvaacha", "TXT", "TXT-Bold", "Sambandh", "Chapter-End-Text",
             "OM-Namah", "Center-Dais-A", "Doha", "Subject", "Right"],
    "note": ["Footnotes", "Footnotes-Right", "Footnotes-Bold", "Footnotes-Center"],
}


def master_looks():
    rules = read_rules(MASTER.read_text(encoding="utf-8"))
    return {c: look_of(rules[c]) for z in ZONES.values() for c in z if c in rules}


# ------------------------------------------------------------------ reading the source -------------------------------------
BLOCK_RE = re.compile(r'<(table|ul|ol|dl)\b[^>]*>.*?</\1>|<(p|h[1-6]|div|blockquote)\b[^>]*>.*?</\2>', re.S)


class Blk:
    __slots__ = ("tag", "cls", "html", "text", "page", "id", "out", "role")

    def __init__(self, html, page):
        self.html = html
        self.page = page
        self.tag = re.match(r"<(\w+)", html).group(1)
        m = re.match(r'<\w+[^>]*\bclass="([^"]*)"', html)
        self.cls = m.group(1) if m else ""
        m = re.match(r'<\w+[^>]*\bid="([^"]*)"', html)
        self.id = m.group(1) if m else ""
        t = re.sub(r"<sup\b[^>]*>.*?</sup>", "", html, flags=re.S)
        t = re.sub(r"<[^>]+>", "", t)
        t = htmlmod.unescape(t).replace("\xa0", " ")
        self.text = re.sub(r"\s+", " ", t).strip()
        self.out = None
        self.role = None


def read_source(src):
    s = Path(src).read_text(encoding="utf-8")
    head = s[:s.index("</head>")]
    css = "\n".join(re.findall(r"<style>(.*?)</style>", head, flags=re.S))
    body = s[s.index("<body") :]
    body = body[body.index(">") + 1:]
    pages = re.split(r'\s*<hr class="page-break">\s*', body)
    blocks = []
    for pi, p in enumerate(pages):
        p = re.sub(r"^\s*<section[^>]*>", "", p.strip())
        p = re.sub(r"</section>\s*(?:</body>\s*</html>)?\s*$", "", p)
        for m in BLOCK_RE.finditer(p):
            blocks.append(Blk(m.group(0), pi))
    return read_rules(css), blocks


# ------------------------------------------------------------------ inline text --------------------------------------------
TAG_RE = re.compile(r"<(/?)(\w+)([^>]*)>|([^<]+)")


def runs_of(h, rules):
    """The inline HTML as runs [(text, bold, italic)].  Footnote references become \x01N\x02 markers; spans are looked up in the
    book's own CSS (bold / italic only); <br> is a space."""
    h = re.sub(r'<sup\b[^>]*>\s*<a\b[^>]*class="noteref"[^>]*>\s*(\d+)\s*</a>\s*</sup>', lambda m: "\x01" + m.group(1) + "\x02", h)
    stack = []
    runs = []
    for m in TAG_RE.finditer(h):
        if m.group(4) is not None:
            text = m.group(4).replace("\xa0", " ").replace("&nbsp;", " ")
            bold = any(s[0] for s in stack)
            ital = any(s[1] for s in stack)
            if runs and runs[-1][1] == bold and runs[-1][2] == ital:
                runs[-1][0] += text
            else:
                runs.append([text, bold, ital])
            continue
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if tag == "br":
            if runs:
                runs[-1][0] += " "
            continue
        if tag in ("img", "hr"):
            continue
        if closing:
            for i in range(len(stack) - 1, -1, -1):
                if stack[i][2] == tag:
                    del stack[i:]
                    break
            continue
        if attrs.rstrip().endswith("/"):
            continue
        b = i = False
        if tag in ("b", "strong"):
            b = True
        elif tag in ("i", "em"):
            i = True
        cm = re.search(r'class="([^"]*)"', attrs)
        if cm:
            for c in cm.group(1).split():
                d = rules.get(c, {})
                w = (d.get("font-weight") or "").lower()
                if w == "bold" or (w.isdigit() and int(w) >= 600):
                    b = True
                if (d.get("font-style") or "").lower() == "italic":
                    i = True
        stack.append((b, i, tag))
    return runs


def weight_of(runs):
    tot = bold = ital = 0
    for text, b, i in runs:
        n = len(re.sub(r"[\s\x01\x02\d]", "", text))
        tot += n
        bold += n if b else 0
        ital += n if i else 0
    return (bold / tot if tot else 0.0), (ital / tot if tot else 0.0)


def render_runs(runs, class_bold, class_italic):
    """Inline HTML: <b>/<i> only where the run differs from what the master class already does."""
    out = []
    for text, b, i in runs:
        t = re.sub(r"[ \t\r\n]+", " ", text)
        if not t.strip():
            out.append(t)
            continue
        if b and not class_bold:
            t = "<b>" + t + "</b>"
        if i and not class_italic:
            t = "<i>" + t + "</i>"
        out.append(t)
    h = "".join(out)
    h = re.sub(r"</b>(\s*)<b>", r"\1", h)
    h = re.sub(r"</i>(\s*)<i>", r"\1", h)
    h = re.sub(r"\s+(</(?:b|i)>)", r"\1 ", h)
    h = re.sub(r"[ \t]+", " ", h)
    return h.strip()


def plain(h):
    return re.sub(r"\s+", " ", htmlmod.unescape(re.sub(r"<[^>]+>", "", h)).replace("\x01", "").replace("\x02", "")).strip()


# ------------------------------------------------------------------ the roles wording decides ------------------------------
SPEAKER = re.compile(r"^(?:श्री)?[^\s।॥]{2,20}(?: [^\s।॥]{2,12})? ?(?:उवाच|उवाच:|वाच)$|^श्रीभगवानुवाच$")
END_TEXT = re.compile(r"^ॐ तत्सदिति|^इति श्रीमद्भगवद्गीतारूपी|ऽध्याय:\s*॥|^नाम [^\s]+ऽध्याय|^(?:और )?अर्जुनके संवादमें|उपनिषत्सु")
OM_NAMAH = re.compile(r"^ॐ श्रीपरमात्मने नम")
CH_MAHATMYA = re.compile(r"अध्यायका माहात्म्य$")


def build(src, want_table=False):
    rules, blocks = read_source(src)
    looks = master_looks()

    # ---- footnotes: dl.footnote -> {n: [(look-class, inner-runs)]} ; drop the "Notes" heading and the contents page ---------
    notes = {}
    rest = []
    for b in blocks:
        if b.tag == "dl" and "footnote" in b.cls:
            n = int(re.search(r'id="note_(\d+)"', b.html).group(1))
            notes[n] = [m for m in re.finditer(r'<p\b([^>]*)>(.*?)</p>', b.html, re.S)]
        elif b.tag == "p" and b.text == "Notes":
            continue
        else:
            rest.append(b)
    blocks = rest
    toc_pages = {b.page for b in blocks if b.text == "विषय-सूची"}
    blocks = [b for b in blocks if b.page not in toc_pages and b.tag not in ("ol", "ul", "table", "div")]
    first_page = min(b.page for b in blocks)

    # ---- source-class statistics: weight/italic of what is inside, so a paragraph wrapped in <b> counts as bold -------------
    stat = defaultdict(lambda: [0, 0.0, 0.0])          # cls -> [n, bold-share sum, italic-share sum]
    for b in blocks:
        if b.tag in ("p", "h1", "h2", "h3") and b.text:
            r = runs_of(re.sub(r"^<\w+[^>]*>|</\w+>\s*$", "", b.html), rules)
            bw, it = weight_of(r)
            s = stat[b.cls]
            s[0] += 1
            s[1] += bw
            s[2] += it

    def source_look(cls):
        d = dict(rules.get(cls, {}))
        lk = look_of(d)
        n, bw, it = stat.get(cls, (0, 0, 0))
        if n:
            lk["bold"] = lk["bold"] or (bw / n) > 0.6
            lk["italic"] = lk["italic"] or (it / n) > 0.6
        return lk

    def nearest(cls, zone):
        lk = source_look(cls)
        best = min(ZONES[zone], key=lambda c: (distance(lk, looks[c], 1.6), ZONES[zone].index(c)) if c in looks else (9, 99))
        return best

    table = defaultdict(lambda: defaultdict(int))        # source class -> master class -> count

    # ---- classify ---------------------------------------------------------------------------------------------------------
    for b in blocks:
        t = b.text
        if not t:
            b.role = ("drop",)
            continue
        if b.page == first_page:
            if re.match(r"^त्वमेव ", t):
                b.role = ("p", "Title-Page---Tvamev-mata")
            elif t == "श्रीमद्भगवद्गीता":
                b.role = ("p", "Title-Page---Book-Name")
            elif t == "गीताप्रेस, गोरखपुर":
                b.role = ("p", "Title-Page---Author-Name")
            elif t.startswith("पद्मपुराणान्तर्गत") or t in ("मोटे अक्षरोंमें", "हिंदी-टीकासहित"):
                b.role = ("p", "Title-Page---Sub-Heading")
            else:
                b.role = ("p", nearest(b.cls, "title"))
            continue
        if b.tag in ("h1", "h2") or b.cls in ("block_25", "block_10"):
            # the reader never closes a page shorter than 800 characters, so a short cover followed by Sub-Headings would swallow them:
            # निवेदन and both आरती are chapters (Headings) of their own, which leaves the cover page alone
            if CH_MAHATMYA.search(t) or t in ("निवेदन", "आरती"):
                b.role = ("H",)
            else:
                b.role = ("S",)
            continue
        if SPEAKER.match(t) and len(t) < 32:
            b.role = ("p", "Uvaacha")
        elif OM_NAMAH.match(t):
            b.role = ("p", "OM-Namah")
        elif len(t) < 260 and END_TEXT.search(t):
            b.role = ("p", "Chapter-End-Text")
        else:
            b.role = ("p", nearest(b.cls, "body"))

    # ---- note paragraphs (classed by the same nearest-look rule, inside the "note" zone) ------------------------------------
    def note_paras(n):
        out = []
        for m in notes.get(n, []):
            cm = re.search(r'class="([^"]*)"', m.group(1))
            cls = cm.group(1) if cm else ""
            runs = runs_of(m.group(2), rules)
            if not plain("".join(r[0] for r in runs)):
                continue
            ncls = nearest(cls, "note") if cls in stat or cls in rules else "Footnotes"
            table["note:" + cls][ncls] += 1
            out.append((ncls, cls, runs))
        return out

    # ---- build the output -----------------------------------------------------------------------------------------------
    MCLS_BOLD = {"Shlok", "Shlok-Color", "Shlok-Subject", "TXT-Bold", "Heading", "Sub-Heading", "Footnotes-Bold",
                 "Title-Page---Book-Name", "Title-Page---Sub-Title", "Title-Page---Sub-Heading", "Title-Page---Publisher-Note",
                 "Title-Page---Author-Name", "Titel-Page---Shri-Hari"}
    MCLS_ITALIC = {"Uvaacha", "Chapter-End-Text", "Doha", "Sambandh"}
    used_notes = set()
    warnings = []
    state = {"K": 0, "m": 0}
    out_lines = []          # list of (kind, html) in document order; kind: 'H'/'S'/'p'

    def fold_notes(runs, in_heading):
        """(inner html with <sup>[N]</sup> markers, [Footnotes paragraphs])"""
        found = []

        def sub(m):
            n = int(m.group(1))
            found.append(n)
            return "" if in_heading else "<sup>[%s]</sup>" % deva(n)
        return found, sub

    def emit_para(cls, runs, in_heading=False):
        found = []

        def sub(m):
            n = int(m.group(1))
            found.append(n)
            return "" if in_heading else "<sup>[%s]</sup>" % deva(n)
        h = render_runs(runs, cls in MCLS_BOLD, cls in MCLS_ITALIC)
        if cls == "Shlok":          # the verse number closes the shloka as "॥ १ ॥" (the source has "। १।", and one verse, 2.3, only "। ३")
            h = re.sub(r"\s*[।॥]+\s*([०-९]+)\s*[।॥]*\s*$", r" ॥ \1 ॥", h)
        h = re.sub(r"\x01(\d+)\x02", sub, h)
        lines = [(cls, h)]
        for n in found:
            if n in used_notes:
                continue
            used_notes.add(n)
            paras = note_paras(n)
            if not paras:
                warnings.append("note %d is cited but has no text" % n)
            for pi, (ncls, scls, nruns) in enumerate(paras):
                nh = render_runs(nruns, ncls in MCLS_BOLD, ncls in MCLS_ITALIC)
                if pi == 0 and not in_heading:
                    nh = "<b>[%s]</b> %s" % (deva(n), nh)
                lines.append((ncls, nh))
        return lines

    sections = []            # list of lists of html lines; a new section starts at every Heading / Sub-Heading page cut
    cur = []

    def flush():
        nonlocal cur
        if cur:
            sections.append(cur)
        cur = []

    PREFACE = ('<p class="OM-Namah">', '<p class="Subject">')

    def take_preface():
        """The invocation lines ("ॐ श्रीपरमात्मने नम:", "अथ श्रीमद्भगवद्गीता") that sit just above a heading in the source open
        that heading's page, not the end of the page before it: lift them off the end of the current section."""
        pre = []
        while cur and cur[-1].startswith(PREFACE):
            pre.insert(0, cur.pop())
        return pre

    n_h = n_s = 0
    for b in blocks:
        role = b.role
        if role[0] == "drop":
            continue
        inner = re.sub(r"^<\w+[^>]*>|</\w+>\s*$", "", b.html, flags=re.S)
        runs = runs_of(inner, rules)
        if role[0] == "H":
            pre = take_preface()
            flush()
            cur.extend(pre)
            state["K"] += 1
            state["m"] = 0
            hid = "Chapter_%d" % state["K"]
            ln = emit_para("Heading", runs, True)
            cur.append('<p id="%s" class="Heading">%s</p>' % (hid, ln[0][1]))
            for c, h in ln[1:]:
                cur.append('<p class="%s">%s</p>' % (c, h))
            n_h += 1
            table[b.cls]["Heading"] += 1
            continue
        if role[0] == "S":
            state["m"] += 1
            hid = "Chapter_%d_%d" % (state["K"], state["m"]) if state["K"] else "Chapter_0_%d" % state["m"]
            ln = emit_para("Sub-Heading", runs, True)
            pre = take_preface()
            cur.append('<hr class="page-break">')
            cur.append('<p id="%s" class="Sub-Heading">%s</p>' % (hid, ln[0][1]))
            cur.extend(pre)
            for c, h in ln[1:]:
                cur.append('<p class="%s">%s</p>' % (c, h))
            n_s += 1
            table[b.cls]["Sub-Heading"] += 1
            continue
        cls = role[1]
        for c, h in emit_para(cls, runs):
            cur.append('<p class="%s">%s</p>' % (c, h))
        table[b.cls][cls] += 1
    flush()

    stats = {"blocks": len(blocks), "headings": n_h, "subheadings": n_s, "notes_used": len(used_notes), "notes_total": len(notes)}
    for n in notes:
        if n not in used_notes:
            warnings.append("note %d is never cited" % n)
    if want_table:
        print("source class  ->  master class (count)   [look: colour bold italic align size]")
        for cls, mm in sorted(table.items(), key=lambda x: -sum(x[1].values())):
            lk = source_look(cls)
            print("  %-12s -> %s   [%s %s %s %s %.2f]" % (cls or "(none)", ", ".join("%s x%d" % kv for kv in sorted(mm.items(), key=lambda x: -x[1])),
                                                       "#%02x%02x%02x" % lk["color"], "B" if lk["bold"] else "-", "I" if lk["italic"] else "-",
                                                       lk["align"], lk["size"]))
    return sections, stats, warnings


HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="../../master.css">
</head>
<body>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src")
    ap.add_argument("--table", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    backup = BACKUP_DIR / OUT.name
    if a.src:
        src = Path(a.src)
    else:
        if not backup.exists():
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(OUT, backup)
        src = backup
    sections, stats, warnings = build(src, a.table)
    body = []
    for n, sec in enumerate(sections, 1):
        body.append('<section class="epub-page" data-page="%d">\n%s\n</section>' % (n, "\n".join(sec)))
    # the reader cuts the book at every <hr class="page-break">, so each Heading (a new chapter) starts after one, as each Sub-Heading does
    out = HEAD.format(title=BOOK_TITLE) + '\n<hr class="page-break">\n\n'.join(body) + "\n\n</body>\n</html>\n"
    print("sections:", len(sections), stats, " size: %.0f KB" % (len(out.encode("utf-8")) / 1024))
    print("WARNINGS (%d):" % len(warnings))
    for w in warnings[:40]:
        print("  -", w)
    if not a.dry_run:
        OUT.write_text(out, encoding="utf-8")
        print("written:", OUT)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_manas_chaupai.py -- lay the chaupai lines of "श्रीरामचरितमानस" out in columns.

A chaupai line of the book is one paragraph   <p class="Shlok">पद । पद ॥</p>.   This turns each of them, in the seven kāṇḍas, into

    <p class="Shlok cp"><span class="cp-a">पद।</span> <span class="cp-b">पद॥</span></p>

and master.css (p.Shlok.cp) gives the two halves the same width, each justified to its column with its । / ॥ as the last character of
its text, so the । are in line down the page and so are the ॥.  The class stays "Shlok" (the reader and the search look for it) with
"cp" added.  Dohas / sorthas (class Doha), the Sanskrit shlokas, the पारायण-विधि, the आरती and the टिप्पणियाँ are left as they are.

Second pass -- the verse blocks (doha, sortha, chhand, the Sanskrit shlokas): each block of consecutive lines becomes ONE paragraph

    <p class="Shlok vs"> one row per line, four spans each:  prefix | text | mark | suffix
        prefix  the "दो०—" / "सो०—" / "छं०—" label (first row only; empty on the others)
        text    the line, justified to the width of the longest line of the block
        mark    the ।  or  ॥  that ends the line  (a column of its own, so they stand one under the other)
        suffix  the verse number and its closing danda ("३१॥"), on the row that has it

and p.vs in master.css lays the four spans out as grid columns.

A chhand written as "छं०—A । B ॥" lines (9 of them, two lines each) is one paragraph  <p class="Shlok cph">  with a row per line and
five spans per row: label | first half | । | second half | ॥ .  The two half columns are of equal width and as wide as the chhand's
longest half (so they are narrower than the chaupai columns: 55 % to 83 % of them), the label stands before them.

Third pass -- one reader page per मासपारायण विश्राम (the seven kāṇḍas only): a Sub-Heading "मासपारायण, N विश्राम" is put before the first
paragraph of every विश्राम that does not begin a kāṇḍa, and the kāṇḍa Headings and these Sub-Headings carry data-whole-page="1" so the reader
does not cut the page again by size.  The page then ends with the book's own "मासपारायण, N विश्राम" line.

The first run keeps a copy of the book in backups/before-manas-chaupai/.  Re-running is safe: lines already split are skipped.
Usage:  python tools/build_manas_chaupai.py [--dry-run]
"""
import argparse
import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "data"))
from extract_manas_book_subheadings import norm, LABELS   # noqa: E402
BOOK_SUBS = ROOT / "tools" / "data" / "manas_book_subheadings.json"
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "श्रीरामचरितमानस.html"
BACKUP = ROOT / "backups" / "before-manas-chaupai" / BOOK.name

START = ">बालकाण्ड<"                    # the chaupais begin with the first kāṇḍa ...
STOP = "श्रीरामायणजीकी आरती"              # ... and end before the closing आरती
PARA = re.compile(r'<p class="Shlok">(.*?)</p>', re.S)
ANY_PARA = re.compile(r'<p class="([^"]+)">(.*?)</p>', re.S)
LABEL = re.compile(r"^((?:<span[^>]*></span>)*)\s*((?:दो०|सो०|छं०|श्लोक|हरिगीतिका|चौ०|छ०)\s*[—–-]\s*)")
ANCHORS = re.compile(r"^((?:<span[^>]*></span>)*)")
# the end of a line: the । or ॥, then (verse end) the number with its closing danda, e.g. "॥ ३१॥", "॥ १० (क)॥", "॥१४ (घ)॥"
END = re.compile(r"\s*(।।|।|॥)\s*((?:[०-९]+\s*(?:\([^)<]{0,8}\))?\s*॥)?)\s*$")
TAG = re.compile(r"<[^>]+>")


def split_line(inner):
    """(first half, second half) of 'पद । पद ॥' -- the । and the closing ॥ must sit outside any tag, exactly one । before the ॥."""
    plain = TAG.sub("\x00", inner)                       # one placeholder per tag, so positions can be mapped back
    marks = [i for i, ch in enumerate(plain) if ch == "।"]
    ends = [i for i, ch in enumerate(plain) if ch == "॥"]
    if len(marks) != 1 or len(ends) != 1:
        return None
    # map positions of the tag-free string back to the html string
    pos, j = [], 0
    for m in re.finditer(r"<[^>]+>|[^<]", inner):
        pos.append((m.start(), m.end(), m.group(0).startswith("<")))
    # index of the k-th character of `plain` in `inner`
    def at(k):
        return pos[k][0]
    d, e = marks[0], ends[0]
    if not (d < e and plain[e + 1:].strip() == "" and plain[:d].replace("\x00", "").strip() and plain[d + 1:e].replace("\x00", "").strip()):
        return None
    a = inner[:at(d)].strip()
    b = inner[at(d) + 1:at(e)].strip()
    return a, b


def convert(text):
    lo = text.index(START)
    hi = text.index(STOP, lo)
    body = text[lo:hi]
    n_done = n_skip = 0

    def sub(m):
        nonlocal n_done, n_skip
        parts = split_line(m.group(1))
        if not parts:
            n_skip += 1
            return m.group(0)
        n_done += 1
        a, b = parts
        # each mark stays at the end of its own half (no cell of its own), so a line can never leave the ॥ alone on a row of its own
        return '<p class="Shlok cp"><span class="cp-a">%s।</span> <span class="cp-b">%s॥</span></p>' % (a, b)

    body2 = PARA.sub(sub, body)
    return text[:lo] + body2 + text[hi:], n_done, n_skip


def convert_chhand_halves(text):
    """"छं०—A । B ॥" lines (and the "A । B ॥" lines that follow them) -> one <p class="Shlok cph"> per chhand; see the docstring."""
    lo = text.index(START)
    hi = text.index(STOP, lo)
    body = text[lo:hi]
    paras = list(ANY_PARA.finditer(body))
    out, last, n = [], 0, 0
    i = 0
    while i < len(paras):
        m = paras[i]
        lm = LABEL.match(m.group(2)) if m.group(1) == "Shlok" else None
        if not (lm and split_line(m.group(2)[lm.end():])):
            i += 1
            continue
        grp, j = [m], i + 1
        while (j < len(paras) and paras[j].group(1) == "Shlok" and body[paras[j - 1].end():paras[j].start()].strip() == ""
               and not LABEL.match(paras[j].group(2)) and split_line(paras[j].group(2))):
            grp.append(paras[j])
            j += 1
        rows = []
        for k, g in enumerate(grp):
            inner = g.group(2)
            if k == 0:
                label, inner = lm.group(1) + lm.group(2).strip(), inner[lm.end():]
            else:
                label = ""
            a, b = split_line(inner)
            rows.append('<span class="cph-l">%s</span><span class="cph-a">%s</span><span class="cph-d">।</span> '
                        '<span class="cph-b">%s</span><span class="cph-e">॥</span>' % (label, a, b))
        out.append(body[last:grp[0].start()])
        out.append('<p class="Shlok cph">%s</p>' % "\n".join(rows))
        last = grp[-1].end()
        n += 1
        i = j
    out.append(body[last:])
    return text[:lo] + "".join(out) + text[hi:], n


def parse_row(inner):
    """-> (label html, text html, mark, suffix) of one verse line"""
    m = LABEL.match(inner)
    if m:
        label, rest = m.group(1) + m.group(2).strip(), inner[m.end():]
    else:
        a = ANCHORS.match(inner)
        label, rest = a.group(1), inner[a.end():]
    rest = rest.strip()
    e = END.search(rest)
    if e:
        return label, rest[:e.start()].strip(), e.group(1), e.group(2).strip()
    return label, rest, "", ""


def convert_verses(text):
    lo = text.index(START)
    hi = text.index(STOP, lo)
    body = text[lo:hi]
    paras = list(ANY_PARA.finditer(body))
    groups, cur = [], []

    def close():
        nonlocal cur
        if cur:
            groups.append(cur)
        cur = []

    prev_end = None
    for m in paras:
        cls, inner = m.group(1), m.group(2)
        plain = TAG.sub("", inner).replace(" ", " ").strip()
        adjacent = prev_end is not None and body[prev_end:m.start()].strip() == ""
        prev_end = m.end()
        if cls not in ("Shlok", "Doha") or not plain:
            close()
            continue
        if not adjacent or LABEL.match(inner):
            close()
        cur.append(m)
        e = END.search(plain)
        if e and e.group(2):                      # a numbered verse end closes the block
            close()
    close()

    out, last, n_blocks, n_lines = [], 0, 0, 0
    for g in groups:
        if len(g) < 2:
            continue
        rows = [parse_row(m.group(2)) for m in g]
        cls = g[0].group(1)
        html_rows = []
        for label, txt, mark, suffix in rows:
            html_rows.append('<span class="vs-l">%s</span><span class="vs-t">%s</span><span class="vs-m">%s</span><span class="vs-s">%s</span>'
                             % (label, txt, mark, (" " + suffix) if suffix else ""))
        out.append(body[last:g[0].start()])
        out.append('<p class="%s vs">%s</p>' % (cls, "\n".join(html_rows)))
        last = g[-1].end()
        n_blocks += 1
        n_lines += len(g)
    out.append(body[last:])
    return text[:lo] + "".join(out) + text[hi:], n_blocks, n_lines


KANDAS = ("बालकाण्ड", "अयोध्याकाण्ड", "अरण्यकाण्ड", "किष्किन्धाकाण्ड", "सुन्दरकाण्ड", "लंकाकाण्ड", "उत्तरकाण्ड")
PARAYAN_END = re.compile(r'<p class="TXT-Right">((मासपारायण|नवाह्नपारायण), ([^<]+?) विश्राम)</p>')
HEADING_P = re.compile(r'<p\b([^>]*)\bclass="Heading"([^>]*)>(.*?)</p>', re.S)
P_OPEN = re.compile(r"<p\b([^>]*)>")
MODE_KEY = {"मासपारायण": "masa", "नवाह्नपारायण": "navah"}


def add_parayan_pages(text):
    """Reading modes of the Ramcharitmanas: मास-पारायण (30 days), नवाह्न-पारायण (9 days) and अखण्ड पाठ (one page per kāṇḍa).

    Each day of a पारायण ends with the book's own line  <p class="TXT-Right">मासपारायण, छठा विश्राम</p>  (or नवाह्नपारायण, ...).  The
    reader builds its pages from Headings and Sub-Headings, so both modes' day headings are written into the book and tagged with
    data-mode="masa" / "navah"; the reader keeps the ones of the mode the reader chose and drops the rest (अखण्ड पाठ keeps neither, so a
    kāṇḍa is one page).  Two kinds of element:
      * mid-kāṇḍa day start   <p class="Sub-Heading" data-mode data-day data-whole-page="1">मासपारायण, दूसरा दिन</p>  just before the first
        paragraph of the day -- unless the day begins at a kāṇḍa, whose own Heading then opens the page;
      * the day under a kāṇḍa Heading   <p class="Shrihari" data-mode data-day>नवाह्नपारायण, चौथा दिन</p>  right after each of the seven
        kāṇḍa Headings: the day that is running at that point, in either mode.
    The seven kāṇḍa Headings and every day heading carry data-whole-page="1" so the reader never cuts these pages again by size."""
    # the seven kāṇḍa headings keep their page whole (done on the whole text: the first heading's opening tag lies just before START)
    def mark_kanda(m):
        t = TAG.sub("", m.group(3)).strip()
        if t in KANDAS and "data-whole-page" not in m.group(0):
            return '<p%sclass="Heading"%s data-whole-page="1">%s</p>' % (m.group(1), m.group(2), m.group(3))
        return m.group(0)
    text = HEADING_P.sub(mark_kanda, text)
    lo = text.index(START)
    hi = text.index(STOP, lo)
    lo = text.rfind("<p", 0, lo)                              # the first kāṇḍa Heading's own opening tag
    body = text[lo:hi]

    ends = {"masa": [], "navah": []}                           # per mode: [(start, end, ordinal word)]
    skippable = []                                             # every पारायण end line, either mode
    for m in PARAYAN_END.finditer(body):
        mode = MODE_KEY[m.group(2)]
        ends[mode].append((m.start(), m.end(), m.group(3).strip()))
        skippable.append((m.start(), m.end()))
    if len(ends["masa"]) != 30 or len(ends["navah"]) != 9:
        raise SystemExit("expected 30 + 9 पारायण end lines, found %d + %d" % (len(ends["masa"]), len(ends["navah"])))
    NAME = {"masa": "मासपारायण", "navah": "नवाह्नपारायण"}

    inserts = []                                               # (position, html)

    def next_content_p(pos):
        """the first <p> at or after pos that is not a पारायण end line: (open-tag match, paragraph html)"""
        while True:
            m = P_OPEN.search(body, pos)
            if not m:
                return None
            close = body.index("</p>", m.end()) + 4
            para = body[m.start():close]
            if PARAYAN_END.match(para):
                pos = close
                continue
            return m, para

    n_mid = 0
    for mode in ("masa", "navah"):
        for n in range(2, len(ends[mode]) + 1):
            _, marker_end, _ = ends[mode][n - 2]
            hit = next_content_p(marker_end)
            if hit is None:
                continue
            m, para = hit
            # right after the day's end line come a kāṇḍa's closing lines (class Chapter-End-Text): that kāṇḍa has just ended, so this day
            # begins at the next kāṇḍa, whose own page opens it; otherwise the day begins here, mid-kāṇḍa
            if 'class="Chapter-End-Text"' in m.group(0) or 'class="Heading"' in m.group(0):
                continue
            ordinal = ends[mode][n - 1][2]
            inserts.append((m.start(), '<p class="Sub-Heading" id="manas_%s_day_%d" data-mode="%s" data-day="%d" data-whole-page="1">%s, %s दिन</p>\n'
                            % (mode, n, mode, n, NAME[mode], ordinal)))
            n_mid += 1

    # the day that is running at each kāṇḍa Heading, in both modes, right after the Heading
    n_head = 0
    for hm in HEADING_P.finditer(body):
        if TAG.sub("", hm.group(3)).strip() not in KANDAS:
            continue
        labels = []
        for mode in ("masa", "navah"):
            day = sum(1 for s, e, _ in ends[mode] if e <= hm.start()) + 1
            ordinal = ends[mode][day - 1][2]
            labels.append('<p class="Shrihari" data-mode="%s" data-day="%d">%s, %s दिन</p>\n' % (mode, day, NAME[mode], ordinal))
        inserts.append((hm.end(), "\n" + "".join(labels)))
        n_head += 1

    for pos, html_ in sorted(inserts, key=lambda x: x[0], reverse=True):
        body = body[:pos] + html_ + body[pos:]
    return text[:lo] + body + text[hi:], n_mid, n_head


def fold(t):
    """ष / श read as स (the two editions spell some words differently: अतिसय / अतिषय)"""
    return t.replace("ष", "स").replace("श", "स")


def add_book_subheadings(text, report=False):
    """Book reading mode: the sub-headings of the "श्रीरामचरितमानस (सटीक)" edition, at the same places.

    tools/data/manas_book_subheadings.json (made by tools/data/extract_manas_book_subheadings.py from that edition) lists its 211 sub-headings of
    the seven सोपान: id, title, range, and the first verse line that follows each.  Each is written into this book, before the label paragraph
    ("श्लोक" ...) of that verse if there is one, as

        <p id="Chapter_5_3" class="Sub-Heading" data-mode="book" data-own-page="1" data-whole-page="1">ब्राह्मण-संत-वन्दना <br> <span class="sh_tl">(दोहा २-३)</span></p>

    (title only when the edition gives no range).  The verse line is found by walking the book in order from the previous match, comparing the
    letters of the line (norm()), so spelling variants (संत / सन्त) and the "दो०—" labels do not matter, and the order of the sub-headings can never
    be broken.  data-mode="book" makes the reader keep them in the Book reading mode only; data-own-page="1" makes each start its own page."""
    subs = json.loads(BOOK_SUBS.read_text(encoding="utf-8"))
    lo = text.index(START)
    hi = text.index(STOP, lo)
    lo = text.rfind("<p", 0, lo)
    body = text[lo:hi]
    paras = []                                                  # (start, plain text, class)
    for m in re.finditer(r'<p class="([^"]+)">(.*?)</p>', body, re.S):
        paras.append((m.start(), html.unescape(TAG.sub("", m.group(2))).strip(), m.group(1)))
    VERSE = ("Shlok", "Doha", "Sortha", "Chhand", "Uvaacha", "Shlok-Number")
    inserts, k, problems = [], 0, []
    for sh in subs:
        key = sh["key"]
        fk = fold(key)

        def find(test, frm):
            j = frm
            while j < len(paras) and not (paras[j][2].split()[0] in VERSE and paras[j][1] not in LABELS and test(fold(norm(paras[j][1])))):
                j += 1
            return j
        j = find(lambda t: t.startswith(fk), k)
        if j >= len(paras):                                     # a misprint in the line's first word (e.g. "पे्रम"): match its middle instead
            j = find(lambda t: fk[5:21] in t[:48], k)
        if j >= len(paras):
            problems.append((sh["id"], "not found", sh["verse"][:40]))
            continue
        if j - k > 400:
            problems.append((sh["id"], "far (%d paragraphs) " % (j - k), sh["verse"][:40]))
        at = j
        while at - 1 >= 0 and paras[at - 1][1] in LABELS and j - at < sh["labels"] + 1:   # the label paragraph(s) of this verse
            at -= 1
        rng = (' <br> <span class="sh_tl">%s</span>' % sh["range"]) if sh["range"] else ""
        inserts.append((paras[at][0], '<p id="%s" class="Sub-Heading" data-mode="book" data-own-page="1" data-whole-page="1">%s%s</p>\n'
                        % (sh["id"], html.escape(sh["title"], quote=False), rng)))
        k = j + 1
    if report:
        for pid, why, v in problems:
            print("  !!", pid, why, v)
    for pos, h in sorted(inserts, key=lambda x: x[0], reverse=True):
        body = body[:pos] + h + body[pos:]
    return text[:lo] + body + text[hi:], len(inserts), problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    text = (BACKUP if BACKUP.exists() else BOOK).read_text(encoding="utf-8")      # always start from the original book
    text, n_book, problems = add_book_subheadings(text, report=True)
    print("Book mode sub-headings written:", n_book, " problems:", len(problems))
    new, chhands = convert_chhand_halves(text)
    new, done, skipped = convert(new)
    new, blocks, lines = convert_verses(new)
    new, mid, under = add_parayan_pages(new)
    print("पारायण day headings (mid-kāṇḍa, both modes):", mid, "| day labels under the kāṇḍa Headings:", under)
    print("chhands written as half-columns:", chhands)
    print("chaupai lines converted:", done, " other Shlok lines left alone:", skipped)
    print("verse blocks (doha / sortha / chhand / shloka):", blocks, " from", lines, "lines",
          " size %.0f -> %.0f KB" % (len(text.encode()) / 1024, len(new.encode()) / 1024))
    if a.dry_run:
        return
    if not BACKUP.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(BOOK, BACKUP)
    BOOK.write_text(new, encoding="utf-8", newline="")
    print("written:", BOOK)


if __name__ == "__main__":
    main()

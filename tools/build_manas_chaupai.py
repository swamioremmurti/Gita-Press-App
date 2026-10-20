#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_manas_chaupai.py -- lay the chaupai lines of "श्रीरामचरितमानस" out in columns.

A chaupai line of the book is one paragraph   <p class="Shlok">पद । पद ॥</p>.   This turns each of them, in the seven kāṇḍas, into

    <p class="Shlok cp"><span class="cp-a">पद</span><span class="cp-d">।</span> <span class="cp-b">पद</span><span class="cp-e">॥</span></p>

and master.css (p.Shlok.cp) gives the two halves the same width and the । and ॥ a column each, so the । are in line down the page,
the ॥ are in line, and each half is justified to its column.  The class stays "Shlok" (the reader and the search look for it) with
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

The first run keeps a copy of the book in backups/before-manas-chaupai/.  Re-running is safe: lines already split are skipped.
Usage:  python tools/build_manas_chaupai.py [--dry-run]
"""
import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
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
        label = ""
        return ('<p class="Shlok cp">%s<span class="cp-a">%s</span><span class="cp-d">।</span> '
                '<span class="cp-b">%s</span><span class="cp-e">॥</span></p>' % (label, a, b))

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    text = BOOK.read_text(encoding="utf-8")
    new, chhands = convert_chhand_halves(text)
    new, done, skipped = convert(new)
    new, blocks, lines = convert_verses(new)
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

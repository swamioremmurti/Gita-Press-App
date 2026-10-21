#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract_manas_book_subheadings.py -- read the sub-headings of the "श्रीरामचरितमानस (सटीक)" edition (the seven सोपान) into a small JSON.

Source: "श्रीरामचरितमानस (सटीक) प्रथम पृष्ठ.html".  Its sub-headings are  <p id="toc_marker-K-M" class="Sub-Heading">(दोहा २-३) ब्राह्मण-संत-वन्दना</p>
with K = 5 ... 11 for the seven सोपान (K counts the book's Headings: निवेदन 1, प्रश्नावली 2, पारायण-विधि 3, ध्यानम् 4, बालकाण्ड 5 ...).  Group 4
(an alphabetical list) is not part of the text and is left out.

For each sub-heading the JSON keeps what is needed to find the same place in our book without the 4 MB source:
    id      "Chapter_5_3"                       (toc_marker-5-3 -> Chapter_5_3)
    title   "ब्राह्मण-संत-वन्दना"
    range   "(दोहा २-३)"  or ""                  (the bracket at the start of the heading, if there is one)
    key     the first verse line that follows, reduced to its letters (see norm())
    labels  how many label-only paragraphs ("श्लोक", "सोरठा", "दोहा", "छन्द") stand between the heading and that verse line
    verse   the verse line itself (for people reading the JSON)

Usage:  python tools/data/extract_manas_book_subheadings.py [--src PATH]
"""
import argparse
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_SRC = Path(r"C:\Users\megha\Downloads\श्रीरामचरितमानस (सटीक) प्रथम पृष्ठ.html")
OUT = HERE / "manas_book_subheadings.json"
LABELS = {"श्लोक", "दोहा", "सोरठा", "सोरठे", "छन्द", "छंद", "चौपाई", "हरिगीतिका", "तोटक", "छप्पय", "त्रिभङ्गी", "बरवै"}
VERSE_CLASSES = ("Shlok-Color--1", "Shlok-Color-2", "SHLOK-Black", "Shlok-New", "Shlok-Color")


def norm(text):
    """The letters of a verse line, spelling variants folded: no spaces, digits, punctuation, marks or numbers; ं ँ ः and the nasal conjuncts
    (न् म् ण् ङ् ञ्) dropped so that संत / सन्त, सिंधु / सिन्धु read alike."""
    t = html.unescape(text)
    t = re.sub(r"^\s*(?:दो|सो|छं|छ)०\s*[—–-]\s*", "", t)             # a label written in front of the line ("सो०—")
    t = re.sub(r"[नमणङञ]\u094d", "", t)
    t = re.sub(r"[\u0901\u0902\u0903\u093c\u093d\u094d\u200c\u200d]", "", t)
    return "".join(ch for ch in t if "\u0904" <= ch <= "\u094c" or ch in "\u0960\u0961")


def plain(raw):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw))).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(DEFAULT_SRC))
    a = ap.parse_args()
    s = Path(a.src).read_text(encoding="utf-8")
    paras = []
    for m in re.finditer(r"<p\b([^>]*)>(.*?)</p>", s, re.S):
        c = re.search(r'class="([^"]*)"', m.group(1))
        i = re.search(r'id="([^"]*)"', m.group(1))
        paras.append({"cls": c.group(1) if c else "", "id": i.group(1) if i else "", "text": plain(m.group(2))})
    out = []
    skipped = []
    for k, p in enumerate(paras):
        mm = re.match(r"toc_marker-(\d+)-(\d+)$", p["id"])
        if not mm or p["cls"].split()[0] != "Sub-Heading" or not (5 <= int(mm.group(1)) <= 11):
            continue
        text = p["text"]
        if text in LABELS or "para-style-override" in p["cls"]:          # a label paragraph that carries the Sub-Heading class by mistake
            skipped.append((p["id"], text))
            continue
        rng = re.match(r"^(\([^)]*\))\s*(.*)$", text)
        title, rg = (rng.group(2), rng.group(1)) if rng else (text, "")
        labels, verse = 0, None
        for q in paras[k + 1:k + 40]:
            if (q["cls"].split()[0] == "Sub-Heading" and q["text"] not in LABELS) or q["cls"] == "Heading":
                break
            if q["text"] in LABELS:
                labels += 1
                continue
            if q["cls"].split()[0] in VERSE_CLASSES and len(norm(q["text"])) >= 12:
                verse = q["text"]
                break
        out.append({"id": "Chapter_%s_%s" % (mm.group(1), mm.group(2)), "kanda": int(mm.group(1)), "title": title.strip(), "range": rg,
                    "key": norm(verse)[:26] if verse else "", "labels": labels, "verse": verse or ""})
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("sub-headings:", len(out), " no verse line found:", sum(1 for o in out if not o["key"]), " skipped:", skipped)
    for kd in range(5, 12):
        print("  सोपान", kd, ":", sum(1 for o in out if o["kanda"] == kd))


if __name__ == "__main__":
    main()

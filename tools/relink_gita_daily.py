#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
relink_gita_daily.py -- point the site's Gita data (daily card, Gita LMS, shloka audio) at the Gita book that is
live now: "श्रीमद्भगवद्गीता तत्त्वविवेचनी (पदच्छेद-अन्वयसहित)".

assets/data/v1/gita/chNN.json holds each shloka (text, meaning) with "id": the anchor of that shloka in the book
(the reader opens the book there). The old edition is switched off, so every "id" is re-read from the new book,
where each shloka (or shloka-group, "श्लोक ४-६") is a <p class="Sub-Heading" id="Chapter_K_M">.

  id   anchor of the sub-chapter that holds the shloka (the earliest one that covers it)
  f    1 when the shloka is the first of its sub-chapter -- only that one gets a play button in the reader

Run:   python tools/relink_gita_daily.py && python tools/build_shloka_audio_index.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html"
DATA = ROOT / "assets" / "data" / "v1" / "gita"
DEVA = "०१२३४५६७८९"


def num(s):
    return int("".join(str(DEVA.index(c)) for c in s))


def main():
    html = BOOK.read_text(encoding="utf-8")
    chapters = []                       # [[(first, last, id), ...], ...] in book order
    for m in re.finditer(r'<p id="(Chapter_[\d_]+)" class="(Heading|Sub-Heading)">(.*?)</p>', html):
        pid, cls, text = m.groups()
        text = re.sub(r"<[^>]+>", "", text).strip()
        if cls == "Heading":
            if re.search(r"ऽध्याय:?$", text) or text.startswith("अथाष्टमोऽ"):
                chapters.append([])
            else:
                chapters.append(None)       # a front/end section: no verses
            continue
        mm = re.fullmatch(r"श्लोक\s+([०-९]+)(?:-([०-९]+))?", text)
        if mm and chapters and chapters[-1] is not None:
            a = num(mm.group(1))
            b = num(mm.group(2)) if mm.group(2) else a
            chapters[-1].append((a, b, pid))
    chapters = [c for c in chapters if c is not None]
    if len(chapters) != 18:
        raise SystemExit("expected 18 chapters, found %d" % len(chapters))

    idx = json.loads((DATA / "index.json").read_text(encoding="utf-8"))
    idx["file"] = BOOK.name
    (DATA / "index.json").write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    missing = 0
    for ci, units in enumerate(chapters, 1):
        f = DATA / ("ch%02d.json" % ci)
        data = json.loads(f.read_text(encoding="utf-8"))
        for e in data["shlokas"]:
            v = int(re.match(r"\d+", e["v"]).group(0))
            hit = next(((a, b, pid) for a, b, pid in units if a <= v <= b), None)
            if not hit:
                missing += 1
                print("no sub-chapter for %d.%s" % (ci, e["v"]))
                continue
            e["id"] = hit[2]
            e["f"] = 1 if hit[0] == v else 0
        f.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("relinked %d chapters; shlokas without a sub-chapter: %d" % (len(chapters), missing))


if __name__ == "__main__":
    main()

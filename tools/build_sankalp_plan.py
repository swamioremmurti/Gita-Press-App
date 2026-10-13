#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_sankalp_plan.py -- add the size of every day's portion to assets/data/v1/manas/plan.json.

plan.json (made by build_daily_data.py) lists the 9-day नवाह्नपारायण and 30-day मासपारायण portions, found from the
printed "नवाह्नपारायण, ... विश्राम" / "मासपारायण, ... विश्राम" marks of the Gita Press edition. The पाठ-संकल्प
feature (swadhyay-sankalp.js) also needs, per day:

    "l"   number of verse lines (Shlok paragraphs) in that day's portion  -> reading-time estimate and a
          progress figure weighted by what was really read
    "end" the day's closing point is the next day's opening ("id"); for the last day it is the book's
          closing section, so nothing extra is stored for it

It reads the LIVE book (the one the reader serves), so it can be run again any time:

    python tools/build_sankalp_plan.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "श्रीरामचरितमानस.html"
PLAN = ROOT / "assets" / "data" / "v1" / "manas" / "plan.json"

SHLOK = re.compile(r'<p class="Shlok"')
END_HEAD = re.compile(r'<p class="Heading[^"]*">[^<]*आरती')


def main():
    html = BOOK.read_text(encoding="utf-8")
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    # the book's closing section: the first "आरती" heading after the last kanda begins
    last_start = html.find('id="manas_masa_30"')
    m = END_HEAD.search(html, last_start)
    book_end = m.start() if m else len(html)
    for key in ("navah", "masa"):
        days = plan[key]
        pos = []
        for d in days:
            at = html.find('id="%s"' % d["id"])
            if at < 0:
                raise SystemExit("anchor missing in the book: " + d["id"])
            pos.append(at)
        pos.append(book_end)
        total = 0
        for i, d in enumerate(days):
            d["l"] = len(SHLOK.findall(html, pos[i], pos[i + 1]))
            total += d["l"]
        print("%s: %d days, %d lines, per day %d-%d" % (key, len(days), total, min(x["l"] for x in days), max(x["l"] for x in days)))
    PLAN.write_text(json.dumps(plan, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()

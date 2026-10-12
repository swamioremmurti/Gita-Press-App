#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ganesh_puran_postprocess.py -- tidy the converter's output for संक्षिप्त श्रीगणेशपुराण.

The Word file gives every chapter TWO heading paragraphs ("पहला अध्याय" as Heading 1 and the chapter's
title as Heading 2), and the converter turns each into a section of its own. This pass puts them back
together as the library's usual single heading ("पहला अध्याय — <title>"), pulls the two part-title
pages (उपासना-खण्ड / क्रीडाखण्ड) out of the chapter they trail, and folds the four small
विनियोग / ऋष्यादिन्यास / ध्यान headings into their chapter.

Run after build (see run_ganesh.py), on the generated file:
    python tools/ganesh_puran_postprocess.py "Gita Press Books/Gita Press Books/संक्षिप्त श्रीगणेशपुराण.html"
"""
import re
import sys
from pathlib import Path

HR = "\n\n<hr class=\"page-break\">\n\n"
PARA = re.compile(r"<p\b[^>]*>.*?</p>", re.S)
OPENER = {"॥श्रीगणेशाय नमः॥", "॥ श्रीगणेशाय नमः॥"}


def plain(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h).replace("&nbsp;", " ")).strip()


def cls(p):
    m = re.match(r'<p\b[^>]*class="([^"]*)"', p)
    return m.group(1) if m else ""


def paras_of(section):
    return PARA.findall(section)


def heading(text, kind="Heading"):
    return f'<p class="{kind}">{text}</p>'


def main(path):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    start = text.index("<section")
    end = text.rindex("</section>") + len("</section>")
    prefix, suffix = text[:start], text[end:]
    sections = text[start:end].split(HR)
    cover, body = sections[0], [paras_of(s) for s in sections[1:]]

    # ---- 1. pull each part-title page out of the chapter it trails
    split = []
    for paras in body:
        k = next((i for i, p in enumerate(paras) if plain(p) in OPENER), None)
        if k is None or k == 0:
            split.append(paras)
            continue
        keep, opener = paras[:k], paras[k:]
        names = [plain(p) for p in opener]
        if "[ उत्तरार्ध ]" in names:
            title = "उत्तरार्ध — क्रीडाखण्ड"
            opener = [p for p in opener if plain(p) not in ("[ उत्तरार्ध ]", "क्रीडाखण्ड")]
        else:
            title = "पूर्वार्ध — उपासना–खण्ड"
            opener = [p for p in opener if plain(p) != "उपासना–खण्ड"]
        split.append(keep)
        split.append([heading(title)] + opener)
        print("part title page:", title)

    # ---- 2. Heading + Sub-Heading -> one heading; Sub-Heading-2 -> folded into the section above
    out = []
    merged = folded = 0
    for paras in split:
        first = cls(paras[0]) if paras else ""
        prev = out[-1] if out else None
        if (first == "Sub-Heading" and prev and cls(prev[0]) == "Heading"
                and re.search(r"अध्याय$", plain(prev[0]))
                and not any(cls(p) in ("Heading", "Sub-Heading") for p in prev[1:])):
            joined = heading(plain(prev[0]) + " — " + plain(paras[0]))
            out[-1] = [joined] + prev[1:] + paras[1:]
            merged += 1
        elif first == "Sub-Heading-2" and prev is not None:
            prev.extend(paras)
            folded += 1
        else:
            out.append(list(paras))

    # ---- 3. renumber pages and heading ids
    sec_html = []
    toc = 0
    for i, paras in enumerate(out):
        lines = []
        for p in paras:
            c = cls(p)
            if c in ("Heading", "Sub-Heading", "Sub-Heading-2", "Sub-Heading-3"):
                toc += 1
                p = re.sub(r'^<p\b[^>]*class="([^"]*)"[^>]*>', lambda m: f'<p id="toc_marker-{toc}" class="{m.group(1)}">', p)
            lines.append("\t\t\t" + p)
        sec_html.append(f'<section class="epub-page" data-page="{i + 2}">\n<div>\n' + "\n".join(lines) + "\n\t\t</div>\n</section>")
    path.write_text(prefix + HR.join([cover] + sec_html) + suffix, encoding="utf-8")
    print(f"sections: {len(sections) - 1} -> {len(out)} | chapter headings merged: {merged} | small headings folded: {folded}")
    print(f"headings numbered: {toc} | size: {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main(sys.argv[1])

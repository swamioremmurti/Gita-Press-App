#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inline_karma_rahasya_svgs.py -- put the three diagrams of "कर्म रहस्य" into the book as inline SVG.

The book has three <img> placeholders (image/1_fmt.jpeg, 2_fmt.png, 3_fmt.jpeg -- the files themselves are not in the image folder).
By the text around them they are, in order:
    1  क्रियमाण कर्म   ->  Kriyamana_karma.svg
    2  संचित कर्म       ->  sanchit_karma_diagram.svg
    3  प्रारब्ध कर्म     ->  tools/svg/prabdakarma_big.svg  (prabdakarma.svg re-set in a bigger bold type and re-spaced)
Each <img> is replaced by the SVG, inline.  The SVGs share class names (.tree-line, .node-text) with different values, so every
<style> rule is scoped to its own figure id; the SVG is made fluid (viewBox kept, width 94 % like img.frame-1 in master.css,
capped at the drawing's useful width).  The first run keeps a copy of the book in backups/before-karma-svgs/.  Re-running is safe.

Usage:  python tools/inline_karma_rahasya_svgs.py [--dry-run]
"""
import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "कर्म रहस्य.html"
BACKUP = ROOT / "backups" / "before-karma-svgs" / BOOK.name
DL = Path(r"C:\Users\megha\Downloads")

FIGURES = [
    # (img src in the book, svg file, figure id, accessible title, widest it is shown (px))
    ("image/1_fmt.jpeg", DL / "Kriyamana_karma.svg", "krm-fig-kriyaman", "क्रियमाण कर्मके भेद", 900),
    ("image/2_fmt.png", DL / "sanchit_karma_diagram.svg", "krm-fig-sanchit", "संचित कर्मके अंश", 380),
    ("image/3_fmt.jpeg", ROOT / "tools" / "svg" / "prabdakarma_big.svg", "krm-fig-prarabdh", "प्रारब्ध कर्मके भेद", 1000),
]


def scope_css(css, uid):
    out = []
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for rule in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        sels = ", ".join("#%s %s" % (uid, x.strip()) for x in rule.group(1).split(",") if x.strip())
        out.append("%s{%s}" % (sels, " ".join(rule.group(2).split())))
    return "\n".join(out)


def inline_svg(path, uid, title, max_w):
    s = Path(path).read_text(encoding="utf-8").strip()
    s = re.sub(r"^<\?xml[^>]*\?>\s*", "", s)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    m = re.search(r"<style>(.*?)</style>", s, re.S)
    if m:
        s = s.replace(m.group(0), "<style>\n%s\n</style>" % scope_css(m.group(1), uid))
    s = re.sub(r"\n\s*\n+", "\n", s)
    head = re.search(r"<svg\b[^>]*>", s).group(0)
    vb = re.search(r'viewBox="([^"]+)"', head).group(1)
    new_head = ('<svg xmlns="http://www.w3.org/2000/svg" id="%s" viewBox="%s" role="img" aria-label="%s" '
                'style="display:block;width:94%%;max-width:%dpx;height:auto;margin:.4rem auto">' % (uid, vb, title, max_w))
    s = s.replace(head, new_head, 1)
    s = s.replace(new_head, new_head + "<title>%s</title>" % title, 1)
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    text = BOOK.read_text(encoding="utf-8")
    done = 0
    for src, svg, uid, title, max_w in FIGURES:
        pat = re.compile(r'<span><img class="frame-1" src="%s" alt="[^"]*"></span>&nbsp;' % re.escape(src))
        have = re.compile(r'<svg[^>]*id="%s".*?</svg>' % re.escape(uid), re.S)
        if have.search(text):                              # already inline: swap in the current drawing
            new = inline_svg(svg, uid, title, max_w)
            if have.search(text).group(0) == new:
                print("up to date:", uid)
                continue
            text = have.sub(lambda m: new, text, count=1)
        elif pat.search(text):
            text = pat.sub(lambda m: "<span>" + inline_svg(svg, uid, title, max_w) + "</span>", text, count=1)
        else:
            raise SystemExit("placeholder not found: " + src)
        done += 1
        print("inlined", svg.name, "->", uid)
    if a.dry_run or not done:
        return
    if not BACKUP.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(BOOK, BACKUP)
    BOOK.write_text(text, encoding="utf-8", newline="")
    print("written:", BOOK, " size %.0f KB" % (len(text.encode()) / 1024))


if __name__ == "__main__":
    main()

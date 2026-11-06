#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_kartaviryarjuna_merged.py -- "श्री कार्तवीर्यार्जुन मन्त्र" as ONE book: भाग १ (build_kartaviryarjuna.py) followed by भाग २ (build_kartaviryarjuna2.py).

It builds the two parts, joins their reader pages under one new title page, then removes the two part files and their catalogue entries.

  * title page: the invocations, the title, "(भाग - १ एवं भाग - २)", the two contents lines, the trust's logo and publisher
  * the two introduction pages become "भाग - १ : माहात्म्य एवं परिचय" and "भाग - २ : माहात्म्य एवं विधान"
  * every other page and heading is kept as it was; भाग २'s chapter ids continue after भाग १'s

    python tools/build_kartaviryarjuna_merged.py "<Part_1.docx>" "<Part_2.docx>"
"""
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402

TOOLS = Path(__file__).resolve().parent
NAME = "श्री कार्तवीर्यार्जुन मन्त्र"
P1 = "श्री कार्तवीर्यार्जुन मन्त्र 1"
P2 = "श्री कार्तवीर्यार्जुन मन्त्र 2"
PUBLISHER = "कल्याण सेवा ट्रस्ट"
LOGO = "kartaviryarjuna-1.png"
SEC = re.compile(r'<section class="epub-page" data-page="\d+">(.*?)</section>', re.S)


def sections(name):
    html = (b.BOOKS / (name + ".html")).read_text(encoding="utf-8")
    return [m.group(1) for m in SEC.finditer(html)], html


def _page(items):
    return '\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="Page-Break">&nbsp;</p>\n' + "".join(
        '\t\t\t<p%s class="%s">%s</p>\n' % (' id="Chapter_0"' if c == "Heading" else "", c, h) for c, h in items) + "\t\t</div>\n"


def bhumika_page():
    """tools/kartaviryarjuna_bhumika.txt: line 1 the title, line 2 the subtitle, then one paragraph per line ("* " = a bullet)."""
    ls = [x.strip() for x in (TOOLS / "kartaviryarjuna_bhumika.txt").read_text(encoding="utf-8").splitlines() if x.strip()]
    items = [("Heading", b.esc(ls[0])), ("Sub-Heading", b.esc(ls[1]))]
    for ln in ls[2:]:
        if ln.startswith("॥"):
            items.append(("Chapter-End-Text", b.esc(ln)))
        elif ln.startswith("* "):
            items.append(("Normal", "• " + b.esc(ln[2:])))
        elif len(ln) < 80 and not ln.endswith(("।", "—", ":")):
            items.append(("Sub-Heading-2", b.esc(ln)))
        else:
            items.append(("Normal", b.esc(ln)))
    return _page(items)


def parichay_page():
    """tools/kartaviryarjuna_parichay.md: # title, ## Sub-Heading, ### Sub-Heading-2, *italic*, **bold line** = closing line."""
    items = []
    for ln in [x.strip() for x in (TOOLS / "kartaviryarjuna_parichay.md").read_text(encoding="utf-8").splitlines() if x.strip()]:
        if ln.startswith("### "):
            items.append(("Sub-Heading-2", b.esc(ln[4:])))
        elif ln.startswith("## "):
            items.append(("Sub-Heading", b.esc(ln[3:])))
        elif ln.startswith("# "):
            items.append(("Heading", b.esc(ln[2:])))
        elif ln.startswith("**") and ln.endswith("**"):
            items.append(("Chapter-End-Text", b.esc(ln[2:-2])))
        else:
            items.append(("Normal", re.sub(r"\*([^*]+)\*", r'<span class="inline-28">\1</span>', b.esc(ln))))
    return _page(items)


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    for script, docx in (("build_kartaviryarjuna.py", sys.argv[1]), ("build_kartaviryarjuna2.py", sys.argv[2])):
        subprocess.run([sys.executable, "-I", "-X", "utf8", str(TOOLS / script), docx], check=True)
    s1, html1 = sections(P1)
    s2, _ = sections(P2)

    sub1 = re.findall(r'<p class="cover-subtitle">(.*?)</p>', s1[0])[1]          # the contents lines of the two parts
    sub2 = re.findall(r'<p class="cover-subtitle">(.*?)</p>', s2[0])[1]
    invocation = re.findall(r'<p class="cover-Shri-Hari">.*?</p>', s1[0])
    title = ('\n<div class="Basic-Graphics-Frame">\n' + "".join("\t\t\t%s\n" % p for p in invocation) +
             '\t\t\t<p class="cover-Book-Name">श्री कार्तवीर्यार्जुन मन्त्रः</p>\n'
             '\t\t\t<p class="cover-subtitle">(भाग - १ एवं भाग - २)</p>\n'
             '\t\t\t<p class="cover-subtitle">%s</p>\n\t\t\t<p class="cover-subtitle">%s</p>\n'
             '\t\t\t<p class="Normal" style="text-align:center;text-indent:0;margin:1em 0"><img src="image/%s" alt="%s" '
             'style="display:block;width:100px;max-width:100%%;height:auto;margin:1em auto"></p>\n'
             '\t\t\t<p class="cover-Publisher-Note">%s</p>\n\t\t</div>\n') % (sub1, sub2, LOGO, PUBLISHER, PUBLISHER)

    body1 = [s.replace(">माहात्म्य एवं परिचय</p>", ">भाग - १ : माहात्म्य एवं परिचय</p>") for s in s1[1:]]
    body2 = [s.replace(">माहात्म्य एवं विधान</p>", ">भाग - २ : माहात्म्य एवं विधान</p>") for s in s2[1:]]
    pages = [title, bhumika_page(), parichay_page()] + body1 + body2
    count = [0]                                                     # one running chapter number across the whole book

    def number(m):
        count[0] += 1
        return 'id="Chapter_%d"' % count[0]
    pages = [re.sub(r'id="Chapter_\d+"', number, pg) for pg in pages]

    head = html1[:html1.index("<body>")].replace("<title>श्री कार्तवीर्यार्जुन मन्त्र (भाग १)</title>", "<title>%s</title>" % NAME)
    assert "<title>%s</title>" % NAME in head
    hr = '\n\n<hr class="page-break">\n\n'
    out = head + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    ids = re.findall(r'id="(Chapter_\d+)"', out)
    if len(ids) != len(set(ids)) or "भाग - १ : माहात्म्य" not in out or "भाग - २ : माहात्म्य" not in out:
        raise SystemExit("the merge went wrong: %s" % ids)
    css = b.MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | b.STRUCTURAL
    bad = sorted({c for m in re.finditer(r'class="([^"]*)"', out) for c in m.group(1).split()} - defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)

    out_path = b.BOOKS / (NAME + ".html")
    b.write(out_path, out)
    size = round(out_path.stat().st_size / 1024, 1)
    print("wrote", out_path.name, "| %.1f KB" % size, "| pages:", len(pages), "| chapters:", len(ids))

    # the catalogue: the two parts out, the merged book in
    d = b.DATA_JS.read_text(encoding="utf-8")
    nl = "\r\n" if "\r\n" in d else "\n"
    d = re.sub(r',\s*\{\s*"file":\s*"%s\.html".*?\}' % re.escape(NAME), "", d, count=1, flags=re.S)   # a previous run's entry
    for part in (P1, P2):
        d, k = re.subn(r',\s*\{\s*"file":\s*"%s\.html".*?\}' % re.escape(part), "", d, count=1, flags=re.S)
        assert k == 1, part
        (b.BOOKS / (part + ".html")).unlink()
    entry = ('    {\n        "file":  "%s.html",\n        "category":  "Stotra evam Naamavali",\n        "author":  "",\n        "tikakar":  "",\n'
             '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, PUBLISHER, size)).replace("\n", nl)
    k = d.rindex("}" + nl + "];")
    b.write(b.DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
    img = b.IMG_DIR / "kartaviryarjuna-2.png"
    if img.exists():
        img.unlink()
    print("registered in swadhyay-data.js; the part files are removed (list the merged file in NON_GITA_PRESS_BOOKS in swadhyay-app.js)")


if __name__ == "__main__":
    main()

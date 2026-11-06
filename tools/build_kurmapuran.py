#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_kurmapuran.py -- import "संक्षिप्त कूर्मपुराण" (गीताप्रेस, गोरखपुर; the 'कल्याण' वर्ष ७१ विशेषाङ्क text: Sanskrit verses with their Hindi
rendering, पूर्वविभाग + उपरिविभाग / ईश्वरगीता, 51 + 44 chapters) from "कूर्मपुराण.docx" into the library.

The docx styles: center (the invocation lines) / Heading1 (नम्र निवेदन, "कूर्मपुराण [ पूर्वविभाग ]", "[ उपरिविभाग ]") / Heading2 ("पहला अध्याय") +
Heading3 (the chapter's subject) / Shlok (one line of a verse) / chapterend / right / plain paragraphs (the Hindi) ; 238 Word footnotes, one picture,
no tables. Mapping (master.css classes only), the layout of अग्निपुराण:

    title page    cover-Shri-Hari / cover-subtitle (संक्षिप्त) / cover-Book-Name / cover-Tvamev-mata / cover-Publisher-Note
    Heading1      Heading (नम्र निवेदन);  the two part titles -> Heading Main-Heading on the page of the part's first chapter, under a Page-Break invocation
    Heading2/3    Heading id Chapter_N ("पहला अध्याय") + Sub-Heading id Chapter_N_1 (its subject); one reader page per chapter
    Shlok         Shlok;   plain -> Normal;   chapterend -> Chapter-End-Text;   "—प्रकाशक" -> TXT-Right
    footnote      "[१]" in the text, "[१] note" Footnotes paragraphs right after it (the reader opens them in a modal)
    picture       p.Image > span > img.frame-1 (image/sankshipt-kurmapuran-01.*), where the docx has it, at the end of the पूर्वविभाग
  * what the Word conversion left of the printed page is cleaned: the page marks ("पृष्ठ १५३", a running "अध्याय ३५"), blank paragraphs, the word
    joiner U+2060 around dandas, one footnote with no text (its mark is dropped) and a lone "*" line without a note;
  * the printed page-bottom notes the docx typed as plain paragraphs ("* ...", "१—...", "पाद-टिप्पणियाँ:" + "१-...") are Footnotes paragraphs, kept
    where the docx has them (they carry no link to their word);
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --apply --only "संक्षिप्त कूर्मपुराण.html".

    python tools/build_kurmapuran.py "<कूर्मपुराण.docx>"
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_panini_shiksha as b  # noqa: E402  (its docx reader and run helpers)
import book_converter as bc  # noqa: E402

NAME = "संक्षिप्त कूर्मपुराण"
OUT = b.BOOKS / (NAME + ".html")
PUBLISHER = "गीताप्रेस"
HEAD = b.HEAD.replace("<title>%s</title>" % b.NAME, "<title>%s</title>" % NAME)
IMG = "sankshipt-kurmapuran-01"

_orig_parse = b.parse_par


class _Notes(dict):
    def __missing__(self, key):                              # a reference to a note without text: marked [०], removed below
        return 0


def parse(p, rels, fn_no):
    par = _orig_parse(p, rels, _Notes(fn_no))
    par["pieces"] = [(i, bd, t.replace("[०]", "").replace("⁠", "")) for i, bd, t in par["pieces"]]
    par["fns"] = [f for f in par["fns"] if f in fn_no]
    return par


b.parse_par = parse


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    z, items, notes, fn_no = b.read_docx(sys.argv[1])
    stat = {"chapters": 0, "notes": 0, "manual_notes": 0, "dropped": 0, "shlok": 0, "images": 0}
    pages, cur = [], None
    chap_no, sub_no = 0, 0
    main_open = False

    def new_page(tops=("&nbsp;",)):
        nonlocal cur
        if cur is not None:
            pages.append("\n<div class=\"Basic-Graphics-Frame\">\n" + "".join(cur) + "\t\t</div>\n")
        cur = ['\t\t\t<p class="Page-Break">%s</p>\n' % t for t in tops]

    def add(cls, html, attrs=""):
        cur.append('\t\t\t<p%s class="%s">%s</p>\n' % (attrs, cls, html))

    def add_notes(it):                                        # the Word notes cited in a paragraph, right after it
        for fid in it["fns"]:
            for k, ptxt in enumerate(notes[fid]):
                stat["notes"] += 1
                add("Footnotes", b.esc(("[%s] " % b.to_deva(fn_no[fid]) if k == 0 else "") + ptxt))

    # --- title page
    title = ['\n<div class="Basic-Graphics-Frame">\n', '\t\t\t<p class="cover-Shri-Hari">॥ श्रीहरिः ॥</p>\n',
             '\t\t\t<p class="cover-subtitle">संक्षिप्त</p>\n', '\t\t\t<p class="cover-Book-Name">कूर्मपुराण</p>\n',
             '\t\t\t<p class="cover-Tvamev-mata">&nbsp;</p>\n']
    for ln in ("त्वमेव माता च पिता त्वमेव", "त्वमेव बन्धुश्च सखा त्वमेव।", "त्वमेव विद्या द्रविणं त्वमेव", "त्वमेव सर्वं मम देवदेव॥"):
        title.append('\t\t\t<p class="cover-Tvamev-mata">%s</p>\n' % ln)
    title += ['\t\t\t<p class="cover-Tvamev-mata">&nbsp;</p>\n',
              '\t\t\t<p class="cover-Publisher-Note">गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।</p>\n', "\t\t</div>\n"]
    pages.append("".join(title))

    first = next(n for n, it in enumerate(items) if it.get("st") == "Heading1")
    prev_text = ""
    for n, it in enumerate(items):
        if n < first:
            continue                                         # the docx's own invocation lines are on the title page
        st = it["st"]
        txt = b.tidy(b.plain(it).replace("\n", " "))
        if it["figs"]:
            if cur is None:
                raise SystemExit("picture before the first page")
            blob, ext = bc.optimize_image(z.read("word/" + it["figs"][0]), Path(it["figs"][0]).suffix.lower(), 250 * 1024)
            b.write(b.IMG_DIR / (IMG + ext), blob)
            add("Image", '<span><img class="frame-1" src="image/%s%s" alt=""></span>' % (IMG, ext))
            stat["images"] += 1
            continue
        if not txt or txt == "*":
            if txt == "*":
                stat["dropped"] += 1
            continue
        if st == "" and (re.fullmatch(r"पृष्ठ [०-९]+", txt) or re.fullmatch(r"अध्याय [०-९]+", txt)):
            stat["dropped"] += 1                              # a printed page mark / running head left in the text
            continue
        if st == "center":                                    # the invocation lines before the Main-Heading page
            prev_text = txt
            continue
        if st == "Heading1":
            chap_no += 1
            if txt.startswith("नम्र निवेदन"):
                new_page(["॥ श्रीहरिः ॥"])
                add("Heading", b.esc(txt), ' id="Chapter_%d"' % chap_no)
                main_open = False
            else:                                             # "कूर्मपुराण [ पूर्वविभाग ]" / "[ उपरिविभाग ]"
                part = re.search(r"\[\s*(\S+)\s*\]", txt).group(1)
                new_page(["॥ श्रीहरिः ॥", "॥ ॐ श्रीपरमात्मने नमः ॥"])
                add("Heading Main-Heading", "कूर्मपुराण [%s]" % b.esc(part), ' id="Chapter_%d"' % chap_no)
                main_open = True
            continue
        if st == "Heading2":
            chap_no += 1
            sub_no = 0
            stat["chapters"] += 1
            if not main_open:
                new_page()
            main_open = False
            add("Heading", b.esc(txt), ' id="Chapter_%d"' % chap_no)
            continue
        if st == "Heading3":
            sub_no += 1
            add("Sub-Heading", b.esc(txt), ' id="Chapter_%d_%d"' % (chap_no, sub_no))
            add_notes(it)
            continue
        if st == "chapterend":
            add("Chapter-End-Text", b.esc(txt))
            continue
        if st == "right":
            add("TXT-Right", b.esc(txt))
            continue
        if st == "Shlok":
            stat["shlok"] += 1
            add("Shlok", b.esc(txt))
            continue
        if txt == "पाद-टिप्पणियाँ:":
            add("Footnotes-Bold", b.esc(txt))
            continue
        if re.match(r"\*\s+\S", txt) or re.match(r"[०-९]+\s*[-—]\S", txt):     # a printed page-bottom note typed as a paragraph
            stat["manual_notes"] += 1
            add("Footnotes", b.esc(txt))
            continue
        add("Normal", b.inline_html(it))
        add_notes(it)
    new_page()                                                # flush the last page

    hr = '\n\n<hr class="page-break">\n\n'
    out = HEAD + "<body>\n\n" + hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, pg) for i, pg in enumerate(pages)) + "\n\n</body>\n</html>"

    css = b.MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | b.STRUCTURAL
    used = set()
    for m in re.finditer(r'class="([^"]*)"', out):
        used.update(m.group(1).split())
    bad = sorted(c for c in used if c not in defined)
    if bad:
        raise SystemExit("classes master.css does not have: %s" % bad)
    if "\u0003" in out or "\u0001" in out or "⁠" in out:
        raise SystemExit("a Word marker is left")
    ids = re.findall(r'id="(Chapter_\d+(?:_\d+)?)"', out)
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate chapter ids")
    marks = len(re.findall(r"\[[०-९]+\]", out))
    cited = len({f for it in items if "pieces" in it for f in it["fns"]})
    if marks != 2 * cited:
        raise SystemExit("footnote marks %d, expected %d" % (marks, 2 * cited))

    b.write(OUT, out)
    size = round(OUT.stat().st_size / 1024, 1)
    print("wrote", OUT.name, "| %.1f KB" % size, "| pages:", len(pages), "| ids:", len(ids), "| notes cited:", cited, "| stats:", stat)

    d = b.DATA_JS.read_text(encoding="utf-8")
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        b.write(b.DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated")
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Purans",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "%s",\n        "sizeKB":  %s\n    }\n' % (NAME, PUBLISHER, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        b.write(b.DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

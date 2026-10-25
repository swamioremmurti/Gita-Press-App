#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_laghusiddhanta_kaumudi.py -- (re)import "लघुसिद्धान्तकौमुदी" from "लघुसिद्धान्तकौमुदी प्रथम पृष्ठ.html" into the library, the way every Gita Press
book is processed (see tools/build_sadhan_kalpataru.py), and put the tables back as inline SVG:

  * the head is the library's (master.css linked, nothing else), the title is the book's own;
  * the export's "प्रथम पृष्ठ" / "अंतिम पृष्ठ" labels are dropped; the "गीता सेवा ट्रस्ट" title-page line becomes the library's publisher note;
  * the old export class names become the library's:  Title-Page---X / Titel-Page---X -> cover-X,  char-style-override-14/15/16 ->
    Shlok-part-2/3/4,  char-style-override-2 -> rg-it;   the contents anchors toc_marker-N-M become Chapter_N_M;
  * footnotes are made to open in the reader's tap-to-open modal (swadhyay-footnotes.js): a note numbered "१-" is written "१. " (a mark the reader
    knows; "*" notes already are);
  * the four pictures of the export (placeholders image/image_N_fmt.png, which the library does not have) are the tables you converted to SVG:
        image_2  स्वरभेद तालिका                              -> inside the footnote it belongs to ("३. अचामष्टादशभेदविवरणम्—"), so the modal shows it
        image_3  वर्णोच्चारणस्थानकोष्ठकम्                      -> in the text, where it stands
        image_4  आभ्यन्तर-बाह्यप्रयत्नकोष्ठकम्                 -> inside its footnote ("२-आभ्यन्तरबाह्यप्रयत्नज्ञानार्थकं कोष्ठकम्—")
        image_1  (the pratyahara count table)                 -> no SVG was supplied: the picture is left out, its caption stays
    and the page "लघुसिद्धान्तकौमुद्यांगणेष्वपठितानामुत्तरत्र समुदाहृतानां च धातूनां संग्रहः" (missing from this export) is put back
    before the गणपाठ, with the three धातवः tables;
  * the colons typed for visarga are put right afterwards with tools/fix_visarga_colon.py --only "लघुसिद्धान्तकौमुदी.html".

The book already in the library is first copied to backups/before-laghusiddhanta-reimport/.

    python tools/build_laghusiddhanta_kaumudi.py "<export.html>" "<folder with the .svg files>"
"""
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
NAME = "लघुसिद्धान्तकौमुदी"
OUT = BOOKS / (NAME + ".html")
BACKUP = ROOT / "backups" / "before-laghusiddhanta-reimport"
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}
SECTION = re.compile(r'<section class="epub-page" data-page="\d+">(.*?)</section>', re.S)

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME

CLASS_MAP = {
    "Titel-Page---Shri-Hari": "cover-Shri-Hari", "Title-Page---Book-Name": "cover-Book-Name", "Title-Page---Author-Name": "cover-Author-Name",
    "Title-Page---Gita-Seva-Trust": "cover-Publisher-Note",
    "char-style-override-14": "Shlok-part-2", "char-style-override-15": "Shlok-part-3", "char-style-override-16": "Shlok-part-4",
    "char-style-override-2": "rg-it",
}

DHATU_HEADING = "लघुसिद्धान्तकौमुद्यांगणेष्वपठितानामुत्तरत्र समुदाहृतानां च धातूनां संग्रहः"
DHATU_NOTE = "+ अत्रापि पूर्ववच्चिह्नाङ्कितेषु धातुषु सकर्मकाकर्मकत्वव्यत्ययोऽपि दृश्यत इति बोध्यम्।"


def read(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(p, s):
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(s.encode("utf-8"))
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


def find_svg(folder, *needles):
    for p in sorted(folder.glob("*.svg")):
        if all(n in p.name for n in needles):
            return p
    raise SystemExit("svg not found: %s" % (needles,))


def scope_css(css, uid):
    """prefix every selector of a <style> with the figure's own class (svg.<uid>), so the picture's rules cannot touch the rest of the page.
    (A class, not an id: the footnote popup copies the note and drops every id in the copy.)"""
    out = []
    for rule in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        sels = ", ".join("svg.%s %s" % (uid, s.strip()) for s in rule[0].split(",") if s.strip())
        out.append("%s {%s}" % (sels, rule[1]))
    return "\n".join(out)


def prep_svg(path, uid, label, max_w):
    s = read(path).strip()
    s = re.sub(r"^<\?xml[^>]*\?>\s*", "", s)
    # the root tag: no fixed width/height (the picture scales to the column), an id, a label, the figure class
    m = re.match(r"<svg\b([^>]*)>", s)
    attrs = re.sub(r'\s(?:width|height|role|aria-labelledby|aria-label)="[^"]*"', "", m.group(1))
    root = '<svg%s id="%s" class="lsk-fig %s" role="img" aria-label="%s" style="display:block;width:100%%;height:auto;max-width:%dpx;margin:.6em auto">' % (attrs, uid, uid, label, max_w)
    s = root + s[m.end():]
    s = re.sub(r'<style>(.*?)</style>', lambda mm: "<style>%s</style>" % scope_css(re.sub(r"/\*.*?\*/", "", mm.group(1), flags=re.S), uid), s, flags=re.S)
    s = re.sub(r'font-family:\s*[^;}"]+', "font-family: ChanakyaUni, serif", s)       # the library's one font
    s = re.sub(r'font-family="[^"]*"', 'font-family="ChanakyaUni, serif"', s)
    s = s.replace('id="title"', 'id="%s-t"' % uid).replace('id="desc"', 'id="%s-d"' % uid)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    src_html, folder = Path(sys.argv[1]), Path(sys.argv[2])
    s = read(src_html)
    s = s[s.index("<body"):]

    # labels of the export
    s, n_labels = re.subn(r'[ \t]*<p id="toc_marker-\d+" class="First-End-Page-text[^"]*"[^>]*>(?:(?!</p>).)*?(?:प्रथम पृष्ठ|अंतिम पृष्ठ|अन्तिम पृष्ठ)(?:(?!</p>).)*?</p>[ \t]*\n?', "", s, flags=re.S)

    # publisher line of the title page (the first one carries the note, the second is an empty spacer)
    s, n_note = re.subn(r'<p class="Title-Page---Gita-Seva-Trust">[^<]*</p>', '<p class="cover-Publisher-Note">%s</p>' % NOTE, s, count=1)
    if n_note != 1:
        raise SystemExit("the 'गीता सेवा ट्रस्ट' line was not found")

    # old class names -> the library's
    tok = re.compile(r"(?<![\w-])(%s)(?![\w-])" % "|".join(re.escape(k) for k in CLASS_MAP))
    s = tok.sub(lambda m: CLASS_MAP[m.group(1)], s)

    # contents anchors
    s = re.sub(r"toc_marker-(\d+(?:-\d+)*)", lambda m: "Chapter_" + m.group(1).replace("-", "_"), s)

    # notes typed in a prose paragraph (class Gadya / Gadya para-style-override-6) -- "* रक्षकः॥", "१-विष्णुः॥" -- are footnotes: without a footnote
    # class the reader cannot fold them
    def _gnote(m):
        txt = re.sub(r"<[^>]+>", "", m.group(1)).replace("\xa0", " ").strip()
        return '<p class="Footnotes">' + m.group(1) + "</p>" if re.match(r"^(\*+\s|[०-९]+\s*[.\-–—)]\s*\S)", txt) else m.group(0)
    s = re.sub(r'<p class="Gadya(?: para-style-override-6)?">((?:(?!</p>).)*?)</p>', _gnote, s, flags=re.S)

    # notes the export marks with "*" although the text points at them with a number (or the reverse), and one note that answers four marks
    for a, b in (('<p class="Footnotes">* अत्रापि ‘छे’ इत्यत्र', '<p class="Footnotes">१. अत्रापि ‘छे’ इत्यत्र'),
                 ('<p class="Footnotes">* ‘छाया सूर्यप्रिया', '<p class="Footnotes">२. ‘छाया सूर्यप्रिया'),
                 ('<p class="Footnotes">* चयनं राशीकरणम्', '<p class="Footnotes">३. चयनं राशीकरणम्'),
                 ('<p class="Footnotes">* अलंपूर्वसमासविधेरनुपलम्भादाह', '<p class="Footnotes">१. अलंपूर्वसमासविधेरनुपलम्भादाह'),
                 ('<p class="Footnotes">१, २, ३, ४—प्रथमान्तात्', '<p class="Footnotes">१. प्रथमान्तात्'),
                 ('<p class="Footnotes">* ‘अशिष्टव्यवहारे', '<p class="Footnotes">२. ‘अशिष्टव्यवहारे'),
                 ('<p class="Footnotes">* गृहं भवनम्', '<p class="Footnotes">१३. गृहं भवनम्'),
                 ('<p class="Footnotes">* ‘ति’ ‘तु’', '<p class="Footnotes">१. ‘ति’ ‘तु’'),
                 ('<p class="Footnotes">* योत्रं योक्त्रं', '<p class="Footnotes">२. योत्रं योक्त्रं')):
        s = s.replace(a, b, 1)

    # a mark that runs several numbers together ("२-३", "१-२-३" in one styled span) becomes one raised number per note
    def _marks(m):
        return "-".join('<sup class="%s">%s</sup>' % (m.group(1), n) for n in re.split(r"[-–]", m.group(2)))
    s = re.sub(r'<span class="([\w-]+)">([०-९]+(?:[-–][०-९]+)+)</span>', _marks, s)

    # two or more notes typed one after the other inside a single paragraph ("… अधातुरिति॥ २-अप्रत्यय इत्यत्र …") become one paragraph each
    def _split_notes(m):
        parts = re.split(r"(?<=[॥।])\s+(?=[०-९]+[-–—](?![\s०-९]))", m.group(3))
        if len(parts) == 1:
            return m.group(0)
        tag = '<p class="%s"%s>' % (m.group(1), m.group(2))
        return ("</p>\n\t\t\t" + tag).join([tag + parts[0]] + parts[1:]) + "</p>"
    s = re.sub(r'<p class="(Footnotes[^"]*)"([^>]*)>((?:(?!</p>).)*?)</p>', _split_notes, s, flags=re.S)

    # footnotes numbered "१-" / "१—" -> "१. "
    fn_re = re.compile(r'(<p\b[^>]*class="Footnote[^"]*"[^>]*>\s*(?:<span[^>]*>)?)\s*([०-९0-9]+)[ \t]*[-–—][ \t]*(?=[^\s०-९0-9])')
    s, n_fn = fn_re.subn(lambda m: "%s%s. " % (m.group(1), m.group(2)), s)

    # the opening verse: the "*" the first note "* अहं वरदराजाचार्यः …" points at (the export has the note but no mark for it)
    s = s.replace('<p class="SHLOK-Black">नत्वा सरस्वतीं देवीं', '<p class="SHLOK-Black">नत्वा* सरस्वतीं देवीं', 1)

    # a note typed in the paragraph style "No-Paragraph-Style" (center-tight): without a footnote class the reader cannot fold it
    def _note(m):
        inner = m.group(1)
        txt = re.sub(r"<[^>]+>", "", inner).replace(" ", " ").strip()
        return '<p class="Footnotes">' + inner + "</p>" if re.match(r"^(\*+|[०-९0-9]+\s*[.)\-–]|[\[(][०-९0-9]+[\])])", txt) else m.group(0)
    s = re.sub(r'<p class="No-Paragraph-Style center-tight">(.*?)</p>', _note, s, flags=re.S)

    # the marks of the three notes under "मुखनासिकावचनोऽनुनासिकः१" are typed 1, 1, 2 in the export; the notes are numbered 1, 2, 3
    for a, b in (("तदित्थम्<span class=\"bold\">१</span>—", "तदित्थम्<span class=\"bold\">२</span>—"),
                 ("ह्रस्वाभावात्<span class=\"bold\">२</span>॥", "ह्रस्वाभावात्<span class=\"bold\">३</span>॥")):
        if s.count(a) == 1:
            s = s.replace(a, b)

    # "जिह्वामूलीयस्य जिह्वामूलम्। नासिकाऽनुस्वारस्य*।" is a verse-like line: class Shlok
    s = s.replace('<p class="TXT">जिह्वामूलीयस्य जिह्वामूलम्।', '<p class="Shlok">जिह्वामूलीयस्य जिह्वामूलम्।', 1)

    # the pictures
    img_re = re.compile(r'<p class="Image"><span><img class="frame-1" src="image/image_(\d)_fmt\.png" alt="image_\d\.png"></span>&nbsp;</p>')
    figs = {
        "2": ("lsk-svarabheda", "स्वरभेद तालिका", find_svg(folder, "svara_bheda"), 640, "Footnotes Image"),
        "3": ("lsk-sthana", "वर्णोच्चारणस्थानकोष्ठकम्", find_svg(folder, "koshthakam", "(2)"), 760, "*"),   # opens from the "*" of the line above it
        "4": ("lsk-prayatna", "आभ्यन्तर-बाह्यप्रयत्नकोष्ठकम्", find_svg(folder, "pronunciation"), 760, "Footnotes Image"),
    }
    done = []

    def put(m):
        n = m.group(1)
        if n not in figs:
            done.append((n, "left out (no SVG)"))
            return ""
        uid, label, path, w, cls = figs[n]
        done.append((n, path.name))
        if cls == "*":                                   # a note of its own: "*", then the table -- the "*" at the end of the line before opens it
            return '<p class="Footnotes">*</p>\n\t\t\t<p class="Footnotes Image">%s</p>' % prep_svg(path, uid, label, w)
        return '<p class="%s">%s</p>' % (cls, prep_svg(path, uid, label, w))
    s = img_re.sub(put, s)
    if re.search(r"<img\b", s):
        raise SystemExit("a picture placeholder is left")

    # the dhatu-संग्रह page, back before the गणपाठ
    dh = [("lsk-dhatu1", find_svg(folder, "धातवः (2)")), ("lsk-dhatu2", find_svg(folder, "धातवः.svg")), ("lsk-dhatu3", find_svg(folder, "धातवः (1)"))]
    page = ('\n<div class="Basic-Graphics-Frame">\n\t\t\t<p class="Page-Break">&nbsp;</p>\n\t\t\t<p id="Chapter_69" class="Heading">%s</p>\n' % DHATU_HEADING)
    for i, (uid, p) in enumerate(dh, 1):
        page += '\t\t\t<p class="Image">%s</p>\n' % prep_svg(p, uid, "धातूनां संग्रहः — %s" % ("भाग %d" % i), 460)
    page += '\t\t\t<p class="Footnotes">%s</p>\n\t\t\t<p class="Chapter-End-Text para-style-override-2">इति<span></span></p>\n\t\t</div>\n' % DHATU_NOTE

    secs = SECTION.findall(s)
    k = next(i for i, x in enumerate(secs) if "लघुसिद्धान्तकौमुदीस्थगणपाठ" in x and 'class="Heading"' in x)
    if "धातूनां संग्रहः" in "".join(secs):
        raise SystemExit("the धातु-संग्रह page is already in the export")
    secs.insert(k, page)
    hr = '\n\n<hr class="page-break">\n\n'
    body = hr.join('<section class="epub-page" data-page="%d">%s</section>' % (i + 1, p) for i, p in enumerate(secs))
    out = HEAD + "<body>\n\n" + body + "\n\n</body>\n</html>"

    if re.search(r"गीता\s*सेवा\s*ट्रस्ट|Gita-Seva", out):
        raise SystemExit("a mention of गीता सेवा ट्रस्ट is left")
    # classes: every one must be defined in master.css
    css = read(MASTER_CSS)
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL
    used = set()
    plain = re.sub(r"<svg\b.*?</svg>", "", out, flags=re.S)                      # (the pictures carry classes of their own, scoped to them)
    for m in re.finditer(r'class="([^"]*)"', plain):
        used.update(m.group(1).split())
    missing = sorted(c for c in used if c not in defined)
    if missing:
        raise SystemExit("classes master.css does not have: %s" % missing)

    if OUT.exists():
        BACKUP.mkdir(parents=True, exist_ok=True)
        if not (BACKUP / OUT.name).exists():
            shutil.copy2(OUT, BACKUP / OUT.name)
    write(OUT, out)
    print("wrote", OUT.name, "| %.1f KB" % (len(out.encode("utf-8")) / 1024), "| labels dropped:", n_labels, "| footnote marks rewritten:", n_fn,
          "| sections:", len(secs))
    for n, what in done:
        print("  image_%s -> %s" % (n, what))
    print("  dhatu page: 3 tables")


if __name__ == "__main__":
    main()

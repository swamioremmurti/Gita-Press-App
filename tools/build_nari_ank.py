#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_nari_ank.py -- import "नारी-अङ्क" (Gita Press, Kalyan special number) from the full export "नारी अंक प्रथम पृष्ठ (1).html"
(467 pages, 240 pictures) the way every Gita Press book is processed:

  * head: master.css only, the book's own title;  the export's "प्रथम पृष्ठ" / "अन्तिम पृष्ठ" labels are dropped;
  * title page: cover-Shri-Hari / cover-subtitle (कल्याण) / cover-Book-Name / Tavmev-Mata--pita / cover-Publisher-Note (the गीता सेवा ट्रस्ट line);
  * toc_marker-N -> Chapter_N;  footnote numbers "१-" -> "१. " (the reader's footnote modal knows "*", "[१]", "(१)", "१.");
  * class renames (see memory class-renames-for-imports):  TXT -> Normal, TXT-bold -> TXT-Bold, Shlok-Color-2 -> Shlok, Uwach -> Uvaacha,
    writer / Writer / Writer-1 (the "(लेखक—...)" line under a title) -> Bole (what the other books use), para-style-override-4 -> center-tight,
    char-style-override-4 -> bold, char-style-override-14/15/16 -> Shlok-part-2/3/4;  empty spans and spans whose class master.css lacks are unwrapped;
  * pictures: the 240 pictures of the book (image/N_fmt.png, and one Page<N>_fmt.jpeg, in the order they stand in the book) are the converted PNGs of
    the folder in the order of their names (NNNNN-image-NNNNN: NNNNN = position + 1; the copies of one number: DUP_ORDER);  each is kept at or under 200 KB (book_converter.optimize_image) as image/nari-ank-NNN.jpg;
  * every class left is one master.css defines; the colons typed for visarga are put right afterwards with
    tools/fix_visarga_colon.py --apply --only "नारी-अङ्क.html".

    python tools/build_nari_ank.py "<नारी अंक प्रथम पृष्ठ (1).html>" "<converted images folder>"
"""
import re
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
IMG_DIR = BOOKS / "image"
NAME = "नारी-अङ्क"
OUT = BOOKS / (NAME + ".html")
BACKUP = ROOT / "backups" / "before-nari-ank-full"
MASTER_CSS = ROOT / "master.css"
DATA_JS = ROOT / "swadhyay-data.js"
NOTE = "गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।"
STRUCTURAL = {"epub-page", "page-break", "Basic-Graphics-Frame"}

HEAD = """<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<link rel="stylesheet" href="../../master.css">
</head>

""" % NAME

CLASS_MAP = {                       # whole-token renames of a class attribute
    "TXT": "Normal", "TXT-bold": "TXT-Bold", "Shlok-Color-2": "Shlok", "Uwach": "Uvaacha",
    "writer": "Bole", "Writer": "Bole", "Writer-1": "Bole",
    "para-style-override-4": "center-tight", "char-style-override-4": "bold",
    "char-style-override-14": "Shlok-part-2", "char-style-override-15": "Shlok-part-3", "char-style-override-16": "Shlok-part-4",
}


def write(p, data):
    data = data if isinstance(data, bytes) else data.encode("utf-8")
    for _ in range(10):
        try:
            with open(p, "wb") as fh:
                fh.write(data)
            return
        except OSError:
            time.sleep(1.5)
    raise SystemExit("could not write %s" % p)


# Files that share a number (the browser's "name (1).png", "(2)" copies) fill consecutive pictures of the book; which copy is which was read off the
# pictures and their text.  number -> the copy suffixes (0 = the plain name) in the order they appear in the book.
DUP_ORDER = {1: [0, 1], 18: [2, 0, 1], 21: [0, 1], 23: [0, 1], 26: [1, 0], 44: [1, 0], 56: [1, 0], 65: [1, 0], 68: [0, 2, 1],
             84: [0, 1, 3, 4, 2], 99: [0, 1], 102: [0, 1], 106: [0, 1, 2], 119: [0, 1]}


def picture_files(folder):
    def key(f):
        m = re.match(r"(\d+)-image-\d+(?: \((\d+)\))?\.png$", f.name)
        n, c = int(m.group(1)), int(m.group(2) or 0)
        return (n, DUP_ORDER[n].index(c) if n in DUP_ORDER else c)
    return sorted((f for f in folder.glob("*.png")), key=key)


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    s = Path(sys.argv[1]).read_text(encoding="utf-8")
    pics = picture_files(Path(sys.argv[2]))
    s = HEAD + s[s.index("<body"):]

    # the export's own page labels
    s, n_labels = re.subn(r'[ \t]*<p id="toc_marker-\d+" class="First-End-Page-text[^"]*"[^>]*>(?:(?!</p>).)*?(?:प्रथम पृष्ठ|अन्तिम पृष्ठ|अंतिम पृष्ठ)(?:(?!</p>).)*?</p>[ \t]*\n?',
                          "", s, flags=re.S)

    # title page
    def sub1(pat, rep, text):
        text, n = re.subn(pat, rep, text, flags=re.S)
        if n != 1:
            raise SystemExit("title page: %r found %d times" % (pat[:40], n))
        return text
    s = sub1(r'<p class="Titel-Page---Shri-Hari"[^>]*>.*?</p>', '<p class="cover-Shri-Hari">॥ श्रीहरिः॥</p>', s)
    s = sub1(r'<p class="Numbers"><span class="char-style-override-4">कल्याण</span></p>', '<p class="cover-subtitle">कल्याण</p>', s)
    s = sub1(r'<p id="toc_marker-2" class="Heading">.*?</p>', '<p class="cover-Book-Name">%s</p>' % NAME, s)
    s = sub1(r'<p class="Title-Page---Gita-Seva-Trust[^"]*"[^>]*>[^<]*(?:<span[^>]*></span>)?</p>', '<p class="cover-Publisher-Note">%s</p>' % NOTE, s)
    if re.search(r"गीता\s*सेवा\s*ट्रस्ट|Gita-Seva|Gita Seva", s):
        raise SystemExit("a mention of गीता सेवा ट्रस्ट is left")

    # contents anchors, footnote numbers
    s = re.sub(r"toc_marker-(\d+(?:-\d+)*)", lambda m: "Chapter_" + m.group(1).replace("-", "_"), s)
    s, n_fn = re.subn(r'(<p\b[^>]*class="Footnote[^"]*"[^>]*>(?:<span[^>]*>)?)([०-९0-9]+)[ \t]*[-–][ \t]*(?=[^\s०-९0-9])',
                      lambda m: "%s%s. " % (m.group(1), m.group(2)), s)

    # superscript digits typed after a space ("हों।’ १") stand straight after the word, as the reader's footnote links expect
    s, n_sp = re.subn(r'(?<=[ऀ-ॿ।॥’”])[ \t]+(<span class="[^"]*">[०-९]{1,2}</span>)', r"\1", s)
    # two notes in one paragraph ("१. ... । २-...") are two notes; an enumerated list in a note ("१. ... २-... ३-...") is one note's text
    def two_notes(m):
        return '<p class="%s">१. %s</p>\n\t\t\t<p class="%s">२. %s</p>' % (m.group(1), m.group(2).strip(), m.group(1), m.group(3).strip())
    s, n_glue = re.subn(r'<p class="(Footnotes)">१\. ((?:(?!३-)[^<])*?[।॥.]) ?२-((?:(?!३-)[^<])*)</p>', two_notes, s)
    s, n_list = re.subn(r'(<p class="Footnotes">)१\. ((?:(?!</p>)[^<])*?[।॥.] ?२-(?:(?!</p>)[^<])*?[।॥.] ?३-)', r"\1१-\2", s)
    print("digit spans un-spaced:", n_sp, "| glued notes split:", n_glue, "| enumerations kept in their note:", n_list)

    # pictures
    nimg = len(re.findall(r'<img\b', s))
    IMG_DIR.mkdir(exist_ok=True)
    kept = sorted(IMG_DIR.glob("nari-ank-*"))                     # the pictures of an earlier import (the source folder may be gone by now)
    reuse = not pics and len(kept) == nimg
    if not reuse:
        if nimg != len(pics):
            raise SystemExit("%d <img> in the book, %d pictures in the folder" % (nimg, len(pics)))
        for old in kept:
            old.unlink()
    total = 0

    count = 0

    def img(m):
        nonlocal total, count
        i = count                                                 # the nth picture of the book is the nth file (file number = position + 1)
        count += 1
        if reuse:
            name = kept[i].name
            total += kept[i].stat().st_size
            return '<img class="frame-1" src="image/%s" alt="">' % name
        blob, ext = bc.optimize_image(pics[i].read_bytes(), ".png", 200 * 1024)
        name = "nari-ank-%03d%s" % (i, ext)
        write(IMG_DIR / name, blob)
        total += len(blob)
        return '<img class="frame-1" src="image/%s" alt="">' % name
    s = re.sub(r'<img\b[^>]*?src="image/(?:(\d+)_fmt\.png|Page\d+_fmt\.jpeg)"[^>]*>', img, s)
    if re.search(r"_fmt\.(?:png|jpeg)", s):
        raise SystemExit("a picture reference was left")

    # class renames
    def classes(m):
        toks = [CLASS_MAP.get(t, t) for t in m.group(1).split()]
        return 'class="%s"' % " ".join(dict.fromkeys(toks))
    s = re.sub(r'class="([^"]*)"', classes, s)

    css = MASTER_CSS.read_text(encoding="utf-8")
    defined = set(re.findall(r"\.([A-Za-z_][\w-]*)", css)) | STRUCTURAL

    # spans: empty ones, and ones whose class master.css lacks, are unwrapped
    def span(m):
        cls, inner = m.group(1).split(), m.group(2)
        if not inner.strip() and not re.search(r"<", inner):
            return ""
        if all(c in defined for c in cls):
            return m.group(0)
        return inner
    for _ in range(3):
        s = re.sub(r'<span class="([^"]*)"[^>]*>([^<]*)</span>', span, s)
    s = re.sub(r'<span>([^<]*)</span>', r'\1', s)
    s = re.sub(r' xml:lang="[^"]*"', "", s)

    used = set()
    for m in re.finditer(r'class="([^"]*)"', s):
        used.update(m.group(1).split())
    missing = sorted(c for c in used if c not in defined)
    if missing:
        raise SystemExit("classes master.css does not have: %s" % missing)
    if re.search(r"para-style-override-1\b|Titel|toc_marker|calibre", s):
        raise SystemExit("a leftover of the export remains")

    if OUT.exists():
        BACKUP.mkdir(parents=True, exist_ok=True)
        if not (BACKUP / OUT.name).exists():
            shutil.copy2(OUT, BACKUP / OUT.name)
    for old in ("nari-ank-sitaram.jpg", "nari-ank-kalyan.jpg", "nari-ank-panch-mahashakti.jpg"):
        if (IMG_DIR / old).exists():
            (IMG_DIR / old).unlink()
    write(OUT, s)
    print("wrote", OUT.name, "| %.1f KB" % (len(s.encode("utf-8")) / 1024), "| labels dropped:", n_labels, "| footnote marks rewritten:", n_fn,
          "| pictures: %d, %.1f MB" % (nimg, total / 1048576), "| classes used:", len(used))

    d = DATA_JS.read_text(encoding="utf-8")
    size = round(OUT.stat().st_size / 1024, 1)
    m = re.search(r'("file":  "%s\.html".*?"sizeKB":  )[\d.]+' % re.escape(NAME), d, re.S)
    if m:
        write(DATA_JS, d[:m.start()] + m.group(1) + str(size) + d[m.end():])
        print("sizeKB updated:", size)
    else:
        nl = "\r\n" if "\r\n" in d else "\n"
        entry = ('    {\n        "file":  "%s.html",\n        "category":  "Siksha evam Katha",\n        "author":  "",\n        "tikakar":  "",\n'
                 '        "translator":  "",\n        "publisher":  "गीताप्रेस",\n        "sizeKB":  %s\n    }\n' % (NAME, size)).replace("\n", nl)
        k = d.rindex("}" + nl + "];")
        write(DATA_JS, d[:k + 1] + "," + nl + entry + d[k + 1 + len(nl):])
        print("registered in swadhyay-data.js")


if __name__ == "__main__":
    main()

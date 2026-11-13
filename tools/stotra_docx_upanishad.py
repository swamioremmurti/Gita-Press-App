"""Atmopanishad_Complete_Bhashya.docx -> tools/stotra-src/<slug>.json (then: node tools/build_stotra_book.js <slug>; python tools/stotra_wordmap.py <slug> <docx> --write).

An Upanishad shown in the stotra viewer's layout (verse, word list, commentary) but NOT classed as a stotra: the JSON carries
"libraryCategory": "Upanishad" and no stotra category, so the book builder gives the library entry "category": "Upanishad" and
"stview": "yes" (opens in /stotra/<slug>, is not listed on /stotras).

The docx is a run of blocks:
    <section heading>            e.g. "३. बाह्य-आत्मा (स्थूल शरीर) का निरूपण (Prose Section 1 ...)"   (becomes the verse's label)
    one-cell table               "❖ header ❖" then the lines of the verse / prose passage
    【पदच्छेदः】 a, b-c, d ।      (word breaks: used by stotra_wordmap.py)
    【पदार्थः】 w = meaning; w = meaning; ...
    【विस्तृत दार्शनिक भाष्यम्】 commentary   (the conclusion has 【उपसंहार-विवरण】 instead)
The introduction (प्रस्तावना) is the paragraphs before the first section heading.  English glosses in brackets are dropped.

usage:  py -I -X utf8 tools/stotra_docx_upanishad.py "<docx>" <slug>
"""
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stotra_docx_to_json as S  # noqa: E402
from stotra_docx_ganesha import strip_english, deva, LATIN  # noqa: E402

OUT = Path(__file__).resolve().parent / "stotra-src"


def split_pad(text):
    """'w = m; w2 = m2; more of m2; w3 = m3' -> [[w, m], ...]  (a piece without ' = ' continues the previous meaning)."""
    rows = []
    for piece in re.split(r";\s+", text.strip().rstrip(";")):
        piece = piece.strip()
        if not piece:
            continue
        if " = " in piece:
            w, m = piece.split(" = ", 1)
            rows.append([w.strip(), m.strip()])
        elif rows:
            rows[-1][1] += "; " + piece
        else:
            raise ValueError(piece)
    return rows


def join_lines(lines):
    """Prose lines are wrapped after a hyphen inside one long compound: join those without the hyphen."""
    out = []
    for ln in lines:
        if out and out[-1].endswith("-"):
            out[-1] = out[-1][:-1] + ln
        else:
            out.append(ln)
    return out


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    src, slug = sys.argv[1:3]
    items = S.body_items(zipfile.ZipFile(src).read("word/document.xml").decode("utf8"))
    st = {"slug": slug, "category": "", "libraryCategory": "Upanishad", "author": "", "title": "आत्मोपनिषद्",
          "invocation": "", "subtitle": "", "publisher": "कल्याण सेवा ट्रस्ट", "audio": "", "intro": [], "verses": [], "closing": ""}
    first = items[0][1].strip()
    assert first.startswith("॥") and "आत्मोपनिषत्" in first, first
    st["invocation"] = first
    st["subtitle"] = strip_english(items[1][1].replace("\n", " ")).strip()
    i = 2
    intro_title = ""
    intro = []
    while items[i][0] == "p" and not re.match(r"^[०-९]+\.", items[i][1].strip()):     # up to the first numbered section heading
        t = items[i][1].strip()
        if t:
            if not intro_title and t.startswith("प्रस्तावना"):
                intro_title = strip_english(t).strip()
            else:
                intro.append(strip_english(t).strip())
        i += 1
    st["intro"] = [{"title": intro_title, "text": "\n\n".join(intro)}]
    label = ""
    n_pad = 0
    while i < len(items):
        k, t = items[i]
        if k == "p":
            s = t.strip()
            if s and not re.match(r"^श्लोकः\s*\d+$", s):
                label = strip_english(s).strip()
            i += 1
            continue
        # a table: the verse block
        cell = t[0][0]
        lines = [x.strip() for x in cell.split("\n")]
        header = lines[0]
        assert header.startswith("❖"), header
        body = [x for x in lines[1:] if x]
        vm = re.match(r"❖\s*श्लोकः\s*(\d+)\s*❖", header)
        i += 1
        padtxt = bhav = ""
        brk = ""
        while i < len(items) and items[i][0] == "p":
            s = items[i][1].strip()
            if s.startswith("【पदच्छेदः】"):
                brk = s
            elif s.startswith("【पदार्थः】"):
                padtxt = s[len("【पदार्थः】"):].strip()
            elif s.startswith("【विस्तृत दार्शनिक भाष्यम्】"):
                bhav = s[len("【विस्तृत दार्शनिक भाष्यम्】"):].strip()
            elif s.startswith("【उपसंहार-विवरण】"):
                bhav = s[len("【उपसंहार-विवरण】"):].strip()
            elif s and (re.match(r"^श्लोकः\s*\d+$", s) or re.match(r"^[०-९]+\.", s) or not s.startswith("【")):
                break
            i += 1
        if vm:
            n = int(vm.group(1))
            body[-1] = re.sub(r"॥\s*[०-९0-9]*\s*॥\s*$", "॥ %s ॥" % deva(n), body[-1])
            assert body[-1].endswith("॥ %s ॥" % deva(n)), body[-1]
            lab = ""
        else:
            body = join_lines(body)
            lab = label
        pad = [[w, strip_english(m).strip().rstrip(".").strip()] for w, m in split_pad(padtxt)] if padtxt else []
        n_pad += len(pad)
        bhav = strip_english(bhav).strip()
        for s in [x for _, x in pad] + [bhav] + body:
            assert not LATIN.search(s), (header, s)
        st["verses"].append({"label": lab, "lines": body, "pad": pad, "bhav": bhav})
        label = ""
    OUT.mkdir(exist_ok=True)
    out = json.dumps(st, ensure_ascii=False, indent=2).replace("‍", "").replace("‌", "")
    (OUT / (slug + ".json")).write_text(out, encoding="utf-8")
    print("wrote", slug + ".json", "| verses/sections:", len(st["verses"]), "| word rows:", n_pad)


if __name__ == "__main__":
    main()

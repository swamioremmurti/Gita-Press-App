"""Ganesha_Aparadha_Kshamapana_Stotram_Complete.docx -> tools/stotra-src/<slug>.json (then: node tools/build_stotra_book.js <slug>).

This docx has one single-cell table per verse; inside it, in one text blob:
    ॥ श्लोक N ॥ <verse, two lines>  पदच्छेद (Word Breakdown): ...  पदार्थ (Word-by-Word Meaning):
    • word: meaning (English gloss)  ...   विस्तृत भावार्थ (Detailed Exposition): <meaning paragraph>
The English glosses in brackets are dropped (the library is Hindi); the पदच्छेद line is not kept (the stotra format has no field for it --
the word list already shows the words one by one).  Invocation, title, subtitle first, the closing "॥ इति ... ॥" paragraph last.

usage:  py -I -X utf8 tools/stotra_docx_ganesha.py "<docx>" <slug> <category-key> ["<publisher>"] ["<author>"] ["<invocation>"]   (also used for the Dattatreya stotra)
"""
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stotra_docx_to_json as S  # noqa: E402

OUT = Path(__file__).resolve().parent / "stotra-src"
DEVA = "०१२३४५६७८९"
LATIN = re.compile(r"[A-Za-z]")
DEVA_CH = re.compile(r"[ऀ-ॿ]")


def deva(n):
    return "".join(DEVA[int(c)] for c in str(n))


def strip_english(s):
    """Remove every bracketed group that holds Latin letters and no Devanagari (the English gloss)."""
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\s*\(([^()]*)\)", lambda m: "" if LATIN.search(m.group(1)) and not DEVA_CH.search(m.group(1)) else m.group(0), s)
    return s


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    src, slug, cat = sys.argv[1:4]
    publisher = sys.argv[4] if len(sys.argv) > 4 else "कल्याण सेवा ट्रस्ट"
    author = sys.argv[5] if len(sys.argv) > 5 else ""
    invocation = sys.argv[6] if len(sys.argv) > 6 else "॥ श्री गणेशाय नमः ॥"
    items = S.body_items(zipfile.ZipFile(src).read("word/document.xml").decode("utf8"))
    paras = [t for k, t in items if k == "p" and t]
    tabs = [t[0][0] for k, t in items if k == "t"]
    title = paras[0].strip("॥ ").strip()
    sub = paras[1].split("|")[0].strip()
    pm = re.search(r"\(([^)]*)\)\s*$", sub)
    if sub.startswith("पदच्छेद") and pm:        # "पदच्छेद, शब्दार्थ एवं ... सहित (<the real subtitle>)"
        sub = pm.group(1).strip()
    closing = paras[-1]
    assert closing.startswith("॥ इति"), closing
    st = {"slug": slug, "category": cat, "author": author, "title": title, "invocation": invocation, "subtitle": sub,
          "publisher": publisher, "audio": "", "intro": [], "verses": [], "closing": closing.strip()}
    n_pad = 0
    for i, t in enumerate(tabs, 1):
        # an optional "— [note]" after the shloka number (the Lalita stotra: which letter of the acrostic the verse begins with) becomes the verse label
        m = re.match(r"॥\s*श्लोक\s*(\d+)\s*॥\s*(?:—\s*\[(.*?)\]\s*)?(.*?)\s*पदच्छेद \(Word Breakdown\):.*?पदार्थ \(Word-by-Word Meaning\):\s*(.*?)\s*विस्तृत भावार्थ \(Detailed Exposition\):\s*(.*)\Z", t, re.S)
        assert m and int(m.group(1)) == i, (i, t[:80])
        label = re.sub(r"'([^']*)'", "‘\\1’", (m.group(2) or "").strip())
        lines = [x.strip() for x in m.group(3).split("\n") if x.strip()]
        lines[-1] = re.sub(r"॥\s*[०-९0-9]*\s*॥\s*$", "॥ %s ॥" % deva(i), lines[-1])
        assert lines[-1].endswith("॥ %s ॥" % deva(i)), lines[-1]
        pad = []
        for b in [x.strip() for x in m.group(4).split("\n") if x.strip()]:
            bm = re.match(r"•\s*(.+?):\s+(.*)\Z", b, re.S)
            assert bm, (i, b)
            mean = strip_english(bm.group(2)).strip().rstrip(".").strip()
            pad.append([bm.group(1).strip(), mean])
        n_pad += len(pad)
        bhav = strip_english(m.group(5)).strip()
        for s in [x for _, x in pad] + [bhav] + lines:
            assert not LATIN.search(s), (i, s)
        st["verses"].append({"label": label, "lines": lines, "pad": pad, "bhav": bhav})
    OUT.mkdir(exist_ok=True)
    out = json.dumps(st, ensure_ascii=False, indent=2).replace("‍", "").replace("‌", "")      # stray joiners (e.g. श‍ृङ्ग) break the shaping
    (OUT / (slug + ".json")).write_text(out, encoding="utf-8")
    print("wrote", slug + ".json", "| verses:", len(st["verses"]), "| word rows:", n_pad)


if __name__ == "__main__":
    main()

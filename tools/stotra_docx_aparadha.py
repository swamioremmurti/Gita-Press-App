"""Aparadha_Kshamapana_Stotram_Word_by_Word_Hindi.docx -> tools/stotra-src/<slug>.json (then: node tools/build_stotra_book.js <slug>).

This docx has another pattern than stotra_docx_to_json.py expects (no tables): invocation, title, two description lines, then per verse
    ॥ श्लोक N ॥  (Heading1)      the verse (one paragraph, line breaks kept)      शब्दार्थ (Heading2)
    one paragraph "word — meaning; word — meaning; ... ।"      विस्तृत भावार्थ (Heading2)      the meaning paragraph
and at the end ॥ समापन ॥, the "॥ इति ... ॥" line and a "भाव-सार:" paragraph (kept under the closing line).

usage:  py -I -X utf8 tools/stotra_docx_aparadha.py "<docx>" <slug> <category-key> ["<publisher>"] ["<author>"]
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


def deva(n):
    return "".join(DEVA[int(c)] for c in str(n))


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    src, slug, cat = sys.argv[1:4]
    publisher = sys.argv[4] if len(sys.argv) > 4 else "कल्याण सेवा ट्रस्ट"
    author = sys.argv[5] if len(sys.argv) > 5 else ""
    items = [t for k, t in S.body_items(zipfile.ZipFile(src).read("word/document.xml").decode("utf8")) if k == "p" and t]
    st = {"slug": slug, "category": cat, "author": author, "title": items[1], "invocation": items[0], "subtitle": items[3],
          "publisher": publisher, "audio": "", "intro": [], "verses": [], "closing": ""}
    i = 4
    n_pad = 0
    while i < len(items):
        m = re.fullmatch(r"॥\s*श्लोक\s*([०-९0-9]+)\s*॥", items[i])
        if not m:
            break
        num = m.group(1)
        verse = [x.strip() for x in items[i + 1].split("\n") if x.strip()]
        assert items[i + 2] == "शब्दार्थ" and items[i + 4] == "विस्तृत भावार्थ", items[i:i + 5]
        verse[-1] = re.sub(r"॥\s*$", "॥ %s ॥" % num, verse[-1])
        pad = []
        for part in [x.strip() for x in items[i + 3].split(";") if x.strip()]:
            part = part.rstrip("।").strip()
            if " — " in part:
                w, mean = part.split(" — ", 1)
                pad.append([w.strip(), mean.strip()])
            else:
                pad[-1][1] += "; " + part
        n_pad += len(pad)
        st["verses"].append({"label": "", "lines": verse, "pad": pad, "bhav": items[i + 5].strip()})
        i += 6
    assert items[i] == "॥ समापन ॥", items[i]
    st["closing"] = items[i + 1] + "\n" + items[i + 2]
    assert i + 3 == len(items)
    OUT.mkdir(exist_ok=True)
    (OUT / (slug + ".json")).write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", slug + ".json", "| verses:", len(st["verses"]), "| word rows:", n_pad)


if __name__ == "__main__":
    main()

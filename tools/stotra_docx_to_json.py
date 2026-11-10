"""A stotra Word file -> tools/stotra-src/<slug>.json (the structured stotra; tools/build_stotra_book.js makes the book from it).

The file pattern (as in the Gurvashtakam sample):
    ॥ श्री ॥                                  invocation
    ॥ <title> ॥                               title
    <subtitle line>                           e.g. "आदिशंकराचार्यविरचितम् — सपदच्छेद-शब्दार्थ-व्याख्यासहितम्"
    ❖ ❖ ❖                                     ornament (ignored)
    (a longer file may also have "॥ section ॥" headings and plain sub-headings -- न्यास, ध्यानम् -- each followed by the same boxed text /
     table / boxed meaning; those headings become the block's label: "section — sub-heading")
    then, for every verse:
      श्लोक N                                  label  (e.g. "श्लोक ९ (फलश्रुति)")
      <the verse, the two half-lines divided by a line break>
      पद-विच्छेद एवं शब्दार्थ:                  label (ignored)
      a table, one row per word:  word | = meaning
      <the meaning of the verse>
      ― ― ― ❖ ― ― ―                            ornament (ignored)
    ॥ इति ... ॥                                the closing line (a paragraph that starts with "॥ इति")

usage:  py -I -X utf8 tools/stotra_docx_to_json.py "<file.docx>" <slug> <category-key> ["<publisher>"] ["<author>"]
"""
import json
import re
import sys
import zipfile
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
OUT = Path(__file__).resolve().parent / "stotra-src"


def esc_free(s):
    return re.sub(r"[ \t ]+", " ", s).strip()


def par_text(p_xml):
    """The text of one <w:p>, with <w:br/> as a newline."""
    out = []
    for m in re.finditer(r"<w:t[^>]*>([^<]*)</w:t>|<w:br\s*/>|<w:tab\s*/>", p_xml):
        if m.group(1) is not None:
            out.append(m.group(1))
        elif m.group(0).startswith("<w:br"):
            out.append("\n")
        else:
            out.append(" ")
    s = "".join(out).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
    return "\n".join(esc_free(x) for x in s.split("\n")).strip()


def body_items(xml):
    """[("p", text) | ("t", [[cell, ...], ...])] in document order."""
    body = xml[xml.index("<w:body>") + 8: xml.rindex("</w:body>")]
    items = []
    pos = 0
    tok = re.compile(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", re.S)
    for m in tok.finditer(body):
        s = m.group(0)
        if s.startswith("<w:tbl>"):
            rows = []
            for tr in re.findall(r"<w:tr[ >].*?</w:tr>", s, re.S):
                cells = [" ".join(par_text(p) for p in re.findall(r"<w:p[ >].*?</w:p>", tc, re.S)).strip()
                         for tc in re.findall(r"<w:tc>.*?</w:tc>", tr, re.S)]
                rows.append(cells)
            items.append(("t", rows))
        else:
            items.append(("p", par_text(s)))
    return items


def strip_bars(t):
    return re.sub(r"^\s*॥\s*|\s*॥\s*$", "", t).strip()


def is_section(t):
    return bool(re.fullmatch(r"॥[^॥]+॥", t.strip()))


ORNAMENT = re.compile(r"[―❖\s—-]+")
SHLOKA = re.compile(r"श्लोक\s*[0-9०-९]*\s*(?:\(([^)]*)\))?$")


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    src, slug, cat = sys.argv[1], sys.argv[2], sys.argv[3]
    publisher = sys.argv[4] if len(sys.argv) > 4 else ""
    author = sys.argv[5] if len(sys.argv) > 5 else ""
    xml = zipfile.ZipFile(src).read("word/document.xml").decode("utf8")
    items = body_items(xml)
    # a one-cell table is a boxed paragraph (the verse, the meaning): kind "b"
    items = [("b", "\n".join(c for r in t for c in r if c)) if k == "t" and all(len(r) == 1 for r in t) else (k, t) for k, t in items]

    st = {"slug": slug, "category": cat, "author": author, "title": "", "invocation": "", "subtitle": "", "publisher": publisher, "audio": "", "intro": [], "verses": [], "closing": ""}
    # the first block starts at the first heading after the title lines: "श्लोक N", or a "॥ section ॥" line
    first_verse = next(n for n, (k, t) in enumerate(items) if k == "p" and (SHLOKA.match(t) or (n >= 2 and is_section(t))))
    pre = [t for k, t in items[:first_verse] if k == "p" and t and not ORNAMENT.fullmatch(t)]
    if len(pre) < 2:
        raise SystemExit("the opening lines are not what this script expects: %r" % pre)
    if len(pre) == 2:
        st["title"], st["subtitle"] = pre[0], pre[1]
    else:
        st["invocation"], st["title"], st["subtitle"] = pre[0], pre[1], " — ".join(pre[2:])
    st["title"] = strip_bars(st["title"])
    st["invocation"] = st["invocation"].strip()

    # Blocks. A heading ("श्लोक N (name)", "॥ section ॥", a plain sub-heading such as "ध्यानम्") opens a block; headings in a row share one
    # block and join into its label ("section — sub-heading — name"). Then come the boxed Sanskrit text, the "पद-विच्छेद" table and the boxed meaning.
    cur = None
    labels = {}

    def open_block(part, shloka):
        nonlocal cur
        if cur is not None and not cur["lines"]:
            if part:
                labels[id(cur)].append(part)
            cur["_shloka"] = cur["_shloka"] or shloka
            return
        cur = {"label": "", "lines": [], "pad": [], "bhav": "", "_shloka": shloka}
        labels[id(cur)] = [part] if part else []
        st["verses"].append(cur)

    for k, t in items[first_verse:]:
        if k == "t":
            if cur is None:
                continue
            for row in t:
                cells = [c for c in row if c is not None]
                if len(cells) >= 2:
                    w, m = cells[0].strip(), re.sub(r"^=\s*", "", cells[1].strip())
                    cur["pad"].append([w, m])
            continue
        if not t or ORNAMENT.fullmatch(t) or t.startswith("पद-विच्छेद"):
            continue
        if re.match(r"॥\s*इति", t):
            st["closing"] = t
            continue
        m = SHLOKA.match(t)
        if k == "p" and m:
            open_block((m.group(1) or "").strip(), True)
        elif k == "p" and cur is not None and cur["_shloka"] and not cur["lines"]:
            cur["lines"] = [x for x in t.split("\n") if x.strip()]       # an unboxed verse (older files)
        elif k == "p" and "\n" not in t and len(t) <= 120 and (cur is None or not cur["lines"] or cur["bhav"]):
            open_block(strip_bars(t), False)                              # a heading
        elif cur is None:
            continue
        elif not cur["lines"]:
            cur["lines"] = [x for x in t.split("\n") if x.strip()]
        else:
            cur["bhav"] = (cur["bhav"] + "\n" + t).strip()
    for v in st["verses"]:
        v["label"] = " — ".join(x for x in labels[id(v)] if x)
        v.pop("_shloka", None)
    for n, v in enumerate(st["verses"]):
        if not v["lines"]:
            raise SystemExit("verse %d (%s) has no text" % (n + 1, v["label"]))
    OUT.mkdir(exist_ok=True)
    dest = OUT / (slug + ".json")
    dest.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("%s: %d verses, %d word rows, closing %s" % (dest.name, len(st["verses"]), sum(len(v["pad"]) for v in st["verses"]), "yes" if st["closing"] else "NO"))


if __name__ == "__main__":
    main()

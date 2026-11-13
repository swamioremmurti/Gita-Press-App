"""Tie the word-by-word rows of a stotra to the words of its verses (for the "tap a word" tooltip) and join the meaning of combined words.

A stotra JSON (tools/stotra-src/<slug>.json) has per verse  pad: [[word, meaning], ...]  with one row per dictionary word, often finer than the
words printed in the verse (sandhi: "अज्ञानाद्विस्मृतेर्भ्रान्त्या" = अज्ञानात् + विस्मृतेः + भ्रान्त्या) or coarser (a phrase in one row).  This tool aligns the
rows with the verse words (a sound-skeleton edit-distance alignment) and rewrites  pad  as one row per verse word / phrase:

        [word as printed, meaning (the parts joined), word break ("a + b + c", may be ""), "first-last" index of the verse words it covers]

The original rows are kept in  padRaw  (the tool starts from it when it is run again).  Verse words are numbered 0.. over the verse's lines, a "word"
being a whitespace-separated piece with a Devanagari letter (the same rule as swadhyay-stotra.js).

usage:  py -I -X utf8 tools/stotra_wordmap.py <slug> [<docx> ]  [--report]
        the docx (the Ganesha / Dattatreya / Lalita pattern, one table per verse with a "पदच्छेद" line) gives the word breaks of the compounds.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stotra_docx_to_json as S  # noqa: E402

SRC = Path(__file__).resolve().parent / "stotra-src"
WORDLIKE = re.compile(r"[ऄ-हक़-ॡॐ]")
SKIP = set("ािीुूृॄॅॆेैॉॊोौ्ँ़ऽ")
CLS = {}
for chars, c in (("कखगघ", "k"), ("ङञणनम", "N"), ("चछजझ", "c"), ("टठडढ", "T"), ("तथदध", "t"), ("पफबभ", "p"), ("य", "y"), ("रऋ", "r"),
                 ("लळ", "l"), ("व", "v"), ("शषस", "s"), ("ह", "h"), ("ॐ", "M")):
    for ch in chars:
        CLS[ch] = c
CLS["ं"] = "N"
CLS["ः"] = "r"
CLS["ज्ञ"] = "cN"


def skel(s):
    s = re.sub(r"[¦‌‍\s\-–—।॥०-९.,;:'‘’\"()…?!\[\]]", "", s)
    s = s.replace("ज्ञ", "cN")
    return [CLS.get(ch, ch) for ch in s if ch not in SKIP and not (0x0904 <= ord(ch) <= 0x0914 or 0x0960 <= ord(ch) <= 0x0963)]


def tokens(lines):
    out = []
    for ln in lines:
        for piece in ln.replace("¦", "").split():
            if WORDLIKE.search(piece):
                out.append(piece)
    return out


def align_unused(a, b):
    """global alignment of two symbol lists; returns for every index of b the aligned index of a (or None)"""
    n, m = len(a), len(b)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        D[i][0] = i
    for j in range(1, m + 1):
        D[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j - 1] + (0 if a[i - 1] == b[j - 1] else 1.1), D[i - 1][j] + 1, D[i][j - 1] + 1)
    res = [None] * m
    i, j = n, m
    while i > 0 or j > 0:
        diag = i > 0 and j > 0 and abs(D[i][j] - (D[i - 1][j - 1] + (0 if a[i - 1] == b[j - 1] else 1.1))) < 1e-9
        up = i > 0 and abs(D[i][j] - (D[i - 1][j] + 1)) < 1e-9
        if up and not (diag and a[i - 1] == b[j - 1] and (i < 2 or j < 2 or a[i - 2] != b[j - 2])):
            i -= 1                       # when a repeated word could match in two places, leave the later one and match the first
        elif diag:
            res[j - 1] = i - 1
            i, j = i - 1, j - 1
        elif i > 0 and up:
            i -= 1
        else:
            j -= 1
    return res


def best_window(A, B, used):
    """the stretch of A (the verse's skeleton) that B (a row's skeleton) matches best: approximate substring match, a stretch already given to another row costs extra"""
    m, n = len(B), len(A)
    if not m or not n:
        return None
    D = [[0.0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        D[i][0] = i
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            D[i][j] = min(D[i - 1][j - 1] + (0 if B[i - 1] == A[j - 1] else 1.1), D[i - 1][j] + 1, D[i][j - 1] + 1)
    best = None
    for e in range(1, n + 1):
        # walk back to the start of this match
        i, j = m, e
        while i > 0 and j > 0:
            if abs(D[i][j] - (D[i - 1][j - 1] + (0 if B[i - 1] == A[j - 1] else 1.1))) < 1e-9:
                i, j = i - 1, j - 1
            elif abs(D[i][j] - (D[i - 1][j] + 1)) < 1e-9:
                i -= 1
            else:
                j -= 1
        st = j
        cost = D[m][e] + 0.7 * sum(used[st:e]) + 0.001 * st
        if best is None or cost < best[0]:
            best = (cost, st, e)
    return best


def spans(toks, keys, claim=True):
    """for every key (a row key or a breakdown item): the {token index: matched symbols} it overlaps"""
    A, owner = [], []
    for ti, t in enumerate(toks):
        for ch in skel(t):
            A.append(ch)
            owner.append(ti)
    used = [0] * len(A)
    cover = []
    for k in keys:
        B = skel(k)
        w = best_window(A, B, used) if B else None
        c = {}
        if w and w[0] <= 0.55 * len(B) + 0.7:      # a poor match is no match
            for p in range(w[1], w[2]):
                c[owner[p]] = c.get(owner[p], 0) + 1
                if claim:
                    used[p] = 1
        cover.append(c)
    return cover, A, owner


def trim_cover(cover, toks):
    """a row that merely grazes a neighbouring token (one symbol) does not belong to it, unless it is the only token it touches"""
    out = []
    for c in cover:
        if not c:
            out.append([])
            continue
        mx = max(c.values())
        keep = sorted(t for t, v in c.items() if len(c) == 1 or v >= 0.8 * len(skel(toks[t])) or (v >= 2 and v >= 0.25 * len(skel(toks[t])) and v >= 0.2 * mx))
        out.append(keep)
    return out


def clean_word(w):
    return w.strip("-।॥ ").strip()


def build_units(verse, items):
    toks = tokens(verse["lines"])
    rows = verse.get("padRaw") or verse["pad"]
    keys = [r[0] for r in rows]
    cover, _, _ = spans(toks, keys)
    cov = trim_cover(cover, toks)
    # union-find over tokens: tokens touched by one row (a phrase) or rows touching one token (a combined word) form one unit
    parent = list(range(len(toks)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for c in cov:
        for t in c[1:]:
            parent[find(t)] = find(c[0])
    # a unit must be a contiguous run of tokens
    groups = {}
    for ti in range(len(toks)):
        groups.setdefault(find(ti), []).append(ti)
    unit_rows = {}
    for ri, c in enumerate(cov):
        if c:
            unit_rows.setdefault(find(c[0]), []).append(ri)
    # breakdown items from the docx (one per verse word, loosely) -> the token they overlap most
    brk = {}
    if items:
        icover, _, _ = spans(toks, items)
        ic = trim_cover(icover, toks)
        for ii, c in enumerate(ic):
            if c:
                brk.setdefault(find(c[0]), []).append(items[ii])
    units = []
    for root, tl in sorted(groups.items(), key=lambda kv: kv[1][0]):
        rl = unit_rows.get(root, [])
        if not rl:
            units.append({"t": tl, "rows": []})
            continue
        units.append({"t": tl, "rows": rl, "brk": brk.get(root, [])})
    return toks, rows, units


def finish(verse, items, memo=None):
    toks, rows, units = build_units(verse, items)
    out, unmapped = [], []
    skel_seen = {}
    for u in units:
        word = " ".join(clean_word(toks[i]) for i in u["t"])
        if not u["rows"]:
            unmapped.append(u)
            continue
        rl = [rows[r] for r in u["rows"]]
        meaning = "; ".join(r[1].strip() for r in rl if r[1].strip())
        if u.get("brk"):
            b = " + ".join(p for item in u["brk"] for p in item.replace(",", "").split("-") if p.strip())
        elif len(rl) > 1 or "-" in rl[0][0]:
            b = " + ".join(p for r in rl for p in re.split(r"-", r[0]) if p.strip())
        else:
            b = ""
        wsk = "".join(skel(word))
        if b and "".join(skel(b)) == wsk and " + " not in b:
            b = ""
        out.append([word, meaning, b, "%d-%d" % (u["t"][0], u["t"][-1])])
        skel_seen[wsk] = out[-1]
    # a word or phrase that comes again in the verse (the three "क्षमस्वापराधं", the refrain "ततः किं") shares the meaning of its first appearance
    def covered(i):
        return any(int(r[3].split("-")[0]) <= i <= int(r[3].split("-")[1]) for r in out)
    base = list(out)
    i = 0
    while i < len(toks):
        if covered(i):
            i += 1
            continue
        hit = None
        for r in sorted(base, key=lambda r: -(int(r[3].split("-")[1]) - int(r[3].split("-")[0]))):
            a0, a1 = (int(x) for x in r[3].split("-"))
            n = a1 - a0 + 1
            if i + n <= len(toks) and not any(covered(k) for k in range(i, i + n)) and ["".join(skel(t)) for t in toks[i:i + n]] == ["".join(skel(t)) for t in toks[a0:a1 + 1]]:
                hit = (r, n)
                break
        if hit:
            r, n = hit
            out.append([" ".join(clean_word(toks[k]) for k in range(i, i + n)), r[1], r[2], "%d-%d" % (i, i + n - 1)])
            i += n
        else:
            i += 1
    # still bare: a word or phrase explained in another verse (the refrain "प्रभो क्लिन्नचित्त", "पालय हे ललितापरमेश्वरि …")
    if memo is not None:
        i = 0
        while i < len(toks):
            if covered(i):
                i += 1
                continue
            hit = None
            for n in range(min(8, len(toks) - i), 0, -1):
                key = tuple("".join(skel(t)) for t in toks[i:i + n])
                if key in memo and not any(covered(k) for k in range(i, i + n)):
                    hit = (key, n)
                    break
            if hit:
                r = memo[hit[0]]
                n = hit[1]
                out.append([" ".join(clean_word(toks[k]) for k in range(i, i + n)), r[1], r[2], "%d-%d" % (i, i + n - 1)])
                i += n
            else:
                i += 1
        for r in out:
            a0, a1 = (int(x) for x in r[3].split("-"))
            memo.setdefault(tuple("".join(skel(t)) for t in toks[a0:a1 + 1]), r)
    out.sort(key=lambda r: int(r[3].split("-")[0]))
    left = [toks[i] for i in range(len(toks)) if not covered(i)]
    return out, left, len(toks)


def docx_items(docx):
    items = S.body_items(zipfile.ZipFile(docx).read("word/document.xml").decode("utf8"))
    if any(k == "p" and t.startswith("【पदच्छेदः】") for k, t in items):     # the Upanishad pattern: a "【पदच्छेदः】 a, b-c ।" paragraph after each table
        res, cur, seen = [], None, False
        for k, t in items:
            if k == "t":
                if seen:
                    res.append(cur)
                cur, seen = [], True
            elif k == "p" and t.startswith("【पदच्छेदः】") and seen:
                cur = [x.strip() for x in re.split(r"[,।\n]", t[len("【पदच्छेदः】"):]) if x.strip()]
        res.append(cur)
        return res
    tabs = [t[0][0] for k, t in items if k == "t"]
    res = []
    for t in tabs:
        m = re.search(r"पदच्छेद \(Word Breakdown\):\s*(.*?)\s*पदार्थ \(Word-by-Word Meaning\):", t, re.S)
        res.append([x.strip(" ।\n") for x in m.group(1).split(",") if x.strip(" ।\n")] if m else [])
    return res


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    slug = args[0]
    docx = args[1] if len(args) > 1 else None
    path = SRC / (slug + ".json")
    st = json.loads(path.read_text(encoding="utf8"))
    dx = docx_items(docx) if docx else [None] * len(st["verses"])
    assert len(dx) == len(st["verses"])
    tot = cov = 0
    memo = {}
    for vi, (v, items) in enumerate(zip(st["verses"], dx), 1):
        if "padRaw" not in v:
            v["padRaw"] = v["pad"]
        out, left, n = finish(v, items, memo)
        v["pad"] = out
        tot += n
        cov += n - len(left)
        flag = [r for r in out if int(r[3].split("-")[1]) - int(r[3].split("-")[0]) >= 3 or r[1].count(";") >= 3]
        if "--report" in sys.argv or left:
            print("verse", vi, "| words", n, "| units", len(out), "| uncovered:", left, "| wide:", [(r[0], r[1][:30]) for r in flag])
    print(slug, "covered", cov, "of", tot, "verse words")
    if "--write" in sys.argv:
        path.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()

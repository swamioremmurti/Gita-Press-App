"""Put a "¦" (phone line-break mark, see lineHtml in swadhyay-stotra-format.js) into every long compound of a stotra's verses.

The split point is a compound boundary taken from the docx's own पदच्छेद line (word-break with hyphens), snapped to a syllable boundary
near the middle of the word, so the two halves are of about the same length.   Print-only with --dry.

usage:  py -I -X utf8 tools/stotra_softsplit.py "<docx>" <slug> [min-length (default 27)] [--dry]
"""
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stotra_docx_to_json as S  # noqa: E402

SRC = Path(__file__).resolve().parent / "stotra-src"
HALF_STICK = "ािीुूृॄॅॆेैॉॊोौ्ँंः़"   # matras, virama, anusvara, visarga, nukta


def boundaries(w):
    """indexes where a line may be cut: the next char starts a syllable and the previous one is not a virama"""
    return [i for i in range(2, len(w) - 1) if w[i] not in HALF_STICK and w[i - 1] != "्"]


def split_word(w, parts):
    """parts: the compound's pieces from the पदच्छेद line (may differ from w by sandhi). Returns w with one ¦ or None."""
    ok = boundaries(w)
    if not ok:
        return None
    total = sum(len(p) for p in parts) or 1
    cum, cuts = 0, []                         # (expected index in w, the piece that starts there)
    for k, p in enumerate(parts[:-1]):
        cum += len(p)
        cuts.append((cum / total * len(w), parts[k + 1]))
    mid = len(w) / 2
    found = []
    for exp, nxt in cuts:                     # a real compound boundary: a syllable start in w that begins like the next piece, near where it is expected
        for b in ok:
            if abs(b - exp) <= 6 and (w[b:b + 2] == nxt[:2] or (len(nxt) < 2 and w[b] == nxt[:1])):
                found.append(b)
    pool = found or ok
    i = min(pool, key=lambda b: abs(b - mid))
    return w[:i] + "¦" + w[i:]


def split_long(w, starts, maxseg=24):
    """a very long compound (an Upanishad prose passage): cut it so that no piece is longer than about maxseg, as few cuts as possible, each cut
    at a syllable start that is also the start of a piece of the docx's own word break (starts: the first two letters of those pieces)"""
    ok = boundaries(w)
    cuts, start = [], 0
    if len(w) <= 40:                       # one cut, near the middle, preferably where a piece of the word break starts
        win = [b for b in ok if len(w) * 0.35 <= b <= len(w) * 0.65]
        real = [b for b in win if w[b:b + 2] in starts]
        pool = real or win or ok
        return w[:min(pool, key=lambda b: abs(b - len(w) / 2))] + "¦" + w[min(pool, key=lambda b: abs(b - len(w) / 2)):]
    while len(w) - start > maxseg:
        top = min(start + maxseg + 3, len(w) - 8)
        win = [b for b in ok if start + 10 <= b <= top]
        real = [b for b in win if w[b:b + 2] in starts]
        later = [b for b in ok if b > start + 6]
        c = max(real) if real else (max(win) if win else (later[0] if later else None))
        if c is None:
            break
        cuts.append(c)
        start = c
    out, prev = "", 0
    for c in cuts:
        out += w[prev:c] + "¦"
        prev = c
    return out + w[prev:]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    if len(args) < 2:
        raise SystemExit(__doc__)
    src, slug = args[:2]
    minlen = int(args[2]) if len(args) > 2 else 27
    items = S.body_items(zipfile.ZipFile(src).read("word/document.xml").decode("utf8"))
    tabs = [t[0][0] for k, t in items if k == "t"]
    path = SRC / (slug + ".json")
    st = json.loads(path.read_text(encoding="utf8"))
    assert len(tabs) == len(st["verses"])
    n = 0
    up = any(k == "p" and t.startswith("【पदच्छेदः】") for k, t in items)     # the Upanishad docx pattern: several cuts per word allowed
    if up:
        import stotra_wordmap as W
        ups = W.docx_items(src)
    for vi, (tab, v) in enumerate(zip(tabs, st["verses"])):
        if up:
            items_ = ups[vi]
        else:
            bm = re.search(r"पदच्छेद \(Word Breakdown\):\s*(.*?)\s*पदार्थ \(Word-by-Word Meaning\):", tab, re.S)
            items_ = [x.strip(" ।\n") for x in bm.group(1).split(",")] if bm else []
        broken = [x.split("-") for x in items_ if x]
        starts = {p[:2] for x in broken for p in x if len(p) >= 2}
        for k, line in enumerate(v["lines"]):
            out = []
            for w in line.split(" "):
                if len(w.replace("¦", "")) >= minlen and "¦" not in w:
                    # the breakdown item that starts like this word and has about its length
                    cand = [b for b in broken if "".join(b)[:3] == w[:3] and abs(len("".join(b)) - len(w)) <= (10 if not up else 10 + len(w) // 8)]
                    nw = split_long(w, starts) if up else split_word(w, cand[0] if cand else [])
                    if nw == w:
                        nw = None
                    if nw:
                        n += 1
                        print(nw)
                        w = nw
                out.append(w)
            v["lines"][k] = " ".join(out)
    print("split words:", n)
    if not dry:
        path.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

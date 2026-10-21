#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_visarga_colon.py -- many of the books were typed with the ASCII colon ":" where Sanskrit needs the visarga "ः" ("नम:" for "नमः",
"दु:ख" for "दुःख", "ऋषि:" for "ऋषिः").  This puts the visarga back, in the text of the books only (never in tags, attributes, <style>,
<script> or comments).

A colon is a visarga when it follows a Devanagari letter or vowel sign and

  1. a letter follows it at once ("दु:ख", "अन्त:करण")                                    -- always;
  2. a danda follows it, with or without a space ("विनियोग:।", "नम: ॥")                    -- always;
  3. a closing mark follows it (’ ” ) ] , ; . ? ! * / =): "‘न:’", "अत:,", "त्रिणाचिकेत:="                          -- always;
  4. in a Hindi block: the word is a Sanskrit adverb (अत:, पुन:, प्राय:, क्रमश:, वस्तुत:, विशेषत: ...);
  5. it stands in a Sanskrit block (see below) and anything else follows (space, end of the block, a bracket, a comma ...), unless a
     digit follows ("अध्याय:१८"), in which case it is left alone.

A "block" is the run of text between two block-level tags (paragraph, heading, list item, table cell ...); inline tags (span, b, i, a ...)
do not end it.  A block is Hindi (or English) if it holds one of the common Hindi function words (है, हैं, का, की, के, को, में, से, यह, जो,
नहीं ...), otherwise Sanskrit.  In Hindi blocks the colon before a space and text ("उदाहरण: ...", "नोट: ...") is a real colon and stays.
Colons that follow a digit or a Latin letter ("१८:६६", "http:") are never touched.

    python tools/fix_visarga_colon.py             # report only (no files written)
    python tools/fix_visarga_colon.py --apply     # write; each changed book is first copied to backups/before-visarga-colon/
    python tools/fix_visarga_colon.py --samples 40   # show examples of what changes / what stays, per case
"""
import argparse
import collections
import os
import re
import shutil
import time
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
BACKUP = ROOT / "backups" / "before-visarga-colon"
# books typed with real colons and correct visargas, which this tool must leave alone
SKIP_BOOKS = {"अथर्वशिखोपनिषत्.html"}

SKIP = re.compile(r"(<!--.*?-->|<style\b.*?</style>|<script\b.*?</script>)", re.S)
TAG = re.compile(r"(<[^>]+>)")
BLOCK_TAG = re.compile(r"^<\s*/?\s*(p|div|li|ul|ol|h[1-6]|td|th|tr|table|section|article|hr|body|html|head|title|blockquote|dd|dt|dl|figure|figcaption|br\s*/?)\b", re.I)
COLON = re.compile(r"(?<=[ऀ-ंऄ-ॣ॰-ॿ]):")
HINDI = set("है हैं था थे थी का की के को में से यह वह जो नहीं भी और साथ लिये लिए द्वारा अपने करते करना करता होता जाता हुआ हुई हुए रहा रही रहे गया गये गई गयी सकता सकते चाहिये चाहिए कहा कहते वाला वाली वाले उसके उसकी उनके उनकी इसके इसकी हम तुम आप मैं मेरा मेरी तेरा तेरी क्या क्यों कैसे कौन जब तब अब यहाँ वहाँ जिस उसे इसे उन्हें इन्हें लेकिन परन्तु किन्तु अर्थात् अर्थात".split())
WORD = re.compile(r"[ऀ-ॿ]+")


# Sanskrit adverbs that Hindi prose uses with their visarga: "अत:", "पुन:", "क्रमश:" ...
ADVERBS = set("अत पुन प्राय प्रात छ शनै क्रमश अक्षरश शब्दश प्रायश बहुश अन्त नम मात सर्वत तत यत कुत इत अमुत".split())
# words that head an explanation line ("पदार्थ: ...", "टिप्पणी: ...", "उदाहरण: ...") -- a real colon
LABEL_WORDS = set("पदार्थ भावार्थ टिप्पणी अर्थ शब्दार्थ अनुवाद व्याख्या विशेष नोट उदाहरण प्रश्न उत्तर सूचना संदर्भ सन्दर्भ पाठ मन्त्र व्याकरण सारांश निष्कर्ष तात्पर्य भाव टीका कथन उपाय लाभ विधि नियम".split())
# labels of a commentary that stand alone ("अन्वय:", "भावार्थ:"): a real colon even where nothing Hindi follows in the same block
COMMENTARY_LABELS = set("पादटिप्पणी पदार्थ भावार्थ अन्वय टिप्पणी शब्दार्थ पदच्छेद उदाहरण नोट सारांश अनुवाद व्याख्या".split())
LABELS = {"देवता"}                                  # "देवता: इन्द्रः" in the सामवेद is a label, not "देवताः"
CLOSERS = set("’”')]},;.?!*/=")                   # a colon that is followed by one of these ends a word: it is a visarga
NUMBERED = re.compile(r"[०-९0-9]+[.)]?\s*$")
HALF = re.compile(r"[ऀ-ॿ]+$")


def adverb_like(word):
    """"-तः" adverbs (वस्तुत:, स्वभावत:, विशेषत: ...): a word ending in त after a consonant or ु / ू; not "संकेत:", "उद्धृत:" (े, ृ ...)."""
    return word in ADVERBS or (len(word) > 2 and word.endswith("त") and word[-2] not in "ेिीृाैोौ")


def is_hindi(text):
    return any(w in HINDI for w in WORD.findall(text))


def fix_block(parts):
    """parts: list of strings (text nodes and inline tags) of one block.  Returns (new parts, case counts)."""
    text = "".join(p for p in parts if not p.startswith("<"))
    hindi = is_hindi(text)
    counts = collections.Counter()
    out = []
    for k, p in enumerate(parts):
        if p.startswith("<") or ":" not in p:
            out.append(p)
            continue

        def repl(m):
            nxt = p[m.end():m.end() + 1]
            nxt2 = p[m.end():m.end() + 2]
            lw = HALF.search(p[:m.start()])
            if lw and lw.group(0) in COMMENTARY_LABELS:
                counts["kept-label"] += 1             # "भावार्थ:" ... -- a label's colon, wherever it stands
                return m.group(0)
            if nxt and "ऀ" <= nxt <= "ॿ" and nxt not in "।॥":
                case = "letter"                        # दु:ख
            elif nxt in ("।", "॥") or (nxt == " " and nxt2[1:] in ("।", "॥")):
                case = "danda"                        # विनियोग:।
            elif nxt.isdigit():
                return m.group(0)
            elif nxt in CLOSERS:
                case = "closer"                       # ‘न:’  अत:, (नम:)  त्रिणाचिकेत:=इसलिये
            elif hindi:
                w = HALF.search(p[:m.start()])
                w = w.group(0) if w else ""
                if nxt in "—–-" and NUMBERED.search(p[:m.start() - len(w)]):
                    case = "numbered-name"            # "१८६ शक्राद्यधीश्वर:—इन्द्र ..." (the names of a सहस्रनाम)
                elif adverb_like(w):
                    case = "hindi-adverb"             # अत: , पुन: , वस्तुत:
                elif nxt == " " and w not in LABEL_WORDS and not any(x in HINDI for x in WORD.findall(p[m.end():m.end() + 40])[:2])                         and WORD.findall(p[m.end():m.end() + 40]):
                    case = "sanskrit-quote"           # a Sanskrit word quoted in Hindi: "आकाश: परायणम्"  (the next words are not Hindi)
                else:
                    counts["kept-in-hindi-block"] += 1
                    return m.group(0)
            else:
                w = HALF.search(p[:m.start()])
                if w and (w.group(0) in LABELS or w.group(0) in COMMENTARY_LABELS) and nxt in (" ", ""):
                    counts["kept-label"] += 1
                    return m.group(0)
                case = "sanskrit-block"
            counts[case] += 1
            return "ः"
        out.append(COLON.sub(repl, p))
    return out, counts


def fix_text(s):
    total = collections.Counter()
    pieces = []
    for chunk in SKIP.split(s):
        if SKIP.fullmatch(chunk or "x"):
            pieces.append(chunk)
            continue
        toks = [t for t in TAG.split(chunk) if t != ""]
        block, res = [], []

        def flush():
            if block:
                new, c = fix_block(block)
                total.update(c)
                res.extend(new)
                block.clear()
        for t in toks:
            if t.startswith("<") and BLOCK_TAG.match(t):
                flush()
                res.append(t)
            else:
                block.append(t)
        flush()
        pieces.append("".join(res))
    return "".join(pieces), total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only", default="", help="a single book file name")
    a = ap.parse_args()
    grand = collections.Counter()
    changed = 0
    for fn in sorted(os.listdir(BOOKS)):
        if not fn.endswith(".html") or fn in SKIP_BOOKS or (a.only and fn != a.only):
            continue
        path = BOOKS / fn
        with open(path, encoding="utf-8", newline="") as fh:
            s = fh.read()
        new, c = fix_text(s)
        grand.update(c)
        if new != s:
            changed += 1
            if a.apply:
                dst = BACKUP / fn
                if not dst.exists():
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(path, dst)
                for attempt in range(8):
                    try:
                        with open(path, "wb") as fh:
                            fh.write(new.encode("utf-8"))
                        break
                    except OSError:
                        time.sleep(1.5)
                else:
                    print("!! could not write (locked by another program?):", fn)
    print("books changed:", changed)
    for k, v in sorted(grand.items()):
        print("  %-22s %d" % (k, v))
    if not a.apply:
        print("(report only -- run with --apply to write)")


if __name__ == "__main__":
    main()

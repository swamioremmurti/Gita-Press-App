# -*- coding: utf-8 -*-
"""
ocr_quotes.py -- make the quote marks of an OCR'd Hindi paragraph consistent.

The OCR reads one printed quote mark as any of  “ ” ‘ ’ ' " ` *  (an opening ‘ may come out as “ or ` or *, a closing ’ as ' or ”).  Here every such mark
is first given a role -- opening or closing -- from its own shape where that is certain (“ ‘ ` open, ” ’ close) and otherwise from its neighbours (a mark that
follows a space or a dash and precedes a letter opens, one that follows a letter and precedes a space or a punctuation closes; when both sides are alike it
opens if no quote is open and closes if one is).  Marks are then paired, and written as a pair of ‘ ’ -- or “ ” when the pair is the whole paragraph (a speech or a
quotation, followed at most by its reference) -- and a pair inside a pair takes the other kind.  A quote that opens at the start of a paragraph and closes in a later
one is left as “ (opening) and ” (closing).

    normalize_quotes("मैं 'सब कुछ' हूँ")  ->  "मैं ‘सब कुछ’ हूँ"
"""
import re

OPEN_F = set("“‘`")
CLOSE_F = set("”’")
AMB = set("'\"")
PUNCT_AFTER = set("।॥,;:!?)]}-—.")
PUNCT_BEFORE = set("([{-—")


def normalize_quotes(t):
    n = len(t)
    marks = []                                    # [index, role]  role: 'o' / 'c'
    stack_depth = 0
    for i, ch in enumerate(t):
        if ch not in OPEN_F and ch not in CLOSE_F and ch not in AMB and ch != "*":
            continue
        prev = t[i - 1] if i else None
        nxt = t[i + 1] if i + 1 < n else None
        p_space = prev is None or prev.isspace() or prev in PUNCT_BEFORE or prev in OPEN_F
        n_space = nxt is None or nxt.isspace() or nxt in PUNCT_AFTER or nxt in CLOSE_F
        lone = ch == "*" and p_space and n_space
        if lone and not t[i + 1:].strip():
            continue                              # a star at the very end of the text is not a quote
        if lone:                                  # a star between two spaces: the OCR's quote mark; before a "(reference" it closes
            role = "c" if (t[i + 1:].lstrip().startswith("(") or stack_depth) else "o"
        elif ch in OPEN_F and p_space and not n_space:
            role = "o"
        elif ch in OPEN_F and stack_depth == 0:
            role = "o"
        elif ch in OPEN_F:                        # an opening-shaped mark inside a quote, after a letter or before a space: the OCR's closing mark
            role = "c" if (not p_space or n_space) else "o"
        elif ch in CLOSE_F:
            role = "c"
        elif p_space and not n_space:
            role = "o"
        elif n_space and not p_space:
            role = "c"
        else:
            role = "o" if stack_depth == 0 else "c"
        if role == "o":
            stack_depth += 1
        elif stack_depth:
            stack_depth -= 1
        marks.append([i, role])

    # two marks of the same role side by side ("‘“", "'”") are one mark
    drop = set()
    for a, b in zip(marks, marks[1:]):
        if a[1] == b[1] and not t[a[0] + 1:b[0]].strip():
            drop.add(b[0])
    marks = [m for m in marks if m[0] not in drop]

    # pair them
    stack, pairs, unmatched = [], [], []
    for i, role in marks:
        if role == "o":
            stack.append(i)
        elif stack:
            pairs.append((stack.pop(), i, len(stack)))
        else:
            unmatched.append((i, "c"))
    unmatched += [(i, "o") for i in stack]

    first = next((k for k, ch in enumerate(t) if not ch.isspace()), 0)
    glyph = {}
    kind = {}                                    # opener index -> 'd' / 's' of the pair that holds it
    for o, c, depth in sorted(pairs, key=lambda x: x[2]):
        parent = next((kind[po] for po, pc, pd in pairs if pd == depth - 1 and po < o and pc > c), None)
        if depth == 0:
            whole = o == first and len(t) - c <= 46 and (c - o) >= 0.6 * len(t)
            k = "d" if whole else "s"
        else:
            k = "s" if parent == "d" else "d"
        kind[o] = k
        glyph[o], glyph[c] = ("“", "”") if k == "d" else ("‘", "’")
    for i, role in unmatched:
        if role == "o":
            glyph[i] = "“" if i == first else "‘"
        else:
            rest = t[i + 1:].strip(" ।॥.")
            glyph[i] = "”" if len(rest) <= 3 or rest.startswith("(") else "’"
    out = []
    for i, ch in enumerate(t):
        if i in drop:
            continue
        out.append(glyph.get(i, ch))
    s = "".join(out)
    s = re.sub(r"([“‘]) +", r"\1", s)            # no space inside the opening mark
    s = re.sub(r" +([”’])", r"\1", s)            # ... nor before the closing mark
    s = re.sub(r"([”’])\(", r"\1 (", s)          # but a reference after it stays apart
    return s

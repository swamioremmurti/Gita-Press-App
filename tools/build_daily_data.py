#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_daily_data.py -- data for the home page's three "daily" cards (Gita self-learning,
Ramcharitmanas pathways, daily bhajan).

Reads the two source books and writes small static JSON files under assets/data/v1/ (served by the CDN, so
the home page never waits on a function):

  gita/index.json, gita/chNN.json   every shloka of the Gita (chapter by chapter): the verse lines, the speaker
                                    and the Hindi meaning, from "श्रीमद्भगवद्गीता तत्त्वविवेचनी हिन्दी टीकासहित"
  manas/index.json, manas/pNN.json  the Ramcharitmanas in small reading units (a couplet of chaupai lines or a doha, with
                                    its Hindi meaning), in shards of 120 units
  manas/plan.json                   the 9-day (नवाह्नपारायण) and 30-day (मासपारायण) schedules, found from the
                                    printed विश्राम marks, each with the kanda / doha range of the day

It also puts invisible anchors into the two books so the cards can open the reader at the right place:
  id="gita_<chapter>_<verse>"   on the few shlokas of the Gita book that had no id (the rest already have Chapter_N_V)
  id="manas_navah_N" / "manas_masa_N"   on the first paragraph of each विश्राम of the Manas book
(the original books are copied to backups/before-daily-ids/ first). Re-running starts again from those copies --
which still carry the old toc_marker-N-V ids, so run tools/rename_toc_ids.py after a re-run.

Run:  python tools/build_daily_data.py
"""
import collections
import io
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "Gita Press Books" / "Gita Press Books"
OUT = ROOT / "assets" / "data" / "v1"
BACK = ROOT / "backups" / "before-daily-ids"
GITA = "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html"
MANAS = "श्रीरामचरितमानस.html"

TR = str.maketrans("०१२३४५६७८९", "0123456789")
DEV = "०१२३४५६७८९"
SHARD = 120
EXPECTED = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78]
CHAPTER_NAMES = ["अर्जुनविषादयोग", "साङ्ख्ययोग", "कर्मयोग", "ज्ञानकर्मसंन्यासयोग", "कर्मसंन्यासयोग", "आत्मसंयमयोग",
                 "ज्ञानविज्ञानयोग", "अक्षरब्रह्मयोग", "राजविद्याराजगुह्ययोग", "विभूतियोग", "विश्वरूपदर्शनयोग", "भक्तियोग",
                 "क्षेत्रक्षेत्रज्ञविभागयोग", "गुणत्रयविभागयोग", "पुरुषोत्तमयोग", "दैवासुरसम्पद्विभागयोग",
                 "श्रद्धात्रयविभागयोग", "मोक्षसंन्यासयोग"]


def dev(n):
    return "".join(DEV[int(d)] for d in str(n))


def clean(t):
    return re.sub(r"\s+", " ", t.replace("&#x27;", "'").replace("&amp;", "&").replace("&nbsp;", " ").replace("\xa0", " ")).strip()


def read_original(name):
    BACK.mkdir(parents=True, exist_ok=True)
    bak = BACK / name
    if not bak.exists():
        shutil.copy2(BOOKS / name, bak)
    return bak.read_text(encoding="utf-8")


def paragraphs(html):
    out = []
    for m in re.finditer(r"<p\b([^>]*)>(.*?)</p>", html, re.S):
        cm = re.search(r'class="([^"]*)"', m.group(1))
        out.append({"cls": cm.group(1) if cm else "", "text": clean(re.sub(r"<[^>]+>", "", m.group(2))), "m": m})
    return out


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def rewrite(html, paras, inserts):
    """inserts: {paragraph index: ("attr", ' id="..."') or ("span", '<span id=...></span>')}"""
    out, last = [], 0
    for i, p in enumerate(paras):
        if i not in inserts:
            continue
        m = p["m"]
        kind, text = inserts[i]
        if kind == "attr":
            pos = m.start(1) + len(m.group(1))            # end of the opening tag's attributes
            out.append(html[last:pos]); out.append(text); last = pos
        else:
            out.append(html[last:m.start(2)]); out.append(text); last = m.start(2)
    out.append(html[last:])
    return "".join(out)


# ------------------------------------------------------------------ Gita
def build_gita():
    html = read_original(GITA)
    paras = paragraphs(html)
    ch = 0
    chapters = collections.defaultdict(list)
    inserts = {}
    for i, p in enumerate(paras):
        c, t = p["cls"], p["text"]
        if c.startswith("Heading") and t.startswith("अथ") and "ध्याय" in t:
            ch += 1
            continue
        if ch == 0 or not c.startswith("Shlok"):
            continue
        m = re.match(r"\(श्लोक-([०-९]+)\s*(?:[–\-—]\s*([०-९]+))?\)\s*(.*)$", t)
        if not m:
            continue
        v1 = int(m.group(1).translate(TR))
        v2 = int(m.group(2).translate(TR)) if m.group(2) else v1
        rest = m.group(3).strip()
        j = i + 1
        speaker = ""
        while j < len(paras) and paras[j]["cls"].startswith("Uv"):
            speaker = paras[j]["text"]; j += 1
        lines = [rest] if rest else []
        while j < len(paras) and paras[j]["cls"].startswith("Shlok") and not re.match(r"\(श्लोक-", paras[j]["text"]):
            lines.append(paras[j]["text"]); j += 1
        meaning = paras[j]["text"] if j < len(paras) and re.match(r"(Bhav|Arth)", paras[j]["cls"]) else ""
        if not lines:
            continue
        # most shloka-number paragraphs already carry an id ("Chapter_6_47"); reuse it, add one where it is missing
        have = re.search(r'id="([^"]+)"', paras[i]["m"].group(1))
        anchor = have.group(1) if have else "gita_%d_%d" % (ch, v1)
        if not have:
            inserts[i] = ("attr", ' id="%s"' % anchor)
        chapters[ch].append({"v": str(v1) if v1 == v2 else "%d-%d" % (v1, v2), "id": anchor,
                             "s": speaker, "t": lines, "m": meaning})
    covered = 0
    for k in range(1, 19):
        seen = set()
        for e in chapters[k]:
            a, _, b = e["v"].partition("-")
            seen.update(range(int(a), int(b or a) + 1))
        covered += len(seen & set(range(1, EXPECTED[k - 1] + 1)))
        missing = sorted(set(range(1, EXPECTED[k - 1] + 1)) - seen)
        if missing:
            print("  gita chapter", k, "missing verses", missing)
    print("gita: %d entries, %d of 700 verses" % (sum(len(v) for v in chapters.values()), covered))
    index = []
    for k in range(1, 19):
        write_json(OUT / "gita" / ("ch%02d.json" % k), {"ch": k, "name": CHAPTER_NAMES[k - 1], "shlokas": chapters[k]})
        index.append({"ch": k, "name": CHAPTER_NAMES[k - 1], "n": len(chapters[k])})
    write_json(OUT / "gita" / "index.json", {"file": GITA, "chapters": index, "total": sum(x["n"] for x in index)})
    (BOOKS / GITA).write_text(rewrite(html, paras, inserts), encoding="utf-8", newline="")


# ------------------------------------------------------------------ Ramcharitmanas
KANDA = re.compile(r"काण्ड$")
DOHA_NUM = re.compile(r"॥\s*([०-९]+)\s*(?:\([^)]*\))?\s*॥")


def build_manas():
    html = read_original(MANAS)
    paras = paragraphs(html)
    kandas = [(i, p["text"]) for i, p in enumerate(paras) if p["cls"].startswith("Heading") and KANDA.search(p["text"])]
    end = next(i for i, p in enumerate(paras) if p["cls"].startswith("Heading") and "आरती" in p["text"])
    start = kandas[0][0]

    def kanda_at(i):
        name = ""
        for ki, kn in kandas:
            if ki <= i:
                name = kn
        return name

    # reading units: a run of Shlok lines (+ the Hindi meaning that follows)
    units, kcount = [], collections.Counter()
    i = start
    while i < end:
        if paras[i]["cls"] == "Shlok":
            j = i
            lines = []
            while j < end and paras[j]["cls"] == "Shlok":
                lines.append(paras[j]["text"]); j += 1
            meaning = ""
            if j < end and paras[j]["cls"] == "TXT":
                meaning = paras[j]["text"]
            k = kanda_at(i)
            n0 = kcount[k] + 1
            kcount[k] += len(lines)
            m = meaning if len(meaning) <= 280 else meaning[:277].rsplit(" ", 1)[0] + "…"
            units.append({"k": [x[1] for x in kandas].index(k), "n": [n0, kcount[k]], "t": lines, "m": m})
            i = j
        else:
            i += 1
    shards = [units[x:x + SHARD] for x in range(0, len(units), SHARD)]
    for si, sh in enumerate(shards):
        write_json(OUT / "manas" / ("p%02d.json" % (si + 1)), sh)
    write_json(OUT / "manas" / "index.json", {"file": MANAS, "total": len(units), "shard": SHARD, "shards": len(shards),
                                               "kandas": [x[1] for x in kandas]})
    print("manas: %d units in %d shards" % (len(units), len(shards)))

    # the 9-day and 30-day schedules, from the printed marks
    marks = {"navah": [], "masa": []}
    for i, p in enumerate(paras):
        if p["cls"] == "TXT-Right":
            if p["text"].startswith("नवाह्नपारायण"):
                marks["navah"].append(i)
            elif p["text"].startswith("मासपारायण"):
                marks["masa"].append(i)
    print("manas marks:", {k: len(v) for k, v in marks.items()})
    all_marks = set(marks["navah"]) | set(marks["masa"])
    inserts = {}
    plan = {}
    for key, label in (("navah", "नवाह्न"), ("masa", "मास")):
        days, prev = [], start
        for n, mi in enumerate(marks[key], 1):
            # the day's first paragraph: right after the previous mark (or the first kanda's heading)
            s0 = prev + 1
            while s0 < mi and (s0 in all_marks or not paras[s0]["text"]):
                s0 += 1
            nums = []
            for q in range(s0, mi):
                if paras[q]["cls"] in ("Shlok", "Doha") and re.search(r"[॥]\s*[०-९]+", paras[q]["text"]):
                    mm = DOHA_NUM.findall(paras[q]["text"])
                    if mm:
                        nums.append(mm[-1])
            inc = []                                       # doha numbers only ever go up within a day
            for x in nums:
                if not inc or int(x.translate(TR)) >= int(inc[-1].translate(TR)):
                    inc.append(x)
            nums = inc
            k0, k1 = kanda_at(s0), kanda_at(mi)
            rng = ("दोहा " + nums[0] + ("–" + nums[-1] if nums[-1] != nums[0] else "")) if nums else ""
            lab = k0 + (" · " + rng if rng else "")
            if k1 != k0:
                lab = k0 + " → " + k1
            first, q = [], s0                              # the day's opening lines, for the card
            while q < mi and paras[q]["cls"] != "Shlok":
                q += 1
            while q < mi and paras[q]["cls"] == "Shlok" and len(first) < 4:
                first.append(paras[q]["text"]); q += 1
            days.append({"n": n, "id": "manas_%s_%d" % (key, n), "kanda": k0, "label": lab, "t": first})
            inserts.setdefault(s0, []).append('<span id="manas_%s_%d"></span>' % (key, n))
            prev = mi
        plan[key] = days
    write_json(OUT / "manas" / "plan.json", plan)
    spans = {i: ("span", "".join(v)) for i, v in inserts.items()}
    (BOOKS / MANAS).write_text(rewrite(html, paras, spans), encoding="utf-8", newline="")
    return plan


if __name__ == "__main__":
    build_gita()
    plan = build_manas()
    for k, v in plan.items():
        print(k, len(v), [d["label"] for d in v][:4])

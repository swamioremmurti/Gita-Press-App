#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_shloka_audio_index.py -- list the recorded Gita shlokas so the site knows which ones can be played.

Recordings live in assets/audio/gita/ and are named  <chapter>_<verse>.mp3  (1_1.mp3 = chapter 1, shloka 1;
a verse pair would be 4_4-5.mp3). This script finds every such file and writes assets/audio/gita/index.json:

    { "1_1": { "id": "Chapter_6_1" }, ... }

"id" is the anchor of that shloka in the Gita book (the reader puts a small play button next to it).
The daily Gita card and the reader read this file; a shloka without an entry simply has no play button.

Run after adding recordings:   python tools/build_shloka_audio_index.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio" / "gita"
DATA = ROOT / "assets" / "data" / "v1" / "gita"


def main():
    out = {}
    for f in sorted(AUDIO.glob("*.mp3")):
        m = re.fullmatch(r"(\d+)_(\d+(?:-\d+)?)", f.stem)
        if not m:
            print("skipped (name is not <chapter>_<verse>):", f.name)
            continue
        ch, v = int(m.group(1)), m.group(2)
        chapter = json.loads((DATA / ("ch%02d.json" % ch)).read_text(encoding="utf-8"))
        entry = next((e for e in chapter["shlokas"] if e["v"] == v), None)
        if not entry:
            print("no such shloka in the book data:", f.name)
            continue
        # a recording gets its play button next to the book's sub-chapter only when it is that sub-chapter's first
        # shloka (a group such as "श्लोक ४-६" has one anchor)
        out["%d_%s" % (ch, v)] = {"id": entry["id"]} if entry.get("f", 1) else {}
    (AUDIO / "index.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("indexed %d recording(s):" % len(out), ", ".join(out))


if __name__ == "__main__":
    main()

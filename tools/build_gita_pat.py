#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_gita_pat.py -- data and audio for the Gita पाठ page (swadhyay-gita-pat.js, route /gita-pat-test).

TEXT   comes from the book  "Gita Press Books/Gita Press Books/पदच्छेद.html"  (श्रीमद्भगवद्गीता -- पदच्छेद अन्वय और साधारण भाषाटीकासहित):
       the <p class="Shlok"> lines of every <p class="Shlok-Number">, and the <p class="Uwach"> line before / after it.
       Two verses are not in that edition and keep the recording's own text: 13.1 (Arjuna's question, to which "अर्जुन उवाच" is added)
       and 18.31 (the book skips it).  In the book chapter 13 therefore counts one less (its 13.1 is the recording's 13.2).
AUDIO  <verses dir>/CC_VVV.wav   one recording per verse (24 kHz mono), without any spoken उवाच
       <verses dir>/UV_arjuna|bhagavan|dhritarashtra|sanjaya.wav   the four उवाच clips
TIMES  <timestamps dir>/gita_chNN.json is read only for the text of 13.1 / 18.31.  Line times are found in the audio itself:
       the Sanskrit speech model of asr-service/ (CTC) reads each verse and its text is aligned to the book's lines, which gives
       the moment every line starts (checked on 59 verses whose line starts are known: mean error 0.01 s, spread 0.04 s).  A real
       pause before that moment (found from the signal) ends the line before it; recitations without a pause are cut at the start.

Writes assets/audio/gita-pat/CC_VVV.mp3 and UV_*.mp3     mono, 24 kHz, 40 kbps (LAME via the lameenc package)
       assets/data/gita-pat/chNN.json   {"ch":1,"v":[{"n":1,"d":9.67,"p":[[line, from, to, clip?], ...]}]}
       from/to are seconds INSIDE the verse's own mp3 -- or inside the clip named by the optional 4th item ("UV_sanjaya"),
       which marks the उवाच line.

    py -I -X utf8 tools/build_gita_pat.py "<verses dir>" "<timestamps dir>" [--data-only]
"""
import difflib
import html
import itertools
import json
import re
import sys
import wave
from pathlib import Path

import lameenc
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "asr-service"))     # featurizer.py of the speech service

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio" / "gita-pat"
DATA = ROOT / "assets" / "data" / "gita-pat"
BOOK = ROOT / "Gita Press Books" / "Gita Press Books" / "पदच्छेद.html"
KBPS = 40
DIG = "०१२३४५६७८९"
CLIPS = {"धृतराष्ट्र": "UV_dhritarashtra", "सञ्जय": "UV_sanjaya", "संजय": "UV_sanjaya", "अर्जुन": "UV_arjuna", "भगवान": "UV_bhagavan"}


# ------------------------------------------------------------------ the book
def clean_line(s):
    s = s.replace("‌", "")
    s = re.sub("‍+", "‍", s)
    s = re.sub("(?<!्)‍", "", s)                       # a joiner only means something after a virama
    s = re.sub("([ऀ-ॿ]):", r"\1ः", s)             # an ASCII colon typed for a visarga
    return re.sub(r"\s+", " ", s).strip()


def read_book(path):
    """-> {(chapter, verse): {"uw": "…उवाच" or "", "lines": [..]}} with the verse numbers as printed in the book"""
    t = Path(path).read_text(encoding="utf-8")
    body = t[t.index("<body"):]
    paras = re.findall(r'<p(?: id="([^"]*)")?(?: [^>]*?)? class="([^"]+)"[^>]*>(.*?)</p>', body, flags=re.S)

    def txt(s):
        return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ")).strip()

    out, ch, pend, i = {}, 0, None, 0
    while i < len(paras):
        cls, s = paras[i][1].split()[0], txt(paras[i][2])
        if cls == "Heading" and "ध्याय" in s:
            ch += 1
        if cls == "Uwach":
            pend = s
        elif cls == "Shlok-Number":
            n = int("".join(str(DIG.index(c)) for c in re.search(r"[०-९]+", s).group()))
            uws, lines, j, closed = ([pend] if pend else []), [], i + 1, False
            pend = None
            while j < len(paras) and not closed:
                c1, s1 = paras[j][1].split()[0], txt(paras[j][2])
                if c1 == "Uwach":
                    uws.append(s1)
                elif c1 == "Shlok":
                    lines.append(clean_line(s1))
                    closed = s1.rstrip().endswith("॥") and not re.search(r"[०-९0-9]", s1)
                elif c1 in ("Shlok-L", "Padchched-1", "Bole", "Shlok-Number"):
                    break
                j += 1
            assert len(uws) <= 1 and lines, (ch, n, uws, lines)
            out[(ch, n)] = {"uw": re.sub(r"[\s—.\-]+$", "", uws[0]) if uws else "", "lines": lines}
            i = j - 1
        i += 1
    return out


def clip_of(uw):
    for k, v in CLIPS.items():
        if k in uw:
            return v
    raise ValueError(uw)


# ------------------------------------------------------------------ the audio
def read_wav(path):
    with wave.open(str(path)) as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2, path
        rate, frames = w.getframerate(), w.readframes(w.getnframes())
    return rate, frames


def encode(wav_path, mp3_path):
    rate, frames = read_wav(wav_path)
    enc = lameenc.Encoder()
    enc.set_bit_rate(KBPS)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    mp3 = enc.encode(frames) + enc.flush()
    mp3_path.write_bytes(mp3)
    return len(mp3)


def pauses(wav_path, fr=0.01, rel=0.06, minlen=0.2):
    """-> (pauses inside the speech [(from, to)], speech start, speech end, duration), all in seconds"""
    rate, frames = read_wav(wav_path)
    x = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
    n = int(rate * fr)
    m = len(x) // n
    rms = np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(1))
    sil = rms < rel * np.percentile(rms, 90)
    sp = np.where(~sil)[0]
    dur = len(x) / rate
    if len(sp) == 0:
        return [], 0.0, dur, dur
    s0, s1 = int(sp[0]), int(sp[-1]) + 1
    out, i = [], s0
    while i < s1:
        if sil[i]:
            j = i
            while j < s1 and sil[j]:
                j += 1
            if (j - i) * fr >= minlen:
                out.append((i * fr, j * fr))
            i = j
        else:
            i += 1
    return out, s0 * fr, s1 * fr, dur


def weight(t):
    return len(re.sub(r"[\s।॥\-‍‌\d.,:;—]", "", t))


_asr = {}


def asr_starts(wav_path, lines):
    """seconds at which lines 2.. start, from the Sanskrit speech model; None where the model did not hear the verse well enough"""
    if not _asr:
        import onnxruntime as ort
        from featurizer import Featurizer
        md = ROOT / "asr-service" / "model"
        cfg = json.loads((md / "config.json").read_text(encoding="utf-8"))
        _asr.update(cfg=cfg, vocab=json.loads((md / "vocab.json").read_text(encoding="utf-8")), feat=Featurizer(cfg),
                    sess=ort.InferenceSession(str(md / "model.onnx"), providers=["CPUExecutionProvider"]))
    cfg, vocab = _asr["cfg"], _asr["vocab"]
    rate, frames = read_wav(wav_path)
    x = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    x = np.interp(np.arange(int(len(x) * 16000 / rate)) * (rate / 16000), np.arange(len(x)), x).astype(np.float32)
    f, ln = _asr["feat"](x)
    out = _asr["sess"].run([cfg["output_logprobs"]], {cfg["input_audio"]: f, cfg["input_length"]: ln})[0][0]
    ids, step, blank = out.argmax(-1), len(x) / 16000.0 / len(out), int(cfg["blank_id"])
    rec, prev = [], -1                                   # (character, time) of what the model heard
    for i, t in enumerate(ids):
        if t != prev and t != blank:
            rec += [(c, i * step) for c in vocab[int(t)].replace("▁", "")]
        prev = t
    skip = re.compile(r"[\s।॥\-‍‌,.:ः\d]")
    ref = "".join(skip.sub("", l) for l in lines)
    heard = "".join(c for c, _ in rec)
    sm = difflib.SequenceMatcher(None, ref, heard, autojunk=False)
    if sm.ratio() < 0.8:
        return None
    mp = {a + k: b + k for a, b, n in sm.get_matching_blocks() for k in range(n)}
    starts, pos = [], 0
    for l in lines[:-1]:
        pos += len(skip.sub("", l))
        nxt = [i for i in range(pos, min(len(ref), pos + 6)) if i in mp]
        if not nxt:
            return None
        starts.append(rec[mp[nxt[0]]][1])
    return starts


def line_times(wav_path, texts):
    """[[from, to], ...] for the lines, in seconds inside the file; also None if the speech model failed (then the pauses alone are used)"""
    k = len(texts) - 1
    for minlen, rel in ((0.2, 0.06), (0.12, 0.06), (0.12, 0.1), (0.08, 0.15)):      # a hurried recitation has shorter pauses
        ps, s0, s1, dur = pauses(wav_path, rel=rel, minlen=minlen)
        if len(ps) >= k:
            break
    starts = asr_starts(wav_path, texts) if k else []
    note = ""
    if starts is None:                                   # fall back on the pauses and the share of text
        note = "no speech alignment"
        w = [weight(t) for t in texts]
        exp, cum = [], 0
        for i in range(k):
            cum += w[i]
            exp.append(s0 + (s1 - s0) * cum / sum(w))
        assert len(ps) >= k, (wav_path, len(ps), k)
        best = min(itertools.combinations(range(len(ps)), k),
                   key=lambda c: sum(abs((ps[j][0] + ps[j][1]) / 2 - e) for j, e in zip(c, exp)))
        starts = [ps[j][1] - 0.06 for j in best]
    begin, end = [max(0.0, s0 - 0.05)], []
    for st in starts:
        st = max(st - 0.06, begin[-1] + 0.5)             # the line starts a little before its first syllable was heard
        near = [(a, b) for a, b in ps if st - 1.2 < b <= st + 0.2]
        end.append(round(min(near[-1][0] + min(0.15, (near[-1][1] - near[-1][0]) / 2), st + 0.03) if near else st + 0.03, 2))
        begin.append(round(st, 2))
    end.append(round(min(dur, s1 + 0.15), 2))
    return [[round(a, 2), z] for a, z in zip(begin, end)], note, dur


def split_text(s):
    """the recording's own text of a verse -> its lines (cut after each । and ॥)"""
    return [p.strip() for p in re.findall(r"[^।॥]+[।॥]?", s) if p.strip()]


def norm(s):
    return re.sub(r"[\s।॥\-‍‌,.:ःऽ]", "", s).replace("श्र", "शृ").replace("ं", "न्")


# ------------------------------------------------------------------ main
def main():
    data_only = "--data-only" in sys.argv
    sys.argv = [a for a in sys.argv if a != "--data-only"]
    verses, stamps = Path(sys.argv[1]), Path(sys.argv[2])
    AUDIO.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    book = read_book(BOOK)
    print("book: %d verses" % len(book))

    # the four उवाच clips
    uv = {}
    for name in sorted(set(CLIPS.values())):
        wav = verses / (name + ".wav")
        _, s0, s1, dur = pauses(wav)
        uv[name] = [round(max(0.0, s0 - 0.05), 2), round(min(dur, s1 + 0.15), 2)]
        if not data_only:
            encode(wav, AUDIO / (name + ".mp3"))
        print("clip %-17s %.2fs" % (name, dur))

    total_bytes = total_verses = 0
    odd = []
    for ch in range(1, 19):
        entries = json.loads((stamps / ("gita_ch%02d.json" % ch)).read_text(encoding="utf-8"))
        out = []
        for e in entries:
            c, v = e["id"].split("_")
            assert int(c) == ch, e["id"]
            n = int(v)
            b = book.get((ch, n - 1 if ch == 13 else n))     # book chapter 13 has no Arjuna question: its verse 1 is recording 13.2
            if b:
                lines, uw = b["lines"], b["uw"]
                ratio = difflib.SequenceMatcher(None, norm("".join(lines)), norm(e["text"])).ratio()
                if ratio < 0.85:
                    odd.append((e["id"], round(ratio, 2)))
            else:                                            # 13.1 and 18.31: not in this edition
                lines, uw = split_text(re.sub(r"^.*?उवाच", "", e["text"]) if "उवाच" in e["text"][:25] else e["text"]), ""
                if (ch, n) == (13, 1):
                    uw = "अर्जुन उवाच"
                print("not in the book: %s -> %d lines from the recording%s" % (e["id"], len(lines), ", " + uw if uw else ""))
            wav = verses / (e["id"] + ".wav")
            times, note, dur = line_times(wav, lines)
            if note:
                odd.append((e["id"], note))
            if not data_only:
                total_bytes += encode(wav, AUDIO / (e["id"] + ".mp3"))
            total_verses += 1
            p = [[t, a, z] for t, (a, z) in zip(lines, times)]
            if uw:
                clip = clip_of(uw)
                p.insert(0, [uw, uv[clip][0], uv[clip][1], clip])
            out.append({"n": n, "d": round(dur, 2), "p": p})
        (DATA / ("ch%02d.json" % ch)).write_text(json.dumps({"ch": ch, "v": out}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print("chapter %2d: %d verses" % (ch, len(out)), flush=True)
    print("%d verses, %.1f MB of mp3" % (total_verses, total_bytes / 1048576))
    print("to look at:", odd if odd else "nothing")


if __name__ == "__main__":
    main()

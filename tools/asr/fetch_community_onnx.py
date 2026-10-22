#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_community_onnx.py -- get the Sanskrit speech model ready for asr-service/ WITHOUT NeMo, Colab or a GPU.

OpenVoiceOS publishes AI4Bharat's Sanskrit IndicConformer (CTC head) as ONNX, MIT-licensed and not gated:
    https://huggingface.co/OpenVoiceOS/ai4bharat-indicconformer-sa-onnx     (converted from ai4bharat/indicconformer_stt_sa_hybrid_ctc_rnnt_large)
This downloads its fp32 model and writes the config.json / vocab.json that asr-service/app.py reads, into asr-service/model/
(or --out). Works on Windows, Mac and Linux; needs only Python 3.

    python tools/asr/fetch_community_onnx.py            ->  asr-service/model/{model.onnx, model.onnx_data, config.json, vocab.json}

fp32 is used on purpose: the int8 file in that repo is about 4x slower on a plain CPU and garbles words (tested on six
recorded shlokas; see asr-service/README.md). The preprocessor settings below are the standard IndicConformer / NeMo
ones (16 kHz, 25 ms window, 10 ms hop, 512 FFT, 80 Slaney mel bands, pre-emphasis 0.97, per-feature normalisation); the
numpy featuriser built from them gave the same transcript as the independent onnx-asr preprocessor on 5 of 6 clips and
a one-letter difference on the sixth. To check against AI4Bharat's own NeMo code instead, use export_sanskrit_onnx.py --wav.
"""
import argparse
import json
import sys
import urllib.request
from pathlib import Path

BASE = "https://huggingface.co/OpenVoiceOS/ai4bharat-indicconformer-sa-onnx/resolve/main/"
HERE = Path(__file__).resolve().parent
PREPROCESSOR = {"sample_rate": 16000, "window_size": 0.025, "window_stride": 0.01, "n_fft": 512, "features": 80,
                "normalize": "per_feature", "preemph": 0.97, "mag_power": 2.0, "log_zero_guard_value": 2 ** -24, "window": "hann"}


def get(name, dest):
    if dest.exists() and dest.stat().st_size > 0:
        print("have", dest.name)
        return
    print("downloading", name, "...")
    urllib.request.urlretrieve(BASE + name, dest)
    print("  ", round(dest.stat().st_size / 1e6, 1), "MB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE.parent.parent / "asr-service" / "model"))
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    get("model.onnx", out / "model.onnx")
    get("model.onnx_data", out / "model.onnx_data")        # the weights; model.onnx refers to this exact file name
    get("vocab.txt", out / "vocab.txt")

    pieces = {}
    for line in (out / "vocab.txt").read_text(encoding="utf-8").splitlines():
        if line.strip():
            piece, i = line.rsplit(" ", 1)
            pieces[int(i)] = piece
    vocab = [pieces[i] for i in range(len(pieces))]
    if vocab[-1] != "<blk>":
        sys.exit("unexpected vocabulary: the last entry should be <blk>, got " + repr(vocab[-1]))
    (out / "vocab.json").write_text(json.dumps(vocab, ensure_ascii=False), encoding="utf-8")
    cfg = {"preprocessor": PREPROCESSOR, "input_audio": "audio_signal", "input_length": "length", "output_logprobs": "logprobs", "blank_id": len(vocab) - 1}
    (out / "config.json").write_text(json.dumps(cfg, indent=1), encoding="utf-8")
    (out / "vocab.txt").unlink()
    print("wrote", out / "config.json", "and", out / "vocab.json", f"({len(vocab)} entries, blank id {len(vocab) - 1})")


if __name__ == "__main__":
    main()

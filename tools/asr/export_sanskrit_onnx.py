#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_sanskrit_onnx.py -- turn AI4Bharat's Sanskrit IndicConformer (NeMo) into the three files the Kalyan speech service needs.

  model.onnx    encoder + CTC head (the hybrid model's CTC branch), fp32 by default
  config.json   the preprocessor settings read from the model itself, the ONNX input/output names, the blank id
  vocab.json    the sentence-piece vocabulary, in id order

Run it on Linux or Google Colab (NeMo does not install on Windows):

    !pip install -q "Cython<3" onnx onnxruntime sentencepiece soundfile huggingface_hub
    !git clone -b nemo-v2 https://github.com/AI4Bharat/NeMo.git && cd NeMo && bash reinstall.sh      # see the IndicConformerASR README
    !python export_sanskrit_onnx.py --out sanskrit_onnx --wav a_recitation.wav

  --wav   any 16 kHz-ish clip of a recited shloka. With it the script also CHECKS the numpy featuriser in asr-service/
          against NeMo's own and compares the ONNX transcript with NeMo's. Run it: a mismatch here is the one thing that
          would make the live service quietly worse than the model you tested.
  --int8  also write a quantised model.int8.onnx (about a quarter of the size). The Hugging Face Space has plenty of
          memory, so fp32 is the default -- quantising can cost accuracy; use the --wav check before choosing it.

Then upload sanskrit_onnx/{model.onnx,config.json,vocab.json} to a Hugging Face model repo (see asr-service/README.md).
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

NEMO_URL = "https://objectstore.e2enetworks.net/indicconformer/models/indicconformer_stt_sa_hybrid_rnnt_large.nemo"
HERE = Path(__file__).resolve().parent


def load_wav(path):
    import numpy as np
    import soundfile as sf
    x, sr = sf.read(path, dtype="float32", always_2d=False)
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr != 16000:
        t = np.arange(int(len(x) * 16000 / sr)) * (sr / 16000)
        x = np.interp(t, np.arange(len(x)), x).astype("float32")
    return x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nemo", default="indicconformer_stt_sa_hybrid_rnnt_large.nemo", help="path of the .nemo file (downloaded if missing)")
    ap.add_argument("--out", default="sanskrit_onnx")
    ap.add_argument("--wav", help="a recitation to check against NeMo")
    ap.add_argument("--int8", action="store_true")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    if not os.path.exists(a.nemo):
        print("downloading", NEMO_URL)
        urllib.request.urlretrieve(NEMO_URL, a.nemo)

    import numpy as np
    import torch
    import nemo.collections.asr as nemo_asr
    from omegaconf import OmegaConf

    model = nemo_asr.models.ASRModel.restore_from(a.nemo, map_location="cpu")
    model.eval()
    model.freeze()
    # a hybrid model has two heads; the CTC one is a single pass and needs no beam/prediction network
    try:
        model.cur_decoder = "ctc"
        model.change_decoding_strategy(decoder_type="ctc")
    except Exception as e:
        print("note: could not switch the decoding strategy to CTC:", e)

    onnx_path = out / "model.onnx"
    model.export(str(onnx_path))
    print("exported", onnx_path, round(onnx_path.stat().st_size / 1e6), "MB")

    import onnx
    g = onnx.load(str(onnx_path), load_external_data=False).graph
    ins = [i.name for i in g.input]
    outs = [o.name for o in g.output]
    print("onnx inputs :", ins)
    print("onnx outputs:", outs)

    # ---- vocabulary
    tok = model.tokenizer
    sp = getattr(tok, "tokenizer", None) or tok
    n = sp.get_piece_size() if hasattr(sp, "get_piece_size") else len(tok.vocab)
    vocab = [sp.id_to_piece(i) for i in range(n)] if hasattr(sp, "id_to_piece") else list(tok.vocab)
    (out / "vocab.json").write_text(json.dumps(vocab, ensure_ascii=False), encoding="utf-8")
    blank = int(getattr(model.ctc_decoder, "num_classes_with_blank", len(vocab) + 1)) - 1
    print("vocab", len(vocab), "pieces; blank id", blank)

    # ---- preprocessor
    pre = OmegaConf.to_container(model.cfg.preprocessor, resolve=True)
    keep = {k: pre.get(k) for k in ("sample_rate", "window_size", "window_stride", "n_fft", "features", "normalize", "preemph",
                                    "mag_power", "log_zero_guard_value", "lowfreq", "highfreq", "window") if pre.get(k) is not None}
    audio_in = next((n for n in ins if "audio" in n or "signal" in n), ins[0])
    len_in = next((n for n in ins if "length" in n), None)
    cfg = {"preprocessor": keep, "input_audio": audio_in, "input_length": len_in or "length", "output_logprobs": outs[0], "blank_id": blank}
    (out / "config.json").write_text(json.dumps(cfg, indent=1), encoding="utf-8")
    print("preprocessor:", keep)

    if a.int8:
        from onnxruntime.quantization import QuantType, quantize_dynamic
        quantize_dynamic(str(onnx_path), str(out / "model.int8.onnx"), weight_type=QuantType.QInt8)
        print("wrote model.int8.onnx", round((out / "model.int8.onnx").stat().st_size / 1e6), "MB  (rename it to model.onnx to use it)")

    # ---- the checks
    if a.wav:
        sys.path.insert(0, str(HERE.parent.parent / "asr-service"))
        from featurizer import Featurizer
        import onnxruntime as ort

        x = load_wav(a.wav)
        feat = Featurizer(cfg)
        mine, mine_len = feat(x)
        with torch.no_grad():
            sig = torch.tensor(x)[None]
            ref, ref_len = model.preprocessor(input_signal=sig, length=torch.tensor([sig.shape[1]]))
        ref = ref.numpy()
        t = min(ref.shape[2], mine.shape[2])
        diff = np.abs(ref[:, :, :t] - mine[:, :, :t])
        print(f"\nFEATURES vs NeMo: frames {mine.shape[2]} (mine) / {ref.shape[2]} (NeMo); max diff {diff.max():.5f}, mean diff {diff.mean():.6f}")
        print("  -> expect max diff below about 0.01; if it is large, the settings above need a look before going live.")

        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        feed = {audio_in: mine}
        if len_in:
            feed[len_in] = mine_len
        lp = sess.run([outs[0]], feed)[0][0]
        ids, prev, pieces = lp.argmax(-1), -1, []
        for i in ids:
            if i != prev and i != blank:
                pieces.append(vocab[int(i)])
            prev = i
        mine_text = "".join(pieces).replace("▁", " ").strip()
        with torch.no_grad():
            nemo_text = model.transcribe([a.wav], batch_size=1)
        nemo_text = nemo_text[0] if isinstance(nemo_text, (list, tuple)) else nemo_text
        if isinstance(nemo_text, (list, tuple)):
            nemo_text = nemo_text[0]
        nemo_text = getattr(nemo_text, "text", nemo_text)
        print("\nONNX + numpy features :", mine_text)
        print("NeMo transcribe       :", nemo_text)
        print("  -> the two should be the same, or differ by a word at most.")

    print("\nDone. Upload", out / "model.onnx", out / "config.json", out / "vocab.json", "to your Hugging Face model repo.")


if __name__ == "__main__":
    main()

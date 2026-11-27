# Third-party notices

## tiny-voca

The model in this folder is derived from **tiny-voca** by Muhammed Nazeem
(https://github.com/n4ze3m/tiny-voca, commit `28e0722`; weights at https://huggingface.co/n4ze3m/tiny-voca),
licensed under the Apache License, Version 2.0. A copy of that licence is in `LICENSES/Apache-2.0.txt`.

- **Weights.** `alpa-v0.1-preview.pt` was trained starting from tiny-voca's published weights, and `alpa-v0.2.pt` was trained on from it. Its phoneme
  table and its stress table were rewritten for Sanskrit before training; every other layer started as a copy.
- **Browser files.** `onnx/alpa-v0.1-preview.onnx` was exported with tiny-voca's exporter (`src/tiny_voca/export.py`), unchanged. `onnx/alpa-v0.1.1.onnx` and `onnx/alpa-v0.2.onnx` were exported with `alpa/export.py`, which is adapted from it.
- **Code.** In `alpa/`, these files are adapted from tiny-voca's files of the same names: `model.py`, `config.py`, `infer.py`, `export.py`, `align.py`, `annotate.py`, `data.py`,
  `prepare.py`, `train.py`, `losses.py` and `journal.py`. Each states its changes at its top. `alpa/text.py`, `alpa/rasa.py`, `alpa/transplant.py` and the files in `scripts/` are original to Alpa.

## Vāgdhenu

`alpa/text.py` follows the pronunciation and scansion rules of **Vāgdhenu** by Prathosh A P
(https://github.com/prathoshap/vagdhenu), licensed under the Apache License, Version 2.0. It is a separate
implementation and includes no code from that project.

## Rasa

The model learned from recordings in **Rasa** by AI4Bharat (https://huggingface.co/datasets/ai4bharat/Rasa),
licensed under CC-BY-4.0. No recordings are included here.

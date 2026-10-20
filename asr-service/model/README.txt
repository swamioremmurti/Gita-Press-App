Put the exported model here before building the image for Cloud Run:
  model.onnx   (and model.onnx.data if the export made one)
  config.json
  vocab.json
They come from tools/asr/export_sanskrit_onnx.py. The service uses this folder automatically when config.json is in it.

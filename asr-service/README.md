---
title: Kalyan Sanskrit ASR
emoji: 🕉️
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# Kalyan Sanskrit speech service

Recognises a recited Sanskrit shloka for the Kalyan Gita LMS, using AI4Bharat's **IndicConformer (Sanskrit)** model
run as ONNX on CPU. `app.py` is the web service, `featurizer.py` makes the log-mel features (numpy, matched to NeMo).

The model weights are **not** in this repo: they live in a Hugging Face *model* repo (`MODEL_REPO`) and are downloaded
when the service starts.

## One-time setup

1. **Make the model files** (on Colab or any Linux machine): `python tools/asr/export_sanskrit_onnx.py` in the Kalyan repo.
   It writes `model.onnx`, `config.json`, `vocab.json` and prints a check against NeMo.
2. **Create a model repo** on Hugging Face (private is fine) and upload those three files to it.
3. **Create this Space**: New Space -> SDK **Docker** -> upload the contents of the `asr-service/` folder
   (`README.md` with the header above, `Dockerfile`, `requirements.txt`, `app.py`, `featurizer.py`).
4. In the Space **Settings -> Variables and secrets** add:
   | name | kind | value |
   |---|---|---|
   | `MODEL_REPO` | variable | `your-user/your-model-repo` |
   | `HF_TOKEN` | secret | a read token (only if the model repo is private) |
   | `ASR_SHARED_SECRET` | secret | a long random string -- the same one goes into Vercel |
   | `ALLOWED_ORIGINS` | variable | `https://www.kalyanseva.com` |
5. In **Vercel -> Project -> Environment Variables** add `ASR_URL` = the Space's address
   (`https://your-user-your-space.hf.space`) and `ASR_SHARED_SECRET` = the same secret. Redeploy.

Until `ASR_URL` is set the website simply keeps using the browser's own speech recognition.

## Checking it

    curl https://your-user-your-space.hf.space/health      ->  {"ok":true,"ready":true,...}

A free Space sleeps when idle; the website pings `/health` when a lesson opens so it is awake by the time the learner
recites. After launch, upgrade the Space hardware (Settings -> Space hardware) for faster answers, or set a longer
sleep time; nothing in the website changes.

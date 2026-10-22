# Kalyan Sanskrit speech service

Recognises a recited Sanskrit shloka for the Kalyan Gita LMS ("बोलकर जाँचें"), using AI4Bharat's **IndicConformer (Sanskrit)**
run as ONNX on **CPU only** (no GPU needed). `app.py` is the web service, `featurizer.py` makes the log-mel features (numpy,
no torch). The model is baked into the container image (`model/`), so a cold start does not download anything.

## Where it runs: Google Cloud Run (chosen)

A Hugging Face *Docker* Space needs a paid plan (PRO) to create -- the free CPU hardware is only free once you have that --
so it is the alternative, not the default. Cloud Run scales to zero, so with a few learners a day the cost is close to nothing;
the price of that is a cold start (about 10-30 s: image start + model load) after it has been idle, which the website already
handles (it pings `/health` when a lesson opens and waits for `ready`).

## Measured (this machine, CPU only, 6 recorded shlokas of Gita 1.1-1.6, ~11 s each)

| | fp32 (used) | int8 |
|---|---|---|
| time per shloka | about 1 s | 4-6 s |
| model size | 481 MB | 138 MB |
| transcript | correct, Sanskrit spelling | visible errors (`चेकितान` -> `चे कित न`) -- not used |

Through the site's own `scoreSpeech`: correct recitation 87-100, a *different* shloka 12-26, only the first half 31-50, so the
pass mark `SP_PASS = 60` in `swadhyay-gita.js` sits in a clear gap and was left as it is. These are clean recordings by one
reciter; re-check with real learners' voices after launch.

## One-time setup

1. **Model files** (any OS, needs only Python 3, ~490 MB download, no NeMo/Colab):

       python tools/asr/fetch_community_onnx.py

   writes `model.onnx`, `model.onnx_data`, `config.json`, `vocab.json` into `asr-service/model/`. They come from the MIT-licensed
   community conversion `OpenVoiceOS/ai4bharat-indicconformer-sa-onnx` of AI4Bharat's Sanskrit model. To use AI4Bharat's own
   file instead, run `tools/asr/export_sanskrit_onnx.py` (Linux/Colab; its `--wav` check compares against NeMo itself).
2. **Google Cloud** (your account; billing must be switched on for the project):

       gcloud auth login
       gcloud config set project YOUR_PROJECT_ID
       gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

3. **Pick a secret** -- a long random string, the same one goes into Vercel. Keep it out of files and chat logs.
4. **Deploy** from the Kalyan repo root (`.gcloudignore` makes sure `model/` is uploaded):

       gcloud run deploy kalyan-asr --source asr-service --region asia-south1 --memory 4Gi --cpu 2 --concurrency 2 --max-instances 3 --timeout 120 --allow-unauthenticated --set-env-vars ALLOWED_ORIGINS=https://www.kalyanseva.com,ASR_SHARED_SECRET=THE_SECRET

   (`--allow-unauthenticated` is intended: the service checks its own signed tokens. Cloud Run's `K_SERVICE` variable makes it load
   the model before taking requests -- CPU is throttled outside requests, so a background load would crawl.)
5. **Vercel -> Project -> Environment Variables**: `ASR_URL` = the Cloud Run URL (`https://kalyan-asr-xxxx.a.run.app`) and
   `ASR_SHARED_SECRET` = the same secret. Redeploy.

Until `ASR_URL` is set the website simply keeps using the browser's own speech recognition.

## Checking it

    curl https://YOUR-SERVICE-URL/health      ->  {"ok":true,"ready":true,"loading":false,...}

Then open a /gita lesson, press 🎤 and recite. Local run for development: `MODEL_DIR=asr-service/model ASR_SHARED_SECRET=x uvicorn app:app --port 7861`
from inside `asr-service/`.

## Alternative: Hugging Face Docker Space (needs a PRO plan)

Create a Docker Space, upload this folder (add the Space front-matter `sdk: docker`, `app_port: 7860` to a README), put the model
files in a model repo named by the `MODEL_REPO` variable (with `HF_TOKEN` if private), and set `ASR_SHARED_SECRET` and
`ALLOWED_ORIGINS` as secrets/variables. A free-tier Space sleeps after 48 h idle.

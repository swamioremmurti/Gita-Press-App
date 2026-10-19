"""Kalyan Sanskrit speech service -- recognises a recited shloka with AI4Bharat's IndicConformer (Sanskrit) run as ONNX.

    GET  /health       { ready, loading, model }       -- cheap; the website calls it to wake the service before a learner speaks
    POST /transcribe   body = a 16-bit mono WAV, 16 kHz (the page makes it) ; header  Authorization: Bearer <token>
                       -> { text, seconds, ms }

The token is minted by the Kalyan website (/api/asr-token) and checked here with a shared secret, so only the site's learners
can use the service and the site can rate-limit them. The model is downloaded from a Hugging Face model repo when the
service starts (so waking a sleeping Space reloads it) and then kept in memory.

Environment (Space secrets / variables)
    MODEL_REPO       the HF repo that holds model.onnx, config.json, vocab.json   (e.g. "kalyanseva/sanskrit-asr-onnx")
    HF_TOKEN         only if that repo is private
    ASR_SHARED_SECRET  same value as the website's ASR_SHARED_SECRET
    ALLOWED_ORIGINS  comma-separated web origins allowed to call (e.g. "https://www.kalyanseva.com,http://localhost:5174")
    MODEL_DIR        optional: a local folder with the three files (skips the download; used in tests)
    ASR_STUB         optional: return this text instead of running a model (tests of the wiring only)
    MAX_SECONDS      longest clip accepted (default 75)
"""
import base64
import hashlib
import hmac
import io
import json
import os
import threading
import time
import wave

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from featurizer import Featurizer

MODEL_REPO = os.environ.get("MODEL_REPO", "")
MODEL_DIR = os.environ.get("MODEL_DIR", "")
SECRET = os.environ.get("ASR_SHARED_SECRET", "")
STUB = os.environ.get("ASR_STUB", "")
MAX_SECONDS = float(os.environ.get("MAX_SECONDS", "75"))
ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app = FastAPI(title="Kalyan Sanskrit ASR")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS or ["*"], allow_methods=["GET", "POST", "OPTIONS"],
                   allow_headers=["authorization", "content-type"], max_age=600)

state = {"ready": False, "loading": False, "error": "", "model": "stub" if STUB else MODEL_REPO or MODEL_DIR}
M = {}                       # session, featurizer, vocab, names
gate = threading.Semaphore(int(os.environ.get("MAX_PARALLEL", "2")))     # a few recognitions at a time; the rest wait


# ----------------------------------------------------------------------------- model
def load():
    if state["ready"] or state["loading"]:
        return
    state["loading"] = True
    try:
        if STUB:
            state["ready"] = True
            return
        folder = MODEL_DIR
        if not folder:
            from huggingface_hub import snapshot_download
            folder = snapshot_download(repo_id=MODEL_REPO, token=os.environ.get("HF_TOKEN") or None,
                                       allow_patterns=["model.onnx", "model.onnx.data", "config.json", "vocab.json"])
        cfg = json.load(open(os.path.join(folder, "config.json"), encoding="utf-8"))
        import onnxruntime as ort
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = int(os.environ.get("ORT_THREADS", "2"))
        sess = ort.InferenceSession(os.path.join(folder, "model.onnx"), opts, providers=["CPUExecutionProvider"])
        M["sess"] = sess
        M["feat"] = Featurizer(cfg)
        M["vocab"] = json.load(open(os.path.join(folder, "vocab.json"), encoding="utf-8"))
        M["in_audio"] = cfg.get("input_audio", "audio_signal")
        M["in_len"] = cfg.get("input_length", "length")
        M["out"] = cfg.get("output_logprobs", "logprobs")
        M["blank"] = int(cfg.get("blank_id", len(M["vocab"])))
        # one short silent clip so the first real request does not pay for graph optimisation
        try:
            run(np.zeros(16000, dtype=np.float32))
        except Exception:
            pass
        state["ready"] = True
    except Exception as e:                      # reported by /health; the website falls back to the browser recogniser
        state["error"] = f"{type(e).__name__}: {e}"
    finally:
        state["loading"] = False


def run(wav):
    feats, length = M["feat"](wav)
    names = {i.name for i in M["sess"].get_inputs()}
    feed = {M["in_audio"]: feats}
    if M["in_len"] in names:
        feed[M["in_len"]] = length
    out = M["sess"].run([M["out"]], feed)[0]            # [1, T', V+1] log-probabilities
    ids = out[0].argmax(axis=-1)
    text, prev = [], -1
    for t in ids:                                        # CTC greedy: collapse repeats, drop blanks
        if t != prev and t != M["blank"]:
            text.append(M["vocab"][int(t)])
        prev = t
    return "".join(text).replace("▁", " ").strip()


@app.on_event("startup")
def _startup():
    threading.Thread(target=load, daemon=True).start()


# ----------------------------------------------------------------------------- token
def token_ok(tok):
    """token = base64url(json {e: expiry epoch seconds, n: nonce}) + "." + hex hmac-sha256(secret, that base64url)"""
    if not SECRET:
        return not ORIGINS and bool(STUB)                # no secret set: only the stub test mode may run open
    try:
        body, sig = tok.split(".", 1)
        good = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(good, sig):
            return False
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        return float(payload["e"]) >= time.time()
    except Exception:
        return False


# ----------------------------------------------------------------------------- routes
@app.get("/")
@app.get("/health")
def health():
    if not state["ready"] and not state["loading"]:
        threading.Thread(target=load, daemon=True).start()      # a wake-up ping starts loading if the startup hook did not
    return {"ok": True, "ready": state["ready"], "loading": state["loading"], "error": state["error"], "model": state["model"]}


def read_wav(data):
    try:
        with wave.open(io.BytesIO(data), "rb") as w:
            sr, ch, width, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
            if width != 2:
                raise ValueError("16-bit PCM WAV needed")
            raw = w.readframes(n)
    except (wave.Error, EOFError) as e:
        raise ValueError(f"not a WAV file ({e})")
    x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    if sr != 16000:                                      # the page sends 16 kHz; this keeps other callers working
        t = np.arange(int(len(x) * 16000 / sr)) * (sr / 16000)
        x = np.interp(t, np.arange(len(x)), x).astype(np.float32)
    return x


@app.post("/transcribe")
async def transcribe(request: Request):
    auth = request.headers.get("authorization", "")
    if not token_ok(auth[7:] if auth.lower().startswith("bearer ") else ""):
        raise HTTPException(401, "bad or expired token")
    if not state["ready"]:
        raise HTTPException(503, "model is still loading" if state["loading"] else (state["error"] or "model not ready"))
    data = await request.body()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "audio too large")
    try:
        wav = read_wav(data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    seconds = len(wav) / 16000.0
    if seconds > MAX_SECONDS:
        raise HTTPException(413, f"audio longer than {int(MAX_SECONDS)} s")
    if seconds < 0.3:
        return {"text": "", "seconds": round(seconds, 2), "ms": 0}
    t0 = time.time()
    if STUB:
        text = STUB
    else:
        with gate:
            text = run(wav)
    return {"text": text, "seconds": round(seconds, 2), "ms": int((time.time() - t0) * 1000)}

# Serves the Sanskrit speech service. Works on Google Cloud Run (listens on $PORT) and on a Hugging Face Docker Space (7860).
# If the exported model files are in ./model/ (model.onnx, config.json, vocab.json) they are baked into the image, so a cold start
# does not have to download them; otherwise the service downloads MODEL_REPO from Hugging Face when it starts.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/tmp/hf PORT=7860
RUN useradd -m -u 1000 user
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install -r requirements.txt
COPY --chown=user app.py featurizer.py ./
COPY --chown=user model/ ./model/
USER user
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]

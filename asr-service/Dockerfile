# Hugging Face Docker Space: serves the Sanskrit speech service on port 7860 (the port the Space expects).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/tmp/hf
RUN useradd -m -u 1000 user
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install -r requirements.txt
COPY --chown=user app.py featurizer.py ./
USER user
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]

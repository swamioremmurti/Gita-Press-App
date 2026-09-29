// Thin wrapper around the Voyage AI embeddings REST API (https://api.voyageai.com).
const MODEL = process.env.VOYAGE_MODEL || 'voyage-3.5';

async function embed(texts, inputType) {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set (create server/.env from server/.env.example)');

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType || null })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error('Voyage API error ' + res.status + ': ' + body.slice(0, 500));
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

module.exports = { embed, MODEL };

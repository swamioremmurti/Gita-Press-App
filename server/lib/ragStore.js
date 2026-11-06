// Search over the packed RAG index produced by rag-generator (`rag_gen.js pack`):
//   server/rag/vectors.i8   int8 vectors (L2-normalised x127), row order = chunks.jsonl
//   server/rag/chunks.jsonl one JSON chunk per line
//   server/rag/meta.json    { model, dims, count, books }
// Query embeddings come from the Vercel AI Gateway (same model that embedded the books),
// falling back to Voyage directly if the gateway is rate-limited.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'rag');
let cache = null;

function available() {
  return fs.existsSync(path.join(DIR, 'meta.json')) && fs.existsSync(path.join(DIR, 'vectors.i8')) &&
    fs.existsSync(path.join(DIR, 'chunks.jsonl'));
}

function load() {
  if (cache) return cache;
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'meta.json'), 'utf8'));
  const raw = fs.readFileSync(path.join(DIR, 'vectors.i8'));
  const vectors = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  if (vectors.length !== meta.count * meta.dims) throw new Error('RAG index corrupt: re-run rag_gen.js pack');
  const text = fs.readFileSync(path.join(DIR, 'chunks.jsonl'));
  const offsets = new Array(meta.count + 1);          // parse chunk JSON lazily; only the top hits are ever parsed
  let row = 0, start = 0;
  for (let i = 0; i < text.length && row < meta.count; i++) {
    if (text[i] === 10) { offsets[row++] = start; start = i + 1; }
  }
  offsets[meta.count] = text.length;
  cache = { meta, vectors, text, offsets };
  return cache;
}

function chunkAt(i) {
  const { text, offsets } = load();
  return JSON.parse(text.toString('utf8', offsets[i], offsets[i + 1]));
}

async function postEmbed(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(body) });
  if (!res.ok) { const e = new Error('embed ' + res.status + ': ' + (await res.text().catch(() => '')).slice(0, 200)); e.status = res.status; throw e; }
  const j = await res.json();
  return { vector: j.data[0].embedding, tokens: (j.usage && (j.usage.total_tokens || j.usage.prompt_tokens)) || 0 };
}

async function embedQuery(q) {
  const { meta } = load();
  const gw = process.env.AI_GATEWAY_API_KEY;
  if (gw) {
    try {
      return await postEmbed('https://ai-gateway.vercel.sh/v1/embeddings', { Authorization: 'Bearer ' + gw }, { model: meta.model, input: [q] });
    } catch (e) {
      if (!process.env.VOYAGE_API_KEY) throw e;     // otherwise fall through to Voyage direct
    }
  }
  if (!process.env.VOYAGE_API_KEY) throw new Error('Set AI_GATEWAY_API_KEY (or VOYAGE_API_KEY) in server/.env');
  return postEmbed('https://api.voyageai.com/v1/embeddings', { Authorization: 'Bearer ' + process.env.VOYAGE_API_KEY },
    { model: meta.model.replace(/^voyage\//, ''), input: [q], input_type: 'query' });
}

function topK(queryVec, k) {
  const { meta, vectors } = load();
  const d = meta.dims;
  let n = 0; for (let i = 0; i < d; i++) n += queryVec[i] * queryVec[i];
  n = Math.sqrt(n) || 1;
  const qv = new Float32Array(d); for (let i = 0; i < d; i++) qv[i] = queryVec[i] / n;
  let top = [];
  for (let r = 0; r < meta.count; r++) {
    let dot = 0; const base = r * d;
    for (let i = 0; i < d; i++) dot += vectors[base + i] * qv[i];
    dot /= 127;
    if (top.length < k || dot > top[top.length - 1].score) {
      top.push({ row: r, score: dot }); top.sort((a, b) => b.score - a.score); if (top.length > k) top.pop();
    }
  }
  return top.map(t => ({ chunk: chunkAt(t.row), score: t.score }));
}

// onUsage({ model, tokens }) reports what the question's embedding cost.
async function search(query, k, onUsage) {
  const e = await embedQuery(query);
  if (onUsage) onUsage({ model: load().meta.model, tokens: e.tokens });
  return topK(e.vector, k);
}

function info() { return available() ? load().meta : null; }

module.exports = { available, search, info };

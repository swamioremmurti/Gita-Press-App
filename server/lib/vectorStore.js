// Flat-file vector store: chunks.jsonl (metadata+text) + vectors.f32 (L2-normalized float32,
// same row order as chunks.jsonl). Brute-force cosine search via dot product.
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INDEX_DIR = path.join(__dirname, '..', 'index');
const CHUNKS_PATH = path.join(INDEX_DIR, 'chunks.jsonl');
const VECTORS_PATH = path.join(INDEX_DIR, 'vectors.f32');
const MANIFEST_PATH = path.join(INDEX_DIR, 'manifest.json');

function ensureDir() {
  if (!fs.existsSync(INDEX_DIR)) fs.mkdirSync(INDEX_DIR, { recursive: true });
}

function normalize(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

function appendChunks(chunkMetas, vectors, dims) {
  ensureDir();
  const lines = chunkMetas.map(c => JSON.stringify(c)).join('\n') + '\n';
  fs.appendFileSync(CHUNKS_PATH, lines, 'utf8');

  const buf = Buffer.alloc(vectors.length * dims * 4);
  let off = 0;
  for (const v of vectors) {
    const norm = normalize(v);
    for (let i = 0; i < dims; i++) { buf.writeFloatLE(norm[i], off); off += 4; }
  }
  fs.appendFileSync(VECTORS_PATH, buf);
}

function writeManifest(manifest) {
  ensureDir();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function getCompletedFiles() {
  const manifest = readManifest();
  return new Set(manifest && manifest.completedFiles ? manifest.completedFiles : []);
}

async function countLines(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  let n = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  for await (const _ of rl) n++;
  return n;
}

// --- Load full store into memory for querying ---
let cache = null;

function load() {
  if (cache) return cache;
  const manifest = readManifest();
  if (!manifest || !fs.existsSync(CHUNKS_PATH) || !fs.existsSync(VECTORS_PATH)) {
    throw new Error('No index found. Run: node server/build-index.js');
  }
  const dims = manifest.dims;
  const chunks = fs.readFileSync(CHUNKS_PATH, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const raw = fs.readFileSync(VECTORS_PATH);
  const vectors = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  if (vectors.length !== chunks.length * dims) {
    throw new Error('Index corrupt: vector count does not match chunk count. Rebuild the index.');
  }
  cache = { chunks, vectors, dims, manifest };
  return cache;
}

function topK(queryVector, k) {
  const { chunks, vectors, dims } = load();
  const q = normalize(queryVector);
  const n = chunks.length;
  const scores = new Float32Array(n);
  for (let row = 0; row < n; row++) {
    const base = row * dims;
    let dot = 0;
    for (let i = 0; i < dims; i++) dot += vectors[base + i] * q[i];
    scores[row] = dot;
  }
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => scores[b] - scores[a]);
  return idx.slice(0, k).map(i => ({ chunk: chunks[i], score: scores[i] }));
}

module.exports = {
  appendChunks, writeManifest, readManifest, getCompletedFiles, countLines,
  topK, load, CHUNKS_PATH, VECTORS_PATH, MANIFEST_PATH, INDEX_DIR
};

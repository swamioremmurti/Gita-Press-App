// Builds (or resumes) the local vector index over Gita Press Books.
//
// Usage:
//   node server/build-index.js                 build/resume the full index
//   node server/build-index.js --limit 5        only index the first 5 not-yet-done books
//   node server/build-index.js --files "a.html,b.html"   only these files
//
require('./lib/env').loadEnv();
const fs = require('fs');
const path = require('path');
const { extractChunks } = require('./lib/extractText');
const voyage = require('./lib/voyage');
const store = require('./lib/vectorStore');

const ROOT = path.join(__dirname, '..');
const BOOKS_DIR = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const DATA_JS = path.join(ROOT, 'swadhyay-data.js');

let BATCH_MAX_CHUNKS = 20;
let BATCH_MAX_CHARS = 8000;
// Voyage throttles accounts with no payment method to 3 requests/min, 10K tokens/min.
// Once a payment method is on file (still free up to the free-tier token quota), pass
// --fast to skip this pacing.
let MIN_CALL_INTERVAL_MS = 21000;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') out.limit = parseInt(args[++i], 10);
    else if (args[i] === '--files') out.files = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (args[i] === '--max-chunks-per-file') out.maxChunksPerFile = parseInt(args[++i], 10);
    else if (args[i] === '--fast') { MIN_CALL_INTERVAL_MS = 0; BATCH_MAX_CHUNKS = 48; BATCH_MAX_CHARS = 40000; }
  }
  return out;
}

let lastCallAt = 0;
async function pace() {
  if (!MIN_CALL_INTERVAL_MS) return;
  const wait = MIN_CALL_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();
}

function loadBookMeta() {
  const code = fs.readFileSync(DATA_JS, 'utf8');
  const m = code.match(/var SWADHYAY_BOOKS_RAW\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!m) throw new Error('Could not parse swadhyay-data.js');
  const raw = JSON.parse(m[1]);
  const byFile = new Map();
  raw.forEach((b, i) => byFile.set(b.file, { id: i, category: b.category, author: b.author }));
  return byFile;
}

function titleFromFile(file) {
  let t = file.replace(/\.html$/i, '');
  if (t.indexOf('u_') === 0) t = t.slice(2);
  return t.replace(/[_-]+/g, ' ').trim();
}

async function embedBatch(texts, inputType, attempt = 1) {
  try {
    await pace();
    return await voyage.embed(texts, inputType);
  } catch (err) {
    if (attempt >= 5) throw err;
    const wait = Math.min(30000, 1000 * Math.pow(2, attempt));
    console.warn('  embed batch failed (attempt ' + attempt + '): ' + err.message + ' — retrying in ' + wait + 'ms');
    await new Promise(r => setTimeout(r, wait));
    return embedBatch(texts, inputType, attempt + 1);
  }
}

async function indexFile(file, meta, maxChunksPerFile) {
  const html = fs.readFileSync(path.join(BOOKS_DIR, file), 'utf8');
  const title = titleFromFile(file);
  let chunks = extractChunks(html, title);
  if (maxChunksPerFile) chunks = chunks.slice(0, maxChunksPerFile);
  if (!chunks.length) return { count: 0, dims: null };

  let dims = null;
  let batch = [];
  let batchChars = 0;

  async function flushBatch() {
    if (!batch.length) return;
    const texts = batch.map(c => (c.heading ? c.heading + '\n' : '') + c.text);
    const vectors = await embedBatch(texts, 'document');
    dims = vectors[0].length;
    const metas = batch.map(c => ({
      file, bookId: meta ? meta.id : null, title,
      author: (meta && meta.author && meta.author.trim()) || 'गीता प्रेस, गोरखपुर',
      category: meta ? meta.category : null,
      heading: c.heading, pageStart: c.pageStart, pageEnd: c.pageEnd,
      text: c.text
    }));
    store.appendChunks(metas, vectors, dims);
    batch = [];
    batchChars = 0;
  }

  for (const c of chunks) {
    const textLen = c.text.length + (c.heading ? c.heading.length : 0);
    if (batch.length && (batch.length >= BATCH_MAX_CHUNKS || batchChars + textLen > BATCH_MAX_CHARS)) {
      await flushBatch();
    }
    batch.push(c);
    batchChars += textLen;
  }
  await flushBatch();
  return { count: chunks.length, dims };
}

async function main() {
  const args = parseArgs();
  const bookMeta = loadBookMeta();
  let files = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.html'));
  if (args.files) files = files.filter(f => args.files.includes(f));

  const manifest = store.readManifest() || { model: voyage.MODEL, dims: null, completedFiles: [], totalChunks: 0 };
  const done = new Set(manifest.completedFiles);
  let todo = files.filter(f => !done.has(f));
  if (args.limit) todo = todo.slice(0, args.limit);

  console.log('Books total: ' + files.length + ' | already indexed: ' + done.size + ' | to process now: ' + todo.length);

  const startAll = Date.now();
  for (let i = 0; i < todo.length; i++) {
    const file = todo[i];
    const t0 = Date.now();
    try {
      const { count, dims } = await indexFile(file, bookMeta.get(file), args.maxChunksPerFile);
      manifest.completedFiles.push(file);
      manifest.totalChunks = (manifest.totalChunks || 0) + count;
      if (dims && !manifest.dims) manifest.dims = dims;
      store.writeManifest(manifest);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log('[' + (i + 1) + '/' + todo.length + '] ' + file + ' -> ' + count + ' chunks (' + secs + 's)');
    } catch (err) {
      console.error('FAILED on ' + file + ': ' + err.message);
      store.writeManifest(manifest);
      process.exitCode = 1;
      return;
    }
  }
  const totalSecs = ((Date.now() - startAll) / 1000).toFixed(1);
  console.log('Done. Indexed ' + todo.length + ' book(s) in ' + totalSecs + 's. Total chunks so far: ' + manifest.totalChunks);
}

main().catch(err => { console.error(err); process.exitCode = 1; });

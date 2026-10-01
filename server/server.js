// Swadhyay app server: static file serving (same behavior as .claude/dev-server.js)
// plus a retrieval-augmented /api/chat endpoint backed by the local vector index.
require('./lib/env').loadEnv();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const voyage = require('./lib/voyage');
const anthropic = require('./lib/anthropic');
const store = require('./lib/vectorStore');
const db = require('./lib/db');
const api = require('./lib/api');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 5174;
const TOP_K = 8;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv; charset=utf-8'
};

function serveStatic(req, res) {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if (p === '/') p = '/index.html';
  const filePath = path.join(ROOT, p);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + p); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function buildSystemPrompt(contextBlocks) {
  return [
    'आप "स्वाध्याय" ऐप के सहायक हैं। आप केवल नीचे दिए गए गीता प्रेस पुस्तकों के उद्धरणों के आधार पर उत्तर देते हैं।',
    'नियम:',
    '- उत्तर हिन्दी में दें, स्पष्ट और संक्षिप्त रखें।',
    '- केवल दिए गए संदर्भों की जानकारी का उपयोग करें; उनसे बाहर की बात न बनाएँ।',
    '- यदि संदर्भों में उत्तर नहीं मिलता, तो साफ़ कहें कि यह जानकारी उपलब्ध पुस्तकों में नहीं मिली।',
    '- उत्तर के अंत में "स्रोत:" शीर्षक के अंतर्गत उपयोग की गई पुस्तकों के नाम सूचीबद्ध करें (जो [1], [2]... के रूप में संदर्भों में चिह्नित हैं)।',
    '',
    'संदर्भ:',
    contextBlocks
  ].join('\n');
}

async function handleChat(req, res) {
  let payload;
  try { payload = JSON.parse(await readBody(req)); } catch { res.writeHead(400); res.end('Bad JSON'); return; }

  const message = (payload.message || '').toString().slice(0, 2000).trim();
  if (!message) { res.writeHead(400); res.end('Missing message'); return; }
  const history = Array.isArray(payload.history) ? payload.history.slice(-6) : [];

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  const send = (event, data) => res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');

  try {
    const [queryVec] = await voyage.embed([message], 'query');
    const hits = store.topK(queryVec, TOP_K);

    const seen = new Set();
    const sources = [];
    const contextBlocks = hits.map((h, i) => {
      const c = h.chunk;
      const label = c.title + (c.pageStart ? ' (पृष्ठ ' + c.pageStart + (c.pageEnd && c.pageEnd !== c.pageStart ? '-' + c.pageEnd : '') + ')' : '');
      const key = c.bookId != null ? String(c.bookId) : c.file;
      if (!seen.has(key)) { seen.add(key); sources.push({ n: i + 1, title: c.title, bookId: c.bookId, file: c.file }); }
      return '[' + (i + 1) + '] ' + label + (c.heading ? ' — ' + c.heading : '') + '\n' + c.text;
    }).join('\n\n---\n\n');

    send('sources', { sources });

    const messages = history.concat([{ role: 'user', content: message }]);
    await anthropic.streamMessage({
      system: buildSystemPrompt(contextBlocks),
      messages,
      onDelta: (text) => send('delta', { text })
    });
    send('done', {});
  } catch (err) {
    send('error', { message: err.message });
  }
  res.end();
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if (req.method === 'POST' && parsed.pathname === '/api/chat') { handleChat(req, res); return; }
  if (req.method === 'GET' && parsed.pathname === '/api/health') {
    let manifest = null;
    try { manifest = store.readManifest(); } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, indexedBooks: manifest ? manifest.completedFiles.length : 0, totalChunks: manifest ? manifest.totalChunks : 0 }));
    return;
  }
  if (parsed.pathname.startsWith('/api/')) {
    api.handle(req, res, parsed.pathname).then((handled) => {
      if (!handled) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Unknown API route' })); }
    }).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }
  serveStatic(req, res);
});

db.init()
  .then(() => server.listen(PORT, () => console.log('Swadhyay (with AI chat + admin API) running at http://localhost:' + PORT)))
  .catch((err) => { console.error('Failed to initialize database:', err); process.exit(1); });

// Swadhyay app server: static file serving (same behavior as .claude/dev-server.js)
// plus a retrieval-augmented /api/chat endpoint backed by the local vector index.
require('./lib/env').loadEnv();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const chat = require('./lib/chat');
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
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function serveStatic(req, res) {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if (p === '/') p = '/index.html';
  const filePath = path.join(ROOT, p);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: a path with no file extension (e.g. /library, /book/<slug>) is a
      // client-side route, not a missing file -- serve the app shell so the router can
      // take over. A path that looks like a real file (has an extension) stays a 404.
      if (req.method === 'GET' && !path.extname(p)) {
        fs.readFile(path.join(ROOT, 'index.html'), (err2, indexData) => {
          if (err2) { res.writeHead(404); res.end('Not found: ' + p); return; }
          res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(404); res.end('Not found: ' + p); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if (req.method === 'POST' && parsed.pathname === '/api/chat') { chat.handleChat(req, res); return; }
  if (req.method === 'GET' && parsed.pathname === '/api/health') { chat.handleHealth(req, res); return; }
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

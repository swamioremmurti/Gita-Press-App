// Single catch-all Vercel serverless function for every /api/* route (auth, admin,
// books, authors, comments, progress, chat, health). Replaces the earlier split of
// api/[...path].js + api/chat.js + api/health.js: Vercel's bracket catch-all syntax
// ([...path].js) turned out to only match a single path segment on this project (not
// true catch-all), so every multi-segment route like /api/auth/config 404'd. Routing
// all of /api/* here via an explicit `rewrites` rule in vercel.json avoids relying on
// that dynamic-segment matching at all -- this file parses the real path itself from
// req.url, exactly like server/server.js already does locally.
require('../server/lib/env').loadEnv(); // no-op on Vercel (env vars come from its dashboard); used by `vercel dev` locally
const { parse } = require('url');
const api = require('../server/lib/api');
const chat = require('../server/lib/chat');
const db = require('../server/lib/db');

let initPromise = null;
function ensureInit() {
  if (!initPromise) initPromise = db.init();
  return initPromise;
}

module.exports = async (req, res) => {
  const pathname = parse(req.url).pathname;

  if (req.method === 'POST' && pathname === '/api/chat') { await chat.handleChat(req, res); return; }
  if (req.method === 'GET' && pathname === '/api/health') { chat.handleHealth(req, res); return; }

  try {
    await ensureInit();
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Database initialization failed: ' + err.message }));
    return;
  }

  const handled = await api.handle(req, res, pathname);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unknown API route' }));
  }
};

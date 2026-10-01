// Vercel serverless entry point for every /api/* route except /api/chat and /api/health
// (those have their own separate functions below, mirroring server/server.js's split).
// This is a thin wrapper: all real routing/logic lives in server/lib/api.js so local dev
// (server/server.js, a normal long-lived Node process) and this Vercel deployment share
// one implementation. db.init() is memoized across warm invocations of the same function
// instance but cheap to re-run on a cold start.
require('../server/lib/env').loadEnv(); // no-op on Vercel (env vars come from its dashboard); used by `vercel dev` locally
const { parse } = require('url');
const api = require('../server/lib/api');
const db = require('../server/lib/db');

let initPromise = null;
function ensureInit() {
  if (!initPromise) initPromise = db.init();
  return initPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureInit();
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Database initialization failed: ' + err.message }));
    return;
  }

  const pathname = parse(req.url).pathname;
  const handled = await api.handle(req, res, pathname);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unknown API route' }));
  }
};

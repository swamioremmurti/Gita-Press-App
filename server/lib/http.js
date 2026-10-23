// Small request/response helpers shared by the admin modules (api.js keeps its own copies of the same few lines).
function sendJSON(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extraHeaders));
  res.end(body);
}

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > (limitBytes || 2e6)) { req.destroy(); reject(new Error('Payload too large')); return; }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Vercel pre-parses JSON bodies into req.body; the plain Node server does not (see api.js readJSONBody).
async function readJSON(req, limitBytes) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      if (!req.body) return {};
      try { return JSON.parse(req.body); } catch { throw new Error('Bad JSON body'); }
    }
  }
  const raw = await readBody(req, limitBytes);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('Bad JSON body'); }
}

function queryOf(req) {
  return new URL(req.url.replace(/^\/+/, '/'), 'http://localhost').searchParams;
}

module.exports = { sendJSON, readJSON, readBody, queryOf };

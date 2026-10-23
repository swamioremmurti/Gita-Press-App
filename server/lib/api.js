// All /api/* routes except /api/chat and /api/health (those stay in server.js,
// they predate this file and are unrelated to auth/admin/db). Kept as a single
// module (rather than one-file-per-route) to match this project's established
// "a few focused files, no framework" style (see lib/vectorStore.js, lib/env.js).
// Every db.* call is awaited (db.js is backed by @libsql/client, fully async) --
// this module's exported handle() is designed to be called from both a normal
// long-lived Node server (server/server.js) and a Vercel serverless function
// (api/[...path].js), which is why it never touches anything process-lifetime-specific.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db');
const auth = require('./auth');
const adminApi = require('./admin');
const adminPublic = require('./admin/public');
const mediaApi = require('./admin/media');
const vrats = require('./vrats');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const AUTHORS_DIR = path.join(PROJECT_ROOT, 'assets', 'authors');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'Gita Press Books', 'Gita Press Books');
const DATA_JS = path.join(PROJECT_ROOT, 'swadhyay-data.js');
const APP_JS = path.join(PROJECT_ROOT, 'swadhyay-app.js');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function sendJSON(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extraHeaders));
  res.end(body);
}

// Public, user-independent catalog data: let Vercel's edge cache serve it for a minute
// (and serve a stale copy while revalidating) instead of hitting the database each time.
const PUBLIC_CACHE = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };
// The vrat catalogue only changes when the site is deployed, so it can be kept longer.
const VRAT_CACHE = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' };

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

async function readJSONBody(req, limitBytes) {
  // Vercel's Node serverless runtime eagerly buffers and parses JSON/text bodies into
  // req.body before our handler runs (consuming the stream in the process) -- our own
  // plain http.Server in server.js never does this, so req.body is undefined there and
  // we fall through to reading the raw stream ourselves.
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

function requireFields(obj, fields) {
  const missing = fields.filter((f) => !obj[f] || !String(obj[f]).trim());
  if (missing.length) throw new Error('Missing required field(s): ' + missing.join(', '));
}

// ===================================================================== auth

async function handleSignup(req, res) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  try { requireFields(payload, ['name', 'email', 'password']); }
  catch (e) { return sendJSON(res, 400, { error: e.message }); }

  const email = String(payload.email).trim().toLowerCase();
  const name = String(payload.name).trim().slice(0, 120);
  const password = String(payload.password);
  if (password.length < 4) return sendJSON(res, 400, { error: 'Password must be at least 4 characters' });

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return sendJSON(res, 409, { error: 'An account with this email already exists' });

  const { hash, salt } = auth.hashPassword(password);
  await db.run('INSERT INTO users (name, email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hash, salt, 'user', Date.now()]);
  const userId = db.lastInsertId();
  const token = await auth.createSession(userId);
  auth.setSessionCookie(res, token);
  sendJSON(res, 200, { user: auth.publicUser({ id: userId, name, email, role: 'user' }) });
}

async function handleLogin(req, res) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  try { requireFields(payload, ['email', 'password']); }
  catch (e) { return sendJSON(res, 400, { error: e.message }); }

  const email = String(payload.email).trim().toLowerCase();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !auth.verifyPassword(String(payload.password), user.salt, user.password_hash)) {
    return sendJSON(res, 401, { error: 'गलत ईमेल या पासवर्ड' });
  }
  if (user.status === 'suspended') return sendJSON(res, 403, { error: 'This account has been suspended' });
  await db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), user.id]);
  const token = await auth.createSession(user.id);
  auth.setSessionCookie(res, token);
  sendJSON(res, 200, { user: auth.publicUser(user) });
}

async function handleLogout(req, res) {
  await auth.destroySession(auth.currentSessionToken(req));
  auth.clearSessionCookie(res);
  sendJSON(res, 200, { ok: true });
}

function handleMe(req, res, user) {
  sendJSON(res, 200, { user });
}

function handleAuthConfig(req, res) {
  sendJSON(res, 200, { googleClientId: GOOGLE_CLIENT_ID || null });
}

async function handleGoogleAuth(req, res) {
  if (!googleClient) {
    return sendJSON(res, 500, { error: 'Google साइन-इन अभी सर्वर पर सेट नहीं है (GOOGLE_CLIENT_ID गायब है)' });
  }
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const credential = payload.credential;
  if (!credential) return sendJSON(res, 400, { error: 'Missing credential' });

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
  } catch (e) {
    return sendJSON(res, 401, { error: 'अमान्य Google प्रमाणपत्र: ' + e.message });
  }
  const g = ticket.getPayload();
  const googleId = g.sub;
  const email = (g.email || '').toLowerCase();
  const name = g.name || email || 'Google उपयोगकर्ता';
  const avatarUrl = g.picture || null;

  let user = await db.get('SELECT * FROM users WHERE google_id = ?', [googleId]);
  if (!user && email) user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (user) {
    await db.run('UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?', [googleId, avatarUrl, user.id]);
    user = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
  } else {
    await db.run('INSERT INTO users (name, email, google_id, avatar_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, googleId, avatarUrl, 'user', Date.now()]);
    user = await db.get('SELECT * FROM users WHERE id = ?', [db.lastInsertId()]);
  }
  if (user.status === 'suspended') return sendJSON(res, 403, { error: 'This account has been suspended' });
  await db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), user.id]);
  const token = await auth.createSession(user.id);
  auth.setSessionCookie(res, token);
  sendJSON(res, 200, { user: auth.publicUser(user) });
}

// ==================================================================== books

async function handleBookMeta(req, res) {
  sendJSON(res, 200, await adminPublic.publicMeta(), PUBLIC_CACHE);
}

async function handleAllCategories(req, res) {
  sendJSON(res, 200, { categories: await db.all('SELECT key, hi, en, icon FROM categories ORDER BY rowid') });
}

async function handleAllTags(req, res) {
  sendJSON(res, 200, { tags: await db.all('SELECT id, label FROM tags ORDER BY label') });
}

// ================================================================= authors

async function authorWithBooks(authorId) {
  const author = await db.get('SELECT * FROM authors WHERE id = ?', [authorId]);
  if (!author) return null;
  const rows = await db.all('SELECT book_file FROM book_authors WHERE author_id = ?', [authorId]);
  return {
    id: author.id, name: author.name, bio: author.bio, photoPath: author.photo_path,
    bookFiles: rows.map((r) => r.book_file)
  };
}

async function handleAuthorsList(req, res) {
  const rows = await db.all(
    `SELECT a.id, a.name, a.bio, a.photo_path, COUNT(ba.book_file) AS n
     FROM authors a LEFT JOIN book_authors ba ON ba.author_id = a.id
     GROUP BY a.id ORDER BY a.name`
  );
  sendJSON(res, 200, {
    authors: rows.map((r) => ({
      id: r.id, name: r.name, bio: r.bio, photoPath: r.photo_path, bookCount: Number(r.n) || 0
    }))
  }, PUBLIC_CACHE);
}

async function handleAuthorGet(req, res, id) {
  const result = await authorWithBooks(id);
  if (!result) return sendJSON(res, 404, { error: 'Author not found' });
  sendJSON(res, 200, { author: result });
}

// ================================================================ comments

async function handleCommentsList(req, res, bookFile) {
  const rows = await db.all(
    `SELECT c.id, c.text, c.created_at, u.name AS author
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.book_file = ? AND c.status = 'visible'
     ORDER BY c.created_at DESC`,
    [bookFile]
  );
  sendJSON(res, 200, { comments: rows });
}

async function handleCommentCreate(req, res, bookFile, user) {
  if (!user) return sendJSON(res, 401, { error: 'साइन इन करना आवश्यक है' });
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const text = String(payload.text || '').trim().slice(0, 1000);
  if (!text) return sendJSON(res, 400, { error: 'टिप्पणी खाली नहीं हो सकती' });

  const now = Date.now();
  await db.run('INSERT INTO comments (book_file, user_id, text, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [bookFile, user.id, text, 'visible', now]);
  sendJSON(res, 200, { comment: { id: db.lastInsertId(), text, author: user.name, created_at: now } });
}

// ================================================================ progress

async function handleProgressGet(req, res, user) {
  const rows = await db.all(
    'SELECT book_file, progress_pct, last_opened_at, first_opened_at FROM progress WHERE user_id = ?',
    [user.id]
  );
  const progress = {};
  rows.forEach((r) => {
    progress[r.book_file] = { progress: r.progress_pct, lastOpenedAt: r.last_opened_at, firstOpenedAt: r.first_opened_at };
  });
  sendJSON(res, 200, { progress });
}

async function handleProgressPost(req, res, user) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const file = String(payload.file || '').trim();
  if (!file) return sendJSON(res, 400, { error: 'Missing file' });
  const pct = Math.max(0, Math.min(100, parseInt(payload.progress, 10) || 0));
  const lastOpenedAt = parseInt(payload.lastOpenedAt, 10) || Date.now();
  const firstOpenedAt = parseInt(payload.firstOpenedAt, 10) || lastOpenedAt;

  const existing = await db.get('SELECT * FROM progress WHERE user_id = ? AND book_file = ?', [user.id, file]);
  if (existing) {
    await db.run(
      `UPDATE progress SET progress_pct = ?, last_opened_at = ?,
       first_opened_at = MIN(first_opened_at, ?) WHERE user_id = ? AND book_file = ?`,
      [pct, lastOpenedAt, firstOpenedAt, user.id, file]
    );
  } else {
    await db.run(
      'INSERT INTO progress (user_id, book_file, progress_pct, last_opened_at, first_opened_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, file, pct, lastOpenedAt, firstOpenedAt]
    );
  }
  sendJSON(res, 200, { ok: true });
}

// ================================================================ Gita LMS (per-user learning progress)

const GITA_LMS_MAX_BYTES = 200 * 1024;

async function handleGitaLmsGet(req, res, user) {
  const row = await db.get('SELECT data, updated_at FROM gita_lms WHERE user_id = ?', [user.id]);
  let data = null;
  if (row) { try { data = JSON.parse(row.data); } catch (e) { data = null; } }
  sendJSON(res, 200, { data, updatedAt: row ? row.updated_at : 0 });
}

async function handleGitaLmsPut(req, res, user) {
  let payload;
  try { payload = await readJSONBody(req, GITA_LMS_MAX_BYTES + 4096); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const data = payload && payload.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return sendJSON(res, 400, { error: 'Missing data' });
  const text = JSON.stringify(data);
  if (Buffer.byteLength(text, 'utf8') > GITA_LMS_MAX_BYTES) return sendJSON(res, 413, { error: 'Too large' });
  // the admin reset this learner's course (admin panel -> LMS): a device still holding the old copy must not overwrite it
  const cur = await db.get('SELECT data FROM gita_lms WHERE user_id = ?', [user.id]);
  if (cur) {
    let old = null;
    try { old = JSON.parse(cur.data); } catch (e) { old = null; }
    if (old && old.resetAt && (Number(data.resetAt) || 0) < old.resetAt) return sendJSON(res, 200, { ok: false, stale: true, data: old });
  }
  const now = Date.now();
  await db.run(
    `INSERT INTO gita_lms (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [user.id, text, now]
  );
  sendJSON(res, 200, { ok: true, updatedAt: now });
}

// ================================================================ Sanskrit speech check (the separate ASR service)
// The recogniser runs in its own service (asr-service/, a Hugging Face Space). The site only (a) says where it is, so the
// page can wake it, and (b) hands out short-lived signed tokens, rate-limited per learner / address, that the service checks.

const ASR_URL = (process.env.ASR_URL || '').replace(/\/+$/, '');
const ASR_SECRET = process.env.ASR_SHARED_SECRET || '';
const ASR_TOKENS_PER_HOUR = parseInt(process.env.ASR_TOKENS_PER_HOUR, 10) || 40;
const ASR_TOKEN_TTL_S = 600;

function handleAsrConfig(req, res) {
  sendJSON(res, 200, { enabled: !!(ASR_URL && ASR_SECRET), url: ASR_URL && ASR_SECRET ? ASR_URL : '' }, { 'Cache-Control': 'no-store' });
}

function clientAddress(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function handleAsrToken(req, res, user) {
  if (!(ASR_URL && ASR_SECRET)) return sendJSON(res, 200, { enabled: false });
  const who = user ? 'u:' + user.id : 'ip:' + crypto.createHash('sha256').update(clientAddress(req) + ASR_SECRET).digest('hex').slice(0, 16);
  const hour = Math.floor(Date.now() / 3600000);
  await db.run('INSERT INTO asr_usage (who, hour, n) VALUES (?, ?, 1) ON CONFLICT(who, hour) DO UPDATE SET n = n + 1', [who, hour]);
  const row = await db.get('SELECT n FROM asr_usage WHERE who = ? AND hour = ?', [who, hour]);
  if (Math.random() < 0.02) db.run('DELETE FROM asr_usage WHERE hour < ?', [hour - 48]).catch(() => {});
  if (row && row.n > ASR_TOKENS_PER_HOUR) {
    return sendJSON(res, 429, { error: 'इस घण्टे की सीमा पूरी हो गयी — कुछ देर बाद फिर प्रयास करें।' }, { 'Retry-After': '600' });
  }
  const body = Buffer.from(JSON.stringify({ e: Math.floor(Date.now() / 1000) + ASR_TOKEN_TTL_S, n: crypto.randomBytes(6).toString('hex') })).toString('base64url');
  const sig = crypto.createHmac('sha256', ASR_SECRET).update(body).digest('hex');
  sendJSON(res, 200, { enabled: true, url: ASR_URL, token: body + '.' + sig, expiresIn: ASR_TOKEN_TTL_S }, { 'Cache-Control': 'no-store' });
}

// =========================================================================

/**
 * Two calls the page makes on every load that need no database when there is nothing to look up:
 * /api/auth/config (an environment variable) and /api/auth/me for a visitor with no session cookie.
 * The router answers them BEFORE the database is opened, so on a cold start the first screen is
 * not held up by the database connection. Returns true if it answered.
 */
function handleWithoutDb(req, res, pathname) {
  if (req.method !== 'GET') return false;
  if (pathname === '/api/auth/config') { handleAuthConfig(req, res); return true; }
  if (pathname === '/api/asr/config') { handleAsrConfig(req, res); return true; }
  if (pathname === '/api/auth/me' && !auth.currentSessionToken(req)) { handleMe(req, res, null); return true; }
  return false;
}

/**
 * Returns true if this module handled the request (caller should stop),
 * false if the path didn't match anything here (caller falls through).
 */
async function handle(req, res, pathname) {
  const user = await auth.currentUser(req);
  const method = req.method;

  try {
    if (method === 'POST' && pathname === '/api/auth/signup') { await handleSignup(req, res); return true; }
    if (method === 'POST' && pathname === '/api/auth/login') { await handleLogin(req, res); return true; }
    if (method === 'POST' && pathname === '/api/auth/logout') { await handleLogout(req, res); return true; }
    if (method === 'GET' && pathname === '/api/auth/me') { handleMe(req, res, user); return true; }
    if (method === 'GET' && pathname === '/api/auth/config') { handleAuthConfig(req, res); return true; }
    if (method === 'POST' && pathname === '/api/auth/google') { await handleGoogleAuth(req, res); return true; }

    if (method === 'GET' && pathname === '/api/book-meta') { await handleBookMeta(req, res); return true; }
    if (method === 'GET' && pathname === '/api/book-content') {
      const file = new URL(req.url, 'http://x').searchParams.get('file') || '';
      await adminPublic.serveBookContent(req, res, file);
      return true;
    }
    const mm = pathname.match(/^\/api\/media\/(\d+)(?:\/.*)?$/);
    if ((method === 'GET' || method === 'HEAD') && mm) { await mediaApi.serve(req, res, parseInt(mm[1], 10)); return true; }
    if (method === 'GET' && pathname === '/api/gita-patches') { sendJSON(res, 200, { patches: await adminPublic.publicPatches() }, PUBLIC_CACHE); return true; }

    if (method === 'GET' && pathname === '/api/categories') { await handleAllCategories(req, res); return true; }
    if (method === 'GET' && pathname === '/api/tags') { await handleAllTags(req, res); return true; }

    // vrat / festival catalogue: public, the same for everyone -> cached at the edge like the book metadata
    if (method === 'GET' && pathname === '/api/vrats') { sendJSON(res, 200, { vrats: await vrats.listVrats() }, VRAT_CACHE); return true; }
    const vm = pathname.match(/^\/api\/vrats\/([^/]+)$/);
    if (method === 'GET' && vm) {
      const one = await vrats.getVrat(decodeURIComponent(vm[1]));
      if (!one) { sendJSON(res, 404, { error: 'Unknown vrat' }); return true; }
      sendJSON(res, 200, { vrat: one }, VRAT_CACHE);
      return true;
    }

    if (method === 'GET' && pathname === '/api/authors') { await handleAuthorsList(req, res); return true; }
    let m = pathname.match(/^\/api\/authors\/(\d+)$/);
    if (method === 'GET' && m) { await handleAuthorGet(req, res, parseInt(m[1], 10)); return true; }

    m = pathname.match(/^\/api\/books\/([^/]+)\/comments$/);
    if (m) {
      const bookFile = decodeURIComponent(m[1]);
      if (method === 'GET') { await handleCommentsList(req, res, bookFile); return true; }
      if (method === 'POST') { await handleCommentCreate(req, res, bookFile, user); return true; }
    }

    if (pathname === '/api/progress') {
      if (!user) { sendJSON(res, 401, { error: 'साइन इन करना आवश्यक है' }); return true; }
      if (method === 'GET') { await handleProgressGet(req, res, user); return true; }
      if (method === 'POST') { await handleProgressPost(req, res, user); return true; }
    }

    if (method === 'GET' && pathname === '/api/asr/config') { handleAsrConfig(req, res); return true; }
    if (method === 'POST' && pathname === '/api/asr/token') { await handleAsrToken(req, res, user); return true; }

    if (pathname === '/api/gita-lms') {
      if (!user) { sendJSON(res, 401, { error: 'साइन इन करना आवश्यक है' }); return true; }
      if (method === 'GET') { await handleGitaLmsGet(req, res, user); return true; }
      if (method === 'PUT' || method === 'POST') { await handleGitaLmsPut(req, res, user); return true; }
    }

    // ---- admin routes: everything below requires role === 'admin' (see server/lib/admin/) ----
    if (pathname.startsWith('/api/admin/')) {
      if (!user || user.role !== 'admin') { sendJSON(res, 403, { error: 'Admin access is required' }); return true; }
      if (await adminApi.handle(req, res, pathname, user)) return true;
      sendJSON(res, 404, { error: 'Unknown admin route' });
      return true;
    }
  } catch (err) {
    sendJSON(res, 500, { error: err.message });
    return true;
  }

  return false;
}

module.exports = { handle, handleWithoutDb };

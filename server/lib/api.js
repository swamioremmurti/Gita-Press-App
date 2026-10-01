// All /api/* routes except /api/chat and /api/health (those stay in server.js,
// they predate this file and are unrelated to auth/admin/db). Kept as a single
// module (rather than one-file-per-route) to match this project's established
// "a few focused files, no framework" style (see lib/vectorStore.js, lib/env.js).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const AUTHORS_DIR = path.join(PROJECT_ROOT, 'assets', 'authors');

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
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

async function readJSONBody(req, limitBytes) {
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

  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return sendJSON(res, 409, { error: 'An account with this email already exists' });

  const { hash, salt } = auth.hashPassword(password);
  db.run('INSERT INTO users (name, email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hash, salt, 'user', Date.now()]);
  const userId = db.lastInsertId();
  const token = auth.createSession(userId);
  auth.setSessionCookie(res, token);
  sendJSON(res, 200, { user: auth.publicUser({ id: userId, name, email, role: 'user' }) });
}

async function handleLogin(req, res) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  try { requireFields(payload, ['email', 'password']); }
  catch (e) { return sendJSON(res, 400, { error: e.message }); }

  const email = String(payload.email).trim().toLowerCase();
  const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !auth.verifyPassword(String(payload.password), user.salt, user.password_hash)) {
    return sendJSON(res, 401, { error: 'गलत ईमेल या पासवर्ड' });
  }
  const token = auth.createSession(user.id);
  auth.setSessionCookie(res, token);
  sendJSON(res, 200, { user: auth.publicUser(user) });
}

function handleLogout(req, res) {
  auth.destroySession(auth.currentSessionToken(req));
  auth.clearSessionCookie(res);
  sendJSON(res, 200, { ok: true });
}

function handleMe(req, res) {
  sendJSON(res, 200, { user: auth.currentUser(req) });
}

// ==================================================================== books

function handleBookMeta(req, res) {
  const cats = db.all(
    `SELECT bc.book_file, c.key, c.hi, c.en, c.icon
     FROM book_categories bc JOIN categories c ON c.key = bc.category_key`
  );
  const tags = db.all(
    `SELECT bt.book_file, t.id, t.label
     FROM book_tags bt JOIN tags t ON t.id = bt.tag_id`
  );
  const authorsLink = db.all(
    `SELECT ba.book_file, a.id, a.name, a.photo_path
     FROM book_authors ba JOIN authors a ON a.id = ba.author_id`
  );

  const meta = {};
  const ensure = (file) => meta[file] || (meta[file] = { categories: [], tags: [], author: null });

  cats.forEach((r) => ensure(r.book_file).categories.push({ key: r.key, hi: r.hi, en: r.en, icon: r.icon }));
  tags.forEach((r) => ensure(r.book_file).tags.push({ id: r.id, label: r.label }));
  authorsLink.forEach((r) => { ensure(r.book_file).author = { id: r.id, name: r.name, photoPath: r.photo_path }; });

  sendJSON(res, 200, { meta });
}

function handleAllCategories(req, res) {
  sendJSON(res, 200, { categories: db.all('SELECT key, hi, en, icon FROM categories ORDER BY rowid') });
}

function handleAllTags(req, res) {
  sendJSON(res, 200, { tags: db.all('SELECT id, label FROM tags ORDER BY label') });
}

// ================================================================= authors

function authorWithBooks(authorId) {
  const author = db.get('SELECT * FROM authors WHERE id = ?', [authorId]);
  if (!author) return null;
  const books = db.all('SELECT book_file FROM book_authors WHERE author_id = ?', [authorId]).map((r) => r.book_file);
  return {
    id: author.id, name: author.name, bio: author.bio, photoPath: author.photo_path,
    bookFiles: books
  };
}

function handleAuthorsList(req, res) {
  const rows = db.all('SELECT id, name, bio, photo_path FROM authors ORDER BY name');
  const counts = db.all('SELECT author_id, COUNT(*) AS n FROM book_authors GROUP BY author_id');
  const countByAuthor = {};
  counts.forEach((r) => { countByAuthor[r.author_id] = r.n; });
  sendJSON(res, 200, {
    authors: rows.map((r) => ({
      id: r.id, name: r.name, bio: r.bio, photoPath: r.photo_path, bookCount: countByAuthor[r.id] || 0
    }))
  });
}

function handleAuthorGet(req, res, id) {
  const result = authorWithBooks(id);
  if (!result) return sendJSON(res, 404, { error: 'Author not found' });
  sendJSON(res, 200, { author: result });
}

// ================================================================ comments

function handleCommentsList(req, res, bookFile) {
  const rows = db.all(
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
  db.run('INSERT INTO comments (book_file, user_id, text, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [bookFile, user.id, text, 'visible', now]);
  sendJSON(res, 200, { comment: { id: db.lastInsertId(), text, author: user.name, created_at: now } });
}

// ================================================================ progress

function handleProgressGet(req, res, user) {
  const rows = db.all(
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

  const existing = db.get('SELECT * FROM progress WHERE user_id = ? AND book_file = ?', [user.id, file]);
  if (existing) {
    db.run(
      `UPDATE progress SET progress_pct = ?, last_opened_at = ?,
       first_opened_at = MIN(first_opened_at, ?) WHERE user_id = ? AND book_file = ?`,
      [pct, lastOpenedAt, firstOpenedAt, user.id, file]
    );
  } else {
    db.run(
      'INSERT INTO progress (user_id, book_file, progress_pct, last_opened_at, first_opened_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, file, pct, lastOpenedAt, firstOpenedAt]
    );
  }
  sendJSON(res, 200, { ok: true });
}

// ============================================================== admin: books

async function handleAdminBookCategories(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const keys = Array.isArray(payload.categories) ? payload.categories : [];
  db.run('DELETE FROM book_categories WHERE book_file = ?', [bookFile]);
  keys.forEach((key) => {
    if (db.get('SELECT key FROM categories WHERE key = ?', [key])) {
      db.run('INSERT OR IGNORE INTO book_categories (book_file, category_key) VALUES (?, ?)', [bookFile, key]);
    }
  });
  sendJSON(res, 200, { ok: true });
}

async function handleAdminBookTags(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const labels = Array.isArray(payload.tags)
    ? payload.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 30)
    : [];

  db.run('DELETE FROM book_tags WHERE book_file = ?', [bookFile]);
  labels.forEach((label) => {
    let tag = db.get('SELECT id FROM tags WHERE label = ?', [label]);
    if (!tag) {
      db.run('INSERT INTO tags (label) VALUES (?)', [label]);
      tag = { id: db.lastInsertId() };
    }
    db.run('INSERT OR IGNORE INTO book_tags (book_file, tag_id) VALUES (?, ?)', [bookFile, tag.id]);
  });
  sendJSON(res, 200, { ok: true });
}

async function handleAdminBookAuthor(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const authorId = payload.authorId ? parseInt(payload.authorId, 10) : null;
  db.run('DELETE FROM book_authors WHERE book_file = ?', [bookFile]);
  if (authorId) db.run('INSERT INTO book_authors (book_file, author_id) VALUES (?, ?)', [bookFile, authorId]);
  sendJSON(res, 200, { ok: true });
}

// ============================================================ admin: authors

async function handleAdminAuthorCreate(req, res) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const name = String(payload.name || '').trim();
  if (!name) return sendJSON(res, 400, { error: 'नाम आवश्यक है' });
  db.run('INSERT INTO authors (name, bio, photo_path, created_at) VALUES (?, ?, NULL, ?)',
    [name, String(payload.bio || '').trim(), Date.now()]);
  sendJSON(res, 200, { author: authorWithBooks(db.lastInsertId()) });
}

async function handleAdminAuthorUpdate(req, res, id) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const existing = db.get('SELECT id FROM authors WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'Author not found' });
  const fields = [];
  const params = [];
  if (payload.name !== undefined) { fields.push('name = ?'); params.push(String(payload.name).trim()); }
  if (payload.bio !== undefined) { fields.push('bio = ?'); params.push(String(payload.bio).trim()); }
  if (!fields.length) return sendJSON(res, 400, { error: 'Nothing to update' });
  params.push(id);
  db.run(`UPDATE authors SET ${fields.join(', ')} WHERE id = ?`, params);
  sendJSON(res, 200, { author: authorWithBooks(id) });
}

const IMAGE_EXT_BY_MIME = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp'
};

async function handleAdminAuthorPhoto(req, res, id) {
  const existing = db.get('SELECT id, photo_path FROM authors WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'Author not found' });

  let payload;
  try { payload = await readJSONBody(req, 8e6); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  let imageData = String(payload.imageData || '');
  if (!imageData) return sendJSON(res, 400, { error: 'imageData is required' });

  let mime = 'image/png';
  const m = imageData.match(/^data:([^;]+);base64,(.*)$/s);
  if (m) { mime = m[1]; imageData = m[2]; }
  const ext = IMAGE_EXT_BY_MIME[mime];
  if (!ext) return sendJSON(res, 400, { error: 'Unsupported image type: ' + mime });

  let bytes;
  try { bytes = Buffer.from(imageData, 'base64'); } catch { return sendJSON(res, 400, { error: 'Could not decode image' }); }
  if (!bytes.length) return sendJSON(res, 400, { error: 'Empty image' });

  fs.mkdirSync(AUTHORS_DIR, { recursive: true });
  const filename = `author-${id}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(AUTHORS_DIR, filename), bytes);

  // Clean up the previous photo file, if any, now that it's been replaced.
  if (existing.photo_path) {
    const prevAbs = path.join(PROJECT_ROOT, existing.photo_path);
    if (prevAbs.startsWith(AUTHORS_DIR)) fs.unlink(prevAbs, () => {});
  }

  const relPath = `assets/authors/${filename}`;
  db.run('UPDATE authors SET photo_path = ? WHERE id = ?', [relPath, id]);
  sendJSON(res, 200, { photoPath: relPath });
}

// ============================================================== admin: users

function handleAdminUsersList(req, res) {
  const rows = db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  sendJSON(res, 200, { users: rows });
}

async function handleAdminUserRole(req, res, id, requestingUser) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const role = payload.role === 'admin' ? 'admin' : 'user';
  if (id === requestingUser.id && role !== 'admin') {
    return sendJSON(res, 400, { error: 'आप स्वयं को admin से नहीं हटा सकते' });
  }
  const existing = db.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'User not found' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  sendJSON(res, 200, { ok: true });
}

// =========================================================== admin: comments

function handleAdminCommentsList(req, res) {
  const rows = db.all(
    `SELECT c.id, c.book_file, c.text, c.status, c.created_at, u.name AS author
     FROM comments c JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC LIMIT 500`
  );
  sendJSON(res, 200, { comments: rows });
}

async function handleAdminCommentStatus(req, res, id) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const status = payload.status === 'hidden' ? 'hidden' : 'visible';
  const existing = db.get('SELECT id FROM comments WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'Comment not found' });
  db.run('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
  sendJSON(res, 200, { ok: true });
}

function handleAdminCommentDelete(req, res, id) {
  db.run('DELETE FROM comments WHERE id = ?', [id]);
  sendJSON(res, 200, { ok: true });
}

// =========================================================================

/**
 * Returns true if this module handled the request (caller should stop),
 * false if the path didn't match anything here (caller falls through).
 */
async function handle(req, res, pathname) {
  const user = auth.currentUser(req);
  const method = req.method;

  try {
    if (method === 'POST' && pathname === '/api/auth/signup') { await handleSignup(req, res); return true; }
    if (method === 'POST' && pathname === '/api/auth/login') { await handleLogin(req, res); return true; }
    if (method === 'POST' && pathname === '/api/auth/logout') { handleLogout(req, res); return true; }
    if (method === 'GET' && pathname === '/api/auth/me') { handleMe(req, res); return true; }

    if (method === 'GET' && pathname === '/api/book-meta') { handleBookMeta(req, res); return true; }
    if (method === 'GET' && pathname === '/api/categories') { handleAllCategories(req, res); return true; }
    if (method === 'GET' && pathname === '/api/tags') { handleAllTags(req, res); return true; }

    if (method === 'GET' && pathname === '/api/authors') { handleAuthorsList(req, res); return true; }
    let m = pathname.match(/^\/api\/authors\/(\d+)$/);
    if (method === 'GET' && m) { handleAuthorGet(req, res, parseInt(m[1], 10)); return true; }

    m = pathname.match(/^\/api\/books\/([^/]+)\/comments$/);
    if (m) {
      const bookFile = decodeURIComponent(m[1]);
      if (method === 'GET') { handleCommentsList(req, res, bookFile); return true; }
      if (method === 'POST') { await handleCommentCreate(req, res, bookFile, user); return true; }
    }

    if (pathname === '/api/progress') {
      if (!user) { sendJSON(res, 401, { error: 'साइन इन करना आवश्यक है' }); return true; }
      if (method === 'GET') { handleProgressGet(req, res, user); return true; }
      if (method === 'POST') { await handleProgressPost(req, res, user); return true; }
    }

    // ---- admin routes: everything below requires role === 'admin' ----
    if (pathname.startsWith('/api/admin/')) {
      if (!user || user.role !== 'admin') { sendJSON(res, 403, { error: 'Admin अनुमति आवश्यक है' }); return true; }

      m = pathname.match(/^\/api\/admin\/books\/([^/]+)\/categories$/);
      if (method === 'POST' && m) { await handleAdminBookCategories(req, res, decodeURIComponent(m[1])); return true; }

      m = pathname.match(/^\/api\/admin\/books\/([^/]+)\/tags$/);
      if (method === 'POST' && m) { await handleAdminBookTags(req, res, decodeURIComponent(m[1])); return true; }

      m = pathname.match(/^\/api\/admin\/books\/([^/]+)\/author$/);
      if (method === 'POST' && m) { await handleAdminBookAuthor(req, res, decodeURIComponent(m[1])); return true; }

      if (method === 'POST' && pathname === '/api/admin/authors') { await handleAdminAuthorCreate(req, res); return true; }

      m = pathname.match(/^\/api\/admin\/authors\/(\d+)$/);
      if (method === 'PATCH' && m) { await handleAdminAuthorUpdate(req, res, parseInt(m[1], 10)); return true; }

      m = pathname.match(/^\/api\/admin\/authors\/(\d+)\/photo$/);
      if (method === 'POST' && m) { await handleAdminAuthorPhoto(req, res, parseInt(m[1], 10)); return true; }

      if (method === 'GET' && pathname === '/api/admin/users') { handleAdminUsersList(req, res); return true; }

      m = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
      if (method === 'PATCH' && m) { await handleAdminUserRole(req, res, parseInt(m[1], 10), user); return true; }

      if (method === 'GET' && pathname === '/api/admin/comments') { handleAdminCommentsList(req, res); return true; }

      m = pathname.match(/^\/api\/admin\/comments\/(\d+)$/);
      if (method === 'PATCH' && m) { await handleAdminCommentStatus(req, res, parseInt(m[1], 10)); return true; }
      if (method === 'DELETE' && m) { handleAdminCommentDelete(req, res, parseInt(m[1], 10)); return true; }

      sendJSON(res, 404, { error: 'Unknown admin route' });
      return true;
    }
  } catch (err) {
    sendJSON(res, 500, { error: err.message });
    return true;
  }

  return false;
}

module.exports = { handle };

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
const registry = require('./bookRegistry');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const AUTHORS_DIR = path.join(PROJECT_ROOT, 'assets', 'authors');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'Gita Press Books', 'Gita Press Books');
const DATA_JS = path.join(PROJECT_ROOT, 'swadhyay-data.js');
const APP_JS = path.join(PROJECT_ROOT, 'swadhyay-app.js');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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
  const token = await auth.createSession(user.id);
  auth.setSessionCookie(res, token);
  sendJSON(res, 200, { user: auth.publicUser(user) });
}

// ==================================================================== books

async function handleBookMeta(req, res) {
  const cats = await db.all(
    `SELECT bc.book_file, c.key, c.hi, c.en, c.icon
     FROM book_categories bc JOIN categories c ON c.key = bc.category_key`
  );
  const tags = await db.all(
    `SELECT bt.book_file, t.id, t.label
     FROM book_tags bt JOIN tags t ON t.id = bt.tag_id`
  );
  const authorsLink = await db.all(
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
  const rows = await db.all('SELECT id, name, bio, photo_path FROM authors ORDER BY name');
  const counts = await db.all('SELECT author_id, COUNT(*) AS n FROM book_authors GROUP BY author_id');
  const countByAuthor = {};
  counts.forEach((r) => { countByAuthor[r.author_id] = r.n; });
  sendJSON(res, 200, {
    authors: rows.map((r) => ({
      id: r.id, name: r.name, bio: r.bio, photoPath: r.photo_path, bookCount: countByAuthor[r.id] || 0
    }))
  });
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

// ============================================================== admin: books

function slugFilename(name) {
  return name.endsWith('.html') ? name : name + '.html';
}

/** Create a brand-new book: write the already-converted HTML file the admin attached,
 *  register it in swadhyay-data.js (same text-edit tools/book_converter.py uses), and
 *  link its categories/tags/author in the DB. This does NOT convert a .docx/manuscript
 *  -- that stays on tools/book_converter.py; this is for a book that's already in our
 *  HTML template format and just needs to be added to the library. */
async function handleAdminBookCreate(req, res) {
  let payload;
  try { payload = await readJSONBody(req, 25e6); } catch (e) { return sendJSON(res, 400, { error: e.message }); }

  const title = String(payload.title || '').trim();
  if (!title) return sendJSON(res, 400, { error: 'शीर्षक आवश्यक है' });

  const requestedCategories = Array.isArray(payload.categories) ? payload.categories : [];
  const categories = [];
  for (const k of requestedCategories) {
    if (await db.get('SELECT key FROM categories WHERE key = ?', [k])) categories.push(k);
  }
  if (!categories.length) return sendJSON(res, 400, { error: 'कम से कम एक श्रेणी चुनें' });

  let htmlData = String(payload.htmlData || '');
  if (!htmlData) return sendJSON(res, 400, { error: 'पुस्तक की HTML फ़ाइल संलग्न करें' });
  const m = htmlData.match(/^data:([^;]+);base64,(.*)$/s);
  if (m) htmlData = m[2];
  let htmlBytes;
  try { htmlBytes = Buffer.from(htmlData, 'base64'); } catch { return sendJSON(res, 400, { error: 'फ़ाइल डिकोड नहीं हो सकी' }); }
  if (!htmlBytes.length) return sendJSON(res, 400, { error: 'फ़ाइल खाली है' });

  const filename = slugFilename(((payload.outName && String(payload.outName).trim()) || title));
  const destPath = path.join(BOOKS_DIR, filename);
  if (fs.existsSync(destPath)) return sendJSON(res, 409, { error: `फ़ाइल पहले से मौजूद है: ${filename}` });

  // resolve author: either an existing authorId, or a brand-new name to create+link
  let authorId = payload.authorId ? parseInt(payload.authorId, 10) : null;
  let authorName = '';
  if (authorId) {
    const a = await db.get('SELECT * FROM authors WHERE id = ?', [authorId]);
    if (!a) return sendJSON(res, 400, { error: 'चयनित लेखक नहीं मिला' });
    authorName = a.name;
  } else if (payload.newAuthorName && String(payload.newAuthorName).trim()) {
    authorName = String(payload.newAuthorName).trim();
    await db.run('INSERT INTO authors (name, bio, photo_path, created_at) VALUES (?, ?, NULL, ?)', [authorName, '', Date.now()]);
    authorId = db.lastInsertId();
  }

  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  fs.writeFileSync(destPath, htmlBytes);
  const sizeKB = Math.round((htmlBytes.length / 1024) * 10) / 10;

  registry.registerInDataJs(DATA_JS, filename, categories[0], authorName, sizeKB);
  registry.setTitleOverride(APP_JS, filename, title);
  if (payload.publisher === 'other') registry.setNonGitaPress(APP_JS, filename, true);

  for (const key of categories) {
    await db.run('INSERT OR IGNORE INTO book_categories (book_file, category_key) VALUES (?, ?)', [filename, key]);
  }
  const tags = (Array.isArray(payload.tags) ? payload.tags : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 30);
  for (const label of tags) {
    let tag = await db.get('SELECT id FROM tags WHERE label = ?', [label]);
    if (!tag) { await db.run('INSERT INTO tags (label) VALUES (?)', [label]); tag = { id: db.lastInsertId() }; }
    await db.run('INSERT OR IGNORE INTO book_tags (book_file, tag_id) VALUES (?, ?)', [filename, tag.id]);
  }
  if (authorId) await db.run('INSERT OR IGNORE INTO book_authors (book_file, author_id) VALUES (?, ?)', [filename, authorId]);

  sendJSON(res, 200, { ok: true, file: filename });
}

/** Edit a book's title / fallback author text / Gita-Press-publisher flag -- these three
 *  live in the static swadhyay-data.js / swadhyay-app.js files (see bookRegistry.js),
 *  unlike categories/tags/author-link below which are pure DB state. The client reloads
 *  the page after a successful save since these files are only read once at boot. */
async function handleAdminBookMeta(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  if (payload.title !== undefined) {
    const title = String(payload.title).trim();
    if (!title) return sendJSON(res, 400, { error: 'शीर्षक खाली नहीं हो सकता' });
    registry.setTitleOverride(APP_JS, bookFile, title);
  }
  if (payload.authorText !== undefined) {
    registry.updateDataJsField(DATA_JS, bookFile, 'author', String(payload.authorText).trim());
  }
  if (payload.isGitaPress !== undefined) {
    registry.setNonGitaPress(APP_JS, bookFile, !payload.isGitaPress);
  }
  sendJSON(res, 200, { ok: true });
}

async function handleAdminBookCategories(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const keys = Array.isArray(payload.categories) ? payload.categories : [];
  await db.run('DELETE FROM book_categories WHERE book_file = ?', [bookFile]);
  for (const key of keys) {
    if (await db.get('SELECT key FROM categories WHERE key = ?', [key])) {
      await db.run('INSERT OR IGNORE INTO book_categories (book_file, category_key) VALUES (?, ?)', [bookFile, key]);
    }
  }
  sendJSON(res, 200, { ok: true });
}

async function handleAdminBookTags(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const labels = Array.isArray(payload.tags)
    ? payload.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 30)
    : [];

  await db.run('DELETE FROM book_tags WHERE book_file = ?', [bookFile]);
  for (const label of labels) {
    let tag = await db.get('SELECT id FROM tags WHERE label = ?', [label]);
    if (!tag) {
      await db.run('INSERT INTO tags (label) VALUES (?)', [label]);
      tag = { id: db.lastInsertId() };
    }
    await db.run('INSERT OR IGNORE INTO book_tags (book_file, tag_id) VALUES (?, ?)', [bookFile, tag.id]);
  }
  sendJSON(res, 200, { ok: true });
}

async function handleAdminBookAuthor(req, res, bookFile) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const authorId = payload.authorId ? parseInt(payload.authorId, 10) : null;
  await db.run('DELETE FROM book_authors WHERE book_file = ?', [bookFile]);
  if (authorId) await db.run('INSERT INTO book_authors (book_file, author_id) VALUES (?, ?)', [bookFile, authorId]);
  sendJSON(res, 200, { ok: true });
}

// ============================================================ admin: authors

async function handleAdminAuthorCreate(req, res) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const name = String(payload.name || '').trim();
  if (!name) return sendJSON(res, 400, { error: 'नाम आवश्यक है' });
  await db.run('INSERT INTO authors (name, bio, photo_path, created_at) VALUES (?, ?, NULL, ?)',
    [name, String(payload.bio || '').trim(), Date.now()]);
  sendJSON(res, 200, { author: await authorWithBooks(db.lastInsertId()) });
}

async function handleAdminAuthorUpdate(req, res, id) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const existing = await db.get('SELECT id FROM authors WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'Author not found' });
  const fields = [];
  const params = [];
  if (payload.name !== undefined) { fields.push('name = ?'); params.push(String(payload.name).trim()); }
  if (payload.bio !== undefined) { fields.push('bio = ?'); params.push(String(payload.bio).trim()); }
  if (!fields.length) return sendJSON(res, 400, { error: 'Nothing to update' });
  params.push(id);
  await db.run(`UPDATE authors SET ${fields.join(', ')} WHERE id = ?`, params);
  sendJSON(res, 200, { author: await authorWithBooks(id) });
}

const IMAGE_EXT_BY_MIME = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp'
};

async function handleAdminAuthorPhoto(req, res, id) {
  const existing = await db.get('SELECT id, photo_path FROM authors WHERE id = ?', [id]);
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
  await db.run('UPDATE authors SET photo_path = ? WHERE id = ?', [relPath, id]);
  sendJSON(res, 200, { photoPath: relPath });
}

// ============================================================== admin: users

async function handleAdminUsersList(req, res) {
  const rows = await db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
  sendJSON(res, 200, { users: rows });
}

async function handleAdminUserRole(req, res, id, requestingUser) {
  let payload;
  try { payload = await readJSONBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  const role = payload.role === 'admin' ? 'admin' : 'user';
  if (id === requestingUser.id && role !== 'admin') {
    return sendJSON(res, 400, { error: 'आप स्वयं को admin से नहीं हटा सकते' });
  }
  const existing = await db.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'User not found' });
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  sendJSON(res, 200, { ok: true });
}

// =========================================================== admin: comments

async function handleAdminCommentsList(req, res) {
  const rows = await db.all(
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
  const existing = await db.get('SELECT id FROM comments WHERE id = ?', [id]);
  if (!existing) return sendJSON(res, 404, { error: 'Comment not found' });
  await db.run('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
  sendJSON(res, 200, { ok: true });
}

async function handleAdminCommentDelete(req, res, id) {
  await db.run('DELETE FROM comments WHERE id = ?', [id]);
  sendJSON(res, 200, { ok: true });
}

// =========================================================================

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
    if (method === 'GET' && pathname === '/api/categories') { await handleAllCategories(req, res); return true; }
    if (method === 'GET' && pathname === '/api/tags') { await handleAllTags(req, res); return true; }

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

    // ---- admin routes: everything below requires role === 'admin' ----
    if (pathname.startsWith('/api/admin/')) {
      if (!user || user.role !== 'admin') { sendJSON(res, 403, { error: 'Admin अनुमति आवश्यक है' }); return true; }

      if (method === 'POST' && pathname === '/api/admin/books') { await handleAdminBookCreate(req, res); return true; }

      m = pathname.match(/^\/api\/admin\/books\/([^/]+)$/);
      if (method === 'PATCH' && m) { await handleAdminBookMeta(req, res, decodeURIComponent(m[1])); return true; }

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

      if (method === 'GET' && pathname === '/api/admin/users') { await handleAdminUsersList(req, res); return true; }

      m = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
      if (method === 'PATCH' && m) { await handleAdminUserRole(req, res, parseInt(m[1], 10), user); return true; }

      if (method === 'GET' && pathname === '/api/admin/comments') { await handleAdminCommentsList(req, res); return true; }

      m = pathname.match(/^\/api\/admin\/comments\/(\d+)$/);
      if (method === 'PATCH' && m) { await handleAdminCommentStatus(req, res, parseInt(m[1], 10)); return true; }
      if (method === 'DELETE' && m) { await handleAdminCommentDelete(req, res, parseInt(m[1], 10)); return true; }

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

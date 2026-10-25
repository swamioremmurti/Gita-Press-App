// Admin panel API: every /api/admin/* route. The caller (api.js) has already checked that the user is an admin.
const db = require('../db');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, kvGet, kvSet, siteSettings, num } = require('./common');
const books = require('./books');
const categories = require('./categories');
const media = require('./media');
const people = require('./people');
const lms = require('./lms');
const audio = require('./audio');
const css = require('./css');

const DAY = 86400000;

async function dashboard(ctx) {
  const now = Date.now();
  const [list, users, newUsers7, newUsers30, comments, hidden, mediaStat, reads, lmsRows, topRows, signups, log, cats, tags, docs] = await Promise.all([
    books.allBooks(),
    db.get("SELECT COUNT(*) AS n, SUM(role = 'admin') AS admins, SUM(status = 'suspended') AS suspended FROM users"),
    db.get('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', [now - 7 * DAY]),
    db.get('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', [now - 30 * DAY]),
    db.get('SELECT COUNT(*) AS n FROM comments'),
    db.get("SELECT COUNT(*) AS n FROM comments WHERE status = 'hidden'"),
    db.get('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM media'),
    db.get('SELECT COUNT(*) AS n, COUNT(DISTINCT user_id) AS readers FROM progress'),
    db.get('SELECT COUNT(*) AS n, SUM(updated_at >= ?) AS active FROM gita_lms', [now - 7 * DAY]),
    db.all('SELECT book_file, COUNT(*) AS readers, ROUND(AVG(progress_pct)) AS avg FROM progress GROUP BY book_file ORDER BY readers DESC LIMIT 8'),
    db.all('SELECT created_at FROM users WHERE created_at >= ?', [now - 29 * DAY]),
    db.all('SELECT id, user_name, action, target, detail, created_at FROM admin_log ORDER BY id DESC LIMIT 8'),
    db.get('SELECT COUNT(*) AS n FROM categories'),
    db.get('SELECT COUNT(*) AS n FROM tags'),
    db.get('SELECT COUNT(*) AS n FROM book_docs WHERE updated_at > 0')
  ]);
  const titles = {};
  list.forEach((b) => { titles[b.file] = b.title; });
  const perDay = {};
  signups.forEach((r) => { const d = new Date(Number(r.created_at)).toISOString().slice(0, 10); perDay[d] = (perDay[d] || 0) + 1; });
  const series = [];
  for (let i = 29; i >= 0; i--) { const k = new Date(now - i * DAY).toISOString().slice(0, 10); series.push({ date: k, n: perDay[k] || 0 }); }
  const needsAttention = [];
  const noCover = list.filter((b) => b.enabled && !b.cover).length;
  if (Number(hidden.n)) needsAttention.push({ kind: 'comments', text: Number(hidden.n) + ' hidden comment(s) to review', to: '#/comments' });
  if (noCover) needsAttention.push({ kind: 'covers', text: noCover + ' enabled book(s) have no cover image', to: '#/books?status=nocover' });
  sendJSON(ctx.res, 200, {
    books: { total: list.length, enabled: list.filter((b) => b.enabled).length, disabled: list.filter((b) => !b.enabled).length, featured: list.filter((b) => b.featured).length, created: list.filter((b) => b.created).length, edited: Number(docs.n) },
    categories: Number(cats.n), tags: Number(tags.n),
    users: { total: Number(users.n), admins: Number(users.admins) || 0, suspended: Number(users.suspended) || 0, new7: Number(newUsers7.n), new30: Number(newUsers30.n) },
    comments: { total: Number(comments.n), hidden: Number(hidden.n) },
    media: { files: Number(mediaStat.n), bytes: Number(mediaStat.bytes) },
    reading: { records: Number(reads.n), readers: Number(reads.readers) },
    lms: { learners: Number(lmsRows.n), active7: Number(lmsRows.active) || 0 },
    topBooks: topRows.map((r) => ({ file: r.book_file, title: titles[r.book_file] || r.book_file, readers: Number(r.readers), avg: Number(r.avg) })),
    signups: series, needsAttention,
    recent: log.map((r) => ({ id: r.id, who: r.user_name, action: r.action, target: r.target, detail: r.detail, at: Number(r.created_at) })),
    server: { node: process.version, vercel: !!process.env.VERCEL, database: process.env.TURSO_DATABASE_URL ? 'Turso (remote)' : 'Local file' }
  });
}

async function logList(ctx) {
  const q = queryOf(ctx.req);
  const text = (q.get('q') || '').trim().toLowerCase();
  const size = Math.min(200, Math.max(10, num(q.get('size'), 50))), page = Math.max(1, num(q.get('page'), 1));
  const where = text ? ' WHERE LOWER(action) LIKE ? OR LOWER(target) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(detail) LIKE ?' : '';
  const args = text ? Array(4).fill('%' + text + '%') : [];
  const total = await db.get('SELECT COUNT(*) AS n FROM admin_log' + where, args);
  const rows = await db.all('SELECT id, user_name, action, target, detail, created_at FROM admin_log' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?', args.concat([size, (page - 1) * size]));
  sendJSON(ctx.res, 200, { total: Number(total.n), page, size, entries: rows.map((r) => ({ id: r.id, who: r.user_name, action: r.action, target: r.target, detail: r.detail, at: Number(r.created_at) })) });
}

async function settingsGet(ctx) { sendJSON(ctx.res, 200, { settings: await siteSettings() }); }

async function settingsPut(ctx) {
  const b = await readJSON(ctx.req);
  const all = await kvGet('site_settings', {});
  if (b.announcement) {
    const a = b.announcement;
    const link = String(a.link || '').trim();
    if (link && !/^(https:\/\/|\/)/i.test(link)) return sendJSON(ctx.res, 400, { error: 'The link must start with https:// or /' });
    all.announcement = {
      enabled: !!a.enabled, text: String(a.text || '').trim().slice(0, 300), link, linkText: String(a.linkText || '').trim().slice(0, 40),
      tone: ['info', 'success', 'warning'].includes(a.tone) ? a.tone : 'info'
    };
  }
  await kvSet('site_settings', all);
  await audit(ctx.user, 'settings.update', 'site', Object.keys(b).join(', '));
  sendJSON(ctx.res, 200, { ok: true, settings: await siteSettings() });
}

// A JSON copy of everything the admin panel manages (not the uploaded files' bytes, not user passwords).
async function backup(ctx) {
  const tables = {
    categories: 'SELECT * FROM categories', tags: 'SELECT * FROM tags', book_categories: 'SELECT * FROM book_categories', book_tags: 'SELECT * FROM book_tags',
    book_state: 'SELECT * FROM book_state', book_docs: 'SELECT * FROM book_docs', book_chapters: 'SELECT * FROM book_chapters ORDER BY book_file, pos',
    media: 'SELECT id, name, kind, mime, size, url, alt, folder, created_at FROM media', gita_patches: 'SELECT * FROM gita_patches',
    users: 'SELECT id, name, email, role, status, created_at, last_login_at FROM users', kv: 'SELECT * FROM kv'
  };
  const out = { exportedAt: new Date().toISOString(), tables: {} };
  for (const name of Object.keys(tables)) out.tables[name] = (await db.all(tables[name])).map((r) => Object.assign({}, r));
  await audit(ctx.user, 'backup.download', '', '');
  ctx.res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Disposition': 'attachment; filename="kalyan-admin-backup-' + new Date().toISOString().slice(0, 10) + '.json"'
  });
  ctx.res.end(JSON.stringify(out));
}

/** Returns true when the request was answered. */
async function handle(req, res, pathname, user) {
  const ctx = { req, res, pathname, method: req.method, user };
  if (ctx.method === 'GET' && pathname === '/api/admin/dashboard') { await dashboard(ctx); return true; }
  if (ctx.method === 'GET' && pathname === '/api/admin/log') { await logList(ctx); return true; }
  if (pathname === '/api/admin/settings') {
    if (ctx.method === 'GET') { await settingsGet(ctx); return true; }
    if (ctx.method === 'PUT') { await settingsPut(ctx); return true; }
  }
  if (ctx.method === 'GET' && pathname === '/api/admin/backup') { await backup(ctx); return true; }
  for (const mod of [books, categories, media, audio, css, people, lms]) {
    if (await mod.handle(ctx)) return true;
  }
  return false;
}

module.exports = { handle };

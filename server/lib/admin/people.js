// Admin: users and comment moderation.
const db = require('../db');
const books = require('./books');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, num } = require('./common');

// ------------------------------------------------------------------ users

async function listUsers(ctx) {
  const q = queryOf(ctx.req);
  const text = (q.get('q') || '').trim().toLowerCase(), role = (q.get('role') || '').trim(), status = (q.get('status') || '').trim();
  const where = [], args = [];
  if (text) { where.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)'); args.push('%' + text + '%', '%' + text + '%'); }
  if (role) { where.push('u.role = ?'); args.push(role); }
  if (status) { where.push('u.status = ?'); args.push(status); }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const size = Math.min(200, Math.max(5, num(q.get('size'), 50)));
  const page = Math.max(1, num(q.get('page'), 1));
  const total = await db.get('SELECT COUNT(*) AS n FROM users u' + w, args);
  const rows = await db.all(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.avatar_url, u.google_id, u.created_at, u.last_login_at,
            (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comments,
            (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS reads,
            (SELECT COUNT(*) FROM gita_lms g WHERE g.user_id = u.id) AS lms
     FROM users u` + w + ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?', args.concat([size, (page - 1) * size]));
  sendJSON(ctx.res, 200, {
    total: Number(total.n), page, size,
    users: rows.map((r) => ({
      id: r.id, name: r.name, email: r.email, role: r.role, status: r.status || 'active', avatarUrl: r.avatar_url, google: !!r.google_id,
      createdAt: Number(r.created_at), lastLoginAt: Number(r.last_login_at) || 0,
      comments: Number(r.comments), reads: Number(r.reads), lms: Number(r.lms) > 0
    }))
  });
}

async function userDetail(ctx, id) {
  const u = await db.get('SELECT id, name, email, role, status, google_id, created_at, last_login_at FROM users WHERE id = ?', [id]);
  if (!u) return sendJSON(ctx.res, 404, { error: 'User not found' });
  const [progress, comments, sessions] = await Promise.all([
    db.all('SELECT book_file, progress_pct, last_opened_at FROM progress WHERE user_id = ? ORDER BY last_opened_at DESC LIMIT 30', [id]),
    db.all('SELECT id, book_file, text, status, created_at FROM comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [id]),
    db.get('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at >= ?', [id, Date.now()])
  ]);
  const titles = await titleMap();
  sendJSON(ctx.res, 200, {
    user: { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status || 'active', google: !!u.google_id, createdAt: Number(u.created_at), lastLoginAt: Number(u.last_login_at) || 0 },
    activeSessions: Number(sessions.n),
    progress: progress.map((p) => ({ file: p.book_file, title: titles[p.book_file] || p.book_file, pct: Number(p.progress_pct), at: Number(p.last_opened_at) || 0 })),
    comments: comments.map((c) => ({ id: c.id, file: c.book_file, title: titles[c.book_file] || c.book_file, text: c.text, status: c.status, at: Number(c.created_at) }))
  });
}

async function titleMap() {
  const map = {};
  (await books.allBooks()).forEach((b) => { map[b.file] = b.title; });
  return map;
}

async function updateUser(ctx, id) {
  const u = await db.get('SELECT id, role, status FROM users WHERE id = ?', [id]);
  if (!u) return sendJSON(ctx.res, 404, { error: 'User not found' });
  const b = await readJSON(ctx.req);
  const self = id === ctx.user.id;
  if (b.role !== undefined) {
    const role = b.role === 'admin' ? 'admin' : 'user';
    if (self && role !== 'admin') return sendJSON(ctx.res, 400, { error: 'You cannot remove your own admin access' });
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  }
  if (b.status !== undefined) {
    const status = b.status === 'suspended' ? 'suspended' : 'active';
    if (self && status === 'suspended') return sendJSON(ctx.res, 400, { error: 'You cannot suspend yourself' });
    await db.run('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    if (status === 'suspended') await db.run('DELETE FROM sessions WHERE user_id = ?', [id]);
  }
  if (b.name !== undefined) {
    const name = String(b.name).trim().slice(0, 120);
    if (!name) return sendJSON(ctx.res, 400, { error: 'A name is required' });
    await db.run('UPDATE users SET name = ? WHERE id = ?', [name, id]);
  }
  await audit(ctx.user, 'user.update', String(id), Object.keys(b).map((k) => k + '=' + b[k]).join(', '));
  sendJSON(ctx.res, 200, { ok: true });
}

async function signOutUser(ctx, id) {
  await db.run('DELETE FROM sessions WHERE user_id = ?', [id]);
  await audit(ctx.user, 'user.signout', String(id), 'all sessions ended');
  sendJSON(ctx.res, 200, { ok: true });
}

async function deleteUser(ctx, id) {
  if (id === ctx.user.id) return sendJSON(ctx.res, 400, { error: 'You cannot delete your own account here' });
  const u = await db.get('SELECT id, email, role FROM users WHERE id = ?', [id]);
  if (!u) return sendJSON(ctx.res, 404, { error: 'User not found' });
  await db.getClient().batch([
    { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM progress WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM comments WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM gita_lms WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM users WHERE id = ?', args: [id] }
  ], 'write');
  await audit(ctx.user, 'user.delete', u.email, 'account and its data removed');
  sendJSON(ctx.res, 200, { ok: true });
}

// ------------------------------------------------------------------ comments

async function listComments(ctx) {
  const q = queryOf(ctx.req);
  const status = (q.get('status') || '').trim(), text = (q.get('q') || '').trim().toLowerCase();
  const where = [], args = [];
  if (status === 'visible' || status === 'hidden') { where.push('c.status = ?'); args.push(status); }
  if (text) { where.push('(LOWER(c.text) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(c.book_file) LIKE ?)'); args.push('%' + text + '%', '%' + text + '%', '%' + text + '%'); }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const size = Math.min(200, Math.max(5, num(q.get('size'), 50)));
  const page = Math.max(1, num(q.get('page'), 1));
  const total = await db.get('SELECT COUNT(*) AS n FROM comments c JOIN users u ON u.id = c.user_id' + w, args);
  const rows = await db.all(
    `SELECT c.id, c.book_file, c.text, c.status, c.created_at, c.user_id, u.name AS author, u.email
     FROM comments c JOIN users u ON u.id = c.user_id` + w + ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?', args.concat([size, (page - 1) * size]));
  const titles = await titleMap();
  sendJSON(ctx.res, 200, {
    total: Number(total.n), page, size,
    comments: rows.map((r) => ({ id: r.id, file: r.book_file, title: titles[r.book_file] || r.book_file, text: r.text, status: r.status, at: Number(r.created_at), userId: r.user_id, author: r.author, email: r.email }))
  });
}

async function setCommentStatus(ctx, id) {
  const b = await readJSON(ctx.req);
  const status = b.status === 'hidden' ? 'hidden' : 'visible';
  if (!(await db.get('SELECT id FROM comments WHERE id = ?', [id]))) return sendJSON(ctx.res, 404, { error: 'Comment not found' });
  await db.run('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
  await audit(ctx.user, 'comment.' + status, String(id), '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function deleteComment(ctx, id) {
  await db.run('DELETE FROM comments WHERE id = ?', [id]);
  await audit(ctx.user, 'comment.delete', String(id), '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function bulkComments(ctx) {
  const b = await readJSON(ctx.req);
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Number.isFinite).slice(0, 500);
  if (!ids.length) return sendJSON(ctx.res, 400, { error: 'Nothing selected' });
  const marks = ids.map(() => '?').join(',');
  if (b.action === 'delete') await db.run('DELETE FROM comments WHERE id IN (' + marks + ')', ids);
  else if (b.action === 'hide' || b.action === 'show') await db.run('UPDATE comments SET status = ? WHERE id IN (' + marks + ')', [b.action === 'hide' ? 'hidden' : 'visible'].concat(ids));
  else return sendJSON(ctx.res, 400, { error: 'Unknown action' });
  await audit(ctx.user, 'comment.bulk.' + b.action, ids.length + ' comments', '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  if (method === 'GET' && pathname === '/api/admin/users') { await listUsers(ctx); return true; }
  let m = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (method === 'GET') { await userDetail(ctx, id); return true; }
    if (method === 'PATCH') { await updateUser(ctx, id); return true; }
    if (method === 'DELETE') { await deleteUser(ctx, id); return true; }
  }
  m = pathname.match(/^\/api\/admin\/users\/(\d+)\/(role|signout)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (m[2] === 'role' && method === 'PATCH') { await updateUser(ctx, id); return true; }   // kept for the old panel's route
    if (m[2] === 'signout' && method === 'POST') { await signOutUser(ctx, id); return true; }
  }
  if (method === 'GET' && pathname === '/api/admin/comments') { await listComments(ctx); return true; }
  if (method === 'POST' && pathname === '/api/admin/comments/bulk') { await bulkComments(ctx); return true; }
  m = pathname.match(/^\/api\/admin\/comments\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (method === 'PATCH') { await setCommentStatus(ctx, id); return true; }
    if (method === 'DELETE') { await deleteComment(ctx, id); return true; }
  }
  return false;
}

module.exports = { handle };

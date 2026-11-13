// Admin: chat questions the books could not answer (to review and work out), plus the answer cache.
const db = require('../db');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, num } = require('./common');

const STATUSES = ['new', 'working', 'done'];

function parseTitles(s) { try { const a = JSON.parse(s); return Array.isArray(a) ? a.map((x) => (typeof x === 'string' ? x : x && x.title)).filter(Boolean) : []; } catch (e) { return []; } }

async function list(ctx) {
  const q = queryOf(ctx.req);
  const status = STATUSES.includes(q.get('status')) ? q.get('status') : '';
  const text = (q.get('q') || '').trim().toLowerCase();
  const size = Math.min(200, Math.max(10, num(q.get('size'), 40))), page = Math.max(1, num(q.get('page'), 1));
  const where = [], args = [];
  if (status) { where.push('status = ?'); args.push(status); }
  if (text) { where.push('(LOWER(question) LIKE ? OR LOWER(note) LIKE ?)'); args.push('%' + text + '%', '%' + text + '%'); }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [total, byStatus, rows, cache, top] = await Promise.all([
    db.get('SELECT COUNT(*) AS n FROM chat_unanswered' + w, args),
    db.all('SELECT status, COUNT(*) AS n FROM chat_unanswered GROUP BY status'),
    db.all('SELECT id, question, answer, sources, times, status, note, first_at, last_at FROM chat_unanswered' + w + ' ORDER BY (status = \'done\'), last_at DESC LIMIT ? OFFSET ?', args.concat([size, (page - 1) * size])),
    db.get('SELECT COUNT(*) AS n, COALESCE(SUM(hits), 0) AS hits FROM chat_cache'),
    db.all('SELECT qkey, question, hits, created_at, last_hit_at FROM chat_cache ORDER BY hits DESC, created_at DESC LIMIT 15')
  ]);
  const counts = { new: 0, working: 0, done: 0 };
  byStatus.forEach((r) => { counts[r.status] = Number(r.n); });
  sendJSON(ctx.res, 200, {
    total: Number(total.n), page, size, counts,
    questions: rows.map((r) => ({ id: r.id, question: r.question, answer: r.answer, books: parseTitles(r.sources), times: Number(r.times), status: r.status, note: r.note, first: Number(r.first_at), last: Number(r.last_at) })),
    cache: { entries: Number(cache.n), hits: Number(cache.hits), top: top.map((r) => ({ key: r.qkey, question: r.question, hits: Number(r.hits), at: Number(r.created_at), lastHit: Number(r.last_hit_at) })) }
  });
}

async function update(ctx, id) {
  const b = await readJSON(ctx.req);
  if (!(await db.get('SELECT id FROM chat_unanswered WHERE id = ?', [id]))) return sendJSON(ctx.res, 404, { error: 'Question not found' });
  const sets = [], args = [];
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return sendJSON(ctx.res, 400, { error: 'Unknown status' });
    sets.push('status = ?'); args.push(b.status);
  }
  if (b.note !== undefined) { sets.push('note = ?'); args.push(String(b.note).slice(0, 2000)); }
  if (!sets.length) return sendJSON(ctx.res, 400, { error: 'Nothing to change' });
  await db.run('UPDATE chat_unanswered SET ' + sets.join(', ') + ' WHERE id = ?', args.concat([id]));
  sendJSON(ctx.res, 200, { ok: true });
}

async function remove(ctx, id) {
  await db.run('DELETE FROM chat_unanswered WHERE id = ?', [id]);
  await audit(ctx.user, 'chatq.delete', '#' + id, '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function removeCached(ctx, key) {
  await db.run('DELETE FROM chat_cache WHERE qkey = ?', [key]);
  await audit(ctx.user, 'chatcache.delete', key, '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function clearCache(ctx) {
  const n = await db.get('SELECT COUNT(*) AS n FROM chat_cache');
  await db.run('DELETE FROM chat_cache');
  await audit(ctx.user, 'chatcache.clear', Number(n.n) + ' answers', '');
  sendJSON(ctx.res, 200, { ok: true, removed: Number(n.n) });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  if (method === 'GET' && pathname === '/api/admin/questions') { await list(ctx); return true; }
  if (method === 'POST' && pathname === '/api/admin/questions/cache/clear') { await clearCache(ctx); return true; }
  let m = pathname.match(/^\/api\/admin\/questions\/cache\/([0-9a-f]{40})$/);
  if (m && method === 'DELETE') { await removeCached(ctx, m[1]); return true; }
  m = pathname.match(/^\/api\/admin\/questions\/(\d+)$/);
  if (m && method === 'PATCH') { await update(ctx, Number(m[1])); return true; }
  if (m && method === 'DELETE') { await remove(ctx, Number(m[1])); return true; }
  return false;
}

module.exports = { handle };

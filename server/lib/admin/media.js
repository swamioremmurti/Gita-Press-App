// Admin: media library.
//
// Uploaded files are kept in the database (table `media`) so they work the same on a laptop and on Vercel, whose disk is
// read-only. A function request body is limited to about 4.5 MB, so uploads are capped at MAX_UPLOAD; larger audio/video
// should be hosted elsewhere (the CDN) and added here as a link. The files that ship with the site (assets/...) can be
// browsed read-only in the "Site files" tab.
const fs = require('fs');
const path = require('path');
const db = require('../db');
const bd = require('../bookdoc');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, num } = require('./common');

const MAX_UPLOAD = 3 * 1024 * 1024;
const TYPES = {
  'image/png': ['image', '.png'], 'image/jpeg': ['image', '.jpg'], 'image/webp': ['image', '.webp'], 'image/gif': ['image', '.gif'],
  'audio/mpeg': ['audio', '.mp3'], 'audio/mp4': ['audio', '.m4a'], 'audio/ogg': ['audio', '.ogg'], 'audio/wav': ['audio', '.wav'],
  'application/pdf': ['document', '.pdf']
};
const KINDS = ['image', 'audio', 'video', 'document', 'other'];

function publicUrl(row) {
  if (row.url) return row.url;
  return '/api/media/' + row.id + '/' + encodeURIComponent(row.name);
}

function shape(r) {
  return {
    id: Number(r.id), name: r.name, kind: r.kind, mime: r.mime, size: Number(r.size), alt: r.alt, folder: r.folder,
    external: !!r.url, url: publicUrl(r), createdAt: Number(r.created_at)
  };
}

async function list(ctx) {
  const q = queryOf(ctx.req);
  const kind = (q.get('kind') || '').trim(), text = (q.get('q') || '').trim().toLowerCase(), folder = q.get('folder');
  const where = [], args = [];
  if (kind) { where.push('kind = ?'); args.push(kind); }
  if (folder != null && folder !== '') { where.push('folder = ?'); args.push(folder); }
  if (text) { where.push('(LOWER(name) LIKE ? OR LOWER(alt) LIKE ?)'); args.push('%' + text + '%', '%' + text + '%'); }
  const size = Math.min(120, Math.max(6, num(q.get('size'), 48)));
  const page = Math.max(1, num(q.get('page'), 1));
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const total = await db.get('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM media' + w, args);
  const rows = await db.all('SELECT id, name, kind, mime, size, url, alt, folder, created_at FROM media' + w + ' ORDER BY id DESC LIMIT ? OFFSET ?',
    args.concat([size, (page - 1) * size]));
  const folders = await db.all("SELECT DISTINCT folder FROM media WHERE folder <> '' ORDER BY folder");
  sendJSON(ctx.res, 200, { total: Number(total.n), bytes: Number(total.bytes), page, size, items: rows.map(shape), folders: folders.map((f) => f.folder) });
}

function safeName(name, ext) {
  let n = String(name || 'file').replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file';
  if (ext && !n.toLowerCase().endsWith(ext)) n += ext;
  return n;
}

async function upload(ctx) {
  const b = await readJSON(ctx.req, 4.4 * 1024 * 1024);
  const mime = String(b.mime || '').toLowerCase();
  const type = TYPES[mime];
  if (!type) return sendJSON(ctx.res, 400, { error: 'Unsupported file type (' + (mime || 'unknown') + '). Allowed: PNG, JPEG, WebP, GIF, MP3, M4A, OGG, WAV, PDF.' });
  let data = String(b.data || '');
  const m = data.match(/^data:[^;]*;base64,(.*)$/s);
  if (m) data = m[1];
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length) return sendJSON(ctx.res, 400, { error: 'The file is empty' });
  if (bytes.length > MAX_UPLOAD) return sendJSON(ctx.res, 413, { error: 'The file is larger than ' + (MAX_UPLOAD / 1048576) + ' MB. Host it elsewhere and add it as a link.' });
  const name = safeName(b.name, type[1]);
  await db.run('INSERT INTO media (name, kind, mime, size, data, alt, folder, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, type[0], mime, bytes.length, bytes, String(b.alt || '').slice(0, 300), String(b.folder || '').trim().slice(0, 60), ctx.user.id, Date.now()]);
  const id = db.lastInsertId();
  await audit(ctx.user, 'media.upload', name, bytes.length + ' bytes');
  const row = await db.get('SELECT id, name, kind, mime, size, url, alt, folder, created_at FROM media WHERE id = ?', [id]);
  sendJSON(ctx.res, 200, { ok: true, item: shape(row) });
}

async function addLink(ctx) {
  const b = await readJSON(ctx.req);
  const url = String(b.url || '').trim();
  if (!/^https:\/\/[^\s]+$/i.test(url) && !/^\/[^\s/][^\s]*$/.test(url)) return sendJSON(ctx.res, 400, { error: 'Enter an https:// address, or a site path starting with /' });
  const kind = KINDS.includes(b.kind) ? b.kind : 'other';
  const name = safeName(b.name || decodeURIComponent(url.split('?')[0].split('/').pop() || 'link'), '');
  await db.run('INSERT INTO media (name, kind, mime, size, url, alt, folder, user_id, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)',
    [name, kind, String(b.mime || ''), url, String(b.alt || '').slice(0, 300), String(b.folder || '').trim().slice(0, 60), ctx.user.id, Date.now()]);
  await audit(ctx.user, 'media.link', name, url);
  sendJSON(ctx.res, 200, { ok: true, id: db.lastInsertId() });
}

async function update(ctx, id) {
  const b = await readJSON(ctx.req);
  const sets = [], args = [];
  if (b.name !== undefined) { sets.push('name = ?'); args.push(safeName(b.name, '')); }
  if (b.alt !== undefined) { sets.push('alt = ?'); args.push(String(b.alt).slice(0, 300)); }
  if (b.folder !== undefined) { sets.push('folder = ?'); args.push(String(b.folder).trim().slice(0, 60)); }
  if (!sets.length) return sendJSON(ctx.res, 400, { error: 'Nothing to update' });
  args.push(id);
  await db.run('UPDATE media SET ' + sets.join(', ') + ' WHERE id = ?', args);
  await audit(ctx.user, 'media.update', String(id), Object.keys(b).join(', '));
  sendJSON(ctx.res, 200, { ok: true });
}

async function remove(ctx, id) {
  const row = await db.get('SELECT name FROM media WHERE id = ?', [id]);
  if (!row) return sendJSON(ctx.res, 404, { error: 'File not found' });
  await db.run('DELETE FROM media WHERE id = ?', [id]);
  await audit(ctx.user, 'media.delete', row.name, '');
  sendJSON(ctx.res, 200, { ok: true });
}

// ---- read-only browser of the files that ship with the site (works where the files are on disk: the local server)
const SITE_DIRS = ['assets', 'Gita Press Books/Gita Press Books/image'];
const KIND_BY_EXT = { '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image', '.svg': 'image', '.mp3': 'audio', '.m4a': 'audio', '.wav': 'audio', '.ogg': 'audio', '.mp4': 'video', '.webm': 'video', '.pdf': 'document' };

async function siteFiles(ctx) {
  const rel = (queryOf(ctx.req).get('dir') || 'assets').split('\\').join('/').replace(/^\/+|\/+$/g, '');
  if (rel.includes('..') || !SITE_DIRS.some((d) => rel === d || rel.startsWith(d + '/'))) return sendJSON(ctx.res, 400, { error: 'That folder cannot be browsed' });
  const abs = path.join(bd.PROJECT_ROOT, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return sendJSON(ctx.res, 200, { dir: rel, available: false, roots: SITE_DIRS, entries: [], note: 'The site files are not on this server. Open the admin panel from the local server to browse them.' });
  }
  const entries = fs.readdirSync(abs, { withFileTypes: true }).slice(0, 2000).map((e) => {
    const full = path.join(abs, e.name);
    let size = 0, mtime = 0;
    try { const st = fs.statSync(full); size = st.size; mtime = st.mtimeMs; } catch (err) { /* unreadable entry */ }
    const kind = e.isDirectory() ? 'folder' : (KIND_BY_EXT[path.extname(e.name).toLowerCase()] || 'other');
    return { name: e.name, kind, size, mtime, url: e.isDirectory() ? '' : '/' + rel.split('/').map(encodeURIComponent).join('/') + '/' + encodeURIComponent(e.name) };
  }).sort((a, b) => (a.kind === 'folder' ? 0 : 1) - (b.kind === 'folder' ? 0 : 1) || a.name.localeCompare(b.name));
  sendJSON(ctx.res, 200, { dir: rel, available: true, roots: SITE_DIRS, entries });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  if (pathname === '/api/admin/media') {
    if (method === 'GET') { await list(ctx); return true; }
    if (method === 'POST') { await upload(ctx); return true; }
  }
  if (method === 'POST' && pathname === '/api/admin/media/link') { await addLink(ctx); return true; }
  if (method === 'GET' && pathname === '/api/admin/media/site') { await siteFiles(ctx); return true; }
  const m = pathname.match(/^\/api\/admin\/media\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (method === 'PATCH') { await update(ctx, id); return true; }
    if (method === 'DELETE') { await remove(ctx, id); return true; }
  }
  return false;
}

/** Public: GET /api/media/:id[/name] -- the bytes (with Range support for audio), or a redirect for a linked file. */
async function serve(req, res, id) {
  const row = await db.get('SELECT name, mime, url, data FROM media WHERE id = ?', [id]);
  if (!row) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  if (row.url) { res.writeHead(302, { Location: row.url, 'Cache-Control': 'public, max-age=300' }); res.end(); return; }
  const buf = Buffer.from(row.data);
  const headers = {
    'Content-Type': row.mime || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox", 'Accept-Ranges': 'bytes'
  };
  const range = (req.headers.range || '').match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? parseInt(range[1], 10) : buf.length - parseInt(range[2], 10);
    let end = range[1] && range[2] ? parseInt(range[2], 10) : buf.length - 1;
    start = Math.max(0, start); end = Math.min(buf.length - 1, end);
    if (start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + buf.length }); res.end(); return; }
    res.writeHead(206, Object.assign(headers, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.length, 'Content-Length': end - start + 1 }));
    res.end(buf.subarray(start, end + 1));
    return;
  }
  res.writeHead(200, Object.assign(headers, { 'Content-Length': buf.length }));
  res.end(req.method === 'HEAD' ? undefined : buf);
}

module.exports = { handle, serve };

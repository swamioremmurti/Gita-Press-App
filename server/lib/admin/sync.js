// Admin: move edits between two copies of the site (for example the live site and a laptop) through a file.
// The browser does the carrying, so no server needs the other one's password:
//   Export: the browser asks this server for a manifest and then for each item, and saves them as one file.
//   Import: the browser loads such a file, asks this server which items are new or different (plan), and sends the chosen ones (apply).
// An "item" is one thing that can be copied on its own:
//   book:<file>   the text of a book edited in the panel (all chapters, streamed in pages)
//   state:<file>  that book's switches, title/people overrides, categories and tags
//   categories    the category list         kv:<key>  audio library / CSS / site notice      gita  Gita lesson corrections
//   media:<id>    an uploaded file (same id on both sides, or it is reported as a conflict instead of overwritten)
// Copies add and update; they never delete anything on the receiving side. Administrators only.
const crypto = require('crypto');
const db = require('../db');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, batchInChunks } = require('./common');

const KV_KEYS = ['site_settings', 'audio_state', 'custom_css'];
const PAGE_BYTES = 1500000;          // one transfer page of chapter text (Vercel accepts ~4.5 MB bodies)
const STAGE = '\u0001sync\u0001';    // chapters are staged under this prefix and swapped in at the end, so a cut-off copy never shows half a book
const MAX_MEDIA = 3 * 1024 * 1024;

const sha = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);
const num = (v) => Number(v) || 0;

/* ------------------------------------------------------------------ describing what exists here */
async function stateParts(file) {
  const [st, cats, tags] = await Promise.all([
    db.get('SELECT enabled, featured, overrides, updated_at FROM book_state WHERE book_file = ?', [file]),
    db.all('SELECT category_key FROM book_categories WHERE book_file = ? ORDER BY category_key', [file]),
    db.all('SELECT t.label FROM book_tags bt JOIN tags t ON t.id = bt.tag_id WHERE bt.book_file = ? ORDER BY t.label', [file])
  ]);
  if (!st && !cats.length && !tags.length) return null;
  return {
    enabled: st ? num(st.enabled) : 1, featured: st ? num(st.featured) : 0, overrides: st ? st.overrides : '{}', updatedAt: st ? num(st.updated_at) : 0,
    categories: cats.map((r) => r.category_key), tags: tags.map((r) => r.label)
  };
}
const stateFp = (p) => sha(JSON.stringify([p.enabled, p.featured, p.overrides, p.categories, p.tags]));

async function categoryRows() {
  return (await db.all('SELECT key, hi, en, icon, sort_order, hidden, edited FROM categories ORDER BY key')).map((r) => ({
    key: r.key, hi: r.hi, en: r.en, icon: r.icon, sort_order: num(r.sort_order), hidden: num(r.hidden), edited: num(r.edited)
  }));
}
async function gitaRows() {
  return (await db.all('SELECT ch, v, patch, updated_at FROM gita_patches ORDER BY ch, v')).map((r) => ({ ch: num(r.ch), v: String(r.v), patch: r.patch, updated_at: num(r.updated_at) }));
}

async function manifest() {
  const items = [];
  const [docs, chap, states, cats, kvs, gita, media] = await Promise.all([
    db.all('SELECT book_file, origin, updated_at FROM book_docs WHERE updated_at > 0'),
    db.all('SELECT book_file, COUNT(*) AS n, COALESCE(SUM(size), 0) AS s FROM book_chapters GROUP BY book_file'),
    db.all('SELECT book_file, updated_at FROM book_state'),
    categoryRows(),
    db.all('SELECT key, value FROM kv WHERE key IN (' + KV_KEYS.map(() => '?').join(',') + ')', KV_KEYS),
    gitaRows(),
    db.all('SELECT id, name, kind, size, created_at, url FROM media ORDER BY id')
  ]);
  const chapBy = {};
  chap.forEach((r) => { chapBy[r.book_file] = { n: num(r.n), s: num(r.s) }; });
  docs.forEach((d) => {
    const c = chapBy[d.book_file] || { n: 0, s: 0 };
    items.push({ id: 'book:' + d.book_file, area: 'books', label: d.book_file.replace(/\.html$/i, ''), fp: num(d.updated_at) + ':' + c.n + ':' + c.s, updated: num(d.updated_at), info: c.n + ' chapters' });
  });
  // settings / categories / tags of the books changed in the panel (a book_state row is written by every such change;
  // the default categories every book gets from the first import are not listed)
  for (const r of states) {
    const p = await stateParts(r.book_file);
    if (p) items.push({ id: 'state:' + r.book_file, area: 'settings', label: r.book_file.replace(/\.html$/i, ''), fp: stateFp(p), updated: p.updatedAt, info: 'switches, title/people, categories, tags' });
  }
  if (cats.length) items.push({ id: 'categories', area: 'categories', label: 'Category list', fp: sha(JSON.stringify(cats)), updated: 0, info: cats.length + ' categories' });
  kvs.forEach((r) => items.push({ id: 'kv:' + r.key, area: 'site', label: { site_settings: 'Site notice and course switch', audio_state: 'Audio library changes', custom_css: 'Custom CSS' }[r.key] || r.key, fp: sha(r.value), updated: 0, info: Math.round(String(r.value).length / 1024 * 10) / 10 + ' KB' }));
  if (gita.length) items.push({ id: 'gita', area: 'site', label: 'Gita lesson corrections', fp: sha(JSON.stringify(gita)), updated: gita.reduce((m, r) => Math.max(m, r.updated_at), 0), info: gita.length + ' shlokas' });
  media.forEach((m) => items.push({ id: 'media:' + m.id, area: 'media', label: m.name, fp: [m.size, m.created_at, m.name].join(':'), updated: num(m.created_at), info: (m.url ? 'link' : Math.round(num(m.size) / 1024) + ' KB') + ' · #' + m.id }));
  return items;
}

/* ------------------------------------------------------------------ reading one item (export) */
async function readItem(id, after) {
  if (id.startsWith('book:')) {
    const file = id.slice(5);
    const doc = await db.get('SELECT origin, prefix, suffix, updated_at FROM book_docs WHERE book_file = ? AND updated_at > 0', [file]);
    if (!doc) return null;
    const rows = await db.all('SELECT pos, title, size, html, updated_at FROM book_chapters WHERE book_file = ? AND pos > ? ORDER BY pos LIMIT 400', [file, after]);
    const chapters = [];
    let bytes = 0, last = after, more = false;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], len = Buffer.byteLength(r.html || '');
      if (chapters.length && bytes + len > PAGE_BYTES) { more = true; break; }
      chapters.push({ pos: num(r.pos), title: r.title, size: num(r.size), html: r.html, updated_at: num(r.updated_at) });
      bytes += len; last = num(r.pos);
    }
    if (!more && rows.length === 400) more = true;
    return { file, doc: after < 0 ? { origin: doc.origin, prefix: doc.prefix, suffix: doc.suffix, updated_at: num(doc.updated_at) } : undefined, chapters, next: more ? last : null };
  }
  if (id.startsWith('state:')) { const p = await stateParts(id.slice(6)); return p && { file: id.slice(6), state: p }; }
  if (id === 'categories') return { rows: await categoryRows() };
  if (id.startsWith('kv:')) {
    const key = id.slice(3);
    if (!KV_KEYS.includes(key)) return null;
    const r = await db.get('SELECT value FROM kv WHERE key = ?', [key]);
    return r ? { key, value: r.value } : null;
  }
  if (id === 'gita') return { rows: await gitaRows() };
  if (id.startsWith('media:')) {
    const r = await db.get('SELECT id, name, kind, mime, size, url, data, alt, folder, created_at FROM media WHERE id = ?', [num(id.slice(6))]);
    if (!r) return null;
    return { media: { id: num(r.id), name: r.name, kind: r.kind, mime: r.mime, size: num(r.size), url: r.url, alt: r.alt, folder: r.folder, created_at: num(r.created_at), data: r.data ? Buffer.from(r.data).toString('base64') : null } };
  }
  return null;
}

/* ------------------------------------------------------------------ writing one item (import) */
async function applySmall(id, data, user) {
  if (id.startsWith('state:')) {
    const file = id.slice(6), p = data.state || {};
    if (!file || typeof p !== 'object') throw new Error('Bad settings item');
    const stmts = [
      { sql: `INSERT INTO book_state (book_file, enabled, featured, overrides, updated_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(book_file) DO UPDATE SET enabled = excluded.enabled, featured = excluded.featured, overrides = excluded.overrides, updated_at = excluded.updated_at`,
        args: [file, num(p.enabled), num(p.featured), String(p.overrides || '{}'), num(p.updatedAt) || Date.now()] },
      { sql: 'DELETE FROM book_categories WHERE book_file = ?', args: [file] },
      { sql: 'DELETE FROM book_tags WHERE book_file = ?', args: [file] }
    ];
    (p.categories || []).forEach((k) => stmts.push({ sql: 'INSERT OR IGNORE INTO book_categories (book_file, category_key) VALUES (?, ?)', args: [file, String(k)] }));
    for (const label of p.tags || []) {
      stmts.push({ sql: 'INSERT OR IGNORE INTO tags (label) VALUES (?)', args: [String(label)] });
      stmts.push({ sql: 'INSERT OR IGNORE INTO book_tags (book_file, tag_id) SELECT ?, id FROM tags WHERE label = ?', args: [file, String(label)] });
    }
    await db.getClient().batch(stmts, 'write');
  } else if (id === 'categories') {
    const stmts = (data.rows || []).map((r) => ({
      sql: `INSERT INTO categories (key, hi, en, icon, sort_order, hidden, edited) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET hi = excluded.hi, en = excluded.en, icon = excluded.icon, sort_order = excluded.sort_order, hidden = excluded.hidden, edited = excluded.edited`,
      args: [String(r.key), String(r.hi), String(r.en), String(r.icon || ''), num(r.sort_order), num(r.hidden), num(r.edited)]
    }));
    await batchInChunks(stmts, 40);
  } else if (id.startsWith('kv:')) {
    const key = id.slice(3);
    if (!KV_KEYS.includes(key)) throw new Error('Unknown setting');
    JSON.parse(String(data.value));    // refuse anything that is not valid JSON
    await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(data.value)]);
  } else if (id === 'gita') {
    const stmts = (data.rows || []).map((r) => ({
      sql: `INSERT INTO gita_patches (ch, v, patch, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(ch, v) DO UPDATE SET patch = excluded.patch, updated_at = excluded.updated_at`,
      args: [num(r.ch), String(r.v), String(r.patch), num(r.updated_at) || Date.now()]
    }));
    await batchInChunks(stmts, 40);
  } else if (id.startsWith('media:')) {
    const m = data.media || {};
    const mid = num(id.slice(6));
    if (!mid || num(m.id) !== mid) throw new Error('Bad media item');
    const have = await db.get('SELECT name, size, created_at FROM media WHERE id = ?', [mid]);
    if (have) {
      if (have.name === m.name && num(have.size) === num(m.size) && num(have.created_at) === num(m.created_at)) return { skipped: true };
      const e = new Error('A different file already uses media #' + mid + ' here, so it was not overwritten. Books that point to it would show the wrong file.'); e.conflict = true; throw e;
    }
    const bytes = m.data ? Buffer.from(String(m.data), 'base64') : null;
    if (bytes && bytes.length > MAX_MEDIA) throw new Error('File is larger than 3 MB');
    await db.run('INSERT INTO media (id, name, kind, mime, size, url, data, alt, folder, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [mid, String(m.name), String(m.kind || 'image'), String(m.mime || ''), num(m.size), m.url || null, bytes, String(m.alt || ''), String(m.folder || ''), user ? user.id : null, num(m.created_at) || Date.now()]);
  } else throw new Error('Unknown item');
  return {};
}

/** Book text arrives in steps: begin (clears the staging area), pages (any number), commit (swaps staged chapters in, in one transaction). */
async function applyBook(b, user) {
  const file = String(b.file || '');
  if (!file || file.length > 300) throw new Error('Bad book name');
  const stage = STAGE + file;
  if (b.step === 'begin') {
    await db.run('DELETE FROM book_chapters WHERE book_file = ?', [stage]);
    return {};
  }
  if (b.step === 'pages') {
    const stmts = (b.chapters || []).map((c) => ({
      sql: 'INSERT INTO book_chapters (book_file, pos, title, size, html, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [stage, num(c.pos), String(c.title || ''), num(c.size), String(c.html || ''), num(c.updated_at)]
    }));
    await batchInChunks(stmts, 20);
    return { added: stmts.length };
  }
  if (b.step === 'commit') {
    const d = b.doc || {};
    const staged = await db.get('SELECT COUNT(*) AS n FROM book_chapters WHERE book_file = ?', [stage]);
    if (num(staged.n) !== num(b.count)) throw new Error('The book arrived incomplete (' + num(staged.n) + ' of ' + num(b.count) + ' chapters). Nothing was changed; try again.');
    await db.getClient().batch([
      { sql: 'DELETE FROM book_chapters WHERE book_file = ?', args: [file] },
      { sql: 'UPDATE book_chapters SET book_file = ? WHERE book_file = ?', args: [file, stage] },
      { sql: `INSERT INTO book_docs (book_file, origin, prefix, suffix, updated_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(book_file) DO UPDATE SET origin = excluded.origin, prefix = excluded.prefix, suffix = excluded.suffix, updated_at = excluded.updated_at`,
        args: [file, String(d.origin || 'imported'), String(d.prefix || ''), String(d.suffix || ''), num(d.updated_at) || Date.now()] }
    ], 'write');
    return {};
  }
  throw new Error('Unknown step');
}

/* ------------------------------------------------------------------ routes */
async function handle(ctx) {
  const { req, res, pathname, method, user } = ctx;
  if (!pathname.startsWith('/api/admin/sync')) return false;
  if (user.role !== 'admin') { sendJSON(res, 403, { error: 'Only an administrator can copy data between sites.' }); return true; }
  try {
    if (method === 'GET' && pathname === '/api/admin/sync/manifest') {
      sendJSON(res, 200, { items: await manifest(), here: { origin: req.headers.host || '', database: process.env.TURSO_DATABASE_URL ? 'Live database' : 'Local file', at: Date.now() } });
      return true;
    }
    if (method === 'GET' && pathname === '/api/admin/sync/item') {
      const q = queryOf(req);
      const data = await readItem(String(q.get('id') || ''), q.get('after') === null ? -1 : num(q.get('after')));
      if (!data) { sendJSON(res, 404, { error: 'Not found' }); return true; }
      sendJSON(res, 200, data);
      return true;
    }
    if (method === 'POST' && pathname === '/api/admin/sync/plan') {
      const b = await readJSON(req);
      const mine = {};
      (await manifest()).forEach((i) => { mine[i.id] = i; });
      const out = (b.items || []).map((i) => {
        const m = mine[i.id];
        return { id: i.id, status: !m ? 'new' : m.fp === i.fp ? 'same' : 'differs', hereUpdated: m ? m.updated : 0, hereInfo: m ? m.info : '' };
      });
      sendJSON(res, 200, { items: out });
      return true;
    }
    if (method === 'POST' && pathname === '/api/admin/sync/apply') {
      const b = await readJSON(req, 4200000);
      const id = String(b.id || '');
      let r;
      if (id.startsWith('book:')) r = await applyBook(Object.assign({ file: id.slice(5) }, b), user);
      else r = await applySmall(id, b.data || {}, user);
      if (!b.step || b.step === 'commit') await audit(user, 'sync.apply', id, b.from ? 'from ' + String(b.from).slice(0, 200) : '');
      sendJSON(res, 200, Object.assign({ ok: true }, r));
      return true;
    }
  } catch (e) {
    sendJSON(res, e.conflict ? 409 : 400, { error: e.message || 'Sync failed' });
    return true;
  }
  return false;
}

module.exports = { handle };

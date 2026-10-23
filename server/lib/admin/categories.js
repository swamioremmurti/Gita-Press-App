// Admin: categories (the library's shelves). The database table is the source of truth; the browser merges it over the
// built-in list in swadhyay-app.js, so renaming, reordering, hiding and adding categories need no redeploy.
const db = require('../db');
const { sendJSON, readJSON } = require('../http');
const seo = require('../seo');
const { audit } = require('./common');

function keyFrom(en) {
  return String(en).trim().replace(/\s+/g, ' ').slice(0, 60);
}

async function list(ctx) {
  const rows = await db.all(
    `SELECT c.key, c.hi, c.en, c.icon, c.sort_order, c.hidden, c.edited,
            (SELECT COUNT(*) FROM book_categories bc WHERE bc.category_key = c.key) AS n
     FROM categories c ORDER BY c.sort_order, c.rowid`);
  // until the admin edits a category, the site shows the labels built into swadhyay-app.js -- show those here too
  const builtin = {};
  try { (await seo.loadCatalogue()).CATEGORY_META.forEach((c) => { builtin[c.key] = c; }); } catch (e) { /* labels from the database then */ }
  sendJSON(ctx.res, 200, {
    categories: rows.map((r) => {
      const b = Number(r.edited) !== 1 && builtin[r.key];
      return { key: r.key, hi: b ? b.hi : r.hi, en: b ? b.en : r.en, icon: b ? b.icon : r.icon, hidden: Number(r.hidden) === 1, edited: Number(r.edited) === 1, books: Number(r.n) };
    })
  });
}

async function create(ctx) {
  const b = await readJSON(ctx.req);
  const en = String(b.en || '').trim(), hi = String(b.hi || '').trim() || en;
  if (!en) return sendJSON(ctx.res, 400, { error: 'An English name is required' });
  const key = keyFrom(b.key || en);
  if (await db.get('SELECT key FROM categories WHERE key = ?', [key])) return sendJSON(ctx.res, 409, { error: 'A category with this key already exists' });
  const max = await db.get('SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories');
  await db.run('INSERT INTO categories (key, hi, en, icon, sort_order, hidden, edited) VALUES (?, ?, ?, ?, ?, 0, 1)',
    [key, hi, en, String(b.icon || '📖').trim().slice(0, 8), Number(max.m) + 1]);
  await audit(ctx.user, 'category.create', key, '');
  sendJSON(ctx.res, 200, { ok: true, key });
}

async function update(ctx, key) {
  const cur = await db.get('SELECT key, edited FROM categories WHERE key = ?', [key]);
  if (!cur) return sendJSON(ctx.res, 404, { error: 'Category not found' });
  const b = await readJSON(ctx.req);
  if (Number(cur.edited) !== 1 && (b.hi !== undefined || b.en !== undefined || b.icon !== undefined)) {
    // first edit of a built-in category: start from the labels the site shows now, so the untouched ones do not change
    try {
      const base = (await seo.loadCatalogue()).CATEGORY_META.find((c) => c.key === key);
      if (base) {
        if (b.hi === undefined) b.hi = base.hi;
        if (b.en === undefined) b.en = base.en;
        if (b.icon === undefined) b.icon = base.icon;
      }
    } catch (e) { /* keep what is in the database */ }
  }
  const sets = [], args = [];
  if (b.hi !== undefined || b.en !== undefined || b.icon !== undefined) sets.push('edited = 1');   // from now on the site shows these labels instead of the built-in ones
  if (b.hi !== undefined) { sets.push('hi = ?'); args.push(String(b.hi).trim() || key); }
  if (b.en !== undefined) { sets.push('en = ?'); args.push(String(b.en).trim() || key); }
  if (b.icon !== undefined) { sets.push('icon = ?'); args.push(String(b.icon).trim().slice(0, 8)); }
  if (b.hidden !== undefined) { sets.push('hidden = ?'); args.push(b.hidden ? 1 : 0); }
  if (!sets.length) return sendJSON(ctx.res, 400, { error: 'Nothing to update' });
  args.push(key);
  await db.run('UPDATE categories SET ' + sets.join(', ') + ' WHERE key = ?', args);
  await audit(ctx.user, 'category.update', key, Object.keys(b).join(', '));
  sendJSON(ctx.res, 200, { ok: true });
}

async function remove(ctx, key) {
  const b = await readJSON(ctx.req).catch(() => ({}));
  const cur = await db.get('SELECT key FROM categories WHERE key = ?', [key]);
  if (!cur) return sendJSON(ctx.res, 404, { error: 'Category not found' });
  const n = await db.get('SELECT COUNT(*) AS n FROM book_categories WHERE category_key = ?', [key]);
  let moveTo = b && b.moveTo ? String(b.moveTo) : '';
  if (Number(n.n) > 0) {
    if (!moveTo || moveTo === key || !(await db.get('SELECT key FROM categories WHERE key = ?', [moveTo]))) {
      return sendJSON(ctx.res, 400, { error: Number(n.n) + ' book(s) use this category. Choose another category to move them to.' });
    }
    await db.run('INSERT OR IGNORE INTO book_categories (book_file, category_key) SELECT book_file, ? FROM book_categories WHERE category_key = ?', [moveTo, key]);
  }
  await db.getClient().batch([
    { sql: 'DELETE FROM book_categories WHERE category_key = ?', args: [key] },
    { sql: 'DELETE FROM categories WHERE key = ?', args: [key] }
  ], 'write');
  await audit(ctx.user, 'category.delete', key, moveTo ? 'books moved to ' + moveTo : '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function reorder(ctx) {
  const b = await readJSON(ctx.req);
  const keys = Array.isArray(b.keys) ? b.keys.map(String) : [];
  if (!keys.length) return sendJSON(ctx.res, 400, { error: 'No order given' });
  await db.getClient().batch(keys.map((k, i) => ({ sql: 'UPDATE categories SET sort_order = ? WHERE key = ?', args: [i + 1, k] })), 'write');
  await audit(ctx.user, 'category.reorder', '', keys.length + ' categories');
  sendJSON(ctx.res, 200, { ok: true });
}

async function tags(ctx) {
  const rows = await db.all('SELECT t.id, t.label, COUNT(bt.book_file) AS n FROM tags t LEFT JOIN book_tags bt ON bt.tag_id = t.id GROUP BY t.id ORDER BY t.label');
  sendJSON(ctx.res, 200, { tags: rows.map((r) => ({ id: r.id, label: r.label, books: Number(r.n) })) });
}

async function tagUpdate(ctx, id) {
  const b = await readJSON(ctx.req);
  const label = String(b.label || '').trim();
  if (!label) return sendJSON(ctx.res, 400, { error: 'A tag needs a name' });
  const clash = await db.get('SELECT id FROM tags WHERE label = ? AND id <> ?', [label, id]);
  if (clash) {   // renaming onto an existing tag merges the two
    await db.run('INSERT OR IGNORE INTO book_tags (book_file, tag_id) SELECT book_file, ? FROM book_tags WHERE tag_id = ?', [clash.id, id]);
    await db.getClient().batch([{ sql: 'DELETE FROM book_tags WHERE tag_id = ?', args: [id] }, { sql: 'DELETE FROM tags WHERE id = ?', args: [id] }], 'write');
  } else await db.run('UPDATE tags SET label = ? WHERE id = ?', [label, id]);
  await audit(ctx.user, 'tag.rename', String(id), label);
  sendJSON(ctx.res, 200, { ok: true });
}

async function tagDelete(ctx, id) {
  await db.getClient().batch([{ sql: 'DELETE FROM book_tags WHERE tag_id = ?', args: [id] }, { sql: 'DELETE FROM tags WHERE id = ?', args: [id] }], 'write');
  await audit(ctx.user, 'tag.delete', String(id), '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  if (pathname === '/api/admin/categories') {
    if (method === 'GET') { await list(ctx); return true; }
    if (method === 'POST') { await create(ctx); return true; }
  }
  if (method === 'POST' && pathname === '/api/admin/categories/reorder') { await reorder(ctx); return true; }
  let m = pathname.match(/^\/api\/admin\/categories\/(.+)$/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    if (method === 'PATCH') { await update(ctx, key); return true; }
    if (method === 'DELETE') { await remove(ctx, key); return true; }
  }
  if (method === 'GET' && pathname === '/api/admin/tags') { await tags(ctx); return true; }
  m = pathname.match(/^\/api\/admin\/tags\/(\d+)$/);
  if (m && method === 'PATCH') { await tagUpdate(ctx, parseInt(m[1], 10)); return true; }
  if (m && method === 'DELETE') { await tagDelete(ctx, parseInt(m[1], 10)); return true; }
  return false;
}

module.exports = { handle };

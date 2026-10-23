// Admin: books (catalogue state, details, creation) and the chapter editor's storage.
//
// The catalogue itself (swadhyay-data.js) is a static file and stays read-only here. Everything the admin changes lives in
// the database and is laid over the catalogue in the browser (see applyCatalogueState in swadhyay-app.js):
//   book_state     enabled / featured switches and display overrides (title, people, cover, description)
//   book_docs +    the text of a book that was edited or created in the panel, one row per chapter
//   book_chapters
//   chapter_versions   previous texts of a chapter (undo / restore)
const db = require('../db');
const seo = require('../seo');
const bd = require('../bookdoc');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, num, batchInChunks } = require('./common');

const OVERRIDE_KEYS = ['title', 'author', 'tikakar', 'translator', 'publisher', 'cover', 'description'];
const MAX_VERSIONS = 25;

const clean = (v) => String(v == null ? '' : v).split(';').map((s) => s.trim()).filter(Boolean).join('; ');

// ------------------------------------------------------------------ catalogue + state

async function loadStates() {
  const rows = await db.all('SELECT book_file, enabled, featured, overrides, updated_at FROM book_state');
  const map = {};
  rows.forEach((r) => {
    let ov = {};
    try { ov = JSON.parse(r.overrides || '{}'); } catch (e) { ov = {}; }
    map[r.book_file] = { enabled: Number(r.enabled) !== 0, featured: Number(r.featured) === 1, overrides: ov, updatedAt: Number(r.updated_at) || 0 };
  });
  return map;
}

/** Every book the library knows: the static catalogue plus books created in the panel. */
async function allBooks() {
  const [cat, states, catLinks, tagLinks, docs] = await Promise.all([
    seo.loadCatalogue(),
    loadStates(),
    db.all('SELECT book_file, category_key FROM book_categories'),
    db.all('SELECT bt.book_file, t.label FROM book_tags bt JOIN tags t ON t.id = bt.tag_id'),
    db.all('SELECT d.book_file, d.origin, d.updated_at, (SELECT COUNT(*) FROM book_chapters c WHERE c.book_file = d.book_file) AS n FROM book_docs d')
  ]);
  const catsBy = {}, tagsBy = {}, docBy = {};
  catLinks.forEach((r) => { (catsBy[r.book_file] = catsBy[r.book_file] || []).push(r.category_key); });
  tagLinks.forEach((r) => { (tagsBy[r.book_file] = tagsBy[r.book_file] || []).push(r.label); });
  docs.forEach((r) => { docBy[r.book_file] = { origin: r.origin, updatedAt: Number(r.updated_at) || 0, chapters: Number(r.n) || 0 }; });

  const out = [];
  const seen = new Set();
  cat.BOOKS.forEach((b) => {
    seen.add(b.file);
    const st = states[b.file] || { enabled: true, featured: false, overrides: {}, updatedAt: 0 };
    const ov = st.overrides || {};
    out.push({
      file: b.file, slug: b.slug, created: false,
      title: ov.title || b.title, baseTitle: b.title,
      author: ov.author != null ? ov.author : (b.authors || []).join('; '),
      tikakar: ov.tikakar != null ? ov.tikakar : (b.tikakars || []).join('; '),
      translator: ov.translator != null ? ov.translator : (b.translators || []).join('; '),
      publisher: ov.publisher != null ? ov.publisher : (b.publisher || ''),
      cover: ov.cover || b.coverImage || '', description: ov.description || '',
      sizeKB: b.sizeKB, categories: catsBy[b.file] && catsBy[b.file].length ? catsBy[b.file] : [b.category],
      tags: tagsBy[b.file] || [], enabled: st.enabled, featured: st.featured, overridden: Object.keys(ov).length > 0,
      doc: docBy[b.file] || null
    });
  });
  Object.keys(states).forEach((file) => {
    const st = states[file];
    if (seen.has(file) || !st.overrides || !st.overrides.raw) return;
    const raw = st.overrides.raw, ov = st.overrides;
    out.push({
      file, slug: '', created: true,
      title: ov.title || file.replace(/\.html$/i, ''), baseTitle: ov.title || '',
      author: ov.author != null ? ov.author : (raw.author || ''), tikakar: ov.tikakar != null ? ov.tikakar : (raw.tikakar || ''),
      translator: ov.translator != null ? ov.translator : (raw.translator || ''), publisher: ov.publisher != null ? ov.publisher : (raw.publisher || ''),
      cover: ov.cover || '', description: ov.description || '', sizeKB: raw.sizeKB || 0,
      categories: catsBy[file] && catsBy[file].length ? catsBy[file] : (raw.category ? [raw.category] : []),
      tags: tagsBy[file] || [], enabled: st.enabled, featured: st.featured, overridden: false, doc: docBy[file] || null,
      createdAt: raw.createdAt || 0
    });
  });
  return out;
}

async function findBook(file) {
  return (await allBooks()).find((b) => b.file === file) || null;
}

async function handleList(ctx) {
  const q = queryOf(ctx.req);
  let list = await allBooks();
  const cat = cleanQ(q.get('cat')), status = cleanQ(q.get('status')), text = cleanQ(q.get('q')).toLowerCase();
  if (text) list = list.filter((b) => (b.title + ' ' + b.file + ' ' + b.author + ' ' + b.tikakar + ' ' + b.translator).toLowerCase().includes(text));
  if (cat) list = list.filter((b) => b.categories.includes(cat));
  if (status === 'enabled') list = list.filter((b) => b.enabled);
  else if (status === 'disabled') list = list.filter((b) => !b.enabled);
  else if (status === 'featured') list = list.filter((b) => b.featured);
  else if (status === 'edited') list = list.filter((b) => b.doc && b.doc.updatedAt > 0);
  else if (status === 'created') list = list.filter((b) => b.created);
  else if (status === 'nocover') list = list.filter((b) => !b.cover);
  const sort = cleanQ(q.get('sort')) || 'title';
  const by = {
    title: (a, b) => a.title.localeCompare(b.title, 'hi'),
    size: (a, b) => b.sizeKB - a.sizeKB,
    updated: (a, b) => ((b.doc && b.doc.updatedAt) || 0) - ((a.doc && a.doc.updatedAt) || 0)
  };
  list.sort(by[sort] || by.title);
  const size = Math.min(200, Math.max(5, num(q.get('size'), 50)));
  const page = Math.max(1, num(q.get('page'), 1));
  const total = list.length;
  sendJSON(ctx.res, 200, { total, page, size, books: list.slice((page - 1) * size, page * size) });
}

function cleanQ(v) { return v == null ? '' : String(v).trim(); }

async function handleGet(ctx, file) {
  const book = await findBook(file);
  if (!book) return sendJSON(ctx.res, 404, { error: 'Book not found' });
  sendJSON(ctx.res, 200, { book });
}

// ------------------------------------------------------------------ writing state

async function upsertState(file, patch) {
  const row = await db.get('SELECT enabled, featured, overrides FROM book_state WHERE book_file = ?', [file]);
  let ov = {};
  if (row) { try { ov = JSON.parse(row.overrides || '{}'); } catch (e) { ov = {}; } }
  const enabled = patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : (row ? Number(row.enabled) : 1);
  const featured = patch.featured !== undefined ? (patch.featured ? 1 : 0) : (row ? Number(row.featured) : 0);
  if (patch.overrides) {
    OVERRIDE_KEYS.forEach((k) => {
      if (patch.overrides[k] === undefined) return;
      const v = ['author', 'tikakar', 'translator'].includes(k) ? clean(patch.overrides[k]) : String(patch.overrides[k] == null ? '' : patch.overrides[k]).trim();
      if (v === '') delete ov[k]; else ov[k] = v;
    });
    if (patch.overrides.isGitaPress !== undefined) {
      if (patch.overrides.isGitaPress === null) delete ov.isGitaPress; else ov.isGitaPress = !!patch.overrides.isGitaPress;
    }
  }
  if (patch.raw) ov.raw = patch.raw;
  await db.run(
    `INSERT INTO book_state (book_file, enabled, featured, overrides, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(book_file) DO UPDATE SET enabled = excluded.enabled, featured = excluded.featured, overrides = excluded.overrides, updated_at = excluded.updated_at`,
    [file, enabled, featured, JSON.stringify(ov), Date.now()]
  );
}

async function setCategories(file, keys) {
  const valid = [];
  for (const k of keys) if (await db.get('SELECT key FROM categories WHERE key = ?', [k])) valid.push(k);
  const stmts = [{ sql: 'DELETE FROM book_categories WHERE book_file = ?', args: [file] }];
  valid.forEach((k) => stmts.push({ sql: 'INSERT OR IGNORE INTO book_categories (book_file, category_key) VALUES (?, ?)', args: [file, k] }));
  await db.getClient().batch(stmts, 'write');
  return valid;
}

async function setTags(file, labels) {
  const tags = [...new Set(labels.map((t) => String(t).trim()).filter(Boolean))].slice(0, 30);
  await db.run('DELETE FROM book_tags WHERE book_file = ?', [file]);
  for (const label of tags) {
    let tag = await db.get('SELECT id FROM tags WHERE label = ?', [label]);
    if (!tag) { await db.run('INSERT INTO tags (label) VALUES (?)', [label]); tag = { id: db.lastInsertId() }; }
    await db.run('INSERT OR IGNORE INTO book_tags (book_file, tag_id) VALUES (?, ?)', [file, tag.id]);
  }
}

async function handlePatch(ctx, file) {
  const book = await findBook(file);
  if (!book) return sendJSON(ctx.res, 404, { error: 'Book not found' });
  const b = await readJSON(ctx.req);
  if (b.overrides && b.overrides.title !== undefined && !String(b.overrides.title).trim() && book.created) {
    return sendJSON(ctx.res, 400, { error: 'A book needs a title' });
  }
  if (b.categories && !Array.isArray(b.categories)) return sendJSON(ctx.res, 400, { error: 'categories must be a list' });
  if (b.categories && !b.categories.length) return sendJSON(ctx.res, 400, { error: 'Choose at least one category' });
  await upsertState(file, { enabled: b.enabled, featured: b.featured, overrides: b.overrides });
  if (b.categories) await setCategories(file, b.categories);
  if (Array.isArray(b.tags)) await setTags(file, b.tags);
  await audit(ctx.user, 'book.update', file, Object.keys(b).join(', '));
  sendJSON(ctx.res, 200, { book: await findBook(file) });
}

async function handleBulk(ctx) {
  const b = await readJSON(ctx.req);
  const files = Array.isArray(b.files) ? b.files.slice(0, 1000) : [];
  if (!files.length) return sendJSON(ctx.res, 400, { error: 'No books selected' });
  const known = new Set((await allBooks()).map((x) => x.file));
  const targets = files.filter((f) => known.has(f));
  const action = String(b.action || '');
  if (action === 'enable' || action === 'disable') {
    for (const f of targets) await upsertState(f, { enabled: action === 'enable' });
  } else if (action === 'feature' || action === 'unfeature') {
    for (const f of targets) await upsertState(f, { featured: action === 'feature' });
  } else if (action === 'addCategory' || action === 'removeCategory') {
    const key = String(b.category || '');
    if (!(await db.get('SELECT key FROM categories WHERE key = ?', [key]))) return sendJSON(ctx.res, 400, { error: 'Unknown category' });
    const list = await allBooks();
    for (const f of targets) {
      const cur = (list.find((x) => x.file === f) || {}).categories || [];
      const next = action === 'addCategory' ? [...new Set(cur.concat(key))] : cur.filter((k) => k !== key);
      if (!next.length) continue;
      await setCategories(f, next);
    }
  } else return sendJSON(ctx.res, 400, { error: 'Unknown action' });
  await audit(ctx.user, 'book.bulk.' + action, targets.length + ' books', b.category || '');
  sendJSON(ctx.res, 200, { ok: true, changed: targets.length });
}

// ------------------------------------------------------------------ creating / removing

function fileNameFor(title, taken) {
  const base = (String(title).trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'book');
  let name = base + '.html', n = 2;
  while (taken.has(name)) { name = base + ' ' + n + '.html'; n++; }
  return name;
}

async function insertChapters(file, chapters, stamp) {
  const now = stamp === undefined ? Date.now() : stamp;
  const stmts = chapters.map((html, i) => ({
    sql: 'INSERT INTO book_chapters (book_file, pos, title, size, html, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [file, i, bd.chapterTitle(html), Buffer.byteLength(html, 'utf8'), html, now]
  }));
  await batchInChunks(stmts, 25);
}

async function handleCreate(ctx) {
  const b = await readJSON(ctx.req, 12e6);
  const title = String(b.title || '').trim();
  if (!title) return sendJSON(ctx.res, 400, { error: 'A title is required' });
  const cats = Array.isArray(b.categories) ? b.categories : [];
  if (!cats.length) return sendJSON(ctx.res, 400, { error: 'Choose at least one category' });
  const taken = new Set((await allBooks()).map((x) => x.file));
  const file = fileNameFor(b.fileName || title, taken);

  let parts;
  if (b.mode === 'html') {
    let html = String(b.html || '');
    const m = html.match(/^data:[^;]+;base64,(.*)$/s);
    if (m) html = Buffer.from(m[1], 'base64').toString('utf8');
    if (!html.trim()) return sendJSON(ctx.res, 400, { error: 'The HTML file is empty' });
    parts = bd.splitDoc(html);
  } else {
    parts = bd.blankBook(title);
  }
  const text = bd.joinDoc(parts.prefix, parts.chapters, parts.suffix);
  const raw = {
    category: cats[0], author: clean(b.author), tikakar: clean(b.tikakar), translator: clean(b.translator),
    publisher: String(b.publisher || '').trim(), sizeKB: Math.round(Buffer.byteLength(text, 'utf8') / 102.4) / 10, createdAt: Date.now()
  };
  await upsertState(file, { enabled: b.enabled !== false, raw, overrides: { title, isGitaPress: b.isGitaPress ? true : false } });
  // chapters first, the book record last: a request cut short half way never leaves a book that looks complete
  await db.run('DELETE FROM book_chapters WHERE book_file = ?', [file]);
  await insertChapters(file, parts.chapters);
  await db.run('INSERT INTO book_docs (book_file, origin, prefix, suffix, updated_at) VALUES (?, ?, ?, ?, ?)',
    [file, 'created', parts.prefix, parts.suffix, Date.now()]);
  await setCategories(file, cats);
  if (Array.isArray(b.tags)) await setTags(file, b.tags);
  await audit(ctx.user, 'book.create', file, b.mode === 'html' ? 'from HTML' : 'blank');
  sendJSON(ctx.res, 200, { ok: true, book: await findBook(file) });
}

async function wipeDoc(file) {
  await db.getClient().batch([
    { sql: 'DELETE FROM chapter_versions WHERE book_file = ?', args: [file] },
    { sql: 'DELETE FROM book_chapters WHERE book_file = ?', args: [file] },
    { sql: 'DELETE FROM book_docs WHERE book_file = ?', args: [file] }
  ], 'write');
}

async function handleDelete(ctx, file) {
  const book = await findBook(file);
  if (!book) return sendJSON(ctx.res, 404, { error: 'Book not found' });
  if (!book.created) return sendJSON(ctx.res, 400, { error: 'Books of the original library cannot be deleted. Disable the book to hide it.' });
  await wipeDoc(file);
  await db.getClient().batch([
    { sql: 'DELETE FROM book_state WHERE book_file = ?', args: [file] },
    { sql: 'DELETE FROM book_categories WHERE book_file = ?', args: [file] },
    { sql: 'DELETE FROM book_tags WHERE book_file = ?', args: [file] },
    { sql: 'DELETE FROM progress WHERE book_file = ?', args: [file] },
    { sql: 'DELETE FROM comments WHERE book_file = ?', args: [file] }
  ], 'write');
  await audit(ctx.user, 'book.delete', file, book.title);
  sendJSON(ctx.res, 200, { ok: true });
}

// ------------------------------------------------------------------ chapters

/** Makes sure the book's text is in the database (copying it from the file on first use). Returns the doc row. */
async function ensureDoc(file, req) {
  let doc = await db.get('SELECT * FROM book_docs WHERE book_file = ?', [file]);
  if (doc) return doc;
  const book = await findBook(file);
  if (!book) throw new Error('Book not found');
  const html = await bd.loadOriginalHtml(file, req);
  const parts = bd.splitDoc(html);
  // Chapters first, the book record last. If this request is cut short (a serverless time limit on a very large book) there is
  // no record yet, so nothing treats the half-copied chapters as the book; the next attempt clears them and starts again.
  await db.run('DELETE FROM book_chapters WHERE book_file = ?', [file]);
  await insertChapters(file, parts.chapters, 0);   // an untouched import carries updated_at 0 (= not edited)
  try {
    await db.run('INSERT INTO book_docs (book_file, origin, prefix, suffix, updated_at) VALUES (?, ?, ?, ?, 0)',
      [file, 'imported', parts.prefix, parts.suffix]);
  } catch (e) { /* opened twice at once: the other request finished first */ }
  return db.get('SELECT * FROM book_docs WHERE book_file = ?', [file]);
}

async function touchDoc(file) {
  await db.run('UPDATE book_docs SET updated_at = ? WHERE book_file = ?', [Date.now(), file]);
}

async function handleChapterList(ctx, file) {
  const doc = await ensureDoc(file, ctx.req);
  const rows = await db.all('SELECT id, pos, title, size, updated_at FROM book_chapters WHERE book_file = ? ORDER BY pos', [file]);
  sendJSON(ctx.res, 200, {
    file, origin: doc.origin, modified: Number(doc.updated_at) > 0,
    chapters: rows.map((r) => ({ id: r.id, pos: Number(r.pos), title: r.title, size: Number(r.size), edited: Number(r.updated_at) > 0 }))
  });
}

async function chapterRow(id) {
  return db.get('SELECT id, book_file, pos, title, size, html, updated_at FROM book_chapters WHERE id = ?', [id]);
}

async function handleChapterGet(ctx, id) {
  const ch = await chapterRow(id);
  if (!ch) return sendJSON(ctx.res, 404, { error: 'Chapter not found' });
  const head = await db.get('SELECT prefix FROM book_docs WHERE book_file = ?', [ch.book_file]);
  sendJSON(ctx.res, 200, { chapter: { id: ch.id, file: ch.book_file, pos: Number(ch.pos), title: ch.title, html: ch.html }, head: head ? headOf(head.prefix) : '' });
}

// the <head> of the book (its <style> and stylesheet link), so the editor can show a chapter the way the reader does
function headOf(prefix) {
  const m = String(prefix).match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : '';
}

async function snapshot(ch, note, user) {
  const last = await db.get('SELECT html FROM chapter_versions WHERE chapter_id = ? ORDER BY id DESC LIMIT 1', [ch.id]);
  if (last && last.html === ch.html && !note) return;
  await db.run('INSERT INTO chapter_versions (book_file, chapter_id, html, note, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [ch.book_file, ch.id, ch.html, note || '', user ? user.id : null, Date.now()]);
  await db.run(
    `DELETE FROM chapter_versions WHERE chapter_id = ? AND id NOT IN
       (SELECT id FROM chapter_versions WHERE chapter_id = ? ORDER BY id DESC LIMIT ?)`,
    [ch.id, ch.id, MAX_VERSIONS]);
}

async function writeChapter(ch, html, user, note) {
  if (html === ch.html) return false;
  await snapshot(ch, note || 'before edit', user);
  await db.run('UPDATE book_chapters SET html = ?, title = ?, size = ?, updated_at = ? WHERE id = ?',
    [html, bd.chapterTitle(html), Buffer.byteLength(html, 'utf8'), Date.now(), ch.id]);
  await touchDoc(ch.book_file);
  return true;
}

async function handleChapterSave(ctx, id) {
  const ch = await chapterRow(id);
  if (!ch) return sendJSON(ctx.res, 404, { error: 'Chapter not found' });
  const b = await readJSON(ctx.req, 12e6);
  if (typeof b.html !== 'string') return sendJSON(ctx.res, 400, { error: 'html is required' });
  if (/<hr[^>]*\bclass=["']page-break["']/i.test(b.html)) return sendJSON(ctx.res, 400, { error: 'A chapter cannot contain a page break. Use "Split chapter" instead.' });
  const changed = await writeChapter(ch, b.html.trim(), ctx.user, b.note);
  if (changed) await audit(ctx.user, 'chapter.save', ch.book_file + ' #' + (Number(ch.pos) + 1), bd.chapterTitle(b.html));
  const fresh = await chapterRow(id);
  sendJSON(ctx.res, 200, { ok: true, changed, title: fresh.title, size: Number(fresh.size) });
}

async function handleChapterAdd(ctx, file) {
  await ensureDoc(file, ctx.req);
  const b = await readJSON(ctx.req, 12e6);
  const html = typeof b.html === 'string' ? b.html.trim() : '<p class="Heading">New chapter</p>\n<p class="TXT"></p>';
  let pos;
  if (b.afterId) {
    const ref = await chapterRow(b.afterId);
    if (!ref || ref.book_file !== file) return sendJSON(ctx.res, 400, { error: 'Unknown chapter to insert after' });
    pos = Number(ref.pos) + 1;
  } else {
    const max = await db.get('SELECT COALESCE(MAX(pos), -1) AS m FROM book_chapters WHERE book_file = ?', [file]);
    pos = Number(max.m) + 1;
  }
  await db.run('UPDATE book_chapters SET pos = pos + 1 WHERE book_file = ? AND pos >= ?', [file, pos]);
  await db.run('INSERT INTO book_chapters (book_file, pos, title, size, html, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [file, pos, bd.chapterTitle(html), Buffer.byteLength(html, 'utf8'), html, Date.now()]);
  const id = db.lastInsertId();
  await touchDoc(file);
  await audit(ctx.user, 'chapter.add', file + ' #' + (pos + 1), '');
  sendJSON(ctx.res, 200, { ok: true, id, pos });
}

async function handleChapterDelete(ctx, id) {
  const ch = await chapterRow(id);
  if (!ch) return sendJSON(ctx.res, 404, { error: 'Chapter not found' });
  const count = await db.get('SELECT COUNT(*) AS n FROM book_chapters WHERE book_file = ?', [ch.book_file]);
  if (Number(count.n) <= 1) return sendJSON(ctx.res, 400, { error: 'A book needs at least one chapter' });
  await snapshot(ch, 'deleted', ctx.user);
  await db.run('DELETE FROM book_chapters WHERE id = ?', [id]);
  await db.run('UPDATE book_chapters SET pos = pos - 1 WHERE book_file = ? AND pos > ?', [ch.book_file, ch.pos]);
  await touchDoc(ch.book_file);
  await audit(ctx.user, 'chapter.delete', ch.book_file + ' #' + (Number(ch.pos) + 1), ch.title);
  sendJSON(ctx.res, 200, { ok: true });
}

async function handleReorder(ctx, file) {
  const b = await readJSON(ctx.req);
  const ids = Array.isArray(b.ids) ? b.ids.map(Number) : [];
  const rows = await db.all('SELECT id, pos FROM book_chapters WHERE book_file = ?', [file]);
  if (ids.length !== rows.length || new Set(ids).size !== ids.length || !ids.every((i) => rows.some((r) => Number(r.id) === i))) {
    return sendJSON(ctx.res, 400, { error: 'The list must contain every chapter of the book exactly once' });
  }
  const oldPos = {};
  rows.forEach((r) => { oldPos[Number(r.id)] = Number(r.pos); });
  const stmts = [];
  ids.forEach((id, i) => { if (oldPos[id] !== i) stmts.push({ sql: 'UPDATE book_chapters SET pos = ? WHERE id = ?', args: [i, id] }); });
  if (stmts.length) { await batchInChunks(stmts, 100); await touchDoc(file); await audit(ctx.user, 'chapter.reorder', file, stmts.length + ' moved'); }
  sendJSON(ctx.res, 200, { ok: true });
}

async function handleVersions(ctx, id) {
  const rows = await db.all('SELECT id, note, created_at, length(html) AS size FROM chapter_versions WHERE chapter_id = ? ORDER BY id DESC', [id]);
  sendJSON(ctx.res, 200, { versions: rows.map((r) => ({ id: r.id, note: r.note, createdAt: Number(r.created_at), size: Number(r.size) })) });
}

async function handleVersionGet(ctx, versionId) {
  const v = await db.get('SELECT id, chapter_id, html, note, created_at FROM chapter_versions WHERE id = ?', [versionId]);
  if (!v) return sendJSON(ctx.res, 404, { error: 'Version not found' });
  sendJSON(ctx.res, 200, { version: { id: v.id, chapterId: v.chapter_id, html: v.html, note: v.note, createdAt: Number(v.created_at) } });
}

async function handleRestore(ctx, id) {
  const ch = await chapterRow(id);
  if (!ch) return sendJSON(ctx.res, 404, { error: 'Chapter not found' });
  const b = await readJSON(ctx.req);
  const v = await db.get('SELECT html FROM chapter_versions WHERE id = ? AND chapter_id = ?', [num(b.versionId, 0), id]);
  if (!v) return sendJSON(ctx.res, 404, { error: 'Version not found' });
  await writeChapter(ch, v.html, ctx.user, 'before restore');
  await audit(ctx.user, 'chapter.restore', ch.book_file + ' #' + (Number(ch.pos) + 1), 'version ' + b.versionId);
  sendJSON(ctx.res, 200, { ok: true, html: v.html });
}

// chapters that were deleted: their last text is kept in chapter_versions
async function handleTrash(ctx, file) {
  const rows = await db.all(
    `SELECT v.id, v.created_at, v.html FROM chapter_versions v
     WHERE v.book_file = ? AND v.note = 'deleted' AND NOT EXISTS (SELECT 1 FROM book_chapters c WHERE c.id = v.chapter_id)
     ORDER BY v.id DESC LIMIT 50`, [file]);
  sendJSON(ctx.res, 200, { items: rows.map((r) => ({ versionId: r.id, deletedAt: Number(r.created_at), title: bd.chapterTitle(r.html) })) });
}

async function handleTrashRestore(ctx, file) {
  const b = await readJSON(ctx.req);
  const v = await db.get("SELECT html FROM chapter_versions WHERE id = ? AND book_file = ? AND note = 'deleted'", [num(b.versionId, 0), file]);
  if (!v) return sendJSON(ctx.res, 404, { error: 'Nothing to restore' });
  const max = await db.get('SELECT COALESCE(MAX(pos), -1) AS m FROM book_chapters WHERE book_file = ?', [file]);
  await db.run('INSERT INTO book_chapters (book_file, pos, title, size, html, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [file, Number(max.m) + 1, bd.chapterTitle(v.html), Buffer.byteLength(v.html, 'utf8'), v.html, Date.now()]);
  const id = db.lastInsertId();
  await db.run('DELETE FROM chapter_versions WHERE id = ?', [b.versionId]);
  await touchDoc(file);
  await audit(ctx.user, 'chapter.recover', file, bd.chapterTitle(v.html));
  sendJSON(ctx.res, 200, { ok: true, id });
}

// ------------------------------------------------------------------ find & replace across a book

function textOnlyReplace(html, re, replacement, counter) {
  return html.split(/(<[^>]+>)/).map((part, i) => {
    if (i % 2 === 1) return part;
    return part.replace(re, function () { counter.n++; return typeof replacement === 'function' ? replacement.apply(null, arguments) : replacement; });
  }).join('');
}

async function handleReplace(ctx, file) {
  await ensureDoc(file, ctx.req);
  const b = await readJSON(ctx.req);
  const find = String(b.find == null ? '' : b.find);
  if (!find) return sendJSON(ctx.res, 400, { error: 'Enter the text to find' });
  if (find.length > 300) return sendJSON(ctx.res, 400, { error: 'The search text is too long' });
  let re;
  try {
    const src = b.regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(src, b.caseSensitive ? 'gu' : 'giu');
  } catch (e) { return sendJSON(ctx.res, 400, { error: 'Invalid pattern: ' + e.message }); }
  const replacement = String(b.replace == null ? '' : b.replace);
  const apply = !!b.apply;
  const rows = await db.all('SELECT id FROM book_chapters WHERE book_file = ? ORDER BY pos', [file]);
  const hits = [];
  let total = 0, changedChapters = 0;
  for (const r of rows) {
    const ch = await chapterRow(r.id);
    const counter = { n: 0 };
    const next = textOnlyReplace(ch.html, re, replacement, counter);
    if (!counter.n) continue;
    total += counter.n;
    changedChapters++;
    const sample = bd.stripTags(ch.html);
    re.lastIndex = 0;
    const m = re.exec(sample);
    re.lastIndex = 0;
    hits.push({ id: ch.id, pos: Number(ch.pos), title: ch.title, count: counter.n, sample: m ? sample.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30) : '' });
    if (apply) await writeChapter(ch, next, ctx.user, 'before replace "' + find.slice(0, 40) + '"');
  }
  if (apply && total) await audit(ctx.user, 'book.replace', file, '"' + find.slice(0, 60) + '" -> "' + replacement.slice(0, 60) + '" x' + total);
  sendJSON(ctx.res, 200, { applied: apply, total, chapters: changedChapters, hits: hits.slice(0, 200) });
}

async function handleRevert(ctx, file) {
  const doc = await db.get('SELECT origin FROM book_docs WHERE book_file = ?', [file]);
  if (!doc) return sendJSON(ctx.res, 200, { ok: true });
  if (doc.origin === 'created') return sendJSON(ctx.res, 400, { error: 'This book has no original file. Delete the book instead.' });
  await wipeDoc(file);
  await audit(ctx.user, 'book.revert', file, 'back to the original file');
  sendJSON(ctx.res, 200, { ok: true });
}

async function handleExport(ctx, file) {
  const doc = await ensureDoc(file, ctx.req);
  const rows = await db.all('SELECT html FROM book_chapters WHERE book_file = ? ORDER BY pos', [file]);
  const text = bd.joinDoc(doc.prefix, rows.map((r) => r.html), doc.suffix);
  ctx.res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(file)
  });
  ctx.res.end(text);
}

// the paragraph styles (CSS classes of <p>) a book uses, most used first -- feeds the editor's style menu
async function handleStyles(ctx, file) {
  await ensureDoc(file, ctx.req);
  const ids = await db.all('SELECT id FROM book_chapters WHERE book_file = ? ORDER BY pos', [file]);
  const count = {};
  for (let i = 0; i < ids.length; i += 20) {
    const part = ids.slice(i, i + 20).map((r) => Number(r.id));
    const rows = await db.all('SELECT html FROM book_chapters WHERE id IN (' + part.map(() => '?').join(',') + ')', part);
    rows.forEach((r) => {
      const re = /<p\b[^>]*\bclass=["']([^"']*)["']/gi;
      let m;
      while ((m = re.exec(r.html))) { const k = m[1].trim(); if (k) count[k] = (count[k] || 0) + 1; }
    });
  }
  const styles = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 60).map((k) => ({ cls: k, n: count[k] }));
  sendJSON(ctx.res, 200, { styles });
}

// ------------------------------------------------------------------ routes

async function handle(ctx) {
  const { method, pathname } = ctx;
  let m;
  if (pathname === '/api/admin/books') {
    if (method === 'GET') { await handleList(ctx); return true; }
    if (method === 'POST') { await handleCreate(ctx); return true; }
  }
  if (method === 'POST' && pathname === '/api/admin/books/bulk') { await handleBulk(ctx); return true; }

  m = pathname.match(/^\/api\/admin\/books\/([^/]+)$/);
  if (m) {
    const file = decodeURIComponent(m[1]);
    if (method === 'GET') { await handleGet(ctx, file); return true; }
    if (method === 'PATCH') { await handlePatch(ctx, file); return true; }
    if (method === 'DELETE') { await handleDelete(ctx, file); return true; }
  }
  m = pathname.match(/^\/api\/admin\/books\/([^/]+)\/(chapters|trash|replace|revert|export|reorder|styles|trash\/restore)$/);
  if (m) {
    const file = decodeURIComponent(m[1]);
    const what = m[2];
    if (what === 'chapters' && method === 'GET') { await handleChapterList(ctx, file); return true; }
    if (what === 'chapters' && method === 'POST') { await handleChapterAdd(ctx, file); return true; }
    if (what === 'styles' && method === 'GET') { await handleStyles(ctx, file); return true; }
    if (what === 'trash' && method === 'GET') { await handleTrash(ctx, file); return true; }
    if (what === 'trash/restore' && method === 'POST') { await handleTrashRestore(ctx, file); return true; }
    if (what === 'replace' && method === 'POST') { await handleReplace(ctx, file); return true; }
    if (what === 'revert' && method === 'POST') { await handleRevert(ctx, file); return true; }
    if (what === 'export' && method === 'GET') { await handleExport(ctx, file); return true; }
    if (what === 'reorder' && method === 'POST') { await handleReorder(ctx, file); return true; }
  }
  m = pathname.match(/^\/api\/admin\/chapters\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (method === 'GET') { await handleChapterGet(ctx, id); return true; }
    if (method === 'PUT') { await handleChapterSave(ctx, id); return true; }
    if (method === 'DELETE') { await handleChapterDelete(ctx, id); return true; }
  }
  m = pathname.match(/^\/api\/admin\/chapters\/(\d+)\/(versions|restore)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (m[2] === 'versions' && method === 'GET') { await handleVersions(ctx, id); return true; }
    if (m[2] === 'restore' && method === 'POST') { await handleRestore(ctx, id); return true; }
  }
  m = pathname.match(/^\/api\/admin\/versions\/(\d+)$/);
  if (m && method === 'GET') { await handleVersionGet(ctx, parseInt(m[1], 10)); return true; }
  return false;
}

module.exports = { handle, allBooks, findBook, loadStates };

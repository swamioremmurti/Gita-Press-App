// Admin: stotras (the /stotras page and the stotra viewer).
//
// A stotra is an ordinary library book whose HTML follows the pattern of swadhyay-stotra-format.js, plus a stotra category key
// (book_state.overrides.stotra for books made here, or "stotra" in the catalogue entry for books added by tools/build_stotra_book.js).
// A stotra's recording (st.audio) is kept in the book's head as <meta name="stotra-audio">; the viewer plays it in a bar at the bottom of the page.
// This module is the structured editor on top of that: it builds the book's HTML from the form's data and reads it back for editing.
//   GET    /api/admin/stotras               every stotra book (+ the category list)
//   GET    /api/admin/stotras/<file>        one stotra, read back from its book text, for the form
//   POST   /api/admin/stotras               a new stotra (creates the book and lists it in the library)
//   PUT    /api/admin/stotras/<file>        rewrites the stotra's book text from the form
//   GET|PUT /api/admin/stotra-categories    the category list ({key, hi, en, icon, hidden}); kv "stotra_state"
// Enabling/disabling, covers, tags and deleting are the Books page's job; a stotra is a book there too.
const db = require('../db');
const bd = require('../bookdoc');
const F = require('../../../swadhyay-stotra-format.js');
const books = require('./books');
const { sendJSON, readJSON } = require('../http');
const { audit, kvGet, kvSet } = require('./common');

const KEY_RE = /^[a-z][a-z0-9-]{0,39}$/;
const MAX_VERSES = 400;

const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };
const clip = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, n);

// ------------------------------------------------------------------ categories

async function categoryList() {
  const s = await kvGet('stotra_state', {});
  return Array.isArray(s.categories) && s.categories.length ? s.categories : F.CATEGORIES.map((c) => Object.assign({ hidden: false }, c));
}

/** For /api/book-meta: the admin's list, or null while the built-in one is in use. */
async function publicCategories() {
  const s = await kvGet('stotra_state', {});
  return Array.isArray(s.categories) && s.categories.length ? s.categories : null;
}

async function categoriesPut(ctx) {
  const b = await readJSON(ctx.req);
  const list = Array.isArray(b.categories) ? b.categories : [];
  if (!list.length) throw fail(400, 'Keep at least one category');
  if (list.length > 60) throw fail(400, 'Too many categories');
  const seen = new Set();
  const clean = list.map((c) => {
    const key = clip(c.key, 40).toLowerCase();
    if (!KEY_RE.test(key)) throw fail(400, 'A category key may only use lowercase letters, digits and hyphens, and must start with a letter (' + (key || 'empty') + ')');
    if (seen.has(key)) throw fail(400, 'The key “' + key + '” is used twice');
    seen.add(key);
    const en = clip(c.en, 60), hi = clip(c.hi, 60) || en;
    if (!en) throw fail(400, 'Every category needs an English name');
    return { key, hi, en, icon: clip(c.icon, 8) || '📿', hidden: !!c.hidden };
  });
  await kvSet('stotra_state', Object.assign(await kvGet('stotra_state', {}), { categories: clean }));
  await audit(ctx.user, 'stotra.categories', clean.length + ' categories', '');
  sendJSON(ctx.res, 200, { ok: true, categories: clean });
}

// ------------------------------------------------------------------ reading a stotra book

async function bookText(book, req) {
  const doc = await db.get('SELECT prefix, suffix, updated_at FROM book_docs WHERE book_file = ?', [book.file]);
  if (doc) {
    const rows = await db.all('SELECT html FROM book_chapters WHERE book_file = ? ORDER BY pos', [book.file]);
    return bd.joinDoc(doc.prefix, rows.map((r) => r.html), doc.suffix);
  }
  return bd.loadOriginalHtml(book.file, req);
}

async function stotraBook(file) {
  const book = await books.findBook(file);
  if (!book || !book.stotra) throw fail(404, 'Stotra not found');
  return book;
}

async function list(ctx) {
  const all = await books.allBooks();
  const cats = await categoryList();
  const out = all.filter((b) => b.stotra).map((b) => ({
    file: b.file, slug: b.slug, title: b.title, author: b.author, publisher: b.publisher, category: b.stotra, enabled: b.enabled,
    created: b.created, cover: b.cover, sizeKB: b.sizeKB
  }));
  sendJSON(ctx.res, 200, { stotras: out, categories: cats, builtinCategories: !(await publicCategories()) });
}

async function get(ctx, file) {
  const book = await stotraBook(file);
  const st = F.parseHtml(await bookText(book, ctx.req));
  if (!st) throw fail(400, 'This book does not follow the stotra format, so it cannot be edited here. Use the chapter editor on the Books page.');
  sendJSON(ctx.res, 200, {
    stotra: Object.assign({}, st, { author: book.author, publisher: st.publisher || book.publisher, category: book.stotra }),
    book: { file: book.file, slug: book.slug, enabled: book.enabled, created: book.created }
  });
}

// ------------------------------------------------------------------ the form -> a stotra

async function validate(b) {
  const cats = await categoryList();
  const title = clip(b.title, 200);
  if (!title) throw fail(400, 'A title is required');
  const category = clip(b.category, 40);
  if (!cats.some((c) => c.key === category)) throw fail(400, 'Choose a category');
  const rawVerses = Array.isArray(b.verses) ? b.verses : [];
  if (!rawVerses.length) throw fail(400, 'Add at least one verse');
  if (rawVerses.length > MAX_VERSES) throw fail(400, 'Too many verses (at most ' + MAX_VERSES + ')');
  const verses = rawVerses.map((v, i) => {
    const lines = (Array.isArray(v.lines) ? v.lines : String(v.lines == null ? '' : v.lines).split('\n')).map((x) => clip(x, 400)).filter(Boolean);
    if (!lines.length) throw fail(400, 'Verse ' + (i + 1) + ' has no Sanskrit text');
    const pad = (Array.isArray(v.pad) ? v.pad : F.parsePadText(v.pad)).map((p) => [clip(p[0], 200), clip(p[1], 400)]).filter((p) => p[0] || p[1]);
    return { label: clip(v.label, 80), lines, pad, bhav: clip(v.bhav, 6000) };
  });
  const audio = clip(b.audio, 600);
  if (audio && !/^(https:\/\/\S+|\/\S+|assets\/\S+)$/.test(audio)) throw fail(400, 'The audio must be an uploaded file, an https:// address, or a site path starting with / or assets/');
  const intro = (Array.isArray(b.intro) ? b.intro : []).map((s) => ({ title: clip(s.title, 120), text: clip(s.text, 12000) })).filter((s) => s.title || s.text);
  return {
    category,
    st: { title, invocation: clip(b.invocation, 120), subtitle: clip(b.subtitle, 300), publisher: clip(b.publisher, 120), audio, intro, verses, closing: clip(b.closing, 1200) },
    author: clip(b.author, 200)
  };
}

function fileSize(html) { return Math.round(Buffer.byteLength(html, 'utf8') / 102.4) / 10; }

/** Replaces a book's text with the given parts (chapters first, the record last, so a cut-off request never leaves a half book). */
async function writeBook(file, parts, origin) {
  await books.wipeDoc(file);
  await books.insertChapters(file, parts.chapters);
  await db.run('INSERT INTO book_docs (book_file, origin, prefix, suffix, updated_at) VALUES (?, ?, ?, ?, ?)', [file, origin, parts.prefix, parts.suffix, Date.now()]);
}

async function create(ctx) {
  const v = await validate(await readJSON(ctx.req, 4e6));
  const taken = new Set((await books.allBooks()).map((x) => x.file));
  const file = books.fileNameFor(v.st.title, taken);
  const parts = F.buildHtml(v.st);
  const raw = {
    category: F.LIBRARY_CATEGORY, author: v.author, tikakar: '', translator: '', publisher: v.st.publisher || 'कल्याण सेवा ट्रस्ट',
    swith_arth: 'yes', arth_hide: F.ARTH_HIDE, sizeKB: fileSize(parts.html), createdAt: Date.now()
  };
  await books.upsertState(file, { enabled: true, raw, overrides: { title: v.st.title, stotra: v.category, isGitaPress: false } });
  await writeBook(file, parts, 'created');
  await books.setCategories(file, [F.LIBRARY_CATEGORY]);
  await audit(ctx.user, 'stotra.create', file, v.category + ', ' + v.st.verses.length + ' verses');
  sendJSON(ctx.res, 200, { ok: true, file, book: await books.findBook(file) });
}

async function update(ctx, file) {
  const book = await stotraBook(file);
  const v = await validate(await readJSON(ctx.req, 4e6));
  const parts = F.buildHtml(v.st);
  const states = await books.loadStates();
  const st0 = states[file];
  const origin = book.doc && book.doc.origin ? book.doc.origin : (book.created ? 'created' : 'imported');
  const patch = { overrides: { title: v.st.title, author: v.author, publisher: v.st.publisher || book.publisher, stotra: v.category } };
  if (book.created && st0 && st0.overrides && st0.overrides.raw) patch.raw = Object.assign({}, st0.overrides.raw, { sizeKB: fileSize(parts.html) });
  await books.upsertState(file, patch);
  await writeBook(file, parts, origin);
  await audit(ctx.user, 'stotra.update', file, v.category + ', ' + v.st.verses.length + ' verses');
  sendJSON(ctx.res, 200, { ok: true, book: await books.findBook(file) });
}

// ------------------------------------------------------------------ routing

async function handle(ctx) {
  const { method, pathname } = ctx;
  let m;
  try {
    if (pathname === '/api/admin/stotra-categories') {
      if (method === 'GET') { sendJSON(ctx.res, 200, { categories: await categoryList(), builtin: !(await publicCategories()), defaults: F.CATEGORIES }); return true; }
      if (method === 'PUT') { await categoriesPut(ctx); return true; }
    }
    if (pathname === '/api/admin/stotras') {
      if (method === 'GET') { await list(ctx); return true; }
      if (method === 'POST') { await create(ctx); return true; }
    }
    m = pathname.match(/^\/api\/admin\/stotras\/([^/]+)$/);
    if (m) {
      const file = decodeURIComponent(m[1]);
      if (method === 'GET') { await get(ctx, file); return true; }
      if (method === 'PUT') { await update(ctx, file); return true; }
    }
  } catch (e) {
    if (e && e.status) { sendJSON(ctx.res, e.status, { error: e.message }); return true; }
    throw e;
  }
  return false;
}

module.exports = { handle, publicCategories, categoryList };

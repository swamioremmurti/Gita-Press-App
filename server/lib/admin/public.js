// The public side of the admin panel: what the site itself reads to pick up the admin's changes.
//   /api/book-meta     categories, tags, switches, overrides, created books, edited-book list, site notices (one cached call)
//   /api/book-content  the text of a book that was edited or created in the panel (streamed, chapter by chapter)
//   /api/gita-patches  corrections to the Gita lesson data
const db = require('../db');
const bd = require('../bookdoc');
const { siteSettings } = require('./common');
const lms = require('./lms');
const audio = require('./audio');

async function publicMeta() {
  const [cats, tags, authorsLink, states, docs, categories, site, audioState] = await Promise.all([
    db.all('SELECT bc.book_file, c.key, c.hi, c.en, c.icon FROM book_categories bc JOIN categories c ON c.key = bc.category_key'),
    db.all('SELECT bt.book_file, t.id, t.label FROM book_tags bt JOIN tags t ON t.id = bt.tag_id'),
    db.all('SELECT ba.book_file, a.id, a.name, a.photo_path FROM book_authors ba JOIN authors a ON a.id = ba.author_id'),
    db.all('SELECT book_file, enabled, featured, overrides FROM book_state'),
    db.all('SELECT book_file, updated_at FROM book_docs WHERE updated_at > 0'),
    db.all('SELECT key, hi, en, icon, hidden, edited FROM categories ORDER BY sort_order, rowid'),
    siteSettings(),
    audio.publicAudio()
  ]);

  const meta = {};
  const ensure = (file) => meta[file] || (meta[file] = { categories: [], tags: [], author: null });
  cats.forEach((r) => ensure(r.book_file).categories.push({ key: r.key, hi: r.hi, en: r.en, icon: r.icon }));
  tags.forEach((r) => ensure(r.book_file).tags.push({ id: r.id, label: r.label }));
  authorsLink.forEach((r) => { ensure(r.book_file).author = { id: r.id, name: r.name, photoPath: r.photo_path }; });

  const disabled = [], featured = [], overrides = {}, created = [];
  states.forEach((r) => {
    let ov = {};
    try { ov = JSON.parse(r.overrides || '{}'); } catch (e) { ov = {}; }
    if (Number(r.enabled) === 0) disabled.push(r.book_file);
    if (Number(r.featured) === 1) featured.push(r.book_file);
    const raw = ov.raw;
    delete ov.raw;
    if (raw) created.push({ file: r.book_file, raw: raw, title: ov.title || r.book_file.replace(/\.html$/i, '') });
    if (Object.keys(ov).length) overrides[r.book_file] = ov;
  });
  created.sort((a, b) => (a.raw.createdAt || 0) - (b.raw.createdAt || 0));

  const content = {};
  docs.forEach((r) => { content[r.book_file] = Number(r.updated_at); });

  return {
    meta, disabled, featured, overrides, created, content, audio: audioState,
    categories: categories.map((c) => ({ key: c.key, hi: c.hi, en: c.en, icon: c.icon, hidden: Number(c.hidden) === 1, edited: Number(c.edited) === 1 })),
    site: { announcement: site.announcement.enabled && site.announcement.text ? site.announcement : null, lms: site.lms }
  };
}

/** GET /api/book-content?file=...  -- streamed so a very large book never has to fit in one response buffer. */
async function serveBookContent(req, res, file) {
  const doc = await db.get('SELECT prefix, suffix, updated_at FROM book_docs WHERE book_file = ?', [file]);
  if (!doc || !(Number(doc.updated_at) > 0)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400' });
  res.write(doc.prefix + '\n');
  const ids = await db.all('SELECT id FROM book_chapters WHERE book_file = ? ORDER BY pos', [file]);
  for (let i = 0; i < ids.length; i += 20) {
    const part = ids.slice(i, i + 20).map((r) => Number(r.id));
    const rows = await db.all('SELECT id, html FROM book_chapters WHERE id IN (' + part.map(() => '?').join(',') + ')', part);
    const by = {};
    rows.forEach((r) => { by[Number(r.id)] = r.html; });
    const chunk = part.map((id, k) => (i + k > 0 ? '\n\n' + bd.PAGE_BREAK + '\n\n' : '') + (by[id] || '')).join('');
    res.write(chunk);
  }
  res.end('\n' + doc.suffix);
}

module.exports = { publicMeta, serveBookContent, publicPatches: lms.publicPatches };

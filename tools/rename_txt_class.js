// rename_txt_class.js -- the body-text class TXT becomes Normal, in master.css, every book file and the books stored in the database.
//
// master.css already had a p.Normal rule (margin-bottom 8px) used by 7 books; the two are merged into one p.Normal that keeps TXT's
// values (margin-bottom 10px), so those 7 books gain 2px of space between paragraphs.  TXT-Bold, TXT-Right ... are other classes and stay.
// Whole class tokens only: class="..." lists and .TXT in CSS (also in a book's own <style>).
// Changed files are first copied to backups/before-txt-rename/ (DB rows as db-<book>.json).
//
//     node tools/rename_txt_class.js            # dry run
//     node tools/rename_txt_class.js --apply
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const OUT = path.join(ROOT, 'backups', 'before-txt-rename');
const apply = process.argv.includes('--apply');

const CLASS_ATTR = /(class=")([^"]*)(")/g;
const TOK = /(?<![\w-])TXT(?![\w-])/g;
const CSS_SEL = /(?<=[.])TXT(?![\w-])/g;
const rename = (s) => s
  .replace(CLASS_ATTR, (m, a, list, c) => a + list.replace(TOK, 'Normal') + c)
  .replace(CSS_SEL, 'Normal');

function backup(f) {
  fs.mkdirSync(OUT, { recursive: true });
  const b = path.join(OUT, path.basename(f));
  if (!fs.existsSync(b)) fs.copyFileSync(f, b);
}

// master.css: drop the old p.Normal rule, then rename p.TXT
const cssPath = path.join(ROOT, 'master.css');
let css = fs.readFileSync(cssPath, 'utf8');
const old = /p\.Normal \{[^}]*\}\r?\n/;
if (!old.test(css)) throw new Error('p.Normal rule not found');
const cssNew = rename(css.replace(old, ''));
console.log('master.css: .TXT ->', (css.match(CSS_SEL) || []).length, 'selectors; old p.Normal rule dropped');
if (apply) { backup(cssPath); fs.writeFileSync(cssPath, cssNew); }

let files = 0, hits = 0;
for (const f of fs.readdirSync(BOOKS).filter((x) => /\.html?$/.test(x)).map((x) => path.join(BOOKS, x))) {
  const raw = fs.readFileSync(f, 'utf8');
  const out = rename(raw);
  if (out === raw) continue;
  files++; hits += (raw.match(/(?<![\w-])TXT(?![\w-])/g) || []).length;
  if (apply) { backup(f); fs.writeFileSync(f, out); }
}
console.log((apply ? 'renamed' : 'would rename') + ':', hits, 'TXT tokens in', files, 'books');

(async () => {
  require(path.join(ROOT, 'server/lib/env')).loadEnv();
  const db = require(path.join(ROOT, 'server/lib/db'));
  await db.init();
  const docs = await db.all('SELECT book_file, prefix, suffix FROM book_docs');
  for (const d of docs) {
    const chapters = await db.all('SELECT id, html FROM book_chapters WHERE book_file = ?', [d.book_file]);
    const changed = chapters.filter((c) => rename(c.html) !== c.html);
    const prefixChanged = rename(d.prefix) !== d.prefix;
    console.log('DB', d.book_file, '| chapters:', changed.length, '| prefix:', prefixChanged);
    if (!apply || (!changed.length && !prefixChanged)) continue;
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'db-' + d.book_file + '.json'), JSON.stringify({ doc: d, chapters: changed }), 'utf8');
    for (const c of changed) await db.run('UPDATE book_chapters SET html = ? WHERE id = ?', [rename(c.html), c.id]);
    if (prefixChanged) await db.run('UPDATE book_docs SET prefix = ? WHERE book_file = ?', [rename(d.prefix), d.book_file]);
    await db.run('UPDATE book_docs SET updated_at = ? WHERE book_file = ?', [Date.now(), d.book_file]);
  }
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });

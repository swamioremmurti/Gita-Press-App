// rename_shlok_color2.js -- the verse class Shlok-Color-2 becomes Shlok (same look; Shlok's red is #c10202, Shlok-Color-2's plain red).
//
// Whole class tokens only (Shlok-Color-2-1 and the like are other classes and stay). Covers every book file and the books stored in
// the database (book_docs / book_chapters); master.css keeps its now-unused p.Shlok-Color-2 rule.  Changed files are first copied to backups/before-shlok-color2-rename/ (DB rows as db-<book>.json).
//
//     node tools/rename_shlok_color2.js            # dry run
//     node tools/rename_shlok_color2.js --apply
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const OUT = path.join(ROOT, 'backups', 'before-shlok-color2-rename');
const MAP = { 'Shlok-Color-2': 'Shlok' };
const TOKEN = /(?<![\w-])(Shlok-Color-2)(?![\w-])/g;
const rename = (s) => s.replace(TOKEN, (m) => MAP[m]);
const apply = process.argv.includes('--apply');

let files = 0, hits = 0;
const targets = fs.readdirSync(BOOKS).filter((f) => /\.html?$/.test(f)).map((f) => path.join(BOOKS, f))
  ;
for (const f of targets) {
  const raw = fs.readFileSync(f, 'utf8');
  const n = (raw.match(TOKEN) || []).length;
  if (!n) continue;
  files++; hits += n;
  if (!apply) continue;
  fs.mkdirSync(OUT, { recursive: true });
  const b = path.join(OUT, path.basename(f));
  if (!fs.existsSync(b)) fs.copyFileSync(f, b);
  fs.writeFileSync(f, rename(raw));
}
console.log((apply ? 'renamed' : 'would rename') + ':', hits, 'uses in', files, 'files');

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

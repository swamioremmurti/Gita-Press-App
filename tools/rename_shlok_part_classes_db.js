// rename_shlok_part_classes_db.js -- the same char-style-override-14/15/16 -> Shlok-part-2/3/4 rename as tools/rename_shlok_part_classes.py, for the
// books whose text lives in the database (book_docs / book_chapters: books edited or created in the admin panel).  The rows are first saved to
// backups/before-shlok-part-rename/db-<book>.json.
//
//     node tools/rename_shlok_part_classes_db.js            # dry run
//     node tools/rename_shlok_part_classes_db.js --apply
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'server/lib/env')).loadEnv();
const db = require(path.join(ROOT, 'server/lib/db'));

const MAP = { 'char-style-override-14': 'Shlok-part-2', 'char-style-override-15': 'Shlok-part-3', 'char-style-override-16': 'Shlok-part-4' };
const TOKEN = /(?<![\w-])(char-style-override-1[456])(?![\w-])/g;
const rename = (s) => s.replace(TOKEN, (m) => MAP[m]);

(async () => {
  const apply = process.argv.includes('--apply');
  await db.init();
  const outDir = path.join(ROOT, 'backups', 'before-shlok-part-rename');
  const docs = await db.all('SELECT book_file, prefix FROM book_docs');
  for (const d of docs) {
    const chapters = await db.all('SELECT id, html FROM book_chapters WHERE book_file = ?', [d.book_file]);
    const changed = chapters.filter((c) => rename(c.html) !== c.html);
    const prefixChanged = rename(d.prefix) !== d.prefix;
    console.log(d.book_file, '| chapters to change:', changed.length, '| prefix:', prefixChanged);
    if (!apply || (!changed.length && !prefixChanged)) continue;
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'db-' + d.book_file + '.json'), JSON.stringify({ doc: d, chapters: changed }), 'utf8');
    for (const c of changed) await db.run('UPDATE book_chapters SET html = ? WHERE id = ?', [rename(c.html), c.id]);
    if (prefixChanged) await db.run('UPDATE book_docs SET prefix = ? WHERE book_file = ?', [rename(d.prefix), d.book_file]);
    await db.run('UPDATE book_docs SET updated_at = ? WHERE book_file = ?', [Date.now(), d.book_file]);   // a new value makes every cache fetch the renamed text
  }
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });

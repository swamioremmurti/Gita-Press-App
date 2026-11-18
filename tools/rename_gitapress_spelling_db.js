// rename_gitapress_spelling_db.js -- "गीता प्रेस के मूल ग्रंथ" -> "गीताप्रेस के मूल ग्रंथ" in the books whose text lives in the database
// (book_docs / book_chapters: books edited or created in the admin panel).  Changed rows are first saved to
// backups/before-gitapress-spelling/db-<book>.json.  chapter_versions (edit history) is left alone.
//
//     node tools/rename_gitapress_spelling_db.js            # dry run
//     node tools/rename_gitapress_spelling_db.js --apply
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'server/lib/env')).loadEnv();
const db = require(path.join(ROOT, 'server/lib/db'));

const FROM = 'गीता प्रेस के मूल ग्रंथ';
const TO = 'गीताप्रेस के मूल ग्रंथ';
const fix = (s) => (s || '').split(FROM).join(TO);

(async () => {
  const apply = process.argv.includes('--apply');
  await db.init();
  const outDir = path.join(ROOT, 'backups', 'before-gitapress-spelling');
  const docs = await db.all('SELECT book_file, prefix, suffix FROM book_docs');
  let total = 0;
  for (const d of docs) {
    const chapters = await db.all('SELECT id, html FROM book_chapters WHERE book_file = ?', [d.book_file]);
    const changed = chapters.filter((c) => fix(c.html) !== c.html);
    const prefixChanged = fix(d.prefix) !== d.prefix;
    const suffixChanged = fix(d.suffix) !== d.suffix;
    if (changed.length || prefixChanged || suffixChanged) total++;
    console.log(d.book_file, '| chapters to change:', changed.length, '| prefix:', prefixChanged, '| suffix:', suffixChanged);
    if (!apply || (!changed.length && !prefixChanged && !suffixChanged)) continue;
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'db-' + d.book_file + '.json'), JSON.stringify({ doc: d, chapters: changed }), 'utf8');
    for (const c of changed) {
      const html = fix(c.html);
      await db.run('UPDATE book_chapters SET html = ?, size = ? WHERE id = ?', [html, Buffer.byteLength(html, 'utf8'), c.id]);
    }
    if (prefixChanged) await db.run('UPDATE book_docs SET prefix = ? WHERE book_file = ?', [fix(d.prefix), d.book_file]);
    if (suffixChanged) await db.run('UPDATE book_docs SET suffix = ? WHERE book_file = ?', [fix(d.suffix), d.book_file]);
    // the page asks for /api/book-content?...&v=<updated_at>: a new value makes every cache fetch the corrected text
    await db.run('UPDATE book_docs SET updated_at = ? WHERE book_file = ?', [Date.now(), d.book_file]);
  }
  console.log(apply ? 'APPLIED' : 'DRY RUN', '| books affected:', total, 'of', docs.length);
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });

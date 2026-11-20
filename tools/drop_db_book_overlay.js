// drop_db_book_overlay.js -- remove the database copy (book_docs / book_chapters / chapter_versions) of books whose text now lives in the
// book files, so the site serves the files instead (the same thing the admin panel's "revert to original" does).  Everything removed is first
// saved to backups/before-db-overlay-removal/db-<book>.json.
//
//     node tools/drop_db_book_overlay.js "<book>.html" ["<book2>.html" ...]            # dry run
//     node tools/drop_db_book_overlay.js --apply "<book>.html" ...
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'server/lib/env')).loadEnv();
const db = require(path.join(ROOT, 'server/lib/db'));

(async () => {
  const apply = process.argv.includes('--apply');
  const files = process.argv.slice(2).filter((a) => a !== '--apply');
  if (!files.length) { console.log('give at least one book file name'); process.exit(1); }
  await db.init();
  const outDir = path.join(ROOT, 'backups', 'before-db-overlay-removal');
  for (const file of files) {
    const doc = await db.get('SELECT * FROM book_docs WHERE book_file = ?', [file]);
    const chapters = await db.all('SELECT * FROM book_chapters WHERE book_file = ? ORDER BY pos', [file]);
    const versions = await db.all('SELECT * FROM chapter_versions WHERE book_file = ?', [file]);
    console.log(file, '| doc row:', doc ? 'yes' : 'NO', '| chapters:', chapters.length, '| versions:', versions.length);
    if (!apply || !doc) continue;
    fs.mkdirSync(outDir, { recursive: true });
    const bak = path.join(outDir, 'db-' + file + '.json');
    fs.writeFileSync(bak, JSON.stringify({ doc, chapters, versions }), 'utf8');
    if (!fs.existsSync(bak) || fs.statSync(bak).size < 100) throw new Error('backup failed for ' + file);
    await db.getClient().batch([
      { sql: 'DELETE FROM chapter_versions WHERE book_file = ?', args: [file] },
      { sql: 'DELETE FROM book_chapters WHERE book_file = ?', args: [file] },
      { sql: 'DELETE FROM book_docs WHERE book_file = ?', args: [file] }
    ], 'write');
    console.log('   removed (backup', Math.round(fs.statSync(bak).size / 1024), 'KB)');
  }
  console.log(apply ? 'APPLIED' : 'DRY RUN');
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });

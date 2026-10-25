// classify_pravachan_tithi.js -- the date line under a talk's heading ("प्रवचन—तिथि आषाढ़ कृष्ण ४, संवत् २००१, शनिवार, प्रात:काल, वटवृक्ष, स्वर्गाश्रम")
// was typed in two unrelated styles (Nayash, Footnotes-Bold -- the latter even folded away as if it were a footnote).  Both become Shlok-Right,
// the library's reference line (right-aligned red italic).  Only paragraphs whose text starts with "प्रवचन—तिथि" are touched.
// Changed books are first copied to backups/before-tithi-class/; books stored in the database are listed (none had the line when this was written).
//
//     node tools/classify_pravachan_tithi.js            # dry run
//     node tools/classify_pravachan_tithi.js --apply
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const OUT = path.join(ROOT, 'backups', 'before-tithi-class');
const NEW = 'Shlok-Right';
const apply = process.argv.includes('--apply');
const LINE = /<p class="([^"]*)">((?:<span[^>]*>)*\s*प्रवचन\s*[—–-]\s*तिथि)/g;
const rename = (s) => s.replace(LINE, (m, cls, rest) => (cls.split(/\s+/).includes(NEW) ? m : '<p class="' + NEW + '">' + rest));

let books = 0, lines = 0;
for (const f of fs.readdirSync(BOOKS).filter((x) => /\.html?$/.test(x))) {
  const p = path.join(BOOKS, f);
  const raw = fs.readFileSync(p, 'utf8');
  const out = rename(raw);
  if (out === raw) continue;
  books++; lines += (raw.match(LINE) || []).length;
  if (apply) {
    fs.mkdirSync(OUT, { recursive: true });
    const b = path.join(OUT, f);
    if (!fs.existsSync(b)) fs.copyFileSync(p, b);
    fs.writeFileSync(p, out);
  }
}
console.log((apply ? 'changed' : 'would change') + ':', lines, 'lines in', books, 'books');

(async () => {
  require(path.join(ROOT, 'server/lib/env')).loadEnv();
  const db = require(path.join(ROOT, 'server/lib/db'));
  await db.init();
  for (const d of await db.all('SELECT book_file FROM book_docs')) {
    const chapters = await db.all('SELECT id, html FROM book_chapters WHERE book_file = ?', [d.book_file]);
    console.log('DB', d.book_file, '| chapters with the line:', chapters.filter((c) => rename(c.html) !== c.html).length);
  }
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });

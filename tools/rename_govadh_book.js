// rename_govadh_book.js -- the book "गोवध भारत का कलंक" (which already holds the chapter "गायका माहात्म्य") is renamed
// "गोवध भारतका कलंक एवं गायका माहात्म्य": the file, the title page and <title>, the catalogue entry, the cover entry; the old
// addresses (roman and Devanagari) open the renamed book.  Same recipe as a merge, minus the merging.
//
//     node tools/rename_govadh_book.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const OLD = 'गोवध भारत का कलंक.html';
const TITLE = 'गोवध भारतका कलंक एवं गायका माहात्म्य';
const NEW = TITLE + '.html';

const oldPath = path.join(BOOKS, OLD), newPath = path.join(BOOKS, NEW);
if (fs.existsSync(oldPath)) {
  let b = fs.readFileSync(oldPath, 'utf8');
  b = b.replace(/<title>[\s\S]*?<\/title>/, '<title>' + TITLE + ' : प्रथम पृष्ठ</title>')
    .replace(/(<p class="cover-Book-Name[^"]*">)[^<]*(<\/p>)/, (m, x, y) => x + TITLE + y);
  fs.writeFileSync(newPath, b);
  fs.unlinkSync(oldPath);
  console.log('renamed the file; title page and <title> updated');
}

const sub = (file, fn) => { const s = fs.readFileSync(file, 'utf8'); const o = fn(s); if (o !== s) { fs.writeFileSync(file, o); return true; } return false; };
console.log('catalogue:', sub(path.join(ROOT, 'swadhyay-data.js'), (s) => s.split('"file":  "' + OLD + '"').join('"file":  "' + NEW + '"')));
console.log('app:', sub(path.join(ROOT, 'swadhyay-app.js'), (s) => {
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  s = s.split('"' + OLD + '": "assets/covers/').join('"' + NEW + '": "assets/covers/');
  const anchor = '  var SLUG_ALIASES = {' + nl;
  if (!s.includes('"govadh-bharat-ka-kalank": "')) {
    s = s.replace(anchor, anchor + '    /* "' + TITLE + '" was "गोवध भारत का कलंक": the old addresses open it */' + nl +
      '    "govadh-bharat-ka-kalank": "' + NEW + '",' + nl + '    "गोवध-भारत-का-कलंक": "' + NEW + '",' + nl);
  }
  return s;
}));

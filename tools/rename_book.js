// rename_book.js -- rename one book: the file, its title page and <title>, the catalogue entry, the cover entry, and the old addresses
// (roman slug and Devanagari-hyphen form) which then open the renamed book.
//
//     node tools/rename_book.js "<old name>" "<new name>" "<old roman slug>"
//   e.g. node tools/rename_book.js "वासुदेव सर्वम्" "वासुदेवः सर्वम्" vasudev-sarvam
//
// The old roman slug is the last part of the book's address in the library (/book/<slug>).  Books kept in the database (admin panel) are not
// renamed here.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const [, , oldName, newName, oldSlug] = process.argv;
if (!oldName || !newName || !oldSlug) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 9).join('\n')); process.exit(1); }
const OLD = oldName + '.html', NEW = newName + '.html';
const oldPath = path.join(BOOKS, OLD), newPath = path.join(BOOKS, NEW);

if (fs.existsSync(oldPath)) {
  if (fs.existsSync(newPath)) throw new Error('a book called ' + NEW + ' already exists');
  let b = fs.readFileSync(oldPath, 'utf8');
  b = b.replace(/<title>[\s\S]*?<\/title>/, (m) => (/:\s*प्रथम पृष्ठ/.test(m) ? '<title>' + newName + ' : प्रथम पृष्ठ</title>' : '<title>' + newName + '</title>'))
    .replace(/(<p class="cover-Book-Name[^"]*">)([^<]*)(<\/p>)/, (m, x, t, y) => x + newName + y);
  fs.writeFileSync(newPath, b);
  fs.unlinkSync(oldPath);
  console.log('file renamed; title page and <title> updated');
} else console.log('no file called', OLD, '(already renamed?)');

const sub = (file, fn) => { const s = fs.readFileSync(file, 'utf8'); const o = fn(s); if (o !== s) { fs.writeFileSync(file, o); return true; } return false; };
console.log('catalogue entry:', sub(path.join(ROOT, 'swadhyay-data.js'), (s) => s.split('"file":  "' + OLD + '"').join('"file":  "' + NEW + '"')));
console.log('cover + aliases:', sub(path.join(ROOT, 'swadhyay-app.js'), (s) => {
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  s = s.split('"' + OLD + '": "assets/covers/').join('"' + NEW + '": "assets/covers/');
  const hy = oldName.trim().split(/\s+/).join('-');
  if (!s.includes('"' + oldSlug + '": "' + NEW + '"')) {
    const anchor = '  var SLUG_ALIASES = {' + nl;
    if (!s.includes(anchor)) throw new Error('SLUG_ALIASES not found');
    s = s.replace(anchor, anchor + '    /* "' + newName + '" was "' + oldName + '": the old addresses open it */' + nl +
      '    "' + oldSlug + '": "' + NEW + '",' + nl + '    "' + hy + '": "' + NEW + '",' + nl);
  }
  return s;
}));

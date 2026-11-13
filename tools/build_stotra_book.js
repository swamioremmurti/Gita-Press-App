// A structured stotra (tools/stotra-src/<slug>.json, made by tools/stotra_docx_to_json.py) -> its library book.
//
//   node tools/build_stotra_book.js gurvashtakam [more slugs...]      (no slug = every file in tools/stotra-src)
//
// Writes "Gita Press Books/Gita Press Books/<title>.html" and adds (or refreshes) the book's entry in swadhyay-data.js:
// library category "Stotra evam Naamavali", "stotra": "<stotra category key>", and the reader's अर्थ button ("swith_arth").
// The stotra viewer (/stotra/<slug>) and the /stotras page read the same book, so there is nothing else to register.
const fs = require('fs');
const path = require('path');
const F = require('../swadhyay-stotra-format.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'stotra-src');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const DATA = path.join(ROOT, 'swadhyay-data.js');

function entryText(file, st, sizeKB) {
  const q = (s) => JSON.stringify(s);
  // an Upanishad (or other text) shown in the stotra layout but not a stotra: "libraryCategory" in the JSON, and "stview" instead of "stotra"
  const lib = st.libraryCategory || '';
  const rows = [
    ['file', file], ['category', lib || F.LIBRARY_CATEGORY], ['author', st.author || ''], ['tikakar', ''], ['translator', ''],
    ['publisher', st.publisher || 'कल्याण सेवा ट्रस्ट'], lib ? ['stview', 'yes'] : ['stotra', st.category || 'other'], ['swith_arth', 'yes'], ['arth_hide', F.ARTH_HIDE]
  ].map(([k, v]) => '        ' + q(k) + ':  ' + q(v) + ',\n').join('');
  return '    {\n' + rows + '        "sizeKB":  ' + sizeKB + '\n    }';
}

function build(slug) {
  const st = JSON.parse(fs.readFileSync(path.join(SRC, slug + '.json'), 'utf8'));
  const file = st.title.replace(/¦/g, '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.html';
  const out = F.buildHtml(st).html;
  fs.writeFileSync(path.join(BOOKS, file), out, 'utf8');
  const sizeKB = Math.round(Buffer.byteLength(out, 'utf8') / 102.4) / 10;

  let data = fs.readFileSync(DATA, 'utf8');
  const crlf = data.includes('\r\n');
  if (crlf) data = data.replace(/\r\n/g, '\n');
  const at = data.indexOf('"file":  ' + JSON.stringify(file));
  const entry = entryText(file, st, sizeKB);
  if (at === -1) {
    const end = data.lastIndexOf('\n]');
    if (end === -1) throw new Error('swadhyay-data.js: the end of the list was not found');
    data = data.slice(0, end) + ',\n' + entry + data.slice(end);
  } else {
    const from = data.lastIndexOf('    {\n', at), to = data.indexOf('\n    }', at) + '\n    }'.length;
    data = data.slice(0, from) + entry + data.slice(to);
  }
  fs.writeFileSync(DATA, crlf ? data.replace(/\n/g, '\r\n') : data, 'utf8');
  console.log(file + ': ' + st.verses.length + ' verses, ' + sizeKB + ' KB, category ' + st.category);
}

const slugs = process.argv.slice(2);
(slugs.length ? slugs : fs.readdirSync(SRC).filter((f) => /\.json$/.test(f)).map((f) => f.replace(/\.json$/, ''))).forEach(build);

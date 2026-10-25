// merge_hetu_mahatma.js -- one book out of two:  "भगवान् का हेतु रहित सौहार्द"  +  "महात्मा किसे कहते हैं"  (both by श्रद्धेय श्रीजयदयालजी गोयन्दका, Gita Press)
//   ->  "भगवान‍्का हेतु रहित सौहार्द एवं महात्मा किसे कहते हैं ?"  (a no-break space keeps "न्" and "का" apart, so they neither merge nor split across lines)
// A file name cannot hold the "?", so the file is called "... कहते हैं.html" and the title is kept exactly as written through TITLE_OVERRIDES.
//
// Order inside the new book: title page (combined title), भगवान्का हेतुरहित सौहार्द (2 chapters), then महात्मा किसे कहते हैं (7 chapters),
// then the blank closing page.  The two books stay on disk but are hidden (HIDDEN_BOOKS); their old addresses open the new book (SLUG_ALIASES);
// the new book keeps the cover of the first.  Same recipe as merge_gita_padhne_tyag.py / merge_paralok_vairagya.js.
//
//     node tools/merge_hetu_mahatma.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const A = path.join(BOOKS, 'भगवान् का हेतु रहित सौहार्द.html');
const B = path.join(BOOKS, 'महात्मा किसे कहते हैं.html');
const TITLE = 'भगवान‍्का हेतु रहित सौहार्द एवं महात्मा किसे कहते हैं ?';
const NEW = 'भगवान् का हेतु रहित सौहार्द एवं महात्मा किसे कहते हैं.html';
const OUT = path.join(BOOKS, NEW);
const COVER = 'assets/covers/bhagavaan-kaa-hetu-rahit-sauhaard.webp';   // the first book's cover
const SECTION = /<section class="epub-page" data-page="\d+">([\s\S]*?)<\/section>/g;

const a = fs.readFileSync(A, 'utf8'), b = fs.readFileSync(B, 'utf8');
const sa = [...a.matchAll(SECTION)].map((m) => m[1]), sb = [...b.matchAll(SECTION)].map((m) => m[1]);
if (sa.length !== 4 || sb.length !== 9) throw new Error('unexpected structure: ' + sa.length + ' / ' + sb.length + ' sections');

const head = a.slice(0, a.indexOf('<body')).replace(/<title>[\s\S]*?<\/title>/, '<title>' + TITLE + '</title>');
const titlePage = sa[0].replace(/(<p class="cover-Book-Name[^"]*">)[^<]*(<\/p>)/, (m, x, y) => x + TITLE + y);
if (!titlePage.includes(TITLE)) throw new Error('title page not rewritten');
// chapter ids: the first book keeps Chapter_2 and 3; the second book's Chapter_2..8 become 4..10
const second = sb.slice(1, 8).map((s) => s.replace(/Chapter_(\d+)/g, (m, n) => 'Chapter_' + (+n + 2)));
const parts = [titlePage, sa[1], sa[2], ...second, sb[8]];
const hr = '\n\n<hr class="page-break">\n\n';
const out = head + '<body>\n\n' + parts.map((p, i) => '<section class="epub-page" data-page="' + (i + 1) + '">' + p + '</section>').join(hr) + '\n\n</body>\n</html>';
fs.writeFileSync(OUT, out);
console.log('wrote', NEW, (Buffer.byteLength(out) / 1024).toFixed(1) + ' KB', '| headings:',
  [...out.matchAll(/<p id="(Chapter_\d+)" class="Heading">([^<]*)<\/p>/g)].map((m) => m[1] + ' ' + m[2]).join(' | '));

// catalogue
let d = fs.readFileSync(path.join(ROOT, 'swadhyay-data.js'), 'utf8');
const nl = d.includes('\r\n') ? '\r\n' : '\n';
if (!d.includes('"file":  "' + NEW + '"')) {
  const size = (fs.statSync(OUT).size / 1024).toFixed(1);
  const entry = ['    {', '        "file":  "' + NEW + '",', '        "category":  "Pravachan",', '        "author":  "श्रद्धेय श्रीजयदयालजी गोयन्दका",',
    '        "tikakar":  "",', '        "translator":  "",', '        "publisher":  "गीताप्रेस",', '        "sizeKB":  ' + size, '    }'].join(nl);
  const tail = nl + '    }' + nl + '];';
  const i = d.lastIndexOf(tail);
  if (i < 0) throw new Error('catalogue tail');
  d = d.slice(0, i) + nl + '    },' + nl + entry + nl + '];' + d.slice(i + tail.length);
  fs.writeFileSync(path.join(ROOT, 'swadhyay-data.js'), d);
  console.log('registered in swadhyay-data.js');
}

// app: aliases, hidden, cover, title
let app = fs.readFileSync(path.join(ROOT, 'swadhyay-app.js'), 'utf8');
const anl = app.includes('\r\n') ? '\r\n' : '\n';
if (!app.includes('"bhagavan-ka-hetu-rahit-sauhard": "' + NEW + '"')) {
  const aliasAnchor = '  var SLUG_ALIASES = {' + anl;
  if (!app.includes(aliasAnchor)) throw new Error('SLUG_ALIASES');
  app = app.replace(aliasAnchor, aliasAnchor +
    '    /* the two books merged into "' + TITLE + '": their old addresses open it */' + anl +
    '    "bhagavan-ka-hetu-rahit-sauhard": "' + NEW + '",' + anl + '    "mahatma-kise-kahate-hain": "' + NEW + '",' + anl +
    '    "भगवान्-का-हेतु-रहित-सौहार्द": "' + NEW + '",' + anl + '    "महात्मा-किसे-कहते-हैं": "' + NEW + '",' + anl);
  const hid = '  var HIDDEN_BOOKS = {' + anl;
  if (!app.includes(hid)) throw new Error('HIDDEN_BOOKS');
  app = app.replace(hid, hid +
    '    "भगवान् का हेतु रहित सौहार्द.html": true,                         // merged into "' + TITLE + '"' + anl +
    '    "महात्मा किसे कहते हैं.html": true,                                 // (same)' + anl);
  const cov = '  var COVER_OVERRIDES = {' + anl;
  app = app.replace(cov, cov + '    "' + NEW + '": "' + COVER + '",' + anl);
  const tit = '  var TITLE_OVERRIDES = {' + anl;
  if (!app.includes(tit)) throw new Error('TITLE_OVERRIDES');
  app = app.replace(tit, tit + '    "' + NEW + '": "' + TITLE + '",' + anl);
  fs.writeFileSync(path.join(ROOT, 'swadhyay-app.js'), app);
  console.log('aliases, hidden, cover, title updated');
}

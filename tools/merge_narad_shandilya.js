// merge_narad_shandilya.js -- one book out of two:  "नारद भक्ति सूत्र"  +  "शाण्डिल्य भक्ति सूत्र"  (Gita Press)
//   ->  "नारद भक्ति सूत्र एवं शाण्डिल्य भक्ति सूत्र".
//
// Order inside the new book: title page (combined title), the नारद-भक्ति-सूत्र, the three अध्याय of the शाण्डिल्य-भक्ति-सूत्र (each with its two
// आह्निक), then the blank closing page.  The two books stay on disk but are hidden (HIDDEN_BOOKS); their old addresses open the new book
// (SLUG_ALIASES); the new book keeps the cover of the first and its title exactly as written (TITLE_OVERRIDES).  Same recipe as merge_prem_shok.js.
//
//     node tools/merge_narad_shandilya.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const A = path.join(BOOKS, 'नारद भक्ति सूत्र.html');
const B = path.join(BOOKS, 'शाण्डिल्य-भक्ति-सूत्र.html');
const TITLE = 'नारद भक्ति सूत्र एवं शाण्डिल्य भक्ति सूत्र';
const NEW = TITLE + '.html';
const OUT = path.join(BOOKS, NEW);
const COVER = 'assets/covers/naarad-bhakti-sootr.webp';   // the first book's cover
const SECTION = /<section class="epub-page" data-page="\d+">([\s\S]*?)<\/section>/g;

const a = fs.readFileSync(A, 'utf8'), b = fs.readFileSync(B, 'utf8');
const sa = [...a.matchAll(SECTION)].map((m) => m[1]), sb = [...b.matchAll(SECTION)].map((m) => m[1]);
if (sa.length !== 3 || sb.length !== 8) throw new Error('unexpected structure: ' + sa.length + ' / ' + sb.length + ' sections');

const head = a.slice(0, a.indexOf('<body')).replace(/<title>[\s\S]*?<\/title>/, '<title>' + TITLE + '</title>');
const titlePage = sa[0].replace(/(<p class="cover-Book-Name[^"]*">)[^<]*(<\/p>)/, (m, x, y) => x + TITLE + y);
if (!titlePage.includes(TITLE)) throw new Error('title page not rewritten');
// chapter ids: the first book keeps Chapter_2; the second book gets its own title heading (Chapter_3, like the first book's "नारद-भक्ति-सूत्र"),
// and its Chapter_2..4 (and their _1 / _2 sub-ids) become 4..6
const second = sb.slice(1, 7).map((x) => x.replace(/Chapter_(\d+)/g, (m, n) => 'Chapter_' + (+n + 2)));
second[0] = second[0].replace(/(<p class="Page-Break">[^<]*<\/p>\s*)/, (m) => m + '<p id="Chapter_3" class="Heading">शाण्डिल्य-भक्ति-सूत्र</p>\n\t\t\t');
if (!second[0].includes('id="Chapter_3" class="Heading"')) throw new Error('the शाण्डिल्य heading was not inserted');
const parts = [titlePage, sa[1], ...second, sa[2]];
const hr = '\n\n<hr class="page-break">\n\n';
const out = head + '<body>\n\n' + parts.map((p, i) => '<section class="epub-page" data-page="' + (i + 1) + '">' + p + '</section>').join(hr) + '\n\n</body>\n</html>';
fs.writeFileSync(OUT, out);
console.log('wrote', NEW, (Buffer.byteLength(out) / 1024).toFixed(1) + ' KB', '| headings:',
  [...out.matchAll(/<p id="(Chapter_[\d_]+)" class="(Heading|Sub-Heading)">(?:<span[^>]*>)?([^<]*)/g)].map((m) => m[1] + ' ' + m[3]).join(' | '));

// catalogue
let d = fs.readFileSync(path.join(ROOT, 'swadhyay-data.js'), 'utf8');
const nl = d.includes('\r\n') ? '\r\n' : '\n';
if (!d.includes('"file":  "' + NEW + '"')) {
  const size = (fs.statSync(OUT).size / 1024).toFixed(1);
  const entry = ['    {', '        "file":  "' + NEW + '",', '        "category":  "Siksha evam Katha",', '        "author":  "देवर्षि नारद एवं मुनिवर शाण्डिल्य",',
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
if (!app.includes('"narad-bhakti-sutra": "' + NEW + '"')) {
  const aliasAnchor = '  var SLUG_ALIASES = {' + anl;
  if (!app.includes(aliasAnchor)) throw new Error('SLUG_ALIASES');
  app = app.replace(aliasAnchor, aliasAnchor +
    '    /* the two books merged into "' + TITLE + '": their old addresses open it */' + anl +
    '    "narad-bhakti-sutra": "' + NEW + '",' + anl + '    "shandily-bhakti-sutra": "' + NEW + '",' + anl +
    '    "नारद-भक्ति-सूत्र": "' + NEW + '",' + anl + '    "शाण्डिल्य-भक्ति-सूत्र": "' + NEW + '",' + anl);
  const hid = '  var HIDDEN_BOOKS = {' + anl;
  if (!app.includes(hid)) throw new Error('HIDDEN_BOOKS');
  app = app.replace(hid, hid +
    '    "नारद भक्ति सूत्र.html": true,                                     // merged into "' + TITLE + '"' + anl +
    '    "शाण्डिल्य-भक्ति-सूत्र.html": true,                                // (same)' + anl);
  const cov = '  var COVER_OVERRIDES = {' + anl;
  app = app.replace(cov, cov + '    "' + NEW + '": "' + COVER + '",' + anl);
  const tit = '  var TITLE_OVERRIDES = {' + anl;
  if (!app.includes(tit)) throw new Error('TITLE_OVERRIDES');
  app = app.replace(tit, tit + '    "' + NEW + '": "' + TITLE + '",' + anl);
  fs.writeFileSync(path.join(ROOT, 'swadhyay-app.js'), app);
  console.log('aliases, hidden, cover, title updated');
}

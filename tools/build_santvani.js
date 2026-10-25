// build_santvani.js -- turn the epub extraction  "Extracted Book (5).html"  (calibre classes block_N, blob: pictures) into the library book
// "संतवाणी—ढाई हजार अनमोल बोल.html".
//
//   node tools/build_santvani.js            # dry run: prints what it found
//   node tools/build_santvani.js --apply    # writes the book and registers it in swadhyay-data.js
//
// The extraction has no usable styles: every paragraph is "block_N" and the two pictures are blob: addresses that were never saved, so they are dropped
// (the cover comes from the cover file the user supplies).  Structure and classes come from the context of each paragraph:
//   title page      -> cover-*                    (॥ श्रीहरि: ॥ / संत-वाणी / [ढाई हजार अनमोल बोल] / the verse / सम्पादक)
//   संत-वन्दना, निवेदन, संत-वाणी headings -> Heading (+ Sub-Heading for the subtitle line under संत-वाणी)
//   prose paragraphs, the 2500 numbered sayings, whatever class the epub gave them (block_20, _22, _24 ... _27) -> Normal
//   "—स्वामी शुद्धानन्द", the date and the signature of the निवेदन -> TXT-Right
//   "संत और संतवाणीकी जय-जय!" -> Chapter-End-Text
//   bold inside a saying (the epub's <b>) -> span.bold; every other span/style wrapper is dropped
// Then the library's house rules: master.css head, Chapter_N ids, publisher note, visarga colons fixed (tools/fix_visarga_colon.js), and a check that
// every class written exists in master.css.
const fs = require('fs');
const path = require('path');
const { fixText } = require('./fix_visarga_colon.js');

const SRC = 'C:/Users/megha/Downloads/Extracted Book (5).html';
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const NAME = 'संतवाणी—ढाई हजार अनमोल बोल';
const OUT = path.join(BOOKS, NAME + '.html');
const NOTE = 'गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।';
const apply = process.argv.includes('--apply');

const src = fs.readFileSync(SRC, 'utf8');
const inline = (h) => {
  let s = h.replace(/<br\b[^>]*>/g, ' ')
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/g, (m, t) => (/[\u0900-\u097Fa-zA-Z]/.test(t.replace(/<[^>]+>/g, '')) ? '<span class="bold">' + t.replace(/<[^>]+>/g, '') + '</span>' : t))
    .replace(/<(?!\/?span class="bold"|\/span>)[^>]+>/g, '')            // everything but our bold span
    .replace(/<span(?! class="bold")[^>]*>/g, '');
  // a span we kept is closed by </span>; stray closers of removed spans were taken out above only if they matched -- rebuild safely
  s = h.replace(/<br\b[^>]*>/g, ' ');
  const boldRuns = [];
  s = s.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/g, (m, t) => { const x = t.replace(/<[^>]+>/g, ''); boldRuns.push(x); return /[\u0900-\u097Fa-zA-Z]/.test(x) ? '\u0001' + (boldRuns.length - 1) + '\u0002' : x; });
  s = s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '\u00a0').replace(/[\r\n\t ]+/g, ' ').replace(/\u00a0+/g, '\u00a0');
  s = s.replace(/\u0001(\d+)\u0002/g, (m, i) => '<span class="bold">' + boldRuns[+i].replace(/\s+/g, ' ').trim() + '</span>');
  return s.trim();
};
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

// ---- paragraphs in order, with the section (epub file) each belongs to
const secs = [...src.matchAll(/<section class="epub-page" data-page="(\d+)">([\s\S]*?)<\/section>/g)].map((m) => ({ page: +m[1], html: m[2] }));
const items = [];
for (const s of secs) {
  for (const m of s.html.matchAll(/<(p|h1)\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    items.push({ page: s.page, tag: m[1], cls: m[2], html: inline(m[3]) });
  }
}
const get = (cls, page) => items.filter((x) => x.cls === cls && (page === undefined || x.page === page));

// ---- assemble
const sections = [];
let cur = null, headingNo = 0, subNo = 0;
const stats = {};
const count = (k) => (stats[k] = (stats[k] || 0) + 1);
const newSection = () => { cur = []; sections.push(cur); };
const push = (cls, html, id) => { cur.push('<p' + (id ? ' id="' + id + '"' : '') + ' class="' + cls + '">' + html + '</p>'); count(cls); };
const heading = (text) => { headingNo++; subNo = 0; push('Heading', text, 'Chapter_' + headingNo); };

// 1. title page (epub page 2)
newSection();
const sam = get('block_6', 2)[0], ed = get('block_7', 2)[0];
push('cover-Shri-Hari', '॥ श्रीहरि: ॥'.replace(' ॥', '॥'));
push('cover-Book-Name', get('block_1', 2)[0].html);
push('cover-subtitle', get('block_2', 2)[0].html);
push('cover-Tvamev-mata', '&nbsp;');
get('block_4', 2).forEach((x) => push('cover-Tvamev-mata', x.html.replace(/\s{2,}/g, ' ')));
push('cover-Tvamev-mata', '&nbsp;');
push('cover-Author-Name', sam.html + ' ' + ed.html);
push('cover-Publisher-Note', NOTE);

// 2. संत-वन्दना (epub page 3)
newSection();
{
  const p3 = items.filter((x) => x.page === 3);
  heading(p3[0].html);
  p3.slice(1).forEach((x) => {
    if (!plain(x.html)) return;
    push(/^—/.test(plain(x.html)) ? 'TXT-Right' : 'Normal', x.html);
  });
}
// 3. निवेदन (epub page 4)
newSection();
{
  const p4 = items.filter((x) => x.page === 4);
  heading(p4[0].html);
  p4.slice(1).forEach((x) => {
    if (!plain(x.html)) return;
    push(x.cls === 'block_15' || x.cls === 'block_16' ? 'TXT-Right' : 'Normal', x.html);
  });
}
// 4. the sayings (epub pages 5, 7, 9, 11 -- each its own section, as in the epub)
const sayingPages = [5, 7, 9, 11];
let expect = 1, gaps = [];
sayingPages.forEach((pg, k) => {
  newSection();
  const els = items.filter((x) => x.page === pg);
  if (k === 0) {
    push('Page-Break', '॥ श्रीहरि:॥'.replace(':॥', 'ः॥'));
    const t = els.find((x) => x.cls === 'block_8');
    heading(t.html);
    const sub = els.find((x) => x.tag === 'h1');
    subNo++; push('Sub-Heading', sub.html, 'Chapter_' + headingNo + '_' + subNo);
  }
  for (const x of els) {
    if (x.cls === 'block_' || x.cls === 'block_8' || x.tag === 'h1') continue;
    if (x.cls === 'block_28') { push('Chapter-End-Text', x.html); continue; }
    if (!plain(x.html)) continue;
    const n = (plain(x.html).match(/^([०-९]+)—/) || [])[1];
    const num = (d) => +[...d].map((c) => '०१२३४५६७८९'.indexOf(c)).join('');
    if (!n) {                                          // the epub broke a few sayings over two paragraphs (774, 1386): the rest joins the saying before
      const last = cur.length - 1;
      if (last < 0 || !/^<p class="Normal">/.test(cur[last])) { gaps.push('unnumbered: ' + plain(x.html).slice(0, 40)); push('Normal', x.html); continue; }
      cur[last] = cur[last].replace(/<\/p>$/, ' ' + x.html + '</p>');
      stats.joined = (stats.joined || 0) + 1;
      continue;
    }
    // two sayings can sit in one paragraph ("१०९४—... १०९५—..."): cut where the next number begins
    let rest = x.html;
    for (;;) {
      const v = num(n && (plain(rest).match(/^([०-९]+)—/) || [])[1]);
      if (v !== expect) gaps.push(expect + '→' + v);
      expect = v + 1;
      const nextNo = '०१२३४५६७८९'.split('');
      const nextStr = [...String(expect)].map((c) => nextNo[+c]).join('');
      const at = rest.indexOf(' ' + nextStr + '—');
      if (at > 0) { push('Normal', rest.slice(0, at).trim()); rest = rest.slice(at + 1); stats.split = (stats.split || 0) + 1; }
      else { push('Normal', rest); break; }
    }
  }
});

// ---- checks
let all = sections.flat().join('\n');
const css = fs.readFileSync(path.join(ROOT, 'master.css'), 'utf8');
const defined = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
['epub-page', 'page-break', 'Basic-Graphics-Frame'].forEach((x) => defined.add(x));
const used = new Set();
for (const m of all.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
const missing = [...used].filter((c) => !defined.has(c));
console.log({ sections: sections.length, headings: headingNo, sayings: expect - 1, numberingProblems: gaps, classes: [...used].sort().join(' '), missingClasses: missing });
console.log(stats);
if (missing.length) throw new Error('classes master.css does not have: ' + missing);
if (/blob:|calibre|block_|<span(?! class="bold")|गीता\s*सेवा/.test(all)) throw new Error('residue of the epub extraction is left');

const HEAD = `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${NAME}</title>
<link rel="stylesheet" href="../../master.css">
<style>
body {
  font-family: Georgia, "Noto Serif Devanagari", serif;
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  line-height: 1.6;
}
.page-break {
  margin: 2rem 0;
  border: none;
  border-top: 1px dashed #ccc;
}
.epub-page {
  margin-bottom: 1rem;
}
</style>
</head>

`;
const page = (s, i) => '<section class="epub-page" data-page="' + (i + 1) + '">\n<div class="Basic-Graphics-Frame">\n' + s.map((x) => '\t\t\t' + x).join('\n') + '\n\t\t</div>\n</section>';
let book = HEAD + '<body>\n' + sections.map(page).join('\n\n<hr class="page-break">\n\n') + '\n</body>\n</html>\n';
const fixed = fixText(book);
book = fixed.html;
console.log('visarga colons:', fixed.counts, '| colons left in text:', (book.replace(/<[^>]+>/g, '').match(/:/g) || []).length);
console.log('book size', (Buffer.byteLength(book) / 1024).toFixed(0) + ' KB');

if (apply) {
  fs.writeFileSync(OUT, book);
  console.log('written', NAME + '.html');
  let d = fs.readFileSync(path.join(ROOT, 'swadhyay-data.js'), 'utf8');
  const nl = d.includes('\r\n') ? '\r\n' : '\n';
  if (!d.includes('"file":  "' + NAME + '.html"')) {
    const size = (fs.statSync(OUT).size / 1024).toFixed(1);
    const entry = ['    {', '        "file":  "' + NAME + '.html",', '        "category":  "Pravachan",', '        "author":  "हनुमानप्रसाद पोद्दार",', '        "tikakar":  "",',
      '        "translator":  "",', '        "publisher":  "गीताप्रेस",', '        "sizeKB":  ' + size, '    }'].join(nl);
    const tail = nl + '    }' + nl + '];';
    const i = d.lastIndexOf(tail);
    if (i < 0) throw new Error('catalogue tail');
    fs.writeFileSync(path.join(ROOT, 'swadhyay-data.js'), d.slice(0, i) + nl + '    },' + nl + entry + nl + '];' + d.slice(i + tail.length));
    console.log('registered in swadhyay-data.js');
  }
}

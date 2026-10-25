// build_agnipuran.js -- turn the Word export  puran_agni.html  (+ its agni_puran_files/ pictures) into the library book "अग्निपुराण.html".
//
//   node tools/build_agnipuran.js            # dry run: prints what it found, writes nothing
//   node tools/build_agnipuran.js --apply    # writes the book and copies the pictures to image/agni-puran/
//
// The source is a Word "web page": every paragraph already carries a style name (Heading, Sub-Heading, TXT, Shlok, chapterEnd,
// MsoFootnoteText ...), wrapped in layers of <span>s, VML picture duplicates and Word footnote machinery.  Here:
//   * the structure is rebuilt from the style names and from the context of each paragraph (see classify());
//   * only classes master.css defines are used (the script stops if it would write another);
//   * Word's footnotes (all 315 sit at the end of the file) are put under the paragraph that cites them, marked [१] ... as the
//     reader's tap-to-open footnotes (swadhyay-footnotes.js) expect;
//   * the pictures are copied to image/agni-puran/ and the table of four pictures becomes four picture paragraphs;
//   * the house rules of the other Gita Press imports apply: master.css head, cover-* title page, publisher note, Chapter_N ids.
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/megha/Documents/GitHub/swadhyay/books/puran_agni.html';
const SRC_IMG = 'C:/Users/megha/Documents/GitHub/swadhyay/books/agni_puran_files/';
const ROOT = path.join(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const NAME = 'अग्निपुराण';
const IMG_DIR = 'image/agni-puran';
const NOTE = 'गीता प्रेस के मूल ग्रंथ — सरल एवं सुगम पठन के लिए नवीन प्रस्तुति।';
const apply = process.argv.includes('--apply');

const DEV = '०१२३४५६७८९';
const dev = (n) => String(n).replace(/\d/g, (d) => DEV[+d]);
const esc = (s) => s;

// ---------------------------------------------------------------- 1. clean the Word markup
let src = fs.readFileSync(SRC, 'utf8');
src = src
  .replace(/<!--\[if gte vml 1\][\s\S]*?<!\[endif\]-->/g, '')          // the VML copy of every picture (the <img> is the real one)
  .replace(/<!\[if !supportFootnotes\][\s\S]*?<!\[endif\]>/g, '')       // Word's own "[1]" inside a footnote reference
  .replace(/<!\[if !vml\]>|<!\[endif\]>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');
// the one numbered list: keep its number
src = src.replace(/<!\[if !supportLists\]>([\s\S]*?)<!\[endif\]>/g, (m, inner) => '\u0001' + inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() + '\u0002');

const fnStart = src.indexOf("<div style='mso-element:footnote-list'>");
if (fnStart < 0) throw new Error('footnote list not found');
const bodyHtml = src.slice(src.indexOf('<body'), fnStart);
const fnHtml = src.slice(fnStart);

// ---------------------------------------------------------------- 2. inline text
/* Converts the inside of one paragraph.  Keeps only: bold (span.bold), italic (span.rg-it), <sup>, the mantra character style (span.bold) and
   Word's footnote references (turned into the mark "[३५]").  Everything else (spans with fonts, anchors, <o:p> ...) is unwrapped. */
function inline(html) {
  html = html.replace(/<a\b[^>]*name="_ftnref(\d+)"[^>]*>[\s\S]*?<\/a>/g, (m, n) => '\u0003' + n + '\u0004');
  html = html.replace(/<a\b[^>]*name="_ftn\d+"[^>]*>\s*<\/a>/g, '');
  const out = [];
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:]*)\b([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { out.push(m[4]); continue; }
    const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3];
    if (tag === 'br') { out.push(' '); continue; }
    if (tag === 'img') continue;
    if (!close) {
      let keep = null;
      if (tag === 'b' || tag === 'strong') keep = '<span class="bold">';
      else if (tag === 'i' || tag === 'em') keep = '<span class="rg-it">';
      else if (tag === 'sup') keep = '<sup>';
      else if (tag === 'span' && /class\s*=\s*"?ShlokChar/.test(attrs)) keep = '<span class="bold">';
      if (!/\/\s*$/.test(attrs)) stack.push({ tag, keep });
      if (keep) out.push(keep);
    } else {
      let i = stack.length - 1;
      while (i >= 0 && stack[i].tag !== tag) i--;
      if (i < 0) continue;
      const [top] = stack.splice(i, stack.length - i);
      if (top.keep) out.push(top.keep.startsWith('<sup') ? '</sup>' : '</span>');
    }
  }
  while (stack.length) { const t = stack.pop(); if (t.keep) out.push(t.keep.startsWith('<sup') ? '</sup>' : '</span>'); }
  let s = out.join('')
    .replace(/&nbsp;/g, '\u00a0').replace(/\u2060/g, '')
    .replace(/[\r\n\t ]+/g, ' ').replace(/\u00a0\s+|\s+\u00a0/g, '\u00a0')
    .replace(/<span class="(?:bold|rg-it)">\s*<\/span>/g, '')
    .replace(/<\/span>(\s*)<span class="bold">/g, (m, sp) => sp)       // adjacent bold runs become one
    .replace(/<\/sup>\s*<sup>/g, '');
  s = s.replace(/\u00a0/g, '&nbsp;').replace(/&nbsp;(?=&nbsp;)/g, ' ').trim();
  return s;
}
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const FNMARK = /\u0003(\d+)\u0004/g;
const refsIn = (s) => [...s.matchAll(FNMARK)].map((m) => +m[1]);
const withMarks = (s) => s.replace(FNMARK, (m, n) => '[' + dev(n) + ']');

// ---------------------------------------------------------------- 3. footnotes
// a picture's class (img.frame-N, a width in % of the text) is the master.css one nearest to its width in the Word page
const FRAMES = { 100: 2, 98: 5, 94: 1, 69: 17, 64: 3, 63: 27, 62: 15, 61: 11, 60: 12, 59: 10, 58: 13, 56: 7, 55: 24, 54: 22, 52: 26, 51: 16, 48: 4, 47: 6, 46: 21, 45: 25, 44: 18, 43: 9, 42: 8, 41: 23, 40: 28, 39: 20, 37: 29 };
const TEXT_W = 650;   // the width, in the Word page, that a picture at "100%" would have
function frameFor(w) {
  const pct = Math.max(37, Math.min(100, (w / TEXT_W) * 100));
  let best = null;
  for (const [p, f] of Object.entries(FRAMES)) if (!best || Math.abs(p - pct) < Math.abs(best[0] - pct)) best = [+p, f];
  return 'frame-' + best[1];
}
const notes = new Map();
const noteImgs = new Set();
for (const m of fnHtml.matchAll(/<div style='mso-element:footnote' id=ftn(\d+)>([\s\S]*?)<\/div>/g)) {
  const paras = [...m[2].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((p) => {
    const pics = [...p[1].matchAll(/<img\b([^>]*)>/g)].map((i) => {        // a picture inside a note stays inside the note
      const file = ((i[1].match(/src="([^"]*)"/) || [])[1] || '').split('/').pop();
      if (!fs.existsSync(SRC_IMG + file)) throw new Error('picture missing: ' + file);
      noteImgs.add(file);
      return '<img class="' + frameFor(+((i[1].match(/width=(\d+)/) || [])[1] || 0)) + '" src="' + IMG_DIR + '/' + file + '" alt="">';
    });
    return (inline(p[1]) + (pics.length ? ' ' + pics.join(' ') : '')).trim();
  }).filter((x) => plain(x) || /<img/.test(x));
  notes.set(+m[1], paras);
}
const noteHtml = (n) => {
  const paras = notes.get(n);
  if (!paras || !paras.length) throw new Error('footnote ' + n + ' has no text');
  return paras.map((p, i) => '<p class="Footnotes">' + (i === 0 ? '[' + dev(n) + '] ' : '') + withMarks(p) + '</p>');
};

// ---------------------------------------------------------------- 4. blocks
const blocks = [];
const BLOCK = /<p\b([^>]*)>([\s\S]*?)<\/p>|<h4\b[^>]*>([\s\S]*?)<\/h4>/g;
let bm;
while ((bm = BLOCK.exec(bodyHtml))) {
  if (bm[3] !== undefined) { blocks.push({ kind: 'h4', html: bm[3] }); continue; }
  const attrs = bm[1], inner = bm[2];
  const cls = ((attrs.match(/class\s*=\s*"?\s*([A-Za-z][\w-]*)/) || [])[1] || '').trim();
  const imgs = [...inner.matchAll(/<img\b([^>]*)>/g)].map((i) => ({
    file: ((i[1].match(/src="([^"]*)"/) || [])[1] || '').split('/').pop(),
    w: +((i[1].match(/width=(\d+)/) || [])[1] || 0),
    alt: (i[1].match(/alt="([^"]*)"/) || [])[1] || ''
  }));
  const style = (attrs.match(/style=(?:'([^']*)'|"([^"]*)")/) || [])[1] || '';
  const align = /align=center|text-align:\s*center/.test(attrs + style) ? 'center' : /align=right|text-align:\s*right/.test(attrs + style) ? 'right' : '';
  blocks.push({ kind: 'p', cls, html: inner, imgs, align });
}

// ---------------------------------------------------------------- 5. classify and assemble
const sections = [];
let pendingPics = [];
function pictureLine(im) {
  if (!fs.existsSync(SRC_IMG + im.file)) throw new Error('picture missing: ' + im.file);
  used.add(im.file);
  const alt = /^(Generated image|.*: Photo)$/.test(im.alt) ? '' : im.alt;
  count('Image');
  return '<p class="Image"><span><img class="' + frameFor(im.w) + '" src="' + IMG_DIR + '/' + im.file + '" alt="' + alt + '"></span>&nbsp;</p>';
}
function flushPics() { pendingPics.forEach((im) => cur.push(pictureLine(im))); pendingPics = []; }
let cur = null, headingNo = 0, subNo = 0, h4No = 0, prevKind = '', prevWasPicture = false, lastShlok = false;
const used = new Set();
const stats = {};
const count = (k) => (stats[k] = (stats[k] || 0) + 1);
const newSection = () => { cur = []; sections.push(cur); };
const push = (s) => cur.push(s);
const afterNotes = (html) => refsIn(html).flatMap(noteHtml).forEach(push);

newSection();
// title page
push('<p class="cover-Shri-Hari">॥ श्रीहरिः॥</p>');
push('<p class="cover-Book-Name">' + NAME + '</p>');
push('<p class="cover-Tvamev-mata">&nbsp;</p>');
['त्वमेव माता च पिता त्वमेव', 'त्वमेव बन्धुश्च सखा त्वमेव।', 'त्वमेव विद्या द्रविणं त्वमेव', 'त्वमेव सर्वं मम देवदेव॥'].forEach((l) => push('<p class="cover-Tvamev-mata">' + l + '</p>'));
push('<p class="cover-Tvamev-mata">&nbsp;</p>');
push('<p class="cover-Publisher-Note">' + NOTE + '</p>');

let mainTitleDone = false, titleSeen = 0;
for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i];
  if (b.kind === 'h4') {
    h4No++;
    push('<p id="Chapter_' + headingNo + '_' + Math.max(subNo, 1) + '_' + h4No + '" class="Sub-Heading-2">' + withMarks(inline(b.html)) + '</p>');
    afterNotes(inline(b.html)); count('Sub-Heading-2'); lastShlok = false; continue;
  }
  const html = inline(b.html);
  const text = plain(withMarks(html));
  const next = blocks[i + 1];

  if (b.cls === 'Title') {                                   // the first is the book's name on the cover (already written); the second is the main title above chapter 1
    titleSeen++;
    if (titleSeen === 2) {                                   // it gets its own contents entry, so chapter 1's heading moves up one number
      const h = cur.findIndex((x) => /class="Heading"/.test(x));
      const k = +cur[h].match(/id="Chapter_(\d+)"/)[1];
      cur[h] = cur[h].replace('id="Chapter_' + k + '"', 'id="Chapter_' + (k + 1) + '"');
      cur.splice(h, 0, '<p id="Chapter_' + k + '" class="Heading Main-Heading">' + NAME + '</p>'); headingNo++; count('Main-Heading');
    }
    continue;
  }
  if (b.cls === 'Heading') {
    if (!(cur.length && cur.every((x) => /class="Page-Break"/.test(x)))) newSection();     // the opening invocations share chapter 1's page
    headingNo++; subNo = 0; h4No = 0;
    push('<p id="Chapter_' + headingNo + '" class="Heading">' + withMarks(html) + '</p>');
    afterNotes(html); count('Heading'); lastShlok = false; prevKind = 'Heading';
    pendingPics = b.imgs.slice();                            // a picture anchored in a heading (chapter 200) follows the chapter's title
    continue;
  }
  if (b.cls === 'Sub-Heading') {
    subNo++; h4No = 0;
    push('<p id="Chapter_' + headingNo + '_' + subNo + '" class="Sub-Heading">' + withMarks(html) + '</p>');
    afterNotes(html); count('Sub-Heading'); lastShlok = false; flushPics(); continue;
  }
  if (b.cls === 'MsoQuote') {                                 // the opening invocations: each one stands at the top of its own page, as in the other books
    if (!/Page-Break/.test(cur[cur.length - 1] || '') || cur.length > 2) newSection();
    push('<p class="Page-Break">' + withMarks(html).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ') + '</p>'); count('Page-Break'); continue;
  }
  if (pendingPics.length) flushPics();
  if (b.imgs.length) {                                        // a picture paragraph
    for (const im of b.imgs) push(pictureLine(im));
    if (text) { push('<p class="Normal center">' + withMarks(html) + '</p>'); count('caption'); afterNotes(html); }
    prevWasPicture = true; lastShlok = false; continue;
  }
  if (!text && !refsIn(html).length) continue;                // empty paragraph

  let cls;
  if (b.cls === 'chapterEnd') cls = 'Chapter-End-Text';
  else if (b.cls === 'Shlok' && /सम्पूर्ण/.test(text) && !next) cls = 'Chapter-End-Text';
  else if (b.cls === 'Shlok' && /सम्पूर्ण\s*॥?$/.test(text) && /अग्निपुराण/.test(text)) cls = 'Chapter-End-Text';
  else if (b.cls === 'Shlok') cls = lastShlok && /^\([^)]{2,70}\)$/.test(text) ? 'Shlok-Right' : 'Shlok';
  else if (b.cls === 'MsoListParagraph') cls = 'Normal';
  else if (b.align === 'right' || /^—\s*प्रकाशक/.test(text)) cls = 'TXT-Right';
  else if (b.cls === '' && b.align === 'center' && /^॥.*॥$/.test(text)) cls = 'Page-Break';
  else if (b.align === 'center') {
    const caption = prevWasPicture || /\[अग्नि० अ०/.test(text);
    if (caption) cls = 'Normal center';
    else if (text.length < 280 && /[।॥]/.test(text) && !/^\(/.test(text)) cls = 'Shlok';      // a verse typed as a centred body paragraph
    else if (text.length < 90) cls = 'Normal center';
    else cls = 'Normal';
  } else cls = 'Normal';

  let out = html;
  if (b.cls === 'MsoListParagraph') {                          // Word's list number was in the part that is stripped; put it back
    const num = (b.html.match(/\u0001([^\u0002]*)\u0002/) || [])[1];
    out = (num ? num + ' ' : '') + out.replace(/\u0001[^\u0002]*\u0002/g, '');
  }
  out = out.replace(/\u0001[^\u0002]*\u0002/g, '');
  const line = '<p class="' + cls + '">' + (cls === 'Page-Break' ? withMarks(out).replace(/&nbsp;/g, ' ') : withMarks(out)) + '</p>';
  if (cls === 'Page-Break' && cur.length && /^<p id="Chapter_\d+" class="Heading"/.test(cur[0])) cur.unshift(line);   // an invocation belongs above its heading
  else push(line);
  count(cls);
  afterNotes(html);
  prevWasPicture = false;
  lastShlok = cls === 'Shlok' || cls === 'Shlok-Right';
}

// ---------------------------------------------------------------- 5b. the editor's "*" notes
/* The source types these notes as ordinary paragraphs ("* आधे जुएको युगार्द्ध कहते हैं।") some distance below the paragraph that carries
   the "*" ("... युगार्द्धोंका* परिमाण ..."), not as Word footnotes.  Each one becomes a Footnotes paragraph placed directly under the
   paragraph that holds its star (the nearest one above that still has a star without a note), where the reader links the "*" to it. */
const STAR_NOTE = /^<p class="Normal">\*\s*(?=\S)/;
const starCount = (line) => (line.replace(/^<p[^>]*>/, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').match(/(?<=\S)\*/g) || []).length;
const starStats = { moved: 0, strayDropped: 0, unmatched: [] };
for (const sec of sections) {
  const notesHere = sec.filter((l) => STAR_NOTE.test(l) || l === '<p class="Normal">*</p>');
  if (!notesHere.length) continue;
  const body = sec.filter((l) => !notesHere.includes(l));
  const attached = new Map();                         // citing paragraph -> notes already placed under it
  for (const n of notesHere) {
    if (n === '<p class="Normal">*</p>') { starStats.strayDropped++; continue; }     // a lone "*" with no text
    const at = sec.indexOf(n);
    let home = -1;
    for (let i = at - 1; i >= 0; i--) {
      const l = sec[i];
      if (notesHere.includes(l) || /class="Footnotes"/.test(l)) continue;
      const free = starCount(l) - (attached.get(l) || []).length;
      if (free > 0) { home = i; break; }
    }
    if (home < 0) {
      /* the one note that is typed twice ("* ... है। १. ... है।") and cited by a printed "१" after a closing quote, not a star:
         keep the "१." half, and give the printed digit a <sup> so the reader can link it */
      const dup = plain(n).match(/^\*\s*(.+?)\s+१\.\s+(.+)$/);
      let cite = -1;
      for (let i = at - 1; i >= 0 && dup; i--) if (/[’”]१(?![०-९])/.test(sec[i])) { cite = i; break; }
      if (dup && cite >= 0) {
        const oldLine = sec[cite], newLine = oldLine.replace(/([’”])१(?![०-९])/, '$1<sup>१</sup>');
        body[body.indexOf(oldLine)] = newLine; sec[cite] = newLine;
        (attached.get(newLine) || attached.set(newLine, []).get(newLine)).push('<p class="Footnotes">१. ' + dup[2] + '</p>');
        starStats.moved++; continue;
      }
      starStats.unmatched.push(plain(n).slice(0, 50)); body.splice(body.indexOf(sec[at - 1]) + 1 || body.length, 0, n.replace('class="Normal"', 'class="Footnotes"')); continue;
    }
    const l = sec[home];
    (attached.get(l) || attached.set(l, []).get(l)).push(n.replace('class="Normal"', 'class="Footnotes"'));
    starStats.moved++;
  }
  // rebuild: body paragraphs in order, each followed by the notes attached to it (after any numbered notes already under it)
  const rebuilt = [];
  for (let i = 0; i < body.length; i++) {
    rebuilt.push(body[i]);
    const extra = attached.get(body[i]);
    if (extra) {
      while (body[i + 1] && /class="Footnotes"/.test(body[i + 1])) rebuilt.push(body[++i]);
      rebuilt.push(...extra);
    }
  }
  sec.length = 0; sec.push(...rebuilt);
}
console.log('star notes:', starStats.moved, 'placed;', starStats.strayDropped, 'stray "*" dropped;', starStats.unmatched.length, 'without a star above:', starStats.unmatched);

// ---------------------------------------------------------------- 6. checks
const css =fs.readFileSync(path.join(ROOT, 'master.css'), 'utf8');
const defined = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
['epub-page', 'page-break', 'Basic-Graphics-Frame'].forEach((x) => defined.add(x));
const all = sections.flat().join('\n');
const usedClasses = new Set();
for (const m of all.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && usedClasses.add(c));
const missing = [...usedClasses].filter((c) => !defined.has(c));
const marksInText = new Set([...all.matchAll(/\[([०-९]+)\]/g)].map((m) => m[1]));
const notesWritten = (all.match(/<p class="Footnotes">\[/g) || []).length;
console.log({ sections: sections.length, headings: headingNo, notesWritten, of: notes.size, pictures: used.size, picturesInNotes: noteImgs.size, classes: [...usedClasses].sort().join(' '), missingClasses: missing });
console.log(stats);
if (missing.length) throw new Error('classes master.css does not have: ' + missing);
if (notesWritten !== notes.size) throw new Error('footnotes: wrote ' + notesWritten + ' of ' + notes.size);
if (/गीता\s*सेवा|Gita-Seva|toc_marker|MsoFootnote|mso-|<span[^>]*style/.test(all)) throw new Error('Word residue or a Gita Seva trace is left');

// ---------------------------------------------------------------- 7. write
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
const book = HEAD + '<body>\n' + sections.map(page).join('\n\n<hr class="page-break">\n\n') + '\n</body>\n</html>\n';
console.log('book size', (Buffer.byteLength(book) / 1024).toFixed(0) + ' KB');
if (apply) {
  fs.mkdirSync(path.join(BOOKS, IMG_DIR), { recursive: true });
  for (const f of new Set([...used, ...noteImgs])) fs.copyFileSync(SRC_IMG + f, path.join(BOOKS, IMG_DIR, f));
  fs.writeFileSync(path.join(BOOKS, NAME + '.html'), book);
  console.log('written', NAME + '.html');
}

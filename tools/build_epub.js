/* Turns one of the site's book files (Gita Press Books/*.html) into an EPUB 3 (with an EPUB 2 table of contents too, for old readers).
 *
 *   node tools/build_epub.js <book.html> <out.epub> --title="..." --author="..." [--publisher="..."] [--lang=hi]
 *
 * What it does with the book file:
 *   - every <hr class="page-break"> starts a new page file (p0000.xhtml ...), the same cut the site's reader uses
 *   - the book's own contents list (<ol class="toc-list">) becomes the EPUB navigation; links between pages are rewritten to point at the right file
 *   - the font written into the file's head (ChanakyaUni, base64) is saved as a font file and embedded
 *   - the book's pictures (image/...) are copied in; the rest of the head style plus master.css become one stylesheet
 *   - HTML is turned into strict XHTML (closed tags, numeric entities) and every file is checked to be well-formed before the book is written
 * Nothing in the site's files is changed.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const args = process.argv.slice(2);
const pos = args.filter(a => !a.startsWith('--'));
const opt = k => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
if (pos.length < 2) { console.error('usage: node build_epub.js <book.html> <out.epub> --title=... --author=...'); process.exit(2); }
const SRC = path.resolve(pos[0]), OUT = path.resolve(pos[1]);
const TITLE = opt('title') || path.basename(SRC, '.html');
const COVER = opt('cover') ? path.resolve(opt('cover')) : '';
const AUTHOR = opt('author'), PUBLISHER = opt('publisher'), LANG = opt('lang') || 'hi';
const MASTER_CSS = path.resolve(__dirname, '..', 'master.css');

const html = fs.readFileSync(SRC, 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- 1. style and font out of the head --------------------------------------------------------------------
const sS = html.indexOf('<style>') + 7, sE = html.indexOf('</style>');
let headCss = html.slice(sS, sE);
const FONT_FILES = ['NotoSerifDevanagari-Regular.woff2', 'NotoSerifDevanagari-Bold.woff2'];
headCss = headCss.replace(/@font-face\s*\{[^}]*\}/g, '');   // the book's own embedded fonts are left out
// the site's page styling (body width, dashed page lines) does not belong in a book
headCss = headCss.replace(/\n\s*body \{[^}]*\}/, '').replace(/\n\s*html \{[^}]*\}/, '').replace(/\n\s*\.(?:epub-)?page \{[^}]*\}/, '').replace(/\n\s*\.page-break \{[^}]*\}/, '');
let masterCss = fs.existsSync(MASTER_CSS) ? fs.readFileSync(MASTER_CSS, 'utf8') : '';
masterCss = masterCss.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/size-adjust:[^;]*;/g, '');
const css = FONT_FILES.map((f, i) => '@font-face { font-family: "NotoSerifDevanagari"; src: url(fonts/' + f + ') format("woff2"); font-weight: ' + (i ? 'bold' : 'normal') + '; font-style: normal; }\n').join('') +
  'body { margin: 0; padding: 0 0.6em; font-family: "NotoSerifDevanagari", serif; }\n' +
  masterCss + '\n' + headCss;

// ---- 2. body into pages -------------------------------------------------------------------------------------
let body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
body = body.replace(/<a\b[^>]*toc-float-btn[\s\S]*?<\/a>/g, '');          // the floating "contents" button of the web page
let parts = body.split(/<hr\s*\/?>|<hr class="page-break"\s*\/?>/).map(p => p.trim()).filter(p => p.length);
// the book's own contents page is not part of the EPUB text: readers show the navigation (nav.xhtml) instead
const tocIds = [];
parts = parts.filter(p => { if (/<section class="toc"/.test(p)) { for (const m of p.matchAll(/\sid="([^"]+)"/g)) tocIds.push(m[1]); return false; } return true; });
// the cover page becomes the cover picture
if (COVER) parts[0] = '<section class="cover-page"><img src="images/cover.jpg" alt="' + esc(TITLE) + '" style="max-width:100%;max-height:100vh;height:auto"/></section>';

const VOID = new Set(['br', 'hr', 'img', 'meta', 'link', 'input', 'col']);
const NAMED = { nbsp: 160, copy: 169, laquo: 171, raquo: 187, ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, ldquo: 8220, rdquo: 8221, hellip: 8230, bull: 8226, zwj: 8205, zwnj: 8204 };
function toXhtml(frag) {
  frag = frag.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => (['amp', 'lt', 'gt', 'quot', 'apos'].includes(n) ? m : NAMED[n] ? '&#' + NAMED[n] + ';' : m));
  frag = frag.replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|(?:amp|lt|gt|quot|apos);)/g, '&amp;');
  return frag.replace(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g, (m, close, name, attrs, self) => {
    const n = name.toLowerCase();
    if (close) return VOID.has(n) ? '' : '</' + n + '>';
    attrs = attrs.replace(/\s+$/, '');
    if (VOID.has(n) || self) return '<' + n + attrs + '/>';
    return '<' + n + attrs + '>';
  });
}

// the book has wrapper <div>/<section> that open in one page and close in a later one: balance each page on its own
function balance(x) {
  const stack = [];
  x = x.replace(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g, (m, close, name, a, self) => {
    if (self) return m;
    if (!close) { stack.push(name); return m; }
    const i = stack.lastIndexOf(name);
    if (i < 0) return '';
    let out = '';
    while (stack.length - 1 > i) out += '</' + stack.pop() + '>';
    stack.pop();
    return out + m;
  });
  while (stack.length) x += '</' + stack.pop() + '>';
  return x;
}

// every id -> the page it lives in
const fileOf = i => 'p' + String(i).padStart(4, '0') + '.xhtml';
const idToFile = {};
parts.forEach((p, i) => { for (const m of p.matchAll(/\sid="([^"]+)"/g)) if (!(m[1] in idToFile)) idToFile[m[1]] = fileOf(i); });

for (const id of tocIds) idToFile[id] = 'nav.xhtml';
let badLinks = 0;
const imagesUsed = new Set();
const missingPics = [];
function rewrite(frag, here) {
  frag = frag.replace(/href="#([^"]*)"/g, (m, id) => {
    const f = idToFile[id];
    if (!f) { badLinks++; return 'href="#' + id + '"'; }
    return 'href="' + (f === here ? '' : f) + '#' + id + '"';
  });
  frag = frag.replace(/<img\b(?![^>]*images\/cover\.jpg)[^>]*?src="(?:\.\/)?image\/([^"]+)"[^>]*>/g, (m, n) => {
    const d = decodeURIComponent(n);
    if (!fs.existsSync(path.join(path.dirname(SRC), 'image', d))) { if (!missingPics.includes(d)) missingPics.push(d); return ''; }
    imagesUsed.add(d); return m.replace(/src="(?:\.\/)?image\//, 'src="images/');
  });
  return frag;
}

// ---- 3. well-formedness check ------------------------------------------------------------------------------
function checkXml(s, label) {
  const stack = [], errs = [];
  const re = /<!DOCTYPE[^>]*>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|[<&]/g;
  let m;
  while ((m = re.exec(s))) {
    const t = m[0];
    if (t === '<') { errs.push(label + ': stray "<" at ' + m.index); continue; }
    if (t === '&') {
      if (!/^&(?:#\d+|#x[0-9a-fA-F]+|amp|lt|gt|quot|apos);/.test(s.slice(m.index, m.index + 12))) errs.push(label + ': bad entity near ' + JSON.stringify(s.slice(m.index, m.index + 12)));
      continue;
    }
    if (!m[2]) continue;
    if (m[1]) { const top = stack.pop(); if (top !== m[2]) errs.push(label + ': </' + m[2] + '> closes <' + top + '>'); }
    else if (!m[4]) stack.push(m[2]);
    const names = [...m[3].matchAll(/\s([\w:.-]+)\s*=/g)].map(x => x[1]);
    if (new Set(names).size !== names.length) errs.push(label + ': repeated attribute in <' + m[2] + '>');
    if (errs.length > 5) break;
  }
  if (stack.length) errs.push(label + ': unclosed <' + stack.join('><') + '>');
  return errs;
}

// ---- 4. pages -----------------------------------------------------------------------------------------------
const xhtmlHead = (title) => '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="' + LANG + '" xml:lang="' + LANG + '">\n<head>\n<meta charset="utf-8"/>\n<title>' + esc(title) + '</title>\n<link rel="stylesheet" type="text/css" href="style.css"/>\n</head>\n<body>\n';
const pageTitle = p => { const m = /<p class="(?:Heading|Sub-Heading)[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(p); return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) || TITLE : TITLE; };

const files = {};            // path inside the epub -> Buffer
const problems = [];
parts.forEach((p, i) => {
  const name = fileOf(i);
  const xml = xhtmlHead(pageTitle(p)) + balance(toXhtml(rewrite(p, name))) + '\n</body>\n</html>\n';
  problems.push(...checkXml(xml, name));
  files['OEBPS/' + name] = Buffer.from(xml, 'utf8');
});

// ---- 5. navigation from the book's own contents list ------------------------------------------------------------
const tocM = /<ol class="toc-list">[\s\S]*?<\/ol>\s*<\/section>/.exec(body);
function parseToc(frag) {
  const root = { kids: [] }, stack = [root];
  const re = /<ol\b[^>]*>|<\/ol>|<li>|<\/li>|<a href="#([^"]*)">([\s\S]*?)<\/a>/g;
  let m, cur = null;
  while ((m = re.exec(frag))) {
    const t = m[0];
    if (t.startsWith('<a')) { const node = { id: m[1], text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), kids: [] }; stack[stack.length - 1].kids.push(node); cur = node; }
    else if (t.startsWith('<ol')) { if (cur) stack.push(cur); }
    else if (t === '</ol>') { if (stack.length > 1) stack.pop(); }
  }
  return root.kids;
}
const tocTree = tocM ? parseToc(tocM[0]) : [];
const hrefOf = id => (idToFile[id] || fileOf(0)) + '#' + id;
function navOl(nodes, ind) {
  return ind + '<ol>\n' + nodes.map(n => ind + '  <li><a href="' + hrefOf(n.id) + '">' + esc(n.text) + '</a>' + (n.kids.length ? '\n' + navOl(n.kids, ind + '    ') + ind + '  ' : '') + '</li>\n').join('') + ind + '</ol>\n';
}
const nav = xhtmlHead(TITLE).replace('<body>', '<body>') +
  '<nav epub:type="toc" id="toc"><h1>' + esc('विषय-सूची') + '</h1>\n' + navOl(tocTree, '') + '</nav>\n</body>\n</html>\n';
problems.push(...checkXml(nav, 'nav.xhtml'));
files['OEBPS/nav.xhtml'] = Buffer.from(nav, 'utf8');

const uid = 'urn:uuid:' + (() => { const h = crypto.createHash('sha1').update(TITLE + '|' + AUTHOR).digest('hex'); return [h.slice(0, 8), h.slice(8, 12), '5' + h.slice(13, 16), '8' + h.slice(17, 20), h.slice(20, 32)].join('-'); })();
let playOrder = 0;
function ncxPoints(nodes, ind) {
  return nodes.map(n => { const id = 'np' + (++playOrder); return ind + '<navPoint id="' + id + '" playOrder="' + playOrder + '"><navLabel><text>' + esc(n.text) + '</text></navLabel><content src="' + hrefOf(n.id) + '"/>' + (n.kids.length ? '\n' + ncxPoints(n.kids, ind + '  ') + ind : '') + '</navPoint>\n'; }).join('');
}
const ncx = '<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n<head><meta name="dtb:uid" content="' + uid + '"/><meta name="dtb:depth" content="2"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>\n<docTitle><text>' + esc(TITLE) + '</text></docTitle>\n<navMap>\n' + ncxPoints(tocTree, '  ') + '</navMap>\n</ncx>\n';
problems.push(...checkXml(ncx, 'toc.ncx'));
files['OEBPS/toc.ncx'] = Buffer.from(ncx, 'utf8');

// ---- 6. package ------------------------------------------------------------------------------------------------
files['OEBPS/style.css'] = Buffer.from(css, 'utf8');
FONT_FILES.forEach(f => { files['OEBPS/fonts/' + f] = fs.readFileSync(path.resolve(__dirname, '..', 'fonts', f)); });
if (COVER) files['OEBPS/images/cover.jpg'] = fs.readFileSync(COVER);
const imgDir = path.join(path.dirname(SRC), 'image');
const MT = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' };
const imgList = [];
for (const n of imagesUsed) {
  const p = path.join(imgDir, n);
  if (!fs.existsSync(p)) { problems.push('missing picture: ' + n); continue; }
  files['OEBPS/images/' + n] = fs.readFileSync(p); imgList.push(n);
}
const manifest = [
  '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
  '<item id="css" href="style.css" media-type="text/css"/>',
  ...FONT_FILES.map((f, i) => '<item id="font' + i + '" href="fonts/' + f + '" media-type="font/woff2"/>'),
  COVER ? '<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>' : '',
  ...imgList.map((n, i) => '<item id="img' + i + '" href="images/' + esc(n) + '" media-type="' + (MT[path.extname(n).slice(1).toLowerCase()] || 'application/octet-stream') + '"/>'),
  ...parts.map((_, i) => '<item id="p' + i + '" href="' + fileOf(i) + '" media-type="application/xhtml+xml"/>')
].filter(Boolean).map(x => '    ' + x).join('\n');
const spine = parts.map((_, i) => '    <itemref idref="p' + i + '"/>').join('\n');
const opf = '<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="' + LANG + '">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
  '    <dc:identifier id="bookid">' + uid + '</dc:identifier>\n    <dc:title>' + esc(TITLE) + '</dc:title>\n    <dc:language>' + LANG + '</dc:language>\n' +
  (AUTHOR ? '    <dc:creator>' + esc(AUTHOR) + '</dc:creator>\n' : '') + (PUBLISHER ? '    <dc:publisher>' + esc(PUBLISHER) + '</dc:publisher>\n' : '') +
  (COVER ? '    <meta name="cover" content="cover-image"/>\n' : '') + '    <meta property="dcterms:modified">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</meta>\n  </metadata>\n  <manifest>\n' + manifest + '\n  </manifest>\n  <spine toc="ncx">\n' + spine + '\n  </spine>\n</package>\n';
problems.push(...checkXml(opf, 'content.opf'));
files['OEBPS/content.opf'] = Buffer.from(opf, 'utf8');
files['META-INF/container.xml'] = Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n</container>\n');

// ---- 7. zip (mimetype first and stored, as the format requires) -----------------------------------------------------
function zip(entries) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [name, data, store] of entries) {
    const nameB = Buffer.from(name, 'utf8');
    const body = store ? data : zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(store ? 0 : 8, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);              // fixed time/date (1980-01-01)
    lh.writeUInt32LE(crc >>> 0, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameB.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, nameB, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(store ? 0 : 8, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc >>> 0, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, nameB);
    offset += lh.length + nameB.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cd, end]);
}

if (problems.length) { console.error('NOT WRITTEN: ' + problems.length + ' problem(s)'); console.error(problems.slice(0, 12).join('\n')); process.exit(1); }
const entries = [['mimetype', Buffer.from('application/epub+zip'), true]];
for (const k of Object.keys(files).sort()) entries.push([k, files[k], false]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, zip(entries));
console.log('pages:', parts.length, '| contents entries:', playOrder, '| pictures:', imgList.length, '| fonts:', FONT_FILES.length, '| links to missing ids:', badLinks);
if (missingPics.length) console.log('pictures named in the book but not in its image folder (left out):', missingPics.join(', '));
console.log('written', OUT, (fs.statSync(OUT).size / 1048576).toFixed(2) + ' MB');

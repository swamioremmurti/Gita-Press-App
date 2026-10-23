// Book text as the admin panel's chapter editor sees it.
//
// A book file is one HTML document; the reader cuts it into chapters at every <hr class="page-break">
// (swadhyay-app.js: splitBookChapters). The editor uses the same cut, so "chapter N" means the same piece
// in both places. A document is stored as   prefix + chapter + <hr> + chapter ... + suffix
// where prefix is everything up to and including <body ...> and suffix is </body></html>.
//
// Where the original text comes from (only needed the first time a book is opened in the editor):
//   1. the book file on disk            (local server)
//   2. BOOKS_CDN_URL/<file>             (books uploaded to a CDN; set in the environment)
//   3. the site's own URL               (Vercel: the book files are static files, not part of the API bundle)
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'Gita Press Books', 'Gita Press Books');
const PAGE_BREAK = '<hr class="page-break">';
const PAGE_BREAK_RE = /<hr[^>]*\bclass=["']page-break["'][^>]*>/ig;

function splitDoc(html) {
  html = String(html || '');
  const open = html.match(/<body[^>]*>/i);
  let prefix = '', body = html, suffix = '';
  if (open) {
    const start = open.index + open[0].length;
    const close = html.toLowerCase().lastIndexOf('</body>');
    prefix = html.slice(0, start);
    body = html.slice(start, close === -1 ? html.length : close);
    suffix = close === -1 ? '' : html.slice(close);
  }
  let chapters = body.split(PAGE_BREAK_RE).map((s) => s.trim()).filter((s) => s.length > 0);
  if (!chapters.length) chapters = [''];
  return { prefix, chapters, suffix };
}

function joinDoc(prefix, chapters, suffix) {
  return (prefix || '') + '\n' + chapters.join('\n\n' + PAGE_BREAK + '\n\n') + '\n' + (suffix || '');
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

// The label the reader would show for this chapter: its Heading / Book-Name / Chapter-Number, else a Sub-Heading, else the first words.
function chapterTitle(html) {
  if (html.length > 60000) html = html.slice(0, 60000);   // the heading is at the top; never scan a 4 MB chapter for it
  const found = {};
  const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html))) {
    const c = m[1].match(/class=["']([^"']*)["']/i);
    if (!c) continue;
    c[1].split(/\s+/).forEach((tok) => { if (!found[tok]) { const t = stripTags(m[2]); if (t) found[tok] = t; } });
    if (found.Heading) break;
  }
  for (const cls of ['Heading', 'Title-Page---Book-Name', 'Chapter-Number', 'Sub-Heading']) {
    if (found[cls]) return found[cls].slice(0, 120);
  }
  const plain = stripTags(html);
  return plain ? plain.slice(0, 60) + (plain.length > 60 ? '…' : '') : '(empty chapter)';
}

function blankBook(title) {
  const t = String(title || 'New book').replace(/[<>&]/g, '');
  const prefix = '<!DOCTYPE html>\n<html lang="hi">\n<head>\n<meta charset="UTF-8">\n<title>' + t + '</title>\n' +
    '<link rel="stylesheet" href="../../master.css">\n<style>\n  body { max-width: 900px; margin: 0 auto; padding: 1rem; }\n</style>\n</head>\n<body>';
  const first = '<p class="Titel-Page---Shri-Hari">॥ ॐ श्रीपरमात्मने नमः ॥</p>\n<p class="Title-Page---Book-Name">' + t + '</p>';
  const second = '<p class="Heading">Chapter 1</p>\n<p class="TXT">Start writing here.</p>';
  return { prefix, chapters: [first, second], suffix: '</body>\n</html>' };
}

function originOf(req) {
  const proto = (req && req.headers && req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const host = req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host);
  return host ? proto + '://' + host : '';
}

function bookUrlPath(file) {
  return 'Gita Press Books/Gita Press Books/' + file.split('/').map(encodeURIComponent).join('/');
}

async function readFromHttp(url, cookie) {
  const res = await fetch(url, { headers: cookie ? { cookie } : {} });
  if (!res.ok) throw new Error('Could not read ' + url + ' (HTTP ' + res.status + ')');
  return res.text();
}

/** The original (file) text of a catalogue book. */
async function loadOriginalHtml(file, req) {
  if (!file || file.includes('..') || /[\\/]/.test(file)) throw new Error('Bad book file name');
  const local = path.join(BOOKS_DIR, file);
  if (local.startsWith(BOOKS_DIR) && fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  const cdn = (process.env.BOOKS_CDN_URL || '').replace(/\/+$/, '');
  if (cdn) return readFromHttp(cdn + '/' + file.split('/').map(encodeURIComponent).join('/'));
  const origin = originOf(req);
  if (!origin) throw new Error('The book file is not on this server and no site address is known');
  // the pre-launch password gate also protects the book files: pass the admin's own cookies along
  return readFromHttp(origin + '/' + bookUrlPath(file), req && req.headers && req.headers.cookie);
}

/** Any small static file of the site (e.g. assets/data/v1/gita/ch01.json): disk first, then the site's own URL. */
async function readSiteFile(rel, req) {
  const clean = String(rel).replace(/^\/+/, '');
  if (clean.includes('..')) throw new Error('Bad path');
  const local = path.join(PROJECT_ROOT, clean);
  if (local.startsWith(PROJECT_ROOT) && fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  const origin = originOf(req);
  if (!origin) throw new Error('File not found: ' + clean);
  return readFromHttp(origin + '/' + clean.split('/').map(encodeURIComponent).join('/'), req && req.headers && req.headers.cookie);
}

module.exports = {
  PROJECT_ROOT, BOOKS_DIR, PAGE_BREAK, splitDoc, joinDoc, chapterTitle, stripTags, blankBook,
  loadOriginalHtml, readSiteFile, originOf
};

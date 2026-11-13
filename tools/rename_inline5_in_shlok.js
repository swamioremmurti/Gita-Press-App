// span.inline-5 -> span.Shlok, only inside Shlok paragraphs (a <p> whose class has a token starting with "Shlok", any case).
// inline-5 is a plain "font-size:1em" reset span; in a Shlok paragraph it carries the verse, so it is named Shlok there (2026-11-12).
// Spans in Normal and other paragraphs keep inline-5.
//
//   node tools/rename_inline5_in_shlok.js          dry run: counts per paragraph class
//   node tools/rename_inline5_in_shlok.js --write  backs the changed books up to backups/before-inline5-shlok/, then rewrites them
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BOOKS = path.join(ROOT, 'Gita Press Books', 'Gita Press Books');
const BACKUP = path.join(ROOT, 'backups', 'before-inline5-shlok');
const write = process.argv.includes('--write');

const byClass = {};
let files = 0, spans = 0;
for (const f of fs.readdirSync(BOOKS)) {
  if (!f.endsWith('.html')) continue;
  const file = path.join(BOOKS, f);
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('inline-5')) continue;
  let n = 0;
  const out = html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/g, (all, attrs, inner) => {
    const cm = attrs.match(/\bclass="([^"]*)"/);
    if (!cm || !cm[1].split(/\s+/).some((t) => /^shlok/i.test(t))) return all;
    const inner2 = inner.replace(/(<span\b[^>]*\bclass=")([^"]*)(")/g, (m, a, cls, z) => {
      const toks = cls.split(/\s+/);
      if (!toks.includes('inline-5')) return m;
      n++;
      byClass[cm[1]] = (byClass[cm[1]] || 0) + 1;
      return a + toks.map((t) => (t === 'inline-5' ? 'Shlok' : t)).join(' ') + z;
    });
    return inner2 === inner ? all : '<p' + attrs + '>' + inner2 + '</p>';
  });
  if (!n) continue;
  files++; spans += n;
  if (write) {
    fs.mkdirSync(BACKUP, { recursive: true });
    fs.copyFileSync(file, path.join(BACKUP, f));
    fs.writeFileSync(file, out, 'utf8');
  }
}
console.log((write ? 'rewrote ' : 'would rewrite ') + spans + ' spans in ' + files + ' books');
console.log(Object.entries(byClass).sort((a, b) => b[1] - a[1]));

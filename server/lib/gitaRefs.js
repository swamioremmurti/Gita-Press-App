// Direct Bhagavad Gita verse lookup for the chat: "gita 6.2", "chapter 6 shlok 2", "अध्याय ६ श्लोक २", "छठे अध्याय का दूसरा श्लोक".
// Reads server/rag/gita_refs.json, built by `node rag-generator/gita_refs.js` (verse blocks of Sadhak Sanjeevani and
// the two Tattva Vivechani books). No embedding is involved, so the vector index is not affected.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'rag', 'gita_refs.json');
const VERSES = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78];
// characters of each book's block passed to the model (the shloka and its translation come first)
const CAP = [+process.env.GITA_CHARS_SS || 4500, +process.env.GITA_CHARS_TVH || 4500, +process.env.GITA_CHARS_TVP || 3000];

let cache;
function load() {
  if (cache === undefined) {
    try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { cache = null; }
  }
  return cache;
}
function available() { return !!load(); }

// Chapter / verse numbers written as words. Stems, so "छठे", "छठा", "छठवें" all match.
const ORD = [
  ['पहल|प्रथम|first|1st', 1], ['दूसर|द्वितीय|second|2nd', 2], ['तीसर|तृतीय|third|3rd', 3], ['चौथ|चतुर्थ|fourth|4th', 4],
  ['पाँचव|पांचव|पञ्चम|पंचम|fifth|5th', 5], ['छठ|षष्ठ|sixth|6th', 6], ['सातव|सप्तम|seventh|7th', 7], ['आठव|अष्टम|eighth|8th', 8],
  ['नौव|नवम|ninth|9th', 9], ['दसव|दशम|tenth|10th', 10], ['ग्यारहव|एकादश|eleventh|11th', 11], ['बारहव|द्वादश|twelfth|12th', 12],
  ['तेरहव|त्रयोदश|thirteenth|13th', 13], ['चौदहव|चतुर्दश|fourteenth|14th', 14], ['पंद्रहव|पन्द्रहव|पञ्चदश|पंचदश|fifteenth|15th', 15],
  ['सोलहव|षोडश|sixteenth|16th', 16], ['सत्रहव|सत्तरहव|सप्तदश|seventeenth|17th', 17], ['अठारहव|अष्टादश|eighteenth|18th', 18]
];
const ORD_ALT = ORD.map(o => o[0]).join('|');
function ordValue(s) {
  s = String(s).toLowerCase();
  if (/^\d+$/.test(s)) return +s;
  for (const [pat, n] of ORD) if (new RegExp('^(?:' + pat + ')').test(s)) return n;
  return 0;
}

const CTX = /gita|geeta|गीता|shlok|sloka|श्लोक|adhyay|अध्याय|chapter|verse|bhagavad|bhagwad|भगवद्|भगवत्/i;
const NUM = '(?<!\\d)(\\d{1,2}(?!\\d)|(?:' + ORD_ALT + ')\\S{0,6})';
const CH = '(?:chapter|adhyaya|adhyay|अध्याय)';
const SL = '(?:shloka|shlok|sloka|slok|verse|श्लोक)';
const GAP = '[^\\d\\n]{0,24}?';

// each form captures [chapter, verse] in this order unless flagged
const FORMS = [
  { re: new RegExp(CH + '\\s*' + NUM + GAP + SL + 's?\\s*' + NUM, 'g') },                    // chapter 6 shlok 2 / अध्याय ६ श्लोक २
  { re: new RegExp(NUM + '\\S{0,3}\\s*' + CH + GAP + NUM + '\\S{0,3}\\s*' + SL, 'g') },      // छठे अध्याय का दूसरा श्लोक
  { re: new RegExp(CH + '\\s*' + NUM + GAP + NUM + '\\S{0,3}\\s*' + SL, 'g') },              // adhyay 6 ka 2 shlok
  { re: new RegExp(SL + 's?\\s*' + NUM + GAP + CH + '\\s*' + NUM, 'g'), swap: true }         // shlok 2 of chapter 6
];

function find(message) {
  if (!CTX.test(message)) return [];
  const t = String(message).replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d)).replace(/[।॥|]/g, '.').toLowerCase();
  const found = [];
  const add = (c, v) => {
    c = ordValue(c); v = ordValue(v);
    if (c >= 1 && c <= 18 && v >= 1 && v <= VERSES[c - 1] && !found.some(f => f[0] === c && f[1] === v)) found.push([c, v]);
  };
  let m;
  for (const f of FORMS) {
    f.re.lastIndex = 0;
    while ((m = f.re.exec(t))) f.swap ? add(m[2], m[1]) : add(m[1], m[2]);
  }
  // "6.2", "6:2", "6/2", "6-2", "6, 2", "६।२"
  const dotted = /(?:^|[^\d.])(\d{1,2})\s*[.:/,\-]\s*(\d{1,3})(?!\d)/g;
  while ((m = dotted.exec(t))) add(m[1], m[2]);
  return found.slice(0, 3);
}

/** Verse blocks for each found reference: [{ label, text, title, bookId, file }] */
function blocks(refs) {
  const g = load(); const out = [];
  if (!g) return out;
  for (const [c, v] of refs) {
    for (const i of g.index[c + '.' + v] || []) {
      const e = g.entries[i], b = g.books[e.b];
      const text = e.text.length > CAP[e.b] ? e.text.slice(0, CAP[e.b]).replace(/\s+\S*$/, '') + ' …' : e.text;
      out.push({ label: b.title + ', अध्याय ' + c + ' श्लोक ' + v + ', पृष्ठ ' + e.page, text, title: b.title, bookId: b.bookId, file: b.file });
    }
  }
  return out;
}

module.exports = { available, find, blocks };

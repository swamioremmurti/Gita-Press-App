#!/usr/bin/env node
/*
 * Gita verse index: chapter.verse -> the book's own text for that shloka.
 *
 * Reads the three Bhagavad Gita books (Sadhak Sanjeevani, Tattva Vivechani, Tattva Vivechani padchhed-anvay),
 * cuts each book into shloka blocks (shloka + translation + word meanings + commentary) and writes
 * server/rag/gita_refs.json. The chat uses it to answer "gita 6.2", "chapter 6 shlok 2", "अध्याय ६ श्लोक २"
 * by looking the verse up directly, with no embedding involved (so the vector index is untouched).
 *
 *   node rag-generator/gita_refs.js            build + validate (prints the verse count of every chapter)
 *   node rag-generator/gita_refs.js --show 6.2 print what is stored for a verse
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { inlineText } = require('./rag_gen');

const APP_ROOT = path.resolve(__dirname, '..');
const BOOK_DIR = path.join(APP_ROOT, 'Gita Press Books', 'Gita Press Books');
const OUT = path.join(APP_ROOT, 'server', 'rag', 'gita_refs.json');
const CHUNKS = path.join(APP_ROOT, 'server', 'rag', 'chunks.jsonl');

const BOOKS = [
  { file: 'श्रीमद्भगवद्गीता_साधक_संजीवनी.html', mode: 'ss' },
  { file: 'श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html', mode: 'tvh' },
  { file: 'श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html', mode: 'tvp' }
];
const VERSES = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78];

const dev = s => +String(s).replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
const NUM = '[०-९0-9]+';
// shloka number at the end of a line: "॥१", "॥ १॥", "॥४-५॥"
const END_NUM = new RegExp('॥\\s*(' + NUM + ')(?:\\s*[-–—]\\s*(' + NUM + '))?\\s*॥?[\\s*†‡⁎]*(?:\\[' + NUM + '\\][\\s*]*)*$');
const HEAD_NUM = new RegExp('^\\(\\s*श्लोक\\s*[-–—]?\\s*(' + NUM + ')(?:[\\s,\\-–—और]+(' + NUM + '))?[^)]*\\)\\s*$');

function paragraphs(html) {
  const out = [];
  const re = /<section\b[^>]*data-page="(\d+)"[^>]*>|<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let m, page = 0;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) { page = +m[1]; continue; }
    const cls = (/class="([^"]*)"/.exec(m[2]) || [, ''])[1].trim();
    const text = inlineText(m[3]);
    if (text) out.push({ cls, text, page });
  }
  return out;
}

function parseBook(book) {
  const paras = paragraphs(fs.readFileSync(path.join(BOOK_DIR, book.file), 'utf8'));
  const entries = [];
  let chapter = 0, expected = 1, cur = null, pending = [], cand = null;

  const isPrefix = p => /^(Sambandh|Uwach|Uvach|Uvaacha)$/i.test(p.cls) ||
    (book.mode === 'ss' && /^Sub-Heading$/i.test(p.cls) && /^[०-९]+(\s*[-–]\s*[०-९]+)?\s/.test(p.text));
  const isShlok = p => /^Shlok(\s+center-tight)?$/i.test(p.cls);

  function open(from, to, paras) {
    cur = { ch: chapter, from, to, page: paras[0].page, paras: paras.slice() };
    entries.push(cur);
    expected = to + 1;
  }
  function flushPending() { if (pending.length && cur) cur.paras.push(...pending); pending = []; }
  function flushCand() { if (cand && cur) cur.paras.push(...cand); cand = null; }

  for (const p of paras) {
    // chapter heading
    if (/^Heading$/i.test(p.cls) && /ध्यायः\s*$/.test(p.text) && /^अथ/.test(p.text)) {
      cur = null; pending = []; cand = null; chapter++; expected = 1; continue;
    }
    if (!chapter) continue;

    if (book.mode === 'tvh') {
      const h = HEAD_NUM.exec(p.text.split('\n')[0]);      // "(श्लोक-१)"; its class varies (Shlok-Number, Shlok, overrides)
      if (h) {
        let from = dev(h[1]), to = h[2] ? dev(h[2]) : from;
        if (from < expected) { from = expected; to = Math.max(to, from); }    // a misprinted number in the book: trust the sequence
        open(from, Math.max(from, to), pending.concat([p]));
        pending = [];
        continue;
      }
      if (isPrefix(p)) { pending.push(p); continue; }
      flushPending();
      if (cur) cur.paras.push(p);
      continue;
    }

    // ss / tvp: the shloka lines carry the number on the last line
    // `pending` is the run of consecutive shloka-like paragraphs (intro, speaker, shloka lines, padchhed lines).
    // The run becomes a verse when one of its lines ends with the number we expect next; otherwise it is a quoted
    // shloka inside commentary and is appended to the current verse.
    if (isPrefix(p) || isShlok(p) || (/^Shlok-L$/i.test(p.cls) && p.text.length < 400)) {
      pending.push(p);
      const n = p.text.length < 300 && END_NUM.exec(p.text);
      if (n) {
        const from = dev(n[1]), to = n[2] ? dev(n[2]) : from;
        if (from === expected) { open(from, Math.max(from, to), pending); pending = []; }
      }
      continue;
    }
    flushPending();
    if (cur) cur.paras.push(p);
  }
  return entries.map(e => ({ ch: e.ch, from: e.from, to: e.to, page: e.page, text: e.paras.map(x => x.text).join('\n') }));
}

function bookMeta() {
  const meta = {};
  const lines = fs.readFileSync(CHUNKS, 'utf8').split('\n');
  for (const l of lines) {
    if (!l) continue;
    const m = /"file":"([^"]+)","bookId":(\d+),"title":"([^"]+)"/.exec(l);
    if (m && !meta[m[1]]) meta[m[1]] = { bookId: +m[2], title: JSON.parse('"' + m[3] + '"') };
    if (Object.keys(meta).length >= BOOKS.length + 4) break;
  }
  return meta;
}

function main() {
  const argv = process.argv.slice(2);
  const meta = bookMeta();
  const books = [], entries = [], index = {};
  BOOKS.forEach((b, bi) => {
    const mm = meta[b.file] || {};
    books.push({ file: b.file, bookId: mm.bookId, title: mm.title || b.file });
    const es = parseBook(b);
    const have = {};
    es.forEach(e => {
      const idx = entries.length;
      entries.push({ b: bi, ch: e.ch, from: e.from, to: e.to, page: e.page, text: e.text });
      for (let v = e.from; v <= e.to; v++) { const k = e.ch + '.' + v; (index[k] = index[k] || []).push(idx); have[k] = 1; }
    });
    // validation against the known verse count of each chapter
    const missing = [];
    VERSES.forEach((n, ci) => { for (let v = 1; v <= n; v++) if (!have[(ci + 1) + '.' + v]) missing.push((ci + 1) + '.' + v); });
    console.log(path.basename(b.file) + ': ' + es.length + ' blocks, ' + Object.keys(have).length + '/700 verses' + (missing.length ? ', missing: ' + missing.join(' ') : ''));
  });
  if (argv[0] === '--show') {
    (index[argv[1]] || []).forEach(i => { const e = entries[i]; console.log('\n=== ' + books[e.b].title + ' ' + e.ch + '.' + e.from + (e.to > e.from ? '-' + e.to : '') + ' (पृष्ठ ' + e.page + ', ' + e.text.length + ' chars)\n' + e.text.slice(0, 1800)); });
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify({ books, entries, index }), 'utf8');
  console.log('wrote ' + OUT + ' (' + (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB)');
}

main();

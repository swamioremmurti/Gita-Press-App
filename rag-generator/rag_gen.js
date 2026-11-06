#!/usr/bin/env node
/*
 * RAG data generator for the Swadhyay / Gita Press book library.
 *
 * Standalone, zero dependencies (Node >= 18). Reads book HTML files in the library's
 * standard format and writes retrieval-ready chunks (JSONL) for an AI question-answering
 * pipeline. It does NOT call any embedding API -- feed `embed_text` of each chunk to
 * whatever embedding model you choose (Voyage, OpenAI, bge-m3, ...).
 *
 *   node rag_gen.js build                     incremental build of every book in the books folder
 *   node rag_gen.js build --files "a.html,b.html"   only these books (new books: just drop the HTML in the folder)
 *   node rag_gen.js build --force             rebuild everything
 *   node rag_gen.js validate                  quality report (empty books, coverage, size spread)
 *   node rag_gen.js inspect "<book.html>"     print the chunks of one book
 *   node rag_gen.js export [--format csv|embed]   CSV for Excel/pandas, or {id,text} JSONL ready for an embedding model
 *   node rag_gen.js search "प्रश्न" [-k 5]     lexical (BM25) sanity-check search over the output
 *
 * See README.md for the output format.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GENERATOR_VERSION = 2;
const APP_ROOT = path.resolve(__dirname, '..');

const DEFAULTS = {
  books: path.join(APP_ROOT, 'Gita Press Books', 'Gita Press Books'),
  out: path.join(__dirname, 'output'),
  catalog: path.join(APP_ROOT, 'swadhyay-data.js'),
  appjs: path.join(APP_ROOT, 'swadhyay-app.js'),
  target: 900,      // chars: flush a chunk once it is at least this big and the next unit would not fit comfortably
  max: 1500,        // chars: hard ceiling for a chunk's main text
  min: 350,         // chars: do not flush on a sub-heading below this size
  overlap: 120,     // chars of trailing prose repeated at the start of the next chunk (0 = off)
  includeToc: false
};

// ------------------------------------------------------------------ small helpers --

const sha1 = s => crypto.createHash('sha1').update(s).digest('hex');
const nfc = s => s.normalize('NFC');
const ZW = /[​‌‍⁠﻿]/g;

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** Inline HTML -> plain text. <br> becomes a newline; everything else is flattened. */
function inlineText(html) {
  let s = html
    .replace(/<a\b[^>]*toc-float-btn[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  return nfc(s).split('\n').map(l => l.replace(/[ \t  ]+/g, ' ').trim()).filter(Boolean).join('\n');
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '--include-toc') o.includeToc = true;
    else if (a === '--no-prune') o.noPrune = true;
    else if (a === '-k') o.k = +argv[++i];
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}

function resolveOptions(a) {
  const o = Object.assign({}, DEFAULTS);
  for (const k of ['books', 'out', 'catalog', 'appjs']) if (a[k]) o[k] = path.resolve(a[k]);
  for (const k of ['target', 'max', 'min', 'overlap']) if (a[k] !== undefined) o[k] = +a[k];
  if (a.includeToc) o.includeToc = true;
  return o;
}

// ------------------------------------------------------- catalogue / title metadata --

/** Extract the balanced [...] literal following `marker`, respecting JSON strings. */
function extractArray(text, marker) {
  const m = text.indexOf(marker);
  if (m === -1) return null;
  const start = text.indexOf('[', m);
  let depth = 0, inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function loadCatalog(file) {
  const map = new Map();
  try {
    const arr = JSON.parse(extractArray(fs.readFileSync(file, 'utf8'), 'SWADHYAY_BOOKS_RAW'));
    for (const b of arr) map.set(b.file, b);
  } catch (e) {
    console.warn('[warn] catalogue not loaded (' + path.basename(file) + '): ' + e.message + ' -- using cover-page metadata only');
  }
  return map;
}

function loadTitleOverrides(file) {
  const map = new Map();
  try {
    const t = fs.readFileSync(file, 'utf8');
    const i = t.indexOf('var TITLE_OVERRIDES = {');
    const j = t.indexOf('\n  };', i);
    const body = t.slice(i, j);
    for (const m of body.matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
      map.set(JSON.parse('"' + m[1] + '"'), JSON.parse('"' + m[2] + '"'));
    }
  } catch { /* optional */ }
  return map;
}

function titleFromFile(file) {
  let t = file.replace(/\.html?$/i, '');
  if (t.startsWith('u_')) t = t.slice(2);
  t = t.replace(/[_\s-]+(?=्)/g, '');
  return t.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- HTML -> paragraphs --

const TOC_RE = /^\s*(विषय[\s\-–]*सूची|विषयानुक्रम\w*|अनुक्रमणिका|अनुक्रम|सूची|पुस्तक[\s-]*सूची|table of contents|contents)\s*[:।]?\s*$/i;

/** Classify a <p> by its class list. */
function classify(cls) {
  const c = cls.split(/\s+/).filter(Boolean);
  const has = re => c.some(x => re.test(x));
  if (has(/^cover-/i) || has(/^Page-Break(-\d+)?$/) || has(/^Tavmev-Mata/i) || has(/^Tvamev/i)) return 'skip';
  if (has(/^Footnotes?-(right)$/i)) return 'note-attr';
  if (has(/^Footnotes?/i)) return 'note';
  if (has(/^Sub-Heading-2$/i)) return 'h3';
  if (has(/^Sub-Head(ing)?(-\d+)?$/i)) return 'h2';
  if (has(/^(Main-)?Heading/i) || has(/^Title-page/i)) return 'h1';
  if (has(/^txt-right$/i)) return 'attr';
  if (has(/^Shlok/i) || has(/^U(wach|vach|vaacha)$/i) || has(/^Nayash$/i) && false) return 'verse';
  return 'prose';
}

/** Walk the book HTML and return [{kind, text, page, anchor}] in reading order. */
function parseBook(html) {
  const body = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const hasSections = /class="[^"]*epub-page/.test(body);
  const re = /<section\b[^>]*data-page="(\d+)"[^>]*>|<hr\b[^>]*class="[^"]*page-break[^"]*"[^>]*>|<tr\b[^>]*>([\s\S]*?)<\/tr>|<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  const paras = [];
  let page = hasSections ? null : null;
  let part = 1, m;
  let totalChars = 0, keptChars = 0;
  while ((m = re.exec(body))) {
    if (m[1]) { page = +m[1]; continue; }
    if (m[2] !== undefined) {                          // table row: cells joined with ' | ', kept as one line
      const cells = m[2].split(/<\/t[dh]>/i).map(c => inlineText(c).replace(/\n/g, ' ')).filter(Boolean);
      const rowText = cells.join(' | ');
      if (rowText) {
        totalChars += rowText.length; keptChars += rowText.length;
        paras.push({ kind: 'verse', text: rowText, page: hasSections ? page : null, part, anchor: '' });
      }
      continue;
    }
    if (m[3] === undefined) { part++; continue; }      // <hr class="page-break"> in flat books
    const attrs = m[3];
    const cls = (/class="([^"]*)"/.exec(attrs) || [, ''])[1];
    const id = (/\bid="([^"]*)"/.exec(attrs) || [, ''])[1];
    const text = inlineText(m[4]);
    if (!text) continue;
    totalChars += text.length;
    const kind = classify(cls);
    if (kind === 'skip') continue;
    keptChars += text.length;
    paras.push({ kind, text, page: hasSections ? page : null, part, anchor: id });
  }
  const bodyOnly = (/<body[^>]*>([\s\S]*)/i.exec(body) || [, body])[1];
  const allChars = inlineText(bodyOnly.replace(/<\/p>|<\/div>|<\/li>|<\/tr>/gi, '\n')).replace(/\s+/g, '').length;
  return { paras, hasSections, allChars, paraChars: totalChars, keptChars };
}

// ---------------------------------------------------------------------- chunking --

function splitSentences(text) {
  return text.split(/(?<=[।॥?!\.])\s+/).filter(Boolean);
}

/** Break any unit larger than `max` into pieces (sentence boundaries, then spaces). */
function splitLong(text, max, sep) {
  if (text.length <= max) return [text];
  const parts = sep === '\n' ? text.split('\n') : splitSentences(text);
  const out = [];
  let cur = '';
  const push = () => { if (cur) { out.push(cur); cur = ''; } };
  for (let p of parts) {
    while (p.length > max) {              // single sentence/line longer than max: cut at a space
      let cut = p.lastIndexOf(' ', max);
      if (cut < max * 0.5) cut = max;
      push(); out.push(p.slice(0, cut).trim()); p = p.slice(cut).trim();
    }
    if (cur && cur.length + p.length + 1 > max) push();
    cur = cur ? cur + (sep === '\n' ? '\n' : ' ') + p : p;
  }
  push();
  return out;
}

function tailForOverlap(text, n) {
  if (!n || text.length <= n) return '';
  const sents = splitSentences(text);
  let tail = '';
  for (let i = sents.length - 1; i >= 0; i--) {
    if ((sents[i] + ' ' + tail).length > n) break;
    tail = tail ? sents[i] + ' ' + tail : sents[i];
  }
  return tail.length >= 20 ? tail : '';
}

function buildChunks(paras, opt) {
  const chunks = [];
  let chapter = '', chapterAnchor = '', sub = [], inToc = false;
  let buf = null;

  const fresh = () => ({
    parts: [], notes: [], len: 0, chapter, chapterAnchor, section: sub.join(' — '),
    pageStart: null, pageEnd: null, anchor: chapterAnchor, kinds: new Set(), overlap: ''
  });
  const flush = (withOverlap) => {
    if (!buf) return;
    if (buf.parts.length) {
      const text = buf.parts.join('\n');
      chunks.push({
        chapter: buf.chapter, section: buf.section, anchor: buf.anchor,
        pageStart: buf.pageStart, pageEnd: buf.pageEnd,
        kind: buf.kinds.size > 1 ? 'mixed' : [...buf.kinds][0] || 'prose',
        text, notes: buf.notes, hasOverlap: !!buf.overlap
      });
      const lastProse = buf.lastProse;
      buf = fresh();
      if (withOverlap && lastProse) {
        const ov = tailForOverlap(lastProse, opt.overlap);
        if (ov) { buf.overlap = ov; buf.parts.push(ov); buf.len = ov.length; }
      }
    } else if (buf.notes.length && chunks.length) {
      chunks[chunks.length - 1].notes.push(...buf.notes);
      buf = fresh();
    }
  };
  buf = fresh();

  for (const p of paras) {
    if (p.kind === 'h1') {
      flush(false);
      chapter = p.text.replace(/\n/g, ' '); chapterAnchor = p.anchor || ''; sub = [];
      inToc = TOC_RE.test(chapter);
      buf = fresh();
      continue;
    }
    if (inToc && !opt.includeToc) continue;
    if (p.kind === 'h2' || p.kind === 'h3') {
      const t = p.text.replace(/\n/g, ' ');
      sub = p.kind === 'h2' ? [t] : [sub[0] || '', t].filter(Boolean);
      if (buf.len >= opt.min) { flush(false); }
      else if (!buf.parts.length || buf.len < opt.min) { buf.section = sub.join(' — '); }
      continue;
    }
    if (p.kind === 'note' || p.kind === 'note-attr') {
      const n = buf.notes;
      if (p.kind === 'note-attr' && n.length) n[n.length - 1] += ' ' + p.text;
      else n.push(p.text);
      continue;
    }
    if (p.kind === 'attr' && buf.parts.length) {            // right-aligned source reference: glue to the line above
      buf.parts[buf.parts.length - 1] += ' ' + p.text;
      buf.len += p.text.length + 1;
      continue;
    }

    const sep = p.kind === 'verse' ? '\n' : ' ';
    const pieces = splitLong(p.text, opt.max, p.kind === 'verse' ? '\n' : ' ');
    for (const piece of pieces) {
      if (buf.len > 0 && buf.len + piece.length + 1 > opt.max) flush(true);
      else if (buf.len >= opt.target && buf.len + piece.length > opt.target * 1.25) flush(true);
      if (!buf.parts.length) { buf.pageStart = p.page; buf.anchor = buf.anchor || chapterAnchor; if (p.anchor) buf.anchor = p.anchor; }
      if (p.anchor && !buf.anchor) buf.anchor = p.anchor;
      buf.parts.push(piece);
      buf.len += piece.length + 1;
      buf.pageEnd = p.page;
      buf.kinds.add(p.kind === 'verse' ? 'verse' : 'prose');
      if (p.kind !== 'verse') buf.lastProse = piece; else buf.lastProse = '';
      void sep;
    }
  }
  flush(false);
  return chunks;
}

// ------------------------------------------------------------------- book -> records --

function coverMeta(html) {
  const grab = cls => {
    const m = new RegExp('<p\\b[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*>([\\s\\S]*?)</p>', 'i').exec(html);
    return m ? inlineText(m[1]).replace(/\n/g, ' ') : '';
  };
  return { coverTitle: grab('cover-Book-Name'), coverAuthor: grab('cover-Author-Name') };
}

function processBook(file, html, ctx) {
  const { opt, catalog, overrides } = ctx;
  const cat = catalog.get(file) || {};
  const cover = coverMeta(html);
  const title = overrides.get(file) || titleFromFile(file) || cover.coverTitle;
  const meta = {
    file, title,
    author: (cat.author || cover.coverAuthor || '').trim(),
    tikakar: (cat.tikakar || '').trim(),
    translator: (cat.translator || '').trim(),
    publisher: (cat.publisher || '').trim(),
    category: cat.category || 'Uncategorized',
    inCatalog: catalog.has(file)
  };
  const parsed = parseBook(html);
  const raw = buildChunks(parsed.paras, opt);
  const bookKey = sha1(file).slice(0, 10);
  const seen = new Set();
  const records = [];
  for (const c of raw) {
    const letters = (c.text.match(/[\p{L}\p{M}]/gu) || []).length;
    if (letters < 12) continue;                              // page numbers, ornaments, stray fragments
    const textHash = sha1(c.text).slice(0, 12);
    if (seen.has(textHash)) continue;                        // exact repeats inside one book
    seen.add(textHash);
    records.push({ c, textHash });
  }
  const total = records.length;
  const out = records.map(({ c, textHash }, i) => {
    const pages = c.pageStart ? (c.pageEnd && c.pageEnd !== c.pageStart ? c.pageStart + '–' + c.pageEnd : String(c.pageStart)) : '';
    const where = [c.chapter, c.section].filter(Boolean).join(' › ');
    const citation = [title, where, pages ? 'पृष्ठ ' + pages : ''].filter(Boolean).join(', ');
    const notesText = c.notes.length ? '\n[टिप्पणी] ' + c.notes.join('\n') : '';
    const header = [title, where].filter(Boolean).join(' | ');
    const embedLen = header.length + 1 + c.text.length + notesText.length;
    return {
      id: bookKey + ':' + String(i).padStart(4, '0'),
      book_file: file,
      book_title: title,
      author: meta.author, tikakar: meta.tikakar, translator: meta.translator, publisher: meta.publisher,
      category: meta.category,
      chapter: c.chapter, section: c.section, anchor: c.anchor,
      page_start: c.pageStart, page_end: c.pageEnd,
      chunk_index: i, chunk_count: total,
      kind: c.kind,
      text: c.text,
      notes: c.notes,
      context: header,
      citation,
      has_overlap: c.hasOverlap,
      chars: c.text.length,
      approx_tokens: Math.ceil(embedLen / 2.6),
      text_hash: textHash
    };
  });
  return {
    meta, bookKey, chunks: out,
    coverage: parsed.allChars ? Math.min(1, parsed.keptChars / parsed.allChars) : 1,
    hasSections: parsed.hasSections
  };
}

// -------------------------------------------------------------------- build command --

function paramsHash(opt) {
  return sha1(JSON.stringify([GENERATOR_VERSION, opt.target, opt.max, opt.min, opt.overlap, opt.includeToc])).slice(0, 10);
}

/** Stream a (possibly multi-GB) JSONL file line by line. */
function eachLine(file, fn) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 20);
  let rest = Buffer.alloc(0), n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
    const data = Buffer.concat([rest, buf.subarray(0, n)]);
    let start = 0, i;
    while ((i = data.indexOf(10, start)) !== -1) { if (i > start) fn(data.toString('utf8', start, i)); start = i + 1; }
    rest = data.subarray(start);
  }
  if (rest.length) fn(rest.toString('utf8'));
  fs.closeSync(fd);
}

/** Text to feed an embedding model: book/chapter context + body + footnotes. */
function embedText(c) {
  return (c.context + '\n' + c.text + (c.notes && c.notes.length ? '\n[टिप्पणी] ' + c.notes.join('\n') : '')).replace(ZW, '');
}

function readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; } }
function writeJson(f, v) { fs.writeFileSync(f, JSON.stringify(v, null, 2), 'utf8'); }

function cmdBuild(args) {
  const opt = resolveOptions(args);
  if (!fs.existsSync(opt.books)) { console.error('Books folder not found: ' + opt.books); process.exit(1); }
  const chunkDir = path.join(opt.out, 'chunks');
  fs.mkdirSync(chunkDir, { recursive: true });

  const ctx = { opt, catalog: loadCatalog(opt.catalog), overrides: loadTitleOverrides(opt.appjs) };
  const statePath = path.join(opt.out, 'state.json');
  const state = readJson(statePath, { books: {} });
  const ph = paramsHash(opt);

  const all = fs.readdirSync(opt.books).filter(f => /\.html?$/i.test(f)).sort();
  const wanted = args.files ? args.files.split(',').map(s => s.trim()).filter(Boolean) : null;
  const todo = wanted ? all.filter(f => wanted.includes(f)) : all;
  if (wanted) for (const w of wanted) if (!all.includes(w)) console.warn('[warn] not found in books folder: ' + w);

  let built = 0, skipped = 0, failed = 0;
  const t0 = Date.now();
  for (const file of todo) {
    const buf = fs.readFileSync(path.join(opt.books, file));
    const srcHash = sha1(buf.toString('latin1'));
    const prev = state.books[file];
    const metaHash = sha1(JSON.stringify([ctx.catalog.get(file) || null, ctx.overrides.get(file) || null])).slice(0, 10);
    if (!args.force && prev && prev.srcHash === srcHash && prev.params === ph && prev.metaHash === metaHash &&
        fs.existsSync(path.join(chunkDir, prev.out))) { skipped++; continue; }
    try {
      const r = processBook(file, buf.toString('utf8'), ctx);
      const outName = r.bookKey + '.jsonl';
      fs.writeFileSync(path.join(chunkDir, outName), r.chunks.map(c => JSON.stringify(c)).join('\n') + (r.chunks.length ? '\n' : ''), 'utf8');
      state.books[file] = {
        srcHash, params: ph, metaHash, out: outName, title: r.meta.title, author: r.meta.author,
        tikakar: r.meta.tikakar, translator: r.meta.translator, publisher: r.meta.publisher,
        category: r.meta.category, inCatalog: r.meta.inCatalog,
        chunks: r.chunks.length, chars: r.chunks.reduce((a, c) => a + c.chars, 0),
        coverage: +r.coverage.toFixed(3), hasPages: r.hasSections, builtAt: new Date().toISOString()
      };
      built++;
      if (built % 50 === 0) { writeJson(statePath, state); console.log('  ... ' + built + ' built'); }
    } catch (e) {
      failed++;
      console.error('[FAIL] ' + file + ': ' + e.message);
    }
  }

  // Books deleted from the folder disappear from the output (full runs only).
  let pruned = 0;
  if (!wanted && !args.noPrune) {
    for (const f of Object.keys(state.books)) {
      if (!all.includes(f)) {
        try { fs.unlinkSync(path.join(chunkDir, state.books[f].out)); } catch { /* already gone */ }
        delete state.books[f]; pruned++;
      }
    }
  }
  writeJson(statePath, state);
  mergeOutputs(opt, state);
  console.log('Done in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's: built ' + built + ', unchanged ' + skipped +
    ', failed ' + failed + (pruned ? ', pruned ' + pruned : '') + '.');
  summarize(state);
  if (failed) process.exitCode = 1;
}

function mergeOutputs(opt, state) {
  const chunkDir = path.join(opt.out, 'chunks');
  const files = Object.keys(state.books).sort();
  const fd = fs.openSync(path.join(opt.out, 'rag_chunks.jsonl'), 'w');
  const books = [];
  for (const f of files) {
    const b = state.books[f];
    const p = path.join(chunkDir, b.out);
    if (fs.existsSync(p)) fs.writeSync(fd, fs.readFileSync(p));
    books.push({
      file: f, title: b.title, author: b.author, tikakar: b.tikakar, translator: b.translator,
      publisher: b.publisher, category: b.category, chunks: b.chunks, chars: b.chars
    });
  }
  fs.closeSync(fd);
  writeJson(path.join(opt.out, 'books.json'), { generator: GENERATOR_VERSION, generatedAt: new Date().toISOString(), books });
}

function summarize(state) {
  const bs = Object.values(state.books);
  const chunks = bs.reduce((a, b) => a + b.chunks, 0);
  const chars = bs.reduce((a, b) => a + b.chars, 0);
  console.log(bs.length + ' books, ' + chunks + ' chunks, ' + (chars / 1e6).toFixed(1) + 'M chars (~' +
    Math.round(chars / 2.6 / 1000) + 'K tokens).');
}

// -------------------------------------------------------------------- other commands --

function cmdValidate(args) {
  const opt = resolveOptions(args);
  const state = readJson(path.join(opt.out, 'state.json'), null);
  if (!state) { console.error('No output yet -- run build first.'); process.exit(1); }
  const bs = Object.entries(state.books);
  const empty = bs.filter(([, b]) => b.chunks === 0);
  const lowCov = bs.filter(([, b]) => b.chunks > 0 && b.coverage < 0.85).sort((a, b) => a[1].coverage - b[1].coverage);
  const noCat = bs.filter(([, b]) => !b.inCatalog);
  const noAuthor = bs.filter(([, b]) => !b.author);

  const sizes = [], bad = [];
  let dupIds = 0; const ids = new Set();
  const sizeHist = { '<200': 0, '200-500': 0, '500-1000': 0, '1000-1500': 0, '>1500': 0 };
  eachLine(path.join(opt.out, 'rag_chunks.jsonl'), line => {
    const c = JSON.parse(line);
    if (ids.has(c.id)) dupIds++; ids.add(c.id);
    sizes.push(c.chars);
    sizeHist[c.chars < 200 ? '<200' : c.chars < 500 ? '200-500' : c.chars < 1000 ? '500-1000' : c.chars < 1500 ? '1000-1500' : '>1500']++;
    if (/[-�]/.test(c.text)) bad.push(c.book_file);
  });
  const pr = (label, list, fmt) => {
    console.log('\n' + label + ': ' + list.length);
    list.slice(0, 15).forEach(x => console.log('   ' + fmt(x)));
    if (list.length > 15) console.log('   ... +' + (list.length - 15) + ' more');
  };
  console.log('Books: ' + bs.length + ' | chunks: ' + sizes.length + ' | duplicate ids: ' + dupIds);
  console.log('Chunk size histogram (chars): ' + JSON.stringify(sizeHist));
  pr('Books with NO chunks (check the HTML format)', empty, ([f]) => f);
  pr('Books where chunks cover <85% of the visible text (content may sit outside <p>)', lowCov, ([f, b]) => (b.coverage * 100).toFixed(0) + '%  ' + f);
  pr('Books missing from swadhyay-data.js (metadata from cover page only)', noCat, ([f]) => f);
  pr('Books with no author found', noAuthor, ([f]) => f);
  pr('Books containing private-use / replacement characters (encoding damage?)', [...new Set(bad)], f => f);
}

function cmdInspect(args) {
  const opt = resolveOptions(args);
  const file = args._[1];
  if (!file) { console.error('usage: inspect "<book.html>"'); process.exit(1); }
  const ctx = { opt, catalog: loadCatalog(opt.catalog), overrides: loadTitleOverrides(opt.appjs) };
  const r = processBook(path.basename(file), fs.readFileSync(path.isAbsolute(file) ? file : path.join(opt.books, file), 'utf8'), ctx);
  console.log(JSON.stringify(r.meta) + '\nchunks: ' + r.chunks.length + ' | coverage: ' + (r.coverage * 100).toFixed(0) + '%');
  const n = args.n ? +args.n : 8;
  for (const c of r.chunks.slice(0, n)) {
    console.log('\n--- ' + c.id + ' [' + c.kind + '] ' + c.citation + ' (' + c.chars + ' chars)');
    console.log(c.text.slice(0, 600) + (c.text.length > 600 ? ' …' : ''));
    if (c.notes.length) console.log('  notes: ' + c.notes.join(' | ').slice(0, 200));
  }
}

// ------------------------------------------------------------------------ embeddings --
// Vectors live in output/vectors/<model>[-<dims>]/<bookKey>.f32 (+ .json with the per-row hash list).
// Rows follow the order of chunks/<bookKey>.jsonl. Re-running only embeds rows whose hash is new.

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/embeddings';

function gatewayKey() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  for (const f of [path.join(__dirname, '.env'), path.join(APP_ROOT, 'server', '.env')]) {
    try {
      const m = /^AI_GATEWAY_API_KEY=(.*)$/m.exec(fs.readFileSync(f, 'utf8'));
      if (m) return m[1].trim();
    } catch { /* try next */ }
  }
  throw new Error('AI_GATEWAY_API_KEY not set (env var, rag-generator/.env or server/.env)');
}

async function gatewayEmbed(model, texts, dims, attempt = 1) {
  try {
    const body = { model, input: texts };
    if (dims) body.dimensions = dims;
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + gatewayKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const e = new Error('Gateway ' + res.status + ': ' + (await res.text()).slice(0, 300));
      e.status = res.status; throw e;
    }
    const j = await res.json();
    return { vectors: j.data.sort((a, b) => a.index - b.index).map(d => d.embedding), tokens: (j.usage && j.usage.total_tokens) || 0 };
  } catch (e) {
    if (attempt >= 8 || (e.status && e.status < 429 && e.status !== 408)) throw e;
    const ra = /[Rr]etry after (\d+)s/.exec(e.message);
    await new Promise(r => setTimeout(r, ra ? (+ra[1] + 2) * 1000 : Math.min(30000, 1500 * 2 ** attempt)));
    return gatewayEmbed(model, texts, dims, attempt + 1);
  }
}

function normalizeVec(v) {
  let s = 0; for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return Float32Array.from(v, x => x / n);
}

function vecDir(opt, model, dims) {
  return path.join(opt.out, 'vectors', model.replace(/[^\w.-]+/g, '_') + (dims ? '-' + dims : ''));
}

async function cmdEmbed(args) {
  const opt = resolveOptions(args);
  const model = args.model || 'voyage/voyage-3.5-lite';
  const dims = args.dims ? +args.dims : 0;
  const conc = +(args.concurrency || 1);
  const minInterval = +(args['min-interval'] || 13000);   // ms between requests (account limit seen: 5/min)
  const maxBatchChars = +(args['batch-chars'] || 110000);
  let lastCall = 0;
  const state = readJson(path.join(opt.out, 'state.json'), null);
  if (!state) { console.error('Run build first.'); process.exit(1); }

  let files;
  if (args.list) files = fs.readFileSync(path.resolve(args.list), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  else if (args.files) files = args.files.split(',').map(s => s.trim());
  else if (args.all) files = Object.keys(state.books);
  else { console.error('Choose books: --list pilot_books.txt | --files "a.html,b.html" | --all'); process.exit(1); }

  const dir = vecDir(opt, model, dims);
  fs.mkdirSync(dir, { recursive: true });
  let totalTokens = 0, totalNew = 0;
  const t0 = Date.now();

  for (const file of files) {
    const b = state.books[file];
    if (!b) { console.warn('[warn] not built: ' + file); continue; }
    const key = b.out.replace(/\.jsonl$/, '');
    const chunks = fs.readFileSync(path.join(opt.out, 'chunks', b.out), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const texts = chunks.map(embedText);
    const hashes = texts.map(t => sha1(t).slice(0, 12));

    // reuse rows already embedded for the same text
    const old = new Map();
    const metaP = path.join(dir, key + '.json'), vecP = path.join(dir, key + '.f32');
    if (fs.existsSync(metaP) && fs.existsSync(vecP)) {
      const meta = readJson(metaP, null);
      if (meta && meta.dims) {
        const raw = fs.readFileSync(vecP);
        const arr = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
        meta.hashes.forEach((h, i) => old.set(h, arr.subarray(i * meta.dims, (i + 1) * meta.dims)));
      }
    }
    const rows = new Array(chunks.length);
    const todo = [];
    hashes.forEach((h, i) => { if (old.has(h)) rows[i] = old.get(h); else todo.push(i); });

    // batches capped by item count and total characters (~tokens)
    const batches = []; let cur = [], curChars = 0;
    for (const i of todo) {
      if (cur.length && (cur.length >= 128 || curChars + texts[i].length > maxBatchChars)) { batches.push(cur); cur = []; curChars = 0; }
      cur.push(i); curChars += texts[i].length;
    }
    if (cur.length) batches.push(cur);

    let bi = 0, tok = 0, dimsOut = 0;
    await Promise.all(Array.from({ length: Math.min(conc, batches.length) }, async () => {
      while (bi < batches.length) {
        const batch = batches[bi++];
        const wait = minInterval - (Date.now() - lastCall);       // stay under the gateway's requests-per-minute limit
        lastCall = Math.max(Date.now(), lastCall) + (wait > 0 ? wait : 0);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        const r = await gatewayEmbed(model, batch.map(i => texts[i]), dims);
        tok += r.tokens;
        r.vectors.forEach((v, k) => { rows[batch[k]] = normalizeVec(v); dimsOut = v.length; });
      }
    }));
    if (!dimsOut) dimsOut = rows.find(Boolean).length;
    const out = Buffer.alloc(rows.length * dimsOut * 4);
    rows.forEach((v, i) => Buffer.from(v.buffer, v.byteOffset, dimsOut * 4).copy(out, i * dimsOut * 4));
    fs.writeFileSync(vecP, out);
    writeJson(metaP, { file, model, dims: dimsOut, count: rows.length, hashes });
    totalTokens += tok; totalNew += todo.length;
    console.log(b.title + ': ' + chunks.length + ' chunks (' + todo.length + ' new, ' + tok + ' tokens)');
  }
  console.log('Done in ' + ((Date.now() - t0) / 1000).toFixed(0) + 's: ' + totalNew + ' chunks embedded, ' + totalTokens + ' tokens with ' + model + (dims ? ' @' + dims : '') + '.');
}

/** Vector search over every book that has vectors for this model: node rag_gen.js vsearch "query" --model M */
async function cmdVsearch(args) {
  const opt = resolveOptions(args);
  const model = args.model || 'voyage/voyage-3.5-lite';
  const dims = args.dims ? +args.dims : 0;
  const q = args._.slice(1).join(' ');
  if (!q) { console.error('usage: vsearch "<query>" [--model M] [--dims N] [-k 5]'); process.exit(1); }
  const dir = vecDir(opt, model, dims);
  const { vectors } = await gatewayEmbed(model, [q], dims);
  const qv = normalizeVec(vectors[0]);
  const K = args.k || 5;
  let top = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const meta = readJson(path.join(dir, f), null);
    const raw = fs.readFileSync(path.join(dir, f.replace(/\.json$/, '.f32')));
    const arr = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    for (let r = 0; r < meta.count; r++) {
      let dot = 0; const base = r * meta.dims;
      for (let i = 0; i < meta.dims; i++) dot += arr[base + i] * qv[i];
      if (top.length < K || dot > top[top.length - 1].s) {
        top.push({ s: dot, key: f.replace(/\.json$/, ''), r }); top.sort((a, b) => b.s - a.s); top = top.slice(0, K);
      }
    }
  }
  for (const t of top) {
    const lines = fs.readFileSync(path.join(opt.out, 'chunks', t.key + '.jsonl'), 'utf8').split('\n');
    const c = JSON.parse(lines[t.r]);
    console.log('\n[' + t.s.toFixed(3) + '] ' + c.citation + '  (' + c.id + ')');
    console.log(c.text.slice(0, 300) + (c.text.length > 300 ? ' …' : ''));
  }
}

/** Pack embedded books into a compact index the chat server loads:
 *  node rag_gen.js pack --list priority_books.txt --model M [--dest ../server/rag]
 *  -> vectors.i8 (int8, L2-normalised x127), chunks.jsonl (same row order), meta.json */
function cmdPack(args) {
  const opt = resolveOptions(args);
  const model = args.model || 'voyage/voyage-3.5-lite';
  const dims = args.dims ? +args.dims : 0;
  const dest = path.resolve(args.dest || path.join(APP_ROOT, 'server', 'rag'));
  const state = readJson(path.join(opt.out, 'state.json'), null);
  const files = args.list ? fs.readFileSync(path.resolve(args.list), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    : args.files ? args.files.split(',') : null;
  if (!state || !files) { console.error('usage: pack --list file.txt [--model M] [--dest DIR]'); process.exit(1); }
  const catalog = loadCatalog(opt.catalog);
  const idOf = new Map([...catalog.keys()].map((f, i) => [f, i]));   // same ids the app uses (index in SWADHYAY_BOOKS_RAW)
  const dir = vecDir(opt, model, dims);
  fs.mkdirSync(dest, { recursive: true });
  const vfd = fs.openSync(path.join(dest, 'vectors.i8'), 'w');
  const cfd = fs.openSync(path.join(dest, 'chunks.jsonl'), 'w');
  let count = 0, outDims = 0; const books = [];
  for (const file of files) {
    const b = state.books[file];
    if (!b) { console.warn('[warn] not built: ' + file); continue; }
    const key = b.out.replace(/\.jsonl$/, '');
    const meta = readJson(path.join(dir, key + '.json'), null);
    if (!meta) { console.warn('[warn] no vectors yet: ' + file); continue; }
    const chunks = fs.readFileSync(path.join(opt.out, 'chunks', b.out), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    if (chunks.length !== meta.count) { console.warn('[warn] stale vectors (rebuild embeddings): ' + file); continue; }
    const raw = fs.readFileSync(path.join(dir, key + '.f32'));
    const f32 = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    const q = new Int8Array(f32.length);
    for (let i = 0; i < f32.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(f32[i] * 127)));
    fs.writeSync(vfd, Buffer.from(q.buffer));
    for (const c of chunks) {
      fs.writeSync(cfd, JSON.stringify({
        file, bookId: idOf.has(file) ? idOf.get(file) : null, title: c.book_title, citation: c.citation,
        chapter: c.chapter, section: c.section, pageStart: c.page_start, pageEnd: c.page_end, kind: c.kind,
        text: c.text, notes: c.notes.join('\n').slice(0, 700)
      }) + '\n');
    }
    outDims = meta.dims; count += chunks.length; books.push(file);
  }
  fs.closeSync(vfd); fs.closeSync(cfd);
  writeJson(path.join(dest, 'meta.json'), { model, dims: outDims, count, books, packedAt: new Date().toISOString() });
  console.log('Packed ' + books.length + ' books, ' + count + ' chunks, ' + outDims + ' dims -> ' + dest);
}

function cmdExport(args) {
  const opt = resolveOptions(args);
  const fmt = args.format || 'csv';
  const src = path.join(opt.out, 'rag_chunks.jsonl');
  const dst = path.join(opt.out, fmt === 'csv' ? 'rag_chunks.csv' : 'embed_input.jsonl');
  const fd = fs.openSync(dst, 'w');
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const cols = ['id', 'book_title', 'author', 'category', 'chapter', 'section', 'page_start', 'page_end', 'kind', 'text', 'notes', 'citation'];
  if (fmt === 'csv') fs.writeSync(fd, '﻿' + cols.join(',') + '\n');   // BOM so Excel reads Devanagari
  eachLine(src, line => {
    const c = JSON.parse(line);
    if (fmt === 'csv') fs.writeSync(fd, cols.map(k => q(k === 'notes' ? c.notes.join(' | ') : c[k])).join(',') + '\n');
    else fs.writeSync(fd, JSON.stringify({ id: c.id, text: embedText(c) }) + '\n');
  });
  fs.closeSync(fd);
  console.log('Wrote ' + dst);
}

const tok = s => nfc(s).toLowerCase().replace(ZW, '').split(/[^\p{L}\p{M}\p{N}]+/u).filter(t => t.length > 1);

function cmdSearch(args) {
  const opt = resolveOptions(args);
  const q = args._.slice(1).join(' ');
  if (!q) { console.error('usage: search "<query>" [-k 5]'); process.exit(1); }
  const qt = [...new Set(tok(q))];
  const df = new Map(qt.map(t => [t, 0]));
  const file = path.join(opt.out, 'rag_chunks.jsonl');
  let N = 0, totalLen = 0;
  // pass 1: corpus statistics for the query terms only (keeps memory flat on a 1 GB file)
  eachLine(file, l => {
    const toks = tok(embedText(JSON.parse(l))); N++; totalLen += toks.length;
    const seen = new Set(toks);
    for (const t of qt) if (seen.has(t)) df.set(t, df.get(t) + 1);
  });
  const avg = totalLen / N, K = args.k || 5;
  let top = [];
  // pass 2: BM25 score, keep the best K
  eachLine(file, l => {
    const d = JSON.parse(l), toks = tok(embedText(d));
    const f = new Map();
    for (const t of toks) if (df.has(t)) f.set(t, (f.get(t) || 0) + 1);
    let s = 0;
    for (const [t, c] of f) {
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * (c * 2.2) / (c + 1.2 * (0.25 + 0.75 * toks.length / avg));
    }
    if (s > 0 && (top.length < K || s > top[top.length - 1].s)) {
      top.push({ s, id: d.id, citation: d.citation, text: d.text });
      top.sort((x, y) => y.s - x.s); top = top.slice(0, K);
    }
  });
  for (const r of top) {
    console.log('\n[' + r.s.toFixed(2) + '] ' + r.citation + '  (' + r.id + ')');
    console.log(r.text.slice(0, 350) + (r.text.length > 350 ? ' …' : ''));
  }
  if (!top.length) console.log('No matches.');
}

// ------------------------------------------------------------------------------ main --

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'help';
  if (cmd === 'build') return cmdBuild(args);
  if (cmd === 'validate') return cmdValidate(args);
  if (cmd === 'inspect') return cmdInspect(args);
  if (cmd === 'search') return cmdSearch(args);
  if (cmd === 'export') return cmdExport(args);
  if (cmd === 'pack') return cmdPack(args);
  if (cmd === 'embed') return cmdEmbed(args).catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
  if (cmd === 'vsearch') return cmdVsearch(args).catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[#/*\s]+/gm, '').trim());
}

if (require.main === module) main();
module.exports = { embedText, parseBook, buildChunks, processBook, inlineText };

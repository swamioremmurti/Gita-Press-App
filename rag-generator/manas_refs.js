#!/usr/bin/env node
/*
 * Ramcharitmanas verse index: every doha / chaupai / sortha / chhand group with its Hindi meaning.
 *
 * Reads श्रीरामचरितमानस.html and writes server/rag/manas_refs.json. The chat (server/lib/manasRefs.js) matches a
 * user's half-remembered or misspelled line against it, so "सो अनन्य जाके असि मति न टरे हनुमंत" returns the full doha.
 *
 *   node rag-generator/manas_refs.js            build
 *   node rag-generator/manas_refs.js --find "सो अनन्य जाके असि मति"    try a lookup
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { inlineText } = require('./rag_gen');

const APP_ROOT = path.resolve(__dirname, '..');
const FILE = 'श्रीरामचरितमानस.html';
const SRC = path.join(APP_ROOT, 'Gita Press Books', 'Gita Press Books', FILE);
const OUT = path.join(APP_ROOT, 'server', 'rag', 'manas_refs.json');
const CHUNKS = path.join(APP_ROOT, 'server', 'rag', 'chunks.jsonl');

function bookInfo() {
  const fd = fs.openSync(CHUNKS, 'r');
  // the book's chunks are not first in the file, so scan for its first line
  const text = fs.readFileSync(CHUNKS, 'utf8');
  fs.closeSync(fd);
  const m = new RegExp('"file":"' + FILE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '","bookId":(\\d+),"title":"([^"]+)"').exec(text);
  return { bookId: m ? +m[1] : undefined, title: m ? JSON.parse('"' + m[2] + '"') : 'श्रीरामचरितमानस' };
}

function build() {
  const html = fs.readFileSync(SRC, 'utf8');
  const re = /<section\b[^>]*data-page="(\d+)"[^>]*>|<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  const units = [];
  let m, page = 0, heading = '', sub = '', cur = null;
  const close = () => { cur = null; };
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) { page = +m[1]; continue; }
    const cls = (/class="([^"]*)"/.exec(m[2]) || [, ''])[1].trim();
    const text = inlineText(m[3]);
    if (!text) continue;
    if (/^Heading$/i.test(cls)) { heading = text; sub = ''; close(); continue; }
    if (/^Sub-Heading/i.test(cls)) { sub = text; close(); continue; }
    if (/^(Shlok|Doha)\b/i.test(cls)) {
      if (!cur || cur.m) { cur = { h: heading, s: sub, p: page, v: text, m: '' }; units.push(cur); }
      else cur.v += '\n' + text;
      continue;
    }
    if (/^Normal$/i.test(cls) && cur) { cur.m += (cur.m ? '\n' : '') + text; continue; }
    close();
  }
  addReferences(units);
  return units;
}

// Gita Press numbering: a doha/sortha is numbered in a running count through the kand ("दो०— ... ॥ ३॥"); the chaupais between two
// dohas are numbered 1, 2, 3... again in each stretch, and the stretch is named after the doha that closes it. So a chaupai is
// cited "<kand>, दोहा <closing doha> से पूर्व की चौपाई <n>", written compactly as मानस काण्ड।दोहा।चौपाई (e.g. ३।१०।४).
const KANDS = ['बालकाण्ड', 'अयोध्याकाण्ड', 'अरण्यकाण्ड', 'किष्किन्धाकाण्ड', 'सुन्दरकाण्ड', 'लंकाकाण्ड', 'उत्तरकाण्ड'];
const dn = n => String(n).replace(/\d/g, d => '०१२३४५६७८९'[d]);
// the last "॥ ३॥" or "॥ ३१(क)॥" in the text, kept as written (Devanagari digits, with the (क)/(ख) suffix some Balkand dohas carry)
const num = s => { const m = [...String(s).matchAll(/॥\s*([०-९]+(?:\s*\([क-ह]\))?)\s*॥/g)]; return m.length ? m[m.length - 1][1].replace(/\s+/g, '') : null; };

function addReferences(units) {
  units.forEach((u) => {
    const k = KANDS.indexOf(u.h.replace(/\s+/g, ' ').trim());
    u.k = k >= 0 ? k + 1 : 0;
    const pre = (/^(दो०|सो०|छं०|श्लो०)\s*[—-]/.exec(u.v) || [])[1];
    u.t = pre === 'दो०' ? 'दोहा' : pre === 'सो०' ? 'सोरठा' : pre === 'छं०' ? 'छन्द' : pre === 'श्लो०' ? 'श्लोक' : 'चौपाई';
    u.n = u.t === 'चौपाई' ? num(u.m) || num(u.v) : (num(u.v) || num(u.m));
  });
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (!u.k) continue;
    const kand = KANDS[u.k - 1];
    if (u.t === 'चौपाई') {
      let d = null;                                                  // the doha/sortha closing this stretch of chaupais
      for (let j = i + 1; j < units.length && units[j].k === u.k; j++) {
        if (units[j].t === 'दोहा' || units[j].t === 'सोरठा') { d = units[j]; break; }
        if (units[j].t === 'श्लोक') break;                           // chhands may sit between the chaupais and the closing doha
      }
      if (d && d.n && u.n) { u.ref = kand + ', ' + d.t + ' ' + dn(d.n) + ' से पूर्व की चौपाई ' + dn(u.n) + ' (मानस ' + dn(u.k) + '।' + d.n + '।' + u.n + ')'; u.d = d.n; }
      else if (d && d.n) u.ref = kand + ', ' + d.t + ' ' + d.n + ' से पूर्व की चौपाइयाँ';
      else u.ref = kand + (u.n ? ', चौपाई ' + u.n : '');
    } else if (u.n) {
      u.ref = kand + ', ' + u.t + ' ' + u.n + (u.t === 'दोहा' || u.t === 'सोरठा' ? ' (मानस ' + dn(u.k) + '।' + u.n + ')' : '');
    } else u.ref = kand + ', ' + u.t;
  }
}

const info = bookInfo();
const units = build();
const argv = process.argv.slice(2);
if (argv[0] === '--find') {
  const { init, find } = require('../server/lib/manasRefs');
  init(units, info);
  const r = find(argv.slice(1).join(' '));
  console.log(r ? JSON.stringify(r.map(x => ({ label: x.label, text: x.text.slice(0, 400) })), null, 1) : 'no match');
} else {
  fs.writeFileSync(OUT, JSON.stringify({ file: FILE, bookId: info.bookId, title: info.title, units }), 'utf8');
  console.log(info.title + ' (' + info.bookId + '): ' + units.length + ' verse groups -> ' + OUT + ' (' + (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB)');
}

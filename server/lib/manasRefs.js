// Finds a Ramcharitmanas doha / chaupai from a half-remembered or misspelled line.
// Data: server/rag/manas_refs.json, built by `node rag-generator/manas_refs.js`.
// Matching works on the consonant "skeleton" of the text (vowel signs, nasal marks, nukta, श/ष/स, ण/न, व/ब are folded),
// so spelling variants like टरे/टरइ/टरै or हनुमंत/हनुमन्त/हनूमत all meet. A user's line may be only a part of a verse, and the
// message may carry other words ("रामायण का दोहा है, इसे पूरा करें"), so every run of words in the message is tried.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'rag', 'manas_refs.json');
const GRAM = 4;                 // skeleton letters per n-gram
const MIN_LEN = 8;              // shortest skeleton (letters) worth matching
const THRESHOLD = 0.85;         // share of the user's n-grams found in the verse
const CAP = 1400;               // characters of one verse group passed to the model

// Look-alike consonants are merged: sibilants, nasals, व/ब, and (since people spell by ear, and Roman letters cannot tell them
// apart) aspirated -> plain, retroflex -> dental.
const FOLD = {
  'ष': 'स', 'श': 'स', 'ण': 'न', 'ङ': 'न', 'ञ': 'न', 'व': 'ब', 'ळ': 'ल',
  'ऋ': 'र', 'ॠ': 'र', 'ऩ': 'न', 'ऱ': 'र',
  'ख': 'क', 'घ': 'ग', 'छ': 'च', 'झ': 'ज', 'ठ': 'त', 'ढ': 'द', 'थ': 'त', 'ध': 'द', 'फ': 'प', 'भ': 'ब', 'ट': 'त', 'ड': 'द'
};

// Roman spelling (Hinglish) -> the same folded skeleton. Digraphs first; vowels are dropped.
const ROMAN = [['ksh', 'कस'], ['chh', 'च'], ['ch', 'च'], ['sh', 'स'], ['kh', 'क'], ['gh', 'ग'], ['jh', 'ज'], ['th', 'त'], ['dh', 'द'], ['ph', 'प'], ['bh', 'ब'],
  ['gy', 'जन'], ['x', 'कस'], ['k', 'क'], ['q', 'क'], ['c', 'क'], ['g', 'ग'], ['j', 'ज'], ['z', 'ज'], ['t', 'त'], ['d', 'द'], ['n', 'न'], ['p', 'प'], ['f', 'प'],
  ['b', 'ब'], ['v', 'ब'], ['w', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'], ['l', 'ल'], ['s', 'स'], ['h', 'ह']];
function romanSkeleton(w) {
  w = String(w).toLowerCase().replace(/[^a-z]/g, '');
  let out = '';
  for (let i = 0; i < w.length;) {
    let hit = false;
    for (const [r, d] of ROMAN) if (w.startsWith(r, i)) { out += d; i += r.length; hit = true; break; }
    if (!hit) i++;                                                    // a vowel
  }
  return out;
}

/** Consonant skeleton of a piece of Devanagari text ('' if it has none). */
function skeleton(s) {
  s = String(s).normalize('NFD').replace(/़/g, '');            // drop nukta (क़ -> क)
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === 'ं') {                                                  // anusvara: म before प-वर्ग, otherwise न
      let j = i + 1; while (j < s.length && /[ा-्ऀ-ः]/.test(s[j])) j++;
      if (j < s.length && /[क-ह]/.test(s[j])) out += /[पफबभम]/.test(s[j]) ? 'म' : 'न';     // word-final anusvara is silent (जहां = जहाँ)
    } else if (c >= 'क' && c <= 'ह') out += FOLD[c] || c;
  }
  // क्ष / ज्ञ are written with the halant: the pieces are already consonants, nothing more to fold
  return out;
}

let data = null, units = null, index = null, tri = null;

function init(rawUnits, info) {
  units = rawUnits.filter(u => /काण्ड|आरती|ध्यानम्/.test(u.h)).map(u => ({ h: u.h, s: u.s, p: u.p, v: u.v, m: u.m, ref: u.ref, sk: skeleton(u.v) }));
  index = new Map();
  tri = new Map();
  units.forEach((u, i) => {
    const seen = new Set();
    u.grams = seen;
    for (let k = 0; k + GRAM <= u.sk.length; k++) {
      const g = u.sk.substr(k, GRAM);
      if (seen.has(g)) continue;
      seen.add(g);
      const a = index.get(g); if (a) a.push(i); else index.set(g, [i]);
    }
    for (const g of new Set(grams(u.sk, 3))) { const a = tri.get(g); if (a) a.push(i); else tri.set(g, [i]); }
  });
  data = info;
}

function load() {
  if (units) return true;
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    init(j.units, { title: j.title, bookId: j.bookId, file: j.file });
    return true;
  } catch (e) { units = null; return false; }
}
function available() { return load(); }

// words that only describe the request, not the verse (compared as skeletons)
const STOP = new Set(['रामायण', 'रामचरितमानस', 'रामचरितमानस', 'मानस', 'दोहा', 'दोहे', 'चौपाई', 'चौपाइ', 'सोरठा', 'छंद', 'छन्द', 'पूरा', 'पुरा', 'करे', 'करें', 'करो', 'कीजिये',
  'कीजिए', 'बताइए', 'बताओ', 'बताये', 'लिखिए', 'लिखो', 'इसे', 'इसको', 'है', 'हैं', 'या', 'का', 'की', 'कौन', 'कौनसा', 'कौन-सा', 'तुलसीदास', 'तुलसीदासजी', 'गोस्वामी',
  'doha', 'chaupai', 'chaupayi', 'ramayan', 'ramayana', 'ramcharitmanas', 'complete', 'this', 'is', 'a', 'of', 'the', 'from', 'please', 'and', 'or', 'से', 'में', 'यह', 'ये', 'एक'
]);
// Roman-letter request words (a verse's own Roman spelling is never one of these exact words)
const STOP_PLAIN = new Set(['doha', 'dohe', 'chaupai', 'chaupayi', 'chaupaee', 'sortha', 'soratha', 'chhand', 'chand', 'ramayan', 'ramayana', 'ramcharitmanas', 'ramcharit', 'manas',
  'tulsidas', 'tulsidasji', 'goswami', 'complete', 'finish', 'this', 'that', 'is', 'a', 'of', 'the', 'from', 'please', 'plz', 'kindly', 'and', 'or', 'in', 'it', 'me', 'tell', 'give',
  'line', 'verse', 'quote', 'what', 'which', 'kaun', 'kaunsa', 'sa', 'si', 'ka', 'ki', 'hai', 'hain', 'ye', 'yeh', 'ise', 'isko', 'poora', 'pura', 'puri', 'kare', 'kar', 'karo',
  'kariye', 'kijiye', 'batao', 'bataiye', 'likho', 'likhiye', 'ko', 'se', 'mein', 'me', 'ek']);

function grams(sk, n) {
  n = n || GRAM;
  const out = [];
  for (let k = 0; k + n <= sk.length; k++) out.push(sk.substr(k, n));
  return out;
}

function tokenize(message) {
  return String(message).split(/[\s,;:!?"“”‘’()\[\]{}।॥|\-–—.…]+/).filter(Boolean)
    .filter(w => !STOP.has(w) && !STOP_PLAIN.has(w.toLowerCase()))
    .map(w => ({ w, sk: /^[A-Za-z']+$/.test(w) ? romanSkeleton(w) : skeleton(w) }))
    .filter(t => t.sk);
}

/** Smallest edit distance between `q` and any substring of `t` (Sellers). */
function approxDistance(q, t) {
  let prev = new Array(t.length + 1).fill(0);
  for (let i = 1; i <= q.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j - 1] + (q[i - 1] === t[j - 1] ? 0 : 1), prev[j] + 1, cur[j - 1] + 1);
    }
    prev = cur;
  }
  return Math.min(...prev);
}

/** Best match(es) for a message, or []. Each: { label, text, title, bookId, file, score } */
function find(message) {
  if (!load()) return [];
  const toks = tokenize(message);
  if (!toks.length) return [];
  const all = toks.map(t => t.sk).join('');
  if (all.length < MIN_LEN) return [];

  // candidate verses: those sharing the most n-grams with the whole message
  const votes = new Map();
  for (const g of new Set(grams(all))) for (const i of index.get(g) || []) votes.set(i, (votes.get(i) || 0) + 1);
  const cand = [...votes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(e => e[0]);

  const scored = [];
  for (const i of cand) {
    const u = units[i];
    let best = 0, bestLen = 0;
    for (let a = 0; a < toks.length; a++) {
      let sk = '';
      for (let b = a; b < toks.length; b++) {
        sk += toks[b].sk;
        if (sk.length < MIN_LEN) continue;
        const gs = grams(sk); if (!gs.length) continue;
        let hit = 0; for (const g of gs) if (u.grams.has(g)) hit++;
        const sc = hit / gs.length;
        if (sc > best || (sc === best && sk.length > bestLen)) { best = sc; bestLen = sk.length; }
      }
    }
    if (best >= THRESHOLD) scored.push({ i, score: best, len: bestLen });
  }
  if (!scored.length && all.length >= 11) {
    // second pass, for slips of a letter or two ("mali" for "मति"): edit distance of the whole line to a stretch of each verse
    const v3 = new Map();
    for (const g of new Set(grams(all, 3))) for (const i of tri.get(g) || []) v3.set(i, (v3.get(i) || 0) + 1);
    const c3 = [...v3.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
    const allow = Math.floor(all.length * 0.2);
    let bestD = Infinity;
    for (const [i] of c3) {
      const d = approxDistance(all, units[i].sk);
      if (d <= allow) { scored.push({ i, score: 1 - d / all.length, len: all.length, d }); if (d < bestD) bestD = d; }
    }
    for (let k = scored.length - 1; k >= 0; k--) if (scored[k].d > bestD) scored.splice(k, 1);
  }
  if (!scored.length) return [];
  scored.sort((x, y) => y.score - x.score || y.len - x.len);
  const top = scored[0];
  const picked = [top.i];
  // a line repeated elsewhere in the book: also show the next-best verse when it matches equally well
  for (const s of scored.slice(1)) if (picked.length < 2 && s.score >= top.score - 0.02 && s.len >= top.len && Math.abs(s.i - top.i) > 3) picked.push(s.i);
  const next = units[top.i + 1];
  if (next && next.h === units[top.i].h) picked.splice(1, 0, top.i + 1);       // the verse that follows (often the doha closing a chaupai)

  return picked.map((i, n) => {
    const u = units[i];
    const text = (u.v + (u.m ? '\n' + u.m : '')).slice(0, CAP);
    return {
      label: data.title + ', ' + (u.ref || u.h.replace(/\s+/g, ' ')) + (u.s ? ' › ' + u.s.replace(/\s+/g, ' ') : '') + ', पृष्ठ ' + u.p + (n === 1 && i === top.i + 1 ? ' (आगे का छंद)' : ''),
      text, title: data.title, bookId: data.bookId, file: data.file, score: top.score
    };
  });
}

module.exports = { available, find, init, skeleton };

// fix_visarga_colon.js -- a Node port of tools/fix_visarga_colon.py (same rules, same word lists), for the import scripts that run where Python is not
// installed.  fixText(html) puts the visarga "ः" back where a book was typed with the ASCII colon ("दु:ख" -> "दुःख", "नम:" -> "नमः"), in the text
// only (never in tags, attributes, <style>, <script> or comments).  See the Python file for the full description of the rules; in short, a colon is a
// visarga when it follows a Devanagari letter and a letter / a danda / a closing mark follows it, or (Hindi blocks) the word is a Sanskrit adverb
// (अत:, पुन:, वस्तुत: ...); in Hindi blocks the colon of a label ("भावार्थ: ...") stays.
//
//     const { fixText } = require('./fix_visarga_colon.js');   // fixText(html) -> { html, counts }
const HINDI = new Set('है हैं था थे थी का की के को में से यह वह जो नहीं भी और साथ लिये लिए द्वारा अपने करते करना करता होता जाता हुआ हुई हुए रहा रही रहे गया गये गई गयी सकता सकते चाहिये चाहिए कहा कहते वाला वाली वाले उसके उसकी उनके उनकी इसके इसकी हम तुम आप मैं मेरा मेरी तेरा तेरी क्या क्यों कैसे कौन जब तब अब यहाँ वहाँ जिस उसे इसे उन्हें इन्हें लेकिन परन्तु किन्तु अर्थात् अर्थात'.split(' '));
const ADVERBS = new Set('अत पुन प्राय प्रात छ शनै क्रमश अक्षरश शब्दश प्रायश बहुश अन्त नम मात सर्वत तत यत कुत इत अमुत'.split(' '));
const LABEL_WORDS = new Set('पदार्थ भावार्थ टिप्पणी अर्थ शब्दार्थ अनुवाद व्याख्या विशेष नोट उदाहरण प्रश्न उत्तर सूचना संदर्भ सन्दर्भ पाठ मन्त्र व्याकरण सारांश निष्कर्ष तात्पर्य भाव टीका कथन उपाय लाभ विधि नियम'.split(' '));
const COMMENTARY_LABELS = new Set('पादटिप्पणी पदार्थ भावार्थ अन्वय टिप्पणी शब्दार्थ पदच्छेद उदाहरण नोट सारांश अनुवाद व्याख्या'.split(' '));
const LABELS = new Set(['देवता']);
const CLOSERS = new Set([...'’”\')]},;.?!*/=']);
const SKIP = /(<!--[\s\S]*?-->|<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>)/;
const TAG = /(<[^>]+>)/;
const BLOCK_TAG = /^<\s*\/?\s*(p|div|li|ul|ol|h[1-6]|td|th|tr|table|section|article|hr|body|html|head|title|blockquote|dd|dt|dl|figure|figcaption|br\s*\/?)\b/i;
const COLON = /(?<=[ऀ-ंऄ-ॣ॰-ॿ]):/g;
const NUMBERED = /[०-९0-9]+[.)]?\s*$/;
const HALF = /[ऀ-ॿ]+$/;
const WORD = /[ऀ-ॿ]+/g;
const isDigit = (c) => /^[0-9०-९]$/.test(c);
const isDevaLetter = (c) => c >= 'ऀ' && c <= 'ॿ';

const words = (s) => s.match(WORD) || [];
const isHindi = (text) => words(text).some((w) => HINDI.has(w));
function adverbLike(w) { return ADVERBS.has(w) || (w.length > 2 && w.endsWith('त') && !'ेिीृाैोौ'.includes(w[w.length - 2])); }

function fixBlock(parts, counts) {
  const text = parts.filter((p) => !p.startsWith('<')).join('');
  const hindi = isHindi(text);
  return parts.map((p) => {
    if (p.startsWith('<') || !p.includes(':')) return p;
    return p.replace(COLON, (m, ...rest) => {
      const offset = rest[rest.length - 2];
      const end = offset + 1;
      const nxt = p.slice(end, end + 1), nxt2 = p.slice(end, end + 2);
      const before = p.slice(0, offset);
      const lw = HALF.exec(before);
      const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
      if (lw && COMMENTARY_LABELS.has(lw[0])) { bump('kept-label'); return ':'; }
      let kase;
      if (nxt && isDevaLetter(nxt) && !'।॥'.includes(nxt)) kase = 'letter';
      else if (nxt === '।' || nxt === '॥' || (nxt === ' ' && (nxt2.slice(1) === '।' || nxt2.slice(1) === '॥'))) kase = 'danda';
      else if (isDigit(nxt)) return ':';
      else if (CLOSERS.has(nxt)) kase = 'closer';
      else if (hindi) {
        const wm = HALF.exec(before);
        const w = wm ? wm[0] : '';
        const after = words(p.slice(end, end + 40));
        if ((nxt === '' || '—–-'.includes(nxt)) && NUMBERED.test(before.slice(0, before.length - w.length))) kase = 'numbered-name';
        else if (adverbLike(w)) kase = 'hindi-adverb';
        else if (nxt === ' ' && !LABEL_WORDS.has(w) && !after.slice(0, 2).some((x) => HINDI.has(x)) && after.length) kase = 'sanskrit-quote';
        else { bump('kept-in-hindi-block'); return ':'; }
      } else {
        const wm = HALF.exec(before);
        if (wm && (LABELS.has(wm[0]) || COMMENTARY_LABELS.has(wm[0])) && (nxt === ' ' || nxt === '')) { bump('kept-label'); return ':'; }
        kase = 'sanskrit-block';
      }
      bump(kase);
      return 'ः';
    });
  });
}

function fixText(s) {
  const counts = {};
  const pieces = [];
  for (const chunk of s.split(SKIP)) {
    if (chunk === undefined) continue;
    if (SKIP.test(chunk) && chunk.match(SKIP)[0] === chunk) { pieces.push(chunk); continue; }
    const toks = chunk.split(TAG).filter((t) => t !== '');
    const res = [];
    let block = [];
    const flush = () => { if (block.length) { res.push(...fixBlock(block, counts)); block = []; } };
    for (const t of toks) {
      if (t.startsWith('<') && BLOCK_TAG.test(t)) { flush(); res.push(t); } else block.push(t);
    }
    flush();
    pieces.push(res.join(''));
  }
  return { html: pieces.join(''), counts };
}

module.exports = { fixText };

if (require.main === module) {
  const fs = require('fs');
  const f = process.argv[2];
  if (!f) { console.log('usage: node tools/fix_visarga_colon.js <file.html>   (prints the counts; add --apply to write)'); process.exit(0); }
  const { html, counts } = fixText(fs.readFileSync(f, 'utf8'));
  console.log(counts);
  if (process.argv.includes('--apply')) fs.writeFileSync(f, html);
}

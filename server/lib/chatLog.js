// Chat answer cache + the list of questions the books could not answer. Both are best-effort: a failure here must never
// break a chat answer. Shown in the admin panel under "Chat questions".
const crypto = require('crypto');
const db = require('./db');

const TTL_MS = (parseFloat(process.env.CHAT_CACHE_DAYS) || 30) * 86400000;
// Bump when the prompt or the way answers are built changes, so old cached answers stop being served.
const PROMPT_VERSION = '1';

/** Same question written with different spacing, case or punctuation gets the same key. */
function normalize(q) {
  return String(q).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const keyOf = (q) => crypto.createHash('sha1').update(normalize(q)).digest('hex');

/** A cached answer for this exact question, or null. `ver` ties it to the book data it was made from. */
async function getCached(question, ver) {
  try {
    await db.init();
    const row = await db.get('SELECT answer, sources, hits FROM chat_cache WHERE qkey = ? AND ver = ? AND created_at >= ?',
      [keyOf(question), PROMPT_VERSION + '|' + ver, Date.now() - TTL_MS]);
    if (!row) return null;
    db.run('UPDATE chat_cache SET hits = hits + 1, last_hit_at = ? WHERE qkey = ?', [Date.now(), keyOf(question)]).catch(() => {});
    let sources = [];
    try { sources = JSON.parse(row.sources); } catch (e) { sources = []; }
    return { answer: row.answer, sources };
  } catch (e) { return null; }
}

async function putCache(question, answer, sources, model, ver) {
  try {
    await db.init();
    const now = Date.now();
    await db.run(`INSERT INTO chat_cache (qkey, question, answer, sources, model, ver, hits, created_at, last_hit_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0)
      ON CONFLICT(qkey) DO UPDATE SET question = excluded.question, answer = excluded.answer, sources = excluded.sources, model = excluded.model, ver = excluded.ver, hits = 0, created_at = excluded.created_at, last_hit_at = 0`,
    [keyOf(question), String(question).slice(0, 2000), answer, JSON.stringify(sources || []), model || '', PROMPT_VERSION + '|' + ver, now]);
  } catch (e) { /* best effort */ }
}

// The assistant's own wording when the books give no answer (see the rules in chat.js's system prompt).
const NOT_FOUND = [
  /उपलब्ध\s+पुस्तकों\s+में[^।\n]{0,30}नहीं\s+मिल/,
  /जानकारी\s+(?:उपलब्ध\s+)?नहीं\s+(?:है|मिल)/,
  /जानकारी[^।\n]{0,40}नहीं\s+मिल/,
  /प्रश्न\s+स्पष्ट\s+नहीं/,
  /(?:नहीं\s+मिला|नहीं\s+मिली)[^।\n]{0,10}(?:\n|$)/
];
/** True when the answer says the books do not have the information (checked on the start of the answer). */
function isNotFound(answer) {
  const head = String(answer || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  return NOT_FOUND.some((re) => re.test(head));
}

async function recordUnanswered(question, answer, sources) {
  try {
    await db.init();
    const now = Date.now();
    const titles = (sources || []).map((s) => s.title).filter(Boolean);
    await db.run(`INSERT INTO chat_unanswered (qkey, question, answer, sources, times, status, note, first_at, last_at) VALUES (?, ?, ?, ?, 1, 'new', '', ?, ?)
      ON CONFLICT(qkey) DO UPDATE SET times = times + 1, last_at = excluded.last_at, answer = excluded.answer, sources = excluded.sources,
        status = CASE WHEN status = 'done' THEN 'new' ELSE status END`,
    [keyOf(question), String(question).slice(0, 2000), String(answer || '').slice(0, 3000), JSON.stringify(titles), now, now]);
  } catch (e) { /* best effort */ }
}

module.exports = { normalize, getCached, putCache, isNotFound, recordUnanswered };

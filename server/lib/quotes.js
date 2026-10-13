// GET /api/quote-of-the-day -- one saying per revered saint, the same for everyone on a given
// (Indian) day. The pool (server/lib/quotes-pool.json, built by tools/build_quote_pool.py) never
// leaves the server; the page receives only today's four sayings.
const pool = require('./quotes-pool.json');

// Today's date in India (the site's audience), as YYYY-MM-DD.
function istDate(now) {
  const ist = new Date((now || new Date()).getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

// FNV-1a: a small, stable string hash -- the day's pick must not change between requests.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function quotesFor(date) {
  return pool.filter((s) => s.quotes.length).map((s) => {
    const [bookIdx, text] = s.quotes[hash(date + ':' + s.key) % s.quotes.length];
    return { key: s.key, name: s.name, author: s.author, book: s.books[bookIdx], text };
  });
}

// The day's four sayings are computed once per date, not on every request.
let memo = { date: null, body: null };

function handle(req, res) {
  const date = istDate();
  if (memo.date !== date) memo = { date, body: JSON.stringify({ date, quotes: quotesFor(date) }) };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600');
  res.end(memo.body);
}

module.exports = { handle, quotesFor, istDate };

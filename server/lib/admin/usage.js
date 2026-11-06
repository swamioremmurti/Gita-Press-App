// Admin: AI token usage (chat answers + question embeddings), read from the ai_usage table that server/lib/usage.js fills.
const db = require('../db');
const { sendJSON } = require('../http');
const { USD_INR } = require('../pricing');

const DAY = 86400000;
const IST = 19800000;                      // days are counted in India time (UTC+5:30)

function istDay(ms) { return new Date(ms + IST).toISOString().slice(0, 10); }
function startOfIstDay(ms) { return Math.floor((ms + IST) / DAY) * DAY - IST; }

async function totalsSince(since) {
  const r = await db.get('SELECT COUNT(*) AS calls, COALESCE(SUM(input_tokens), 0) AS i, COALESCE(SUM(output_tokens), 0) AS o, COALESCE(SUM(cost_usd), 0) AS c FROM ai_usage WHERE created_at >= ?', [since]);
  return { calls: Number(r.calls), input: Number(r.i), output: Number(r.o), total: Number(r.i) + Number(r.o), usd: Number(r.c) };
}

async function usage(ctx) {
  const now = Date.now();
  const today = startOfIstDay(now);
  const [all, t0, d7, d30, kinds, rows, recent] = await Promise.all([
    totalsSince(0), totalsSince(today), totalsSince(today - 6 * DAY), totalsSince(today - 29 * DAY),
    db.all('SELECT kind, model, COUNT(*) AS calls, SUM(input_tokens) AS i, SUM(output_tokens) AS o, SUM(cost_usd) AS c FROM ai_usage GROUP BY kind, model ORDER BY SUM(input_tokens + output_tokens) DESC'),
    db.all('SELECT created_at, input_tokens + output_tokens AS t FROM ai_usage WHERE created_at >= ?', [today - 29 * DAY]),
    db.all('SELECT kind, model, input_tokens, output_tokens, cost_usd, created_at FROM ai_usage ORDER BY id DESC LIMIT 25')
  ]);
  const perDay = {};
  rows.forEach((r) => { const d = istDay(Number(r.created_at)); perDay[d] = (perDay[d] || 0) + Number(r.t); });
  const daily = [];
  for (let i = 29; i >= 0; i--) { const d = istDay(today - i * DAY + 1); daily.push({ date: d, n: perDay[d] || 0 }); }
  sendJSON(ctx.res, 200, {
    usdInr: USD_INR,
    totals: { all, today: t0, week: d7, month: d30 },
    byModel: kinds.map((r) => ({ kind: r.kind, model: r.model, calls: Number(r.calls), input: Number(r.i), output: Number(r.o), total: Number(r.i) + Number(r.o), usd: Number(r.c) })),
    daily,
    recent: recent.map((r) => ({ kind: r.kind, model: r.model, input: Number(r.input_tokens), output: Number(r.output_tokens), usd: Number(r.cost_usd), at: Number(r.created_at) }))
  });
}

async function handle(ctx) {
  if (ctx.method === 'GET' && ctx.pathname === '/api/admin/usage') { await usage(ctx); return true; }
  return false;
}

module.exports = { handle };

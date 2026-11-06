// Records how many tokens each AI call used (chat answers and question embeddings) in the ai_usage table.
// Shown in the admin panel under "AI usage". Recording never blocks or breaks a chat answer.
const db = require('./db');

function record(kind, model, inputTokens, outputTokens, costUsd) {
  const inT = Math.max(0, Math.round(Number(inputTokens) || 0));
  const outT = Math.max(0, Math.round(Number(outputTokens) || 0));
  if (!inT && !outT) return Promise.resolve();
  return db.init()
    .then(() => db.run('INSERT INTO ai_usage (kind, model, input_tokens, output_tokens, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [String(kind), String(model || ''), inT, outT, Number(costUsd) || 0, Date.now()]))
    .catch(() => { /* usage tracking is best-effort */ });
}

module.exports = { record };

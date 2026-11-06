// Token prices, in US dollars per token, as the Vercel AI Gateway charges them.
// Read live from the gateway's model list (cached for 6 hours); falls back to the table below if that is unreachable.
const TTL = 6 * 3600 * 1000;
const FALLBACK = {
  'google/gemini-2.5-flash': { input: 3e-7, output: 2.5e-6 },
  'voyage/voyage-3.5-lite': { input: 2e-8, output: 0 },
  'voyage/voyage-3.5': { input: 6e-8, output: 0 },
  'anthropic/claude-sonnet-5': { input: 2e-6, output: 1e-5 }
};
// The gateway bills in dollars; the rupee figure uses this rate (override with USD_INR in server/.env).
const USD_INR = parseFloat(process.env.USD_INR || '88');

// Estimates are multiplied by this to cover other costs (override with COST_FACTOR in server/.env).
const COST_FACTOR = parseFloat(process.env.COST_FACTOR || '1.3');

let cache ={ at: 0, map: null };

async function prices() {
  if (cache.map && Date.now() - cache.at < TTL) return cache.map;
  try {
    const key = process.env.AI_GATEWAY_API_KEY;
    const res = await fetch('https://ai-gateway.vercel.sh/v1/models', { headers: key ? { Authorization: 'Bearer ' + key } : {} });
    if (!res.ok) throw new Error('models ' + res.status);
    const map = {};
    (await res.json()).data.forEach((m) => {
      if (m.pricing && m.pricing.input != null) map[m.id] = { input: Number(m.pricing.input) || 0, output: Number(m.pricing.output) || 0 };
    });
    cache = { at: Date.now(), map };
  } catch (e) {
    if (!cache.map) cache = { at: Date.now() - TTL + 5 * 60 * 1000, map: FALLBACK };   // retry in 5 minutes
  }
  return cache.map;
}

/** Dollar cost of a call. `known` is false when no price is listed for the model (the figure is then not shown). */
async function cost(model, inputTokens, outputTokens) {
  const id = !model ? '' : model.includes('/') ? model : 'anthropic/' + model;      // a direct Anthropic call uses the bare model name
  const p = (await prices())[id] || FALLBACK[id];
  if (!p) return { usd: 0, known: false };
  return { usd: ((inputTokens || 0) * p.input + (outputTokens || 0) * p.output) * COST_FACTOR, known: true };
}

module.exports = { cost, USD_INR };

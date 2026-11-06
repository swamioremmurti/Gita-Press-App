// Thin wrapper around the Claude Messages API (https://api.anthropic.com), streaming SSE-style.
// Default: Claude when a direct Anthropic key exists; otherwise Gemini through the Vercel AI Gateway
// (free-tier testing). Set ANTHROPIC_API_KEY (or ANTHROPIC_MODEL) later to switch back to Claude.
const MODEL = process.env.ANTHROPIC_MODEL ||
  (!process.env.ANTHROPIC_API_KEY && process.env.AI_GATEWAY_API_KEY ? 'google/gemini-2.5-flash' : 'claude-sonnet-5');
const MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4000', 10);   // Hindi is token-heavy

// Non-Anthropic models (e.g. ANTHROPIC_MODEL=google/gemini-2.5-flash) go through the gateway's
// OpenAI-compatible endpoint; handy for free-tier testing.
async function streamOpenAI({ system, messages, onDelta, onUsage }) {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new Error('AI_GATEWAY_API_KEY is required for model ' + MODEL);
  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, stream: true, stream_options: { include_usage: true }, messages: [{ role: 'system', content: system }].concat(messages) })
  });
  if (!res.ok || !res.body) throw new Error('Gateway error ' + res.status + ': ' + (await res.text().catch(() => '')).slice(0, 400));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ') || line.slice(6).trim() === '[DONE]') continue;
      let evt; try { evt = JSON.parse(line.slice(6)); } catch { continue; }
      const t = evt.choices && evt.choices[0] && evt.choices[0].delta && evt.choices[0].delta.content;
      if (t) { full += t; if (onDelta) onDelta(t); }
      if (evt.usage && onUsage) onUsage({ model: MODEL, input: evt.usage.prompt_tokens || 0, output: evt.usage.completion_tokens || 0 });
    }
  }
  return full;
}

async function streamMessage({ system, messages, onDelta, onUsage }) {
  if (MODEL.includes('/') && !MODEL.startsWith('anthropic/')) return streamOpenAI({ system, messages, onDelta, onUsage });
  // Direct Anthropic key if present, otherwise the Vercel AI Gateway (Anthropic-compatible /v1/messages).
  const direct = process.env.ANTHROPIC_API_KEY;
  const gateway = process.env.AI_GATEWAY_API_KEY;
  if (!direct && !gateway) throw new Error('Set ANTHROPIC_API_KEY or AI_GATEWAY_API_KEY in server/.env');

  const res = await fetch(direct ? 'https://api.anthropic.com/v1/messages' : 'https://ai-gateway.vercel.sh/v1/messages', {
    method: 'POST',
    headers: {
      ...(direct ? { 'x-api-key': direct } : { Authorization: 'Bearer ' + gateway }),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: direct || MODEL.includes('/') ? MODEL : 'anthropic/' + MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      stream: true
    })
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    throw new Error('Anthropic API error ' + res.status + ': ' + body.slice(0, 500));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  let inTok = 0, outTok = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);
      if (payload === '[DONE]') continue;
      let evt;
      try { evt = JSON.parse(payload); } catch { continue; }
      if (evt.type === 'message_start' && evt.message && evt.message.usage) {
        const u = evt.message.usage;
        inTok = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      }
      if (evt.type === 'message_delta' && evt.usage && evt.usage.output_tokens != null) outTok = evt.usage.output_tokens;
      if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
        full += evt.delta.text;
        if (onDelta) onDelta(evt.delta.text);
      }
    }
  }
  if (onUsage) onUsage({ model: MODEL, input: inTok, output: outTok });
  return full;
}

module.exports = { streamMessage, MODEL };

// Thin wrapper around the Claude Messages API (https://api.anthropic.com), streaming SSE-style.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

async function streamMessage({ system, messages, onDelta }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set (create server/.env from server/.env.example)');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1400,
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
      if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
        full += evt.delta.text;
        if (onDelta) onDelta(evt.delta.text);
      }
    }
  }
  return full;
}

module.exports = { streamMessage, MODEL };

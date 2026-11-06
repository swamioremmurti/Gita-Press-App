// RAG chat + health check -- pulled out of server.js so both the long-lived local dev
// server and the Vercel serverless function (api/chat.js, api/health.js) share one
// implementation. Unchanged in behavior from the original server.js handlers.
const voyage = require('./voyage');
const anthropic = require('./anthropic');
const store = require('./vectorStore');
const rag = require('./ragStore');
const usage = require('./usage');
const pricing = require('./pricing');

const TOP_K = 8;

function readBody(req) {
  // Vercel's Node runtime may have already buffered+parsed the body into req.body
  // (see the matching comment in lib/api.js's readJSONBody); server.js's plain
  // http.Server never does this, so we fall back to reading the raw stream.
  if (req.body !== undefined && req.body !== null) {
    return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function buildSystemPrompt(contextBlocks) {
  return [
    'आप "स्वाध्याय" ऐप के सहायक हैं। आप केवल नीचे दिए गए गीता प्रेस पुस्तकों के उद्धरणों के आधार पर उत्तर देते हैं।',
    'नियम:',
    '- उत्तर हिन्दी में दें, स्पष्ट और संक्षिप्त रखें।',
    '- केवल सादा पाठ लिखें: मार्कडाउन चिह्न (**, *, #) का उपयोग न करें; सूची के लिए "१." या "-" लिखें।',
    '- केवल दिए गए संदर्भों की जानकारी का उपयोग करें; उनसे बाहर की बात न बनाएँ।',
    '- संस्कृत श्लोक/चौपाई उद्धृत करें तो उसका हिन्दी अर्थ भी दें। यदि संदर्भ में अर्थ दिया है तो उसी का उपयोग करें; यदि नहीं दिया है तो स्वयं अर्थ करें और लिखें "(अर्थ सहायक द्वारा)"।',
    '- यदि संदर्भों में उत्तर नहीं मिलता, तो साफ़ कहें कि यह जानकारी उपलब्ध पुस्तकों में नहीं मिली।',
    '- उत्तर के अंत में "स्रोत:" शीर्षक के अंतर्गत उपयोग की गई पुस्तकों के नाम सूचीबद्ध करें (जो [1], [2]... के रूप में संदर्भों में चिह्नित हैं)।',
    '',
    'संदर्भ:',
    contextBlocks
  ].join('\n');
}

async function handleChat(req, res) {
  let payload;
  try { payload = JSON.parse(await readBody(req)); } catch { res.writeHead(400); res.end('Bad JSON'); return; }

  const message = (payload.message || '').toString().slice(0, 2000).trim();
  if (!message) { res.writeHead(400); res.end('Missing message'); return; }
  const history = Array.isArray(payload.history) ? payload.history.slice(-6) : [];

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  const send = (event, data) => res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');

  try {
    let hits;
    const tally = { embed: 0, input: 0, output: 0, chatModel: '', embedModel: '' };
    if (rag.available()) {
      hits = await rag.search(message, TOP_K, (u) => { tally.embed = u.tokens; tally.embedModel = u.model; });               // rag-generator index (see server/lib/ragStore.js)
    } else {
      const [queryVec] = await voyage.embed([message], 'query');
      hits = store.topK(queryVec, TOP_K);
    }

    const seen = new Set();
    const sources = [];
    const contextBlocks = hits.map((h, i) => {
      const c = h.chunk;
      const label = c.citation || c.title + (c.pageStart ? ' (पृष्ठ ' + c.pageStart + (c.pageEnd && c.pageEnd !== c.pageStart ? '-' + c.pageEnd : '') + ')' : '');
      const key = c.bookId != null ? String(c.bookId) : c.file;
      if (!seen.has(key)) { seen.add(key); sources.push({ n: i + 1, title: c.title, bookId: c.bookId, file: c.file }); }
      return '[' + (i + 1) + '] ' + label + (c.heading ? ' — ' + c.heading : '') + '\n' + c.text + (c.notes ? '\n[टिप्पणी] ' + c.notes : '');
    }).join('\n\n---\n\n');

    send('sources', { sources });

    const messages = history.concat([{ role: 'user', content: message }]);
    await anthropic.streamMessage({
      system: buildSystemPrompt(contextBlocks),
      messages,
      onDelta: (text) => send('delta', { text }),
      onUsage: (u) => { tally.input = u.input; tally.output = u.output; tally.chatModel = u.model; }
    });
    // tokens used by this answer: the model's reading + writing, plus embedding the question
    const chatCost = await pricing.cost(tally.chatModel, tally.input, tally.output);
    const embCost = tally.embed ? await pricing.cost(tally.embedModel, tally.embed, 0) : { usd: 0, known: true };
    const usd = chatCost.known && embCost.known ? chatCost.usd + embCost.usd : null;      // null = no price listed, so no figure is shown
    send('usage', { input: tally.input, output: tally.output, embed: tally.embed, total: tally.input + tally.output + tally.embed, model: tally.chatModel,
      usd: usd, inr: usd == null ? null : usd * pricing.USD_INR });
    usage.record('chat', tally.chatModel, tally.input, tally.output, chatCost.usd);
    if (tally.embed) usage.record('embedding', tally.embedModel, tally.embed, 0, embCost.usd);
    send('done', {});
  } catch (err) {
    send('error', { message: err.message });
  }
  res.end();
}

function handleHealth(req, res) {
  let manifest = null;
  try { manifest = store.readManifest(); } catch {}
  const ragInfo = rag.info();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, indexedBooks: ragInfo ? ragInfo.books.length : manifest ? manifest.completedFiles.length : 0, totalChunks: ragInfo ? ragInfo.count : manifest ? manifest.totalChunks : 0, ragModel: ragInfo ? ragInfo.model : null }));
}

module.exports = { handleChat, handleHealth };

// RAG chat + health check -- pulled out of server.js so both the long-lived local dev
// server and the Vercel serverless function (api/chat.js, api/health.js) share one
// implementation. Unchanged in behavior from the original server.js handlers.
const voyage = require('./voyage');
const anthropic = require('./anthropic');
const store = require('./vectorStore');
const rag = require('./ragStore');
const usage = require('./usage');
const pricing = require('./pricing');
const gitaRefs = require('./gitaRefs');
const manasRefs = require('./manasRefs');
const chatLog = require('./chatLog');
const fs = require('fs');
const path = require('path');

const TOP_K = 8;

// Ties a cached answer to the book data it was made from: a repack of the index or a rebuilt verse file starts a fresh cache.
let dataVer = null;
function dataVersion() {
  if (dataVer === null) {
    const info = rag.info();
    const size = (f) => { try { return fs.statSync(path.join(__dirname, '..', 'rag', f)).size; } catch (e) { return 0; } };
    dataVer = [info && info.packedAt, size('gita_refs.json'), size('manas_refs.json')].join(':');
  }
  return dataVer;
}

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
    '- केवल सादा पाठ लिखें: मार्कडाउन चिह्न (*, #) का उपयोग न करें; सूची के लिए "१." या "-" लिखें। एकमात्र अपवाद: संस्कृत श्लोक, दोहा, सोरठा, चौपाई या छंद की मूल पंक्तियों को मोटे अक्षरों में दिखाने के लिए प्रत्येक पंक्ति को अलग-अलग दो तारों में लपेटें, जैसे **सो अनन्य जाकें असि मति न टरइ हनुमंत।** (अगली पंक्ति भी अलग **...** में)। अर्थ, व्याख्या और बाकी उत्तर सादा रहे।',
    '- रामचरितमानस का कोई छंद उद्धृत करें तो संदर्भ के शीर्षक में दिए अनुसार काण्ड और दोहा/चौपाई की संख्या ज़रूर लिखें (जैसे "बालकाण्ड, दोहा ५२ से पूर्व की चौपाई ४ (मानस १।५२।४)"); संख्या अपने मन से न बनाएँ।',
    '- केवल दिए गए संदर्भों की जानकारी का उपयोग करें; उनसे बाहर की बात न बनाएँ।',
    '- संस्कृत श्लोक/चौपाई उद्धृत करें तो उसका हिन्दी अर्थ भी दें। यदि संदर्भ में अर्थ दिया है तो उसी का उपयोग करें; यदि नहीं दिया है तो स्वयं अर्थ करें और लिखें "(अर्थ सहायक द्वारा)"।',
    '- यदि प्रश्न में गीता का अध्याय-श्लोक (जैसे ६.२) पूछा गया है, तो संदर्भ में उसी अध्याय-श्लोक वाले अंश दिए गए हैं: पहले मूल श्लोक लिखें, फिर उसका हिन्दी अर्थ, और फिर पुस्तक की व्याख्या का सार। श्लोक संख्या अपने मन से न बदलें।',
    '- यदि उपयोगकर्ता ने रामचरितमानस की कोई पंक्ति (दोहा/चौपाई) अधूरी या वर्तनी की भूल के साथ लिखी है, तो संदर्भ में पुस्तक का मिलान हुआ पूरा छंद दिया गया है: उसे पुस्तक के अनुसार शुद्ध रूप में पूरा लिखें (दोहे/चौपाई की सभी पंक्तियाँ, संदर्भ में जैसी हैं वैसी, कोई पंक्ति छोड़े बिना), काण्ड बताएँ, फिर हिन्दी अर्थ दें। अपनी ओर से पंक्तियाँ न जोड़ें।',
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
    // the same question asked before: answer straight from the cache (follow-up questions depend on the conversation, so they skip it)
    if (!history.length) {
      const cached = await chatLog.getCached(message, dataVersion());
      if (cached) {
        send('sources', { sources: cached.sources });
        for (let i = 0; i < cached.answer.length; i += 80) send('delta', { text: cached.answer.slice(i, i + 80) });
        send('usage', { input: 0, output: 0, embed: 0, total: 0, model: '', usd: 0, inr: 0, cached: true });
        send('done', {});
        res.end();
        return;
      }
    }
    let hits = [];
    const tally = { embed: 0, input: 0, output: 0, chatModel: '', embedModel: '' };
    // "gita 6.2", "chapter 6 shlok 2", "अध्याय ६ श्लोक २": the verse is looked up directly in the three Gita books
    const verseRefs = gitaRefs.available() ? gitaRefs.find(message) : [];
    // a doha/chaupai quoted from memory, possibly misspelled or only in part: matched against the Ramcharitmanas text
    let manasHits = [];
    if (!verseRefs.length && manasRefs.available()) { try { manasHits = manasRefs.find(message); } catch (e) { manasHits = []; } }
    const direct = (verseRefs.length ? gitaRefs.blocks(verseRefs) : []).concat(manasHits);
    try {
      if (rag.available()) {
        hits = await rag.search(message, direct.length ? 3 : TOP_K, (u) => { tally.embed = u.tokens; tally.embedModel = u.model; });   // rag-generator index (see server/lib/ragStore.js)
      } else {
        const [queryVec] = await voyage.embed([message], 'query');
        hits = store.topK(queryVec, direct.length ? 3 : TOP_K);
      }
    } catch (e) { if (!direct.length) throw e; }      // the verse text alone is enough when the search is unavailable

    const items = direct.map((d) => ({ label: d.label, text: d.text, title: d.title, bookId: d.bookId, file: d.file }))
      .concat(hits.map((h) => {
        const c = h.chunk;
        return {
          label: (c.citation || c.title + (c.pageStart ? ' (पृष्ठ ' + c.pageStart + (c.pageEnd && c.pageEnd !== c.pageStart ? '-' + c.pageEnd : '') + ')' : '')) + (c.heading ? ' — ' + c.heading : ''),
          text: c.text + (c.notes ? '\n[टिप्पणी] ' + c.notes : ''), title: c.title, bookId: c.bookId, file: c.file
        };
      }));
    const seen = new Set();
    const sources = [];
    const contextBlocks = items.map((it, i) => {
      const key = it.bookId != null ? String(it.bookId) : it.file;
      if (!seen.has(key)) { seen.add(key); sources.push({ n: i + 1, title: it.title, bookId: it.bookId, file: it.file }); }
      return '[' + (i + 1) + '] ' + it.label + '\n' + it.text;
    }).join('\n\n---\n\n');

    send('sources', { sources });

    const messages = history.concat([{ role: 'user', content: message }]);
    let answer = '';
    await anthropic.streamMessage({
      system: buildSystemPrompt(contextBlocks),
      messages,
      onDelta: (text) => { answer += text; send('delta', { text }); },
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
    // questions the books could not answer go to the admin panel to be reviewed; good answers are cached for the next person who asks
    if (chatLog.isNotFound(answer)) await chatLog.recordUnanswered(message, answer, sources);
    else if (!history.length && answer.trim().length > 20) await chatLog.putCache(message, answer, sources, tally.chatModel, dataVersion());
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

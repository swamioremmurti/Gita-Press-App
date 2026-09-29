require('./lib/env').loadEnv();
const voyage = require('./lib/voyage');
const store = require('./lib/vectorStore');

async function main() {
  const query = process.argv[2] || 'कर्मयोग क्या है?';
  console.log('Query:', query);
  let vec;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try { [vec] = await voyage.embed([query], 'query'); break; }
    catch (err) {
      if (attempt === 5) throw err;
      console.log('retry after 429...', err.message.slice(0, 80));
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
  const hits = store.topK(vec, 5);
  hits.forEach((h, i) => {
    const c = h.chunk;
    console.log('\n#' + (i + 1) + ' score=' + h.score.toFixed(3) + ' | ' + c.title + ' | page ' + c.pageStart + ' | heading: ' + c.heading);
    console.log(c.text.slice(0, 300).replace(/\n/g, ' '));
  });
}
main().catch(err => { console.error(err); process.exit(1); });

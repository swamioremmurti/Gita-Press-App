// Standalone status check — run any time, even while build-index.js is running elsewhere.
require('./lib/env').loadEnv();
const fs = require('fs');
const path = require('path');
const store = require('./lib/vectorStore');

const BOOKS_DIR = path.join(__dirname, '..', 'Gita Press Books', 'Gita Press Books');

function main() {
  const totalBooks = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.html')).length;
  const manifest = store.readManifest();
  if (!manifest) {
    console.log('No index yet. Run: node server/build-index.js');
    return;
  }
  const done = manifest.completedFiles.length;
  console.log('Books indexed: ' + done + ' / ' + totalBooks + ' (' + ((100 * done / totalBooks).toFixed(1)) + '%)');
  console.log('Total chunks:  ' + manifest.totalChunks);
  console.log('Embedding model: ' + manifest.model + ' | dims: ' + manifest.dims);

  const progressPath = path.join(store.INDEX_DIR, 'progress.json');
  if (fs.existsSync(progressPath)) {
    const p = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    console.log('Last update: ' + p.updatedAt + ' | last file: ' + p.lastFile);
    console.log('This run so far: ' + p.booksDone + ' done, ETA for remainder of this run: ' + p.etaForThisRun);
  }

  if (fs.existsSync(store.VECTORS_PATH)) {
    const mb = (fs.statSync(store.VECTORS_PATH).size / 1024 / 1024).toFixed(1);
    console.log('Vector index size: ' + mb + ' MB');
  }
  if (done < totalBooks) {
    console.log('\nStill ' + (totalBooks - done) + ' book(s) to go. Resume with: node server/build-index.js');
  } else {
    console.log('\nAll books indexed.');
  }
}

main();

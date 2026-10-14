// Loads server/lib/vrat-catalogue.json into the database now (the API also does it by itself the first time it is asked, and
// again whenever the catalogue file changes). Uses the database named in server/.env -- the local file by default, Turso when
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are set.
//
//   python tools/build_vrat_catalogue.py     (only if database/*.json changed)
//   node server/lib/seed-vrats.js
require('./env').loadEnv();
const db = require('./db');
const { seedVrats } = require('./vrats');

(async () => {
  await db.init();
  const n = await seedVrats();
  const kinds = await db.all('SELECT kind, COUNT(*) AS n FROM vrats GROUP BY kind ORDER BY n DESC');
  console.log('vrats:', n.vrats, '| sources:', n.sources, '|', kinds.map((k) => k.kind + ' ' + k.n).join(', '));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

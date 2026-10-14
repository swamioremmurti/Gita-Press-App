// Vrat / festival catalogue in the database.
//
// The catalogue itself is server/lib/vrat-catalogue.json, built by tools/build_vrat_catalogue.py from the data sets in
// database/ (vrat.json, vrat_chaitra_ashadha.json, dates.json) with the same event merged into one entry. This module
// loads it into three tables and serves it:
//   vrats               one row per vrat / festival (text, kind, and the `rules` that say when it is observed)
//   vrat_sources        the dated scriptural records (dates.json): granth, kand, adhyay, tithi, maas, ghatna, vivran ...
//   vrat_source_links   which sources belong to which vrat (an event can have several, a source can serve several)
//
// The catalogue is loaded again whenever it changes: a hash of the file is kept in the `kv` table and compared before the
// first answer after a cold start (ensureSeeded). By hand:  node server/lib/seed-vrats.js
const crypto = require('crypto');
const db = require('./db');
// required (not read from disk) so that Vercel's bundler sees it and ships it with the function, like quotes-pool.json
const data = require('./vrat-catalogue.json');

function loadCatalogue() {
  if (!Array.isArray(data.vrats) || !Array.isArray(data.sources)) throw new Error('vrat-catalogue.json is malformed');
  return { data, hash: crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex') };
}

const j = (x) => JSON.stringify(x == null ? [] : x);

const UPSERT_VRAT = `INSERT INTO vrats (slug, name, aliases, maas, tithi, intro, pooja_vidhan, vrat_katha, historic_importance, extras,
    kind, parent, rules, keywords, icon, priority, sort_order, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET name = excluded.name, aliases = excluded.aliases, maas = excluded.maas, tithi = excluded.tithi,
    intro = excluded.intro, pooja_vidhan = excluded.pooja_vidhan, vrat_katha = excluded.vrat_katha,
    historic_importance = excluded.historic_importance, extras = excluded.extras, kind = excluded.kind, parent = excluded.parent,
    rules = excluded.rules, keywords = excluded.keywords, icon = excluded.icon, priority = excluded.priority,
    sort_order = excluded.sort_order, updated_at = excluded.updated_at`;

const UPSERT_SOURCE = `INSERT INTO vrat_sources (id, granth, kand, adhyay, tithi, paksh, maas, nakshatra, muhurta, parv, ghatna, vivran, mahatva, anushthan, phal, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET granth = excluded.granth, kand = excluded.kand, adhyay = excluded.adhyay, tithi = excluded.tithi,
    paksh = excluded.paksh, maas = excluded.maas, nakshatra = excluded.nakshatra, muhurta = excluded.muhurta, parv = excluded.parv,
    ghatna = excluded.ghatna, vivran = excluded.vivran, mahatva = excluded.mahatva, anushthan = excluded.anushthan, phal = excluded.phal,
    tags = excluded.tags`;

/** Writes the whole catalogue (insert or update) and drops what is no longer in it. Returns { vrats, sources }. */
async function seedVrats() {
  const { data, hash } = loadCatalogue();
  const now = Date.now();
  const stmts = [];
  for (const v of data.vrats) {
    stmts.push({
      sql: UPSERT_VRAT,
      args: [v.slug, v.name, j(v.aliases), v.maas || '', v.tithi || '', v.intro || '', v.poojaVidhan || '', v.vratKatha || null, v.historicImportance || null,
        j(v.extras), v.kind, v.parent || null, j(v.rules), j(v.keywords), v.icon || '', v.priority == null ? 50 : v.priority, v.order, now, now]
    });
  }
  for (const s of data.sources) {
    stmts.push({
      sql: UPSERT_SOURCE,
      args: [s.id, s.granth, s.kand, s.adhyay, s.tithi, s.paksh, s.maas, s.nakshatra, s.muhurta, s.parv, s.ghatna, s.vivran, s.mahatva, s.anushthan, s.phal, j(s.tags)]
    });
  }
  stmts.push({ sql: 'DELETE FROM vrat_source_links', args: [] });
  for (const [slug, sid] of data.links) stmts.push({ sql: 'INSERT OR IGNORE INTO vrat_source_links (vrat_slug, source_id) VALUES (?, ?)', args: [slug, sid] });
  stmts.push({ sql: `DELETE FROM vrats WHERE slug NOT IN (${data.vrats.map(() => '?').join(',')})`, args: data.vrats.map((v) => v.slug) });
  stmts.push({ sql: `DELETE FROM vrat_sources WHERE id NOT IN (${data.sources.map(() => '?').join(',')})`, args: data.sources.map((s) => s.id) });
  stmts.push({ sql: "INSERT INTO kv (key, value) VALUES ('vrats_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [hash] });
  await db.getClient().batch(stmts, 'write');
  return { vrats: data.vrats.length, sources: data.sources.length };
}

let seeded = null;
/** Called before the vrat endpoints answer: loads the catalogue if the table has not been filled from this version of the file. */
function ensureSeeded() {
  if (!seeded) {
    seeded = (async () => {
      const { hash } = loadCatalogue();
      const cur = await db.get("SELECT value FROM kv WHERE key = 'vrats_hash'");
      if (!cur || cur.value !== hash) await seedVrats();
    })();
    seeded.catch(() => { seeded = null; });
  }
  return seeded;
}

function parse(json, fallback) { try { const v = JSON.parse(json); return v == null ? fallback : v; } catch (e) { return fallback; } }

function shorten(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const stop = Math.max(cut.lastIndexOf('। '), cut.lastIndexOf(' '));
  return (stop > n * 0.6 ? cut.slice(0, stop) : cut).replace(/[\s,;।]+$/, '') + '…';
}

/** What the home page and the lists need: no long texts. */
function summary(r) {
  return {
    slug: r.slug, name: r.name, aliases: parse(r.aliases, []), maas: r.maas, tithi: r.tithi, intro: shorten(r.intro, 220), kind: r.kind,
    parent: r.parent || null, rules: parse(r.rules, []), keywords: parse(r.keywords, []), icon: r.icon, priority: Number(r.priority), order: Number(r.sort_order)
  };
}

async function listVrats() {
  await ensureSeeded();
  const rows = await db.all('SELECT slug, name, aliases, maas, tithi, intro, kind, parent, rules, keywords, icon, priority, sort_order FROM vrats ORDER BY sort_order');
  return rows.map(summary);
}

function sourceOut(s) {
  return {
    id: s.id, granth: s.granth, kand: s.kand, adhyay: s.adhyay, tithi: s.tithi, paksh: s.paksh, maas: s.maas, nakshatra: s.nakshatra, muhurta: s.muhurta,
    parv: s.parv, ghatna: s.ghatna, vivran: s.vivran, mahatva: s.mahatva, anushthan: s.anushthan, phal: s.phal, tags: parse(s.tags, [])
  };
}

async function getVrat(slug) {
  await ensureSeeded();
  const r = await db.get('SELECT * FROM vrats WHERE slug = ?', [slug]);
  if (!r) return null;
  const [sources, variants] = await Promise.all([
    db.all('SELECT s.* FROM vrat_sources s JOIN vrat_source_links l ON l.source_id = s.id WHERE l.vrat_slug = ? ORDER BY s.id', [slug]),
    db.all('SELECT slug, name, maas, tithi, intro, pooja_vidhan, vrat_katha, historic_importance, rules FROM vrats WHERE parent = ? ORDER BY sort_order', [slug])
  ]);
  return Object.assign(summary(r), {
    intro: r.intro, poojaVidhan: r.pooja_vidhan, vratKatha: r.vrat_katha, historicImportance: r.historic_importance, extras: parse(r.extras, []),
    sources: sources.map(sourceOut),
    variants: variants.map((v) => ({ slug: v.slug, name: v.name, maas: v.maas, tithi: v.tithi, intro: v.intro, poojaVidhan: v.pooja_vidhan,
      vratKatha: v.vrat_katha, historicImportance: v.historic_importance, rules: parse(v.rules, []) }))
  });
}

module.exports = { seedVrats, ensureSeeded, listVrats, getVrat };

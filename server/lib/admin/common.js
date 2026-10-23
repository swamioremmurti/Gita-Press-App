// Helpers shared by the admin-panel modules.
const db = require('../db');

async function audit(user, action, target, detail) {
  try {
    await db.run('INSERT INTO admin_log (user_id, user_name, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [user ? user.id : null, user ? user.name : '', action, String(target || '').slice(0, 300), String(detail || '').slice(0, 600), Date.now()]);
  } catch (e) { /* the log must never block the action it describes */ }
}

async function kvGet(key, fallback) {
  const row = await db.get('SELECT value FROM kv WHERE key = ?', [key]);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch (e) { return fallback; }
}

async function kvSet(key, value) {
  await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, JSON.stringify(value)]);
}

const SITE_DEFAULTS = {
  announcement: { enabled: false, text: '', link: '', linkText: '', tone: 'info' },
  lms: { enabled: true, notice: '' }
};

async function siteSettings() {
  const s = await kvGet('site_settings', {});
  return {
    announcement: Object.assign({}, SITE_DEFAULTS.announcement, s.announcement || {}),
    lms: Object.assign({}, SITE_DEFAULTS.lms, s.lms || {})
  };
}

function num(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Runs statements in groups so one request never carries an unbounded batch. */
async function batchInChunks(statements, size) {
  const client = db.getClient();
  const step = size || 40;
  for (let i = 0; i < statements.length; i += step) {
    await client.batch(statements.slice(i, i + step), 'write');
  }
}

module.exports = { audit, kvGet, kvSet, siteSettings, SITE_DEFAULTS, num, batchInChunks };

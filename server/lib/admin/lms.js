// Admin: the Gita course (LMS, /gita on the site).
//
// A learner's progress is one JSON document per user in table `gita_lms` (written by the site, see swadhyay-gita.js:
// { joined, pledge, time, start, paused, ch:{...}, done:{ "<day number>": { d:"YYYY-MM-DD", t:<ms> } }, updatedAt }).
// The plan itself is not stored: the site builds it from assets/data/v1/gita/index.json with the rules below, and this
// module repeats the same rules so it can say "day 40 of 397". Keep PER_DAY / REVISE_EVERY equal to swadhyay-gita.js.
const db = require('../db');
const bd = require('../bookdoc');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, kvGet, kvSet, siteSettings, num } = require('./common');

const PER_DAY = 2;
const REVISE_EVERY = 20;

let indexCache = null;
async function gitaIndex(req) {
  if (indexCache) return indexCache;
  indexCache = JSON.parse(await bd.readSiteFile('assets/data/v1/gita/index.json', req));
  return indexCache;
}

function buildPlan(idx) {
  const plan = [];
  let n = 0;
  idx.chapters.forEach((c) => {
    let since = 0, revFrom = 1;
    for (let v = 1; v <= c.n; v += PER_DAY) {
      const b = Math.min(v + PER_DAY - 1, c.n);
      plan.push({ n: ++n, kind: 'lesson', ch: c.ch, a: v, b });
      since += b - v + 1;
      if (since >= REVISE_EVERY || b === c.n) {
        plan.push({ n: ++n, kind: 'revise', ch: c.ch, a: revFrom, b });
        revFrom = b + 1; since = 0;
      }
    }
  });
  return plan;
}

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const dayNum = (k) => { const p = k.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); };

function summarise(state, plan) {
  const done = state && state.done && typeof state.done === 'object' ? state.done : {};
  const nums = Object.keys(done).filter((k) => done[k] && done[k].d);
  const dates = {};
  nums.forEach((k) => { dates[done[k].d] = 1; });
  const keys = Object.keys(dates).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach((k) => { run = prev !== null && dayNum(k) - prev === 1 ? run + 1 : 1; if (run > best) best = run; prev = dayNum(k); });
  let cur = 0;
  let d = dayKey(new Date());
  if (!dates[d]) { const t = new Date(); t.setDate(t.getDate() - 1); d = dayKey(t); }
  while (dates[d]) { cur++; const p = d.split('-'); const t = new Date(+p[0], +p[1] - 1, +p[2]); t.setDate(t.getDate() - 1); d = dayKey(t); }
  const doneSet = new Set(nums.map(Number));
  let shlokas = 0;
  plan.forEach((p) => { if (p.kind === 'lesson' && doneSet.has(p.n)) shlokas += p.b - p.a + 1; });
  const next = plan.find((p) => !doneSet.has(p.n));
  return {
    joined: !!state.joined, paused: !!state.paused, start: state.start || '', time: state.time || '',
    daysDone: nums.length, totalDays: plan.length, shlokas, streak: cur, bestStreak: best,
    lastActive: keys.length ? keys[keys.length - 1] : '', nextDay: next ? next.n : 0, finished: !next && plan.length > 0
  };
}

async function allLearners(req) {
  const plan = buildPlan(await gitaIndex(req));
  const rows = await db.all(
    `SELECT g.user_id, g.data, g.updated_at, u.name, u.email, u.status FROM gita_lms g JOIN users u ON u.id = g.user_id`);
  return {
    plan,
    learners: rows.map((r) => {
      let st = {};
      try { st = JSON.parse(r.data); } catch (e) { st = {}; }
      return Object.assign({ userId: r.user_id, name: r.name, email: r.email, suspended: r.status === 'suspended', updatedAt: Number(r.updated_at) }, summarise(st, plan));
    })
  };
}

async function overview(ctx) {
  const { plan, learners } = await allLearners(ctx.req);
  const now = Date.now(), DAY = 86400000;
  const joined = learners.filter((l) => l.joined);
  const buckets = [['Not started', 0, 0], ['1-10%', 1, 10], ['11-25%', 11, 25], ['26-50%', 26, 50], ['51-75%', 51, 75], ['76-99%', 76, 99], ['Finished', 100, 100]];
  const dist = buckets.map((b) => ({ label: b[0], n: 0 }));
  joined.forEach((l) => {
    const pct = plan.length ? Math.round(l.daysDone / plan.length * 100) : 0;
    const i = buckets.findIndex((b) => pct >= b[1] && pct <= b[2]);
    dist[i < 0 ? 0 : i].n++;
  });
  const perDay = {};
  const rows = await db.all('SELECT data FROM gita_lms');
  const from = dayKey(new Date(now - 29 * DAY));
  rows.forEach((r) => {
    let st = {};
    try { st = JSON.parse(r.data); } catch (e) { return; }
    Object.keys(st.done || {}).forEach((k) => { const d = st.done[k] && st.done[k].d; if (d && d >= from) perDay[d] = (perDay[d] || 0) + 1; });
  });
  const series = [];
  for (let i = 29; i >= 0; i--) { const k = dayKey(new Date(now - i * DAY)); series.push({ date: k, n: perDay[k] || 0 }); }
  const settings = await siteSettings();
  sendJSON(ctx.res, 200, {
    planDays: plan.length, lessonDays: plan.filter((p) => p.kind === 'lesson').length, revisionDays: plan.filter((p) => p.kind === 'revise').length,
    learners: learners.length, joined: joined.length, paused: joined.filter((l) => l.paused).length,
    active7: learners.filter((l) => now - l.updatedAt < 7 * DAY).length, active30: learners.filter((l) => now - l.updatedAt < 30 * DAY).length,
    finished: learners.filter((l) => l.finished).length,
    avgDaysDone: joined.length ? Math.round(joined.reduce((s, l) => s + l.daysDone, 0) / joined.length * 10) / 10 : 0,
    longestStreak: learners.reduce((m, l) => Math.max(m, l.bestStreak), 0),
    distribution: dist, completionsPerDay: series, settings: settings.lms
  });
}

async function learners(ctx) {
  const { learners: list } = await allLearners(ctx.req);
  const q = queryOf(ctx.req);
  const text = (q.get('q') || '').trim().toLowerCase(), filter = (q.get('filter') || '').trim();
  let out = list;
  if (text) out = out.filter((l) => (l.name + ' ' + l.email).toLowerCase().includes(text));
  const now = Date.now(), DAY = 86400000;
  if (filter === 'active') out = out.filter((l) => l.joined && !l.paused && now - l.updatedAt < 7 * DAY);
  else if (filter === 'inactive') out = out.filter((l) => l.joined && !l.paused && now - l.updatedAt >= 14 * DAY);
  else if (filter === 'paused') out = out.filter((l) => l.paused);
  else if (filter === 'finished') out = out.filter((l) => l.finished);
  else if (filter === 'notjoined') out = out.filter((l) => !l.joined);
  const sort = q.get('sort') || 'recent';
  const by = { recent: (a, b) => b.updatedAt - a.updatedAt, progress: (a, b) => b.daysDone - a.daysDone, streak: (a, b) => b.streak - a.streak, name: (a, b) => a.name.localeCompare(b.name) };
  out = out.slice().sort(by[sort] || by.recent);
  const size = Math.min(200, Math.max(5, num(q.get('size'), 50))), page = Math.max(1, num(q.get('page'), 1));
  sendJSON(ctx.res, 200, { total: out.length, page, size, learners: out.slice((page - 1) * size, page * size) });
}

async function learnerRow(userId) {
  return db.get('SELECT g.data, g.updated_at, u.name, u.email FROM gita_lms g JOIN users u ON u.id = g.user_id WHERE g.user_id = ?', [userId]);
}

async function learnerDetail(ctx, userId) {
  const row = await learnerRow(userId);
  if (!row) return sendJSON(ctx.res, 404, { error: 'This user has no course data' });
  const plan = buildPlan(await gitaIndex(ctx.req));
  let st = {};
  try { st = JSON.parse(row.data); } catch (e) { st = {}; }
  const done = Object.keys(st.done || {}).filter((k) => st.done[k] && st.done[k].d).map((k) => ({ n: Number(k), date: st.done[k].d, at: st.done[k].t || 0 })).sort((a, b) => a.n - b.n);
  sendJSON(ctx.res, 200, {
    user: { id: userId, name: row.name, email: row.email }, updatedAt: Number(row.updated_at),
    summary: summarise(st, plan), pledge: st.pledge || null, channels: st.ch || {}, done,
    plan: plan.map((p) => ({ n: p.n, kind: p.kind, ch: p.ch, a: p.a, b: p.b }))
  });
}

async function learnerAction(ctx, userId) {
  const row = await learnerRow(userId);
  if (!row) return sendJSON(ctx.res, 404, { error: 'This user has no course data' });
  const b = await readJSON(ctx.req);
  let st = {};
  try { st = JSON.parse(row.data); } catch (e) { st = {}; }
  const now = Date.now();
  const plan = buildPlan(await gitaIndex(ctx.req));
  const action = String(b.action || '');
  if (action === 'reset') {
    // `resetAt` tells the learner's devices to drop their own copy instead of pushing it back (swadhyay-gita.js mergeRemote)
    st = { v: 1, joined: false, pledge: null, time: st.time || '06:30', start: '', paused: false, ch: st.ch || {}, done: {}, updatedAt: now, resetAt: now };
  } else if (action === 'undo-day' || action === 'mark-day') {
    const n = num(b.n, 0);
    if (n < 1 || n > plan.length) return sendJSON(ctx.res, 400, { error: 'Day must be between 1 and ' + plan.length });
    st.done = st.done || {};
    if (action === 'undo-day') delete st.done[n];
    else st.done[n] = { d: /^\d{4}-\d\d-\d\d$/.test(b.date || '') ? b.date : dayKey(new Date()), t: now };
    st.updatedAt = now; st.resetAt = now;
  } else if (action === 'pause' || action === 'resume') {
    st.paused = action === 'pause'; st.updatedAt = now;
  } else if (action === 'set-start') {
    if (!/^\d{4}-\d\d-\d\d$/.test(b.date || '')) return sendJSON(ctx.res, 400, { error: 'Give a date as YYYY-MM-DD' });
    st.start = b.date; st.updatedAt = now;
  } else return sendJSON(ctx.res, 400, { error: 'Unknown action' });
  await db.run('UPDATE gita_lms SET data = ?, updated_at = ? WHERE user_id = ?', [JSON.stringify(st), now, userId]);
  await audit(ctx.user, 'lms.' + action, row.email, b.n ? 'day ' + b.n : (b.date || ''));
  sendJSON(ctx.res, 200, { ok: true });
}

// ------------------------------------------------------------------ lesson content (shlokas)

async function chapterList(ctx) {
  const idx = await gitaIndex(ctx.req);
  const counts = await db.all('SELECT ch, COUNT(*) AS n FROM gita_patches GROUP BY ch');
  const by = {};
  counts.forEach((r) => { by[r.ch] = Number(r.n); });
  sendJSON(ctx.res, 200, { book: idx.file, chapters: idx.chapters.map((c) => ({ ch: c.ch, name: c.name, shlokas: c.n, edited: by[c.ch] || 0 })) });
}

async function chapterGet(ctx, ch) {
  let data;
  try { data = JSON.parse(await bd.readSiteFile('assets/data/v1/gita/ch' + pad(ch) + '.json', ctx.req)); }
  catch (e) { return sendJSON(ctx.res, 404, { error: 'Chapter data not found' }); }
  const patches = await db.all('SELECT v, patch FROM gita_patches WHERE ch = ?', [ch]);
  const by = {};
  patches.forEach((p) => { try { by[p.v] = JSON.parse(p.patch); } catch (e) { /* skip */ } });
  sendJSON(ctx.res, 200, {
    ch: data.ch, name: data.name,
    shlokas: data.shlokas.map((s) => ({ v: s.v, original: { s: s.s || '', t: s.t || [], m: s.m || '' }, patch: by[s.v] || null }))
  });
}

async function shlokaSave(ctx, ch, v) {
  const b = await readJSON(ctx.req);
  const patch = {};
  if (b.s !== undefined) patch.s = String(b.s).slice(0, 200);
  if (b.t !== undefined) patch.t = (Array.isArray(b.t) ? b.t : String(b.t).split('\n')).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
  if (b.m !== undefined) patch.m = String(b.m).slice(0, 4000);
  if (!Object.keys(patch).length) return sendJSON(ctx.res, 400, { error: 'Nothing to save' });
  await db.run(
    `INSERT INTO gita_patches (ch, v, patch, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(ch, v) DO UPDATE SET patch = excluded.patch, updated_at = excluded.updated_at`,
    [ch, v, JSON.stringify(patch), Date.now()]);
  await audit(ctx.user, 'lms.shloka.save', 'Gita ' + ch + '.' + v, Object.keys(patch).join(', '));
  sendJSON(ctx.res, 200, { ok: true });
}

async function shlokaRevert(ctx, ch, v) {
  await db.run('DELETE FROM gita_patches WHERE ch = ? AND v = ?', [ch, v]);
  await audit(ctx.user, 'lms.shloka.revert', 'Gita ' + ch + '.' + v, '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function settingsPut(ctx) {
  const b = await readJSON(ctx.req);
  const all = await kvGet('site_settings', {});
  all.lms = { enabled: b.enabled !== false, notice: String(b.notice || '').slice(0, 300) };
  await kvSet('site_settings', all);
  await audit(ctx.user, 'lms.settings', '', all.lms.enabled ? 'enabled' : 'disabled');
  sendJSON(ctx.res, 200, { ok: true, settings: all.lms });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  if (method === 'GET' && pathname === '/api/admin/lms/overview') { await overview(ctx); return true; }
  if (method === 'GET' && pathname === '/api/admin/lms/learners') { await learners(ctx); return true; }
  if (method === 'PUT' && pathname === '/api/admin/lms/settings') { await settingsPut(ctx); return true; }
  if (method === 'GET' && pathname === '/api/admin/lms/chapters') { await chapterList(ctx); return true; }
  let m = pathname.match(/^\/api\/admin\/lms\/learners\/(\d+)(\/action)?$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (!m[2] && method === 'GET') { await learnerDetail(ctx, id); return true; }
    if (m[2] && method === 'POST') { await learnerAction(ctx, id); return true; }
  }
  m = pathname.match(/^\/api\/admin\/lms\/chapters\/(\d+)$/);
  if (m && method === 'GET') { await chapterGet(ctx, parseInt(m[1], 10)); return true; }
  m = pathname.match(/^\/api\/admin\/lms\/shloka\/(\d+)\/([^/]+)$/);
  if (m) {
    const ch = parseInt(m[1], 10), v = decodeURIComponent(m[2]);
    if (method === 'PUT') { await shlokaSave(ctx, ch, v); return true; }
    if (method === 'DELETE') { await shlokaRevert(ctx, ch, v); return true; }
  }
  return false;
}

/** Public: every correction to the lesson data, { "<ch>": { "<verse>": { s, t, m } } }. */
async function publicPatches() {
  const rows = await db.all('SELECT ch, v, patch FROM gita_patches');
  const out = {};
  rows.forEach((r) => {
    try { (out[r.ch] = out[r.ch] || {})[r.v] = JSON.parse(r.patch); } catch (e) { /* skip */ }
  });
  return out;
}

module.exports = { handle, publicPatches };

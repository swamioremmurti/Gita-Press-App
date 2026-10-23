// Admin: audio library (the /audio page and the home-page audio panel).
//
// The built-in catalogue is swadhyay-audio-data.js (static). Everything the admin changes is one JSON document in the kv table
// ("audio_state") laid over it in the browser by SwadhyayAudio.applyState():
//   disabled   [track id]                    tracks switched off
//   overrides  { id: {title, artist, category, src, duration, desc} }   changes to built-in tracks
//   created    [ {id, title, ...} ]          tracks added in the panel
//   order      [track id]                    playing order (tracks not listed keep their natural place, after the listed ones)
//   categories [ {key, hi, en, icon, g, hidden} ] | null   null = the built-in categories
// Track ids are what favourites and resume positions are stored under in listeners' browsers: they are never changed.
const vm = require('vm');
const bd = require('../bookdoc');
const { sendJSON, readJSON, queryOf } = require('../http');
const { audit, kvGet, kvSet, num } = require('./common');

const FIELDS = ['title', 'artist', 'category', 'src', 'duration', 'desc'];
const SRC_RE = /^(https:\/\/[^\s]+|\/[^\s]+|assets\/[^\s]+)$/;

let builtinCache = null;
async function builtin(req) {
  if (builtinCache) return builtinCache;
  const src = await bd.readSiteFile('swadhyay-audio-data.js', req);
  const win = {};
  vm.runInNewContext(src + '\n;this.__cats = SWADHYAY_AUDIO_CATEGORIES; this.__tracks = SWADHYAY_AUDIO_RAW;', win, { timeout: 2000 });
  builtinCache = { cats: JSON.parse(JSON.stringify(win.__cats)), tracks: JSON.parse(JSON.stringify(win.__tracks)) };
  return builtinCache;
}

async function loadState() {
  const s = await kvGet('audio_state', {});
  return {
    disabled: Array.isArray(s.disabled) ? s.disabled : [], overrides: s.overrides || {}, created: Array.isArray(s.created) ? s.created : [],
    order: Array.isArray(s.order) ? s.order : [], categories: Array.isArray(s.categories) ? s.categories : null
  };
}
const saveState = (s) => kvSet('audio_state', s);

function categoriesOf(state, b) { return state.categories || b.cats.map((c) => Object.assign({ hidden: false }, c)); }

function clean(v, k) {
  if (k === 'duration') { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; }
  return String(v == null ? '' : v).trim().slice(0, k === 'desc' ? 400 : 300);
}

/** Every track, with the admin's changes applied, in playing order. */
async function allTracks(req) {
  const b = await builtin(req), s = await loadState();
  const out = [];
  b.tracks.forEach((t) => {
    const ov = s.overrides[t.id] || {};
    out.push(Object.assign({ artist: '', duration: 0, desc: '' }, t, ov, { id: t.id, created: false, overridden: Object.keys(ov).length > 0, baseTitle: t.title, enabled: s.disabled.indexOf(t.id) === -1 }));
  });
  s.created.forEach((t) => out.push(Object.assign({ artist: '', duration: 0, desc: '' }, t, { created: true, overridden: false, baseTitle: t.title, enabled: s.disabled.indexOf(t.id) === -1 })));
  const rank = {};
  s.order.forEach((id, i) => { rank[id] = i; });
  out.forEach((t, i) => { t._n = i; });
  out.sort((a, c) => (rank[a.id] !== undefined ? rank[a.id] : 1e6 + a._n) - (rank[c.id] !== undefined ? rank[c.id] : 1e6 + c._n));
  out.forEach((t) => { delete t._n; });
  return { tracks: out, state: s, builtin: b };
}

async function list(ctx) {
  const q = queryOf(ctx.req);
  const { tracks, state, builtin: b } = await allTracks(ctx.req);
  const cats = categoriesOf(state, b);
  let rows = tracks;
  const cat = (q.get('cat') || '').trim(), status = (q.get('status') || '').trim(), text = (q.get('q') || '').trim().toLowerCase();
  if (cat) rows = rows.filter((t) => t.category === cat);
  if (status === 'enabled') rows = rows.filter((t) => t.enabled);
  else if (status === 'disabled') rows = rows.filter((t) => !t.enabled);
  else if (status === 'created') rows = rows.filter((t) => t.created);
  if (text) rows = rows.filter((t) => (t.title + ' ' + t.artist + ' ' + t.desc).toLowerCase().includes(text));
  sendJSON(ctx.res, 200, { total: rows.length, tracks: rows, categories: cats, all: tracks.length });
}

async function validate(b, cats, partial) {
  const err = (m) => { const e = new Error(m); e.status = 400; throw e; };
  if (!partial || b.title !== undefined) if (!clean(b.title, 'title')) err('A title is required');
  if (!partial || b.category !== undefined) if (!cats.some((c) => c.key === b.category)) err('Choose a category');
  if (!partial || b.src !== undefined) if (!SRC_RE.test(clean(b.src, 'src'))) err('The audio source must be an https:// address, an uploaded file, or a site path starting with / or assets/');
}

async function create(ctx) {
  const b = await readJSON(ctx.req);
  const { state, builtin: bt } = await allTracks(ctx.req);
  await validate(b, categoriesOf(state, bt), false);
  const t = { id: 'a-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) };
  FIELDS.forEach((k) => { t[k] = clean(b[k], k); });
  state.created.push(t);
  state.order.push(t.id);
  await saveState(state);
  await audit(ctx.user, 'audio.create', t.title, t.category);
  sendJSON(ctx.res, 200, { ok: true, track: t });
}

async function patch(ctx, id) {
  const { tracks, state, builtin: bt } = await allTracks(ctx.req);
  const cur = tracks.find((t) => t.id === id);
  if (!cur) return sendJSON(ctx.res, 404, { error: 'Track not found' });
  const b = await readJSON(ctx.req);
  const fields = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) fields[k] = b[k]; });
  await validate(fields, categoriesOf(state, bt), true);
  const idx = state.created.findIndex((t) => t.id === id);
  FIELDS.forEach((k) => {
    if (fields[k] === undefined) return;
    const v = clean(fields[k], k);
    if (idx >= 0) state.created[idx][k] = v; else state.overrides[id] = Object.assign(state.overrides[id] || {}, { [k]: v });
  });
  if (b.enabled !== undefined) {
    state.disabled = state.disabled.filter((x) => x !== id);
    if (!b.enabled) state.disabled.push(id);
  }
  if (b.reset && idx < 0) delete state.overrides[id];
  await saveState(state);
  await audit(ctx.user, 'audio.update', cur.title, Object.keys(b).join(', '));
  sendJSON(ctx.res, 200, { ok: true });
}

async function remove(ctx, id) {
  const state = await loadState();
  const idx = state.created.findIndex((t) => t.id === id);
  if (idx < 0) return sendJSON(ctx.res, 400, { error: 'Built-in tracks cannot be deleted. Disable the track to hide it.' });
  const title = state.created[idx].title;
  state.created.splice(idx, 1);
  state.order = state.order.filter((x) => x !== id);
  state.disabled = state.disabled.filter((x) => x !== id);
  await saveState(state);
  await audit(ctx.user, 'audio.delete', title, '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function bulk(ctx) {
  const b = await readJSON(ctx.req);
  const { tracks, state, builtin: bt } = await allTracks(ctx.req);
  const known = new Set(tracks.map((t) => t.id));
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter((id) => known.has(id));
  if (!ids.length) return sendJSON(ctx.res, 400, { error: 'No tracks selected' });
  if (b.action === 'enable') state.disabled = state.disabled.filter((x) => ids.indexOf(x) === -1);
  else if (b.action === 'disable') state.disabled = [...new Set(state.disabled.concat(ids))];
  else if (b.action === 'setCategory') {
    if (!categoriesOf(state, bt).some((c) => c.key === b.category)) return sendJSON(ctx.res, 400, { error: 'Unknown category' });
    ids.forEach((id) => {
      const i = state.created.findIndex((t) => t.id === id);
      if (i >= 0) state.created[i].category = b.category; else state.overrides[id] = Object.assign(state.overrides[id] || {}, { category: b.category });
    });
  } else if (b.action === 'delete') {
    state.created = state.created.filter((t) => ids.indexOf(t.id) === -1);
    state.order = state.order.filter((x) => ids.indexOf(x) === -1);
  } else return sendJSON(ctx.res, 400, { error: 'Unknown action' });
  await saveState(state);
  await audit(ctx.user, 'audio.bulk.' + b.action, ids.length + ' tracks', b.category || '');
  sendJSON(ctx.res, 200, { ok: true, changed: ids.length });
}

async function reorder(ctx) {
  const b = await readJSON(ctx.req);
  const { tracks, state } = await allTracks(ctx.req);
  const known = new Set(tracks.map((t) => t.id));
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter((id) => known.has(id));
  // the ids sent are one filtered view (e.g. a single category): keep every other track where it was
  const sent = new Set(ids), slots = [];
  tracks.forEach((t, i) => { if (sent.has(t.id)) slots.push(i); });
  const next = tracks.map((t) => t.id);
  slots.forEach((pos, i) => { next[pos] = ids[i]; });
  state.order = next;
  await saveState(state);
  await audit(ctx.user, 'audio.reorder', '', ids.length + ' tracks');
  sendJSON(ctx.res, 200, { ok: true });
}

// ------------------------------------------------------------------ categories

async function catList(ctx) {
  const { tracks, state, builtin: b } = await allTracks(ctx.req);
  const n = {};
  tracks.forEach((t) => { n[t.category] = (n[t.category] || 0) + 1; });
  sendJSON(ctx.res, 200, { categories: categoriesOf(state, b).map((c) => Object.assign({}, c, { tracks: n[c.key] || 0 })) });
}

const GRADIENT = /^#[0-9a-fA-F]{6}$/;
function catFields(b, base) {
  const out = Object.assign({}, base);
  if (b.en !== undefined) out.en = clean(b.en, 'title');
  if (b.hi !== undefined) out.hi = clean(b.hi, 'title');
  if (b.icon !== undefined) out.icon = clean(b.icon, 'title').slice(0, 8);
  if (Array.isArray(b.g) && b.g.length === 2 && b.g.every((c) => GRADIENT.test(c))) out.g = b.g;
  if (b.hidden !== undefined) out.hidden = !!b.hidden;
  return out;
}

async function catCreate(ctx) {
  const b = await readJSON(ctx.req);
  const { state, builtin: bt } = await allTracks(ctx.req);
  const cats = categoriesOf(state, bt);
  const en = clean(b.en, 'title');
  if (!en) return sendJSON(ctx.res, 400, { error: 'An English name is required' });
  const key = (clean(b.key || en, 'title').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || 'cat-' + Date.now().toString(36);
  if (cats.some((c) => c.key === key)) return sendJSON(ctx.res, 409, { error: 'A category with this key already exists' });
  cats.push(catFields(b, { key, hi: en, en, icon: '🎵', g: ['#d9822b', '#8a1f0f'], hidden: false }));
  state.categories = cats;
  await saveState(state);
  await audit(ctx.user, 'audio.category.create', key, '');
  sendJSON(ctx.res, 200, { ok: true, key });
}

async function catUpdate(ctx, key) {
  const b = await readJSON(ctx.req);
  const { state, builtin: bt } = await allTracks(ctx.req);
  const cats = categoriesOf(state, bt), i = cats.findIndex((c) => c.key === key);
  if (i < 0) return sendJSON(ctx.res, 404, { error: 'Category not found' });
  cats[i] = catFields(b, cats[i]);
  state.categories = cats;
  await saveState(state);
  await audit(ctx.user, 'audio.category.update', key, Object.keys(b).join(', '));
  sendJSON(ctx.res, 200, { ok: true });
}

async function catDelete(ctx, key) {
  const b = await readJSON(ctx.req).catch(() => ({}));
  const { tracks, state, builtin: bt } = await allTracks(ctx.req);
  const cats = categoriesOf(state, bt);
  if (!cats.some((c) => c.key === key)) return sendJSON(ctx.res, 404, { error: 'Category not found' });
  const used = tracks.filter((t) => t.category === key);
  const moveTo = b && b.moveTo ? String(b.moveTo) : '';
  if (used.length) {
    if (!moveTo || moveTo === key || !cats.some((c) => c.key === moveTo)) return sendJSON(ctx.res, 400, { error: used.length + ' track(s) use this category. Choose another category to move them to.' });
    used.forEach((t) => {
      const i = state.created.findIndex((x) => x.id === t.id);
      if (i >= 0) state.created[i].category = moveTo; else state.overrides[t.id] = Object.assign(state.overrides[t.id] || {}, { category: moveTo });
    });
  }
  state.categories = cats.filter((c) => c.key !== key);
  await saveState(state);
  await audit(ctx.user, 'audio.category.delete', key, moveTo ? 'tracks moved to ' + moveTo : '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function catReorder(ctx) {
  const b = await readJSON(ctx.req);
  const { state, builtin: bt } = await allTracks(ctx.req);
  const cats = categoriesOf(state, bt), keys = Array.isArray(b.keys) ? b.keys : [];
  const by = {};
  cats.forEach((c) => { by[c.key] = c; });
  const next = keys.filter((k) => by[k]).map((k) => by[k]);
  cats.forEach((c) => { if (keys.indexOf(c.key) === -1) next.push(c); });
  state.categories = next;
  await saveState(state);
  await audit(ctx.user, 'audio.category.reorder', '', '');
  sendJSON(ctx.res, 200, { ok: true });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  try {
    if (pathname === '/api/admin/audio') {
      if (method === 'GET') { await list(ctx); return true; }
      if (method === 'POST') { await create(ctx); return true; }
    }
    if (method === 'POST' && pathname === '/api/admin/audio/bulk') { await bulk(ctx); return true; }
    if (method === 'POST' && pathname === '/api/admin/audio/reorder') { await reorder(ctx); return true; }
    if (pathname === '/api/admin/audio-categories') {
      if (method === 'GET') { await catList(ctx); return true; }
      if (method === 'POST') { await catCreate(ctx); return true; }
    }
    if (method === 'POST' && pathname === '/api/admin/audio-categories/reorder') { await catReorder(ctx); return true; }
    let m = pathname.match(/^\/api\/admin\/audio-categories\/([^/]+)$/);
    if (m) {
      const key = decodeURIComponent(m[1]);
      if (method === 'PATCH') { await catUpdate(ctx, key); return true; }
      if (method === 'DELETE') { await catDelete(ctx, key); return true; }
    }
    m = pathname.match(/^\/api\/admin\/audio\/([^/]+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (method === 'PATCH') { await patch(ctx, id); return true; }
      if (method === 'DELETE') { await remove(ctx, id); return true; }
    }
  } catch (e) {
    if (e.status === 400) { sendJSON(ctx.res, 400, { error: e.message }); return true; }
    throw e;
  }
  return false;
}

/** Public: what the site lays over swadhyay-audio-data.js (part of /api/book-meta). */
async function publicAudio() {
  const s = await loadState();
  return { disabled: s.disabled, overrides: s.overrides, created: s.created, order: s.order, categories: s.categories };
}

module.exports = { handle, publicAudio };

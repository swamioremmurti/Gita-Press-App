// Admin: CSS editor.
//
// swadhyay.css (the app) and master.css (the text of the books) are static files and stay as they are. What the admin writes here is a
// custom stylesheet laid AFTER the original, per target, so it can override any rule and is removed by simply clearing it:
//   site   -> <style id="kalyan-custom-css"> in the app (every page)
//   books  -> added to the head of every book in the reader (and shown in the chapter editor)
// The current text of both is part of /api/book-meta (so no extra request on page load); every save also keeps the previous text
// (30 versions per target) so a bad change can be rolled back from the editor.
const { sendJSON, readJSON } = require('../http');
const { audit, kvGet, kvSet } = require('./common');

const TARGETS = { site: 'swadhyay.css', books: 'master.css' };
const MAX_CSS = 200 * 1024;
const MAX_VERSIONS = 30;

async function current() {
  const s = await kvGet('custom_css', {});
  const out = {};
  Object.keys(TARGETS).forEach((t) => { out[t] = Object.assign({ css: '', updatedAt: 0, by: '' }, s[t] || {}); });
  return out;
}

/** Why this text cannot be saved, or '' when it is fine. */
function problem(css) {
  if (css.length > MAX_CSS) return 'The stylesheet is larger than ' + (MAX_CSS / 1024) + ' KB';
  if (/<\/?\s*(style|script)/i.test(css)) return 'HTML tags such as <style> or <script> are not allowed in CSS';
  if (/@import\s+(?!url\(\s*["']?https:\/\/|["']https:\/\/)/i.test(css)) return '@import is only allowed with an https:// address';
  if (/expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(css)) return 'This CSS uses a construct that is not allowed (expression, javascript:, behavior, -moz-binding)';
  // balanced braces outside strings and comments
  let depth = 0, i = 0, q = '';
  while (i < css.length) {
    const c = css[i], n = css[i + 1];
    if (q) { if (c === '\\') i++; else if (c === q) q = ''; }
    else if (c === '/' && n === '*') { const e = css.indexOf('*/', i + 2); if (e < 0) return 'A comment is never closed (missing */)'; i = e + 1; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth < 0) return 'There is an extra closing brace } near character ' + i; }
    i++;
  }
  if (q) return 'A string is never closed';
  if (depth > 0) return depth + ' opening brace(s) { are never closed';
  return '';
}

async function get(ctx) { sendJSON(ctx.res, 200, { targets: await current(), files: TARGETS }); }

async function save(ctx, target) {
  const b = await readJSON(ctx.req, 400 * 1024);
  const css = String(b.css == null ? '' : b.css).replace(/\r\n/g, '\n');
  const why = problem(css);
  if (why) return sendJSON(ctx.res, 400, { error: why });
  const all = await kvGet('custom_css', {});
  const prev = all[target] || { css: '' };
  if (prev.css === css) return sendJSON(ctx.res, 200, { ok: true, changed: false, updatedAt: prev.updatedAt || 0 });
  const vkey = 'custom_css_versions_' + target;
  const versions = await kvGet(vkey, []);
  if (prev.css) versions.unshift({ at: prev.updatedAt || Date.now(), savedAt: Date.now(), css: prev.css, note: String(b.note || '').slice(0, 120), by: ctx.user.name });
  await kvSet(vkey, versions.slice(0, MAX_VERSIONS));
  const now = Date.now();
  all[target] = { css, updatedAt: now, by: ctx.user.name };
  await kvSet('custom_css', all);
  await audit(ctx.user, 'css.save', TARGETS[target], css.length + ' characters');
  sendJSON(ctx.res, 200, { ok: true, changed: true, updatedAt: now });
}

async function versions(ctx, target) {
  const v = await kvGet('custom_css_versions_' + target, []);
  sendJSON(ctx.res, 200, { versions: v.map((x) => ({ at: x.at, savedAt: x.savedAt, size: x.css.length, note: x.note || '', by: x.by || '' })) });
}

async function versionGet(ctx, target, savedAt) {
  const v = (await kvGet('custom_css_versions_' + target, [])).find((x) => x.savedAt === savedAt);
  if (!v) return sendJSON(ctx.res, 404, { error: 'Version not found' });
  sendJSON(ctx.res, 200, { css: v.css, savedAt: v.savedAt, note: v.note || '' });
}

async function handle(ctx) {
  const { method, pathname } = ctx;
  if (method === 'GET' && pathname === '/api/admin/css') { await get(ctx); return true; }
  let m = pathname.match(/^\/api\/admin\/css\/(site|books)$/);
  if (m && method === 'PUT') { await save(ctx, m[1]); return true; }
  m = pathname.match(/^\/api\/admin\/css\/(site|books)\/versions$/);
  if (m && method === 'GET') { await versions(ctx, m[1]); return true; }
  m = pathname.match(/^\/api\/admin\/css\/(site|books)\/versions\/(\d+)$/);
  if (m && method === 'GET') { await versionGet(ctx, m[1], parseInt(m[2], 10)); return true; }
  return false;
}

/** Public: the current custom CSS of both targets (empty ones left out) -- part of /api/book-meta. */
async function publicCss() {
  const s = await kvGet('custom_css', {});
  const out = {};
  Object.keys(TARGETS).forEach((t) => { if (s[t] && s[t].css) out[t] = s[t].css; });
  return Object.keys(out).length ? out : null;
}

module.exports = { handle, publicCss, problem };

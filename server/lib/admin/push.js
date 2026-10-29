// Admin: push notifications to the Android app (Firebase Cloud Messaging, HTTP v1 API).
//
// The app subscribes every phone to the topic "all" (and debug builds also to "test"), so a message sent to a topic reaches them
// without keeping a list of device tokens. Sending needs a Firebase *service account*: its JSON key goes into the environment
// variable FIREBASE_SERVICE_ACCOUNT (whole JSON text, or the same text base64-encoded) -- never into a file in the repository.
// No extra package is used: the OAuth token is made with the JWT sign-in flow using Node's own crypto and fetch.
const crypto = require('crypto');
const db = require('../db');
const { sendJSON, readJSON } = require('../http');
const { audit } = require('./common');

const SITE = (process.env.SITE_URL || 'https://www.kalyanseva.com').replace(/\/+$/, '');
const SITE_HOSTS = ['kalyanseva.com', 'www.kalyanseva.com'];
const AUDIENCES = { all: 'Everyone', test: 'Test devices' };
const LIMITS = { title: 65, body: 240, url: 300, imageUrl: 500, imageBytes: 1024 * 1024 };   // Google advises pictures under 1 MB
const CHANNEL = 'kalyan_default';          // created by the app (KSMessagingService.ensureChannel)
const MIN_GAP_MS = 20 * 1000;               // two real sends closer than this are refused (double click, double tab)

/* ---------------------------------------------------------------- credentials */
let tokenCache = { value: '', exp: 0, key: '' };

/** The service account from the environment: { sa } when usable, { problem } when not. */
function serviceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) return { problem: 'FIREBASE_SERVICE_ACCOUNT is not set' };
  if (raw[0] !== '{') {
    try { raw = Buffer.from(raw, 'base64').toString('utf8'); } catch (e) { /* falls through to the JSON error */ }
  }
  let sa;
  try { sa = JSON.parse(raw); } catch (e) { return { problem: 'FIREBASE_SERVICE_ACCOUNT is not valid JSON' }; }
  if (!sa || !sa.project_id || !sa.client_email || !sa.private_key) {
    return { problem: 'FIREBASE_SERVICE_ACCOUNT must contain project_id, client_email and private_key (use a "service account" key, not google-services.json)' };
  }
  sa.private_key = String(sa.private_key).replace(/\\n/g, '\n');
  return { sa };
}

function b64url(v) { return Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url'); }

/** A signed one-hour JWT that Google exchanges for an access token. */
function makeJwt(sa, nowSec) {
  const iat = nowSec || Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'RS256', typ: 'JWT' });
  const claims = b64url({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claims).sign(sa.private_key, 'base64url');
  return head + '.' + claims + '.' + sig;
}

async function accessToken(sa, doFetch) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.key === sa.client_email && tokenCache.exp - 60000 > now) return tokenCache.value;
  const res = await doFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(makeJwt(sa))
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const e = new Error('Google refused the service account (' + (data.error_description || data.error || res.status) + ')');
    e.status = 502;
    throw e;
  }
  tokenCache = { value: data.access_token, exp: now + (Number(data.expires_in) || 3600) * 1000, key: sa.client_email };
  return tokenCache.value;
}

/* ---------------------------------------------------------------- the message */
/** A link typed by the admin -> a full https address of this site, '' for none, or throws a short explanation. */
function normalizeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (u[0] === '/' && u[1] !== '/') return SITE + u;
  let parsed;
  try { parsed = new URL(u); } catch (e) { throw httpError(400, 'The link must be a page of this site, for example /gita'); }
  if (parsed.protocol !== 'https:' || SITE_HOSTS.indexOf(parsed.hostname) === -1) throw httpError(400, 'The link must be a page of kalyanseva.com');
  return parsed.href;
}

/** A picture address: a path of this site, or any https address that is not an internal one. Returns '' for none. */
function normalizeImageUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (u.length > LIMITS.imageUrl) throw httpError(400, 'The picture address is too long');
  if (u[0] === '/' && u[1] !== '/') return SITE + u;
  let p;
  try { p = new URL(u); } catch (e) { throw httpError(400, 'The picture address is not valid'); }
  if (p.protocol !== 'https:') throw httpError(400, 'The picture must be an https:// address (phones will not load plain http)');
  const h = p.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.indexOf(':') !== -1 || h.indexOf('[') !== -1) {
    throw httpError(400, 'The picture must be on a public website, not a local or numeric address');
  }
  return p.href;
}

/** Asks the picture's address for its headers (as a phone would load it) and refuses anything a phone could not show. */
async function checkImage(url, doFetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 7000);
  let res;
  try {
    res = await doFetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl.signal });
    if (res.status === 405 || res.status === 501) res = await doFetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, redirect: 'follow', signal: ctl.signal });
  } catch (e) {
    throw httpError(400, 'Could not reach the picture (' + (e.name === 'AbortError' ? 'it took too long' : 'connection failed') + '). Check the address.');
  } finally { clearTimeout(timer); }
  const gated = url.indexOf(SITE) === 0 && (res.status === 401 || res.status === 403);
  if (gated) throw httpError(400, 'Phones cannot load pictures from kalyanseva.com while the pre-launch password screen is on. Use a picture link hosted elsewhere, or send without a picture for now.');
  if (!res.ok && res.status !== 206) throw httpError(400, 'The picture could not be loaded (HTTP ' + res.status + ').');
  const type = String((res.headers && res.headers.get && res.headers.get('content-type')) || '').split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(type)) throw httpError(400, 'That address is not a PNG, JPEG, WebP or GIF picture' + (type ? ' (it is ' + type + ')' : '') + '.');
  const range = String((res.headers && res.headers.get && res.headers.get('content-range')) || '');
  const total = range.indexOf('/') !== -1 ? Number(range.split('/')[1]) : Number(res.headers && res.headers.get && res.headers.get('content-length'));
  if (total > LIMITS.imageBytes) throw httpError(400, 'The picture is ' + (total / 1048576).toFixed(1) + ' MB. Notifications show pictures reliably only up to 1 MB: use a smaller or more compressed picture.');
  return { type, bytes: total || 0 };
}

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

function buildMessage({ audience, title, body, url, image, validateOnly }) {
  const message = {
    topic: audience,
    notification: image ? { title, body, image } : { title, body },
    android: { priority: 'HIGH', notification: { channel_id: CHANNEL, default_sound: true } }
  };
  if (url) message.data = { url };
  const out = { message };
  if (validateOnly) out.validate_only = true;
  return out;
}

/** What Google said went wrong, in words an admin can act on. */
function explainFcmError(status, data) {
  const err = (data && data.error) || {};
  const msg = String(err.message || '');
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(msg)) return 'Firebase Cloud Messaging API (V1) is switched off for this project. Enable it in Google Cloud console > APIs & Services, then try again.';
  if (status === 401 || err.status === 'UNAUTHENTICATED') return 'Google did not accept the service account. Create a new key in Firebase > Project settings > Service accounts.';
  if (status === 403 || err.status === 'PERMISSION_DENIED') return 'This service account is not allowed to send messages (it needs the "Firebase Cloud Messaging Admin" role).';
  if (status === 429 || err.status === 'QUOTA_EXCEEDED') return 'Google says too many messages were sent. Try again in a few minutes.';
  if (err.status === 'INVALID_ARGUMENT') return 'Google rejected the message: ' + msg;
  return 'Google could not send the message (' + (err.status || status) + '): ' + msg;
}

async function deliver(sa, payload, doFetch) {
  const token = await accessToken(sa, doFetch);
  const res = await doFetch('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(sa.project_id) + '/messages:send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(explainFcmError(res.status, data)); e.status = 502; e.fcm = data; throw e; }
  return data;
}

/* ---------------------------------------------------------------- routes */
async function history(limit) {
  const rows = await db.all('SELECT id, user_name, audience, title, body, url, image, status, detail, created_at FROM push_log ORDER BY id DESC LIMIT ?', [limit || 30]);
  return rows.map((r) => ({ id: Number(r.id), by: r.user_name, audience: r.audience, title: r.title, body: r.body, url: r.url, image: r.image || '', status: r.status, detail: r.detail, at: Number(r.created_at) }));
}

async function statusRoute(ctx) {
  const c = serviceAccount();
  sendJSON(ctx.res, 200, {
    configured: !!c.sa,
    problem: c.problem || '',
    projectId: c.sa ? c.sa.project_id : '',
    serviceAccount: c.sa ? c.sa.client_email : '',
    audiences: AUDIENCES, limits: LIMITS, site: SITE, siteGated: !!process.env.SITE_PASSWORD,
    history: await history(30)
  });
}

async function sendRoute(ctx, doFetch) {
  const b = (await readJSON(ctx.req, 20 * 1024)) || {};
  const title = String(b.title || '').trim();
  const body = String(b.body || '').trim();
  const audience = String(b.audience || 'all');
  const validateOnly = !!b.validateOnly;
  if (!title) throw httpError(400, 'Write a title');
  if (!body) throw httpError(400, 'Write the message');
  if (title.length > LIMITS.title) throw httpError(400, 'The title is longer than ' + LIMITS.title + ' characters');
  if (body.length > LIMITS.body) throw httpError(400, 'The message is longer than ' + LIMITS.body + ' characters');
  if (!AUDIENCES[audience]) throw httpError(400, 'Choose who should receive it');
  const url = normalizeUrl(b.url);
  const image = normalizeImageUrl(b.imageUrl);
  const c = serviceAccount();
  if (!c.sa) throw httpError(400, 'Push notifications are not set up yet: ' + c.problem);

  if (image) await checkImage(image, doFetch);

  if (!validateOnly) {
    const last = await db.get("SELECT created_at FROM push_log WHERE status = 'sent' ORDER BY id DESC LIMIT 1");
    if (last && Date.now() - Number(last.created_at) < MIN_GAP_MS) throw httpError(429, 'A message was just sent. Wait a few seconds before sending another.');
  }

  const log = (status, detail) => db.run('INSERT INTO push_log (user_name, audience, title, body, url, image, status, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [ctx.user ? ctx.user.name : '', audience, title, body, url, image, status, String(detail || '').slice(0, 500), Date.now()]);
  try {
    const result = await deliver(c.sa, buildMessage({ audience, title, body, url, image, validateOnly }), doFetch);
    await log(validateOnly ? 'checked' : 'sent', result.name || '');
    await audit(ctx.user, validateOnly ? 'push.check' : 'push.send', title, AUDIENCES[audience]);
    sendJSON(ctx.res, 200, { ok: true, checked: validateOnly, audience, id: result.name || '' });
  } catch (e) {
    await log('failed', e.message).catch(() => {});
    throw e;
  }
}

/** Returns true when the request was answered. `doFetch` is only replaced by tests. */
async function handle(ctx, doFetch) {
  const f = doFetch || ((...a) => fetch(...a));
  try {
    if (ctx.method === 'GET' && ctx.pathname === '/api/admin/push') { await statusRoute(ctx); return true; }
    if (ctx.method === 'POST' && ctx.pathname === '/api/admin/push/send') { await sendRoute(ctx, f); return true; }
  } catch (e) {
    sendJSON(ctx.res, e.status || 500, { error: e.message || 'Could not send' });
    return true;
  }
  return false;
}

module.exports = { handle, _test: { buildMessage, normalizeUrl, normalizeImageUrl, checkImage, makeJwt, serviceAccount, explainFcmError, resetTokenCache: () => { tokenCache = { value: '', exp: 0, key: '' }; } } };

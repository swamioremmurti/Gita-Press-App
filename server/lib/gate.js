// Pre-launch access gate. While the SITE_PASSWORD environment variable is set, every request
// (pages, books, assets, /api/*) gets the "coming soon" page until the visitor has entered that
// password; remove the variable (and redeploy) to open the site to everyone.
//
// Written against the standard Request/Response objects so the same code runs in the Vercel
// Routing Middleware (/middleware.js) and in the local server (server/server.js).
// The password is only ever read from the environment -- it is not in the repository.
//
// The cookie holds an HMAC of a fixed label keyed with the password, never the password itself,
// so changing the password signs everyone out.
const gatePage = require('./gate-page');

const COOKIE = 'kalyan_gate';
const MAX_AGE = 60 * 60 * 24 * 30;
// what the "coming soon" page itself needs
const OPEN = /^\/(assets\/gate\/|fonts\/|assets\/logo-mark\.svg$|assets\/favicon-[^/]*$|assets\/apple-touch-icon\.png$)/;

const HEX = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
async function token(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return HEX(await crypto.subtle.sign('HMAC', key, enc.encode('kalyan-gate-v1')));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function cookieOf(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : '';
}
const safeNext = (n) => (typeof n === 'string' && /^\/(?![/\\])/.test(n) && !n.startsWith('/__gate') ? n : '/');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const html = (body, status) => new Response(body, { status, headers: { ...NO_STORE, 'Content-Type': 'text/html; charset=utf-8' } });

// Returns a Response to answer the request with, or null to let it through to the site.
async function handle(req, env) {
  const password = env && env.SITE_PASSWORD;
  if (!password) return null;

  const url = new URL(req.url);
  const p = url.pathname;
  if (OPEN.test(p)) return null;
  const good = await token(password);

  if (p === '/__gate' && req.method === 'POST') {
    const form = new URLSearchParams(await req.text());
    const next = safeNext(form.get('next'));
    const entered = form.get('password') || '';
    if (entered && safeEqual(await token(entered), good)) {
      const secure = url.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
      return new Response(null, {
        status: 303,
        headers: { ...NO_STORE, Location: next, 'Set-Cookie': COOKIE + '=' + good + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + MAX_AGE + secure }
      });
    }
    await wait(700);   // slows down guessing a little
    return html(gatePage({ error: 'पासवर्ड सही नहीं है। कृपया पुनः प्रयास करें।', next }), 401);
  }

  if (safeEqual(cookieOf(req, COOKIE), good)) return null;

  if (p === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { status: 200, headers: { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' } });
  if (p.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Access restricted' }), { status: 401, headers: { ...NO_STORE, 'Content-Type': 'application/json; charset=utf-8' } });
  }
  return html(gatePage({ next: p + url.search }), 401);
}

module.exports = { handle };

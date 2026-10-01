// Password hashing (Node core crypto.scrypt -- no extra dependency) + opaque
// DB-backed session tokens set as an HttpOnly cookie. No JWT: sessions are
// easy to revoke/inspect this way, which fits a small single-server app.
const crypto = require('crypto');
const db = require('./db');

const SESSION_COOKIE = 'swadhyay_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false; // Google-only accounts have no password set
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.run('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, now, now + SESSION_TTL_MS]);
  return token;
}

function destroySession(token) {
  if (!token) return;
  db.run('DELETE FROM sessions WHERE token = ?', [token]);
}

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, avatarUrl: row.avatar_url || null };
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  });
  return out;
}

function setSessionCookie(res, token) {
  const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Resolve the current request's user (or null), from the session cookie. */
function currentUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = db.get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!session || session.expires_at < Date.now()) return null;
  const user = db.get('SELECT * FROM users WHERE id = ?', [session.user_id]);
  return publicUser(user);
}

function currentSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

module.exports = {
  hashPassword, verifyPassword, createSession, destroySession,
  publicUser, setSessionCookie, clearSessionCookie, currentUser, currentSessionToken
};

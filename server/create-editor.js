// Creates (or updates) an Editor account: it can proofread books and see the changes, nothing else.
//   node create-editor.js <login-id> <password> [display name]       -> the database in .env (production Turso when it is set)
//   node create-editor.js <login-id> <password> [display name] --local -> the local file database only
// The login id goes in the "Email" box of the admin sign-in page (it is lower-cased, like every sign-in).
require('./lib/env').loadEnv();
const args = process.argv.slice(2);
const local = args.includes('--local');
const [loginId, password, name] = args.filter((a) => a !== '--local');
if (!loginId || !password) { console.error('Usage: node create-editor.js <login-id> <password> [display name] [--local]'); process.exit(1); }
if (local) { delete process.env.TURSO_DATABASE_URL; delete process.env.TURSO_AUTH_TOKEN; }

const db = require('./lib/db');
const auth = require('./lib/auth');

(async () => {
  await db.init();
  const email = loginId.trim().toLowerCase();
  const { hash, salt } = auth.hashPassword(password);
  const existing = await db.get('SELECT id, role FROM users WHERE email = ?', [email]);
  if (existing && existing.role === 'admin') { console.error(email + ' is an administrator already; not changing it.'); process.exit(1); }
  if (existing) {
    await db.run("UPDATE users SET password_hash = ?, salt = ?, role = 'editor', status = 'active', name = COALESCE(?, name) WHERE id = ?", [hash, salt, name || null, existing.id]);
    console.log('Updated ' + email + ' (id ' + existing.id + ') as an editor.');
  } else {
    await db.run('INSERT INTO users (name, email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [name || 'Editor', email, hash, salt, 'editor', Date.now()]);
    console.log('Created editor ' + email + ' (id ' + db.lastInsertId() + ').');
  }
  console.log('Database: ' + (process.env.TURSO_DATABASE_URL || db.LOCAL_DB_PATH));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });

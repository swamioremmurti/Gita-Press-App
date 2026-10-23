// Database access via @libsql/client (libSQL -- SQLite's actual engine, with a client
// that works identically against a local file (zero setup, used for local dev and for
// server/server.js when run as a long-lived process) or a remote Turso database (used
// in production on Vercel, where serverless functions have no persistent local disk).
// Replaces the earlier sql.js (WASM) version: sql.js kept the whole DB in memory and had
// to be manually exported to disk after every write, which only works on a machine with
// a persistent filesystem -- it silently loses data between invocations on Vercel.
const path = require('path');
const { createClient } = require('@libsql/client');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'swadhyay.sqlite');

let client = null;
let lastResult = null;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    salt          TEXT,
    google_id     TEXT UNIQUE,
    avatar_url    TEXT,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS authors (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    bio        TEXT NOT NULL DEFAULT '',
    photo_path TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    key  TEXT PRIMARY KEY,
    hi   TEXT NOT NULL,
    en   TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS book_categories (
    book_file     TEXT NOT NULL,
    category_key  TEXT NOT NULL,
    PRIMARY KEY (book_file, category_key)
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS book_tags (
    book_file TEXT NOT NULL,
    tag_id    INTEGER NOT NULL,
    PRIMARY KEY (book_file, tag_id)
  )`,
  `CREATE TABLE IF NOT EXISTS book_authors (
    book_file TEXT PRIMARY KEY,
    author_id INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    book_file  TEXT NOT NULL,
    user_id    INTEGER NOT NULL,
    text       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'visible',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS progress (
    user_id         INTEGER NOT NULL,
    book_file       TEXT NOT NULL,
    progress_pct    INTEGER NOT NULL DEFAULT 0,
    last_opened_at  INTEGER,
    first_opened_at INTEGER,
    PRIMARY KEY (user_id, book_file)
  )`,
  // Gita LMS: one JSON document per user (plan progress, pledge, reminder choices) -- see swadhyay-gita.js
  `CREATE TABLE IF NOT EXISTS gita_lms (
    user_id    INTEGER PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // how many speech-check tokens a learner (or an address) has asked for this hour -- see /api/asr/token
  `CREATE TABLE IF NOT EXISTS asr_usage (
    who  TEXT NOT NULL,
    hour INTEGER NOT NULL,
    n    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (who, hour)
  )`,
  // vrat / festival catalogue (loaded from server/lib/vrat-catalogue.json by server/lib/vrats.js)
  `CREATE TABLE IF NOT EXISTS vrats (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    aliases             TEXT NOT NULL DEFAULT '[]',
    maas                TEXT NOT NULL DEFAULT '',
    tithi               TEXT NOT NULL DEFAULT '',
    intro               TEXT NOT NULL DEFAULT '',
    pooja_vidhan        TEXT NOT NULL DEFAULT '',
    vrat_katha          TEXT,
    historic_importance TEXT,
    extras              TEXT NOT NULL DEFAULT '[]',
    kind                TEXT NOT NULL,
    parent              TEXT,
    rules               TEXT NOT NULL DEFAULT '[]',
    keywords            TEXT NOT NULL DEFAULT '[]',
    icon                TEXT NOT NULL DEFAULT '',
    priority            INTEGER NOT NULL DEFAULT 50,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS vrat_sources (
    id        TEXT PRIMARY KEY,
    granth    TEXT, kand TEXT, adhyay TEXT, tithi TEXT, paksh TEXT, maas TEXT, nakshatra TEXT, muhurta TEXT,
    parv      TEXT, ghatna TEXT, vivran TEXT, mahatva TEXT, anushthan TEXT, phal TEXT,
    tags      TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS vrat_source_links (
    vrat_slug TEXT NOT NULL,
    source_id TEXT NOT NULL,
    PRIMARY KEY (vrat_slug, source_id)
  )`,
  'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)',
  // ---- admin panel (see server/lib/admin.js) ----
  // per-book switches and display overrides (title, people, cover ...) -- applied on top of swadhyay-data.js at runtime
  `CREATE TABLE IF NOT EXISTS book_state (
    book_file  TEXT PRIMARY KEY,
    enabled    INTEGER NOT NULL DEFAULT 1,
    featured   INTEGER NOT NULL DEFAULT 0,
    overrides  TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL DEFAULT 0
  )`,
  // a book whose text lives in the database (edited from the chapter editor, or created in the admin panel)
  `CREATE TABLE IF NOT EXISTS book_docs (
    book_file  TEXT PRIMARY KEY,
    origin     TEXT NOT NULL DEFAULT 'imported',
    prefix     TEXT NOT NULL DEFAULT '',
    suffix     TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS book_chapters (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    book_file  TEXT NOT NULL,
    pos        INTEGER NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    size       INTEGER NOT NULL DEFAULT 0,
    html       TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS chapter_versions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    book_file  TEXT NOT NULL,
    chapter_id INTEGER NOT NULL,
    html       TEXT NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    user_id    INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'image',
    mime       TEXT NOT NULL DEFAULT '',
    size       INTEGER NOT NULL DEFAULT 0,
    url        TEXT,
    data       BLOB,
    alt        TEXT NOT NULL DEFAULT '',
    folder     TEXT NOT NULL DEFAULT '',
    user_id    INTEGER,
    created_at INTEGER NOT NULL
  )`,
  // corrections to the Gita lesson data (assets/data/v1/gita/chNN.json), one row per shloka
  `CREATE TABLE IF NOT EXISTS gita_patches (
    ch         INTEGER NOT NULL,
    v          TEXT NOT NULL,
    patch      TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (ch, v)
  )`,
  `CREATE TABLE IF NOT EXISTS admin_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    user_name  TEXT NOT NULL DEFAULT '',
    action     TEXT NOT NULL,
    target     TEXT NOT NULL DEFAULT '',
    detail     TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_book_chapters_book ON book_chapters(book_file, pos)',
  'CREATE INDEX IF NOT EXISTS idx_chapter_versions_ch ON chapter_versions(chapter_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_log_time ON admin_log(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_vrats_parent ON vrats(parent)',
  'CREATE INDEX IF NOT EXISTS idx_book_categories_cat ON book_categories(category_key)',
  'CREATE INDEX IF NOT EXISTS idx_book_tags_tag ON book_tags(tag_id)',
  'CREATE INDEX IF NOT EXISTS idx_comments_book ON comments(book_file)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)'
];

async function init() {
  if (client) return client;

  const remoteUrl = process.env.TURSO_DATABASE_URL;
  if (remoteUrl) {
    client = createClient({ url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    // Local embedded file -- no account/network needed. Works for local dev and for
    // server/server.js run as a normal long-lived process with a real filesystem.
    const fs = require('fs');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    client = createClient({ url: 'file:' + LOCAL_DB_PATH });
  }

  // One round trip for the whole schema (was ~14 sequential ones -- on a cold serverless
  // start against a remote Turso DB each of those is a cross-region network hop).
  await client.batch(SCHEMA_STATEMENTS, 'write');
  await ensureColumns('users', { google_id: 'TEXT', avatar_url: 'TEXT', status: "TEXT NOT NULL DEFAULT 'active'", last_login_at: 'INTEGER' });
  await ensureColumns('categories', { sort_order: 'INTEGER NOT NULL DEFAULT 0', hidden: 'INTEGER NOT NULL DEFAULT 0', edited: 'INTEGER NOT NULL DEFAULT 0' });
  return client;
}

function getClient() {
  if (!client) throw new Error('db.init() must be awaited before use');
  return client;
}

/** Adds a column to an already-existing table if a DB created before this column
 *  existed is being reopened. Safe to call every boot -- checks PRAGMA table_info first. */
async function ensureColumns(table, columns) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const names = info.rows.map((r) => r.name);
  for (const [column, type] of Object.entries(columns)) {
    if (!names.includes(column)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

async function run(sql, params) {
  lastResult = await getClient().execute({ sql, args: params || [] });
  return lastResult;
}

async function get(sql, params) {
  const result = await getClient().execute({ sql, args: params || [] });
  return result.rows.length ? result.rows[0] : null;
}

async function all(sql, params) {
  const result = await getClient().execute({ sql, args: params || [] });
  return result.rows;
}

/** Last inserted rowid, from the most recent run() call. */
function lastInsertId() {
  return lastResult ? Number(lastResult.lastInsertRowid) : null;
}

module.exports = { init, getClient, run, get, all, lastInsertId, LOCAL_DB_PATH };

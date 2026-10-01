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

  for (const stmt of SCHEMA_STATEMENTS) await client.execute(stmt);
  await ensureColumn('users', 'google_id', 'TEXT');
  await ensureColumn('users', 'avatar_url', 'TEXT');
  return client;
}

function getClient() {
  if (!client) throw new Error('db.init() must be awaited before use');
  return client;
}

/** Adds a column to an already-existing table if a DB created before this column
 *  existed is being reopened. Safe to call every boot -- checks PRAGMA table_info first. */
async function ensureColumn(table, column, type) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const names = info.rows.map((r) => r.name);
  if (!names.includes(column)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
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

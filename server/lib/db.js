// Thin wrapper around sql.js (SQLite compiled to WASM -- no native build step,
// which matters since this machine has no C++ build tools installed). sql.js
// keeps the whole database in memory; every mutating call schedules a debounced
// export-to-disk so the file on disk stays reasonably fresh without serializing
// the (small) DB on every single write.
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'swadhyay.sqlite');

let db = null;
let saveTimer = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  salt          TEXT,
  google_id     TEXT UNIQUE,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS authors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  bio        TEXT NOT NULL DEFAULT '',
  photo_path TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  key  TEXT PRIMARY KEY,
  hi   TEXT NOT NULL,
  en   TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS book_categories (
  book_file     TEXT NOT NULL,
  category_key  TEXT NOT NULL,
  PRIMARY KEY (book_file, category_key)
);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS book_tags (
  book_file TEXT NOT NULL,
  tag_id    INTEGER NOT NULL,
  PRIMARY KEY (book_file, tag_id)
);

CREATE TABLE IF NOT EXISTS book_authors (
  book_file TEXT PRIMARY KEY,
  author_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  book_file  TEXT NOT NULL,
  user_id    INTEGER NOT NULL,
  text       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id         INTEGER NOT NULL,
  book_file       TEXT NOT NULL,
  progress_pct    INTEGER NOT NULL DEFAULT 0,
  last_opened_at  INTEGER,
  first_opened_at INTEGER,
  PRIMARY KEY (user_id, book_file)
);

CREATE INDEX IF NOT EXISTS idx_book_categories_cat ON book_categories(category_key);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_comments_book ON comments(book_file);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

async function init() {
  if (db) return db;
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const bytes = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  ensureColumn('users', 'google_id', 'TEXT');
  ensureColumn('users', 'avatar_url', 'TEXT');
  saveNow();
  return db;
}

/** Adds a column to an already-existing table if a DB created before this column
 *  existed is being reopened (CREATE TABLE IF NOT EXISTS above only helps brand-new
 *  DBs). Safe to call every boot -- checks PRAGMA table_info first. */
function ensureColumn(table, column, type) {
  const cols = db.exec(`PRAGMA table_info(${table})`);
  const names = cols.length ? cols[0].values.map((r) => r[1]) : [];
  if (!names.includes(column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

function getDb() {
  if (!db) throw new Error('db.init() must be awaited before use');
  return db;
}

function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(saveNow, 250);
}

function run(sql, params) {
  getDb().run(sql, params || []);
  scheduleSave();
}

function get(sql, params) {
  const stmt = getDb().prepare(sql);
  try {
    stmt.bind(params || []);
    return stmt.step() ? stmt.getAsObject() : null;
  } finally {
    stmt.free();
  }
}

function all(sql, params) {
  const stmt = getDb().prepare(sql);
  try {
    stmt.bind(params || []);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

/** Last inserted rowid, for callers that need the new row's id right after run(). */
function lastInsertId() {
  const row = get('SELECT last_insert_rowid() AS id');
  return row ? row.id : null;
}

module.exports = { init, getDb, run, get, all, lastInsertId, saveNow, DB_PATH };

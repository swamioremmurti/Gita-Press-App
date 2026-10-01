// One-time (idempotent -- safe to re-run) seed: parses the existing
// SWADHYAY_BOOKS_RAW array straight out of swadhyay-data.js (same
// find-the-array-literal trick tools/book_converter.py's register_in_data_js
// uses on this same file), seeds `categories` from the app's CATEGORY_META,
// links every book to its existing single category, auto-creates one
// `authors` row per distinct non-empty author string + links their books,
// and seeds the admin account from ADMIN_EMAIL/ADMIN_PASSWORD in .env.
require('./env').loadEnv();
const fs = require('fs');
const path = require('path');
const db = require('./db');
const auth = require('./auth');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_JS = path.join(PROJECT_ROOT, 'swadhyay-data.js');

// Mirrors CATEGORY_META in swadhyay-app.js (excluding the synthetic "all" tab).
const CATEGORY_META = [
  { key: 'Vedas', hi: 'वेद', en: 'Vedas', icon: 'ॐ' },
  { key: 'Upanishad', hi: 'उपनिषद्', en: 'Upanishad', icon: '📖' },
  { key: 'Vedant', hi: 'वेदान्त', en: 'Vedant', icon: '🧘' },
  { key: 'Gita', hi: 'गीता', en: 'Gita', icon: '📗' },
  { key: 'Purans', hi: 'पुराण', en: 'Purans', icon: '🏛️' },
  { key: 'Upa Puran', hi: 'उपपुराण', en: 'Upa Puran', icon: '⛩️' },
  { key: 'Itihasas', hi: 'इतिहास', en: 'Itihasas', icon: '📚' },
  { key: 'Stotra evam Naamavali', hi: 'स्तोत्र एवं नामावली', en: 'Stotra evam Naamavali', icon: '🙏' },
  { key: 'Bajans', hi: 'भजन', en: 'Bajans', icon: '🎵' },
  { key: 'Pravachan', hi: 'प्रवचन', en: 'Pravachan', icon: '🎤' },
  { key: 'Siksha evam Katha', hi: 'शिक्षा एवं कथा', en: 'Siksha evam Katha', icon: '💡' },
  { key: 'Balaupayogi', hi: 'बालोपयोगी', en: 'Balaupayogi', icon: '🧒' },
  { key: 'Nitya Puja evam Karmakand', hi: 'नित्य पुजा एवं कर्मकाण्ड', en: 'Nitya Puja evam Karmakand', icon: '🔔' },
  { key: 'Swami Sharnanand Sahitya', hi: 'स्वामी शरणानन्द जी महाराज साहित्य', en: 'Swami Sharnanand Sahitya', icon: '🕉️' },
  { key: 'Teerth Sthal', hi: 'तीर्थ स्थल', en: 'Teerth Sthal', icon: '🛕' }
];

function loadRawBooks() {
  const text = fs.readFileSync(DATA_JS, 'utf8');
  const markerIdx = text.indexOf('SWADHYAY_BOOKS_RAW');
  const startIdx = text.indexOf('[', markerIdx);
  const endIdx = text.lastIndexOf(']');
  if (markerIdx === -1 || startIdx === -1 || endIdx === -1) {
    throw new Error('Could not locate SWADHYAY_BOOKS_RAW array in ' + DATA_JS);
  }
  return JSON.parse(text.slice(startIdx, endIdx + 1));
}

async function main() {
  await db.init();

  // ---- categories ----
  let catCount = 0;
  for (const c of CATEGORY_META) {
    const existing = await db.get('SELECT key FROM categories WHERE key = ?', [c.key]);
    if (existing) continue;
    await db.run('INSERT INTO categories (key, hi, en, icon) VALUES (?, ?, ?, ?)', [c.key, c.hi, c.en, c.icon]);
    catCount++;
  }

  // ---- books -> categories, authors ----
  const books = loadRawBooks();
  const categoryKeys = new Set(CATEGORY_META.map((c) => c.key));
  const authorIdByName = new Map();
  let bookCatLinks = 0, authorsCreated = 0, bookAuthorLinks = 0;

  for (const b of books) {
    if (categoryKeys.has(b.category)) {
      const existing = await db.get(
        'SELECT 1 AS x FROM book_categories WHERE book_file = ? AND category_key = ?',
        [b.file, b.category]
      );
      if (!existing) {
        await db.run('INSERT INTO book_categories (book_file, category_key) VALUES (?, ?)', [b.file, b.category]);
        bookCatLinks++;
      }
    }

    const authorName = (b.author || '').trim();
    if (!authorName) continue; // empty-author books fall back to the publisher name client-side; no author entity needed

    let authorId = authorIdByName.get(authorName);
    if (authorId === undefined) {
      const existingAuthor = await db.get('SELECT id FROM authors WHERE name = ?', [authorName]);
      if (existingAuthor) {
        authorId = existingAuthor.id;
      } else {
        await db.run('INSERT INTO authors (name, bio, photo_path, created_at) VALUES (?, ?, NULL, ?)',
          [authorName, '', Date.now()]);
        authorId = db.lastInsertId();
        authorsCreated++;
      }
      authorIdByName.set(authorName, authorId);
    }

    const existingLink = await db.get('SELECT book_file FROM book_authors WHERE book_file = ?', [b.file]);
    if (!existingLink) {
      await db.run('INSERT INTO book_authors (book_file, author_id) VALUES (?, ?)', [b.file, authorId]);
      bookAuthorLinks++;
    }
  }

  // ---- admin account ----
  let adminStatus = 'skipped (ADMIN_EMAIL/ADMIN_PASSWORD not set)';
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (adminEmail && adminPassword) {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (existing) {
      await db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', existing.id]);
      adminStatus = `already existed (id ${existing.id}) -- role ensured 'admin'`;
    } else {
      const { hash, salt } = auth.hashPassword(adminPassword);
      await db.run('INSERT INTO users (name, email, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin', adminEmail, hash, salt, 'admin', Date.now()]);
      adminStatus = `created (id ${db.lastInsertId()})`;
    }
  }

  console.log('Migration complete:');
  console.log(`  Categories seeded: ${catCount} new (of ${CATEGORY_META.length} total)`);
  console.log(`  Books processed: ${books.length}`);
  console.log(`  Book-category links created: ${bookCatLinks}`);
  console.log(`  Authors created: ${authorsCreated} (${authorIdByName.size} distinct author names seen)`);
  console.log(`  Book-author links created: ${bookAuthorLinks}`);
  console.log(`  Admin account: ${adminStatus}`);
  console.log(`  DB target: ${process.env.TURSO_DATABASE_URL || db.LOCAL_DB_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });

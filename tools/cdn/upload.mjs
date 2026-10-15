/* Upload the books and media to Vercel Blob so they no longer ship inside every deployment.

   Setup (once):   cd tools/cdn && npm install
   Token:          Vercel dashboard -> Storage -> your Blob store -> ".env.local" tab -> BLOB_READ_WRITE_TOKEN
                   put it in tools/cdn/.env  as  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...   (git-ignored)
   Run:            node upload.mjs --dry-run      what would be sent, nothing uploaded
                   node upload.mjs                upload what is new or changed (safe to re-run)
                   node upload.mjs --only books   or  --only media
                   node upload.mjs --verify       check the URLs now set in swadhyay-config.js answer with CORS

   Layout in the store (mirrors the site, so swadhyay-config.js needs just two base URLs):
     books/<file>.html, books/image/...      <- Gita Press Books/Gita Press Books/
     media/audio/..., media/video/...        <- assets/audio, assets/video                                        */
import { put, list } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const opt = (n) => { const i = args.indexOf("--" + n); return i === -1 ? null : args[i + 1]; };

// tiny .env reader (no dependency)
const envFile = path.join(HERE, ".env");
if (fs.existsSync(envFile)) {
  for (const ln of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = ln.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SETS = {
  books: [{ dir: path.join(ROOT, "Gita Press Books", "Gita Press Books"), prefix: "books/", age: 86400 }],
  media: [
    { dir: path.join(ROOT, "assets", "audio"), prefix: "media/audio/", age: 31536000 },
    { dir: path.join(ROOT, "assets", "video"), prefix: "media/video/", age: 31536000 },
  ],
};
const SKIP = /\.(crdownload|part|tmp)$|^(thumbs\.db|\.ds_store|desktop\.ini)$/i;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
  ".mp4": "video/mp4", ".webm": "video/webm", ".json": "application/json",
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (!SKIP.test(e.name)) out.push(p);
  }
  return out;
}
const mb = (n) => (n / 1048576).toFixed(1) + " MB";

/* ---------- verify ---------- */
async function verify() {
  const cfg = fs.readFileSync(path.join(ROOT, "swadhyay-config.js"), "utf8");
  const get = (k) => (cfg.match(new RegExp(k + ':\\s*"([^"]*)"')) || [])[1] || "";
  let bad = 0;
  for (const [key, sample] of [["books", firstFile(SETS.books)], ["media", firstFile(SETS.media)]]) {
    const base = get(key);
    if (!base) { console.log(`${key}: not set in swadhyay-config.js (served from the site)`); continue; }
    if (!sample) { console.log(`${key}: nothing local to test with`); continue; }
    const url = base.replace(/\/?$/, "/") + encodeURI(sample.rel);
    const r = await fetch(url, { method: "HEAD", headers: { Origin: "https://swadhyay.example" } });
    const cors = r.headers.get("access-control-allow-origin");
    const ok = r.ok && (cors === "*" || !!cors);
    if (!ok) bad++;
    console.log(`${ok ? "OK  " : "FAIL"} ${key}: HTTP ${r.status}, access-control-allow-origin: ${cors || "(missing)"}\n     ${url}`);
  }
  process.exit(bad ? 1 : 0);
}
function firstFile(sets) {
  for (const s of sets) {
    const f = walk(s.dir).find((p) => /\.(html|mp3|mp4)$/i.test(p));
    if (f) return { rel: path.relative(s.dir, f).split(path.sep).join("/").replace(/^/, s.prefix.replace(/^(books|media)\//, "")) };
  }
  return null;
}
if (flag("verify")) { await verify(); }

/* ---------- upload ---------- */
const token = process.env.BLOB_READ_WRITE_TOKEN;
const dry = flag("dry-run");
if (!dry && !token) { console.error("BLOB_READ_WRITE_TOKEN is not set (see the header of this file)."); process.exit(1); }

const only = opt("only");
const sets = Object.entries(SETS).filter(([k]) => !only || k === only).flatMap(([, v]) => v);

const remote = new Map();   // pathname -> { size, uploadedAt }
if (token) {
  for (const s of sets) {
    let cursor;
    do {
      const r = await list({ prefix: s.prefix, limit: 1000, cursor, token });
      for (const b of r.blobs) remote.set(b.pathname, { size: b.size, at: new Date(b.uploadedAt).getTime() });
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
  }
}

const todo = [];
let same = 0;
for (const s of sets) {
  for (const f of walk(s.dir)) {
    const st = fs.statSync(f);
    const pathname = s.prefix + path.relative(s.dir, f).split(path.sep).join("/");
    const r = remote.get(pathname);
    if (r && r.size === st.size && st.mtimeMs <= r.at && !flag("force")) { same++; continue; }
    todo.push({ f, pathname, size: st.size, age: s.age });
  }
}
const total = todo.reduce((a, t) => a + t.size, 0);
console.log(`${todo.length} to upload (${mb(total)}), ${same} already up to date.`);
if (dry) {
  todo.slice(0, 12).forEach((t) => console.log("  " + t.pathname + "  " + mb(t.size)));
  if (todo.length > 12) console.log(`  ... and ${todo.length - 12} more`);
  process.exit(0);
}

let done = 0, failed = 0, base = "";
async function one(t) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await put(t.pathname, fs.createReadStream(t.f), {
        access: "public", addRandomSuffix: false, allowOverwrite: true, token,
        contentType: TYPES[path.extname(t.f).toLowerCase()], cacheControlMaxAge: t.age, multipart: t.size > 20 * 1048576,
      });
      if (!base) base = res.url.slice(0, res.url.length - encodeURI(t.pathname).length);
      done++;
      if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
      return;
    } catch (e) {
      if (attempt === 4) { failed++; console.error(`FAILED ${t.pathname}: ${e.message}`); return; }
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}
const queue = todo.slice();
await Promise.all(Array.from({ length: 6 }, async () => { for (let t; (t = queue.shift()); ) await one(t); }));

console.log(failed ? `\n${failed} file(s) failed -- run the same command again to retry them.` : "\nAll uploaded.");
if (base) {
  console.log("\nPut these in swadhyay-config.js:");
  if (!only || only === "books") console.log(`  books: "${base}books/",`);
  if (!only || only === "media") console.log(`  media: "${base}media/"`);
}
process.exit(failed ? 1 : 0);

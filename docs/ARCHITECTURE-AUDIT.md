# Kalyan site — architecture audit and reorganisation plan

Date: 2026-11-07. Scope of this audit: repository structure, build/deploy, front-end, API and admin, data and storage, tooling, security headers, tests/CI.
**Not audited (say so before relying on this):** accessibility, page-speed/Lighthouse numbers, the SEO output page by page, database query performance, the ASR service internals, the Android WebView app (not in this repository), dependency vulnerabilities (`npm audit` not run).

Everything below was checked against the files in the repository. Where something is an inference, it says so.

---------------------------------------------------------------------------------------------------

## 1. What the project is today

| Layer | What exists | Size / shape |
|---|---|---|
| Front-end (public site) | Static single-page app. `index.html` loads **17 plain `<script>` files** in a fixed order; no bundler, no minification, no modules. All pieces talk through `window.*` globals. | `swadhyay-app.js` 427 KB / 6,485 lines in one function; `swadhyay.css` 241 KB; `master.css` (book text styles) 152 KB; `swadhyay-data.js` (book catalogue) 211 KB; 15 more `swadhyay-*.js` files |
| API | Node functions. Vercel: `api/router.js` and `api/seo.js`. Local: `server/server.js`. Both call the same code in `server/lib/`. | `server/lib/api.js` (445 lines) dispatches ~25 routes; `server/lib/admin/*` is the admin API (13 modules) |
| Admin panel | Vanilla-JS single page in `admin/`, English, 14 script files | `admin/js/*.js`, `admin/admin.css` |
| Data | Turso (libSQL) in production, a local SQLite file for development. Schema is created in code (`server/lib/db.js`). | ~25 tables |
| Books | 620 HTML files + images in `Gita Press Books/Gita Press Books/` | 938 MB, committed to git and deployed on every release |
| Tooling | `tools/` (104 files: one `build_*.py` per imported book, converters, CDN uploader), `rag-generator/`, `asr-service/` (Python, Docker, Cloud Run), `css-audit/` | |
| Other | Pre-launch password gate (`middleware.js`), `.claude/` dev servers, `backups/` (4,241 local files, not in git) | |

## 2. Findings, most important first

### A. High — cost, size and delivery
1. **Every deployment ships all 938 MB of books** (`.vercelignore` has the CDN lines commented out). Vercel storage is 26 GB. Details and the fix (Vercel Blob + retention) are in the earlier discussion; the uploader already exists (`tools/cdn/upload.mjs`).
2. **The chat search index (`server/rag`, 80 MB) and its dependencies are bundled into the API function on every deploy.**
3. **No minification or compression step** for the 800 KB+ of first-load JavaScript and 400 KB of CSS. (Vercel compresses on the wire, so this is a speed issue, not a correctness one.)
4. **Git history is 1.2 GB** because the books live in git. Clones and deploys are slow; this also goes away once books live in storage.

### B. High — no safety net
5. **No automated tests.** The only test-like file is `server/test-retrieval.js`, a manual script. Nothing guards the site's many behaviours, which is the main risk for any restructuring.
6. **No CI** (`.github/` does not exist), no lint, no formatter, no type checking.
7. **No README and no docs.** Project knowledge exists only in the code and in your assistant's notes.

### C. Medium — structure and maintainability
8. **One 6,485-line `swadhyay-app.js`** holds the router, home, library, reader, comments, panchang, vrats, auth, settings and more. Files cannot be loaded on demand, and changes carry wide risk.
9. **Global-variable coupling.** 17 scripts depend on load order and on `window.*` names. The server-side SEO renderer (`server/lib/seo.js`) runs `swadhyay-app.js` inside a Node `vm` sandbox, so the front-end file layout is part of the server's contract. The admin CSS editor and the audio module also read `swadhyay.css`, `master.css` and `swadhyay-audio-data.js` **by file name**.
10. **Two entry points for one API** (`api/router.js` and `server/server.js`) and **two `package.json` files** (root and `server/`) that list the same dependencies. A new dependency has to be added in the right place or only one side works.
11. **`server/lib/api.js` is a long `if` chain**, not a route table; the admin side already uses a module-per-area pattern that is cleaner.
12. **Database schema lives as `CREATE TABLE IF NOT EXISTS` plus `ensureColumns` in code**, with no versioned migrations or record of which version a database is on. New tables reach production only when code runs against it.
13. **`tools/` has 104 files with many near-duplicates** (for example three `build_kartaviryarjuna*.py`), and per-book scripts mixed with shared tools and the CDN uploader.
14. **Content and code are mixed at the root:** 28 files at the project root (data, scripts, CSS, `sitemap.xml` 184 KB, `seo-meta.js`) next to config files. A static `sitemap.xml` also exists although `/sitemap.xml` is rewritten to `api/seo` in `vercel.json`; which one is actually served needs checking.
15. **Configuration spread over ~20 environment variables** with only `server/.env.example` as documentation, and a stray root `.env.local`.

### D. Medium — security hardening
16. **No security headers found** (`Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`) in `vercel.json`, the server or the middleware. Only cache and `X-Robots-Tag` headers were seen.
17. **No login rate limiting found** in `server/lib/api.js` or `auth.js` (rate limiting exists only for the Sanskrit-speech tokens). Admin login is the sensitive target.
18. **The reader builds an inline script that it injects into each book frame** (`readerInlineScript` in `swadhyay-app.js`), which will constrain a strict Content-Security-Policy; this needs a deliberate design, not a quick header. (Other inline script use on the site was not checked.)

### E. Low — hygiene
19. **Files in git that should not be:** `server/server-err.log`, `server/server-out.log`, Python `__pycache__/*.pyc` (3 under `tools/`, 1 under `asr-service/`), `.claude/scheduled_tasks.lock`.
20. **Large local-only folders** (`backups/`, `css-audit/`, `rag-generator/output`) are correctly ignored but are not documented.
21. **An odd root entry:** a directory named `Gita` appears in the root listing but cannot be opened by that name (possibly a trailing character in the name). Inspect it and remove it if it is a leftover.

## 3. What is already good (keep it)
- Clear separation of the admin API into modules (`server/lib/admin/*`) with a router, role checks (editor vs admin) and an audit log.
- DB-overlay design: edits do not depend on a writable disk; the same overlay logic runs in the browser and in the SEO sandbox.
- Safe patterns already in place: import chapters-first/doc-last, staged book copy with commit, versions kept for every chapter save, immutable slugs.
- Indexes exist on the database (10 `CREATE INDEX` statements).
- A pre-launch gate that is a single environment variable.
- The ASR service is isolated as its own deployable.

## 4. Target architecture

Principles: **no big-bang**; every phase leaves the live site working and is reversible by one commit; nothing is renamed or moved until a test proves what depended on it.

```
/
├─ apps/
│  ├─ site/                 public site (static front-end)
│  │   ├─ index.html
│  │   ├─ src/              split modules: core/ router/ views/{home,library,reader,...}/ features/{audio,gita,sankalp,...}/
│  │   ├─ styles/           app.css (from swadhyay.css), book.css (from master.css)
│  │   └─ public/           assets, fonts, robots.txt
│  └─ admin/                the admin panel (as today)
├─ api/                     thin Vercel entry points only (router.js, seo.js)
├─ packages/
│  └─ server/               all server code, ONE package.json, route table instead of an if-chain
│      ├─ routes/           auth, comments, progress, gita, vrats, chat, asr ... + admin/
│      ├─ db/               connection + versioned migrations (numbered files)
│      └─ lib/
├─ content/                 catalogue data (swadhyay-data.js source), quotes, vrats — data, not code
├─ tools/
│  ├─ import/               one parameterised importer + small per-source adapters (replaces ~60 build_*.py)
│  ├─ cdn/                  uploader (books and media to storage)
│  └─ dev/                  local servers
├─ services/asr/            the Python speech service
├─ tests/                   unit, API, smoke (browser), and the functionality inventory
├─ docs/                    README, ARCHITECTURE, RUNBOOK (deploy, rollback, env vars), this audit
└─ .github/workflows/       CI: lint, tests, smoke test on every push
```
Books and large media live in **object storage (Vercel Blob or R2) behind a CDN**, not in the repository or the deployment.

## 5. Plan — phases, each independently shippable

**Phase 0 — Safety net (no behaviour change; do first)**
- Write the **functionality inventory**: every public route, API endpoint (from `api.js` and `admin/*`), admin screen and reader feature, with an expected result.
- Build an automated **smoke/regression suite** (API tests on a local server with a throw-away database, plus a browser run for the main pages and the reader) and record a "before" baseline.
- Add CI to run it on every push.
- *Gate:* nothing in later phases is merged unless this suite passes.

**Phase 1 — Hygiene and documentation (no runtime change)**
- Remove logs, `.pyc` and lock files from git; extend `.gitignore`.
- Add README, ARCHITECTURE, RUNBOOK; document every environment variable.
- Add lint/format configuration without reformatting existing files.

**Phase 2 — Delivery cost**
- Move books and media to storage + CDN; shrink deployments; set deployment retention; slim the API bundle (`server/rag`).
- Optionally rewrite git history to drop the books afterwards (a deliberate, separate step).

**Phase 3 — Server restructure**
- One `package.json`; route table; versioned database migrations; one app entry shared by local and Vercel.
- Security headers and login rate limiting.

**Phase 4 — Front-end restructure** (largest risk; do last)
- Split `swadhyay-app.js` into modules with a build step (and minification), keeping the same URLs, the same `window` contract used by the SEO sandbox and the Android app, and the same file names where other code reads them until those readers are updated.

**Phase 5 — Tooling and content**
- Consolidate `tools/` importers; move catalogue data to `content/`.

## 6. Decisions needed from you
1. **Storage choice:** Vercel Blob (on Pro, about 2–3 cents/month for storage) or Cloudflare R2.
2. **Build tooling for Phase 4:** introduce a bundler (Vite is my suggestion) and Node-based tests, or keep the site tool-free and only split files. The first is the real "professional" route; the second is lower risk.
3. **Android app:** where its code lives and how it loads the site, so the front-end contract can be preserved.
4. **Rewriting git history** to remove the books (shrinks the repository from 1.2 GB; changes every commit id, so it is only safe if you are the only person with a clone).

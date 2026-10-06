// Server-side rendering of the crawlable parts of the site: real <title>/meta/Open Graph
// tags, JSON-LD and a plain-HTML copy of the page's content, for the routes the SPA
// otherwise draws with JavaScript only (so crawlers and link-preview bots that don't run
// JS see nothing). Used by api/seo.js on Vercel and by server/server.js locally.
//
// Nothing here is generated ahead of time: the book list is the app's own, obtained by
// running swadhyay-data.js + swadhyay-app.js in a sandbox (see loadCatalogue), so adding
// a book = edit swadhyay-data.js and redeploy, exactly as before.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SwadhyayMeta = require('../../seo-meta.js'); // same file the browser loads; static require so Vercel bundles it

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://gitapress-app.vercel.app';
const SOURCE_FILES = ['index.html', 'swadhyay-data.js', 'swadhyay-app.js'];
const HERO_IMAGE = SITE + '/assets/hero_banner_light.webp';
const FALLBACK_IMAGE = SITE + '/assets/apple-touch-icon.png';

const CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
const SHORT_CACHE_CONTROL = 'public, max-age=0, s-maxage=60';

const STATIC_PAGES = ['library', 'authors', 'panchang', 'help', 'feedback', 'chat'];
const NAV_LINKS = [
  ['/', 'होम'], ['/library', 'पुस्तकालय'], ['/authors', 'लेखक'], ['/chat', 'प्रश्नोत्तर'],
  ['/panchang', 'पंचांग'], ['/help', 'सहायता'], ['/feedback', 'विषय सुधार']
];

// ---------------------------------------------------------------- small helpers

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function a(href, text) { return '<a href="' + esc(href) + '">' + esc(text) + '</a>'; }
function abs(p) { return SITE + p; }
function jsonLd(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

// ---------------------------------------------------------------- source files + catalogue

// Reads a site file: from the deployed bundle (api/seo.js's `includeFiles` in vercel.json
// puts them next to the function), else -- as a safety net if that ever stops working --
// from the live site, where they are plain static files.
async function readSource(name) {
  try {
    return fs.readFileSync(path.join(ROOT, name), 'utf8');
  } catch (err) {
    const res = await fetch(SITE + '/' + name);
    if (!res.ok) throw new Error('Cannot read ' + name + ' (' + err.message + '; fetch ' + res.status + ')');
    return res.text();
  }
}

function sourceStamp() {
  try {
    return SOURCE_FILES.map((f) => fs.statSync(path.join(ROOT, f)).mtimeMs).join('|');
  } catch (e) {
    return 'static'; // no filesystem copy: the deployed files can't change under us
  }
}

// Runs the app's own scripts against a stub `window` and collects what its export hook
// hands back (BOOKS, PEOPLE, CATEGORY_META, ...), so slugs/titles/people are computed by
// the very code the browser runs.
function runApp(dataSrc, appSrc) {
  let exported = null;
  const noop = function () {};
  const win = {
    __SWADHYAY_EXPORT__: function (o) { exported = o; },
    SwadhyayMeta: SwadhyayMeta,
    addEventListener: noop, removeEventListener: noop, scrollTo: noop, matchMedia: function () { return { matches: false, addEventListener: noop, addListener: noop }; },
    localStorage: { getItem: function () { return null; }, setItem: noop, removeItem: noop },
    sessionStorage: { getItem: function () { return null; }, setItem: noop, removeItem: noop },
    location: { origin: SITE, pathname: '/', search: '', hash: '', href: SITE + '/' },
    navigator: { language: 'hi', userAgent: 'swadhyay-seo' },
    history: { replaceState: noop, pushState: noop }
  };
  win.window = win; win.self = win; win.globalThis = win;
  win.document = {
    addEventListener: noop, removeEventListener: noop,
    getElementById: function () { return null; }, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, createElement: function () { return { style: {}, setAttribute: noop, appendChild: noop }; },
    documentElement: { setAttribute: noop, getAttribute: function () { return null; }, style: {}, classList: { add: noop, remove: noop, toggle: noop } },
    body: { classList: { add: noop, remove: noop, toggle: noop, contains: function () { return false; } } },
    cookie: ''
  };
  const ctx = vm.createContext(win);
  vm.runInContext(dataSrc, ctx, { filename: 'swadhyay-data.js', timeout: 5000 });
  vm.runInContext(appSrc, ctx, { filename: 'swadhyay-app.js', timeout: 5000 });
  if (!exported) throw new Error('swadhyay-app.js did not call __SWADHYAY_EXPORT__');
  return exported;
}

let catalogueCache = null; // { stamp, value }
let cataloguePending = null;

function loadCatalogue() {
  const stamp = sourceStamp();
  if (catalogueCache && catalogueCache.stamp === stamp) return Promise.resolve(catalogueCache.value);
  if (cataloguePending && cataloguePending.stamp === stamp) return cataloguePending.promise;
  const promise = (async () => {
    const [template, dataSrc, appSrc] = await Promise.all(SOURCE_FILES.map(readSource));
    const ex = runApp(dataSrc, appSrc);
    const cat = {
      template: template,
      BOOKS: ex.BOOKS, PEOPLE: ex.PEOPLE, CATEGORY_META: ex.CATEGORY_META,
      genBlurb: ex.genBlurb, HELP_FAQS: ex.HELP_FAQS, personPath: ex.personPath, bookPath: ex.bookPath,
      booksBySlug: {}, booksById: {}, peopleBySlug: {}, catByKey: {}, base: new Map()
    };
    cat.BOOKS.forEach((b) => {
      cat.booksBySlug[b.slug] = b; cat.booksById[b.id] = b;
      cat.base.set(b, { categoryKeys: b.categoryKeys, categoryMetas: b.categoryMetas, category: b.category, categoryMeta: b.categoryMeta });
    });
    cat.PEOPLE.forEach((p) => { cat.peopleBySlug[p.slug] = p; });
    cat.CATEGORY_META.forEach((c) => { cat.catByKey[c.key] = c; });
    catalogueCache = { stamp: stamp, value: cat };
    return cat;
  })();
  cataloguePending = { stamp: stamp, promise: promise };
  promise.catch(() => { if (cataloguePending && cataloguePending.promise === promise) cataloguePending = null; });
  return promise;
}

// ---------------------------------------------------------------- category overrides (DB)

// The admin panel can give a book several categories; the browser overlays those on the
// static data via /api/book-meta. Do the same here (best effort: a slow or missing database
// just means the page uses the categories from swadhyay-data.js).
const DB_TTL_OK = 10 * 60 * 1000;
const DB_TTL_FAIL = 60 * 1000;
let dbOverlay = { at: 0, ttl: 0, map: null };

async function fetchDbCategories() {
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) return null;
  const db = require('./db');
  await db.init();
  const rows = await db.all('SELECT bc.book_file, c.key, c.hi, c.en, c.icon FROM book_categories bc JOIN categories c ON c.key = bc.category_key');
  const map = {};
  rows.forEach((r) => { (map[r.book_file] = map[r.book_file] || []).push({ key: r.key, hi: r.hi, en: r.en, icon: r.icon }); });
  return map;
}

async function refreshDbOverlay() {
  const now = Date.now();
  if (dbOverlay.at && now - dbOverlay.at < dbOverlay.ttl) return;
  let map = dbOverlay.map, ttl = DB_TTL_FAIL;
  try {
    const got = await Promise.race([fetchDbCategories(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))]);
    if (got) { map = got; ttl = DB_TTL_OK; }
  } catch (e) { /* keep the previous overlay, retry in a minute */ }
  dbOverlay = { at: now, ttl: ttl, map: map };
}

function applyOverlay(cat, map) {
  cat.BOOKS.forEach((b) => {
    const base = cat.base.get(b);
    b.categoryKeys = base.categoryKeys; b.categoryMetas = base.categoryMetas; b.category = base.category; b.categoryMeta = base.categoryMeta;
    const cats = map && map[b.file];
    if (cats && cats.length) {
      b.categoryKeys = cats.map((c) => c.key);
      b.categoryMetas = cats.map((c) => cat.catByKey[c.key] || c);
      b.category = b.categoryKeys[0];
      b.categoryMeta = b.categoryMetas[0];
    }
  });
}

async function getCatalogue() {
  const cat = await loadCatalogue();
  await refreshDbOverlay();
  // Re-applied whenever the overrides were refreshed (and for a freshly built catalogue).
  if (cat.overlayAt !== dbOverlay.at) { applyOverlay(cat, dbOverlay.map); cat.overlayAt = dbOverlay.at; }
  return cat;
}

// ---------------------------------------------------------------- page building

function crumbs(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[1], item: abs(it[0]) }))
  };
}
function crumbNav(items) {
  return '<nav aria-label="breadcrumb">' + items.map((it, i) =>
    i === items.length - 1 ? '<span>' + esc(it[1]) + '</span>' : a(it[0], it[1])).join(' › ') + '</nav>';
}
function siteNav() {
  return '<nav aria-label="Swadhyay">' + NAV_LINKS.map((l) => a(l[0], l[1])).join(' · ') + '</nav>';
}
function bookLinks(cat, books) {
  return '<ul>' + books.map((b) => '<li>' + a(cat.bookPath(b), b.title) + (b.author ? ' — ' + esc(b.author) : '') + '</li>').join('') + '</ul>';
}
function personLinks(cat, names) {
  return names.map((n) => a(cat.personPath(n), n)).join(', ');
}
function booksInCategory(cat, key) {
  return cat.BOOKS.filter((b) => b.categoryKeys.indexOf(key) !== -1);
}
function bookImage(book) {
  return book.coverImage ? abs('/' + book.coverImage.split('/').map(encodeURIComponent).join('/')) : FALLBACK_IMAGE;
}

function personRoleBooks(person) {
  return [['authors', 'लेखक के रूप में'], ['tikakars', 'टीकाकार के रूप में'], ['translators', 'अनुवादक के रूप में'], ['publishers', 'प्रकाशक के रूप में']]
    .filter((r) => person.roles[r[0]] && person.roles[r[0]].length);
}

function pageBook(cat, book) {
  const cm = book.categoryMeta;
  const path = cat.bookPath(book);
  const title = SwadhyayMeta.bookTitle(book), desc = SwadhyayMeta.bookDescription(book);
  const image = bookImage(book);
  const people = SwadhyayMeta.credited(book);
  const trail = [['/', 'होम'], ['/library', 'पुस्तकालय'], ['/library?cat=' + encodeURIComponent(cm.key), cm.hi], [path, book.title]];

  // Other books to link to: same primary person first, then neighbours in the same category.
  const related = [];
  const seen = {}; seen[book.id] = true;
  const add = (list) => list.forEach((b) => { if (!seen[b.id] && related.length < 12) { seen[b.id] = true; related.push(b); } });
  const first = people.length ? cat.PEOPLE.find((p) => p.name === people[0]) : null;
  if (first) add(['authors', 'tikakars', 'translators'].reduce((acc, k) => acc.concat(first.roles[k] || []), []));
  const sameCat = booksInCategory(cat, cm.key);
  const at = sameCat.indexOf(book);
  add(sameCat.slice(at + 1).concat(sameCat.slice(0, Math.max(at, 0))));

  const lines = [];
  [['लेखक', book.authors], ['टीकाकार', book.tikakars], ['अनुवादक', book.translators]].forEach((r) => {
    if (r[1].length) lines.push('<p>' + esc(r[0]) + ': ' + personLinks(cat, r[1]) + '</p>');
  });
  if (book.publisher) lines.push('<p>प्रकाशक: ' + personLinks(cat, [book.publisher]) + '</p>');

  const content = '<main class="seo-content">' + crumbNav(trail) +
    '<h1>' + esc(book.title) + '</h1>' + lines.join('') +
    '<p>श्रेणी: ' + book.categoryMetas.map((c) => a('/library?cat=' + encodeURIComponent(c.key), c.hi)).join(', ') + '</p>' +
    '<h2>इस पुस्तक के बारे में</h2><p>' + cat.genBlurb(book) + '</p>' +
    '<p>' + esc(SwadhyayMeta.TAGLINE_HI) + ' ' + esc(SwadhyayMeta.TAGLINE_EN) + '</p>' +
    (related.length ? '<h2>अन्य ग्रंथ</h2>' + bookLinks(cat, related) : '') +
    siteNav() + '</main>';

  const ld = [{
    '@context': 'https://schema.org', '@type': 'Book', name: book.title, url: abs(path), image: image,
    inLanguage: 'hi', isAccessibleForFree: true, genre: cm.hi, description: desc,
    author: (book.authors.length ? book.authors : book.tikakars).map((n) => ({ '@type': 'Person', name: n, url: abs(cat.personPath(n)) })),
    publisher: book.publisher ? { '@type': 'Organization', name: book.publisher } : undefined
  }, crumbs(trail)];

  return { title: title, desc: desc, canonical: path, image: image, ogType: 'book', content: content, ld: ld };
}

function pageAuthor(cat, person) {
  const path = cat.personPath(person.name);
  const title = SwadhyayMeta.personTitle(person), desc = SwadhyayMeta.personDescription(person);
  const trail = [['/', 'होम'], ['/authors', 'लेखक'], [path, person.name]];
  const roles = personRoleBooks(person);
  const onlyPublisher = roles.length === 1 && roles[0][0] === 'publishers';

  const content = '<main class="seo-content">' + crumbNav(trail) +
    '<h1>' + esc(person.name) + '</h1><p>' + esc(SwadhyayMeta.rolesSummary(person)) + ' — ' + SwadhyayMeta.personBookCount(person) + ' ग्रंथ</p>' +
    roles.map((r) => '<h2>' + esc(r[1]) + ' (' + person.roles[r[0]].length + ')</h2>' + bookLinks(cat, person.roles[r[0]])).join('') +
    siteNav() + '</main>';

  const ld = [onlyPublisher
    ? { '@context': 'https://schema.org', '@type': 'Organization', name: person.name, url: abs(path), description: desc }
    : { '@context': 'https://schema.org', '@type': 'Person', name: person.name, url: abs(path), description: desc },
  crumbs(trail)];
  return { title: title, desc: desc, canonical: path, image: HERO_IMAGE, ogType: 'website', content: content, ld: ld };
}

function pageAuthors(cat) {
  const r = SwadhyayMeta.STATIC_ROUTES.authors;
  const trail = [['/', 'होम'], ['/authors', 'लेखक']];
  const groups = [['authors', 'लेखक'], ['tikakars', 'टीकाकार'], ['translators', 'अनुवादक'], ['publishers', 'प्रकाशक']].map((role) => {
    const list = cat.PEOPLE.filter((p) => p.roles[role[0]].length).sort((x, y) =>
      y.roles[role[0]].length - x.roles[role[0]].length || x.name.localeCompare(y.name, 'hi'));
    if (!list.length) return '';
    return '<h2>' + esc(role[1]) + ' (' + list.length + ')</h2><ul>' +
      list.map((p) => '<li>' + a(cat.personPath(p.name), p.name) + ' — ' + p.roles[role[0]].length + ' ग्रंथ</li>').join('') + '</ul>';
  }).join('');
  const content = '<main class="seo-content">' + crumbNav(trail) + '<h1>लेखक, टीकाकार एवं अनुवादक</h1><p>' + esc(r.desc) + '</p>' + groups + siteNav() + '</main>';
  return { title: r.title, desc: r.desc, canonical: '/authors', image: HERO_IMAGE, ogType: 'website', content: content, ld: [crumbs(trail)] };
}

function pageLibrary(cat, catKey, noindex) {
  const cm = catKey && catKey !== 'all' ? cat.catByKey[catKey] : null;
  const trail = [['/', 'होम'], ['/library', 'पुस्तकालय']];
  if (cm) {
    const books = booksInCategory(cat, cm.key);
    const canonical = '/library?cat=' + encodeURIComponent(cm.key);
    trail.push([canonical, cm.hi]);
    const desc = SwadhyayMeta.categoryDescription(cm, books.length);
    const content = '<main class="seo-content">' + crumbNav(trail) + '<h1>' + esc(cm.hi) + ' (' + esc(cm.en) + ')</h1><p>' + esc(desc) + '</p>' +
      bookLinks(cat, books) + '<p>' + a('/library', 'सभी श्रेणियाँ') + '</p>' + siteNav() + '</main>';
    return { title: SwadhyayMeta.categoryTitle(cm), desc: desc, canonical: canonical, image: HERO_IMAGE, ogType: 'website', content: content, ld: [crumbs(trail)], noindex: noindex };
  }
  const r = SwadhyayMeta.STATIC_ROUTES.library;
  const cats = cat.CATEGORY_META.filter((c) => c.key !== 'all').map((c) => ({ c: c, books: booksInCategory(cat, c.key) })).filter((x) => x.books.length);
  const content = '<main class="seo-content">' + crumbNav(trail) + '<h1>पुस्तकालय — ' + cat.BOOKS.length + ' ग्रंथ</h1><p>' + esc(r.desc) + '</p>' +
    '<h2>श्रेणियाँ</h2><ul>' + cats.map((x) => '<li>' + a('/library?cat=' + encodeURIComponent(x.c.key), x.c.hi) + ' (' + x.c.en + ') — ' + x.books.length + ' ग्रंथ</li>').join('') + '</ul>' +
    cats.map((x) => '<h2>' + esc(x.c.hi) + '</h2>' + bookLinks(cat, x.books)).join('') + siteNav() + '</main>';
  return { title: r.title, desc: r.desc, canonical: '/library', image: HERO_IMAGE, ogType: 'website', content: content, ld: [crumbs(trail)], noindex: noindex };
}

const STATIC_INTRO = {
  panchang: ['पंचांग', 'आज की तिथि, नक्षत्र, योग, करण, सूर्योदय-सूर्यास्त, राहुकाल एवं पर्व-त्योहार — दिल्ली, मुंबई, वाराणसी, चेन्नई, कोलकाता और बैंगलोर के लिए। यह खगोलीय सन्निकटन पर आधारित एक अनुमान है; महत्वपूर्ण मुहूर्तों हेतु प्रामाणिक पंचांग से पुष्टि करें।'],
  chat: ['प्रश्नोत्तर — ग्रंथों से पूछें', 'स्वाध्याय पुस्तकालय के ग्रंथों के आधार पर अपने प्रश्न पूछिए और उत्तर के साथ संबंधित ग्रंथ के स्रोत देखिए।'],
  feedback: ['विषय सुधार', 'किसी ग्रंथ में त्रुटि, अशुद्ध पाठ या कोई अन्य सुझाव हो तो कृपया हमें बताएँ। आपका सुझाव हमारी टीम द्वारा देखा जाएगा।']
};

function pageStatic(cat, key) {
  const r = SwadhyayMeta.STATIC_ROUTES[key];
  const path = '/' + key;
  const trail = [['/', 'होम'], [path, key === 'help' ? 'सहायता' : STATIC_INTRO[key] ? STATIC_INTRO[key][0] : key]];
  let body, ld = [crumbs(trail)];
  if (key === 'help') {
    body = '<h1>सहायता</h1>' + cat.HELP_FAQS.map((f) => '<h2>' + esc(f[0]) + '</h2><p>' + esc(f[1]) + '</p>').join('') +
      '<p>' + a('/feedback', 'अपना प्रश्न यहाँ नहीं मिला? हमें लिखें') + '</p>';
    ld.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: cat.HELP_FAQS.map((f) => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } }))
    });
  } else {
    body = '<h1>' + esc(STATIC_INTRO[key][0]) + '</h1><p>' + esc(STATIC_INTRO[key][1]) + '</p><p>' + esc(r.desc) + '</p>' +
      '<p>' + a('/library', 'पुस्तकालय में ' + cat.BOOKS.length + ' ग्रंथ देखें') + '</p>';
  }
  return {
    title: r.title, desc: r.desc, canonical: path, image: HERO_IMAGE, ogType: 'website',
    content: '<main class="seo-content">' + crumbNav(trail) + body + siteNav() + '</main>', ld: ld
  };
}

// ---------------------------------------------------------------- HTML assembly

function replaceTag(html, re, tag) {
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => tag + '\n</head>');
}

function assemble(template, page) {
  const url = abs(page.canonical);
  const t = esc(page.title), d = esc(page.desc), img = esc(page.image);
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + t + '</title>');
  html = replaceTag(html, /<meta name="description"[^>]*>/, '<meta name="description" content="' + d + '">');
  html = replaceTag(html, /<meta name="robots"[^>]*>/, '<meta name="robots" content="' + (page.noindex ? 'noindex, follow' : 'index, follow') + '">');
  html = replaceTag(html, /<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + esc(url) + '">');
  html = replaceTag(html, /<meta property="og:type"[^>]*>/, '<meta property="og:type" content="' + page.ogType + '">');
  html = replaceTag(html, /<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + t + '">');
  html = replaceTag(html, /<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + d + '">');
  html = replaceTag(html, /<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + esc(url) + '">');
  html = replaceTag(html, /<meta property="og:image"[^>]*>/, '<meta property="og:image" content="' + img + '">');
  html = replaceTag(html, /<meta name="twitter:title"[^>]*>/, '<meta name="twitter:title" content="' + t + '">');
  html = replaceTag(html, /<meta name="twitter:description"[^>]*>/, '<meta name="twitter:description" content="' + d + '">');
  html = replaceTag(html, /<meta name="twitter:image"[^>]*>/, '<meta name="twitter:image" content="' + img + '">');
  // The home page's WebSite markup doesn't belong on inner pages; replace it with this page's.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => (page.ld || []).map(jsonLd).join('\n'));
  html = html.replace('<!--seo:content-->', () => page.content || '');
  return html;
}

// ---------------------------------------------------------------- sitemap

function sitemapXml(cat) {
  const urls = ['/', '/library', '/authors', '/panchang', '/chat', '/help', '/feedback'];
  cat.CATEGORY_META.forEach((c) => { if (c.key !== 'all' && booksInCategory(cat, c.key).length) urls.push('/library?cat=' + encodeURIComponent(c.key)); });
  cat.BOOKS.forEach((b) => urls.push(cat.bookPath(b)));
  cat.PEOPLE.forEach((p) => urls.push(cat.personPath(p.name)));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + esc(abs(u)) + '</loc></url>').join('\n') + '\n</urlset>\n';
}

// ---------------------------------------------------------------- request handling

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

/** Returns { status, headers, body } for a request URL (path + query). */
async function render(rawUrl, opts) {
  opts = opts || {};
  const u = new URL(String(rawUrl || '/').replace(/^\/+/, '/'), 'http://localhost');
  const pathname = u.pathname.replace(/\/+$/, '') || '/';
  const seg = pathname.split('/').filter(Boolean).map(safeDecode);
  const cacheControl = opts.noCache ? 'no-store' : CACHE_CONTROL;
  const html = (status, body, cc) => ({ status: status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': opts.noCache ? 'no-store' : (cc || cacheControl) }, body: body });

  const cat = await getCatalogue();

  if (pathname === '/sitemap.xml') {
    return { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': opts.noCache ? 'no-store' : cacheControl }, body: sitemapXml(cat) };
  }

  // Not a page we describe (unknown book/author, odd path): hand back the plain app shell so
  // the client router deals with it, but flag it noindex and, where it's a real miss, 404.
  const shell = (status) => html(status, assemble(cat.template, {
    title: 'Swadhyay | स्वाध्याय — A Digital Library of Sanatan Wisdom', desc: SwadhyayMeta.STATIC_ROUTES.library.desc,
    canonical: '/', image: HERO_IMAGE, ogType: 'website', noindex: true, content: '', ld: []
  }), SHORT_CACHE_CONTROL);

  let page = null;
  if (seg[0] === 'book' && seg.length === 2) {
    const book = cat.booksBySlug[seg[1]] || cat.booksBySlug[seg[1].normalize('NFC')];
    const byId = !book && /^\d+$/.test(seg[1]) ? cat.booksById[parseInt(seg[1], 10)] : null;
    if (byId) return { status: 301, headers: { Location: cat.bookPath(byId), 'Cache-Control': cacheControl }, body: '' };
    if (!book) return shell(404);
    page = pageBook(cat, book);
  } else if (seg[0] === 'author' && seg.length === 2) {
    const person = cat.peopleBySlug[seg[1]] || cat.peopleBySlug[seg[1].normalize('NFC')];
    // An old /author/<number> link: the client sends those to the authors list.
    if (!person && /^\d+$/.test(seg[1])) return { status: 301, headers: { Location: '/authors', 'Cache-Control': cacheControl }, body: '' };
    if (!person) return shell(404);
    page = pageAuthor(cat, person);
  } else if (seg.length === 1 && seg[0] === 'authors') {
    page = pageAuthors(cat);
  } else if (seg.length === 1 && seg[0] === 'library') {
    // ?q= / ?tag= are searches, not pages of their own -- keep them out of the index.
    page = pageLibrary(cat, u.searchParams.get('cat'), u.searchParams.has('q') || u.searchParams.has('tag'));
  } else if (seg.length === 1 && STATIC_PAGES.indexOf(seg[0]) !== -1) {
    page = pageStatic(cat, seg[0]);
  } else {
    return shell(404);
  }
  return html(200, assemble(cat.template, page));
}

/** Plain-shell fallback used when rendering throws: the app still loads for people. */
async function fallbackShell() {
  return readSource('index.html');
}

/** Node (req, res) handler shared by api/seo.js and server/server.js. */
async function handle(req, res, opts) {
  let out;
  try {
    out = await render(req.url, opts);
  } catch (err) {
    console.error('[seo] render failed:', err && err.stack || err);
    try {
      out = { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: await fallbackShell() };
    } catch (err2) {
      res.statusCode = 500; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Swadhyay is temporarily unavailable.');
      return;
    }
  }
  res.statusCode = out.status;
  Object.keys(out.headers).forEach((k) => res.setHeader(k, out.headers[k]));
  res.end(req.method === 'HEAD' ? undefined : out.body);
}

/** The paths this module answers (keep in step with the rewrites in vercel.json). */
function isSeoPath(pathname) {
  const seg = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (pathname === '/sitemap.xml') return true;
  if ((seg[0] === 'book' || seg[0] === 'author') && seg.length === 2) return true;
  return seg.length === 1 && STATIC_PAGES.indexOf(seg[0]) !== -1;
}

module.exports = { render, handle, isSeoPath, loadCatalogue, getCatalogue, SITE };

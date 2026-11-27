/* Stotras: the /stotras page (every stotra of the library, by category) and the stotra viewer (/stotra/<slug>).

   A stotra is an ordinary library book that carries a stotra category (book.stotra, e.g. "guru") and whose HTML follows the
   pattern of swadhyay-stotra-format.js. So every stotra is listed twice, on purpose: here, by category, and in the library
   as a book; each page links to the other (the book page has an "open in the stotra viewer" button, every stotra card
   here has a "book" link).

   The viewer is one continuous page: the whole stotra, verse after verse, in one of two modes
     पाठ (pat)    only the Sanskrit verses -- for reciting
     पठन (read)   each verse with its pada-viccheda / shabdartha and its meaning
   The mode and the type size are remembered in the browser.

   Public API: window.SwadhyayStotra
     applyCategories(list)   the admin's category list (from /api/book-meta); null/empty = the built-in list
     hubHtml(ctx) / mountHub(ctx)        the /stotras page
     viewerHtml(ctx) / mountViewer(ctx)  the viewer; ctx.book is the stotra's book
   ctx = { tx, esc, books, bookPath, readPath, coverEl, book, loadText(book) -> Promise<html> }                     */
(function () {
  "use strict";

  var F = window.SwadhyayStotraFormat;
  var LS_MODE = "swadhyay_stotra_mode_v1", LS_SIZE = "swadhyay_stotra_size_v1", LS_LH = "swadhyay_stotra_lh_v1", LS_WM = "swadhyay_stotra_wm_v1";
  var LIB_CAT = "Stotra evam Naamavali";
  var SIZES = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
  var cats = F ? F.CATEGORIES.slice() : [];
  var hub = { q: "", cat: "all", theme: "" };
  var parsed = {};

  function applyCategories(list) {
    if (Array.isArray(list) && list.length) cats = list;
    else if (F) cats = F.CATEGORIES.slice();
  }
  function catMeta(key) {
    for (var i = 0; i < cats.length; i++) if (cats[i].key === key) return cats[i];
    return null;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ------------------------------------------------------------------ the /stotras page */
  function stotraBooks(ctx) { return ctx.books.filter(function (b) { return b.stotra; }); }
  function visibleCats() { return cats.filter(function (c) { return !c.hidden; }); }

  /* the deity pictures (assets/deity/<name>.webp, 96px, each under 20 KB) stand in for the emoji glyphs of the categories that have one;
     a category without a picture (guru, surya, navagraha, tirtha, other) keeps its glyph */
  var DEITY_IMG = { ganesha: "ganesha", shiva: "shiva", vishnu: "vishnu", ram: "rama", krishna: "krishna", hanuman: "hanuman", devi: "durga" };
  function catIcon(m, size, esc) {
    var n = m.img || DEITY_IMG[m.key];
    return n ? '<img class="st-di" src="assets/deity/' + esc(n) + '.webp" width="' + size + '" height="' + size + '" alt="" loading="lazy" decoding="async">'
             : esc(m.icon || "📿");
  }

  /* the "by theme" row: a stotra belongs to a theme when its title carries one of the theme's words. A theme with no stotra yet is not shown,
     so the row grows by itself as stotras are added. [key, hindi, english, icon (ico() name or a text glyph), pattern] */
  var THEMES = [
    ["upasana", "उपासना", "Worship", "ॐ", /उपासना|आराधना|पूजन|पूजा|आरती|नामावली|अष्टकम्|भुजङ्गप्रयात|भुजंगप्रयात/],
    ["shanti", "शान्ति", "Peace", "lotus", /शान्ति|शांति|क्षमापण|क्षमा|शमन/],
    ["raksha", "रक्षा", "Protection", "shield", /कवच|रक्षा|रक्षक|सङ्कट|संकट|नाशन/],
    ["kalyan", "कल्याण", "Well-being", "hands", /कल्याण|मङ्गल|मंगल|शुभ|अन्नपूर्णा/],
    ["swasthya", "स्वास्थ्य", "Health", "sprout", /आरोग्य|स्वास्थ्य|धन्वन्तरि|सूर्य|अच्युत/],
    ["samriddhi", "समृद्धि", "Prosperity", "gem", /लक्ष्मी|श्रीसूक्त|कनकधारा|समृद्धि|धन|अन्नपूर्णा/],
    ["gyan", "ज्ञान", "Knowledge", "book", /ज्ञान|सरस्वती|गुरु|गुर्व|विद्या|प्रज्ञा|उपनिषद्/]
  ];
  function themeOf(b, t) { return t[4].test(String(b.title || "").replace(/[­¦]/g, "")); }

  // [{ meta, books }] in the category order; a stotra in a category the admin removed or hid goes under "other"
  function groups(ctx) {
    var q = hub.q.trim().toLowerCase();
    var by = {}, known = {};
    var th = hub.theme ? THEMES.filter(function (t) { return t[0] === hub.theme; })[0] : null;
    visibleCats().forEach(function (c) { known[c.key] = true; by[c.key] = []; });
    var fallback = known.other ? "other" : (visibleCats()[0] || {}).key;
    stotraBooks(ctx).forEach(function (b) {
      var hay = (b.title + " " + (b.titleRoman || "") + " " + b.author + " " + (b.people || "")).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      if (th && !themeOf(b, th)) return;
      var k = known[b.stotra] ? b.stotra : fallback;
      if (k) (by[k] = by[k] || []).push(b);
    });
    var out = [];
    visibleCats().forEach(function (c) { out.push({ meta: c, books: by[c.key] || [] }); });
    out.forEach(function (g) { g.books.sort(function (a, b) { return a.title.localeCompare(b.title, "hi"); }); });
    return out;
  }

  function cardHtml(ctx, b) {
    var tx = ctx.tx, esc = ctx.esc;
    return '<article class="st-card">' +
      '<a class="st-card-cover" href="/stotra/' + encodeURIComponent(b.slug) + '" tabindex="-1" aria-hidden="true">' + ctx.coverEl(b, "sm") + '</a>' +
      '<div class="st-card-t"><a class="st-card-title" href="/stotra/' + encodeURIComponent(b.slug) + '">' + F.softTitle(b.title) + '</a>' +
        '<span class="st-card-by">' + esc(b.author) + '</span>' +
        '<span class="st-card-act">' +
          '<a class="st-btn st-btn-main" href="/stotra/' + encodeURIComponent(b.slug) + '">' + esc(tx("पाठ करें", "Recite")) + ' ›</a>' +
          '<a class="st-btn" href="' + ctx.bookPath(b) + '">' + esc(tx("पुस्तक", "Book")) + '</a>' +
        '</span></div></article>';
  }

  function sectionsHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, any = false, h = "";
    groups(ctx).forEach(function (g) {
      if (!g.books.length || (hub.cat !== "all" && hub.cat !== g.meta.key)) return;
      any = true;
      h += '<section class="st-sec" id="st-' + esc(g.meta.key) + '">' +
        '<h2 class="st-sec-h"><span class="st-sec-ic" aria-hidden="true">' + catIcon(g.meta, 28, esc) + '</span>' + esc(tx(g.meta.hi, g.meta.en)) +
        '<span class="st-sec-n">' + g.books.length + '</span></h2>' +
        '<div class="st-grid">' + g.books.map(function (b) { return cardHtml(ctx, b); }).join("") + '</div></section>';
    });
    if (!any) h = '<div class="st-empty">' + esc(tx("कोई स्तोत्र नहीं मिला।", "No stotra found.")) + '</div>';
    return h;
  }

  function chipsHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc;
    var h = '<button type="button" class="vg-chip' + (hub.cat === "all" ? " is-on" : "") + '" data-st-cat="all">' + esc(tx("सभी", "All")) + '</button>';
    groups(ctx).forEach(function (g) {
      if (!g.books.length) return;
      h += '<button type="button" class="vg-chip' + (hub.cat === g.meta.key ? " is-on" : "") + '" data-st-cat="' + esc(g.meta.key) + '">' +
        '<span aria-hidden="true">' + catIcon(g.meta, 22, esc) + '</span> ' + esc(tx(g.meta.hi, g.meta.en)) + ' <small>' + g.books.length + '</small></button>';
    });
    return h;
  }

  // the library's other stotra books (collections, mantra books) that are not stotra pages of their own
  function collectionsHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc;
    var list = ctx.books.filter(function (b) { return !b.stotra && (b.categoryKeys || [b.category]).indexOf(LIB_CAT) !== -1; });
    if (!list.length) return "";
    var shown = list.slice(0, 18);
    return '<div class="vg-label"><span>' + esc(tx("पुस्तकालय के स्तोत्र-संग्रह", "Stotra collections in the library")) + '</span></div>' +
      '<p class="st-note">' + esc(tx("ये पूरी पुस्तकें हैं — इनमें अनेक स्तोत्र एक साथ हैं।", "These are full books holding many stotras together.")) + '</p>' +
      '<div class="st-coll">' + shown.map(function (b) { return '<a class="st-coll-i" href="' + ctx.bookPath(b) + '">' + esc(b.title) + '</a>'; }).join("") +
      '<a class="st-coll-i st-coll-all" href="/library?cat=' + encodeURIComponent(LIB_CAT) + '">' + esc(tx("सभी " + list.length + " देखें ›", "See all " + list.length + " ›")) + '</a></div>';
  }

  /* small line icons for the hero tiles and the feature strip */
  function ico(name) {
    var p = {
      book: '<path d="M12 6.5C10.3 5.2 8 4.7 4 4.8v13c4-.1 6.3.4 8 1.7 1.7-1.3 4-1.8 8-1.7v-13c-4-.1-6.3.4-8 1.7zM12 6.5v13"/>',
      layers: '<path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5zM3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16"/>',
      mark: '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4v-17z"/>',
      clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.3 2"/>',
      trans: '<rect x="3.5" y="4" width="11" height="13" rx="1.5"/><path d="M7 14l2-6 2 6M7.7 12.2h2.6M17 9h3.5v10.5H11"/>',
      tap: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v5a5 5 0 0 1-5 5h-1.5a5 5 0 0 1-4-2L5.5 15a1.5 1.5 0 0 1 2.3-1.8L9 14.5"/>',
      ear: '<path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.6"/><rect x="16.5" y="14" width="4" height="6" rx="1.6"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
      lotus: '<path d="M12 4c-2.2 3-2.2 7.5 0 10.5 2.2-3 2.2-7.5 0-10.5zM12 14.5c-4 0-7-2-8.2-6.3 3.4 0 6.5 2.2 8.2 6.3zM12 14.5c4 0 7-2 8.2-6.3-3.4 0-6.5 2.2-8.2 6.3zM3.5 16.5c4.5 3.6 12.5 3.6 17 0"/>',
      shield: '<path d="M12 3.2 19 6v5.4c0 4.7-3 7.6-7 9.4-4-1.8-7-4.7-7-9.4V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
      hands: '<path d="M12 20.5c-3 0-5-2-5-5l.9-6.3 2.1 3V5l2 2.2L14 5v7.2l2.1-3L17 15.5c0 3-2 5-5 5z"/>',
      sprout: '<path d="M12 21v-9.5M12 11.5c0-4-3-6.5-7.5-6.5 0 4 3 6.5 7.5 6.5zM12 14c0-3 2.3-5.2 6.5-5.2 0 3-2.3 5.2-6.5 5.2z"/>',
      gem: '<path d="M6.5 4h11l4 5L12 20.5 2.5 9z"/><path d="M2.5 9h19M9 4 7.5 9 12 20.5 16.5 9 15 4"/>'
    }[name] || "";
    return '<svg class="st2-ic" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* the categories with their stotras, whatever the search / theme filter of the list below is */
  function catsAll(ctx) {
    var q = hub.q, t = hub.theme, g;
    hub.q = ""; hub.theme = "";
    g = groups(ctx).filter(function (x) { return x.books.length; });
    hub.q = q; hub.theme = t;
    return g;
  }

  /* "by deity": a round picture (assets/deity/<name>.webp, or the category's glyph) with its name under it, in a row that scrolls */
  function deityCarouselHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc;
    var items = catsAll(ctx).map(function (g) {
      var m = g.meta;
      return '<button type="button" class="st2-deity" data-st-go="cat" data-st-cat="' + esc(m.key) + '" title="' + esc(g.books.length + "") + '">' +
        '<span class="st2-dmed" aria-hidden="true">' + catIcon(m, 88, esc) + '</span>' +
        '<span class="st2-dpill">' + esc(tx(m.hi, m.en) + " " + tx("स्तोत्र", "Stotras")) + ' &rsaquo;</span></button>';
    }).join("");
    return '<div class="st2-deities"><button type="button" class="st2-dnav" data-st-dnav="-1" aria-label="' + esc(tx("पिछला", "Previous")) + '">&lsaquo;</button>' +
      '<div class="st2-dscroll" id="stDeities">' + items + '</div>' +
      '<button type="button" class="st2-dnav" data-st-dnav="1" aria-label="' + esc(tx("अगला", "Next")) + '">&rsaquo;</button></div>' +
      '<div class="st2-dots" id="stDots" aria-hidden="true"></div>';
  }

  /* "today's pick": the weekday's deity (Sunday Surya, Monday Shiva, Tuesday and Saturday Hanuman, Wednesday Ganesha, Thursday Vishnu / Guru,
     Friday Devi); of that deity's stotras the one the week number points at, else any stotra by the day number */
  var WEEKDAY_CATS = [["surya"], ["shiva"], ["hanuman"], ["ganesha"], ["vishnu", "guru"], ["devi"], ["hanuman"]];
  var PICK_BLURB = {
    ganesha: ["बुद्धि, सिद्धि और विघ्न निवारण के लिए", "For wisdom, success and the removal of obstacles"],
    shiva: ["कल्याण, शान्ति और शिव-कृपा के लिए", "For well-being, peace and Shiva's grace"],
    devi: ["शक्ति, रक्षा और माँ की कृपा के लिए", "For strength, protection and the Mother's grace"],
    guru: ["ज्ञान और गुरु-कृपा के लिए", "For knowledge and the Guru's grace"],
    vishnu: ["शान्ति, समृद्धि और हरि-कृपा के लिए", "For peace, prosperity and Hari's grace"],
    hanuman: ["बल, साहस और संकट-मुक्ति के लिए", "For strength, courage and relief from trouble"],
    surya: ["आरोग्य, तेज और ऊर्जा के लिए", "For health, radiance and energy"]
  };
  function pickOfTheDay(ctx) {
    var all = stotraBooks(ctx); if (!all.length) return null;
    var d = new Date(), day = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000), wk = Math.floor(day / 7);
    var want = WEEKDAY_CATS[d.getDay()];
    var pool = all.filter(function (b) { return want.indexOf(b.stotra) !== -1; });
    pool.sort(function (a, b) { return a.title.localeCompare(b.title, "hi"); });
    if (pool.length) return pool[wk % pool.length];
    var s = all.slice().sort(function (a, b) { return a.title.localeCompare(b.title, "hi"); });
    return s[day % s.length];
  }
  function pickHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, b = pickOfTheDay(ctx);
    if (!b) return "";
    var href = "/stotra/" + encodeURIComponent(b.slug), blurb = PICK_BLURB[b.stotra] || ["आज के लिए चुना हुआ स्तोत्र", "Chosen for today"];
    return '<section class="st2-pick" aria-label="' + esc(tx("आज का चयन", "Today's pick")) + '">' +
      '<a class="st2-pick-book" href="' + href + '" tabindex="-1" aria-hidden="true"><span class="st2-pick-page" id="stPickLines" data-st-pick="' + esc(b.id) + '"><i>॥ श्री गणेशाय नमः ॥</i></span></a>' +
      '<div class="st2-pick-t"><small class="st2-pick-k"><span aria-hidden="true">&#10048;</span> ' + esc(tx("आज का चयन", "Today's pick")) + '</small>' +
        '<h2><a href="' + href + '">' + F.softTitle(b.title) + '</a></h2>' +
        '<p>' + esc(tx(blurb[0], blurb[1])) + '</p>' +
        '<div class="st2-pick-act"><a class="st2-btn st2-btn-main" data-st-open="pat" href="' + href + '"><span aria-hidden="true">&#9654;</span> ' + esc(tx("पाठ करें", "Recite")) + '</a>' +
          '<a class="st2-btn st2-btn-out" data-st-open="read" href="' + href + '"><span aria-hidden="true">&#128214;</span> ' + esc(tx("अर्थ पढ़ें", "Read the meaning")) + '</a></div></div></section>';
  }

  /* "by theme": a row of the themes that have a stotra; a tap filters the list below */
  function themesHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, all = stotraBooks(ctx);
    var items = THEMES.filter(function (t) { return all.some(function (b) { return themeOf(b, t); }); }).map(function (t) {
      var ic = t[3].length > 2 ? ico(t[3]) : '<span class="st2-om">' + esc(t[3]) + '</span>';
      return '<button type="button" class="st2-theme' + (hub.theme === t[0] ? " is-on" : "") + '" data-st-theme="' + t[0] + '">' + ic + '<b>' + esc(tx(t[1], t[2]) + " " + tx("स्तोत्र", "Stotras")) + '</b></button>';
    }).join("");
    if (!items) return "";
    return '<div class="vg-label"><span>' + esc(tx("विषय अनुसार संग्रह", "Collection by theme")) + '</span></div>' +
      '<div class="st2-themes">' + items +
      '<button type="button" class="st2-theme st2-theme-all" data-st-go="all"><b>' + esc(tx("संपूर्ण सूची", "Full list")) + '</b><span aria-hidden="true">&rarr;</span></button></div>';
  }

  function hubHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, all = stotraBooks(ctx);
    var nCats = groups(ctx).filter(function (g) { return g.books.length; }).length;
    function tile(icon, hi, en, n, attrs, href) {
      var inner = ico(icon) + '<b>' + esc(tx(hi, en)) + '</b>' + (n !== null ? '<small>(' + n + ')</small>' : '');
      return href ? '<a class="st2-tile" href="' + href + '">' + inner + '</a>' : '<button type="button" class="st2-tile" ' + attrs + '>' + inner + '</button>';
    }
    function feat(icon, hi, en, shi, sen) {
      return '<div class="st2-fi">' + ico(icon) + '<p><b>' + esc(tx(hi, en)) + '</b><span>' + esc(tx(shi, sen)) + '</span></p></div>';
    }
    return '<div class="st-page st2">' +
      '<section class="st2-hero">' +
        '<div class="st2-hero-t">' +
          '<h1>' + esc(tx("स्तोत्र संग्रह", "Stotra Collection")) + '</h1>' +
          '<p>' + esc(tx("विभिन्न देवताओं, विषयों और आचार्यों के स्तोत्रों का एक सुव्यवस्थित संग्रह — पाठ, अर्थ और अनुवाद सहित।", "A well-ordered collection of stotras by deity, theme and acharya, with the text, word meanings and translation.")) + '</p>' +
          '<form class="st2-search" id="stSearchForm" role="search"><span class="st2-search-ic" aria-hidden="true">' + ico("search") + '</span>' +
            '<input type="search" id="stSearch" autocomplete="off" placeholder="' + esc(tx("स्तोत्र, देवता या लेखक का नाम खोजें…", "Search a stotra, deity or author…")) + '" value="' + esc(hub.q) + '">' +
            '<button type="submit" aria-label="' + esc(tx("खोजें", "Search")) + '">&rarr;</button></form>' +
        '</div>' +
        '<div class="st2-tiles">' +
          tile("book", "सभी स्तोत्र", "All stotras", '<span id="stCount">' + all.length + '</span>', 'data-st-go="all"') +
          tile("layers", "विषय", "Categories", nCats, 'data-st-go="cats"') +
          tile("mark", "मेरी सूची", "My list", null, "", "/favorites") +
          tile("clock", "हाल में पढ़े", "Recently read", null, "", "/myreads") +
        '</div>' +
      '</section>' +
      '<div class="vg-label" id="stCats"><span>' + esc(tx("देवता अनुसार स्तोत्र", "Stotras by deity")) + '</span></div>' +
      deityCarouselHtml(ctx) +
      pickHtml(ctx) +
      themesHtml(ctx) +
      '<div class="vg-label"><span>' + esc(tx("अन्य सुविधाएँ", "More features")) + '</span></div>' +
      '<div class="st2-feats">' +
        feat("book", "मूल पाठ", "Original text", "(संस्कृत में)", "(in Sanskrit)") +
        feat("trans", "अर्थ व अनुवाद", "Meaning & translation", "(सरल हिंदी में)", "(in simple Hindi)") +
        feat("tap", "पद-विच्छेद", "Word by word", "(शब्द पर टैप करें)", "(tap a word)") +
        feat("ear", "श्रवण", "Listen", "(पाठ/ऑडियो)", "(recitation audio)") +
      '</div>' +
      '<div class="vg-label" id="stAll"><span>' + esc(tx("ग्रन्थ संग्रह (सभी स्तोत्र)", "The collection (all stotras)")) + '</span></div>' +
      '<div class="vg-chips" id="stChips">' + chipsHtml(ctx) + '</div>' +
      '<div id="stSections">' + sectionsHtml(ctx) + '</div>' +
      collectionsHtml(ctx) +
    '</div>';
  }

  function mountHub(ctx) {
    var chips = document.getElementById("stChips"), sec = document.getElementById("stSections"), input = document.getElementById("stSearch"), page = document.querySelector(".st-page");
    if (!chips || !sec || !input || !page) return;
    var timer = null;
    function redraw() {
      chips.innerHTML = chipsHtml(ctx); sec.innerHTML = sectionsHtml(ctx);
      page.querySelectorAll("[data-st-theme]").forEach(function (t) { t.classList.toggle("is-on", t.getAttribute("data-st-theme") === hub.theme); });
    }
    function to(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    chips.addEventListener("click", function (e) {
      var c = e.target.closest("[data-st-cat]");
      if (!c) return;
      hub.cat = c.getAttribute("data-st-cat"); redraw();
    });
    page.addEventListener("click", function (e) {
      var op = e.target.closest("[data-st-open]");
      if (op) { lsSet(LS_MODE, op.getAttribute("data-st-open")); return; }     // the pick's two buttons open the same stotra in recite / meaning mode
      var nav = e.target.closest("[data-st-dnav]");
      if (nav) { var row = document.getElementById("stDeities"); if (row) row.scrollBy({ left: (+nav.getAttribute("data-st-dnav")) * row.clientWidth * 0.8, behavior: "smooth" }); return; }
      var th = e.target.closest("[data-st-theme]");
      if (th) { var k = th.getAttribute("data-st-theme"); hub.theme = hub.theme === k ? "" : k; hub.cat = "all"; redraw(); to("stAll"); return; }
      var g = e.target.closest("[data-st-go]");
      if (!g) return;
      var a = g.getAttribute("data-st-go");
      if (a === "cats") { to("stCats"); return; }
      if (a === "all") { hub.cat = "all"; hub.q = ""; hub.theme = ""; input.value = ""; } else { hub.cat = g.getAttribute("data-st-cat"); hub.theme = ""; }
      redraw(); to("stAll");
    });
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { hub.q = input.value; redraw(); }, 120); });
    document.getElementById("stSearchForm").addEventListener("submit", function (e) { e.preventDefault(); clearTimeout(timer); hub.q = input.value; redraw(); to("stAll"); });

    /* the deity row: arrows and one dot per screenful */
    var row = document.getElementById("stDeities"), dots = document.getElementById("stDots");
    function paintDots() {
      if (!row || !dots) return;
      var pages = Math.max(1, Math.ceil(row.scrollWidth / Math.max(1, row.clientWidth) - 0.05)), at = Math.round(row.scrollLeft / Math.max(1, row.clientWidth));
      var over = pages > 1;
      dots.hidden = !over;
      page.querySelectorAll("[data-st-dnav]").forEach(function (n) { n.hidden = !over; });
      dots.innerHTML = over ? Array.apply(null, Array(pages)).map(function (_, i) { return '<i' + (i === Math.min(at, pages - 1) ? ' class="on"' : '') + '></i>'; }).join("") : "";
    }
    if (row) { row.addEventListener("scroll", function () { clearTimeout(row._t); row._t = setTimeout(paintDots, 60); }); window.addEventListener("resize", paintDots); paintDots(); setTimeout(paintDots, 400); }

    /* today's pick: the opening lines of the stotra go on its book page */
    var pg = document.getElementById("stPickLines");
    if (pg) {
      var b = ctx.books.filter(function (x) { return String(x.id) === pg.getAttribute("data-st-pick"); })[0], key = b && (b.contentHref || b.href);
      if (b) (parsed[key] ? Promise.resolve(parsed[key]) : ctx.loadText(b).then(function (html) { return (parsed[key] = F.parseHtml(html)); })).then(function (st) {
        if (!st || !st.verses || !st.verses.length || !document.body.contains(pg)) return;
        var lines = [];
        if (st.invocation) lines.push(st.invocation);
        st.verses[0].lines.slice(0, 4).forEach(function (l) { lines.push(String(l).replace(/[­¦]/g, "")); });
        pg.innerHTML = lines.map(function (l) { return '<i>' + ctx.esc(l) + '</i>'; }).join("");
      }).catch(function () {});
    }
  }

  /* ------------------------------------------------------------------ the viewer */
  function mode() { return lsGet(LS_MODE) === "pat" ? "pat" : "read"; }
  /* पद-विच्छेद एवं शब्दार्थ: "tap" (the default) = a word of the verse opens its word break and meaning, "list" = the whole word list under each verse as well, "off" */
  function wmMode() { var v = lsGet(LS_WM); return v === "off" || v === "list" ? v : "tap"; }
  var WORDLIKE = /[\u0904-\u0939\u0958-\u0961\u0950]/;     // a verse word: a piece of a line with a letter (the same rule as tools/stotra_wordmap.py)
  function lhVal() { var n = parseFloat(lsGet(LS_LH)); return n >= 0.9 && n <= 1.6 ? n : 1; }
  function sizeIdx() { var n = parseInt(lsGet(LS_SIZE), 10); return n >= 0 && n < SIZES.length ? n : 1; }

  function viewerHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, b = ctx.book;
    var isSt = !!b.stotra;      // a book shown in this viewer without being a stotra (an Upanishad): the way back is its book page, not /stotras
    var m = mode();
    return '<main class="content-pad st-viewer st-mode-' + m + ' st-wm-' + wmMode() + '" id="stViewer" style="--st-fz:' + SIZES[sizeIdx()] + ';--st-lh:' + lhVal() + '">' +
      '<div class="st-bar">' +
        '<a class="st-back st-ibtn" href="' + (isSt ? "/stotras" : ctx.bookPath(b)) + '" title="' + esc(isSt ? tx("सभी स्तोत्र", "All stotras") : tx("पुस्तक का पृष्ठ", "Book page")) + '" aria-label="' + esc(isSt ? tx("सभी स्तोत्र", "All stotras") : tx("पुस्तक का पृष्ठ", "Book page")) + '">&larr;</a>' +
        '<b class="st-bar-title">' + esc(b.title) + '</b>' +
        '<button type="button" class="st-ibtn" id="stListenBtn" hidden aria-pressed="true" title="' + esc(tx("ऑडियो प्लेयर", "Audio player")) + '" aria-label="' + esc(tx("ऑडियो प्लेयर", "Audio player")) + '">&#127911;</button>' +
        '<button type="button" class="st-ibtn" id="stFindBtn" aria-pressed="false" title="' + esc(tx("स्तोत्र में खोजें", "Search in this stotra")) + '" aria-label="' + esc(tx("स्तोत्र में खोजें", "Search in this stotra")) + '">&#128269;</button>' +
        '<button type="button" class="st-ibtn' + (ctx.isFav && ctx.isFav(b) ? ' is-on' : '') + '" id="stFavBtn" aria-pressed="' + !!(ctx.isFav && ctx.isFav(b)) + '" title="' + esc(tx("पसंदीदा", "Favourite")) + '" aria-label="' + esc(tx("पसंदीदा", "Favourite")) + '">' + (ctx.isFav && ctx.isFav(b) ? '&#9733;' : '&#9734;') + '</button>' +
        '<button type="button" class="st-ibtn" id="stSetBtn" aria-expanded="false" aria-controls="stSettings" title="' + esc(tx("सेटिंग्स", "Settings")) + '" aria-label="' + esc(tx("सेटिंग्स", "Settings")) + '">Aa</button>' +
        '<div class="st-settings" id="stSettings" hidden>' +
          '<div class="st-set-row"><span>' + esc(tx("पाठ-विधि", "View")) + '</span><div class="st-sw-row">' +
            '<button type="button" class="st-sw-l" data-st-mode="pat" aria-pressed="' + (m === "pat") + '">' + esc(tx("पाठ", "Recite")) + '<small>' + esc(tx("केवल संस्कृत", "Sanskrit only")) + '</small></button>' +
            '<button type="button" class="st-sw" data-st-modesw role="switch" aria-checked="' + (m === "read") + '" aria-label="' + esc(tx("पाठ / अर्थ सहित", "Recite / With meaning")) + '"><i></i></button>' +
            '<button type="button" class="st-sw-l" data-st-mode="read" aria-pressed="' + (m === "read") + '">' + esc(tx("अर्थ सहित", "With meaning")) + '<small>' + esc(tx("पदार्थ व भावार्थ", "Word meanings")) + '</small></button></div></div>' +
          '<div class="st-set-row' + (m === "pat" ? " is-disabled" : "") + '" id="stWmRow"><span>' + esc(F.PAD_LABEL.replace(/:$/, "")) + '</span>' +
            '<div class="st-seg" data-pos="' + ["off", "tap", "list"].indexOf(wmMode()) + '" role="group">' +
              [["off", "बंद", "Off", "केवल श्लोक", "Verse only"], ["tap", "शब्द पर टैप", "Tap a word", "पद-विच्छेद व अर्थ", "Break & meaning"], ["list", "पूरी सूची", "Full list", "हर श्लोक के नीचे", "Under each verse"]].map(function (o) {
                return '<button type="button" data-st-wm="' + o[0] + '" data-d="' + esc(tx(o[3], o[4])) + '" aria-pressed="' + (wmMode() === o[0]) + '"' + (m === "pat" ? " disabled" : "") + '>' + esc(tx(o[1], o[2])) + '</button>';
              }).join("") + '</div>' +
            '<p class="st-seg-d" id="stSegD">' + esc(tx.apply(null, wmMode() === "off" ? ["केवल श्लोक", "Verse only"] : wmMode() === "tap" ? ["पद-विच्छेद व अर्थ", "Break & meaning"] : ["हर श्लोक के नीचे", "Under each verse"])) + '</p></div>' +
          '<div class="st-set-row"><span>' + esc(tx("फ़ॉन्ट आकार", "Font size")) + '</span><div class="st-set-size">' +
            '<button type="button" data-st-size="-1" aria-label="' + esc(tx("अक्षर छोटे करें", "Smaller text")) + '">A&minus;</button>' +
            '<em id="stSizeVal">' + Math.round(SIZES[sizeIdx()] * 100) + '%</em>' +
            '<button type="button" data-st-size="1" aria-label="' + esc(tx("अक्षर बड़े करें", "Larger text")) + '">A+</button></div></div>' +
          '<div class="st-set-row"><span>' + esc(tx("पंक्ति ऊँचाई", "Line spacing")) + '</span><div class="st-set-lh">' +
            '<input type="range" id="stLh" min="0.9" max="1.6" step="0.1" value="' + lhVal() + '" aria-label="' + esc(tx("पंक्ति ऊँचाई", "Line spacing")) + '"><em id="stLhVal">' + Number(lhVal()).toFixed(1) + '</em></div></div>' +
        '</div>' +
        '<form class="st-find" id="stFind" hidden role="search">' +
          '<input type="search" id="stFindInput" autocomplete="off" placeholder="' + esc(tx("इस स्तोत्र में खोजें…", "Search in this stotra…")) + '" aria-label="' + esc(tx("खोजें", "Search")) + '">' +
          '<span class="st-find-n" id="stFindN"></span>' +
          '<button type="button" class="st-ibtn" data-st-fp aria-label="' + esc(tx("पिछला", "Previous")) + '">&#8593;</button>' +
          '<button type="button" class="st-ibtn" data-st-fn aria-label="' + esc(tx("अगला", "Next")) + '">&#8595;</button>' +
        '</form>' +
      '</div>' +
      '<article class="st-doc" id="stDoc"><div class="st-loading">' + esc(tx("लोड हो रहा है…", "Loading…")) + '</div></article>' +
      '<nav class="st-foot"><a class="st-btn" href="' + ctx.bookPath(b) + '">' + esc(tx("पुस्तक का पृष्ठ", "Book page")) + '</a>' +
        (isSt ? '<a class="st-btn" href="/stotras">' + esc(tx("सभी स्तोत्र", "All stotras")) + '</a>' : '') + '</nav>' +
    '</main>';
  }

  /* a verse's lines; every word that has a word-list row (pad row [word, meaning, break, "first-last"]) becomes a tappable span of its unit */
  function verseHtml(v, vi) {
    var unit = {};
    (v.pad || []).forEach(function (p, ri) {
      var m = /^(\d+)-(\d+)$/.exec(p[3] || "");
      if (m) for (var k = +m[1]; k <= +m[2]; k++) unit[k] = ri;
    });
    var idx = 0;
    var ls = v.lines.map(function (ln) {
      return ln.split(/(\s+)/).map(function (piece) {
        if (!WORDLIKE.test(piece)) return F.lineHtml(piece);
        var u = unit[idx++];
        return u === undefined ? F.lineHtml(piece) : '<span class="st-w" data-u="' + vi + '-' + u + '" tabindex="0" role="button">' + F.lineHtml(piece) + '</span>';
      }).join("");
    });
    /* every line is a .st-ln, which fitVerses() cuts at its ¦ marks only when the whole line is wider than the page */
    function ln(x) { return '<span class="st-ln">' + x + '</span>'; }
    if (ls.length !== 4) return ls.map(ln).join("<br>");
    /* four lines = two half-verses: the two lines of a half stay on one row when they fit, else the second drops below */
    return '<span class="st-pr">' + ln(ls[0]) + " " + ln(ls[1]) + '</span><br><span class="st-pr">' + ln(ls[2]) + " " + ln(ls[3]) + '</span>';
  }

  function docHtml(ctx, st) {
    var tx = ctx.tx, esc = ctx.esc, d = F.digits;
    var h = '';
    if (st.invocation) h += '<p class="st-inv">' + esc(st.invocation) + '</p>';
    h += '<h1 class="st-title">' + F.lineHtml(st.titleHy || st.title) + '</h1>';
    if (st.subtitle) h += '<p class="st-sub st-readonly">' + esc(st.subtitle) + '</p>';
    (st.intro || []).forEach(function (s) {
      h += '<section class="st-intro st-readonly">' + (s.title ? '<h2>' + esc(s.title) + '</h2>' : '') +
        String(s.text || "").split(/\n/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join("") + '</section>';
    });
    st.verses.forEach(function (v, i) {
      h += '<section class="st-verse" id="stv' + (i + 1) + '">' +
        (v.label ? '<h2 class="st-vlabel">' + esc(v.label) + '</h2>' : '') +
        '<p class="st-sloka">' + verseHtml(v, i) + '</p>';
      var arth = '';
      if (v.pad && v.pad.length) {
        arth += '<h3 class="st-padh">' + esc(F.PAD_LABEL.replace(/:$/, "")) + '</h3><dl class="st-pad">' +
          v.pad.map(function (p) { return '<div><dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd></div>'; }).join("") + '</dl>';
      }
      String(v.bhav || "").split(/\n/).filter(Boolean).forEach(function (x) { arth += '<p class="st-bhav">' + esc(x) + '</p>'; });
      if (arth) h += '<div class="st-arth st-readonly">' + arth + '</div>';
      h += '</section>';
    });
    if (st.closing) h += '<p class="st-closing">' + st.closing.split(/\n/).map(esc).join("<br>") + '</p>';
    return h;
  }

  /* ------------------------------------------------------------------ the audio player (a stotra's recording, stuck to the bottom of the page) */
  var player = null;     // { audio, el }: the one recording playing for the viewer on screen

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60);
  }
  function audioSrc(p) {
    var m = window.swadhyayMedia ? window.swadhyayMedia(p) : p;
    return /^(https?:)?\/\//i.test(m) || m.charAt(0) === "/" ? m : "/" + m;
  }
  function stopPlayer() {
    if (!player) return;
    try { player.audio.pause(); player.audio.removeAttribute("src"); player.audio.load(); } catch (e) {}
    player = null;
  }

  function mountPlayer(ctx, root, st) {
    stopPlayer();
    if (!st.audio) return;
    var tx = ctx.tx, esc = ctx.esc;
    var el = document.createElement("div");
    el.className = "st-player"; el.id = "stPlayer"; el.setAttribute("role", "group"); el.setAttribute("aria-label", tx("स्तोत्र ऑडियो", "Stotra audio"));
    var IC_PLAY = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
    var IC_PAUSE = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/></svg>';
    var IC_BACK = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 4.5v5h5M4.6 9.5A8.5 8.5 0 1 1 3.5 13"/><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" font-family="NotoSerifDevanagari, serif">10</text></svg>';
    var IC_FWD = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M20 4.5v5h-5M19.4 9.5A8.5 8.5 0 1 0 20.5 13"/><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" font-family="NotoSerifDevanagari, serif">10</text></svg>';
    var IC_LOOP = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M17 2.5l3.5 3.5L17 9.5M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13M7 21.5L3.5 18 7 14.5M20.5 13v1.5A3.5 3.5 0 0 1 17 18H4"/></svg>';
    el.innerHTML = '<div class="st-pl-prog">' +
        '<span class="st-pl-t" id="stPlT">0:00</span>' +
        '<input type="range" class="st-pl-seek" id="stPlSeek" min="0" max="1000" value="0" aria-label="' + esc(tx("आगे-पीछे", "Seek")) + '">' +
        '<span class="st-pl-t" id="stPlD">0:00</span>' +
      '</div>' +
      '<div class="st-pl-row">' +
        '<div class="st-pl-info"><span class="st-pl-ttl">' + esc(st.title || "") + '</span><span class="st-pl-sub" id="stPlSub">' + esc((ctx.book && ctx.book.author) || "कल्याण") + '</span></div>' +
        '<div class="st-pl-ctl">' +
          '<button type="button" class="st-pl-skip" data-pl="back" aria-label="' + esc(tx("१० सेकंड पीछे", "Back 10 seconds")) + '">' + IC_BACK + '</button>' +
          '<button type="button" class="st-pl-play" data-pl="play" aria-label="' + esc(tx("चलाएँ", "Play")) + '">' + IC_PLAY + '</button>' +
          '<button type="button" class="st-pl-skip" data-pl="fwd" aria-label="' + esc(tx("१० सेकंड आगे", "Forward 10 seconds")) + '">' + IC_FWD + '</button>' +
        '</div>' +
        '<div class="st-pl-opt">' +
          '<button type="button" class="st-pl-btn" data-pl="speed" aria-label="' + esc(tx("गति", "Speed")) + '">1&times;</button>' +
          '<button type="button" class="st-pl-btn" data-pl="loop" aria-pressed="false" aria-label="' + esc(tx("बार-बार दोहराएँ", "Repeat")) + '" title="' + esc(tx("दोहराएँ", "Repeat")) + '">' + IC_LOOP + '</button>' +
        '</div>' +
      '</div>';
    root.appendChild(el);
    /* sit flush on the phone's bottom navigation, whatever its height */
    function fitNav() {
      if (!document.body.contains(el)) { window.removeEventListener("resize", fitNav); return; }
      var n = document.querySelector(".bottom-nav"), h = 0;
      if (n && getComputedStyle(n).display !== "none") h = n.offsetHeight;
      el.style.setProperty("--st-bn", h + "px");
    }
    fitNav(); window.addEventListener("resize", fitNav);
    root.classList.add("has-player");
    var lbtn = root.querySelector("#stListenBtn"); if (lbtn) { lbtn.hidden = false; lbtn.setAttribute("aria-pressed", "true"); }

    var audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioSrc(st.audio);
    player = { audio: audio, el: el };
    var playBtn = el.querySelector("[data-pl=play]"), seek = el.querySelector("#stPlSeek"), tNow = el.querySelector("#stPlT"), tEnd = el.querySelector("#stPlD");
    var speeds = [1, 0.75, 1.25, 1.5], si = 0, dragging = false;

    function sync() {
      var d = audio.duration;
      tNow.textContent = fmtTime(audio.currentTime);
      if (isFinite(d) && d > 0) { tEnd.textContent = fmtTime(d); if (!dragging) seek.value = Math.round(audio.currentTime / d * 1000); }
      el.style.setProperty("--p", (seek.value / 10) + "%");
    }
    function paint() {
      var on = !audio.paused;
      playBtn.innerHTML = on ? IC_PAUSE : IC_PLAY;
      playBtn.setAttribute("aria-label", on ? tx("रोकें", "Pause") : tx("चलाएँ", "Play"));
      el.classList.toggle("is-playing", on);
    }
    ["loadedmetadata", "durationchange"].forEach(function (ev) { audio.addEventListener(ev, sync); });
    audio.addEventListener("timeupdate", function () {
      if (!document.getElementById("stPlayer")) { stopPlayer(); return; }   // the page was left: the recording stops with it
      sync();
    });
    ["play", "pause", "ended"].forEach(function (ev) { audio.addEventListener(ev, paint); });
    audio.addEventListener("error", function () { el.classList.add("is-bad"); el.querySelector("#stPlSub").textContent = tx("ऑडियो उपलब्ध नहीं", "Audio unavailable"); });

    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pl]");
      if (!b) return;
      var k = b.getAttribute("data-pl");
      if (k === "play") {
        if (!audio.paused) { audio.pause(); return; }
        var A = window.SwadhyayAudio, G = window.SwadhyayShlokaAudio;      // a bhajan or shloka playing elsewhere yields to the recording
        if (A && A.pause) A.pause();
        if (G && G.stop) G.stop();
        if (audio.ended) audio.currentTime = 0;
        audio.play().catch(function () { el.classList.add("is-bad"); });
      } else if (k === "back" || k === "fwd") {
        var dur = isFinite(audio.duration) ? audio.duration : Infinity;
        audio.currentTime = Math.max(0, Math.min(dur, audio.currentTime + (k === "fwd" ? 10 : -10)));
        sync();
      } else if (k === "speed") {
        si = (si + 1) % speeds.length; audio.playbackRate = speeds[si];
        b.innerHTML = String(speeds[si]).replace(/^0\./, ".") + "&times;";
      } else if (k === "loop") {
        audio.loop = !audio.loop; b.setAttribute("aria-pressed", audio.loop ? "true" : "false");
      }
    });
    seek.addEventListener("input", function () { dragging = true; var d = audio.duration; if (isFinite(d)) { audio.currentTime = seek.value / 1000 * d; tNow.textContent = fmtTime(audio.currentTime); } el.style.setProperty("--p", (seek.value / 10) + "%"); });
    seek.addEventListener("change", function () { dragging = false; });
    document.addEventListener("swadhyay-audio-state", function () {           // the bhajan player started
      var A = window.SwadhyayAudio;
      if (player && player.audio === audio && !audio.paused && A && A.isActive && A.isActive()) audio.pause();
    });
    if (navigator.mediaSession && window.MediaMetadata) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: st.title, artist: ctx.book ? ctx.book.author : "", album: "कल्याण" });
        navigator.mediaSession.setActionHandler("play", function () { playBtn.click(); });
        navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        navigator.mediaSession.setActionHandler("seekbackward", function () { el.querySelector("[data-pl=back]").click(); });
        navigator.mediaSession.setActionHandler("seekforward", function () { el.querySelector("[data-pl=fwd]").click(); });
      } catch (e) {}
    }
  }

  function mountViewer(ctx) {
    var root = document.getElementById("stViewer"), doc = document.getElementById("stDoc");
    stopPlayer();
    if (!root || !doc || !F) return;
    var tx = ctx.tx, esc = ctx.esc, b = ctx.book;

    /* settings panel (Aa) */
    function settingsOpen() { var p = root.querySelector("#stSettings"); return !!p && !p.hidden; }
    function toggleSettings(force) {
      var p = root.querySelector("#stSettings"), btn = root.querySelector("#stSetBtn");
      var open = typeof force === "boolean" ? force : p.hidden;
      p.hidden = !open; btn.setAttribute("aria-expanded", open ? "true" : "false"); btn.classList.toggle("is-on", open);
    }
    document.addEventListener("click", function outside(e) {
      if (!document.body.contains(root)) { document.removeEventListener("click", outside); return; }
      if (settingsOpen() && !e.target.closest("#stSettings") && !e.target.closest("#stSetBtn")) toggleSettings(false);
    });
    var lh = root.querySelector("#stLh");
    if (lh) lh.addEventListener("input", function () {
      lsSet(LS_LH, lh.value); root.style.setProperty("--st-lh", lh.value);
      root.querySelector("#stLhVal").textContent = Number(lh.value).toFixed(1);
    });

    /* search inside the stotra */
    var marks = [], cur = -1;
    function clearMarks() {
      marks.forEach(function (m) { var par = m.parentNode; if (par) { par.replaceChild(document.createTextNode(m.textContent), m); par.normalize(); } });
      marks = []; cur = -1;
    }
    function visible(node) { return !!(node.parentElement && node.parentElement.offsetParent !== null); }
    function runFind(q) {
      clearMarks();
      var n = root.querySelector("#stFindN");
      q = q.trim();
      if (!q) { n.textContent = ""; return; }
      var lq = q.toLowerCase(), nodes = [], w = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, null);
      while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(function (t) {
        if (!visible(t)) return;
        var txt = t.nodeValue, low = txt.toLowerCase(), i = low.indexOf(lq);
        if (i < 0) return;
        var frag = document.createDocumentFragment(), last = 0;
        while (i >= 0) {
          frag.appendChild(document.createTextNode(txt.slice(last, i)));
          var mk = document.createElement("mark"); mk.className = "st-hit"; mk.textContent = txt.slice(i, i + q.length);
          frag.appendChild(mk); marks.push(mk);
          last = i + q.length; i = low.indexOf(lq, last);
        }
        frag.appendChild(document.createTextNode(txt.slice(last)));
        t.parentNode.replaceChild(frag, t);
      });
      n.textContent = marks.length ? "" : tx("कुछ नहीं मिला", "No matches");
      if (marks.length) stepFind(1);
    }
    function stepFind(d) {
      if (!marks.length) return;
      if (cur >= 0) marks[cur].classList.remove("is-cur");
      cur = (cur + d + marks.length) % marks.length;
      marks[cur].classList.add("is-cur");
      marks[cur].scrollIntoView({ block: "center", behavior: "smooth" });
      root.querySelector("#stFindN").textContent = (cur + 1) + "/" + marks.length;
    }
    function toggleFind(force) {
      var f = root.querySelector("#stFind"), btn = root.querySelector("#stFindBtn"), inp = root.querySelector("#stFindInput");
      var open = typeof force === "boolean" ? force : f.hidden;
      f.hidden = !open; btn.setAttribute("aria-pressed", open ? "true" : "false"); btn.classList.toggle("is-on", open);
      if (open) { toggleSettings(false); inp.focus(); inp.select(); } else { inp.value = ""; clearMarks(); root.querySelector("#stFindN").textContent = ""; }
    }
    var fForm = root.querySelector("#stFind"), fInp = root.querySelector("#stFindInput"), fTimer;
    if (fForm) {
      fForm.addEventListener("submit", function (e) { e.preventDefault(); if (marks.length) stepFind(1); else runFind(fInp.value); });
      fInp.addEventListener("input", function () { clearTimeout(fTimer); fTimer = setTimeout(function () { runFind(fInp.value); }, 200); });
      fInp.addEventListener("keydown", function (e) { if (e.key === "Escape") toggleFind(false); });
      /* a mode change re-evaluates what is visible */
      root.addEventListener("click", function (e) { if (e.target.closest("[data-st-mode],[data-st-modesw]") && fInp.value.trim()) setTimeout(function () { runFind(fInp.value); }, 0); });
    }

    /* the word tooltip: the tapped word of a verse -> its word break and meaning (the word-list row it belongs to), with arrows to walk through the words */
    var stData = null, tipEl = null, tipUnit = "";
    function tipOn() { return !root.classList.contains("st-mode-pat") && !root.classList.contains("st-wm-off"); }
    function hideTip() {
      if (tipEl) tipEl.hidden = true;
      [].forEach.call(root.querySelectorAll(".st-w.is-on"), function (x) { x.classList.remove("is-on"); });
      tipUnit = "";
    }
    function unitList() {
      var seen = {}, out = [];
      [].forEach.call(doc.querySelectorAll(".st-w"), function (w) { var u = w.getAttribute("data-u"); if (!seen[u]) { seen[u] = 1; out.push(u); } });
      return out;
    }
    function unitEls(u) { return doc.querySelectorAll('.st-w[data-u="' + u + '"]'); }
    function showTip(w) {
      if (!stData || !tipOn()) return;
      var u = w.getAttribute("data-u"), parts = u.split("-"), row = stData.verses[+parts[0]] && stData.verses[+parts[0]].pad[+parts[1]];
      if (!row) return;
      if (!tipEl) {
        tipEl = document.createElement("div");
        tipEl.className = "st-tip"; tipEl.id = "stTip"; tipEl.setAttribute("role", "dialog"); tipEl.setAttribute("aria-live", "polite"); tipEl.hidden = true;
        root.appendChild(tipEl);
      }
      hideTip();
      var els = unitEls(u), list = unitList(), at = list.indexOf(u);
      [].forEach.call(els, function (x) { x.classList.add("is-on"); });
      tipUnit = u;
      tipEl.innerHTML = '<div class="st-tip-w">' + esc(row[0]) + '</div>' +
        (row[2] ? '<div class="st-tip-b"><small>' + esc(tx("पद-विच्छेद", "Word break")) + '</small>' + esc(row[2]) + '</div>' : '') +
        '<div class="st-tip-m"><small>' + esc(tx("अर्थ", "Meaning")) + '</small>' + esc(row[1]) + '</div>' +
        '<div class="st-tip-nav"><button type="button" data-tip="prev" aria-label="' + esc(tx("पिछला शब्द", "Previous word")) + '"' + (at <= 0 ? " disabled" : "") + '>&#9664;</button>' +
        '<span>' + (at + 1) + ' / ' + list.length + '</span>' +
        '<button type="button" data-tip="next" aria-label="' + esc(tx("अगला शब्द", "Next word")) + '"' + (at >= list.length - 1 ? " disabled" : "") + '>&#9654;</button>' +
        '<button type="button" data-tip="close" class="st-tip-x" aria-label="' + esc(tx("बंद करें", "Close")) + '">&#10005;</button></div>';
      tipEl.hidden = false;
      placeTip(els[0]);
    }
    function placeTip(w) {
      var pl = document.getElementById("stPlayer"), nav = document.querySelector(".bottom-nav");
      var navH = nav && getComputedStyle(nav).display !== "none" ? nav.offsetHeight : 0;
      if (window.innerWidth <= 700) {                  // a phone: a panel on the bottom (above the player and the nav), the word scrolled clear above it
        tipEl.classList.add("is-sheet");
        tipEl.style.top = tipEl.style.left = "";
        tipEl.style.bottom = (navH + (pl ? pl.offsetHeight : 0) + 8) + "px";
        var tr = tipEl.getBoundingClientRect(), wr2 = w.getBoundingClientRect();
        if (wr2.bottom > tr.top - 10) window.scrollBy(0, wr2.bottom - tr.top + 14);
        else if (wr2.top < 90) window.scrollBy(0, wr2.top - 100);
        return;
      }
      tipEl.classList.remove("is-sheet"); tipEl.style.bottom = "";
      var rr = root.getBoundingClientRect(), wr = w.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      var bottomBar = (pl ? pl.offsetHeight : 0) + navH;
      var limit = window.innerHeight - bottomBar - 8, top = wr.bottom + 8;
      if (top + th > limit && wr.top - th - 8 > 70) top = wr.top - th - 8;     // no room under the word: above it
      var left = Math.max(8, Math.min(wr.left, window.innerWidth - tw - 8));
      tipEl.style.top = (top - rr.top) + "px"; tipEl.style.left = (left - rr.left) + "px";
      var r2 = tipEl.getBoundingClientRect();                                    // still hidden by a bar or the page top: scroll it clear
      if (r2.bottom > limit) window.scrollBy(0, r2.bottom - limit + 6);
      else if (r2.top < 70) window.scrollBy(0, r2.top - 76);
    }
    function stepTip(d) {
      var list = unitList(), at = list.indexOf(tipUnit), nx = list[at + d];
      if (nx === undefined) return;
      var el = unitEls(nx)[0];
      el.scrollIntoView({ block: "center" });
      showTip(el);
    }
    root.addEventListener("click", function (e) {
      var tb = e.target.closest("[data-tip]");
      if (!tb) return;
      e.stopPropagation();
      var k = tb.getAttribute("data-tip");
      if (k === "close") hideTip(); else stepTip(k === "next" ? 1 : -1);
    }, true);
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { hideTip(); return; }
      var w = e.target.closest && e.target.closest(".st-w");
      if (w && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showTip(w); }
    });

    root.addEventListener("click", function (e) {
      var mb = e.target.closest("[data-st-mode],[data-st-modesw]");
      if (mb) {
        var m = mb.hasAttribute("data-st-modesw") ? (mode() === "pat" ? "read" : "pat") : mb.getAttribute("data-st-mode");
        lsSet(LS_MODE, m); hideTip();
        root.classList.toggle("st-mode-pat", m === "pat"); root.classList.toggle("st-mode-read", m === "read");
        [].forEach.call(root.querySelectorAll("[data-st-mode]"), function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-st-mode") === m ? "true" : "false"); });
        [].forEach.call(root.querySelectorAll("[data-st-modesw]"), function (x) { x.setAttribute("aria-checked", m === "read" ? "true" : "false"); });
        var wr = document.getElementById("stWmRow");      // पद-विच्छेद एवं शब्दार्थ only means something with the meaning shown: off in पाठ mode
        if (wr) { wr.classList.toggle("is-disabled", m === "pat"); [].forEach.call(wr.querySelectorAll("[data-st-wm]"), function (x) { x.disabled = m === "pat"; }); }
        return;
      }
      var wb = e.target.closest("[data-st-wm]");
      if (wb) {
        var wmv = wb.getAttribute("data-st-wm");
        lsSet(LS_WM, wmv);
        ["off", "tap", "list"].forEach(function (k) { root.classList.toggle("st-wm-" + k, k === wmv); });
        [].forEach.call(root.querySelectorAll("[data-st-wm]"), function (x) { x.setAttribute("aria-pressed", x === wb ? "true" : "false"); });
        var seg = wb.parentNode, dd = document.getElementById("stSegD");
        if (seg && seg.classList.contains("st-seg")) seg.setAttribute("data-pos", ["off", "tap", "list"].indexOf(wmv));
        if (dd) dd.textContent = wb.getAttribute("data-d") || "";
        hideTip();
        if (fInp && fInp.value.trim()) setTimeout(function () { runFind(fInp.value); }, 0);
        return;
      }
      var wd = e.target.closest(".st-w");
      if (wd) { showTip(wd); return; }
      if (!e.target.closest("#stTip")) hideTip();
      var sb = e.target.closest("[data-st-size]");
      if (sb) {
        var n = Math.max(0, Math.min(SIZES.length - 1, sizeIdx() + parseInt(sb.getAttribute("data-st-size"), 10)));
        lsSet(LS_SIZE, String(n)); root.style.setProperty("--st-fz", SIZES[n]);
        var sv = root.querySelector("#stSizeVal"); if (sv) sv.textContent = Math.round(SIZES[n] * 100) + "%";
        return;
      }
      var setBtn = e.target.closest("#stSetBtn");
      if (setBtn) { toggleSettings(); return; }
      if (e.target.closest("#stFindBtn")) { toggleFind(); return; }
      if (e.target.closest("#stFavBtn")) {
        if (!ctx.toggleFav) return;
        var on = ctx.toggleFav(b), fb = root.querySelector("#stFavBtn");
        fb.classList.toggle("is-on", on); fb.setAttribute("aria-pressed", on ? "true" : "false"); fb.innerHTML = on ? "&#9733;" : "&#9734;";
        return;
      }
      if (e.target.closest("#stListenBtn")) {
        var pl = document.getElementById("stPlayer"), lb = root.querySelector("#stListenBtn");
        if (pl) { var hide = !pl.hidden; pl.hidden = hide; root.classList.toggle("has-player", !hide); lb.setAttribute("aria-pressed", hide ? "false" : "true"); }
        return;
      }
      if (e.target.closest("[data-st-fn]")) { stepFind(1); return; }
      if (e.target.closest("[data-st-fp]")) { stepFind(-1); return; }
      if (settingsOpen() && !e.target.closest("#stSettings")) toggleSettings(false);
    });

    var key = b.contentHref || b.href;
    var ready = parsed[key] ? Promise.resolve(parsed[key]) : ctx.loadText(b).then(function (html) { return (parsed[key] = F.parseHtml(html)); });
    ready.then(function (st) {
      if (!st || !st.verses.length) {
        doc.innerHTML = '<div class="st-empty">' + esc(tx("इस पुस्तक में स्तोत्र के श्लोक नहीं मिले।", "No verses were found in this book.")) + ' <a href="' + ctx.bookPath(b) + '">' + esc(tx("पुस्तक का पृष्ठ", "Book page")) + '</a></div>';
        return;
      }
      stData = st;
      doc.innerHTML = docHtml(ctx, st);
      mountPlayer(ctx, root, st);
      /* a verse line is cut at its ¦ marks (with a hyphen) only when it does not fit the page uncut; first a half-verse shares a row, then each line has its own, last the cut */
      function fitVerses() {
        var sl = doc.querySelector(".st-sloka");
        if (!sl) return;
        var avail = sl.clientWidth;
        [].forEach.call(doc.querySelectorAll(".st-ln"), function (l) {
          if (!l.querySelector(".st-hy")) return;
          l.classList.remove("is-cut");
          var st0 = l.style.cssText;
          l.style.whiteSpace = "nowrap"; l.style.maxWidth = "none";
          var wide = l.getBoundingClientRect().width > avail + 0.5;
          l.style.cssText = st0;
          if (wide) wide = l.scrollWidth > l.clientWidth + 1;      // a line of several words wraps at its spaces; only a word wider than the page is cut
          l.classList.toggle("is-cut", wide);
        });
      }
      var fitT = 0;
      function fitSoon() { clearTimeout(fitT); fitT = setTimeout(fitVerses, 30); }
      fitVerses();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitVerses);
      window.addEventListener("resize", function again() { if (!document.body.contains(root)) { window.removeEventListener("resize", again); return; } fitSoon(); });
      if (window.MutationObserver) new MutationObserver(fitSoon).observe(root, { attributes: true, attributeFilter: ["style", "class"] });
      var want = parseInt(new URLSearchParams(location.search).get("v"), 10);
      if (want > 0) { var el = document.getElementById("stv" + want); if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 50); }
    }).catch(function () {
      doc.innerHTML = '<div class="st-empty">' + esc(tx("स्तोत्र लोड नहीं हो सका। कृपया पुनः प्रयास करें।", "The stotra could not be loaded. Please try again.")) + '</div>';
    });
  }

  window.SwadhyayStotra = { applyCategories: applyCategories, hubHtml: hubHtml, mountHub: mountHub, viewerHtml: viewerHtml, mountViewer: mountViewer, catMeta: catMeta };
})();

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
  var LS_MODE = "swadhyay_stotra_mode_v1", LS_SIZE = "swadhyay_stotra_size_v1", LS_LH = "swadhyay_stotra_lh_v1";
  var LIB_CAT = "Stotra evam Naamavali";
  var SIZES = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
  var cats = F ? F.CATEGORIES.slice() : [];
  var hub = { q: "", cat: "all" };
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

  // [{ meta, books }] in the category order; a stotra in a category the admin removed or hid goes under "other"
  function groups(ctx) {
    var q = hub.q.trim().toLowerCase();
    var by = {}, known = {};
    visibleCats().forEach(function (c) { known[c.key] = true; by[c.key] = []; });
    var fallback = known.other ? "other" : (visibleCats()[0] || {}).key;
    stotraBooks(ctx).forEach(function (b) {
      var hay = (b.title + " " + (b.titleRoman || "") + " " + b.author + " " + (b.people || "")).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
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
      '<div class="st-card-t"><a class="st-card-title" href="/stotra/' + encodeURIComponent(b.slug) + '">' + esc(b.title) + '</a>' +
        '<span class="st-card-by">' + esc(b.author) + '</span>' +
        '<span class="st-card-act">' +
          '<a class="st-btn st-btn-main" href="/stotra/' + encodeURIComponent(b.slug) + '">' + esc(tx("पाठ / अर्थ", "Recite / read")) + ' ›</a>' +
          '<a class="st-btn" href="' + ctx.bookPath(b) + '">' + esc(tx("पुस्तक", "Book")) + '</a>' +
        '</span></div></article>';
  }

  function sectionsHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, any = false, h = "";
    groups(ctx).forEach(function (g) {
      if (!g.books.length || (hub.cat !== "all" && hub.cat !== g.meta.key)) return;
      any = true;
      h += '<section class="st-sec" id="st-' + esc(g.meta.key) + '">' +
        '<h2 class="st-sec-h"><span class="st-sec-ic" aria-hidden="true">' + esc(g.meta.icon || "📿") + '</span>' + esc(tx(g.meta.hi, g.meta.en)) +
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
        '<span aria-hidden="true">' + esc(g.meta.icon || "📿") + '</span> ' + esc(tx(g.meta.hi, g.meta.en)) + ' <small>' + g.books.length + '</small></button>';
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

  function hubHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, all = stotraBooks(ctx);
    var nCats = groups(ctx).filter(function (g) { return g.books.length; }).length;
    return '<div class="vg-page st-page">' +
      '<section class="vg-hero st-hero">' +
        '<div class="vg-eyebrow">STOTRA &bull; ' + esc(tx("स्तोत्र", "STOTRAS")) + '</div>' +
        '<h1><span>' + esc(tx("स्तोत्र-संग्रह", "Stotra Collection")) + '</span></h1>' +
        '<p>' + esc(tx("सभी स्तोत्र एक स्थान पर, देवता और विषय के अनुसार। हर स्तोत्र एक सतत पृष्ठ पर खुलता है — केवल पाठ के लिए मूल श्लोक, या पद-विच्छेद और अर्थ सहित। प्रत्येक स्तोत्र पुस्तकालय में पुस्तक के रूप में भी उपलब्ध है।",
          "Every stotra in one place, by deity and theme. Each opens as one continuous page: the Sanskrit alone for recitation, or with the word-by-word meaning and the translation. Every stotra is also a book in the library.")) + '</p>' +
        '<div class="vg-stats">' +
          '<div class="is-lib"><i class="vg-si vg-si-3" aria-hidden="true">&#128215;</i><p><b id="stCount">' + all.length + '</b><span>' + esc(tx("स्तोत्र", "Stotras")) + '</span></p></div>' +
          '<div><i class="vg-si vg-si-1" aria-hidden="true">&#128214;</i><p><b>' + nCats + '</b><span>' + esc(tx("वर्ग", "Categories")) + '</span></p></div>' +
        '</div></section>' +
      '<div class="vg-tools"><label class="vg-search"><span aria-hidden="true">&#128269;</span>' +
        '<input type="search" id="stSearch" autocomplete="off" placeholder="' + esc(tx("स्तोत्र या रचयिता खोजें…", "Search a stotra or author…")) + '" value="' + esc(hub.q) + '"></label></div>' +
      '<div class="vg-label"><span>' + esc(tx("वर्ग के अनुसार देखें", "Browse by category")) + '</span></div>' +
      '<div class="vg-chips" id="stChips">' + chipsHtml(ctx) + '</div>' +
      '<div id="stSections">' + sectionsHtml(ctx) + '</div>' +
      collectionsHtml(ctx) +
    '</div>';
  }

  function mountHub(ctx) {
    var chips = document.getElementById("stChips"), sec = document.getElementById("stSections"), input = document.getElementById("stSearch");
    if (!chips || !sec || !input) return;
    var timer = null;
    function redraw() { chips.innerHTML = chipsHtml(ctx); sec.innerHTML = sectionsHtml(ctx); }
    chips.addEventListener("click", function (e) {
      var c = e.target.closest("[data-st-cat]");
      if (!c) return;
      hub.cat = c.getAttribute("data-st-cat"); redraw();
    });
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { hub.q = input.value; redraw(); }, 120); });
  }

  /* ------------------------------------------------------------------ the viewer */
  function mode() { return lsGet(LS_MODE) === "pat" ? "pat" : "read"; }
  function lhVal() { var n = parseFloat(lsGet(LS_LH)); return n >= 0.9 && n <= 1.6 ? n : 1; }
  function sizeIdx() { var n = parseInt(lsGet(LS_SIZE), 10); return n >= 0 && n < SIZES.length ? n : 1; }

  function viewerHtml(ctx) {
    var tx = ctx.tx, esc = ctx.esc, b = ctx.book;
    var m = mode();
    return '<main class="content-pad st-viewer st-mode-' + m + '" id="stViewer" style="--st-fz:' + SIZES[sizeIdx()] + ';--st-lh:' + lhVal() + '">' +
      '<div class="st-bar">' +
        '<a class="st-back st-ibtn" href="/stotras" title="' + esc(tx("सभी स्तोत्र", "All stotras")) + '" aria-label="' + esc(tx("सभी स्तोत्र", "All stotras")) + '">&larr;</a>' +
        '<b class="st-bar-title">' + esc(b.title) + '</b>' +
        '<button type="button" class="st-ibtn" id="stListenBtn" hidden aria-pressed="true" title="' + esc(tx("ऑडियो प्लेयर", "Audio player")) + '" aria-label="' + esc(tx("ऑडियो प्लेयर", "Audio player")) + '">&#127911;</button>' +
        '<button type="button" class="st-ibtn" id="stFindBtn" aria-pressed="false" title="' + esc(tx("स्तोत्र में खोजें", "Search in this stotra")) + '" aria-label="' + esc(tx("स्तोत्र में खोजें", "Search in this stotra")) + '">&#128269;</button>' +
        '<button type="button" class="st-ibtn' + (ctx.isFav && ctx.isFav(b) ? ' is-on' : '') + '" id="stFavBtn" aria-pressed="' + !!(ctx.isFav && ctx.isFav(b)) + '" title="' + esc(tx("पसंदीदा", "Favourite")) + '" aria-label="' + esc(tx("पसंदीदा", "Favourite")) + '">' + (ctx.isFav && ctx.isFav(b) ? '&#9733;' : '&#9734;') + '</button>' +
        '<button type="button" class="st-ibtn" id="stSetBtn" aria-expanded="false" aria-controls="stSettings" title="' + esc(tx("सेटिंग्स", "Settings")) + '" aria-label="' + esc(tx("सेटिंग्स", "Settings")) + '">Aa</button>' +
        '<div class="st-settings" id="stSettings" hidden>' +
          '<div class="st-set-row"><span>' + esc(tx("पाठ-विधि", "View")) + '</span><div class="st-set-modes">' +
            '<button type="button" data-st-mode="pat" aria-pressed="' + (m === "pat") + '">' + esc(tx("पाठ", "Recite")) + '<small>' + esc(tx("केवल संस्कृत", "Sanskrit only")) + '</small></button>' +
            '<button type="button" data-st-mode="read" aria-pressed="' + (m === "read") + '">' + esc(tx("अर्थ सहित", "With meaning")) + '<small>' + esc(tx("पदार्थ व भावार्थ", "Word meanings")) + '</small></button></div></div>' +
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
        '<a class="st-btn" href="/stotras">' + esc(tx("सभी स्तोत्र", "All stotras")) + '</a></nav>' +
    '</main>';
  }

  function docHtml(ctx, st) {
    var tx = ctx.tx, esc = ctx.esc, d = F.digits;
    var h = '';
    if (st.invocation) h += '<p class="st-inv">' + esc(st.invocation) + '</p>';
    h += '<h1 class="st-title">' + esc(st.title) + '</h1>';
    if (st.subtitle) h += '<p class="st-sub st-readonly">' + esc(st.subtitle) + '</p>';
    (st.intro || []).forEach(function (s) {
      h += '<section class="st-intro st-readonly">' + (s.title ? '<h2>' + esc(s.title) + '</h2>' : '') +
        String(s.text || "").split(/\n/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join("") + '</section>';
    });
    st.verses.forEach(function (v, i) {
      h += '<section class="st-verse" id="stv' + (i + 1) + '">' +
        (v.label ? '<h2 class="st-vlabel">' + esc(v.label) + '</h2>' : '') +
        '<p class="st-sloka">' + v.lines.map(esc).join("<br>") + '</p>';
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
    el.innerHTML = '<button type="button" class="st-pl-play" data-pl="play" aria-label="' + esc(tx("चलाएँ", "Play")) + '">&#9654;</button>' +
      '<span class="st-pl-t" id="stPlT">0:00</span>' +
      '<input type="range" class="st-pl-seek" id="stPlSeek" min="0" max="1000" value="0" aria-label="' + esc(tx("आगे-पीछे", "Seek")) + '">' +
      '<span class="st-pl-t" id="stPlD">0:00</span>' +
      '<button type="button" class="st-pl-btn" data-pl="speed" aria-label="' + esc(tx("गति", "Speed")) + '">1&times;</button>' +
      '<button type="button" class="st-pl-btn" data-pl="loop" aria-pressed="false" aria-label="' + esc(tx("बार-बार दोहराएँ", "Repeat")) + '" title="' + esc(tx("दोहराएँ", "Repeat")) + '">&#128257;</button>';
    root.appendChild(el);
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
    }
    function paint() {
      var on = !audio.paused;
      playBtn.innerHTML = on ? "&#10074;&#10074;" : "&#9654;";
      playBtn.setAttribute("aria-label", on ? tx("रोकें", "Pause") : tx("चलाएँ", "Play"));
      el.classList.toggle("is-playing", on);
    }
    ["loadedmetadata", "durationchange"].forEach(function (ev) { audio.addEventListener(ev, sync); });
    audio.addEventListener("timeupdate", function () {
      if (!document.getElementById("stPlayer")) { stopPlayer(); return; }   // the page was left: the recording stops with it
      sync();
    });
    ["play", "pause", "ended"].forEach(function (ev) { audio.addEventListener(ev, paint); });
    audio.addEventListener("error", function () { el.classList.add("is-bad"); tNow.textContent = tx("ऑडियो उपलब्ध नहीं", "Audio unavailable"); });

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
      } else if (k === "speed") {
        si = (si + 1) % speeds.length; audio.playbackRate = speeds[si];
        b.innerHTML = String(speeds[si]).replace(/^0\./, ".") + "&times;";
      } else if (k === "loop") {
        audio.loop = !audio.loop; b.setAttribute("aria-pressed", audio.loop ? "true" : "false");
      }
    });
    seek.addEventListener("input", function () { dragging = true; var d = audio.duration; if (isFinite(d)) { audio.currentTime = seek.value / 1000 * d; tNow.textContent = fmtTime(audio.currentTime); } });
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
      root.addEventListener("click", function (e) { if (e.target.closest("[data-st-mode]") && fInp.value.trim()) setTimeout(function () { runFind(fInp.value); }, 0); });
    }

    root.addEventListener("click", function (e) {
      var mb = e.target.closest("[data-st-mode]");
      if (mb) {
        var m = mb.getAttribute("data-st-mode");
        lsSet(LS_MODE, m);
        root.classList.toggle("st-mode-pat", m === "pat"); root.classList.toggle("st-mode-read", m === "read");
        [].forEach.call(root.querySelectorAll("[data-st-mode]"), function (x) { x.setAttribute("aria-pressed", x === mb ? "true" : "false"); });
        return;
      }
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
      doc.innerHTML = docHtml(ctx, st);
      mountPlayer(ctx, root, st);
      var want = parseInt(new URLSearchParams(location.search).get("v"), 10);
      if (want > 0) { var el = document.getElementById("stv" + want); if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 50); }
    }).catch(function () {
      doc.innerHTML = '<div class="st-empty">' + esc(tx("स्तोत्र लोड नहीं हो सका। कृपया पुनः प्रयास करें।", "The stotra could not be loaded. Please try again.")) + '</div>';
    });
  }

  window.SwadhyayStotra = { applyCategories: applyCategories, hubHtml: hubHtml, mountHub: mountHub, viewerHtml: viewerHtml, mountViewer: mountViewer, catMeta: catMeta };
})();

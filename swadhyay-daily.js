/* The three "daily" cards on the home page, above the categories:

     1. दैनिक गीता अध्ययन   -- drawn by swadhyay-gita.js: the Gita LMS (20 minutes a day, 2 shlokas, revision, progress)
     2. श्रीरामचरितमानस पाठ-संकल्प -- drawn by swadhyay-sankalp.js: choose मासिक / नवाह्न / अखण्ड, or, once a
                               संकल्प is taken, today's portion, progress and the next reminder
     3. नित्य भगवत् संकीर्तन -- today's bhajan from the audio library, with one tap to play

   The text comes from small static files made by tools/build_daily_data.py (assets/data/v1/...), so the cards
   cost the home page a few KB and never wait on a server function. "Open in the reader" uses
   window.__swadhyayApp.openBookAt (swadhyay-app.js); the bhajan card uses window.SwadhyayAudio.

   The Gita LMS (swadhyay-gita.js) and the पाठ-संकल्प (swadhyay-sankalp.js) save their own progress.

   Public API: window.SwadhyayDaily.homeHtml(), .mount({ tx, toast })                                    */
(function () {
  "use strict";

  var DATA = "/assets/data/v1/";
  var GITA_FILE = "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html";
  var MANAS_FILE = "श्रीरामचरितमानस.html";
  var IMG = "/assets/images/daily/";
  var LS = "swadhyay_daily_v1";
  var DEV = "०१२३४५६७८९";

  var helpers = { tx: null, toast: null };
  function T(hi, en) { return helpers.tx ? helpers.tx(hi, en) : hi; }
  function isEn() { return T("hi", "en") === "en"; }
  function toast(m) { if (helpers.toast) helpers.toast(m); }
  function dev(n) { return isEn() ? String(n) : String(n).replace(/\d/g, function (d) { return DEV.charAt(+d); }); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function app() { return window.__swadhyayApp || null; }

  /* ---------------- dates ---------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dayKey(new Date()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
  function dayNumber(key) { var p = key.split("-"); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function daysSince(key) { return dayNumber(today()) - dayNumber(key); }

  /* ---------------- saved state ---------------- */
  function blank() {
    return {
      gita: { pos: 0, learned: 0, shown: null, last: "", streak: { last: "", count: 0, best: 0 } }
    };
  }
  var state = (function () {
    var s = blank();
    try {
      var v = JSON.parse(localStorage.getItem(LS));
      if (v && typeof v === "object") {
        if (v.gita) { s.gita.pos = +v.gita.pos || 0; s.gita.learned = +v.gita.learned || 0; s.gita.shown = v.gita.shown || null; s.gita.last = v.gita.last || ""; if (v.gita.streak) s.gita.streak = { last: v.gita.streak.last || "", count: +v.gita.streak.count || 0, best: +v.gita.streak.best || 0 }; }
      }
    } catch (e) {}
    return s;
  })();
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }

  /* ---------------- data ---------------- */
  var cache = {};
  function getJSON(name) {
    if (!cache[name]) cache[name] = fetch(DATA + name).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); });
    cache[name].catch(function () { delete cache[name]; });
    return cache[name];
  }

  /* ---------------- view state (not saved) ---------------- */
  var V = { gita: "shloka" };           // which panel each card is showing
  var root = null;

  /* ---------------- card shell ---------------- */
  var ICON = { lamp: "🪔", book: "📖", bulb: "💡", check: "✅", chart: "📊", pen: "✍️", home: "🏠", music: "🎵", mic: "🎙️", pray: "🙏", heart: "❤️" };
  function actions(list) {
    return '<nav class="dd-actions">' + list.map(function (a) {
      return '<button type="button" class="dd-act' + (a.on ? " is-on" : "") + '" data-dd="' + a.k + '"' + (a.arg != null ? ' data-arg="' + esc(a.arg) + '"' : '') + '><span class="dd-act-ic" aria-hidden="true">' + a.ic + '</span><span>' + esc(a.l) + '</span></button>';
    }).join("") + '</nav>';
  }
  function shell(o) {
    return '<header class="dd-head"><h3>' + esc(o.title) + '</h3><p>' + esc(o.sub).replace(/\n/g, "<br>") + '</p></header>' +
      (o.pills || "") +
      '<div class="dd-badge"><span class="dd-badge-ic" aria-hidden="true">' + (o.badgeIc || ICON.lamp) + '</span><div><b>' + esc(o.badgeT) + '</b><span>' + esc(o.badgeS || "") + '</span></div></div>' +
      '<div class="dd-text' + (o.cls ? " " + o.cls : "") + '">' + o.body + '</div>' +
      '<button type="button" class="dd-cta" data-dd="' + o.ctaK + '"' + (o.arg ? ' data-arg="' + esc(o.arg) + '"' : '') + '>' + esc(o.cta) + ' <i aria-hidden="true">→</i></button>' +
      actions(o.acts);
  }
  function lines(arr) { return arr.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join(""); }
  function fit(arr) { var n = arr.join("").length; return n > 150 ? "is-long" : n > 100 ? "is-mid" : ""; }
  function loading(key) { var el = card(key); if (el) el.classList.add("is-loading"); }
  function ready(key) { var el = card(key); if (el) el.classList.remove("is-loading"); }
  function card(key) { return root ? root.querySelector('[data-card="' + key + '"]') : null; }
  function put(key, html) { var el = card(key); if (el) { el.innerHTML = html; el.classList.remove("is-loading"); } }
  function failed(key, title, sub, link, linkText) {
    put(key, '<header class="dd-head"><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></header><div class="dd-text dd-fail"><p>' +
      esc(T("अभी यह सामग्री लोड नहीं हो सकी।", "This could not be loaded just now.")) + '</p></div>' +
      '<button type="button" class="dd-cta" data-dd="go" data-arg="' + esc(link) + '">' + esc(linkText) + ' <i aria-hidden="true">→</i></button>');
  }

  /* ================================================================== 1. Gita -- the गीता LMS card */
  // The card (an invitation before joining; today's lesson, streak and progress after) is drawn by
  // swadhyay-gita.js, which also owns the /gita page (the Gita LMS).
  function renderGita() {
    var el = card("gita");
    if (!el) return;
    var G = window.SwadhyayGita;
    if (G) { G.mountCard(el, helpers); return; }
    failed("gita", T("दैनिक गीता अध्ययन", "Daily Gita Study"), T("प्रतिदिन एक श्लोक, जीवन के लिए एक सीख", "One shloka a day, one lesson for life"), "/library", T("गीता पुस्तकें देखें", "Browse Gita books"));
  }

  /* ================================================================== 2. Manas -- the पाठ-संकल्प card */
  // The card (before a संकल्प: the three paths; after: today's portion, progress, next reminder) is drawn by
  // swadhyay-sankalp.js, which also owns the /sankalp page.
  function renderManas() {
    var el = card("manas");
    if (!el) return;
    var S = window.SwadhyaySankalp;
    if (S) { S.mountCard(el, helpers); return; }
    failed("manas", T("श्रीरामचरितमानस पाठ-संकल्प", "Ramcharitmanas Path Sankalp"), T("मानस पढ़ें, मन को राममय बनाएँ", "Read the Manas, fill the mind with Ram"), app() ? app().bookPath(MANAS_FILE) : "/library", T("मानस खोलें", "Open the Manas"));
  }

  /* ================================================================== 3. Bhajan */
  function hashDay() {
    var s = today(), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function todaysTrack() {
    var A = window.SwadhyayAudio;
    if (!A || !A.tracks) return null;
    var list = A.tracks("bhajan");
    if (!list.length) list = A.tracks();
    return list.length ? list[hashDay() % list.length] : null;
  }
  function mmss(sec) { sec = Math.max(0, Math.round(sec || 0)); return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }
  function renderBhajan() {
    var t = todaysTrack(), A = window.SwadhyayAudio;
    var catActs = [
      { k: "audio-cat", arg: "bhajan", ic: ICON.lamp, l: T("भजन", "Bhajan") },
      { k: "audio-cat", arg: "satsang", ic: ICON.pray, l: T("सत्संग", "Satsang") },
      { k: "audio-cat", arg: "pravachan", ic: ICON.mic, l: T("प्रवचन", "Pravachan") },
      { k: "audio-cat", arg: "bhajan", ic: ICON.heart, l: T("मेरी सूची", "My list") }
    ];
    var body, ctaK = "audio-open", cta = T("आज का भजन सुनें", "Listen to today's bhajan");
    if (t) {
      var playing = A.isPlaying(t.id);
      body = '<div class="dd-track"><span class="dd-track-ic" aria-hidden="true">🎵</span><div class="dd-track-tx"><small>' + esc(T("आज का भजन", "Today's bhajan")) + '</small><b>' + esc(t.title) + '</b><span>' + esc(t.artist || "") + '</span></div>' +
        '<button type="button" class="dd-play' + (playing ? " is-playing" : "") + '" data-dd="audio-play" aria-label="' + esc(playing ? T("रोकें", "Pause") : T("चलाएँ", "Play")) + '">' + (playing ? "❚❚" : "▶") + '</button>' +
        '<span class="dd-dur">' + mmss(t.duration) + '</span></div>';
    } else {
      body = '<p class="dd-meaning">' + esc(T("भजन-संग्रह शीघ्र ही जुड़ेगा।", "The bhajan collection is coming soon.")) + '</p>';
      ctaK = "audio-cat"; cta = T("ऑडियो खोलें", "Open audio");
    }
    put("bhajan", shell({
      title: T("नित्य भगवत् संकीर्तन", "Daily Sankirtan"), sub: T("भक्ति रस में डूबें,\nमन को शुद्ध और प्रसन्न बनाएँ", "Dive into devotion;\nmake the mind pure and glad"),
      badgeT: T("आज का भजन", "Today's bhajan"), badgeS: T("संकीर्तन", "Sankirtan"), badgeIc: ICON.lamp,
      body: body, cls: "is-track", cta: cta, ctaK: ctaK, acts: catActs
    }));
  }

  /* ---------------- events ---------------- */
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-dd]") : null;
    if (!b || !root || !root.contains(b)) return;
    var k = b.getAttribute("data-dd"), arg = b.getAttribute("data-arg"), a = app();
    var cardEl = b.closest("[data-card]");
    if (k === "audio-play" || k === "audio-open") { var t = todaysTrack(); if (t && window.SwadhyayAudio) window.SwadhyayAudio.play(t.id); }
    else if (k === "audio-cat") { if (window.SwadhyayAudio && arg) window.SwadhyayAudio.setCategory(arg); if (a) a.navigate("/audio"); }
    else if (k === "go") { if (a) a.navigate(arg); }
  }
  document.addEventListener("swadhyay-audio-state", function () { if (root && root.isConnected && card("bhajan")) renderBhajan(); });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("dd-shloka")) { e.preventDefault(); e.target.click(); }
  });

  /* ---------------- public ---------------- */
  function skeleton(key, cls, img) {
    return '<article class="dd-card ' + cls + ' is-loading" data-card="' + key + '" style="--dd-bg:url(' + IMG + img + ')"></article>';
  }
  window.SwadhyayDaily = {
    homeHtml: function () {
      return '<section class="dd-trio" data-daily aria-label="' + esc(T("आज के पाठ और संकीर्तन", "Today's readings and sankirtan")) + '">' +
        '<article class="gl-card is-loading" data-card="gita"></article>' + skeleton("manas", "dd-manas", "manas.webp") + skeleton("bhajan", "dd-bhajan", "bhajan.webp") + '</section>';
    },
    mount: function (h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      root = document.querySelector("[data-daily]");
      if (!root) return;
      root.addEventListener("click", onClick);
      renderBhajan();       // local data -- instant
      renderGita();
      renderManas();
    }
  };
})();

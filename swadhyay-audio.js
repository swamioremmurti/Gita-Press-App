/* Swadhyay audio: catalogue lists, favourites and one site-wide player.

   One <audio> element lives for the whole session, so a track keeps playing while the reader
   moves between pages (a mini-player "dock" follows them). Everything that shows audio state --
   the home panel, the /audio page, the dock and the full-screen sheet -- is rendered from the
   same state object and re-rendered together, so they never disagree.

   Persisted in localStorage (all optional, wrapped in try/catch):
     swadhyay_audio_fav_v1   ["track-id", ...]       favourite tracks
     swadhyay_audio_pos_v1   {"track-id": seconds}   where each track was left
     swadhyay_audio_rate_v1  1.25                    playback speed

   Public API (window.SwadhyayAudio): mount(helpers), homePanelHtml(), pageHtml(). */
(function () {
  "use strict";

  var CATS = window.SWADHYAY_AUDIO_CATEGORIES || [];
  var TRACKS = (window.SWADHYAY_AUDIO_RAW || []).slice();
  var CAT_BY_KEY = {}, BY_ID = {};
  CATS.forEach(function (c) { CAT_BY_KEY[c.key] = c; });
  TRACKS.forEach(function (t) { BY_ID[t.id] = t; });

  var LS_FAV = "swadhyay_audio_fav_v1", LS_POS = "swadhyay_audio_pos_v1", LS_RATE = "swadhyay_audio_rate_v1";
  var RATES = [0.75, 1, 1.25, 1.5, 2];

  var helpers = { tx: null, toast: null };
  function T(hi, en) { return helpers.tx ? helpers.tx(hi, en) : hi; }
  function toast(msg) { if (helpers.toast) helpers.toast(msg); }

  /* ---------------- tiny helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  var DEV = "०१२३४५६७८९";
  function dev(s) { return String(s).replace(/\d/g, function (d) { return DEV.charAt(+d); }); }
  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = h ? (m < 10 ? "0" + m : m) : m;
    return (h ? h + ":" : "") + mm + ":" + (s < 10 ? "0" + s : s);
  }

  /* ---------------- state ---------------- */
  var favs = readJSON(LS_FAV, []);
  var positions = readJSON(LS_POS, {});
  var S = {
    cur: null,          // the loaded track (null until the first play)
    queue: [],          // ids, in the order of the category it was started from
    cat: firstCategoryWithTracks(),
    rate: +readJSON(LS_RATE, 1) || 1,
    sheetOpen: false,
    realDur: {}         // id -> real duration once the file reports it
  };
  function firstCategoryWithTracks() {
    for (var i = 0; i < CATS.length; i++) if (tracksIn(CATS[i].key).length) return CATS[i].key;
    return CATS.length ? CATS[0].key : "";
  }
  function tracksIn(cat) { return TRACKS.filter(function (t) { return t.category === cat; }); }
  function isFav(id) { return favs.indexOf(id) !== -1; }
  function durOf(t) { return S.realDur[t.id] || t.duration || 0; }

  var audio = new Audio();
  audio.preload = "none";
  audio.playbackRate = S.rate;
  var pendingSeek = 0;

  function savePositions() {
    if (S.cur && audio.currentTime > 1) positions[S.cur.id] = Math.floor(audio.currentTime);
    writeJSON(LS_POS, positions);
  }

  /* ---------------- playback ---------------- */
  function load(t) {
    savePositions();
    S.cur = t;
    S.queue = tracksIn(t.category).map(function (x) { return x.id; });
    pendingSeek = positions[t.id] || 0;
    audio.src = t.src;
    audio.playbackRate = S.rate;
    setMediaSession(t);
  }
  function playTrack(id) {
    var t = BY_ID[id];
    if (!t) return;
    if (S.cur && S.cur.id === id) { toggle(); return; }
    load(t);
    audio.play().catch(onError);
    refresh();
  }
  function toggle() {
    if (!S.cur) {
      var first = tracksIn(S.cat)[0];
      if (first) playTrack(first.id);
      return;
    }
    if (audio.paused) audio.play().catch(onError); else audio.pause();
  }
  function step(dir) {
    if (!S.cur) { toggle(); return; }
    if (dir < 0 && audio.currentTime > 3) { audio.currentTime = 0; return; }
    var i = S.queue.indexOf(S.cur.id) + dir;
    if (i < 0 || i >= S.queue.length) { if (dir > 0) { audio.pause(); audio.currentTime = 0; } return; }
    playTrack(S.queue[i]);
  }
  function skip(sec) {
    if (!S.cur) return;
    var d = audio.duration || durOf(S.cur) || 0;
    audio.currentTime = Math.max(0, Math.min(d || 1e9, audio.currentTime + sec));
  }
  function cycleRate() {
    var i = RATES.indexOf(S.rate);
    S.rate = RATES[(i + 1) % RATES.length];
    audio.playbackRate = S.rate;
    writeJSON(LS_RATE, S.rate);
    refresh();
  }
  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    writeJSON(LS_FAV, favs);
    refresh();
  }
  function stopAll() {
    savePositions();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    S.cur = null;
    S.sheetOpen = false;
    refresh();
  }
  function onError() {
    toast(T("यह ट्रैक चलाया नहीं जा सका", "This track could not be played"));
    refresh();
  }

  audio.addEventListener("loadedmetadata", function () {
    if (S.cur && isFinite(audio.duration)) S.realDur[S.cur.id] = audio.duration;
    if (pendingSeek > 5 && audio.duration && pendingSeek < audio.duration - 5) audio.currentTime = pendingSeek;
    pendingSeek = 0;
    updateProgress();
  });
  audio.addEventListener("timeupdate", function () { updateProgress(); });
  audio.addEventListener("play", refresh);
  audio.addEventListener("pause", function () { savePositions(); refresh(); });
  audio.addEventListener("ended", function () {
    if (S.cur) delete positions[S.cur.id];
    var i = S.cur ? S.queue.indexOf(S.cur.id) : -1;
    if (i !== -1 && i + 1 < S.queue.length) playTrack(S.queue[i + 1]); else refresh();
  });
  audio.addEventListener("error", function () { if (S.cur) onError(); });
  window.addEventListener("pagehide", savePositions);

  function setMediaSession(t) {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist || "स्वाध्याय", album: (CAT_BY_KEY[t.category] || {}).hi || ""
      });
      navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
      navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
      navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1); });
      navigator.mediaSession.setActionHandler("nexttrack", function () { step(1); });
      navigator.mediaSession.setActionHandler("seekbackward", function () { skip(-15); });
      navigator.mediaSession.setActionHandler("seekforward", function () { skip(15); });
    } catch (e) {}
  }

  /* ---------------- markup ---------------- */
  var I = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.52.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5.6v12.8a.8.8 0 0 1-1.25.66L9.5 12.66a.8.8 0 0 1 0-1.32l9.25-6.4A.8.8 0 0 1 20 5.6z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5.6v12.8a.8.8 0 0 0 1.25.66l9.25-6.4a.8.8 0 0 0 0-1.32L5.25 4.94A.8.8 0 0 0 4 5.6z" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="currentColor"/><text x="12" y="16.2" text-anchor="middle" font-size="6.6" font-weight="700" fill="currentColor" font-family="sans-serif">15</text></svg>',
    fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" fill="currentColor"/><text x="12" y="16.2" text-anchor="middle" font-size="6.6" font-weight="700" fill="currentColor" font-family="sans-serif">15</text></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4l-1.3-1.18C6 15.05 3 12.3 3 8.95A4.45 4.45 0 0 1 7.5 4.5c1.5 0 2.95.7 3.9 1.8l.6.7.6-.7a5.1 5.1 0 0 1 3.9-1.8A4.45 4.45 0 0 1 21 8.95c0 3.35-3 6.1-7.7 10.27L12 20.4z" fill="currentColor"/></svg>',
    heartLine: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4l-1.3-1.18C6 15.05 3 12.3 3 8.95A4.45 4.45 0 0 1 7.5 4.5c1.5 0 2.95.7 3.9 1.8l.6.7.6-.7a5.1 5.1 0 0 1 3.9-1.8A4.45 4.45 0 0 1 21 8.95c0 3.35-3 6.1-7.7 10.27L12 20.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M15.2 8.8a4.6 4.6 0 0 1 0 6.4M17.6 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  function playing() { return !!S.cur && !audio.paused && !audio.ended; }
  function catOf(t) { return CAT_BY_KEY[t.category] || { icon: "♪", g: ["#a51512", "#7a0f0d"], hi: "", en: "" }; }
  function artStyle(t) { var g = catOf(t).g; return "--g1:" + g[0] + ";--g2:" + g[1]; }
  function eq() { return '<span class="ap-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'; }
  function artHtml(t, cls) {
    return '<span class="ap-art ' + (cls || "") + '" style="' + artStyle(t) + '"><span class="ap-art-glyph">' + catOf(t).icon + '</span>' + eq() + '</span>';
  }
  function btn(action, icon, label, extra) {
    return '<button type="button" class="ap-btn ' + (extra || "") + '" data-ap="' + action + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + icon + '</button>';
  }

  function deckHtml(big) {
    var t = S.cur || tracksIn(S.cat)[0] || null;
    if (!t) {
      return '<div class="ap-deck ap-deck-empty"><div class="ap-deck-hint">' + esc(T("सुनने के लिए कोई ट्रैक चुनें", "Choose a track to listen")) + '</div></div>';
    }
    var on = playing(), loaded = !!S.cur;
    var d = (loaded && isFinite(audio.duration) && audio.duration) || durOf(t);
    var cur = loaded ? audio.currentTime : 0;
    return '<div class="ap-deck' + (on ? " is-playing" : "") + (big ? " ap-deck-big" : "") + '" style="' + artStyle(t) + '">' +
      '<div class="ap-deck-top">' + artHtml(t, "ap-art-lg") +
      '<div class="ap-meta"><div class="ap-kicker">' + esc(T(catOf(t).hi, catOf(t).en)) + (on ? " · " + esc(T("अभी चल रहा है", "Now playing")) : "") + '</div>' +
      '<div class="ap-title">' + esc(t.title) + '</div>' +
      '<div class="ap-artist">' + esc(t.artist || "स्वाध्याय") + '</div></div>' +
      btn("fav", isFav(t.id) ? I.heart : I.heartLine, T("पसंदीदा", "Favourite"), "ap-fav-btn" + (isFav(t.id) ? " is-on" : "")).replace('data-ap="fav"', 'data-ap="fav" data-id="' + esc(t.id) + '"') +
      '</div>' +
      '<div class="ap-seekrow"><span class="ap-t ap-cur">' + fmt(cur) + '</span>' +
      '<input type="range" class="ap-seek" min="0" max="1000" step="1" value="' + (d ? Math.round(cur / d * 1000) : 0) + '" style="--p:' + (d ? (cur / d * 100).toFixed(2) : 0) + '%" aria-label="' + esc(T("प्रगति", "Seek")) + '">' +
      '<span class="ap-t ap-dur">' + (d ? fmt(d) : "--:--") + '</span></div>' +
      '<div class="ap-ctrls">' +
      btn("rate", '<span class="ap-rate">' + (S.rate === 1 ? "1×" : S.rate + "×") + '</span>', T("गति", "Speed"), "ap-btn-sm") +
      btn("prev", I.prev, T("पिछला", "Previous")) + btn("back", I.back, "-15s") +
      btn("toggle", on ? I.pause : I.play, on ? T("रोकें", "Pause") : T("चलाएँ", "Play"), "ap-btn-main") +
      btn("fwd", I.fwd, "+15s") + btn("next", I.next, T("अगला", "Next")) +
      (big ? '<label class="ap-volrow" title="' + esc(T("आवाज़", "Volume")) + '">' + I.vol + '<input type="range" class="ap-vol" min="0" max="100" value="' + Math.round(audio.volume * 100) + '"></label>' : '<span class="ap-ctrl-spacer"></span>') +
      '</div></div>';
  }

  function rowHtml(t) {
    var cur = S.cur && S.cur.id === t.id, on = cur && playing();
    var d = durOf(t);
    return '<div class="ap-row' + (cur ? " is-current" : "") + (on ? " is-playing" : "") + '" data-ap="play" data-id="' + esc(t.id) + '" role="button" tabindex="0">' +
      artHtml(t, "ap-art-sm") +
      '<span class="ap-row-info"><span class="ap-row-title">' + esc(t.title) + '</span>' +
      '<span class="ap-row-sub">' + esc(t.artist || "स्वाध्याय") + (d ? " · " + fmt(d) : "") + '</span></span>' +
      '<button type="button" class="ap-heart' + (isFav(t.id) ? " is-on" : "") + '" data-ap="fav" data-id="' + esc(t.id) + '" aria-label="' + esc(T("पसंदीदा", "Favourite")) + '" aria-pressed="' + (isFav(t.id) ? "true" : "false") + '">' + (isFav(t.id) ? I.heart : I.heartLine) + '</button>' +
      '</div>';
  }

  function tabsHtml() {
    return '<div class="ap-tabs" role="tablist">' + CATS.map(function (c) {
      var n = tracksIn(c.key).length;
      return '<button type="button" role="tab" class="ap-tab' + (S.cat === c.key ? " is-active" : "") + (n ? "" : " is-empty") + '" data-ap="cat" data-cat="' + c.key + '" aria-selected="' + (S.cat === c.key) + '">' +
        '<span class="ap-tab-ic">' + c.icon + '</span><span>' + esc(T(c.hi, c.en)) + '</span>' +
        '<small>' + (n ? dev(n) : "·") + '</small></button>';
    }).join("") + '</div>';
  }

  function listHtml() {
    var all = tracksIn(S.cat);
    var cat = CAT_BY_KEY[S.cat] || { hi: "", en: "" };
    if (!all.length) {
      return '<div class="ap-empty"><span class="ap-empty-ic">' + (cat.icon || "♪") + '</span><strong>' + esc(T(cat.hi, cat.en)) + '</strong>' +
        '<span>' + esc(T("इस श्रेणी के ऑडियो शीघ्र ही जोड़े जाएँगे।", "Audio for this category will be added soon.")) + '</span></div>';
    }
    var fav = all.filter(function (t) { return isFav(t.id); });
    var html = "";
    if (fav.length) html += '<div class="ap-list-head"><span class="ap-heart-ic">' + I.heart + '</span>' + esc(T("पसंदीदा", "Favourites")) + '</div>' + fav.map(rowHtml).join("");
    html += '<div class="ap-list-head">' + esc(T("सभी " + cat.hi, "All " + cat.en)) + ' <span class="ap-count">' + dev(all.length) + '</span></div>' + all.map(rowHtml).join("");
    return html;
  }

  function panelHtml(mode) {
    var home = mode === "home";
    return '<div class="ap-head"><div><h2 class="ap-h">' + esc(T("ऑडियो", "Audio")) + '</h2>' +
      '<p class="ap-sub">' + esc(T("भजन · सत्संग · प्रवचन · कथा · ऑडियो बुक", "Bhajan · Satsang · Pravachan · Katha · Audio Books")) + '</p></div>' +
      (home ? '<a class="view-all" href="/audio">' + esc(T("सभी देखें", "View All")) + ' →</a>' : '') + '</div>' +
      '<div class="ap-body">' +
      '<div class="ap-deck-wrap" data-ap-deck>' + deckHtml(false) + '</div>' +
      '<div class="ap-lists">' + tabsHtml() + '<div class="ap-list" data-ap-list>' + listHtml() + '</div></div>' +
      '</div>';
  }

  function dockHtml() {
    var t = S.cur;
    if (!t) return "";
    var on = playing();
    return '<div class="ap-dock-bar"><i></i></div>' +
      '<button type="button" class="ap-dock-main" data-ap="sheet" aria-label="' + esc(T("प्लेयर खोलें", "Open player")) + '">' + artHtml(t, "ap-art-sm") +
      '<span class="ap-dock-info"><span class="ap-dock-title">' + esc(t.title) + '</span><span class="ap-dock-sub">' + esc(t.artist || "स्वाध्याय") + '</span></span></button>' +
      btn("prev", I.prev, T("पिछला", "Previous"), "ap-dock-hide-sm") +
      btn("toggle", on ? I.pause : I.play, on ? T("रोकें", "Pause") : T("चलाएँ", "Play"), "ap-btn-main ap-btn-dock") +
      btn("next", I.next, T("अगला", "Next"), "ap-dock-hide-sm") +
      btn("stop", I.close, T("बंद करें", "Close"), "ap-dock-x");
  }

  function sheetHtml() {
    return '<div class="ap-sheet-scrim" data-ap="sheet-close"></div><div class="ap-sheet-card">' +
      btn("sheet-close", I.chevron, T("छोटा करें", "Minimise"), "ap-sheet-x") +
      '<div class="ap-sheet-deck" data-ap-deck>' + deckHtml(true) + '</div></div>';
  }

  /* ---------------- DOM wiring ---------------- */
  var dock = null, sheet = null;
  function ensureShell() {
    if (dock) return;
    dock = document.createElement("div");
    dock.id = "audioDock";
    dock.className = "audio-dock";
    dock.hidden = true;
    sheet = document.createElement("div");
    sheet.id = "audioSheet";
    sheet.className = "audio-sheet";
    sheet.hidden = true;
    document.body.appendChild(dock);
    document.body.appendChild(sheet);
  }

  function renderMount(el) {
    var list = el.querySelector("[data-ap-list]");
    var keep = list ? list.scrollTop : 0;
    el.innerHTML = panelHtml(el.getAttribute("data-audio-mount"));
    var nl = el.querySelector("[data-ap-list]");
    if (nl) nl.scrollTop = keep;
  }

  function refresh() {
    ensureShell();
    Array.prototype.forEach.call(document.querySelectorAll("[data-audio-mount]"), renderMount);
    var has = !!S.cur;
    dock.hidden = !has;
    dock.innerHTML = has ? dockHtml() : "";
    dock.classList.toggle("is-playing", playing());
    document.body.classList.toggle("has-audio-dock", has);
    sheet.hidden = !(has && S.sheetOpen);
    if (!sheet.hidden) {
      var wrap = sheet.querySelector("[data-ap-deck]");
      if (wrap) wrap.innerHTML = deckHtml(true);
      else sheet.innerHTML = sheetHtml();
    } else sheet.innerHTML = "";
    document.body.classList.toggle("audio-sheet-open", !sheet.hidden);
    updateProgress();
  }

  function updateProgress() {
    if (!S.cur) return;
    var d = (isFinite(audio.duration) && audio.duration) || durOf(S.cur);
    var c = audio.currentTime || 0;
    var pct = d ? Math.min(100, c / d * 100) : 0;
    Array.prototype.forEach.call(document.querySelectorAll(".ap-deck.is-current-deck, .ap-deck"), function (deck) {
      var seek = deck.querySelector(".ap-seek");
      if (seek && !seek.__dragging) { seek.value = Math.round(pct * 10); seek.style.setProperty("--p", pct.toFixed(2) + "%"); }
      var a = deck.querySelector(".ap-cur"), b = deck.querySelector(".ap-dur");
      if (a && !(seek && seek.__dragging)) a.textContent = fmt(c);
      if (b && d) b.textContent = fmt(d);
    });
    if (dock) {
      var bar = dock.querySelector(".ap-dock-bar i");
      if (bar) bar.style.width = pct.toFixed(2) + "%";
    }
  }

  function onClick(e) {
    var el = e.target.closest ? e.target.closest("[data-ap]") : null;
    if (!el) return;
    var a = el.getAttribute("data-ap");
    if (a === "play") playTrack(el.getAttribute("data-id"));
    else if (a === "fav") { var id = el.getAttribute("data-id") || (S.cur && S.cur.id) || (tracksIn(S.cat)[0] || {}).id; if (id) toggleFav(id); }
    else if (a === "toggle") toggle();
    else if (a === "prev") step(-1);
    else if (a === "next") step(1);
    else if (a === "back") skip(-15);
    else if (a === "fwd") skip(15);
    else if (a === "rate") cycleRate();
    else if (a === "cat") { S.cat = el.getAttribute("data-cat"); refresh(); }
    else if (a === "sheet") { S.sheetOpen = true; refresh(); }
    else if (a === "sheet-close") { S.sheetOpen = false; refresh(); }
    else if (a === "stop") stopAll();
    else return;
    e.preventDefault();
  }

  function onInput(e) {
    var t = e.target;
    if (t.classList && t.classList.contains("ap-seek")) {
      t.__dragging = true;
      var d = (isFinite(audio.duration) && audio.duration) || (S.cur && durOf(S.cur)) || 0;
      t.style.setProperty("--p", (t.value / 10).toFixed(2) + "%");
      var cur = t.parentNode.querySelector(".ap-cur");
      if (cur) cur.textContent = fmt(d * t.value / 1000);
    } else if (t.classList && t.classList.contains("ap-vol")) {
      audio.volume = t.value / 100;
    }
  }
  function onChange(e) {
    var t = e.target;
    if (t.classList && t.classList.contains("ap-seek")) {
      t.__dragging = false;
      if (!S.cur) { toggle(); return; }
      var d = (isFinite(audio.duration) && audio.duration) || durOf(S.cur);
      if (d) audio.currentTime = d * t.value / 1000;
    }
  }
  function onKey(e) {
    if (e.key === "Escape" && S.sheetOpen) { S.sheetOpen = false; refresh(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("ap-row")) {
      e.preventDefault();
      playTrack(e.target.getAttribute("data-id"));
    }
  }

  var bound = false;
  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("keydown", onKey);
  }

  /* ---------------- public ---------------- */
  window.SwadhyayAudio = {
    /* Call after every page render: fills any audio panel on the page and keeps the dock in sync. */
    mount: function (h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      bind();
      document.body.classList.toggle("audio-page", !!document.querySelector('[data-audio-mount="page"]'));
      refresh();
    },
    homePanelHtml: function () {
      return '<aside class="home-audio"><section class="audio-panel" data-audio-mount="home" aria-label="' + esc(T("ऑडियो", "Audio")) + '"></section></aside>';
    },
    pageHtml: function () {
      return '<main class="content-pad audio-page-wrap"><section class="audio-panel audio-panel-page" data-audio-mount="page"></section></main>';
    },
    hasTracks: function () { return TRACKS.length > 0; }
  };
})();

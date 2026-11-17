/* गीता पाठ -- the Bhagavad Gita chapter by chapter, with a recording of every verse that plays LINE BY LINE.

   TEST PAGES (not linked from the menus yet):   /gita-pat-test            the 18 chapters
                                                 /gita-pat-test/<1-18>     one chapter

   Data  : assets/data/gita-pat/chNN.json   {"ch":1,"v":[{"n":1,"d":9.67,"p":[[line, from, to, clip?], ...]}]}
           from / to are seconds inside that verse's own recording -- or inside the clip named by the 4th item
           ("UV_sanjaya": the spoken उवाच line, which is shown as the first line of the verse that needs it)
   Audio : assets/audio/gita-pat/CC_VVV.mp3 (one file per verse), UV_arjuna|bhagavan|dhritarashtra|sanjaya.mp3 (the four उवाच clips)
   Text comes from the book पदच्छेद अन्वय और साधारण भाषाटीकासहित; all of it is made by tools/build_gita_pat.py.

   Playing: a click on a line plays that line only (from..to of its verse file); the ▶ on a verse plays the verse; "अध्याय सुनें"
   plays the chapter from the current line to its end. The switch "लगातार" makes a click on a line carry on to the end of the chapter.

   Public API: window.SwadhyayGitaPat.pageHtml(chapter), .mount({ tx, toast })                                    */
(function () {
  "use strict";

  var NAMES = [
    ["अर्जुनविषादयोग", "Arjuna's Despondency"], ["साङ्ख्ययोग", "The Yoga of Knowledge"], ["कर्मयोग", "The Yoga of Action"],
    ["ज्ञानकर्मसंन्यासयोग", "Knowledge and Renunciation of Action"], ["कर्मसंन्यासयोग", "The Yoga of Renunciation"],
    ["आत्मसंयमयोग", "The Yoga of Meditation"], ["ज्ञानविज्ञानयोग", "Knowledge and Realisation"], ["अक्षरब्रह्मयोग", "The Imperishable Brahman"],
    ["राजविद्याराजगुह्ययोग", "The Royal Knowledge"], ["विभूतियोग", "Divine Glories"], ["विश्वरूपदर्शनयोग", "The Universal Form"],
    ["भक्तियोग", "The Yoga of Devotion"], ["क्षेत्रक्षेत्रज्ञविभागयोग", "The Field and its Knower"], ["गुणत्रयविभागयोग", "The Three Gunas"],
    ["पुरुषोत्तमयोग", "The Supreme Person"], ["दैवासुरसम्पद्विभागयोग", "Divine and Demoniac Natures"], ["श्रद्धात्रयविभागयोग", "The Three Kinds of Faith"],
    ["मोक्षसंन्यासयोग", "Liberation through Renunciation"]
  ];
  var COUNTS = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
  var LS_CONT = "swadhyay_gitapat_continuous";
  var LS_RATE = "swadhyay_gitapat_rate";

  var tx = function (hi, en) { return hi; };
  var toast = function () {};
  var root = null;
  var chapter = 0, data = null, flat = [];            // flat: every line of the chapter as { vi, li }
  var cur = -1;                                       // index into flat of the line being played / last played
  var through = "line";                               // how far one start goes: "line" | "verse" | "chapter"
  var stopVerse = -1;                                 // the verse a "verse" run is limited to
  var playing = false, raf = 0;
  var audio = new Audio();
  audio.preload = "auto";
  var loadedKey = "";                                 // which file is in the <audio>: "v<verse index>" or a clip name
  var gen = 0;                                        // bumped by every new start, so a late "loaded" event of an old one is ignored

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function dev(n) { return String(n).replace(/\d/g, function (d) { return "०१२३४५६७८९".charAt(+d); }); }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function mediaUrl(path) {
    var m = window.swadhyayMedia ? window.swadhyayMedia(path) : path;
    return /^(https?:)?\/\//i.test(m) || m.charAt(0) === "/" ? m : "/" + m;
  }
  function keyOf(k) { var f = flat[k], p = data.v[f.vi].p[f.li]; return p[3] || "v" + f.vi; }
  function srcOfKey(key) {
    if (key.charAt(0) !== "v") return mediaUrl("assets/audio/gita-pat/" + key + ".mp3");
    return mediaUrl("assets/audio/gita-pat/" + pad(chapter, 2) + "_" + pad(data.v[+key.slice(1)].n, 3) + ".mp3");
  }

  /* ------------------------------------------------------------------ pages */
  function hubHtml() {
    return '<header class="gp-head"><span class="gp-test">' + esc(tx("परीक्षण पृष्ठ", "Test page")) + '</span>' +
      '<h1>' + esc(tx("गीता पाठ", "Gita Path")) + '</h1>' +
      '<p>' + esc(tx("किसी भी अध्याय में पंक्ति पर क्लिक करें — उसी पंक्ति का पाठ सुनाई देगा।", "Open a chapter and tap a line to hear it recited.")) + '</p></header>' +
      '<div class="gp-chapters">' + NAMES.map(function (n, i) {
        return '<a class="gp-ch" href="/gita-pat-test/' + (i + 1) + '"><span class="gp-ch-no">' + dev(i + 1) + '</span>' +
          '<span class="gp-ch-tx"><b>' + esc(tx("अध्याय", "Chapter") + " " + dev(i + 1)) + '</b><span>' + esc(tx(n[0], n[1])) + '</span><small>' + esc(dev(COUNTS[i]) + " " + tx("श्लोक", "verses")) + '</small></span></a>';
      }).join("") + '</div>';
  }
  function chapterShell() {
    var i = chapter - 1;
    return '<header class="gp-head gp-head-ch"><div class="gp-nav"><a class="gp-back" href="/gita-pat-test">‹ ' + esc(tx("सभी अध्याय", "All chapters")) + '</a><span class="gp-test">' + esc(tx("परीक्षण पृष्ठ", "Test page")) + '</span></div>' +
      '<h1>' + esc(tx("अध्याय", "Chapter") + " " + dev(chapter)) + ' · ' + esc(tx(NAMES[i][0], NAMES[i][1])) + '</h1>' +
      '<div class="gp-pn">' + (chapter > 1 ? '<a href="/gita-pat-test/' + (chapter - 1) + '">‹ ' + esc(tx("पिछला अध्याय", "Previous")) + '</a>' : '<span></span>') +
      (chapter < 18 ? '<a href="/gita-pat-test/' + (chapter + 1) + '">' + esc(tx("अगला अध्याय", "Next")) + ' ›</a>' : '<span></span>') + '</div></header>' +
      '<div class="gp-bar" data-gp-bar>' +
        '<button type="button" class="gp-b gp-b-main" data-gp="toggle" aria-label="play"><span class="gp-ic">▶</span><span class="gp-lbl">' + esc(tx("अध्याय सुनें", "Play chapter")) + '</span></button>' +
        '<button type="button" class="gp-b" data-gp="prev" aria-label="previous line">⏮</button>' +
        '<button type="button" class="gp-b" data-gp="next" aria-label="next line">⏭</button>' +
        '<label class="gp-sw" title="' + esc(tx("पंक्ति पर क्लिक करने के बाद अध्याय के अंत तक चलता रहे", "After a tap, keep playing to the end of the chapter")) + '"><input type="checkbox" data-gp="cont"' + (lsGet(LS_CONT) === "1" ? " checked" : "") + '><i></i><span>' + esc(tx("लगातार", "Continuous")) + '</span></label>' +
        '<select class="gp-rate" data-gp="rate" aria-label="speed">' + [["0.75", "0.75×"], ["1", "1×"], ["1.25", "1.25×"]].map(function (r) { return '<option value="' + r[0] + '"' + (String(lsGet(LS_RATE) || "1") === r[0] ? " selected" : "") + '>' + r[1] + '</option>'; }).join("") + '</select>' +
      '</div>' +
      '<p class="gp-note">' + esc(tx("ऑडियो सुनने के लिए किसी भी पंक्ति पर क्लिक करें।", "Click a line to hear its audio.")) + '</p>' +
      '<div class="gp-verses" data-gp-verses><p class="gp-load">' + esc(tx("लोड हो रहा है…", "Loading…")) + '</p></div>';
  }
  function versesHtml() {
    return data.v.map(function (v, vi) {
      return '<article class="gp-v" data-vi="' + vi + '">' +
        '<div class="gp-lines">' + v.p.map(function (p, li) {
          return '<button type="button" class="gp-line' + (p[3] ? ' gp-uv' : '') + '" data-gp="line" data-vi="' + vi + '" data-li="' + li + '">' + esc(p[0]) + (li === v.p.length - 1 && /॥$/.test(p[0]) ? ' ' + dev(v.n) + ' ॥' : '') + '</button>';
        }).join("") + '</div></article>';
    }).join("");
  }

  /* ------------------------------------------------------------------ playing */
  function flatIndex(vi, li) { for (var k = 0; k < flat.length; k++) if (flat[k].vi === vi && flat[k].li === li) return k; return -1; }
  function lineAt(k) { var f = flat[k]; return data.v[f.vi].p[f.li]; }
  function lineEl(k) { var f = flat[k]; return root && root.querySelector('.gp-line[data-vi="' + f.vi + '"][data-li="' + f.li + '"]'); }

  function paint() {
    if (!root) return;
    root.querySelectorAll(".gp-line.is-on, .gp-v.is-cur, .gp-vplay.is-on").forEach(function (e) { e.classList.remove("is-on", "is-cur"); });
    if (cur >= 0) {
      var el = lineEl(cur);
      if (el) { el.classList.add("is-on"); el.parentNode.parentNode.classList.add("is-cur"); }
      var vp = root.querySelector('.gp-vplay[data-vi="' + flat[cur].vi + '"]');
      if (vp && playing) vp.classList.add("is-on");
    }
    var main = root.querySelector('[data-gp="toggle"]');
    if (main) {
      main.querySelector(".gp-ic").textContent = playing ? "❚❚" : "▶";
      main.querySelector(".gp-lbl").textContent = playing ? tx("रोकें", "Pause") : (cur >= 0 ? tx("जारी रखें", "Resume") : tx("अध्याय सुनें", "Play chapter"));
      main.classList.toggle("is-playing", playing);
    }
  }
  function stopTick() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function stopAll() { gen++; stopTick(); try { audio.pause(); } catch (e) {} playing = false; paint(); }

  function yieldOthers() {
    try { if (window.SwadhyayAudio && window.SwadhyayAudio.pause) window.SwadhyayAudio.pause(); } catch (e) {}
    try { if (window.SwadhyayShlokaAudio && window.SwadhyayShlokaAudio.stop) window.SwadhyayShlokaAudio.stop(); } catch (e) {}
  }
  /* Each verse's mp3 is fetched whole and played from a blob: a blob is always seekable, whereas a streamed file is only seekable
     when the server answers Range requests (the local dev server does not -- the line would then start at 0:00, i.e. the first line). */
  var blobs = {};                                      // file key -> Promise of a blob URL (or the plain URL if the fetch fails)
  function blobFor(key) {
    if (!data || !key) return Promise.resolve("");
    if (!blobs[key]) {
      var src = srcOfKey(key);
      blobs[key] = fetch(src).then(function (r) { if (!r.ok) throw new Error("audio"); return r.blob(); })
        .then(function (b) { return URL.createObjectURL(b); }).catch(function () { return src; });
    }
    return blobs[key];
  }
  function preloadNext(k) { if (k + 1 < flat.length) blobFor(keyOf(k + 1)); }
  function dropBlobs() { Object.keys(blobs).forEach(function (k) { blobs[k].then(function (u) { if (u.indexOf("blob:") === 0) URL.revokeObjectURL(u); }); }); blobs = {}; }
  function scrollTo(k) {
    var el = lineEl(k);
    if (!el) return;
    var r = el.getBoundingClientRect(), h = window.innerHeight || 700;
    if (r.top < 150 || r.bottom > h - 90) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* start line k and carry on as far as `how` says */
  function start(k, how, auto) {
    if (!data || k < 0 || k >= flat.length) return;
    yieldOthers();
    var my = ++gen;
    cur = k; through = how; stopVerse = flat[k].vi; playing = true;
    paint();
    if (auto) scrollTo(k);
    var f = flat[k], v = data.v[f.vi], ln = v.p[f.li];
    function go() {
      if (my !== gen) return;
      try { audio.currentTime = ln[1]; } catch (e) {}
      audio.playbackRate = parseFloat(lsGet(LS_RATE) || "1") || 1;
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function () { if (my === gen) { playing = false; paint(); toast(tx("ऑडियो नहीं चल सका", "Could not play the audio")); } });
      stopTick();
      tick(my);
      preloadNext(k);
    }
    var key = keyOf(k);
    if (loadedKey === key && audio.src && audio.readyState >= 1) { go(); return; }
    blobFor(key).then(function (url) {
      if (my !== gen) return;
      loadedKey = key;
      audio.src = url;
      var once = function () { audio.removeEventListener("canplay", once); go(); };
      audio.addEventListener("canplay", once);
      audio.load();
    });
  }
  function tick(my) {
    raf = requestAnimationFrame(function () {
      if (my !== gen) return;
      if (!root || !root.isConnected) { stopAll(); return; }          // the page was left
      var ln = lineAt(cur);
      if (audio.ended || audio.currentTime >= ln[2] - 0.03) { lineDone(my); return; }
      tick(my);
    });
  }
  function lineDone(my) {
    var next = cur + 1, more = next < flat.length;
    if (more && through === "chapter") { start(next, "chapter", true); return; }
    if (more && through === "verse" && flat[next].vi === stopVerse) { start(next, "verse", true); return; }
    stopAll();
    if (!more && through === "chapter") { cur = -1; paint(); }
  }
  audio.addEventListener("ended", function () { if (playing && raf) { var my = gen; stopTick(); lineDone(my); } });

  function toggleMain() {
    if (playing) { stopAll(); return; }
    if (cur >= 0) {
      // resume the current line from where it stopped, carrying on through the chapter
      var ln = lineAt(cur);
      if (loadedKey === keyOf(cur) && audio.currentTime > ln[1] && audio.currentTime < ln[2] - 0.1) {
        yieldOthers(); var my = ++gen; through = "chapter"; playing = true; paint(); audio.play(); tick(my); return;
      }
      start(cur, "chapter", true); return;
    }
    start(0, "chapter", true);
  }

  /* ------------------------------------------------------------------ wiring */
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-gp]") : null;
    if (!t || !root.contains(t)) return;
    var a = t.getAttribute("data-gp"), cont = lsGet(LS_CONT) === "1";
    if (a === "line") {
      var k = flatIndex(+t.getAttribute("data-vi"), +t.getAttribute("data-li"));
      if (k === cur && playing) { stopAll(); return; }          // a second tap on the playing line pauses it
      start(k, cont ? "chapter" : "line");
    } else if (a === "verse") {
      var vi = +t.getAttribute("data-vi"), kv = flatIndex(vi, 0);
      if (cur >= 0 && flat[cur].vi === vi && playing) { stopAll(); return; }
      start(kv, cont ? "chapter" : "verse");
    } else if (a === "toggle") toggleMain();
    else if (a === "prev") { start(Math.max(0, (cur < 0 ? 0 : cur) - 1), playing ? through : "line", true); }
    else if (a === "next") { start(Math.min(flat.length - 1, (cur < 0 ? -1 : cur) + 1), playing ? through : "line", true); }
  }
  function onChange(e) {
    var t = e.target, a = t.getAttribute && t.getAttribute("data-gp");
    if (a === "cont") lsSet(LS_CONT, t.checked ? "1" : "0");
    else if (a === "rate") { lsSet(LS_RATE, t.value); audio.playbackRate = parseFloat(t.value) || 1; }
  }

  function loadChapter() {
    var box = root.querySelector("[data-gp-verses]");
    fetch("/assets/data/gita-pat/ch" + pad(chapter, 2) + ".json?v=3").then(function (r) { if (!r.ok) throw new Error("load"); return r.json(); }).then(function (d) {
      data = d; flat = [];
      d.v.forEach(function (v, vi) { v.p.forEach(function (p, li) { flat.push({ vi: vi, li: li }); }); });
      box.innerHTML = versesHtml();
      paint();
    }).catch(function () { box.innerHTML = '<p class="gp-load">' + esc(tx("अध्याय लोड नहीं हो सका।", "Could not load the chapter.")) + '</p>'; });
  }

  window.SwadhyayGitaPat = {
    pageHtml: function (ch, t) {
      if (t) tx = t;
      var n = parseInt(ch, 10);
      stopAll();
      chapter = n >= 1 && n <= 18 ? n : 0; dropBlobs(); data = null; flat = []; cur = -1; loadedKey = "";
      return '<main class="content-pad gp-wrap"><section class="gp-root" data-gp-root>' + (chapter ? chapterShell() : hubHtml()) + '</section></main>';
    },
    mount: function (h) {
      if (h) { tx = h.tx || tx; toast = h.toast || toast; }
      root = document.querySelector("[data-gp-root]");
      if (!root) return;
      document.title = (chapter ? tx("अध्याय", "Chapter") + " " + dev(chapter) + " · " : "") + tx("गीता पाठ (परीक्षण)", "Gita Path (test)");
      if (!chapter) return;
      root.addEventListener("click", onClick);
      root.addEventListener("change", onChange);
      loadChapter();
    }
  };
})();

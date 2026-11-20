/* Recitations of Gita shlokas: a small play button next to a shloka, on the home page's daily Gita card and in
   the reader (Gita book).

   Recordings are assets/audio/gita/<chapter>_<verse>.mp3; assets/audio/gita/index.json (made by
   tools/build_shloka_audio_index.py) lists the ones that exist, with the shloka's anchor in the book.
   One shloka plays at a time with its own <audio>, separate from the bhajan player; starting a shloka pauses a
   bhajan, and starting a bhajan stops the shloka.

   Public API: window.SwadhyayShlokaAudio
     load()            -> Promise of the index (cached)
     has(key)          key = "<chapter>_<verse>", e.g. "1_1"
     anchors()         { "<anchor id in the book>": key } for the recordings that exist
     play(key)         play it, or pause it if it is the one playing
     stop(), playingKey()
     onState(fn, owner)   fn(playingKeyOrNull) on every change; one listener per owner name         */
(function () {
  "use strict";

  var BASE = window.swadhyayMedia ? window.swadhyayMedia("/assets/audio/gita/") : "/assets/audio/gita/";
  var index = {};
  var loading = null;
  var audio = new Audio();
  audio.preload = "none";
  var current = null;
  var queue = [], qi = 0;                     // a key may name several files joined by "|": they play one after the other
  var listeners = {};

  function load() {
    if (!loading) {
      loading = fetch(BASE + "index.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
        .then(function (m) { index = m || {}; return index; });
    }
    return loading;
  }
  /* a key that is a file path ("assets/audio/mantra/x.mp3") plays that file directly: a book marks any mantra or
     verse with data-audio="<path>" and the reader puts a play button on it (see readerInlineScript) */
  function isPath(key) { return /\.(mp3|m4a|ogg)$/i.test(String(key)) || /^(https?:\/\/|\/|assets\/)/i.test(String(key)); }
  function srcOf(k) { return isPath(k) ? fileSrc(k) : BASE + k + ".mp3"; }
  function has(key) { return isPath(key) || !!index[key]; }
  function fileSrc(p) {
    var m = window.swadhyayMedia ? window.swadhyayMedia(p) : p;
    return /^(https?:)?\/\//i.test(m) || m.charAt(0) === "/" ? m : "/" + m;   // the reader page is /read/<slug>/<n>
  }
  function anchors() {
    var out = {};
    Object.keys(index).forEach(function (k) { if (index[k] && index[k].id) out[index[k].id] = k; });
    return out;
  }
  function playingKey() { return current && !audio.paused ? current : null; }
  function notify() {
    var k = playingKey();
    Object.keys(listeners).forEach(function (o) { try { listeners[o](k); } catch (e) { delete listeners[o]; } });
    try { document.dispatchEvent(new CustomEvent("swadhyay-shloka-audio-state", { detail: k })); } catch (e) {}
  }
  function play(key) {
    if (!has(key)) return;
    if (current === key && !audio.paused) { audio.pause(); return; }
    if (current !== key) { current = key; queue = String(key).split("|"); qi = 0; audio.src = srcOf(queue[0]); }
    else if (audio.ended) { qi = 0; if (queue.length > 1) audio.src = srcOf(queue[0]); else audio.currentTime = 0; }
    var A = window.SwadhyayAudio;
    if (A && A.pause) A.pause();                       // a bhajan in the background yields to the shloka
    audio.play().catch(function () { current = null; notify(); });
  }
  function stop() { qi = 0; audio.pause(); audio.currentTime = 0; current = null; notify(); }

  function more() { return qi < queue.length - 1; }
  audio.addEventListener("play", notify);
  audio.addEventListener("pause", function () { if (audio.ended && more()) return; notify(); });   // between two files of one key it is not a pause
  audio.addEventListener("ended", function () {
    if (more()) { qi++; audio.src = srcOf(queue[qi]); audio.play().catch(function () { current = null; notify(); }); }
    else notify();
  });
  document.addEventListener("swadhyay-audio-state", function () {      // the bhajan player started: stop the shloka
    var A = window.SwadhyayAudio;
    if (current && !audio.paused && A && A.isActive && A.isActive()) stop();
  });

  window.SwadhyayShlokaAudio = {
    load: load, has: has, anchors: anchors, play: play, stop: stop, playingKey: playingKey,
    onState: function (fn, owner) { listeners[owner || "default"] = fn; }
  };
  load();
})();

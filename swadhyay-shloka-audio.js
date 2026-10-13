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

  var BASE = "/assets/audio/gita/";
  var index = {};
  var loading = null;
  var audio = new Audio();
  audio.preload = "none";
  var current = null;
  var listeners = {};

  function load() {
    if (!loading) {
      loading = fetch(BASE + "index.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
        .then(function (m) { index = m || {}; return index; });
    }
    return loading;
  }
  function has(key) { return !!index[key]; }
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
    if (current !== key) { current = key; audio.src = BASE + key + ".mp3"; }
    else if (audio.ended) audio.currentTime = 0;
    var A = window.SwadhyayAudio;
    if (A && A.pause) A.pause();                       // a bhajan in the background yields to the shloka
    audio.play().catch(function () { current = null; notify(); });
  }
  function stop() { audio.pause(); audio.currentTime = 0; current = null; notify(); }

  ["play", "pause", "ended"].forEach(function (ev) { audio.addEventListener(ev, notify); });
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

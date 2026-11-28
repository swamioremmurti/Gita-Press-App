/* swadhyay-voice.js -- the voices of the book reader's "listen" button. No built-in (system) text-to-speech is used.

   "sa", shlokas and "… उवाच" lines: Alpa v0.2 (https://huggingface.co/77ethers/alpa, Apache-2.0).
   "hi", everything else in Hindi:    Piper "pratham" (assets/tts/pratham-hi/NOTICE.txt: CC BY-NC-SA 4.0, non-commercial).

   Both run ON THE DEVICE:
     - in the Android app by the app's own engines (AlpaEngine.java for "sa", reached from here; PiperEngine.java for "hi",
       reached by the page through the app's speech bridge); the models are inside the APK;
     - in a browser by ONNX Runtime Web in a worker (swadhyay-voice-worker.js), downloaded the first time they are needed.
   No sound is cached: a line's sound is made when it is due (one Hindi line ahead), played, and dropped. If a line cannot be
   spoken, the caller skips it.

   The Sanskrit text front end below (Devanagari -> phoneme ids + syllable weight) is a JavaScript port, changed for this site, of
   alpa/text.py from the Alpa repository (Apache-2.0), whose token layout follows tiny-voca (Muhammed Nazeem) and whose
   pronunciation and scansion rules follow Vagdhenu's Sanskrit front end (Prathosh A P). It must give exactly the same ids as
   that file (front end version 2): the model was trained on them. */
(function (root) {
  "use strict";

  /* ================================================================ text -> tokens (port of alpa/text.py) */
  var FRONTEND = "alpa-2";                                   // the app's model must have been trained on the same rules
  var SPECIALS = ["<pad>", "<bos>", "<eos>", "<sp>", "<unk>"];
  var PUNCT = [",", "?", "!", "|", "||", "<yati>"];
  var VOWELS = "a A i I u U f e E o O".split(" ");
  var CONSONANTS = "k g N c j Y w q R t d n p b m y r l v S z s h".split(" ");
  var PHONES = VOWELS.concat(CONSONANTS, ["M", "H"]);
  var SYMBOLS = SPECIALS.concat(PUNCT, PHONES);
  var ID = {}; SYMBOLS.forEach(function (s, i) { ID[s] = i; });
  function set(list) { var o = {}; list.forEach(function (x) { o[x] = true; }); return o; }
  var PHONE_SET = set(PHONES), VOWEL_SET = set(VOWELS);
  function zip(chars, values) { var o = {}; chars.split("").forEach(function (c, i) { o[c] = values.charAt(i); }); return o; }
  var INDEPENDENT = zip("अआइईउऊऋॠऌॡएऐओऔ", "aAiIuUfFxXeEoO");
  var SIGNS = zip("ािीुूृॄॢॣेैोौ", "AiIuUfFxXeEoO");
  var CONS = zip("कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळ", "kKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzshl");
  var VIRAMA = "्", NUKTA = "़", AVAGRAHA = "ऽ", OM = "ॐ";
  var NASAL = set(["ं", "ँ"]), VISARGA = set(["ः", "ᳵ", "ᳶ"]);
  var UNSPOKEN = set(["॑", "॒", "​", "‌", "‍"]);
  var VOWEL_FINAL = Object.keys(INDEPENDENT).concat(Object.keys(SIGNS), Object.keys(CONS)).join("");
  var RAW_VOWELS = set("aAiIuUfFxXeEoO".split("")), LONG = set("AIUFXeEoO".split(""));
  var WRITTEN_AS = { F: ["f"], x: ["l", "f"], X: ["l", "f"] };
  "KGCJWQTDPB".split("").forEach(function (a, i) { WRITTEN_AS[a] = ["kgcjwqtdpb".charAt(i), "h"]; });
  var CLASS_NASAL = {};
  [["kKgGN", "N"], ["cCjJY", "Y"], ["wWqQR", "R"], ["tTdDn", "n"], ["pPbBm", "m"]].forEach(function (g) {
    g[0].split("").forEach(function (c) { CLASS_NASAL[c] = g[1]; });
  });
  var MARK_TOKEN = { "।": "|", "|": "|", ".": "|", "॥": "||", ",": ",", ";": ",", "…": ",", "–": ",", "—": ",", "?": "?", "!": "!" };
  var QUOTES = /['"`´‘’‚‛“”„‟«»‹›]/g;
  var VERSE_NUMBER = /([।॥])\s*[0-9०-९]+(?:\s*[\/.\-]\s*[0-9०-९]+)*\s*(?=[।॥]|$)/g;
  var PIECE = /(\s+|[।|.॥,;…–—?!])/;

  function normalize(text) {
    text = text.normalize("NFC");
    text = text.replace(new RegExp("([" + VOWEL_FINAL + "]):-?", "g"), "$1ः");        // a colon typed for visarga
    text = text.replace(/।।/g, "॥").replace(/\|\|/g, "॥");
    text = text.replace(/\([^)]*\)/g, " ");                                            // editorial insertions are not recited
    text = text.replace(VERSE_NUMBER, "$1");
    text = text.replace(/\s-+\s/g, " , ").replace(/-/g, "");                           // a spaced hyphen pauses, a plain one joins
    text = text.replace(/[:()]/g, " , ");
    return text.replace(QUOTES, "").replace(/\s+/g, " ").trim();
  }
  /* one written word -> phonemes as written, and the characters that are not Sanskrit letters */
  function wordPhones(word) {
    var phones = [], unknown = [], open = false, stray = "", chars = Array.from(word + " ");
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (UNSPOKEN[c]) continue;
      var readable = INDEPENDENT[c] || SIGNS[c] || CONS[c] || NASAL[c] || VISARGA[c] || c === VIRAMA || c === NUKTA || c === AVAGRAHA || c === OM || c === " ";
      if (!readable) {
        if (open) { phones.push("a"); open = false; }
        if (!stray) phones.push("<unk>");
        stray += c;
        continue;
      }
      if (stray) { unknown.push(stray); stray = ""; }
      if (c === VIRAMA) open = false;
      else if (c === NUKTA) unknown.push(c);
      else if (SIGNS[c]) { phones.push(SIGNS[c]); open = false; }
      else {
        if (open) phones.push("a");
        open = !!CONS[c];
        if (open) phones.push(CONS[c]);
        else if (INDEPENDENT[c]) phones.push(INDEPENDENT[c]);
        else if (NASAL[c]) phones.push("M");
        else if (VISARGA[c]) phones.push("H");
        else if (c === OM) phones.push("o", "m");
      }
    }
    return { phones: phones, unknown: unknown };
  }
  /* anusvara: the nasal of the following stop inside a word, "m" before a pause */
  function pronounce(pieces) {
    pieces.forEach(function (ph, n) {
      if (typeof ph === "string") return;
      for (var i = 0; i < ph.length; i++) {
        if (ph[i] !== "M") continue;
        if (i + 1 < ph.length) ph[i] = CLASS_NASAL[ph[i + 1]] || "M";
        else if (n + 1 === pieces.length || typeof pieces[n + 1] === "string") ph[i] = "m";
      }
    });
  }
  /* guru: a long vowel, or anusvara / visarga / two consonants before the next vowel */
  function weigh(ph) {
    var w = ph.map(function () { return 0; }), v = [];
    ph.forEach(function (p, i) { if (RAW_VOWELS[p]) v.push(i); });
    v.forEach(function (i, n) {
      var between = ph.slice(i + 1, n + 1 < v.length ? v[n + 1] : ph.length);
      w[i] = LONG[ph[i]] || between.length >= 2 || between.indexOf("M") >= 0 || between.indexOf("H") >= 0 ? 2 : 1;
    });
    return w;
  }
  function tokenize(pieces) {
    pronounce(pieces);
    var sym = ["<bos>"], weight = [0], start = 0;
    while (start < pieces.length) {
      if (typeof pieces[start] === "string") {
        if (sym[sym.length - 1] !== pieces[start]) { sym.push(pieces[start]); weight.push(0); }
        start++;
        continue;
      }
      var end = start, all = [];
      while (end < pieces.length && typeof pieces[end] !== "string") { all = all.concat(pieces[end]); end++; }
      var weights = weigh(all), k = 0;
      for (var n = start; n < end; n++) {
        var last = sym[sym.length - 1];
        if (PHONE_SET[last] || last === "<unk>") { sym.push("<sp>"); weight.push(0); }
        for (var i = 0; i < pieces[n].length; i++) {
          var level = weights[k++], mapped = WRITTEN_AS[pieces[n][i]] || [pieces[n][i]];
          for (var m = 0; m < mapped.length; m++) { sym.push(mapped[m]); weight.push(VOWEL_SET[mapped[m]] ? level : 0); }
        }
      }
      start = end;
    }
    sym.push("<eos>"); weight.push(0);
    if (!sym.some(function (s) { return PHONE_SET[s] || s === "<unk>"; })) return null;
    return { symbols: sym, weight: weight };
  }
  /* -> {ids, weight, unknown}, or null when there is nothing to pronounce */
  function phonemize(text) {
    if (typeof text !== "string" || !text.trim()) return null;
    var pieces = [], unknown = [];
    normalize(text).split(PIECE).forEach(function (piece) {
      if (!piece || /^\s+$/.test(piece)) return;
      if (MARK_TOKEN.hasOwnProperty(piece)) { pieces.push(MARK_TOKEN[piece]); return; }
      var w = wordPhones(piece);
      unknown = unknown.concat(w.unknown);
      if (w.phones.length) pieces.push(w.phones);
    });
    var t = tokenize(pieces);
    return t && { ids: t.symbols.map(function (s) { return ID[s]; }), weight: t.weight, unknown: unknown };
  }

  /* A line of a BOOK made ready for the voice: Vedic accent signs, footnote stars and soft hyphens go, a word broken by a hyphen
     at a line end is joined again, and anything that is not Devanagari or punctuation is dropped. Null = nothing to say. */
  var MAX_TOKENS = 512;
  function prepare(line) {
    var t = String(line || "")
      .replace(/[­॓॔᳐-᳴᳷-᳹꣠-꣱*†‡]/g, "")
      .replace(/ꣳ/g, "ँ")
      .replace(/([ऀ-ॿ‌‍])[-‐‑]\s+(?=[ऄ-ह])/g, "$1")
      .replace(/[‐‑]/g, "-")
      .replace(/\([^()]*\)|\[[^\[\]]*\]/g, " ");
    t = t.replace(/[^ऀ-ॿᳵᳶ​-‍\s,;:.!?|…–—\-]/g, " ").replace(/[०-९]+/g, " ").replace(/॰/g, " ").replace(/\s+/g, " ").trim();
    if (!/[अ-हॐ]/.test(t)) return null;
    var p = phonemize(t);
    return p && p.ids.length <= MAX_TOKENS ? { text: t, ids: p.ids, weight: p.weight } : null;
  }

  /* ================================================================ Hindi text */
  var HINDI_LETTER = /[ऄ-हॐक़-ॡॲ-ॿ]/, HINDI_MAX = 600;
  /* the same tidying the app's Hindi voice does (PiperEngine.prep). Invisible joiners go too: with one inside a word
     ("भगवान<ZWJ>्से") the voice says the word "halant". Null = nothing this voice can say. */
  function prepareHindi(line) {
    var t = String(line || "").replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, "").replace(/॥/g, "।").replace(/[|*†‡]/g, " ").replace(/\s+/g, " ").trim();
    return HINDI_LETTER.test(t) && t.length <= HINDI_MAX ? { text: t } : null;
  }

  /* ================================================================ the voices */
  var SA_SPEAKER = 1;                                        // Alpa: 0 female, 1 male
  var LOAD_MS = 300000, LINE_MS = 45000, IDLE_MS = 120000;
  var seq = 0, job = null;
  var next = null;                                           // the ONE Hindi line being made ready while another plays
  var failed = {}, asked = {}, loaded = {}, timers = {};     // by kind: "sa" Sanskrit, "hi" Hindi

  var native = (function () {
    var k = root.KSAndroid;
    try { return k && typeof k.alpaSpeak === "function" && k.alpaFrontend() === FRONTEND ? k : null; } catch (e) { return null; }
  })();
  var inApp = !!root.KSAndroid;
  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, worker = null, base = "", source = null, idle = 0;

  function inBrowser() { return !inApp && !!(root.Worker && root.WebAssembly && AC && root.BigInt64Array && root.fetch); }
  /* In the app only Sanskrit comes through here (the app's own engine); its Hindi voice is reached through the app's speech bridge.
     An older app without the Sanskrit engine keeps skipping shlokas: running the models inside its web view is not tried. */
  function supported(kind) { return !failed[kind] && (native ? kind === "sa" : inBrowser()); }

  /* must be called from a tap: browsers only let sound start that way */
  function unlock() {
    if (native || !inBrowser()) return;
    try { if (!ctx) ctx = new AC(); if (ctx.state === "suspended") ctx.resume().catch(function () {}); } catch (e) {}
  }

  function warn(text) { if (root.console) root.console.warn(text); }
  function finish(j, ok, why) {
    if (job !== j) return;
    job = null;
    clearTimeout(j.timer);
    if (!ok && why) warn("Reading voice skipped a line: " + why);
    var f = ok ? j.on.end : j.on.error;
    if (f) setTimeout(f, 0);
  }
  /* a voice cannot run here: say so once; its further lines fail at once and the caller sees supported(kind) turn false */
  function broken(kind, why) {
    failed[kind] = true;
    clearTimeout(timers[kind]);
    warn((kind === "sa" ? "Sanskrit" : "Hindi") + " voice is not available: " + why);
    if (kind === "hi") next = null;
    if (job && job.kind === kind) { var j = job; stopSound(); finish(j, false); }
  }

  function dropWorker() {
    clearTimeout(idle); clearTimeout(timers.sa); clearTimeout(timers.hi);
    if (worker) { worker.terminate(); worker = null; }
    asked = {}; loaded = {}; next = null;
  }
  function startWorker() {
    if (worker) return;
    base = new URL(".", (document.querySelector('script[src*="swadhyay-voice.js"]') || {}).src || location.origin + "/").href;
    var w = worker = new Worker(base + "swadhyay-voice-worker.js");
    w.onerror = function (e) {
      if (worker !== w) return;
      var why = (e && e.message) || "worker error";
      dropWorker(); broken("sa", why); broken("hi", why);
    };
    w.onmessage = function (e) {
      if (worker !== w) return;
      var m = e.data || {};
      if (m.type === "ready") {
        loaded[m.kind] = true; clearTimeout(timers[m.kind]);
        if (job && job.kind === m.kind && !job.playing) arm(job, LINE_MS);
      } else if (m.type === "load-error") broken(m.kind, m.error);
      else if (job && !job.playing && m.n === job.n) {
        if (m.type === "audio") play(job, m.audio, m.rate);
        else finish(job, false, m.error);
      } else if (next && m.n === next.n) {
        if (m.type === "audio") { next.audio = m.audio; next.hz = m.rate; }
        else next = null;                                       // it will be tried again when its turn comes
      }
    };
  }
  /* have the worker open a voice's model (once) */
  function load(kind) {
    clearTimeout(idle);
    startWorker();
    if (asked[kind]) return;
    asked[kind] = true;
    timers[kind] = setTimeout(function () { if (!loaded[kind]) broken(kind, "the model took too long to load"); }, LOAD_MS);
    worker.postMessage({ type: "load", kind: kind, base: base });
  }
  /* ask the worker for one line's sound; returns the number it will answer with */
  function order(kind, p, rate) {
    load(kind);
    var m = { type: "speak", n: ++seq, kind: kind, speed: rate };
    if (kind === "sa") { m.ids = p.ids; m.weight = p.weight; m.voice = SA_SPEAKER; } else m.text = p.text;
    worker.postMessage(m);
    return m.n;
  }
  function unorder(n) { if (worker && n) worker.postMessage({ type: "drop", n: n }); }
  function arm(j, ms) { clearTimeout(j.timer); j.timer = setTimeout(function () { stopSound(); finish(j, false, "timed out"); }, ms); }

  function play(j, audio, rate) {
    try {
      if (!ctx || !audio || !audio.length) throw new Error("no sound");
      var buf = ctx.createBuffer(1, audio.length, rate);
      buf.getChannelData(0).set(audio);
      var src = source = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination);
      src.onended = function () {
        if (source !== src) return;
        source = null; src.buffer = null; src.disconnect();             // played: the sound is dropped, nothing is kept
        clearTimeout(j.timer); j.timer = setTimeout(function () { finish(j, true); }, j.pause);
      };
      var go = function () {
        if (job !== j || source !== src) return;
        if (ctx.state !== "running") { source = null; finish(j, false, "the browser did not allow sound"); return; }
        arm(j, buf.duration * 1000 + 10000);
        src.start();
        if (j.on.start) j.on.start();
      };
      j.playing = true;
      if (ctx.state === "suspended") ctx.resume().then(go, go); else go();
    } catch (e) { finish(j, false, String(e && e.message || e)); }
  }
  function stopSound() {
    var s = source; source = null;
    if (s) { try { s.onended = null; s.stop(); } catch (e) {} try { s.buffer = null; s.disconnect(); } catch (e) {} }
  }

  /* get a model ready ahead of its first line */
  function warm(kind) {
    if (!supported(kind)) return;
    try { if (native) native.alpaWarm(); else load(kind); } catch (e) { broken(kind, String(e)); }
  }

  function textFor(kind, line) { try { return kind === "sa" ? prepare(line) : prepareHindi(line); } catch (e) { return null; } }
  function clampRate(rate) { return Math.max(0.5, Math.min(2, rate || 1)); }
  /* the rest after a piece, by how it ends (the figures the app's voices use) */
  function pauseAfter(kind, text, rate) {
    var ms = kind === "sa" ? (/॥\s*$/.test(text) ? 450 : /।\s*$/.test(text) ? 250 : 80)
      : (/[।.?!]\s*$/.test(text) ? 550 : /[,;:—–\-]\s*$/.test(text) ? 260 : 80);
    return Math.round(ms / Math.max(0.75, Math.min(1.6, rate)));
  }

  /* say one line, kind "sa" or "hi"; on = {start, end, error}: exactly one of end / error follows, unless cancel() comes first */
  function speak(kind, line, rate, on) {
    stopJob();
    var j = job = { id: "a" + (++seq), n: 0, kind: kind, on: on || {}, timer: 0, pause: 0, playing: false };
    var p = supported(kind) ? textFor(kind, line) : null;
    if (!p) { finish(j, false); return; }
    rate = clampRate(rate);
    j.pause = pauseAfter(kind, p.text, rate);
    try {
      if (native) {
        arm(j, LINE_MS);
        native.alpaSpeak(j.id, p.ids.join(","), p.weight.join(","), SA_SPEAKER, rate, j.pause);
        return;
      }
      unlock();
      clearTimeout(idle);
      var made = null;
      if (kind === "hi" && next) {
        if (next.key === rate + "|" + p.text) made = next; else unorder(next.n);
        next = null;
      }
      j.n = made ? made.n : order(kind, p, rate);
      arm(j, loaded[kind] ? LINE_MS : LOAD_MS + LINE_MS);
      if (made && made.audio) play(j, made.audio, made.hz);
    } catch (e) { finish(j, false, String(e && e.message || e)); }
  }
  /* the next Hindi line, made ready while the present one plays, so there is no wait between them. Only one is ever held.
     (In the app the Hindi voice does this itself; shlokas are never made ahead.) */
  function prefetch(kind, line, rate) {
    if (kind !== "hi" || native || !supported(kind)) return;
    var p = textFor(kind, line);
    if (!p) return;
    rate = clampRate(rate);
    var key = rate + "|" + p.text;
    if (next && next.key === key) return;
    try {
      if (next) unorder(next.n);
      next = { key: key, n: order(kind, p, rate), audio: null, hz: 0 };
    } catch (e) { next = null; }
  }
  /* the app reports here */
  root.__ksAlpa = function (id, type, detail) {
    var j = job;
    if (!j || j.id !== id) return;
    if (type === "start") { arm(j, 90000); if (j.on.start) j.on.start(); }
    else finish(j, type === "end", detail);
  };

  function stopJob() {
    var j = job; job = null;
    if (j) { clearTimeout(j.timer); if (!j.playing) unorder(j.n); }
    stopSound();
    if (native) { try { native.alpaCancel(); } catch (e) {} }
  }
  /* silence: also drops the line made ready */
  function cancel() {
    stopJob();
    if (next) { unorder(next.n); next = null; }
  }
  /* Listening has stopped: every sound is dropped. The loaded models are kept for two minutes, so that starting again is quick,
     then freed; after a failure (or a load still under way) they are freed at once, and a voice that failed may be tried again. */
  function release() {
    cancel();
    if (native) { try { native.alpaRelease(); } catch (e) {} }
    clearTimeout(idle);
    var unsettled = Object.keys(asked).some(function (k) { return failed[k] || !loaded[k]; });
    if (unsettled) dropWorker(); else if (worker) idle = setTimeout(dropWorker, IDLE_MS);
    if (ctx) { try { ctx.close(); } catch (e) {} ctx = null; }
    failed = {};
  }

  var api = { supported: supported, unlock: unlock, warm: warm, speak: speak, prefetch: prefetch, cancel: cancel, release: release,
              prepare: prepare, phonemize: phonemize, prepareHindi: prepareHindi,
              disable: function (kind) { broken(kind, "too many lines failed"); } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;          // for the front-end test in node
  root.SwadhyayVoice = api;
})(typeof window !== "undefined" ? window : globalThis);

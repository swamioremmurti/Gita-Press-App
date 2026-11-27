/* swadhyay-voice-worker.js -- runs the reading voices in the browser, off the page's own thread:
     "sa"  Sanskrit, Alpa v0.2 (ONNX)
     "hi"  Hindi, Piper "pratham" (ONNX), with the eSpeak NG based converter from text to its sound symbols
   Started by swadhyay-voice.js; a model is opened when its first line is wanted. Everything stays on the device; no sound is stored. */
"use strict";
var ORT_DIR = "assets/vendor/onnxruntime-web-1.20.1/";
var ESPEAK_DIR = "assets/vendor/piper-phonemize-1.0.0/";
var SA_MODEL = "assets/tts/alpa-v0.2/alpa-v0.2.onnx", SA_HZ = 24000;
var HI_MODEL = "assets/tts/pratham-hi/hi_IN-pratham-medium.onnx", HI_HZ = 22050;
/* the calm delivery the Android app uses for this voice: noise, length (higher = slower), rhythm noise */
var CALM_NOISE = 0.5, CALM_LENGTH = 1.2, CALM_NOISE_W = 0.6, HI_MAX_IDS = 3000;

var base = "", runtimeIn = false;
var loading = {}, voices = {}, dropped = {};
var opening = Promise.resolve(), queue = Promise.resolve();

function runtime() {
  if (runtimeIn) return;
  importScripts(base + ORT_DIR + "ort.wasm.min.js");
  ort.env.wasm.wasmPaths = base + ORT_DIR;
  ort.env.wasm.numThreads = 1;                       // more threads need a cross-origin isolated page
  runtimeIn = true;
}
/* one model is opened at a time: the runtime must have finished starting before a second one is opened */
function open(path, options) {
  var p = opening.then(function () {
    runtime();
    return ort.InferenceSession.create(base + path, options);
  });
  opening = p.catch(function () {});
  return p;
}
function file(path) {
  return fetch(base + path).then(function (r) {
    if (!r.ok) throw new Error(path + ": " + r.status);
    return r.arrayBuffer();
  });
}
function ints(list) {
  var a = new BigInt64Array(list.length);
  for (var i = 0; i < list.length; i++) a[i] = BigInt(list[i]);
  return a;
}
function row(list) { return new ort.Tensor("int64", ints(list), [1, list.length]); }
function one(type, value) {
  return new ort.Tensor(type, type === "int64" ? BigInt64Array.of(BigInt(value)) : Float32Array.of(value), [1]);
}

var LOAD = {
  sa: function () {
    return open(SA_MODEL, { executionProviders: ["wasm"] }).then(function (s) { voices.sa = { session: s }; });
  },
  hi: function () {
    var converter = Promise.all([file(ESPEAK_DIR + "piper_phonemize.wasm").then(function (b) { return WebAssembly.compile(b); }),
                                 file(ESPEAK_DIR + "piper_phonemize.data")])
      .then(function (r) { importScripts(base + ESPEAK_DIR + "piper_phonemize.js"); return { module: r[0], data: r[1] }; });
    return Promise.all([open(HI_MODEL, { executionProviders: ["wasm"], graphOptimizationLevel: "basic" }), converter])
      .then(function (r) { voices.hi = { session: r[0], converter: r[1] }; });
  }
};

/* Hindi text -> the voice's sound symbols. A fresh copy of the converter for every line: one that is used again crashes now and
   then. The program and its data are prepared once, so a copy costs a few milliseconds. */
function symbols(text) {
  var c = voices.hi.converter, out = [];
  return new Promise(function (resolve, reject) {
    createPiperPhonemize({
      print: function (line) { out.push(line); },
      printErr: function () {},
      instantiateWasm: function (imports, done) {
        WebAssembly.instantiate(c.module, imports).then(function (instance) { done(instance, c.module); }, reject);
        return {};
      },
      getPreloadedPackage: function () { return c.data.slice(0); }
    }).then(function (mod) {
      try {
        mod.callMain(["-l", "hi", "--input", JSON.stringify([{ text: text }]), "--espeak_data", "/espeak-ng-data"]);
        resolve(JSON.parse(out[0]).phoneme_ids);
      } catch (e) { reject(e); }
    }, reject);
  });
}
/* the converter joins sentences end to end, each beginning with the symbol 1: the voice is given one sentence at a time */
function sentences(ids) {
  var out = [], cur = [];
  ids.forEach(function (id) {
    if (id === 1 && cur.length) { out.push(cur); cur = []; }
    cur.push(id);
  });
  if (cur.length) out.push(cur);
  return out;
}

var SPEAK = {
  sa: function (m) {
    return voices.sa.session.run({
      tokens: row(m.ids), weight: row(m.weight), voice: one("int64", m.voice),
      speed: one("float32", m.speed), pitch_shift: one("float32", 0), pitch_range: one("float32", 1)
    }, ["audio"]).then(function (out) {
      return { audio: new Float32Array(out.audio.data), rate: SA_HZ };      // a copy of our own, handed over to the page
    });
  },
  hi: function (m) {
    var s = voices.hi.session, pieces = [];
    return symbols(m.text).then(function (ids) {
      if (!ids.length || ids.length > HI_MAX_IDS) throw new Error("line cannot be spoken (" + ids.length + " symbols)");
      return sentences(ids).reduce(function (chain, part) {
        return chain.then(function () {
          return s.run({
            input: row(part), input_lengths: one("int64", part.length),
            scales: new ort.Tensor("float32", Float32Array.of(CALM_NOISE, CALM_LENGTH / m.speed, CALM_NOISE_W), [3])
          }).then(function (out) { pieces.push(new Float32Array(out[s.outputNames[0]].data)); });
        });
      }, Promise.resolve());
    }).then(function () {
      var audio = new Float32Array(pieces.reduce(function (n, p) { return n + p.length; }, 0)), at = 0;
      pieces.forEach(function (p) { audio.set(p, at); at += p.length; });
      return { audio: audio, rate: HI_HZ };
    });
  }
};

/* a short break between lines, so that a "drop" message that has arrived is seen before the next line is begun */
function breathe() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }
function fail(m, err) { postMessage({ type: "error", n: m.n, error: String(err && err.message || err) }); }

onmessage = function (e) {
  var m = e.data || {};
  if (m.type === "load") {
    base = m.base;
    if (!loading[m.kind]) loading[m.kind] = Promise.resolve().then(LOAD[m.kind]);
    loading[m.kind].then(function () { postMessage({ type: "ready", kind: m.kind }); },
      function (err) { postMessage({ type: "load-error", kind: m.kind, error: String(err && err.message || err) }); });
  } else if (m.type === "speak") {
    /* a line joins the queue once its voice is open, so a voice still loading does not hold up the other one */
    loading[m.kind].then(function () {
      queue = queue.then(breathe).then(function () {
        if (dropped[m.n]) { delete dropped[m.n]; return null; }
        return SPEAK[m.kind](m).then(function (r) {
          postMessage({ type: "audio", n: m.n, audio: r.audio, rate: r.rate }, [r.audio.buffer]);
        });
      }).catch(function (err) { fail(m, err); });
    }, function (err) { fail(m, err); });
  } else if (m.type === "drop") dropped[m.n] = true;
};

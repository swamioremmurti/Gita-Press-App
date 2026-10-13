/* श्रीरामशलाका-प्रश्नावली as a game.

   The 15 x 15 grid and the nine chaupais are those of the chapter in श्रीरामचरितमानस: choose a
   cell, then take every 9th cell (wrapping round) until you are back where you began -- 25 cells
   -- and the letters make one chaupai, the answer. The 225 cells fall into nine such loops
   (cell number mod 9), so each cell leads to exactly one of the nine chaupais.

   What the page adds: a short dhyan step, an animated walk across the grid, a collection of the
   nine chaupais, a daily streak, a rank and badges, and a practice round that teaches the counting
   rule (including the "ा"-only cells and the two-letter cells).

   Saved in localStorage (swadhyay_shalaka_v1, optional): chaupais found, streak, points, badges,
   best practice. No question is ever stored -- the question stays in the mind.

   Public API: window.SwadhyayShalaka.pageHtml(), .mount({ tx, toast })                       */
(function () {
  "use strict";

  /* ---------------- the grid (an "@" is a cell holding only the "ा" matra) ---------------- */
  var ROWS = [
    "सु प्र उ बि हो मु ग ब सु नु बि घ धि इ द",
    "र रु फ सि सि रहिं बस हि मं ल न ल य न अं",
    "सुज सो ग सु कु म स ग त न इ ल धा बे नो",
    "त्य र न कु जो म रि र र अ की हो सं रा य",
    "पु सु थ सी जे इ ग म सं क रे हो स स नि",
    "त र त र स हुँ ह ब ब प चि स हिं स तु",
    "म का @ र र म मि मी म्हा @ जा हू हीं @ @",
    "ता रा रे री हृ का फ खा जू ई र रा पू द ल",
    "नि को जो गो न मु जि यँ ने मनि क ज प स ल",
    "हि रा मि स रि ग द न्मु ख म खि जि म त जं",
    "सिं ख नु न को मि निज र्क ग धु ध सु का स र",
    "गु ब म अ रि नि म ल @ न ढ़ ती न क भ",
    "ना पु व अ @ र ल @ ए तु र न नु वै थ",
    "सि हुँ सु म्ह रा र स स र त न ख @ ज @",
    "र @ @ ला धी @ री @ हू हीं खा जू ई रा रे"
  ];
  var NB = " ा";
  var CELLS = [];
  ROWS.forEach(function (r) { r.split(" ").forEach(function (c) { CELLS.push(c === "@" ? NB : c); }); });
  var N = CELLS.length;           // 225
  var STEP = 9, LOOP = N / STEP;  // every 9th cell; 25 cells make a loop

  /* ---------------- the nine chaupais (text, place and result as printed in the chapter) ---------------- */
  // start = the cell where the chaupai's first letter sits; every cell with the same number mod 9 leads to it.
  var CHAUPAIS = [
    { start: 4, lines: ["होइहि सोइ जो राम रचि राखा।", "को करि तर्क बढ़ावै साखा॥"], good: false,
      place: "यह चौपाई बालकाण्डान्तर्गत शिव और पार्वतीके संवादमें है।",
      fal: "कार्य होनेमें सन्देह है, अत: उसे भगवान्पर छोड़ देना श्रेयस्कर है।",
      en: "The outcome is uncertain — it is better to leave it in the Lord's hands." },
    { start: 0, lines: ["सुनु सिय सत्य असीस हमारी।", "पूजिहि मन कामना तुम्हारी॥"], good: true,
      place: "यह चौपाई बालकाण्डमें श्रीसीताजीके गौरीपूजनके प्रसंगमें है। गौरीजीने श्रीसीताजीको आशीर्वाद दिया है।",
      fal: "प्रश्नकर्त्ताका प्रश्न उत्तम है, कार्य सिद्ध होगा।",
      en: "Your question is a good one; the work will succeed." },
    { start: 1, lines: ["प्रबिसि नगर कीजे सब काजा।", "हृदयँ राखि कोसलपुर राजा॥"], good: true,
      place: "यह चौपाई सुन्दरकाण्डमें हनुमान्‌जीके लंकामें प्रवेश करनेके समयकी है।",
      fal: "भगवान्‌का स्मरण करके कार्यारम्भ करो, सफलता मिलेगी।",
      en: "Begin the work remembering the Lord, and you will succeed." },
    { start: 2, lines: ["उघरहिं अंत न होइ निबाहू।", "कालनेमि जिमि रावन राहू॥"], good: false,
      place: "यह चौपाई बालकाण्डके आरम्भमें सत्संग-वर्णनके प्रसंगमें है।",
      fal: "इस कार्यमें भलाई नहीं है। कार्यकी सफलतामें सन्देह है।",
      en: "There is no good in this work; its success is doubtful." },
    { start: 3, lines: ["बिधि बस सुजन कुसंगत परहीं।", "फनि मनि सम निज गुन अनुसरहीं॥"], good: false,
      place: "यह चौपाई भी बालकाण्डके आरम्भमें ही सत्संग-वर्णनके प्रसंगकी है।",
      fal: "खोटे मनुष्योंका संग छोड़ दो। कार्य पूर्ण होनेमें सन्देह है।",
      en: "Give up bad company; completion of the work is doubtful." },
    { start: 5, lines: ["मुद मंगलमय संत समाजू।", "जो जग जंगम तीरथराजू॥"], good: true,
      place: "यह चौपाई बालकाण्डमें संत-समाजरूपी तीर्थके वर्णनमें है।",
      fal: "प्रश्न उत्तम है। कार्य सिद्ध होगा।",
      en: "A good question; the work will succeed." },
    { start: 6, lines: ["गरल सुधा रिपु करहिं मिताई।", "गोपद सिंधु अनल सितलाई॥"], good: true,
      place: "यह चौपाई श्रीहनुमान्‌जीके लंकामें प्रवेश करनेके समयकी है।",
      fal: "प्रश्न बहुत श्रेष्ठ है। कार्य सफल होगा।",
      en: "An excellent question; the work will be fruitful." },
    { start: 7, lines: ["बरुन कुबेर सुरेस समीरा।", "रन सन्मुख धरि काहँु न धीरा॥"], good: false,
      place: "यह चौपाई लंकाकाण्डमें रावणकी मृत्युके पश्चात् मन्दोदरीके विलापके प्रसंगमें है।",
      fal: "कार्य पूर्ण होनेमें सन्देह है।",
      en: "Completion of the work is doubtful." },
    { start: 8, lines: ["सुफल मनोरथ होहुँ तुम्हारे।", "रामु लखनु सुनि भए सुखारे॥"], good: true,
      place: "यह चौपाई बालकाण्डमें पुष्पवाटिकासे पुष्प लानेपर विश्वामित्रजीका आशीर्वाद है।",
      fal: "प्रश्न बहुत उत्तम है। कार्य सिद्ध होगा।",
      en: "A very good question; the work will succeed." }
  ];
  function chaupaiFor(cell) {
    for (var k = 0; k < CHAUPAIS.length; k++) if (CHAUPAIS[k].start % STEP === cell % STEP) return k;
    return 0;
  }
  function walk(cell, len) {           // the cells visited from `cell`, every 9th, wrapping round
    var out = [];
    for (var i = 0; i < (len || LOOP); i++) out.push((cell + STEP * i) % N);
    return out;
  }

  /* ---------------- ranks and badges ---------------- */
  var RANKS = [
    { at: 0,   hi: "जिज्ञासु",  en: "Seeker" },
    { at: 40,  hi: "साधक",     en: "Sadhak" },
    { at: 120, hi: "भक्त",      en: "Bhakt" },
    { at: 260, hi: "रामसेवक",  en: "Ram-sevak" },
    { at: 500, hi: "रामदूत",    en: "Ram-doot" }
  ];
  var BADGES = [
    { id: "first",   icon: "🪔", hi: "प्रथम शलाका",     en: "First Shalaka",    hiD: "पहला प्रश्न पूछा",             test: function (s) { return s.asked >= 1; } },
    { id: "ten",     icon: "🔟", hi: "दस प्रश्न",        en: "Ten questions",    hiD: "दस बार शलाका देखी",           test: function (s) { return s.asked >= 10; } },
    { id: "s3",      icon: "🔥", hi: "तीन दिन",         en: "3-day streak",     hiD: "लगातार ३ दिन",                test: function (s) { return s.streak.best >= 3; } },
    { id: "s7",      icon: "📿", hi: "सप्ताह-साधना",    en: "Week of sadhana",  hiD: "लगातार ७ दिन",                test: function (s) { return s.streak.best >= 7; } },
    { id: "s21",     icon: "🌺", hi: "इक्कीस दिन",       en: "21-day streak",    hiD: "लगातार २१ दिन",               test: function (s) { return s.streak.best >= 21; } },
    { id: "five",    icon: "📜", hi: "पाँच चौपाइयाँ",    en: "Five chaupais",    hiD: "पाँच चौपाइयाँ संग्रह में",      test: function (s) { return foundCount(s) >= 5; } },
    { id: "nine",    icon: "💎", hi: "नवरत्न",           en: "Navaratna",        hiD: "नौ की नौ चौपाइयाँ मिलीं",      test: function (s) { return foundCount(s) >= 9; } },
    { id: "counter", icon: "🎯", hi: "गणना-निपुण",      en: "Master counter",   hiD: "अभ्यास में बिना भूल के ३ तारे",  test: function (s) { return s.practice.perfect >= 1; } }
  ];

  /* ---------------- helpers ---------------- */
  var helpers = { tx: null, toast: null };
  function T(hi, en) { return helpers.tx ? helpers.tx(hi, en) : hi; }
  function toast(m) { if (helpers.toast) helpers.toast(m); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var DEV = "०१२३४५६७८९";
  function dev(n) { return isEn() ? String(n) : String(n).replace(/\d/g, function (d) { return DEV.charAt(+d); }); }
  function isEn() { return T("hi", "en") === "en"; }
  // how many akshars a cell holds (a conjunct such as "म्हा" or "त्य" counts as one)
  function akshars(c) {
    var n = 0, prev = "";
    for (var i = 0; i < c.length; i++) {
      var ch = c.charAt(i);
      if (/[\u0915-\u0939\u0958-\u095F]/.test(ch) && prev !== "\u094D") n++;
      prev = ch;
    }
    return n;
  }
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var LS = "swadhyay_shalaka_v1";
  function blank() {
    return { found: {}, asked: 0, points: 0, streak: { last: "", count: 0, best: 0 }, badges: {}, practice: { rounds: 0, perfect: 0, stars: 0 } };
  }
  function load() {
    var s = blank();
    try {
      var v = JSON.parse(localStorage.getItem(LS));
      if (v && typeof v === "object") {
        s.found = v.found || {}; s.asked = +v.asked || 0; s.points = +v.points || 0;
        s.streak = { last: (v.streak && v.streak.last) || "", count: (v.streak && +v.streak.count) || 0, best: (v.streak && +v.streak.best) || 0 };
        s.badges = v.badges || {};
        s.practice = { rounds: (v.practice && +v.practice.rounds) || 0, perfect: (v.practice && +v.practice.perfect) || 0, stars: (v.practice && +v.practice.stars) || 0 };
      }
    } catch (e) {}
    return s;
  }
  var save_ = load();
  function save() { try { localStorage.setItem(LS, JSON.stringify(save_)); } catch (e) {} }
  function foundCount(s) { return Object.keys((s || save_).found).length; }
  function today() {
    var d = new Date(), p = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); var p = function (n) { return n < 10 ? "0" + n : "" + n; }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  function rankIdx(pts) { var r = 0; RANKS.forEach(function (x, i) { if (pts >= x.at) r = i; }); return r; }
  function checkBadges() {
    var gained = [];
    BADGES.forEach(function (b) {
      if (!save_.badges[b.id] && b.test(save_)) { save_.badges[b.id] = today(); gained.push(b); }
    });
    return gained;
  }
  function announce(badges) {
    badges.forEach(function (b, i) { setTimeout(function () { toast(b.icon + " " + T("नया बैज: ", "New badge: ") + T(b.hi, b.en)); }, 900 + i * 1800); });
  }

  /* ---------------- state ---------------- */
  var S = null, root = null, timers = [];
  function resetState() {
    clearTimers();
    S = { tab: "play", phase: "dhyan", meditating: false, cell: null, k: null, step: 0, gain: null, fresh: false, open: null,
          prac: null };
  }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  resetState();

  /* ---------------- pieces of markup ---------------- */
  function tabsHtml() {
    var tabs = [["play", "प्रश्न पूछें", "Ask"], ["practice", "अभ्यास", "Practice"], ["mine", "मेरा संग्रह", "My collection"]];
    return '<div class="sh-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" role="tab" class="sh-tab' + (S.tab === t[0] ? " is-active" : "") + '" data-sh="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + esc(T(t[1], t[2])) + '</button>';
    }).join("") + '</div>';
  }
  function gridHtml(cls) {
    return '<div class="sh-grid ' + (cls || "") + '" role="grid" aria-label="' + esc(T("श्रीरामशलाका-प्रश्नावली", "Shri Ram Shalaka grid")) + '">' +
      CELLS.map(function (c, i) {
        return '<button type="button" role="gridcell" class="sh-cell' + (c === NB ? " is-matra" : "") + '" data-c="' + i + '" aria-label="' +
          esc(T("कोष्ठक ", "Cell ") + (i + 1)) + '">' + esc(c) + '</button>';
      }).join("") + '</div>';
  }
  function cellEl(i) { return root ? root.querySelector('.sh-cell[data-c="' + i + '"]') : null; }

  /* ---------------- views ---------------- */
  var BOW = '<img src="assets/images/shalaka/bow.webp" alt="" width="360" height="360" decoding="async">';

  function head() {
    var r = rankIdx(save_.points), nxt = RANKS[r + 1];
    var pct = nxt ? Math.round((save_.points - RANKS[r].at) / (nxt.at - RANKS[r].at) * 100) : 100;
    function stat(cls, icon, inner) {
      return '<button type="button" class="sr-stat ' + cls + '" data-sh="tab" data-tab="mine"><span class="sr-stat-ic" aria-hidden="true">' + icon + '</span><span class="sr-stat-tx">' + inner + '</span><i class="sr-chev" aria-hidden="true">›</i></button>';
    }
    return '<header class="sr-hero"><div class="sr-hero-in">' +
      '<div class="sr-title"><span class="sr-bow">' + BOW + '</span><div>' +
      '<h1>' + esc(T("श्रीरामशलाका-प्रश्नावली", "Shri Ram Shalaka")) + '</h1>' +
      '<p class="sr-tag">' + esc(T("श्रीरामचरितमानस की एक पावन परम्परा", "A sacred tradition from the Ramcharitmanas")) + '</p>' +
      '<p class="sr-desc">' + esc(T("ध्यान करें, कोष्ठक चुनें और चौपाई से उत्तर पाएँ।", "Meditate, choose a cell and receive your answer as a chaupai.")) + '</p></div></div>' +
      '<div class="sr-stats">' +
      stat("", "🔥", '<b>' + dev(save_.streak.count) + '</b><small>' + esc(T("दिन लगातार", "Day streak")) + '</small>') +
      stat("", "📜", '<b>' + dev(foundCount()) + ' / ' + dev(CHAUPAIS.length) + '</b><small>' + esc(T("चौपाइयाँ मिलीं", "Chaupais found")) + '</small>') +
      stat("sr-stat-rank", "🪔", '<b>' + esc(T(RANKS[r].hi, RANKS[r].en)) + '</b><span class="sh-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><small>' +
        dev(save_.points) + (nxt ? " / " + dev(nxt.at) : "") + ' ' + esc(T("अंक", "pts")) + '</small>') +
      '</div></div></header>';
  }

  function stepperHtml(cur) {
    var steps = [["ध्यान करें", "Meditate"], ["कोष्ठक चुनें", "Choose a cell"], ["उत्तर पाएँ", "Receive your answer"]];
    return '<ol class="sr-steps" aria-label="' + esc(T("चरण", "Steps")) + '">' + steps.map(function (s, i) {
      var st = i < cur ? "is-done" : i === cur ? "is-cur" : "";
      return '<li class="sr-step ' + st + '"' + (i === cur ? ' aria-current="step"' : '') + '><span class="sr-dot">' + (i < cur ? "✓" : dev(i + 1)) + '</span><span class="sr-step-t">' + esc(T(s[0], s[1])) + '</span></li>';
    }).join("") + '</ol>';
  }

  function meditateCard() {
    var ph = S.phase, on = ph === "dhyan" && S.meditating;
    var action;
    if (ph !== "dhyan") action = '<p class="sr-done">✓ ' + esc(T("ध्यान पूर्ण", "Meditation done")) + '</p>';
    else if (S.meditating) action = '<p class="sh-mantra" aria-live="polite">' + esc(T("श्रीराम… जय राम… जय जय राम…", "Shri Ram… Jai Ram… Jai Jai Ram…")) + '</p>' +
      '<button type="button" class="sh-btn" data-sh="skip-dhyan">' + esc(T("आगे बढ़ें", "Continue")) + '</button>';
    else action = '<button type="button" class="sh-btn sh-primary" data-sh="begin">🙏 ' + esc(T("ध्यान आरम्भ करें", "Begin")) + '</button>';
    return '<article class="sr-card sr-meditate">' +
      '<div class="sr-photo' + (on ? " is-on" : "") + '" aria-hidden="true"><span class="sr-flame">🪔</span><i class="sr-halo"></i></div>' +
      '<div class="sr-body"><h2>' + esc(T("पहले श्रीराम का ध्यान करें", "First, meditate on Shri Ram")) + '</h2>' +
      '<p>' + esc(T("श्रीरामचन्द्रजी का ध्यान करें, मन को शान्त करें और अपना प्रश्न हृदय में रखें — श्रद्धा और विनम्रता के साथ।", "Think of Shri Ramchandra, calm your mind and hold your question in heart — with faith and humility.")) + '</p>' +
      '<div class="sr-action">' + action + '</div>' +
      '<div class="sr-tips"><h3>🪷 ' + esc(T("ध्यान रखें", "Keep in mind")) + '</h3><ul>' +
      '<li>' + esc(T("शान्त बैठें और कुछ गहरी साँसें लें।", "Sit calmly and take a few deep breaths.")) + '</li>' +
      '<li>' + esc(T("अपना प्रश्न मन में स्पष्ट रखें।", "Clearly hold your question in mind.")) + '</li>' +
      '<li>' + esc(T("श्रद्धा से ग्रिड में कोई एक कोष्ठक चुनें।", "With Shraddha, choose any one cell from the grid.")) + '</li></ul></div></div></article>';
  }

  function gridCard() {
    var ph = S.phase;
    var cls = ph === "dhyan" ? "is-locked" : ph === "pick" ? "is-pick" : ph === "path" ? "is-walking" : "is-done";
    return '<article class="sr-card sr-gridcard"><div class="sr-body">' +
      '<h2>' + esc(T("कोष्ठक चुनें", "Choose a cell")) + '</h2>' +
      '<p>' + esc(ph === "path" ? T("हर नवाँ कोष्ठक गिना जा रहा है…", "Counting every ninth cell…") : T("प्रश्न का चिन्तन करते हुए किसी भी कोष्ठक पर अँगुली रखिए।", "Keep your question in mind and place your finger on any cell.")) + '</p></div>' +
      '<div class="sr-gridwrap">' + gridHtml(cls) +
      (ph === "dhyan" ? '<span class="sr-lock">🔒 ' + esc(T("पहले ध्यान करें", "Meditate first")) + '</span>' : '') + '</div>' +
      (ph === "path"
        ? '<p class="sh-count" aria-live="polite">' + dev(S.step) + ' / ' + dev(LOOP) + '</p>' +
          '<div class="sh-tray" aria-label="' + esc(T("लिखे गये अक्षर", "Letters collected")) + '"></div>' +
          '<div class="sh-actions"><button type="button" class="sh-btn" data-sh="skip-walk">' + esc(T("सीधे उत्तर देखें", "Show the answer")) + '</button></div>'
        : '') +
      '</article>';
  }

  function answerCard() {
    var body = S.phase === "result"
      ? resultHtml()
      : '<div class="sr-empty"><span aria-hidden="true">📜</span><p>' + esc(S.phase === "path" ? T("चौपाई बन रही है…", "Your chaupai is taking shape…") : T("आपका उत्तर यहाँ प्रकट होगा।", "Your answer will appear here.")) + '</p></div>';
    return '<h2 class="sr-ans-title">' + esc(T("आपकी श्रीरामशलाका", "Your Shri Ram Shalaka")) + '</h2>' + body +
      '<aside class="sr-remember"><span aria-hidden="true">🪷</span><div><b>' + esc(T("स्मरण रहे", "Remember")) + '</b><p>' +
      esc(T("यह श्रद्धा और परम्परा पर आधारित है — निर्णय अपने विवेक और परिश्रम से लें।", "This rests on faith and tradition — decide with your own judgement and effort.")) + '</p></div></aside>';
  }

  function playHtml() {
    var ph = S.phase, cur = ph === "dhyan" ? 0 : ph === "result" ? 2 : 1;
    function col(i, inner) { return '<section class="sr-col' + (cur === i ? " is-active" : "") + '">' + inner + '</section>'; }
    return stepperHtml(cur) + '<div class="sr-cols">' + col(0, meditateCard()) + col(1, gridCard()) + col(2, answerCard()) + '</div>';
  }

  function resultHtml() {
    var c = CHAUPAIS[S.k], g = S.gain || {};
    var verdict = c.good
      ? '<span class="sh-verdict is-good">✅ ' + esc(T("शुभ संकेत", "A favourable sign")) + '</span>'
      : '<span class="sh-verdict is-doubt">🤲 ' + esc(T("संशय — भगवान् पर छोड़ें", "Doubtful — leave it to the Lord")) + '</span>';
    return '<article class="sh-card sr-result ' + (c.good ? "is-good" : "is-doubt") + '">' +
      (S.fresh ? '<span class="sh-new">✨ ' + esc(T("नई चौपाई मिली!", "New chaupai!")) + '</span>' : '') +
      verdict +
      '<blockquote class="sh-chaupai"><p>' + esc(c.lines[0]) + '</p><p>' + esc(c.lines[1]) + '</p></blockquote>' +
      '<div class="sr-orn" aria-hidden="true">❁</div>' +
      '<dl class="sh-meta"><dt>' + esc(T("स्थान", "Where")) + '</dt><dd>' + esc(c.place) + '</dd>' +
      '<dt>' + esc(T("फल", "Result")) + '</dt><dd>' + esc(c.fal) + (isEn() ? '<br><em>' + esc(c.en) + '</em>' : '') + '</dd></dl>' +
      '<p class="sh-gain">' + [g.points ? "+" + dev(g.points) + " " + T("अंक", "pts") : "", g.card ? "📜 " + T("नया कार्ड", "new card") : "", g.streak ? "🔥 " + dev(save_.streak.count) + " " + T("दिन", save_.streak.count === 1 ? "day" : "days") : ""].filter(Boolean).join(" · ") + '</p>' +
      '<div class="sh-actions"><button type="button" class="sh-btn sh-primary" data-sh="again">🔁 ' + esc(T("फिर से पूछें", "Ask again")) + '</button>' +
      '<button type="button" class="sh-btn" data-sh="share">↗ ' + esc(T("शेयर करें", "Share")) + '</button></div>' +
      '</article>';
  }

  function practiceHtml() {
    var P = S.prac;
    if (!P) {
      return '<section class="sh-stage"><h2>🎯 ' + esc(T("विधि सीखें — अभ्यास", "Learn the method — practice")) + '</h2>' +
        '<ol class="sh-rules">' +
        '<li>' + esc(T("एक कोष्ठक से आरम्भ करें और उससे ९ कोष्ठक आगे बढ़ें (पंक्ति पूरी होने पर अगली पंक्ति में; अन्तिम के बाद फिर आरम्भ से)।", "Start at a cell and move 9 cells ahead (onto the next row at the end of a row; back to the start after the last cell).")) + '</li>' +
        '<li>' + esc(T("किसी कोष्ठक में केवल ‘ा’ की मात्रा हो सकती है — उसे पिछले अक्षर में जोड़ें।", "A cell may hold only the ‘ा’ matra — add it to the previous letter.")) + '</li>' +
        '<li>' + esc(T("किसी कोष्ठक में दो अक्षर भी हो सकते हैं — उसे एक ही कोष्ठक गिनें।", "A cell may hold two letters — count it as one cell.")) + '</li></ol>' +
        '<p>' + esc(T("दस कदम चलकर देखिए। बिना भूल के ३ तारे!", "Walk ten steps. No mistakes earns 3 stars!")) + '</p>' +
        '<p class="sh-best">⭐ ' + dev(save_.practice.stars) + ' · ' + esc(T("अभ्यास", "rounds")) + ' ' + dev(save_.practice.rounds) + '</p>' +
        '<button type="button" class="sh-btn sh-primary" data-sh="prac-start">▶ ' + esc(T("अभ्यास आरम्भ करें", "Start practice")) + '</button></section>';
    }
    if (P.done) {
      var stars = P.mistakes === 0 ? 3 : P.mistakes <= 2 ? 2 : 1;
      return '<section class="sh-stage"><h2>' + esc(T("अभ्यास पूर्ण!", "Round complete!")) + '</h2>' +
        '<p class="sh-stars" aria-label="' + stars + '">' + "⭐".repeat(stars) + "☆".repeat(3 - stars) + '</p>' +
        '<p>' + esc(T("भूलें", "Mistakes")) + ': ' + dev(P.mistakes) + ' · ' + esc(T("अंक", "Points")) + ': +' + dev(P.points) + '</p>' +
        '<div class="sh-actions"><button type="button" class="sh-btn sh-primary" data-sh="prac-start">🔁 ' + esc(T("एक और बार", "Another round")) + '</button></div></section>' +
        gridHtml("is-done");
    }
    return '<section class="sh-stage"><h2>' + esc(T("अगला कोष्ठक चुनें", "Tap the next cell")) + '</h2>' +
      '<p class="sh-count">' + dev(P.i) + ' / ' + dev(P.total) + ' · ' + esc(T("अंक", "pts")) + ' ' + dev(P.points) + (P.combo > 1 ? ' · 🔥×' + dev(P.combo) : '') + '</p>' +
      '<p class="sh-hintline" aria-live="polite">' + (P.hint ? esc(P.hint) : esc(T("चमकते कोष्ठक से ९ कोष्ठक आगे…", "Nine cells ahead of the glowing cell…"))) + '</p></section>' +
      gridHtml("is-practice") +
      '<div class="sh-actions"><button type="button" class="sh-btn" data-sh="prac-hint">💡 ' + esc(T("संकेत", "Hint")) + '</button>' +
      '<button type="button" class="sh-btn" data-sh="prac-quit">' + esc(T("छोड़ें", "Quit")) + '</button></div>';
  }

  function mineHtml() {
    var r = rankIdx(save_.points);
    var cards = CHAUPAIS.map(function (c, k) {
      var f = save_.found[k];
      if (!f) {
        return '<div class="sh-mini is-locked"><span class="sh-q">?</span><small>' + esc(T("प्रश्न पूछकर पाएँ", "Ask to unlock")) + '</small></div>';
      }
      var open = S.open === k;
      return '<button type="button" class="sh-mini ' + (c.good ? "is-good" : "is-doubt") + (open ? " is-open" : "") + '" data-sh="open" data-k="' + k + '">' +
        '<span class="sh-mini-t">' + esc(c.lines[0].split(" ").slice(0, 3).join(" ")) + '…</span>' +
        '<small>×' + dev(f.n) + '</small></button>';
    }).join("");
    var detail = "";
    if (S.open != null && save_.found[S.open]) {
      var c = CHAUPAIS[S.open];
      detail = '<article class="sh-card ' + (c.good ? "is-good" : "is-doubt") + ' sh-detail">' +
        '<blockquote class="sh-chaupai"><p>' + esc(c.lines[0]) + '</p><p>' + esc(c.lines[1]) + '</p></blockquote>' +
        '<dl class="sh-meta"><dt>' + esc(T("स्थान", "Where")) + '</dt><dd>' + esc(c.place) + '</dd><dt>' + esc(T("फल", "Result")) + '</dt><dd>' + esc(c.fal) + '</dd></dl></article>';
    }
    var badges = BADGES.map(function (b) {
      var got = save_.badges[b.id];
      return '<li class="sh-badge' + (got ? " is-got" : "") + '"><span class="sh-bi">' + (got ? b.icon : "🔒") + '</span><div><b>' + esc(T(b.hi, b.en)) + '</b><small>' + esc(b.hiD) + '</small></div></li>';
    }).join("");
    return '<section class="sh-stage sh-left"><h2>📜 ' + esc(T("चौपाई-संग्रह", "Chaupai collection")) + ' <span class="sh-cnt">' + dev(foundCount()) + '/९</span></h2>' +
      '<div class="sh-minis">' + cards + '</div>' + detail + '</section>' +
      '<section class="sh-stage sh-left"><h2>🏅 ' + esc(T("बैज", "Badges")) + '</h2><ul class="sh-badges">' + badges + '</ul>' +
      '<p class="sh-note">' + esc(T("पद: ", "Rank: ")) + esc(T(RANKS[r].hi, RANKS[r].en)) + ' · ' + esc(T("कुल प्रश्न: ", "Questions asked: ")) + dev(save_.asked) + '</p></section>';
  }

  function pageInner() {
    var body = S.tab === "play" ? playHtml() : S.tab === "practice" ? practiceHtml() : mineHtml();
    return head() + '<main class="content-pad sh-wrap sr-wrap">' + tabsHtml() + '<div class="sh-body sr-body-wrap">' + body + '</div></main>';
  }
  function paint() {
    if (!root) return;
    root.innerHTML = pageInner();
    afterPaint();
  }
  function afterPaint() {
    if (S.tab === "practice" && S.prac && !S.prac.done) paintPractice();
    if (S.tab === "play" && S.phase === "result") {
      if (S.cell != null) {            // leave the walked path lit on the grid beside the answer
        walk(S.cell).forEach(function (c) { var e = cellEl(c); if (e) e.classList.add("is-hit"); });
        var st = cellEl(S.cell); if (st) st.classList.add("is-start");
      }
      var c = root.querySelector(".sr-result"); if (c && c.scrollIntoView && S.justFinished) { S.justFinished = false; try { c.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); } catch (e) {} }
    }
  }

  /* ---------------- play flow ---------------- */
  function begin() {
    if (S.meditating) return;
    S.meditating = true; paint();
    later(function () { if (S.phase === "dhyan") toPick(); }, reduced ? 600 : 4200);
  }
  function toPick() { S.phase = "pick"; S.meditating = false; paint(); }

  function choose(cell) {
    S.cell = cell; S.k = chaupaiFor(cell); S.step = 0; S.phase = "path";
    paint();
    var path = walk(cell), tray = root.querySelector(".sh-tray");
    var first = cellEl(cell); if (first) first.classList.add("is-start");
    var i = 0;
    (function tick() {
      if (S.phase !== "path") return;
      if (i >= path.length) { later(finish, reduced ? 0 : 700); return; }
      var el = cellEl(path[i]);
      if (el) el.classList.add("is-hit");
      S.step = i + 1;
      var cnt = root.querySelector(".sh-count"); if (cnt) cnt.textContent = dev(S.step) + " / " + dev(LOOP);
      addToTray(tray, CELLS[path[i]]);
      i++;
      later(tick, reduced ? 0 : 210);
    })();
  }
  function addToTray(tray, text) {
    if (!tray) return;
    if (text === NB && tray.lastChild) { tray.lastChild.textContent += "ा"; tray.lastChild.classList.add("has-matra"); return; }
    var s = document.createElement("span"); s.textContent = text; tray.appendChild(s);
  }

  function finish() {
    if (S.phase !== "path") return;
    clearTimers();
    var k = S.k, gain = { points: 10, card: false, streak: false };
    var f = save_.found[k];
    S.fresh = !f;
    if (!f) { save_.found[k] = { n: 1, first: today() }; gain.points += 25; gain.card = true; }
    else f.n++;
    save_.asked++;
    var t = today();
    if (save_.streak.last !== t) {
      save_.streak.count = save_.streak.last === yesterday() ? save_.streak.count + 1 : 1;
      save_.streak.last = t;
      if (save_.streak.count > save_.streak.best) save_.streak.best = save_.streak.count;
      gain.streak = true;
    }
    save_.points += gain.points;
    var badges = checkBadges();
    save();
    S.gain = gain; S.phase = "result"; S.justFinished = true;
    paint();
    announce(badges);
  }
  function skipWalk() {
    if (S.phase !== "path") return;
    clearTimers(); finish();
  }
  function again() { clearTimers(); S.phase = "dhyan"; S.meditating = false; S.cell = null; S.k = null; S.gain = null; S.fresh = false; paint(); }

  function shareResult() {
    var c = CHAUPAIS[S.k];
    var text = "🏹 श्रीरामशलाका-प्रश्नावली\n\n“" + c.lines[0] + " " + c.lines[1] + "”\n\nफल — " + c.fal + "\n\n" + location.origin + "/shalaka";
    if (navigator.share) { navigator.share({ title: "श्रीरामशलाका-प्रश्नावली", text: text }).catch(function () {}); return; }
    var done = function () { toast(T("कॉपी हो गया", "Copied")); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
  }

  /* ---------------- practice ---------------- */
  function pracStart() {
    var start = Math.floor(Math.random() * N);
    S.prac = { start: start, cur: start, i: 0, total: 10, mistakes: 0, points: 0, combo: 0, hint: "", done: false };
    paint();
  }
  function nextCell(P) { return (P.cur + STEP) % N; }
  function paintPractice() {
    var P = S.prac; if (!P) return;
    Array.prototype.forEach.call(root.querySelectorAll(".sh-cell"), function (el) { el.classList.remove("is-start", "is-hit", "is-now", "is-hint", "is-bad"); });
    walk(P.start, P.i + 1).forEach(function (c) { var el = cellEl(c); if (el) el.classList.add("is-hit"); });
    var s = cellEl(P.start); if (s) s.classList.add("is-start");
    var now = cellEl(P.cur); if (now) now.classList.add("is-now");
  }
  function pracTap(cell) {
    var P = S.prac; if (!P || P.done) return;
    var target = nextCell(P);
    if (cell === target) {
      P.cur = target; P.i++; P.combo++; P.points += 2 + (P.combo >= 5 ? 1 : 0);
      P.hint = CELLS[target] === NB ? T("‘ा’ की मात्रा वाला कोष्ठक — पिछले अक्षर में जोड़ें!", "An ‘ा’-only cell — add it to the previous letter!")
        : akshars(CELLS[target]) > 1 ? T("एक कोष्ठक में दो अक्षर — फिर भी एक ही कोष्ठक गिना!", "Two letters in one cell — still counted as one cell!") : "";
      if (P.i >= P.total) { finishPractice(); return; }
      paintHeader(); paintPractice();
    } else {
      P.mistakes++; P.combo = 0;
      P.hint = T("चमकते कोष्ठक से ठीक ९ आगे गिनिए — बाएँ से दाएँ; पंक्ति पूरी हो तो अगली पंक्ति से।", "Count exactly 9 ahead of the glowing cell — left to right, continuing on the next row.");
      var el = cellEl(cell); if (el) { el.classList.add("is-bad"); setTimeout(function () { el.classList.remove("is-bad"); }, 450); }
      paintHeader();
    }
  }
  function paintHeader() {
    var P = S.prac; if (!P) return;
    var cnt = root.querySelector(".sh-count"), hl = root.querySelector(".sh-hintline");
    if (cnt) cnt.textContent = dev(P.i) + " / " + dev(P.total) + " · " + T("अंक", "pts") + " " + dev(P.points) + (P.combo > 1 ? " · 🔥×" + dev(P.combo) : "");
    if (hl) hl.textContent = P.hint || T("चमकते कोष्ठक से ९ कोष्ठक आगे…", "Nine cells ahead of the glowing cell…");
  }
  function pracHint() {
    var P = S.prac; if (!P || P.done) return;
    P.points = Math.max(0, P.points - 2);
    var el = cellEl(nextCell(P)); if (el) { el.classList.add("is-hint"); setTimeout(function () { el.classList.remove("is-hint"); }, 1400); }
    paintHeader();
  }
  function finishPractice() {
    var P = S.prac; P.done = true;
    var stars = P.mistakes === 0 ? 3 : P.mistakes <= 2 ? 2 : 1;
    save_.practice.rounds++; save_.practice.stars += stars; if (stars === 3) save_.practice.perfect++;
    save_.points += P.points + stars * 3;
    var badges = checkBadges(); save(); paint(); announce(badges);
    // paint() shows the finished grid; mark the walk on it
    walk(P.start, P.total + 1).forEach(function (c) { var el = cellEl(c); if (el) el.classList.add("is-hit"); });
  }

  /* ---------------- events ---------------- */
  function onClick(e) {
    var cellBtn = e.target.closest && e.target.closest(".sh-cell");
    if (cellBtn) {
      var c = +cellBtn.getAttribute("data-c");
      if (S.tab === "play" && S.phase === "pick") choose(c);
      else if (S.tab === "practice" && S.prac && !S.prac.done) pracTap(c);
      return;
    }
    var b = e.target.closest && e.target.closest("[data-sh]");
    if (!b) return;
    var a = b.getAttribute("data-sh");
    if (a === "tab") { var t = b.getAttribute("data-tab"); if (t !== S.tab) { clearTimers(); if (S.phase === "path") { S.phase = "pick"; } S.tab = t; S.open = null; paint(); } }
    else if (a === "begin") begin();
    else if (a === "skip-dhyan") { clearTimers(); toPick(); }
    else if (a === "skip-walk") skipWalk();
    else if (a === "again") again();
    else if (a === "share") shareResult();
    else if (a === "prac-start") pracStart();
    else if (a === "prac-hint") pracHint();
    else if (a === "prac-quit") { S.prac = null; paint(); }
    else if (a === "open") { var k = +b.getAttribute("data-k"); S.open = S.open === k ? null : k; paint(); }
  }

  window.SwadhyayShalaka = {
    pageHtml: function () {
      resetState();
      return '<section class="sh-root sr-page" data-shalaka></section>';   // the hero runs edge to edge; the rest sits in <main>
    },
    mount: function (h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      var el = document.querySelector("[data-shalaka]");
      clearTimers();
      root = el || null;
      if (!root) return;
      root.addEventListener("click", onClick);
      paint();
    }
  };
})();

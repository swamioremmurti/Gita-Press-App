/* हनुमान प्रश्नावली यन्त्र as a game.

   The yantra is a triangle of 49 small triangles, each marked with a number from 1 to 49; each
   number has a printed answer. Following the usual vidhi: bathe and wear clean clothes, chant
   "ॐ रां रामाय नमः" five times and "ॐ हनुमते नमः" eleven times (or, in the short form,
   "ॐ ऐं ह्रीं हनुमते राम दूताय नमः" seven times), remember Hanumanji with the question in mind,
   then let the cursor wander over the yantra and stop it -- the number it rests on is the answer.
   The tradition allows ONE question a day (a second one gives a wrong answer), so the page keeps
   that rule: one question per day, and today's answer stays on show until tomorrow.

   What the page adds: the vidhi as steps with a japa counter, a wandering cursor you stop, a
   collection of the 49 answers drawn on the yantra itself, a daily streak (Tuesday being Hanumanji's
   day), a rank, badges, and a 108-bead japa mala.

   Saved in localStorage (swadhyay_hanuman_v1, optional). The question itself is never stored.
   Generic pieces (stats, tabs, buttons, cards, badges) reuse the .sh-* classes of swadhyay-shalaka.js
   and the page-specific parts are .hn-*.

   Public API: window.SwadhyayHanuman.pageHtml(), .mount({ tx, toast })                          */
(function () {
  "use strict";

  /* ---------------- the yantra: [number, "dn"|"up", triangle points, text x, text y, printed label] ---------------- */
  var TRI = [
    [1, "dn", "50 110 150 110 100 196.6", 100, 139, "१"],
    [23, "up", "100 196.6 200 196.6 150 110", 150, 168, "२३"],
    [43, "dn", "150 110 250 110 200 196.6", 200, 139, "४३"],
    [15, "up", "200 196.6 300 196.6 250 110", 250, 168, "१५"],
    [32, "dn", "250 110 350 110 300 196.6", 300, 139, "३२"],
    [48, "up", "300 196.6 400 196.6 350 110", 350, 168, "४८"],
    [21, "dn", "350 110 450 110 400 196.6", 400, 139, "२१"],
    [9, "up", "400 196.6 500 196.6 450 110", 450, 168, "०९"],
    [35, "dn", "450 110 550 110 500 196.6", 500, 139, "३५"],
    [30, "up", "500 196.6 600 196.6 550 110", 550, 168, "३०"],
    [12, "dn", "550 110 650 110 600 196.6", 600, 139, "१२"],
    [22, "up", "600 196.6 700 196.6 650 110", 650, 168, "२२"],
    [4, "dn", "650 110 750 110 700 196.6", 700, 139, "०४"],
    [49, "dn", "100 196.6 200 196.6 150 283.2", 150, 225.5, "४९"],
    [36, "up", "150 283.2 250 283.2 200 196.6", 200, 254.3, "३६"],
    [42, "dn", "200 196.6 300 196.6 250 283.2", 250, 225.5, "४२"],
    [20, "up", "250 283.2 350 283.2 300 196.6", 300, 254.3, "२०"],
    [6, "dn", "300 196.6 400 196.6 350 283.2", 350, 225.5, "०६"],
    [47, "up", "350 283.2 450 283.2 400 196.6", 400, 254.3, "४७"],
    [38, "dn", "400 196.6 500 196.6 450 283.2", 450, 225.5, "३८"],
    [13, "up", "450 283.2 550 283.2 500 196.6", 500, 254.3, "१३"],
    [41, "dn", "500 196.6 600 196.6 550 283.2", 550, 225.5, "४१"],
    [37, "up", "550 283.2 650 283.2 600 196.6", 600, 254.3, "३७"],
    [19, "dn", "600 196.6 700 196.6 650 283.2", 650, 225.5, "१९"],
    [8, "dn", "150 283.2 250 283.2 200 369.8", 200, 312.1, "०८"],
    [24, "up", "200 369.8 300 369.8 250 283.2", 250, 341.0, "२४"],
    [31, "dn", "250 283.2 350 283.2 300 369.8", 300, 312.1, "३१"],
    [16, "up", "300 369.8 400 369.8 350 283.2", 350, 341.0, "१६"],
    [3, "dn", "350 283.2 450 283.2 400 369.8", 400, 312.1, "०३"],
    [29, "up", "400 369.8 500 369.8 450 283.2", 450, 341.0, "२९"],
    [45, "dn", "450 283.2 550 283.2 500 369.8", 500, 312.1, "४५"],
    [34, "up", "500 369.8 600 369.8 550 283.2", 550, 341.0, "३४"],
    [25, "dn", "550 283.2 650 283.2 600 369.8", 600, 312.1, "२५"],
    [33, "dn", "200 369.8 300 369.8 250 456.4", 250, 398.7, "३३"],
    [46, "up", "250 456.4 350 456.4 300 369.8", 300, 427.6, "४६"],
    [26, "dn", "300 369.8 400 369.8 350 456.4", 350, 398.7, "२६"],
    [10, "up", "350 456.4 450 456.4 400 369.8", 400, 427.6, "१०"],
    [40, "dn", "400 369.8 500 369.8 450 456.4", 450, 398.7, "४०"],
    [27, "up", "450 456.4 550 456.4 500 369.8", 500, 427.6, "२७"],
    [14, "dn", "500 369.8 600 369.8 550 456.4", 550, 398.7, "१४"],
    [5, "dn", "250 456.4 350 456.4 300 543.0", 300, 485.3, "०५"],
    [44, "up", "300 543.0 400 543.0 350 456.4", 350, 514.2, "४४"],
    [17, "dn", "350 456.4 450 456.4 400 543.0", 400, 485.3, "१७"],
    [39, "up", "400 543.0 500 543.0 450 456.4", 450, 514.2, "३९"],
    [7, "dn", "450 456.4 550 456.4 500 543.0", 500, 485.3, "०७"],
    [28, "dn", "300 543.0 400 543.0 350 629.6", 350, 571.9, "२८"],
    [11, "up", "350 629.6 450 629.6 400 543.0", 400, 600.8, "११"],
    [18, "dn", "400 543.0 500 543.0 450 629.6", 450, 571.9, "१८"],
    [2, "dn", "350 629.6 450 629.6 400 716.2", 400, 658.5, "०२"]
  ];
  var BY_N = {};
  TRI.forEach(function (t) { BY_N[t[0]] = t; });

  /* ---------------- the 49 answers, as printed ---------------- */
  var ANS = [
    "", /* 0 unused */
    "आपका कार्य शीघ्र पूरा होगा।",
    "आपके कार्य में समय लगेगा। मंगलवार का व्रत करें।",
    "प्रतिदिन हनुमान चालीसा का पाठ करें, तो कार्य शीघ्र पूरा होगा।",
    "कार्य पूर्ण नहीं होगा।",
    "कार्य शीघ्र होगा, किंतु अन्य व्यक्ति की सहायता लेनी पड़ेगी।",
    "कोई व्यक्ति आपके कार्यों में रोड़े अटका रहा है, बजरंग बाण का पाठ करें।",
    "आपके कार्य में किसी स्त्री की सहायता अपेक्षित है।",
    "आपका कार्य नहीं होगा, कोई अन्य कार्य करें।",
    "कार्यसिद्धि के लिए यात्रा करनी पड़ेगी।",
    "मंगलवार का व्रत रखें और हनुमानजी को चोला चढ़ाएं, तो मनोकामना पूर्ण होगी।",
    "आपकी मनोकामना शीघ्र पूरी होगी। सुंदरकांड का पाठ करें।",
    "आपके शत्रु बहुत हैं। कार्य नहीं होने देंगे।",
    "पीपल के वृक्ष की पूजा करें। एक माह बाद कार्य सिद्ध होगा।",
    "आपको शीघ्र लाभ होने वाला है। मंगलवार के दिन गाय को गुड़-चना खिलाएं।",
    "शरीर स्वस्थ रहेगा, चिंताएं दूर होंगी।",
    "परिवार में वृद्धि होगी। माता-पिता की सेवा करें और रामचरितमानस के बाल काण्ड का पाठ करें।",
    "कुछ दिन चिंता रहेगी। ऊं हनुमते नम: मंत्र की प्रतिदिन एक माला का जाप करें।",
    "हनुमानजी के पूजन एवं दर्शन से मनोकामना पूर्ण होगी।",
    "आपको व्यवसाय द्वारा लाभ होगा। दक्षिण दिशा में व्यापारिक संबंध बढ़ाएं।",
    "ऋण से छुटकारा, धन की प्राप्ति तथा सुख की उपलब्धि शीघ्र होने वाली है। हनुमान चालीसा का पाठ करें।",
    "श्रीरामचंद्रजी की कृपा से धन मिलेगा। श्रीसीताराम के नाम की पांच माला जप रोज करें।",
    "अभी कठिनाइयों का सामना करना पड़ेगा पर अंत में विजय आपकी होगी।",
    "आपके दिन ठीक नहीं है। रोजाना हनुमानजी का पूजन करें। मंगलवार को चोला चढ़ाएं। संकटों से मुक्ति मिलेगी।",
    "आपके घर वाले ही विरोध में हैं। उन्हें अनुकूल बनाने के लिए पूर्णिमा का व्रत करें।",
    "आपको शीघ्र शुभ समाचार मिलेगा।",
    "हर काम सोच-समझकर करें।",
    "स्त्री पक्ष से आपको लाभ होगा। दुर्गासप्तशती का पाठ करें।",
    "अभी कुछ महीनों तक परेशानी है।",
    "अभी आपके कार्य की सिद्धि में विलंब है।",
    "आपके मित्र ही आपको धोखा देंगे। सोमवार का व्रत करें।",
    "संतान का सुख प्राप्त होगा। भगवान शिव की आराधना करें व शिवमहिम्नस्तोत्र का पाठ करें।",
    "आपके दुश्मन आपको परेशान कर रहे हैं। रोज पार्थिव शिवलिंग का पूजन कर शिव ताण्डव स्तोत्र का पाठ करें। सोमवार को ब्राह्मणों को भोजन कराएं।",
    "कोई स्त्री आपको धोखा देना चाहती है, सावधान रहें।",
    "आपके भाई-बंधु विरोध कर रहे हैं। गुरुवार का व्रत रखें।",
    "नौकरी से आपको लाभ होगा। पदोन्नति संभव है, पूर्णिमा का व्रत रख कथा कराएं।",
    "आपके लिए यात्रा शुभदायक रहेगी। आपके अच्छे दिन आ गए हैं।",
    "पुत्र आपकी चिंता का कारण बनेगा। रोज राम नाम की पांच माला का जप करें।",
    "आपको अभी कुछ दिन और परेशानी रहेगी। यथाशक्ति दान-पुण्य और कीर्तन करें।",
    "आपको राजकार्य और मुकद्मे में सफलता मिलेगी। श्रीसीताराम का पूजन करने से लाभ मिलेगा।",
    "अतिशीघ्र आपको यश प्राप्त होगा। हनुमानजी की उपासना करें और रामनाम का जाप करें।",
    "आपकी मनोकामना पूर्ण होगी।",
    "समय अभी अच्छा नहीं है।",
    "आपको आर्थिक कष्ट का सामना करना पड़ेगा।",
    "आपको धन की प्राप्ति होगी।",
    "दाम्पत्य सुख मिलेगा।",
    "संतान सुख की प्राप्ति होने वाली है।",
    "अभी दुर्भाग्य समाप्त नहीं हुआ है। विदेश यात्रा से अवश्य लाभ होगा।",
    "आपका अच्छा समय आने वाला है। सामाजिक और व्यवसायिक क्षेत्र में लाभ मिलेगा।",
    "आपका समय बहुत अच्छा आ रहा है। आपकी प्रत्येक मनोकामना पूर्ण होगी।"
  ];
  // The tone of each answer (my reading of the printed text): g = favourable, r = do a remedy, c = caution / patience
  var TONE = {};
  [1, 5, 7, 9, 11, 14, 15, 16, 18, 19, 20, 21, 22, 25, 27, 31, 35, 36, 39, 40, 41, 44, 45, 46, 48, 49].forEach(function (n) { TONE[n] = "g"; });
  [2, 3, 6, 10, 13, 17, 23, 24, 32, 34, 37, 38, 47].forEach(function (n) { TONE[n] = "r"; });
  [4, 8, 12, 26, 28, 29, 30, 33, 42, 43].forEach(function (n) { TONE[n] = "c"; });
  var TONE_INFO = {
    g: { icon: "✅", hi: "शुभ संकेत", en: "A favourable sign", cls: "is-good" },
    r: { icon: "🙏", hi: "उपाय करें", en: "Do the remedy", cls: "is-remedy" },
    c: { icon: "⚠️", hi: "सावधानी एवं धैर्य", en: "Caution and patience", cls: "is-doubt" }
  };

  /* ---------------- the vidhi ---------------- */
  var METHODS = {
    full:  { hi: "पूर्ण विधि", en: "Full vidhi", steps: [
      { mantra: "ॐ रां रामाय नमः", count: 5 },
      { mantra: "ॐ हनुमते नमः", count: 11 } ] },
    short: { hi: "संक्षिप्त विधि", en: "Short vidhi", steps: [
      { mantra: "ॐ ऐं ह्रीं हनुमते राम दूताय नमः", count: 7 } ] }
  };

  var RANKS = [
    { at: 0,   hi: "भक्त",     en: "Bhakt" },
    { at: 40,  hi: "सेवक",     en: "Sevak" },
    { at: 120, hi: "दास",      en: "Das" },
    { at: 260, hi: "बजरंगी",   en: "Bajrangi" },
    { at: 500, hi: "महावीर",   en: "Mahavir" }
  ];
  var BADGES = [
    { id: "first", icon: "🚩", hi: "प्रथम प्रश्न",   en: "First question", hiD: "पहली बार प्रश्नावली देखी",       test: function (s) { return s.asked >= 1; } },
    { id: "s3",    icon: "🔥", hi: "तीन दिन",       en: "3-day streak",   hiD: "लगातार ३ दिन",                    test: function (s) { return s.streak.best >= 3; } },
    { id: "s7",    icon: "📿", hi: "सप्ताह-साधना",  en: "Week of sadhana", hiD: "लगातार ७ दिन",                  test: function (s) { return s.streak.best >= 7; } },
    { id: "s21",   icon: "🌺", hi: "इक्कीस दिन",     en: "21-day streak",  hiD: "लगातार २१ दिन",                  test: function (s) { return s.streak.best >= 21; } },
    { id: "tue",   icon: "🐒", hi: "मंगल-भक्त",     en: "Tuesday devotee", hiD: "चार मंगलवार को प्रश्न पूछा",     test: function (s) { return s.tuesdays >= 4; } },
    { id: "f10",   icon: "📜", hi: "दस उत्तर",       en: "Ten answers",    hiD: "१० अलग-अलग अंक मिले",             test: function (s) { return found(s) >= 10; } },
    { id: "f25",   icon: "🔱", hi: "आधा यन्त्र",     en: "Half the yantra", hiD: "२५ अलग-अलग अंक मिले",           test: function (s) { return found(s) >= 25; } },
    { id: "f49",   icon: "💎", hi: "सिद्ध यन्त्र",   en: "Siddha yantra",  hiD: "सभी ४९ अंक मिले",                 test: function (s) { return found(s) >= 49; } },
    { id: "mala1", icon: "📿", hi: "पहली माला",     en: "First mala",     hiD: "१०८ जप पूरे किए",                 test: function (s) { return s.japa.malas >= 1; } },
    { id: "mala11", icon: "🏹", hi: "ग्यारह माला",   en: "Eleven malas",   hiD: "११ माला पूरी हुईं",               test: function (s) { return s.japa.malas >= 11; } }
  ];

  /* ---------------- helpers ---------------- */
  var helpers = { tx: null, toast: null };
  function T(hi, en) { return helpers.tx ? helpers.tx(hi, en) : hi; }
  function toast(m) { if (helpers.toast) helpers.toast(m); }
  function isEn() { return T("hi", "en") === "en"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var DEV = "०१२३४५६७८९";
  function dev(n) { return isEn() ? String(n) : String(n).replace(/\d/g, function (d) { return DEV.charAt(+d); }); }
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dayKey(new Date()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
  function msToMidnight() { var d = new Date(); var m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return m - d; }
  function clock(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60); }
  // a tiny buzz on each tap, only after the person has really interacted with the page
  function buzz(ms) {
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { navigator.vibrate(ms); } catch (e) {} }
  }
  function randInt(n) {
    if (window.crypto && crypto.getRandomValues) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }

  var LS = "swadhyay_hanuman_v1";
  function blank() {
    return { found: {}, asked: 0, points: 0, tuesdays: 0, last: null, streak: { last: "", count: 0, best: 0 }, badges: {},
             japa: { total: 0, malas: 0, bead: 0 } };
  }
  function load() {
    var s = blank();
    try {
      var v = JSON.parse(localStorage.getItem(LS));
      if (v && typeof v === "object") {
        s.found = v.found || {}; s.asked = +v.asked || 0; s.points = +v.points || 0; s.tuesdays = +v.tuesdays || 0;
        s.last = v.last && v.last.date ? { date: String(v.last.date), n: +v.last.n } : null;
        s.streak = { last: (v.streak && v.streak.last) || "", count: (v.streak && +v.streak.count) || 0, best: (v.streak && +v.streak.best) || 0 };
        s.badges = v.badges || {};
        s.japa = { total: (v.japa && +v.japa.total) || 0, malas: (v.japa && +v.japa.malas) || 0, bead: (v.japa && +v.japa.bead) || 0 };
      }
    } catch (e) {}
    return s;
  }
  var save_ = load();
  function save() { try { localStorage.setItem(LS, JSON.stringify(save_)); } catch (e) {} }
  function found(s) { return Object.keys((s || save_).found).length; }
  function rankIdx(p) { var r = 0; RANKS.forEach(function (x, i) { if (p >= x.at) r = i; }); return r; }
  function checkBadges() {
    var got = [];
    BADGES.forEach(function (b) { if (!save_.badges[b.id] && b.test(save_)) { save_.badges[b.id] = today(); got.push(b); } });
    return got;
  }
  function announce(list) {
    list.forEach(function (b, i) { setTimeout(function () { toast(b.icon + " " + T("नया बैज: ", "New badge: ") + T(b.hi, b.en)); }, 900 + i * 1800); });
  }

  /* ---------------- state ---------------- */
  var S = null, root = null, timers = [], spinTimer = null, clockTimer = null;
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; if (spinTimer) { clearTimeout(spinTimer); spinTimer = null; } }
  function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } }
  function lockedToday() { return !!(save_.last && save_.last.date === today()); }
  function resetState() {
    clearTimers(); stopClock();
    S = { tab: "play", method: "full", phase: lockedToday() ? "done" : "shuddhi", clean: false, step: 0, beads: 0, thought: false,
          cur: null, spinning: false, n: lockedToday() ? save_.last.n : null, gain: null, fresh: false, open: null, justFinished: false };
  }
  resetState();

  /* ---------------- markup ---------------- */
  function statsHtml() {
    var r = rankIdx(save_.points), nxt = RANKS[r + 1];
    var pct = nxt ? Math.round((save_.points - RANKS[r].at) / (nxt.at - RANKS[r].at) * 100) : 100;
    return '<div class="sh-stats">' +
      '<div class="sh-stat"><b>🔥 ' + dev(save_.streak.count) + '</b><span>' + esc(T("दिन", "day streak")) + '</span></div>' +
      '<div class="sh-stat"><b>🚩 ' + dev(found()) + '/४९</b><span>' + esc(T("अंक मिले", "found")) + '</span></div>' +
      '<div class="sh-stat sh-stat-rank"><b>🪔 ' + esc(T(RANKS[r].hi, RANKS[r].en)) + '</b>' +
      '<span class="sh-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      '<span>' + dev(save_.points) + (nxt ? " / " + dev(nxt.at) + " " : " ") + esc(T("अंक", "pts")) + '</span></div></div>';
  }
  function tabsHtml() {
    var tabs = [["play", "प्रश्न पूछें", "Ask"], ["japa", "जप-माला", "Japa mala"], ["mine", "मेरा यन्त्र", "My yantra"]];
    return '<div class="sh-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" role="tab" class="sh-tab' + (S.tab === t[0] ? " is-active" : "") + '" data-hn="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + esc(T(t[1], t[2])) + '</button>';
    }).join("") + '</div>';
  }
  function head() {
    return '<header class="sh-head"><div><h1>🚩 ' + esc(T("श्री हनुमान प्रश्नावली यन्त्र", "Shri Hanuman Prashnavali Yantra")) + '</h1>' +
      '<p>' + esc(T("४९ अंकों का यन्त्र — विधि से जप करें, मन में प्रश्न रखें और कर्सर रोकें; जिस खाने पर रुके, वही आपका उत्तर।", "A yantra of 49 numbers — chant by the vidhi, hold your question in mind and stop the cursor; the cell it rests on is your answer.")) + '</p></div>' +
      statsHtml() + '</header>';
  }

  // the yantra; opts.found = show found cells coloured (collection), opts.pick = cells are clickable
  function yantraSvg(opts) {
    opts = opts || {};
    var cells = TRI.map(function (t) {
      var n = t[0], f = save_.found[n], cls = "hn-t is-" + t[1];
      if (opts.found) { cls += f ? " is-found tone-" + TONE[n] : " is-empty"; }
      return '<g class="' + cls + '" data-n="' + n + '"' + (opts.found && !f ? "" : ' tabindex="0" role="button" aria-label="' + esc(T("अंक ", "Number ") + n) + '"') + '>' +
        '<polygon points="' + t[2] + '"/>' +
        '<text x="' + t[3] + '" y="' + t[4] + '">' + (opts.found && !f ? "" : esc(t[5])) + '</text></g>';
    }).join("");
    return '<svg class="hn-yantra' + (opts.cls ? " " + opts.cls : "") + '" viewBox="38 98 724 632" role="group" aria-label="' + esc(T("हनुमान प्रश्नावली यन्त्र", "Hanuman Prashnavali yantra")) + '">' + cells +
      '<polygon class="hn-frame" points="50,110 750,110 400,716.2"/></svg>';
  }

  function vidhiHtml() {
    return '<details class="hn-vidhi"><summary>📖 ' + esc(T("उपयोग विधि", "How it is done")) + '</summary><ol>' +
      '<li>' + esc(T("स्नान आदि कर साफ वस्त्र धारण करें।", "Bathe and wear clean clothes.")) + '</li>' +
      '<li>' + esc(T("पाँच बार “ॐ रां रामाय नमः” और ग्यारह बार “ॐ हनुमते नमः” का जाप करें।", "Chant “ॐ रां रामाय नमः” five times and “ॐ हनुमते नमः” eleven times.")) + '</li>' +
      '<li>' + esc(T("आँखें बंद कर हनुमानजी का स्मरण करें और अपना प्रश्न मन में दोहराएँ।", "Close your eyes, remember Hanumanji and repeat your question in the mind.")) + '</li>' +
      '<li>' + esc(T("प्रश्नावली चक्र पर कर्सर घुमाते हुए रोक दें — जिस खाने पर रुके, उसका अंक देखकर उत्तर पढ़ें।", "Let the cursor wander over the yantra and stop it — read the answer for the number it rests on.")) + '</li>' +
      '<li>' + esc(T("संक्षिप्त विधि: “ॐ ऐं ह्रीं हनुमते राम दूताय नमः” सात बार मन ही मन जपकर यन्त्र पर उँगली रखें।", "Short vidhi: chant “ॐ ऐं ह्रीं हनुमते राम दूताय नमः” seven times silently, then place a finger on the yantra.")) + '</li>' +
      '<li><b>' + esc(T("एक दिन में केवल एक ही प्रश्न पूछें — दोबारा पूछने पर उत्तर गलत मिलता है। इसे मज़ाक में न लें।", "Ask only ONE question a day — asking again gives a wrong answer. Do not take it lightly.")) + '</b></li></ol></details>';
  }

  function playHtml() {
    var m = METHODS[S.method], ph = S.phase;
    if (ph === "shuddhi") {
      return '<section class="sh-stage"><h2>' + esc(T("१. शुद्धि", "1. Purity")) + '</h2>' +
        '<p>' + esc(T("स्नान आदि करके साफ वस्त्र धारण करें, फिर आगे बढ़ें।", "Bathe, wear clean clothes, then continue.")) + '</p>' +
        '<div class="hn-method" role="group" aria-label="' + esc(T("विधि", "Method")) + '">' + Object.keys(METHODS).map(function (k) {
          return '<button type="button" class="sh-tab' + (S.method === k ? " is-active" : "") + '" data-hn="method" data-m="' + k + '">' + esc(T(METHODS[k].hi, METHODS[k].en)) + '</button>';
        }).join("") + '</div>' +
        '<label class="hn-check"><input type="checkbox" data-hn="clean"' + (S.clean ? " checked" : "") + '> ' + esc(T("मैंने स्नान किया है और साफ वस्त्र धारण किए हैं", "I have bathed and put on clean clothes")) + '</label>' +
        '<div class="sh-actions"><button type="button" class="sh-btn sh-primary" data-hn="to-japa"' + (S.clean ? "" : " disabled") + '>' + esc(T("आगे: जप", "Next: japa")) + ' →</button></div>' +
        vidhiHtml() + '</section>';
    }
    if (ph === "japa") {
      var st = m.steps[S.step];
      return '<section class="sh-stage"><h2>' + esc(T("२. जप", "2. Japa")) + ' <span class="sh-cnt">' + dev(S.step + 1) + '/' + dev(m.steps.length) + '</span></h2>' +
        '<p class="hn-mantra">' + esc(st.mantra) + '</p>' +
        '<div class="hn-beads" aria-hidden="true">' + Array.apply(null, Array(st.count)).map(function (_, i) { return '<i class="' + (i < S.beads ? "on" : "") + '"></i>'; }).join("") + '</div>' +
        '<p class="sh-count" aria-live="polite">' + dev(S.beads) + ' / ' + dev(st.count) + '</p>' +
        '<button type="button" class="hn-tap" data-hn="bead">🙏<span>' + esc(T("जप करें", "Chant")) + '</span></button>' +
        '<p class="sh-note">' + esc(T("हर बार मन में मंत्र का जाप करके एक बार छूएँ।", "Chant the mantra in your mind and tap once each time.")) + '</p></section>';
    }
    if (ph === "dhyan") {
      return '<section class="sh-stage sh-dhyan is-on"><h2>' + esc(T("३. स्मरण", "3. Remember")) + '</h2>' +
        '<div class="sh-diya" aria-hidden="true"><span class="sh-flame">🐒</span><i class="sh-ring"></i></div>' +
        '<p>' + esc(T("आँखें बंद करके हनुमानजी का स्मरण करें और अपना प्रश्न मन में दोहराएँ।", "Close your eyes, remember Hanumanji and repeat your question in your mind.")) + '</p>' +
        '<div class="sh-actions"><button type="button" class="sh-btn sh-primary" data-hn="thought"' + (S.thought ? "" : " disabled") + '>🙏 ' + esc(T("मैंने प्रश्न सोच लिया", "I have asked in my mind")) + '</button></div></section>';
    }
    if (ph === "pick") {
      return '<section class="sh-stage"><h2>' + esc(T("४. कर्सर रोकें", "4. Stop the cursor")) + '</h2>' +
        '<p>' + esc(T("कर्सर यन्त्र पर घूम रहा है — मन में प्रश्न रखते हुए उसे रोकें। या किसी भी खाने को स्वयं छुएँ।", "The cursor is wandering over the yantra — stop it while holding your question in mind. Or touch any cell yourself.")) + '</p></section>' +
        yantraSvg({ cls: "is-pick" }) +
        '<div class="sh-actions"><button type="button" class="sh-btn sh-primary hn-stop" data-hn="stop"' + (S.spinning ? "" : " disabled") + '>✋ ' + esc(T("रोकें", "Stop")) + '</button></div>';
    }
    return doneHtml();
  }

  function doneHtml() {
    var n = S.n, tone = TONE_INFO[TONE[n]], g = S.gain || {};
    return '<article class="sh-card ' + tone.cls + ' hn-card">' +
      (S.fresh ? '<span class="sh-new">✨ ' + esc(T("नया अंक मिला!", "New number!")) + '</span>' : '') +
      '<span class="hn-num" aria-label="' + esc(T("अंक", "Number")) + '">' + esc(BY_N[n][5]) + '</span>' +
      '<span class="sh-verdict ' + tone.cls + '">' + tone.icon + ' ' + esc(T(tone.hi, tone.en)) + '</span>' +
      '<p class="hn-answer">' + esc(ANS[n]) + '</p>' +
      '<p class="sh-gain">' + [g.points ? "+" + dev(g.points) + " " + T("अंक", "pts") : "", g.card ? "🚩 " + T("नया अंक", "new number") : "", g.streak ? "🔥 " + dev(save_.streak.count) + " " + T("दिन", save_.streak.count === 1 ? "day" : "days") : ""].filter(Boolean).join(" · ") + '</p>' +
      '<p class="hn-next">' + esc(T("आज का प्रश्न पूरा हुआ। अगला प्रश्न कल — ", "Today's question is done. The next one opens in ")) + '<b class="hn-clock">' + clock(msToMidnight()) + '</b></p>' +
      '<div class="sh-actions"><button type="button" class="sh-btn" data-hn="share">' + esc(T("शेयर करें", "Share")) + '</button>' +
      '<button type="button" class="sh-btn" data-hn="goto-japa">📿 ' + esc(T("जप-माला", "Japa mala")) + '</button></div>' +
      '<p class="sh-note">' + esc(T("एक दिन में एक ही प्रश्न — दोबारा पूछने पर उत्तर गलत मिलता है, ऐसी मान्यता है। यह श्रद्धा पर आधारित है; निर्णय अपने विवेक से लें।", "One question a day — it is believed a repeat gives a wrong answer. This rests on faith; decide with your own judgement.")) + '</p></article>';
  }

  function japaHtml() {
    var j = save_.japa, pct = Math.round(j.bead / 108 * 100), C = 2 * Math.PI * 54, off = C * (1 - j.bead / 108);
    return '<section class="sh-stage"><h2>📿 ' + esc(T("जप-माला", "Japa mala")) + '</h2>' +
      '<p>' + esc(T("“ॐ हनुमते नमः” — १०८ बार। हर माला पर अंक मिलते हैं।", "“ॐ हनुमते नमः” — 108 times. Every completed mala earns points.")) + '</p>' +
      '<div class="hn-mala"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="hn-ring-bg" cx="60" cy="60" r="54"/>' +
      '<circle class="hn-ring-fg" cx="60" cy="60" r="54" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<button type="button" class="hn-tap hn-tap-big" data-hn="mala">ॐ<span class="hn-malacount">' + dev(j.bead) + ' / १०८</span></button></div>' +
      '<p class="hn-mantra">ॐ हनुमते नमः</p>' +
      '<p class="sh-best">📿 ' + esc(T("पूरी माला: ", "Malas: ")) + dev(j.malas) + ' · ' + esc(T("कुल जप: ", "Total japa: ")) + dev(j.total) + '</p></section>';
  }

  function mineHtml() {
    var open = S.open != null && save_.found[S.open] ? S.open : null, detail = "";
    if (open != null) {
      var tone = TONE_INFO[TONE[open]];
      detail = '<article class="sh-card ' + tone.cls + ' sh-detail hn-card"><span class="hn-num">' + esc(BY_N[open][5]) + '</span>' +
        '<span class="sh-verdict ' + tone.cls + '">' + tone.icon + ' ' + esc(T(tone.hi, tone.en)) + '</span><p class="hn-answer">' + esc(ANS[open]) + '</p>' +
        '<p class="sh-note">' + esc(T("मिला", "Found")) + ' ×' + dev(save_.found[open].n) + '</p></article>';
    }
    var badges = BADGES.map(function (b) {
      var got = save_.badges[b.id];
      return '<li class="sh-badge' + (got ? " is-got" : "") + '"><span class="sh-bi">' + (got ? b.icon : "🔒") + '</span><div><b>' + esc(T(b.hi, b.en)) + '</b><small>' + esc(b.hiD) + '</small></div></li>';
    }).join("");
    return '<section class="sh-stage sh-left"><h2>🚩 ' + esc(T("मेरा यन्त्र", "My yantra")) + ' <span class="sh-cnt">' + dev(found()) + '/४९</span></h2>' +
      '<p class="hn-legend"><i class="tone-g"></i>' + esc(T("शुभ", "favourable")) + ' <i class="tone-r"></i>' + esc(T("उपाय", "remedy")) + ' <i class="tone-c"></i>' + esc(T("सावधानी", "caution")) + '</p>' +
      yantraSvg({ found: true, cls: "is-mine" }) + detail + '</section>' +
      '<section class="sh-stage sh-left"><h2>🏅 ' + esc(T("बैज", "Badges")) + '</h2><ul class="sh-badges">' + badges + '</ul>' +
      '<p class="sh-note">' + esc(T("कुल प्रश्न: ", "Questions asked: ")) + dev(save_.asked) + ' · ' + esc(T("अंक: ", "Points: ")) + dev(save_.points) + '</p></section>';
  }

  function paint() {
    if (!root) return;
    var body = S.tab === "play" ? playHtml() : S.tab === "japa" ? japaHtml() : mineHtml();
    root.innerHTML = head() + tabsHtml() + '<div class="sh-body">' + body + '</div>';
    afterPaint();
  }
  function afterPaint() {
    stopClock();
    if (S.tab === "play" && S.phase === "done") {
      clockTimer = setInterval(function () {
        if (!root || !root.isConnected) { stopClock(); return; }
        var ms = msToMidnight();
        if (!lockedToday()) { resetState(); paint(); return; }
        var el = root.querySelector(".hn-clock"); if (el) el.textContent = clock(ms);
      }, 1000);
      if (S.justFinished) { S.justFinished = false; var c = root.querySelector(".hn-card"); if (c && c.scrollIntoView) { try { c.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); } catch (e) {} } }
    }
    if (S.tab === "play" && S.phase === "dhyan" && !S.thought) {
      later(function () { S.thought = true; var b = root && root.querySelector('[data-hn="thought"]'); if (b) b.disabled = false; }, reduced ? 300 : 4000);
    }
    if (S.tab === "play" && S.phase === "pick" && !S.spinning && S.n == null) startSpin();
  }

  /* ---------------- the cursor ---------------- */
  function triEl(n) { return root ? root.querySelector('.hn-yantra .hn-t[data-n="' + n + '"]') : null; }
  function setCursor(n) {
    if (S.cur != null) { var o = triEl(S.cur); if (o) o.classList.remove("is-cursor"); }
    S.cur = n; var e = triEl(n); if (e) e.classList.add("is-cursor");
  }
  function startSpin() {
    S.spinning = true;
    var b = root.querySelector('[data-hn="stop"]'); if (b) b.disabled = false;
    (function hop() {
      if (!S.spinning || S.phase !== "pick") return;
      var n; do { n = 1 + randInt(49); } while (n === S.cur);
      setCursor(n);
      spinTimer = setTimeout(hop, reduced ? 400 : 85);
    })();
  }
  // stop: slow down over a few hops and settle on `target` (the cell touched, or a fresh random one)
  function settle(target) {
    if (!S.spinning) return;
    S.spinning = false;
    if (spinTimer) { clearTimeout(spinTimer); spinTimer = null; }
    var b = root.querySelector('[data-hn="stop"]'); if (b) b.disabled = true;
    if (reduced) { setCursor(target); later(function () { finish(target); }, 300); return; }
    var delays = [130, 170, 220, 290, 380, 500], i = 0;
    (function slow() {
      if (S.phase !== "pick") return;
      if (i >= delays.length) { setCursor(target); var e = triEl(target); if (e) e.classList.add("is-landed"); later(function () { finish(target); }, 900); return; }
      var n; do { n = 1 + randInt(49); } while (n === S.cur || n === target);
      setCursor(n); i++;
      later(slow, delays[i - 1]);
    })();
  }

  function finish(n) {
    if (S.phase !== "pick") return;
    clearTimers();
    var gain = { points: 15, card: false, streak: false }, f = save_.found[n];
    S.fresh = !f;
    if (!f) { save_.found[n] = { n: 1, first: today() }; gain.points += 25; gain.card = true; } else f.n++;
    save_.asked++;
    var t = today();
    if (save_.streak.last !== t) {
      save_.streak.count = save_.streak.last === yesterday() ? save_.streak.count + 1 : 1;
      save_.streak.last = t;
      if (save_.streak.count > save_.streak.best) save_.streak.best = save_.streak.count;
      gain.streak = true;
    }
    if (new Date().getDay() === 2) save_.tuesdays++;
    save_.last = { date: t, n: n };
    save_.points += gain.points;
    var badges = checkBadges(); save();
    S.n = n; S.gain = gain; S.phase = "done"; S.justFinished = true;
    paint(); announce(badges);
  }

  /* ---------------- other actions ---------------- */
  function bead() {
    var st = METHODS[S.method].steps[S.step];
    S.beads++;
    buzz(12);
    if (S.beads >= st.count) {
      S.step++; S.beads = 0;
      if (S.step >= METHODS[S.method].steps.length) { S.phase = "dhyan"; S.thought = false; S.step = 0; }
    }
    paint();
  }
  function mala() {
    var j = save_.japa;
    j.bead++; j.total++;
    buzz(10);
    var badges = [];
    if (j.bead >= 108) {
      j.bead = 0; j.malas++; save_.points += 10;
      toast("📿 " + T("एक माला पूरी! +१० अंक", "A mala complete! +10 pts"));
      badges = checkBadges();
    }
    save(); paintMala(); if (badges.length) announce(badges);
  }
  function paintMala() {
    var j = save_.japa, C = 2 * Math.PI * 54;
    var fg = root.querySelector(".hn-ring-fg"); if (fg) fg.setAttribute("stroke-dashoffset", (C * (1 - j.bead / 108)).toFixed(1));
    var c = root.querySelector(".hn-malacount"); if (c) c.textContent = dev(j.bead) + " / १०८";
    var b = root.querySelector(".sh-best"); if (b) b.textContent = "📿 " + T("पूरी माला: ", "Malas: ") + dev(j.malas) + " · " + T("कुल जप: ", "Total japa: ") + dev(j.total);
    var st = root.querySelector(".sh-stats"); if (st) st.outerHTML = statsHtml();
  }
  function share() {
    var n = S.n; if (n == null) return;
    var text = "🚩 श्री हनुमान प्रश्नावली\n\nअंक " + BY_N[n][5] + " — " + ANS[n] + "\n\n" + location.origin + "/hanuman";
    if (navigator.share) { navigator.share({ title: "श्री हनुमान प्रश्नावली", text: text }).catch(function () {}); return; }
    var done = function () { toast(T("कॉपी हो गया", "Copied")); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
  }

  /* ---------------- events ---------------- */
  function onClick(e) {
    var g = e.target.closest && e.target.closest(".hn-t");
    if (g) {
      var n = +g.getAttribute("data-n");
      if (S.tab === "play" && S.phase === "pick" && S.spinning) settle(n);
      else if (S.tab === "mine" && save_.found[n]) { S.open = S.open === n ? null : n; paint(); }
      return;
    }
    var b = e.target.closest && e.target.closest("[data-hn]");
    if (!b) return;
    var a = b.getAttribute("data-hn");
    if (a === "tab") {
      var t = b.getAttribute("data-tab");
      if (t !== S.tab) { clearTimers(); if (S.phase === "pick") { S.spinning = false; S.cur = null; } S.tab = t; S.open = null; paint(); }
    }
    else if (a === "method") { S.method = b.getAttribute("data-m"); S.step = 0; S.beads = 0; paint(); }
    else if (a === "to-japa") { if (S.clean) { S.phase = "japa"; S.step = 0; S.beads = 0; paint(); } }
    else if (a === "bead") bead();
    else if (a === "thought") { if (S.thought) { S.phase = "pick"; S.spinning = false; S.cur = null; paint(); } }
    else if (a === "stop") settle(1 + randInt(49));
    else if (a === "share") share();
    else if (a === "goto-japa") { S.tab = "japa"; paint(); }
    else if (a === "mala") mala();
  }
  function onChange(e) {
    var c = e.target.closest && e.target.closest('[data-hn="clean"]');
    if (c) { S.clean = !!c.checked; var nb = root.querySelector('[data-hn="to-japa"]'); if (nb) nb.disabled = !S.clean; }
  }
  function onKey(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var g = e.target.closest && e.target.closest(".hn-t");
    if (g) { e.preventDefault(); onClick(e); }
  }

  window.SwadhyayHanuman = {
    pageHtml: function () {
      resetState();
      return '<main class="content-pad sh-wrap"><section class="sh-root hn-root" data-hanuman></section></main>';
    },
    mount: function (h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      clearTimers(); stopClock();
      root = document.querySelector("[data-hanuman]");
      if (!root) return;
      root.addEventListener("click", onClick);
      root.addEventListener("change", onChange);
      root.addEventListener("keydown", onKey);
      paint();
    }
  };
})();

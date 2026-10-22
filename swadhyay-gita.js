/* गीता LMS -- "प्रतिदिन 20 मिनट, श्रीमद्भगवद्गीता सीखें": a guided year-long course through all 700 shlokas, with a commitment
   (संकल्प-पत्र), a daily reminder, lessons, revision days, and a progress page for every learner.

   The course
     every lesson day  : 2 shlokas, in the book's order (day 1 = 1.1-2, day 2 = 1.3-4 ...); a chapter's last lesson
                         holds one shloka when the chapter has an odd number of them
     every revision day: after every 20 shlokas, or at the end of a chapter if that comes first, one day goes to
                         revising those shlokas (so a chapter of 47 shlokas has revision after 1.20, 1.40 and 1.47)
     => 353 lesson days + 44 revision days = 397 days (about 13 months at one day a day)
   A day is 20 minutes: 5 listen and read, 10 meaning, 5 repeat and self-check (a revision day is one sitting).
   The course is self-paced: "today's day" is the first one not yet marked done, so a missed day never has to be caught up.

   The six steps of the journey
     1 संकल्प  2 समय  3 रिमाइंडर   (this file's wizard, on /gita)
     4 daily reminder  5 the lesson and "आज का पाठ पूरा हुआ"  6 progress      (home card + /gita)

   Where it shows
     - the home page: a full-width card (swadhyay-daily.js hands the Gita slot over to mountCard) -- an invitation
       before joining, today's lesson and progress after;
     - /gita (the Gita LMS): wizard, dashboard, lesson, revision, plan, settings.

   Where the shlokas come from: assets/data/v1/gita/chNN.json (text, meaning, anchor in the book), made by
   tools/build_daily_data.py and linked to the live book by tools/relink_gita_daily.py.

   Saved per learner
     localStorage (swadhyay_gita_lms_v1) on this device, and -- when signed in -- the same document on the server
     (GET/PUT /api/gita-lms), merged both ways: each day's "done" mark is kept by its own timestamp, so finishing
     a day on the phone shows on the laptop, and a day marked done by mistake can be undone everywhere.

   Reminders: a browser notification while Kalyan is open, a calendar file (.ics) with a repeating event that works
   on any device, and the choice of WhatsApp / e-mail recorded for when those can be sent from the server.

   Public API: window.SwadhyayGita.pageHtml(), .mount({ tx, toast }), .mountCard(el, { tx, toast })               */
(function () {
  "use strict";

  var DATA = "/assets/data/v1/gita/";
  var LS = "swadhyay_gita_lms_v1";
  var FIRED = "swadhyay_gita_lms_fired_v1";
  var API = "/api/gita-lms";
  var ART = "/assets/images/gita/hero-art.webp";
  var PER_DAY = 2;                 // shlokas on a lesson day
  var REVISE_EVERY = 20;           // shlokas between revision days
  var DEV = "०१२३४५६७८९";
  var MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];
  var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------------- tiny helpers ---------------- */
  var helpers = { tx: null, toast: null };
  function T(hi, en) { return helpers.tx ? helpers.tx(hi, en) : hi; }
  function isEn() { return T("hi", "en") === "en"; }
  function toast(m) { if (helpers.toast) helpers.toast(m); }
  function dev(n) { return isEn() ? String(n) : String(n).replace(/\d/g, function (d) { return DEV.charAt(+d); }); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function app() { return window.__swadhyayApp || null; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  /* ---------------- dates ---------------- */
  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dayKey(new Date()); }
  function parseKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dayKey(d); }
  function dayNumber(k) { var p = k.split("-"); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function daysBetween(a, b) { return dayNumber(b) - dayNumber(a); }
  function fmtDate(k) {
    var d = parseKey(k);
    return isEn() ? d.getDate() + " " + MONTHS_EN[d.getMonth()] + " " + d.getFullYear() : dev(d.getDate()) + " " + MONTHS_HI[d.getMonth()] + " " + dev(d.getFullYear());
  }
  function fmtTime(hhmm) {
    var p = (hhmm || "06:30").split(":"), h = +p[0], m = +p[1] || 0;
    if (isEn()) return (h % 12 || 12) + ":" + pad(m) + (h < 12 ? " AM" : " PM");
    var per = h < 5 ? "रात" : h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 19 ? "शाम" : "रात";
    return per + " " + dev(h % 12 || 12) + ":" + dev(pad(m)) + " बजे";
  }

  /* ================================================================== saved state */
  function blank() {
    return { v: 1, joined: false, pledge: null, time: "06:30", start: "", paused: false, owner: "",
      ch: { push: true, cal: false, wa: false, waNum: "", mail: false, mailAddr: "" }, done: {}, updatedAt: 0 };
  }
  function normalize(v) {
    var s = blank();
    if (!v || typeof v !== "object") return s;
    s.joined = !!v.joined; s.paused = !!v.paused;
    s.pledge = v.pledge && typeof v.pledge === "object" ? { name: String(v.pledge.name || ""), at: String(v.pledge.at || ""), ver: +v.pledge.ver || 1 } : null;
    s.time = /^\d\d:\d\d$/.test(v.time) ? v.time : s.time;
    s.start = /^\d{4}-\d\d-\d\d$/.test(v.start) ? v.start : "";
    s.owner = String(v.owner || "");
    if (v.ch && typeof v.ch === "object") {
      s.ch.push = v.ch.push !== false; s.ch.cal = !!v.ch.cal; s.ch.wa = !!v.ch.wa; s.ch.waNum = String(v.ch.waNum || "").slice(0, 20);
      s.ch.mail = !!v.ch.mail; s.ch.mailAddr = String(v.ch.mailAddr || "").slice(0, 120);
    }
    if (v.done && typeof v.done === "object") {
      Object.keys(v.done).forEach(function (k) {
        var e = v.done[k];
        if (e && typeof e === "object" && /^\d+$/.test(k)) s.done[k] = { d: /^\d{4}-\d\d-\d\d$/.test(e.d) ? e.d : "", t: +e.t || 0 };
      });
    }
    s.updatedAt = +v.updatedAt || 0;
    return s;
  }
  var S = (function () { try { return normalize(JSON.parse(localStorage.getItem(LS))); } catch (e) { return blank(); } })();
  function writeLocal() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }
  /* every change goes through here: stamp, keep on this device, and (signed in) send to the account */
  function persist() { S.updatedAt = Date.now(); writeLocal(); schedulePush(); }

  /* ================================================================== the course */
  var INDEX = null, PLAN = null, readyP = null;
  var cache = {};
  function getJSON(name) {
    if (!cache[name]) cache[name] = fetch(DATA + name).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); });
    cache[name].catch(function () { delete cache[name]; });
    return cache[name];
  }
  function getChapter(ch) { return getJSON("ch" + pad(ch) + ".json"); }

  function buildPlan(idx) {
    var plan = [], n = 0;
    idx.chapters.forEach(function (c) {
      var since = 0, revFrom = 1;
      for (var v = 1; v <= c.n; v += PER_DAY) {
        var b = Math.min(v + PER_DAY - 1, c.n);
        plan.push({ n: ++n, kind: "lesson", ch: c.ch, a: v, b: b });
        since += b - v + 1;
        if (since >= REVISE_EVERY || b === c.n) {           // 20 shlokas gathered, or the chapter has ended
          plan.push({ n: ++n, kind: "revise", ch: c.ch, a: revFrom, b: b });
          revFrom = b + 1; since = 0;
        }
      }
    });
    return plan;
  }
  function ready() {
    if (!readyP) {
      var SA = window.SwadhyayShlokaAudio;
      readyP = Promise.all([getJSON("index.json"), SA ? SA.load() : Promise.resolve(), asrConfig()]).then(function (r) {
        INDEX = r[0]; PLAN = buildPlan(INDEX); return INDEX;
      });
      readyP.catch(function () { readyP = null; });
    }
    return readyP;
  }
  function chapterOf(ch) { return INDEX.chapters[ch - 1]; }
  function dayCount() { return PLAN.length; }
  function countKind(k) { return PLAN.filter(function (d) { return d.kind === k; }).length; }
  function totalShlokas() { return INDEX.total || 700; }
  function span(d) { return d.a === d.b ? dev(d.a) : dev(d.a) + "–" + dev(d.b); }
  function dayTitle(d) {
    return (d.kind === "revise" ? T("पुनरावृत्ति · ", "Revision · ") : "") + T("अध्याय ", "Chapter ") + dev(d.ch) + " · " + T("श्लोक ", "Shloka ") + span(d);
  }

  function isDone(n) { var e = S.done[n]; return !!(e && e.d); }
  function doneDate(n) { var e = S.done[n]; return e && e.d || ""; }
  function currentDay() {
    for (var i = 0; i < PLAN.length; i++) if (!isDone(PLAN[i].n)) return PLAN[i];
    return null;
  }
  function stats() {
    var learned = 0, lessons = 0, revs = 0, whole = {};
    PLAN.forEach(function (d) {
      if (d.kind === "lesson") {
        if (whole[d.ch] === undefined) whole[d.ch] = true;
        if (isDone(d.n)) { learned += d.b - d.a + 1; lessons++; } else whole[d.ch] = false;
      } else if (isDone(d.n)) revs++;
    });
    var chapters = 0;
    INDEX.chapters.forEach(function (c) { if (whole[c.ch] === true) chapters++; });
    return { learned: learned, lessons: lessons, revs: revs, chapters: chapters, days: PLAN.filter(function (d) { return isDone(d.n); }).length };
  }
  function streakInfo() {
    var set = {};
    Object.keys(S.done).forEach(function (k) { if (S.done[k].d) set[S.done[k].d] = 1; });
    var cur = 0, d = today();
    if (!set[d]) d = addDays(d, -1);
    while (set[d]) { cur++; d = addDays(d, -1); }
    var keys = Object.keys(set).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) { run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1; if (run > best) best = run; prev = k; });
    return { cur: cur, best: best, doneToday: !!set[today()] };
  }
  function plannedToday() { return S.start ? Math.max(1, daysBetween(S.start, today()) + 1) : 1; }
  function dayDate(n) { return addDays(S.start || today(), n - 1); }
  function endDate() { return dayDate(dayCount()); }

  /* ================================================================== sync with the account */
  var pushTimer = null, synced = false;
  function loggedIn() { var a = app(); return !!(a && a.isLoggedIn && a.isLoggedIn()); }
  function userKey() { var a = app(), u = a && a.getUser && a.getUser(); return u ? String(u.id || u.email || "") : ""; }
  function mergeRemote(r) {
    if (!r) return;
    r = normalize(r);
    Object.keys(r.done).forEach(function (k) {                     // each day by its own timestamp
      var l = S.done[k];
      if (!l || r.done[k].t > l.t) S.done[k] = r.done[k];
    });
    if (r.updatedAt > S.updatedAt) {                                // settings: the newer document wins
      S.joined = r.joined || S.joined; S.pledge = r.pledge || S.pledge; S.time = r.time; S.start = r.start || S.start;
      S.ch = r.ch; S.paused = r.paused;
    } else if (!S.joined && r.joined) { S.joined = true; S.pledge = r.pledge; S.start = r.start; S.time = r.time; S.ch = r.ch; }
    S.updatedAt = Math.max(S.updatedAt, r.updatedAt);
  }
  function syncDown() {
    var a = app();
    if (!loggedIn() || !a || !a.api) return Promise.resolve(false);
    var me = userKey();
    return a.api("GET", API).then(function (res) {
      if (S.owner && me && S.owner !== me) {                        // this device held someone else's course: take the account's
        S = res && res.data ? normalize(res.data) : blank();
      } else if (res && res.data) mergeRemote(res.data);
      S.owner = me; writeLocal(); synced = true;
      // send up whatever the account does not have yet (days done while signed out, or on another device's older copy)
      var remote = res && res.data ? normalize(res.data) : null;
      var ahead = !remote || Object.keys(S.done).some(function (k) { return !remote.done[k] || remote.done[k].t < S.done[k].t; }) || S.updatedAt > remote.updatedAt;
      if (ahead && S.joined) schedulePush();
      return true;
    }).catch(function () { return false; });
  }
  function schedulePush() {
    if (!loggedIn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var a = app(); if (!a || !a.api) return;
      S.owner = userKey();
      a.api("PUT", API, { data: S }).catch(function () {});
    }, 800);
  }

  /* ================================================================== reminders */
  var timer = null;
  function wasFired(key) { try { return (JSON.parse(localStorage.getItem(FIRED)) || {})[key]; } catch (e) { return false; } }
  function markFired(key) { try { var m = JSON.parse(localStorage.getItem(FIRED)) || {}, keep = {}; Object.keys(m).slice(-20).forEach(function (k) { keep[k] = m[k]; }); keep[key] = 1; localStorage.setItem(FIRED, JSON.stringify(keep)); } catch (e) {} }
  function reminderText() {
    var d = PLAN && currentDay();
    return d && d.kind === "revise"
      ? T("आज पुनरावृत्ति का दिन है — अब तक सीखे श्लोकों को दोहराइए। 20 मिनट गीता को दें।", "It is a revision day — go over the shlokas you have learned. Give Gita 20 minutes.")
      : T("आज के दो श्लोक आपका इंतज़ार कर रहे हैं। आइए, 20 मिनट गीता को दें।", "Today's two shlokas are waiting for you. Come, give 20 minutes to the Gita.");
  }
  function notify() {
    var body = reminderText();
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        var n = new Notification(T("गीता अध्ययन", "Gita study"), { body: body, tag: "swadhyay-gita-lms", icon: "/assets/images/quote/logo-mark.svg" });
        n.onclick = function () { try { window.focus(); } catch (e) {} if (app()) app().navigate("/gita?go=today"); n.close(); };
      }
    } catch (e) {}
    toast("🔔 " + body);
  }
  function nextFire() {
    if (!S.joined || S.paused || !S.ch.push || !PLAN || !currentDay()) return null;
    var p = S.time.split(":"), d = new Date();
    d.setHours(+p[0], +p[1], 0, 0);
    if (d.getTime() <= Date.now() || (streakInfo().doneToday && dayKey(d) === today())) { d.setDate(d.getDate() + 1); d.setHours(+p[0], +p[1], 0, 0); }
    return d.getTime();
  }
  function arm() {
    clearTimeout(timer);
    var at = nextFire();
    if (!at || at - Date.now() > 2147000000) return;
    timer = setTimeout(function () {
      var key = dayKey(new Date());
      if (!wasFired(key) && !streakInfo().doneToday && S.joined && !S.paused) { markFired(key); notify(); refreshAll(); }
      arm();
    }, Math.max(1000, at - Date.now()));
  }
  function askPermission() {
    if (typeof Notification === "undefined") { toast(T("यह ब्राउज़र सूचनाएँ नहीं देता — कैलेंडर रिमाइंडर चुनें।", "This browser has no notifications — use the calendar reminder.")); return; }
    Notification.requestPermission().then(function () { arm(); redraw(); }).catch(function () {});
  }
  function permWords() {
    if (typeof Notification === "undefined") return T("इस ब्राउज़र में उपलब्ध नहीं", "Not available in this browser");
    return Notification.permission === "granted" ? T("चालू", "On") : Notification.permission === "denied" ? T("ब्राउज़र में रोकी गयी है", "Blocked in the browser") : T("अनुमति बाकी", "Needs permission");
  }

  /* a calendar file: the 20-minute sitting every day at the chosen time, for as many days as the course has left */
  function icsEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function icsFold(line) {
    var enc = new TextEncoder(), out = [], cur = "", bytes = 0;
    Array.from(line).forEach(function (ch) {
      var b = enc.encode(ch).length;
      if (bytes + b > 74) { out.push(cur); cur = " " + ch; bytes = 1 + b; } else { cur += ch; bytes += b; }
    });
    out.push(cur);
    return out.join("\r\n");
  }
  function downloadIcs() {
    var cur = currentDay();
    if (!cur) { toast(T("कोई शेष दिन नहीं।", "No days left.")); return; }
    var link = location.origin + "/gita", left = PLAN.filter(function (d) { return !isDone(d.n); }).length;
    var p = S.time.split(":"), start = today();
    var at = new Date(); at.setHours(+p[0], +p[1], 0, 0);
    if (at.getTime() <= Date.now()) start = addDays(start, 1);
    var name = T("गीता अध्ययन — 20 मिनट", "Gita study — 20 minutes");
    var ev = ["BEGIN:VEVENT", "UID:gita-lms-" + (S.start || start) + "@kalyan", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + start.replace(/-/g, "") + "T" + pad(+p[0]) + pad(+p[1]) + "00", "DURATION:PT20M", "RRULE:FREQ=DAILY;COUNT=" + left,
      "SUMMARY:" + icsEsc(name), "DESCRIPTION:" + icsEsc(reminderText() + " " + link), "URL:" + link,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(name), "TRIGGER:PT0M", "END:VALARM", "END:VEVENT"];
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kalyan//GitaLMS//HI", "CALSCALE:GREGORIAN"].concat(ev, ["END:VCALENDAR"]);
    var blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var u = URL.createObjectURL(blob), el = document.createElement("a");
    el.href = u; el.download = "kalyan-gita-study.ics"; document.body.appendChild(el); el.click();
    setTimeout(function () { URL.revokeObjectURL(u); el.remove(); }, 500);
    toast(T("कैलेंडर फ़ाइल तैयार — इसे अपने कैलेंडर में खोलें।", "Calendar file ready — open it in your calendar."));
  }

  /* ================================================================== wording */
  var PLEDGE = {
    hi: function (n) { return "मैं, " + n + ", भगवान् श्रीकृष्ण को साक्षी मानकर संकल्प लेता/लेती हूँ कि मैं प्रतिदिन 20 मिनट श्रीमद्भगवद्गीता के अध्ययन को दूँगा/दूँगी — श्लोक सुनूँगा/सुनूँगी, उसका अर्थ समझूँगा/समझूँगी और उसे अपने जीवन में उतारने का प्रयास करूँगा/करूँगी। यदि कोई दिन छूट जाए तो निराश हुए बिना अगले दिन वहीं से फिर आरम्भ करूँगा/करूँगी। 🙏"; },
    en: function (n) { return "I, " + n + ", with Lord Krishna as my witness, pledge to give 20 minutes every day to the study of the Bhagavad Gita — to listen to the shloka, understand its meaning and try to live it. If a day is missed, I will not lose heart but begin again from where I stopped. 🙏"; }
  };
  function pledgeText(name) { var n = (name || "").trim() || T("साधक", "the learner"); return isEn() ? PLEDGE.en(n) : PLEDGE.hi(n); }
  var FEATS = [
    ["📖", ["2 श्लोक प्रतिदिन", "2 shlokas a day"], ["व्यवस्थित क्रम से", "in the book's order"]],
    ["🎧", ["शुद्ध उच्चारण", "Right recitation"], ["ऑडियो के साथ (जहाँ उपलब्ध)", "with audio (where recorded)"]],
    ["📝", ["सरल हिंदी अर्थ", "Simple Hindi meaning"], ["और भावार्थ", "and the idea behind it"]],
    ["🌱", ["जीवन में अनुप्रयोग", "Living it"], ["व्यावहारिक सीख", "a practical lesson"]]
  ];
  var ROUTINE = [
    ["📖", ["5 मिनट", "5 min"], ["श्लोक सुनें और पढ़ें", "Listen and read"], ["सही उच्चारण के साथ", "with right recitation"]],
    ["💡", ["10 मिनट", "10 min"], ["अर्थ और भाव समझें", "Understand the meaning"], ["सरल हिंदी में व्याख्या", "explained simply"]],
    ["🧠", ["5 मिनट", "5 min"], ["दोहराएँ और स्वयं जाँचें", "Repeat and self-check"], ["स्मरण और छोटा अभ्यास", "recall and a small practice"]]
  ];
  function tt(p) { return isEn() ? p[1] : p[0]; }

  /* ================================================================== view state (not saved) */
  var V = { view: "", day: 0, open: 0, tick: {}, rv: {}, shown: {} };
  var W = { step: 1, name: "", agree: false, time: "06:30", push: true, cal: false, wa: false, waNum: "", mail: false, mailAddr: "", start: "" };
  var root = null, cardEl = null;
  function modal(o) {
    var m = document.createElement("div");
    m.className = "sk-modal";
    m.innerHTML = '<div class="sk-sheet" role="dialog" aria-modal="true"><h3>' + esc(o.title) + '</h3><div class="sk-sheet-b">' + o.body + '</div><div class="sk-sheet-a">' +
      (o.no ? '<button type="button" class="sk-btn sk-btn-ghost" data-m="no">' + esc(o.no) + '</button>' : '') +
      '<button type="button" class="sk-btn" data-m="yes">' + esc(o.yes) + '</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-m]") : null;
      if (e.target === m || (b && b.getAttribute("data-m") === "no")) { m.remove(); return; }
      if (b && b.getAttribute("data-m") === "yes") { m.remove(); if (o.onYes) o.onYes(); }
    });
    var f = m.querySelector('[data-m="yes"]'); if (f) f.focus();
  }

  /* ================================================================== the home card */
  function firstVerse() { return getChapter(1).then(function (d) { return d.shlokas[0]; }); }
  /* the full design (hero, invitation, features, routine, today's study, stats): shown on /gita as "what is in the course" (onPage skips the hero and the invitation) */
  function promoFull(v, onPage) {
    var lessons = countKind("lesson"), revs = countKind("revise"), total = dayCount();
    var heroTx = '<div class="gl-hero-tx"><div class="gl-om" aria-hidden="true"><i></i><b>॥ ॐ ॥</b><i></i></div>' +
      '<h2>' + esc(T("प्रतिदिन 20 मिनट", "20 minutes a day")) + '<br>' + esc(T("लगभग एक वर्ष में", "in about a year")) + '<br><em>' + esc(T("श्रीमद्भगवद्गीता सीखें", "Learn the Bhagavad Gita")) + '</em></h2>' +
      '<p class="gl-chips"><span>' + esc(T("रोज़ 2 श्लोक", "2 shlokas daily")) + '</span><span>' + esc(T("सरल हिंदी अर्थ", "simple Hindi meaning")) + '</span><span>' + esc(T("जीवन में अनुप्रयोग", "applied to life")) + '</span></p>' +
      '<div class="gl-orn" aria-hidden="true"><i>🪷</i></div>' +
      '<p class="gl-quote">' + esc(T("गीता केवल पढ़ने के लिए नहीं,", "The Gita is not only to be read,")) + '<br>' + esc(T("जीवन में जीने के लिए है।", "it is to be lived.")) + '</p></div>';
    var verse = v ? '<div class="gl-shl"><small>' + esc(v.s || "") + '</small>' + v.t.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + '</div>' : '';
    return (onPage ? '' : '<div class="gl-hero"><div class="gl-art"><img src="' + ART + '" alt="" width="414" height="544" loading="lazy"></div>' + heroTx + '</div>' +
      '<div class="gl-cta"><span class="gl-lotus" aria-hidden="true">🪷</span><div><b>' + esc(T("क्या आप प्रतिदिन 20 मिनट देकर श्रीमद्भगवद्गीता सीखना चाहते हैं?", "Would you give 20 minutes a day to learn the Bhagavad Gita?")) + '</b>' +
      '<small>' + esc(T("आज ही अपना अध्ययन संकल्प शुरू करें।", "Begin your study pledge today.")) + '</small></div>' +
      '<button type="button" class="gl-btn" data-gl="join">' + esc(T("हाँ, मैं गीता सीखना चाहता/चाहती हूँ", "Yes, I want to learn the Gita")) + ' <i aria-hidden="true">→</i></button></div>') +
      '<ul class="gl-feats">' + FEATS.map(function (f) { return '<li><span class="gl-ic" aria-hidden="true">' + f[0] + '</span><b>' + esc(tt(f[1])) + '</b><small>' + esc(tt(f[2])) + '</small></li>'; }).join("") + '</ul>' +
      '<section class="gl-box"><h3><i aria-hidden="true">~</i> ' + esc(T("आपकी दैनिक साधना (सिर्फ़ 20 मिनट)", "Your daily practice (just 20 minutes)")) + ' <i aria-hidden="true">~</i></h3>' +
      '<ol class="gl-routine">' + ROUTINE.map(function (r, i) { return '<li><em>' + dev(i + 1) + '</em><span class="gl-ic" aria-hidden="true">' + r[0] + '</span><span class="gl-min">' + esc(tt(r[1])) + '</span><b>' + esc(tt(r[2])) + '</b><small>' + esc(tt(r[3])) + '</small></li>'; }).join("") + '</ol></section>' +
      '<section class="gl-today"><span class="gl-ribbon">' + esc(T("आज का अध्ययन", "Today's study")) + '</span>' +
      '<div class="gl-today-in"><div class="gl-cal"><span aria-hidden="true">📅</span><b>' + esc(T("दिन ", "Day ")) + dev(1) + '</b><small>' + esc(T("अध्याय ", "Chapter ")) + dev(1) + '<br>' + esc(T("श्लोक ", "Shloka ")) + dev(1) + '–' + dev(2) + '</small></div>' + verse + '</div></section>' +
      '<ul class="gl-stats"><li><span class="gl-ic" aria-hidden="true">🎯</span><b>' + dev(totalShlokas()) + '</b><small>' + esc(T("श्लोकों का अध्ययन", "shlokas studied")) + '</small></li>' +
      '<li><span class="gl-ic" aria-hidden="true">📊</span><b>' + dev(total) + ' ' + esc(T("दिन", "days")) + '</b><small>' + esc(T("पाठ ", "lessons ")) + dev(lessons) + esc(T(" + पुनरावृत्ति ", " + revision ")) + dev(revs) + '</small></li>' +
      '<li><span class="gl-ic" aria-hidden="true">🙏</span><b>' + esc(T("अपनी गति से", "At your pace")) + '</b><small>' + esc(T("दिन छूटे तो वहीं से आगे", "miss a day, carry on from there")) + '</small></li></ul>';
  }
  /* the home card is one third of the row, like the Manas and Bhajan cards: the invitation, the four promises, the size of the course */
  function promoCompact() {
    return '<div class="gl-hero"><div class="gl-art"><img src="' + ART + '" alt="" width="414" height="544" loading="lazy"></div>' +
      '<div class="gl-hero-tx"><div class="gl-om" aria-hidden="true"><i></i><b>॥ ॐ ॥</b><i></i></div>' +
      '<h2>' + esc(T("प्रतिदिन 20 मिनट", "20 minutes a day")) + '<br>' + esc(T("लगभग एक वर्ष में", "in about a year")) + '<br><em>' + esc(T("श्रीमद्भगवद्गीता सीखें", "Learn the Bhagavad Gita")) + '</em></h2>' +
      '<p class="gl-chips"><span>' + esc(T("रोज़ 2 श्लोक", "2 shlokas daily")) + '</span><span>' + esc(T("सरल हिंदी अर्थ", "simple Hindi")) + '</span></p></div></div>' +
      '<div class="gl-cta"><div><b>' + esc(T("क्या आप प्रतिदिन 20 मिनट देकर गीता सीखना चाहते हैं?", "Would you give 20 minutes a day to learn the Gita?")) + '</b></div>' +
      '<button type="button" class="gl-btn" data-gl="join">' + esc(T("हाँ, मैं सीखना चाहता/चाहती हूँ", "Yes, I want to learn")) + ' <i aria-hidden="true">→</i></button></div>' +
      '<ul class="gl-feats gl-feats-s">' + FEATS.map(function (f) { return '<li><span class="gl-ic" aria-hidden="true">' + f[0] + '</span><b>' + esc(tt(f[1])) + '</b></li>'; }).join("") + '</ul>' +
      '<p class="gl-foot"><b>' + dev(totalShlokas()) + '</b> ' + esc(T("श्लोक", "shlokas")) + ' · <b>' + dev(dayCount()) + '</b> ' + esc(T("दिन", "days")) + ' · ' + esc(T("अपनी गति से", "at your pace")) + ' <a href="/gita" data-gl="open">' + esc(T("पूरी योजना देखें →", "See the plan →")) + '</a></p>';
  }
  function activeCardHtml(d, v) {
    var st = stats(), sk = streakInfo(), pct = Math.round(st.learned / totalShlokas() * 100), cur = d;
    if (!cur) return '<div class="gl-done-all"><span aria-hidden="true">🏵️</span><h3>' + esc(T("गीता-अध्ययन पूर्ण — अभिनन्दन!", "Gita study complete — congratulations!")) + '</h3><p>' + esc(T("आपने सभी 700 श्लोकों की यात्रा पूरी की।", "You have completed the journey through all 700 shlokas.")) + '</p>' +
      '<button type="button" class="gl-btn" data-gl="open">' + esc(T("गीता LMS खोलें", "Open the Gita LMS")) + ' <i>→</i></button></div>';
    var rev = cur.kind === "revise";
    var lead = rev ? '<div class="gl-shl is-rev"><small>' + esc(T("आज पुनरावृत्ति का दिन", "Revision day")) + '</small><span>' + esc(T("अध्याय ", "Chapter ")) + dev(cur.ch) + " · " + esc(T("श्लोक ", "Shloka ")) + span(cur) + '</span></div>' : '';
    /* the day's shlokas sit below the day box, one block each, every line kept whole (fitLines) */
    var shloks = !rev && v && v.length ? '<div class="gl-shloks">' + v.map(function (x, i) {
      return '<div class="gl-shl"><small>' + esc(T("श्लोक ", "Shloka ") + dev(cur.a + i) + (x.s ? " · " + x.s : "")) + '</small>' + x.t.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") + '</div>';
    }).join("") + '</div>' : '';
    var late = sk.doneToday;
    return '<div class="gl-act"><header><span class="gl-ribbon">' + esc(T("आज का अध्ययन", "Today's study")) + '</span><h3>' + esc(T("गीता LMS", "Gita LMS")) + '</h3>' +
      '<p>' + esc(late ? T("आज का पाठ पूरा हुआ ✓ — चाहें तो आगे बढ़ें।", "Today's lesson is done ✓ — carry on if you like.") : T("आज के लिए 20 मिनट", "20 minutes for today")) + '</p></header>' +
      '<div class="gl-today-in"><div class="gl-cal"><span aria-hidden="true">' + (rev ? "🔁" : "📅") + '</span><b>' + esc(T("दिन ", "Day ")) + dev(cur.n) + '</b><small>' + esc(T("अध्याय ", "Chapter ")) + dev(cur.ch) + ' <br>' + esc(T("श्लोक ", "Shloka ")) + span(cur) + '</small></div>' + lead + '</div>' + shloks +
      '<div class="gl-meter" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      '<ul class="gl-mini"><li><b>' + dev(st.learned) + '/' + dev(totalShlokas()) + '</b><small>' + esc(T("श्लोक सीखे", "shlokas learned")) + '</small></li><li><b>🔥 ' + dev(sk.cur) + '</b><small>' + esc(T("दिन लगातार", "day streak")) + '</small></li><li><b>' + dev(st.chapters) + '/18</b><small>' + esc(T("अध्याय पूर्ण", "chapters done")) + '</small></li></ul>' +
      '<div class="gl-row"><button type="button" class="gl-btn" data-gl="lesson">' + esc(rev ? T("आज की पुनरावृत्ति शुरू करें", "Begin today's revision") : T("आज का पाठ शुरू करें", "Begin today's lesson")) + ' <i>→</i></button>' +
      '<button type="button" class="gl-btn gl-ghost" data-gl="open">' + esc(T("मेरी प्रगति", "My progress")) + '</button></div></div>';
  }
  function renderCard() {
    if (!cardEl) return;
    ready().then(function () {
      var cur = S.joined ? currentDay() : null;
      var need = S.joined ? (cur && cur.kind === "lesson" ? cur : null) : null;
      var p = S.joined && need ? versesOf(need) : Promise.resolve(null);          // every shloka of the day, not just the first
      return p.then(function (v) {
        cardEl.classList.remove("is-loading");
        cardEl.classList.toggle("is-joined", !!S.joined);
        cardEl.innerHTML = S.joined ? activeCardHtml(cur, v) : promoCompact();
      });
    }).catch(function () {
      cardEl.classList.remove("is-loading");
      cardEl.innerHTML = '<div class="gl-cta"><div><b>' + esc(T("गीता अध्ययन", "Gita study")) + '</b><small>' + esc(T("अभी यह सामग्री लोड नहीं हो सकी।", "This could not be loaded just now.")) + '</small></div><button type="button" class="gl-btn" data-gl="open">' + esc(T("खोलें", "Open")) + '</button></div>';
    });
  }

  /* ================================================================== the page: hero */
  function pageHero() {
    return '<header class="gl-page-hero"><div class="gl-page-hero-in"><small>' + esc(T("गीता LMS", "Gita LMS")) + '</small><h1>' + esc(T("दैनिक गीता अध्ययन", "Daily Gita Study")) + '</h1>' +
      '<p>' + esc(T("प्रतिदिन 20 मिनट · रोज़ 2 श्लोक · हर 20 श्लोक पर पुनरावृत्ति", "20 minutes a day · 2 shlokas daily · revision after every 20 shlokas")) + '</p></div></header>';
  }
  function stepper(cur) {
    var names = [["संकल्प", "Pledge"], ["समय", "Time"], ["रिमाइंडर", "Reminder"], ["योजना", "Plan"]];
    return '<ol class="sr-steps gl-steps">' + names.map(function (nm, i) {
      var n = i + 1;
      return '<li class="sr-step' + (n === cur ? " is-cur" : n < cur ? " is-done" : "") + '"><span class="sr-dot">' + (n < cur ? "✓" : dev(n)) + '</span><span>' + esc(tt(nm)) + '</span></li>';
    }).join("") + '</ol>';
  }

  /* ================================================================== the wizard (steps 1-3 of the journey, and the plan) */
  var TIMES = [["05:30", ["ब्रह्म-मुहूर्त 5:30", "5:30 AM"]], ["06:30", ["सुबह 6:30", "6:30 AM"]], ["13:00", ["दोपहर 1:00", "1:00 PM"]], ["18:30", ["शाम 6:30", "6:30 PM"]], ["21:00", ["रात 9:00", "9:00 PM"]]];
  function userName() { var a = app(), u = a && a.getUser && a.getUser(); return u && u.name ? u.name : ""; }
  function wizardHtml() {
    var s = W.step, body = "";
    if (s === 1) {
      var nm = W.name || userName();
      if (!W.name && nm) W.name = nm;
      body = '<h2>' + esc(T("चरण 1 — संकल्प लें", "Step 1 — Take the pledge")) + '</h2>' +
        '<p class="gl-lead">' + esc(T("कोई भी साधना संकल्प से टिकती है। नीचे का संकल्प-पत्र पढ़िए, अपना नाम लिखिए और संकल्प लीजिए।", "Every practice lasts through a pledge. Read the pledge below, write your name and take it.")) + '</p>' +
        '<div class="gl-pledge"><span class="gl-pledge-om" aria-hidden="true">ॐ</span><h3>' + esc(T("संकल्प-पत्र", "Pledge")) + '</h3><p data-gl-pledge>' + esc(pledgeText(W.name)) + '</p>' +
        '<label class="gl-field"><span>' + esc(T("आपका नाम", "Your name")) + '</span><input type="text" data-gl-in="name" maxlength="60" value="' + esc(W.name) + '" placeholder="' + esc(T("जैसे: राधा", "e.g. Radha")) + '" autocomplete="name"></label>' +
        '<label class="gl-check"><input type="checkbox" data-gl-in="agree"' + (W.agree ? " checked" : "") + '> <span>' + esc(T("मैं यह संकल्प लेता/लेती हूँ।", "I take this pledge.")) + '</span></label></div>';
    } else if (s === 2) {
      body = '<h2>' + esc(T("चरण 2 — अपना समय चुनें", "Step 2 — Choose your time")) + '</h2>' +
        '<p class="gl-lead">' + esc(T("रोज़ किस समय 20 मिनट देना चाहते हैं? उदाहरण: सुबह 6:30 या रात 9:00 बजे।", "At what time each day can you give 20 minutes? For example 6:30 AM or 9:00 PM.")) + '</p>' +
        '<div class="gl-chipset">' + TIMES.map(function (t) { return '<button type="button" class="gl-chip' + (W.time === t[0] ? " is-on" : "") + '" data-gl="time" data-arg="' + t[0] + '">' + esc(tt(t[1])) + '</button>'; }).join("") + '</div>' +
        '<label class="gl-field gl-time"><span>' + esc(T("या अपना समय चुनें", "Or pick your own time")) + '</span><input type="time" data-gl-in="time" value="' + esc(W.time) + '"></label>' +
        '<p class="gl-note">' + esc(T("चुना हुआ समय: ", "Chosen time: ")) + '<b>' + esc(fmtTime(W.time)) + '</b></p>';
    } else if (s === 3) {
      var perm = permWords();
      body = '<h2>' + esc(T("चरण 3 — रिमाइंडर की अनुमति दें", "Step 3 — Allow reminders")) + '</h2>' +
        '<p class="gl-lead">' + esc(T("तय समय पर याद दिलाने के लिए अपना तरीका चुनें। आप जितने चाहें चुन सकते हैं।", "Choose how to be reminded at your time. You can pick more than one.")) + '</p>' +
        '<div class="gl-opts">' +
        '<label class="gl-opt"><input type="checkbox" data-gl-in="push"' + (W.push ? " checked" : "") + '><span><b>🔔 ' + esc(T("ब्राउज़र सूचना", "Browser notification")) + '</b><small>' + esc(T("वेबसाइट खुली होने पर तय समय पर सूचना आएगी। स्थिति: ", "A notification at your time while the site is open. Status: ")) + esc(perm) + '</small></span></label>' +
        '<label class="gl-opt"><input type="checkbox" data-gl-in="cal"' + (W.cal ? " checked" : "") + '><span><b>📅 ' + esc(T("कैलेंडर रिमाइंडर", "Calendar reminder")) + '</b><small>' + esc(T("रोज़ दोहराने वाला कार्यक्रम आपके फ़ोन/कैलेंडर में जुड़ेगा — साइट बन्द हो तब भी याद दिलाएगा।", "A repeating event in your phone or calendar — it reminds you even when the site is closed.")) + '</small></span></label>' +
        '<label class="gl-opt"><input type="checkbox" data-gl-in="wa"' + (W.wa ? " checked" : "") + '><span><b>💬 WhatsApp</b><small>' + esc(T("अपना नम्बर दें। WhatsApp संदेश भेजने की सुविधा जुड़ने पर यही विकल्प प्रयोग होगा।", "Give your number. It will be used when WhatsApp reminders are switched on.")) + '</small>' +
        (W.wa ? '<input type="tel" class="gl-in" data-gl-in="waNum" value="' + esc(W.waNum) + '" placeholder="+91 …" autocomplete="tel">' : '') + '</span></label>' +
        '<label class="gl-opt"><input type="checkbox" data-gl-in="mail"' + (W.mail ? " checked" : "") + '><span><b>✉️ ' + esc(T("ईमेल", "E-mail")) + '</b><small>' + esc(T("अपना पता दें। ईमेल रिमाइंडर की सुविधा जुड़ने पर यही विकल्प प्रयोग होगा।", "Give your address. It will be used when e-mail reminders are switched on.")) + '</small>' +
        (W.mail ? '<input type="email" class="gl-in" data-gl-in="mailAddr" value="' + esc(W.mailAddr) + '" placeholder="name@example.com" autocomplete="email">' : '') + '</span></label></div>' +
        '<p class="gl-note">' + esc(T("अभी ब्राउज़र सूचना और कैलेंडर रिमाइंडर काम करते हैं। WhatsApp/ईमेल की पसंद सुरक्षित रखी जाती है — भेजने की सुविधा अभी चालू नहीं है।", "Browser notifications and the calendar reminder work now. Your WhatsApp / e-mail choice is saved — sending from the server is not switched on yet.")) + '</p>';
    } else {
      var lessons = countKind("lesson"), revs = countKind("revise"), start = W.start || today();
      var sample = [PLAN[0], PLAN[1], PLAN[2], PLAN.filter(function (d) { return d.kind === "revise"; })[0]];
      body = '<h2>' + esc(T("आपकी सीखने की योजना", "Your learning plan")) + '</h2>' +
        '<p class="gl-lead">' + esc(T("रोज़ 2 श्लोक क्रम से; हर 20 श्लोक पर (या अध्याय पूरा होने पर) एक दिन पुनरावृत्ति के लिए।", "2 shlokas a day in order; one day of revision after every 20 shlokas (or when a chapter ends).")) + '</p>' +
        '<ul class="gl-plan-sum"><li><b>' + dev(lessons) + '</b><small>' + esc(T("पाठ के दिन", "lesson days")) + '</small></li><li><b>' + dev(revs) + '</b><small>' + esc(T("पुनरावृत्ति के दिन", "revision days")) + '</small></li><li><b>' + dev(dayCount()) + '</b><small>' + esc(T("कुल दिन", "days in all")) + '</small></li></ul>' +
        '<ol class="gl-plan-ex">' + sample.map(function (d) { return '<li class="' + (d.kind === "revise" ? "is-rev" : "") + '"><b>' + esc(T("दिन ", "Day ")) + dev(d.n) + '</b> ' + esc(dayTitle(d)) + '</li>'; }).join("") + '<li class="gl-etc">…</li></ol>' +
        '<label class="gl-field gl-time"><span>' + esc(T("आरम्भ की तिथि", "Start date")) + '</span><input type="date" data-gl-in="start" value="' + esc(start) + '" min="' + today() + '"></label>' +
        '<p class="gl-note">' + esc(T("रोज़ ", "Every day at ")) + '<b>' + esc(fmtTime(W.time)) + '</b> · ' + esc(T("समाप्ति (यदि रोज़ किया): ", "ends (if done daily): ")) + '<b>' + esc(fmtDate(addDays(start, dayCount() - 1))) + '</b></p>';
    }
    var ok = s === 1 ? (W.agree && (W.name || "").trim().length > 0) : true;
    var nav = '<div class="gl-nav">' + (s > 1 ? '<button type="button" class="gl-btn gl-ghost" data-gl="prev">← ' + esc(T("पीछे", "Back")) + '</button>' : '<span></span>') +
      (s < 4 ? '<button type="button" class="gl-btn" data-gl="next"' + (ok ? "" : " disabled") + '>' + esc(T("आगे", "Next")) + ' →</button>' : '<button type="button" class="gl-btn" data-gl="begin">🪷 ' + esc(T("योजना आरम्भ करें", "Begin the plan")) + '</button>') + '</div>';
    return '<div class="gl-wiz">' + stepper(s) + '<div class="gl-wiz-card">' + body + '</div>' + nav + '</div>';
  }

  function begin() {
    S.joined = true; S.paused = false;
    S.pledge = { name: (W.name || "").trim(), at: today(), ver: 1 };
    S.time = W.time; S.start = W.start || today();
    S.ch = { push: W.push, cal: W.cal, wa: W.wa, waNum: W.wa ? W.waNum.trim() : "", mail: W.mail, mailAddr: W.mail ? W.mailAddr.trim() : "" };
    S.owner = userKey();
    persist(); arm();
    if (S.ch.push && typeof Notification !== "undefined" && Notification.permission === "default") askPermission();
    if (S.ch.cal) downloadIcs();
    V.view = ""; W.step = 1;
    toast("🪷 " + T("संकल्प लिया गया — शुभ आरम्भ!", "Pledge taken — a good beginning!"));
    refreshAll(); window.scrollTo(0, 0);
  }

  /* ================================================================== the dashboard */
  function dashHtml() {
    var cur = currentDay(), st = stats(), sk = streakInfo(), pct = Math.round(st.learned / totalShlokas() * 100);
    var lag = cur ? plannedToday() - cur.n : 0;
    var pace = !cur ? "" : lag > 1 ? T("योजना से " + dev(lag) + " दिन पीछे — कोई बात नहीं, आज वहीं से आगे बढ़ें।", "About " + lag + " days behind plan — no matter, carry on from where you are.")
      : lag < -1 ? T("योजना से " + dev(-lag) + " दिन आगे — बहुत सुन्दर!", "About " + (-lag) + " days ahead of plan — lovely!") : T("योजना के अनुसार चल रहे हैं।", "You are on plan.");
    var greet = S.pledge && S.pledge.name ? T("नमस्ते, ", "Namaste, ") + esc(S.pledge.name) : esc(T("नमस्ते", "Namaste"));
    var head = '<section class="gl-welcome"><div><small>' + greet + ' 🙏</small><h2>' + esc(cur ? (cur.kind === "revise" ? T("आज पुनरावृत्ति का दिन है", "Today is a revision day") : T("आज का पाठ आपकी प्रतीक्षा में है", "Today's lesson is waiting for you")) : T("गीता-अध्ययन पूर्ण 🏵️", "Gita study complete 🏵️")) + '</h2><p>' + esc(pace) + '</p></div>' +
      '<span class="gl-streak"><b>🔥 ' + dev(sk.cur) + '</b><small>' + esc(T("दिन लगातार", "day streak")) + '</small></span></section>';
    var today_ = cur ? '<section class="gl-todaybox' + (cur.kind === "revise" ? " is-rev" : "") + '"><span class="gl-ribbon">' + esc(T("आज का अध्ययन", "Today's study")) + '</span><div class="gl-today-in"><div class="gl-cal"><span aria-hidden="true">' + (cur.kind === "revise" ? "🔁" : "📅") + '</span><b>' + esc(T("दिन ", "Day ")) + dev(cur.n) + '</b><small>' + esc(T("योजना: ", "planned: ")) + esc(fmtDate(dayDate(cur.n))) + '</small></div>' +
      '<div class="gl-todaytx"><b>' + esc(dayTitle(cur)) + '</b><span>' + esc(chapterOf(cur.ch).name) + '</span><small>' + esc(cur.kind === "revise" ? T("अब तक सीखे " + dev(cur.b - cur.a + 1) + " श्लोकों को दोहराएँ।", "Go over the " + (cur.b - cur.a + 1) + " shlokas learned so far.") : T("20 मिनट · 5 सुनें-पढ़ें · 10 अर्थ · 5 दोहराएँ", "20 min · 5 listen & read · 10 meaning · 5 repeat")) + '</small></div>' +
      '<button type="button" class="gl-btn" data-gl="day" data-arg="' + cur.n + '">' + esc(cur.kind === "revise" ? T("पुनरावृत्ति शुरू करें", "Begin revision") : T("आज का पाठ शुरू करें", "Begin today's lesson")) + ' <i>→</i></button></div></section>' : '';
    var stat = '<ul class="gl-stat4"><li><span class="gl-ic" aria-hidden="true">📖</span><b>' + dev(st.learned) + '<i>/' + dev(totalShlokas()) + '</i></b><small>' + esc(T("श्लोक सीखे", "shlokas learned")) + '</small><div class="gl-meter"><i style="width:' + pct + '%"></i></div></li>' +
      '<li><span class="gl-ic" aria-hidden="true">🔥</span><b>' + dev(sk.cur) + '<i> ' + esc(T("दिन", "days")) + '</i></b><small>' + esc(T("लगातार · सबसे लम्बी ", "streak · best ")) + dev(sk.best) + '</small></li>' +
      '<li><span class="gl-ic" aria-hidden="true">🏵️</span><b>' + dev(st.chapters) + '<i>/18</i></b><small>' + esc(T("अध्याय पूर्ण", "chapters completed")) + '</small></li>' +
      '<li><span class="gl-ic" aria-hidden="true">🔁</span><b>' + dev(st.revs) + '<i>/' + dev(countKind("revise")) + '</i></b><small>' + esc(T("पुनरावृत्ति पूरी", "revisions done")) + '</small></li></ul>';
    return head + today_ + stat + planHtml() + revisionHtml() + pledgeHtml() + settingsHtml();
  }

  /* the 18 chapters, each opening to its days */
  function planHtml() {
    var cur = currentDay(), curN = cur ? cur.n : 0;
    var tiles = INDEX.chapters.map(function (c) {
      var ds = PLAN.filter(function (d) { return d.ch === c.ch; }), les = ds.filter(function (d) { return d.kind === "lesson"; });
      var done = les.filter(function (d) { return isDone(d.n); }).length, all = les.length, open = V.open === c.ch;
      var rows = '';
      if (open) rows = '<div class="gl-days">' + ds.map(function (d) {
        var cls = isDone(d.n) ? "is-done" : d.n === curN ? "is-cur" : "is-lock", rev = d.kind === "revise";
        var can = isDone(d.n) || d.n === curN;
        return '<button type="button" class="gl-day ' + cls + (rev ? " is-rev" : "") + '" data-gl="day" data-arg="' + d.n + '"' + (can ? "" : " disabled") + ' title="' + esc(dayTitle(d)) + '"><span>' + (rev ? "🔁" : dev(d.n)) + '</span><small>' + (rev ? "" : span(d)) + '</small></button>';
      }).join("") + '</div>';
      return '<div class="gl-ch' + (open ? " is-open" : "") + (done === all ? " is-full" : "") + '"><button type="button" class="gl-ch-h" data-gl="chap" data-arg="' + c.ch + '" aria-expanded="' + open + '"><span class="gl-ch-n">' + (done === all ? "✓" : dev(c.ch)) + '</span><span class="gl-ch-t"><b>' + esc(c.name) + '</b><small>' + dev(c.n) + ' ' + esc(T("श्लोक", "shlokas")) + ' · ' + dev(ds.length) + ' ' + esc(T("दिन", "days")) + '</small></span><span class="gl-ch-p">' + dev(done) + '/' + dev(all) + '</span></button>' + rows + '</div>';
    }).join("");
    return '<section class="gl-box"><h3>' + esc(T("मेरी योजना — 18 अध्याय", "My plan — 18 chapters")) + '</h3><p class="gl-note">' + esc(T("अध्याय खोलकर दिन देखें। पूरे हुए दिन और आज का दिन खुले रहते हैं।", "Open a chapter to see its days. Finished days and today's day are open.")) + '</p><div class="gl-chs">' + tiles + '</div></section>';
  }
  function revisionHtml() {
    var nextRev = PLAN.filter(function (d) { return d.kind === "revise" && !isDone(d.n); })[0];
    var st = stats();
    var body = nextRev ? '<p>' + esc(T("अगली पुनरावृत्ति: ", "Next revision: ")) + '<b>' + esc(T("दिन ", "Day ")) + dev(nextRev.n) + '</b> — ' + esc(T("अध्याय ", "Chapter ")) + dev(nextRev.ch) + ', ' + esc(T("श्लोक ", "shloka ")) + span(nextRev) + '</p>' : '<p>' + esc(T("सभी पुनरावृत्तियाँ पूरी हुईं 🙏", "All revisions done 🙏")) + '</p>';
    return '<section class="gl-box gl-rev"><h3>🔁 ' + esc(T("पुनरावृत्ति की योजना", "Revision plan")) + '</h3>' + body +
      '<p class="gl-note">' + esc(T("हर 20 श्लोक सीखने के बाद, या अध्याय के अन्त में, एक पूरा दिन उन्हीं श्लोकों को दोहराने के लिए रखा गया है — पूरे कोर्स में " + dev(countKind("revise")) + " दिन।", "After every 20 shlokas, or at the end of a chapter, a whole day goes to revising exactly those shlokas — " + countKind("revise") + " days in all.")) + ' ' + esc(T("अब तक पूरी: ", "Done so far: ")) + dev(st.revs) + '.</p></section>';
  }
  function pledgeHtml() {
    if (!S.pledge) return "";
    return '<section class="gl-box gl-pledge-card"><span class="gl-pledge-om" aria-hidden="true">ॐ</span><h3>' + esc(T("मेरा संकल्प-पत्र", "My pledge")) + '</h3><p>' + esc(pledgeText(S.pledge.name)) + '</p>' +
      '<small>' + esc(T("संकल्प की तिथि: ", "Pledge taken on: ")) + esc(fmtDate(S.pledge.at || today())) + '</small></section>';
  }
  function settingsHtml() {
    var sync = loggedIn() ? '<p class="gl-sync is-on">☁️ ' + esc(T("आपकी प्रगति आपके खाते में सुरक्षित है — किसी भी उपकरण पर दिखेगी।", "Your progress is saved to your account — you will see it on any device.")) + '</p>' :
      '<p class="gl-sync">💾 ' + esc(T("प्रगति अभी इसी उपकरण पर है। ", "Your progress is on this device only. ")) + '<a href="/login">' + esc(T("साइन इन करें", "Sign in")) + '</a> ' + esc(T("तो वह आपके खाते में सुरक्षित रहेगी और हर उपकरण पर मिलेगी।", "and it is kept in your account for every device.")) + '</p>';
    return '<section class="gl-box"><h3>⚙️ ' + esc(T("रिमाइंडर और सेटिंग", "Reminders & settings")) + '</h3>' +
      '<div class="gl-set"><label class="gl-field gl-time"><span>' + esc(T("रोज़ का समय", "Daily time")) + '</span><input type="time" data-gl-in="s-time" value="' + esc(S.time) + '"></label>' +
      '<label class="gl-check"><input type="checkbox" data-gl-in="s-push"' + (S.ch.push ? " checked" : "") + '> <span>🔔 ' + esc(T("ब्राउज़र सूचना", "Browser notification")) + ' — ' + esc(permWords()) + '</span></label>' +
      (S.ch.push && typeof Notification !== "undefined" && Notification.permission === "default" ? '<button type="button" class="gl-btn gl-ghost gl-sm" data-gl="perm">🔔 ' + esc(T("अनुमति दें", "Allow")) + '</button>' : '') +
      '<div class="gl-row"><button type="button" class="gl-btn gl-ghost gl-sm" data-gl="ics">📅 ' + esc(T("कैलेंडर रिमाइंडर (.ics)", "Calendar reminder (.ics)")) + '</button>' +
      '<button type="button" class="gl-btn gl-ghost gl-sm" data-gl="pause">' + esc(S.paused ? T("▶ अध्ययन फिर आरम्भ करें", "▶ Resume") : T("⏸ विराम लें", "⏸ Pause reminders")) + '</button></div>' +
      '<p class="gl-note">💬 WhatsApp: ' + esc(S.ch.wa ? (S.ch.waNum || T("चुना गया", "chosen")) : T("नहीं चुना", "not chosen")) + ' · ✉️ ' + esc(T("ईमेल", "E-mail")) + ': ' + esc(S.ch.mail ? (S.ch.mailAddr || T("चुना गया", "chosen")) : T("नहीं चुना", "not chosen")) + ' <small>(' + esc(T("भेजने की सुविधा अभी चालू नहीं", "sending not switched on yet")) + ')</small></p></div>' +
      sync +
      '<div class="gl-row"><button type="button" class="gl-btn gl-ghost gl-sm gl-danger" data-gl="reset">↺ ' + esc(T("योजना फिर से आरम्भ करें", "Restart the course")) + '</button></div></section>';
  }

  /* ================================================================== "बोलकर जाँचें": check a recitation with the browser's speech recognition
     Chrome, Edge and Safari have it built in (webkitSpeechRecognition); Firefox does not, and there the button is not shown.
     The recogniser is a Hindi one (there is no Sanskrit model), so what it writes for a Sanskrit shloka is only
     approximate. The comparison is therefore forgiving: spelling is normalised (anusvara/chandrabindu, visarga, nukta,
     danda, verse numbers), the score is a character-level likeness that does not depend on where the word breaks fall,
     and each word of the shloka is marked as heard or missed. It is a practice aid, not a judge of pronunciation. */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var SP_PASS = 60;                 // a verse counts as recited well from this score (the recogniser misspells Sanskrit, so not higher)
  function speechNorm(s) {
    return String(s || "").normalize("NFC").replace(/[​-‍﻿]/g, "")
      .replace(/ँ/g, "ं").replace(/ः/g, "").replace(/़/g, "")                // chandrabindu -> anusvara, no visarga, no nukta
      .replace(/[।॥|.,;:!?'"‘’“”()\[\]\-–—*0-9०-९]/g, " ")                    // danda, punctuation, verse numbers
      .replace(/\s+/g, " ").trim().toLowerCase();
  }
  function lev(a, b) {
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      var t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }
  function likeness(a, b) {
    var x = Array.from(a), y = Array.from(b), m = Math.max(x.length, y.length);
    return m ? 1 - lev(x, y) / m : 1;
  }
  /* How it SOUNDS, not how it is spelt: the Hindi recogniser writes Sanskrit words with Hindi spellings (धर्मक्षेत्रे -> धर्मक्षेत्र,
     समवेता -> समावेद), so words are compared through a simple phonetic key -- aspirated and plain stops alike, श/ष/स alike, व/ब alike,
     long and short vowels alike, ण/न/ं alike, no final "a". */
  var PH_CONS = { "क": "k", "ख": "k", "ग": "g", "घ": "g", "ङ": "n", "च": "c", "छ": "c", "ज": "j", "झ": "j", "ञ": "n", "ट": "t", "ठ": "t", "ड": "d", "ढ": "d", "ण": "n",
    "त": "t", "थ": "t", "द": "d", "ध": "d", "न": "n", "प": "p", "फ": "p", "ब": "b", "भ": "b", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "b", "श": "s", "ष": "s", "स": "s", "ह": "h",
    "ऩ": "n", "ऱ": "r", "ळ": "l" };
  var PH_IV = { "अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri", "ए": "e", "ऐ": "e", "ओ": "o", "औ": "o", "ऑ": "o", "ऍ": "e" };
  var PH_MA = { "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "े": "e", "ै": "e", "ो": "o", "ौ": "o", "ॉ": "o", "ॅ": "e" };
  function phon(word) {
    var w = Array.from(String(word).normalize("NFC").replace(/[​-‍]/g, "").replace(/ज्ञ/g, "gy").replace(/क्ष/g, "ks").replace(/ँ/g, "ं").replace(/ः/g, "").replace(/़/g, ""));
    var out = "", i, c, nx;
    for (i = 0; i < w.length; i++) {
      c = w[i]; nx = w[i + 1];
      if (PH_CONS[c]) {
        out += PH_CONS[c];
        if (nx === "्") { i++; continue; }                          // halant: no vowel
        if (nx && PH_MA[nx]) { out += PH_MA[nx]; i++; continue; }
        out += "a";                                                  // the inherent vowel
      } else if (PH_IV[c]) out += PH_IV[c];
      else if (c === "ं") out += "n";
      else if (/[a-z]/.test(c)) out += c;
    }
    return out.replace(/a+$/, "").replace(/(.)\1+/g, "$1");
  }
  /* 0-1: how alike two words sound; a heard word that is the tail or head of a longer shloka word counts too (सञ्जय heard as जय) */
  function wordLike(a, b) {
    var s = likeness(a, b);
    var lo = Math.min(a.length, b.length), hi = Math.max(a.length, b.length);
    if (s < 0.75 && lo >= 3 && lo >= 0.45 * hi && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1)) s = 0.75;       // not a stray 3-letter match inside a long word
    return s;
  }
  /* lines: the shloka's lines; heard: what the recogniser wrote. Returns { score 0-100, words: [{ w, ok }] }.
     score = the average of (a) how alike the whole recitation sounds and (b) the share of shloka words found, in order,
     among the heard words (a shloka word may be found as one heard word or two joined: "मां का" = मामका). */
  function scoreSpeech(lines, heard) {
    var shown = lines.join(" ").replace(/[।॥]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(function (w) { return speechNorm(w); });
    var ew = shown.map(function (w) { return phon(speechNorm(w)); });
    var hw = speechNorm(heard).split(" ").filter(Boolean).map(function (w) { return phon(w); }).filter(Boolean);
    var whole = likeness(ew.join(""), hw.join(""));
    var ptr = 0, hit = 0;
    var words = shown.map(function (w, k) {
      var best = 0, at = -1, len = 1, i, n, s;
      for (i = ptr; i < Math.min(hw.length, ptr + 4); i++) {
        for (n = 1; n <= 2 && i + n <= hw.length; n++) {
          s = wordLike(ew[k], hw.slice(i, i + n).join(""));
          if (s > best) { best = s; at = i; len = n; }
        }
      }
      var ok = best >= 0.6;
      if (ok) { hit++; ptr = at + len; }
      return { w: w.replace(/[,;:.]/g, ""), ok: ok };
    });
    var cover = shown.length ? hit / shown.length : 0;
    return { score: Math.max(0, Math.min(100, Math.round((whole + cover) / 2 * 100))), words: words };
  }
  /* of several readings the recogniser offers for one stretch of speech, the one that fits the shloka best */
  function fitness(lines, text) {
    var ew = lines.join(" ").split(/\s+/).map(function (w) { return phon(speechNorm(w)); }).filter(Boolean);
    return speechNorm(text).split(" ").filter(Boolean).reduce(function (sum, w) {
      var p = phon(w), best = 0;
      ew.forEach(function (e) { var s = wordLike(e, p); if (s > best) best = s; });
      return sum + (best >= 0.6 ? best : 0);
    }, 0);
  }

  /* How long it listens: it keeps listening through pauses, and gives the result
       - 5 seconds after the learner stops speaking, or
       - when the longest time allowed runs out: the standard time to read this shloka x 1.5, counted from the start,
       - or at once when the learner presses stop.
     The standard time is estimated from the length of the shloka (about 0.3 s a letter, never under 10 s). */
  var SP_SILENCE_MS = 5000, SP_PER_CHAR = 0.3, SP_MIN_STD = 10, SP_MAX_FACTOR = 1.5;
  function speechPlan(lines) {
    var n = Array.from(speechNorm(lines.join(" ")).replace(/ /g, "")).length;
    var std = Math.max(SP_MIN_STD, Math.round(n * SP_PER_CHAR));
    return { std: std, max: Math.round(std * SP_MAX_FACTOR) };
  }
  /* The language the recogniser listens in. Hindi is the default; the others are there to try (Marathi and Nepali are also
     written in Devanagari and know many Sanskrit-derived words; Sanskrit is not offered by most browsers). */
  var SP_LANGS = [["hi-IN", ["हिन्दी", "Hindi"]], ["mr-IN", ["मराठी", "Marathi"]], ["ne-NP", ["नेपाली", "Nepali"]], ["sa-IN", ["संस्कृत (प्रायोगिक)", "Sanskrit (experimental)"]]];
  function spLang() { try { var l = localStorage.getItem("swadhyay_gita_sr_lang"); if (SP_LANGS.some(function (x) { return x[0] === l; })) return l; } catch (e) {} return "hi-IN"; }
  function setSpLang(l) { try { localStorage.setItem("swadhyay_gita_sr_lang", l); } catch (e) {} }
  /* Newer Chrome can recognise on the device and take "phrases" to listen for, which is exactly what helps with a shloka whose words
     the general Hindi model does not know. The language's on-device model is fetched once, the first time it is wanted. */
  var localState = {}, installTried = {};
  function localStatus(lang) {
    if (!SR || typeof SR.available !== "function") return Promise.resolve("unavailable");
    if (localState[lang]) return Promise.resolve(localState[lang]);
    var p;
    try { p = SR.available({ langs: [lang], processLocally: true }); } catch (e) { return Promise.resolve("unavailable"); }
    return Promise.resolve(p).then(function (st) { localState[lang] = String(st); return localState[lang]; }).catch(function () { localState[lang] = "unavailable"; return "unavailable"; });
  }
  function prepareLocal(lang) {
    return localStatus(lang).then(function (st) {
      if (st === "downloadable" && !installTried[lang] && typeof SR.install === "function") {
        installTried[lang] = true;
        try { Promise.resolve(SR.install({ langs: [lang], processLocally: true })).then(function (ok) { localState[lang] = ok ? "available" : "unavailable"; if (ok) toast(T("स्थानीय आवाज़-मॉडल तैयार — अगली बार पहचान और बेहतर होगी।", "On-device voice model ready — recognition will be better next time.")); }).catch(function () {}); } catch (e) {}
      }
      return st;
    });
  }
  function biasRecogniser(rec, lines) {
    if (localState[rec.lang] !== "available" || typeof window.SpeechRecognitionPhrase !== "function" || !("phrases" in rec)) return false;
    try {
      var words = [], seen = {};
      lines.join(" ").replace(/[।॥]/g, " ").split(/\s+/).forEach(function (w) { w = speechNorm(w); if (w && !seen[w]) { seen[w] = 1; words.push(w); } });
      var ph = words.map(function (w) { return new window.SpeechRecognitionPhrase(w, 8); });
      for (var i = 0; i + 1 < words.length; i++) ph.push(new window.SpeechRecognitionPhrase(words[i] + " " + words[i + 1], 5));
      rec.processLocally = true; rec.phrases = ph;
      return true;
    } catch (e) { return false; }
  }
  var job = null, sp = {};              // job: the recitation being listened to; sp: results by "<day>:<verse>" so a redraw keeps them
  var spLines = {};                     // key -> the shloka's lines (set when the block is drawn)
  function endJob(j) {
    if (!j) return;
    j.done = true; clearInterval(j.tick);
    if (j.cleanup) { try { j.cleanup(); } catch (e) {} }
    if (j.rec && !j.cloud) { j.rec.onresult = j.rec.onerror = j.rec.onend = null; try { j.rec.abort(); } catch (e) {} }
    if (job === j) job = null;
  }
  function stopSpeech() {               // leaving the view: drop whatever was being listened to
    if (job) { var k = job.key; endJob(job); if (sp[k] && sp[k].state === "listening") sp[k] = { state: "idle" }; }
  }
  function speakErr(code) {
    return code === "not-allowed" || code === "service-not-allowed" ? T("माइक्रोफ़ोन की अनुमति नहीं मिली — ब्राउज़र की सेटिंग में अनुमति दें।", "Microphone permission was not given — allow it in the browser settings.")
      : code === "no-speech" ? T("कुछ सुनाई नहीं दिया — माइक के पास स्पष्ट बोलें और फिर दबाएँ।", "Nothing was heard — speak clearly near the mic and try again.")
      : code === "audio-capture" ? T("माइक्रोफ़ोन नहीं मिला।", "No microphone was found.")
      : code === "network" ? T("स्पीच-पहचान सेवा तक पहुँच नहीं हो सकी (इंटरनेट देखें)।", "The speech service could not be reached (check the internet).")
      : code === "language-not-supported" ? T("यह भाषा आपके ब्राउज़र में समर्थित नहीं — ऊपर से हिन्दी चुनें।", "This language is not supported in your browser — choose Hindi above.")
      : T("बोलकर जाँच अभी नहीं हो सकी।", "The speech check could not run just now.");
  }
  function liveHtml(r) {
    var left = Math.max(0, r.left), q = r.quiet;
    return '🎙️ ' + esc(T("सुन रहा हूँ — पूरा श्लोक बोलिए।", "Listening — recite the whole shloka.")) + '<br><small>' +
      esc(T("बोलना रुकने के 5 सेकंड बाद परिणाम आएगा · अधिकतम ", "The result comes 5 seconds after you stop · at most ")) + dev(r.max) + esc(T(" सेकंड · शेष ", " seconds · left ")) + '<b>' + dev(left) + '</b>' + esc(T(" सेकंड", " s")) +
      (q != null ? ' · ' + esc(T("परिणाम ", "result in ")) + '<b>' + dev(q) + '</b>' + esc(T(" सेकंड में", " s")) : '') + '</small>' + (r.live ? '<br><i>' + esc(r.live) + '</i>' : '');
  }
  function speakHtml(key, lines) {
    if (!SR && !cloudOK()) return '';
    var r = sp[key] || { state: "idle" };
    var listening = r.state === "listening";
    var out = '';
    if (listening) out = '<p class="gl-sp-live">' + liveHtml(r) + '</p>';
    else if (r.state === "checking") out = '<p class="gl-sp-live">⏳ ' + esc(r.note === "wake" ? T("आवाज़-जाँच जाग रही है — आपकी रिकॉर्डिंग सुरक्षित है, थोड़ी देर…", "The speech check is waking up — your recording is safe, one moment…")
      : r.note === "recording" ? T("रिकॉर्डिंग तैयार हो रही है…", "Preparing your recording…") : T("संस्कृत पहचान से जाँच हो रही है…", "Checking with the Sanskrit recogniser…")) + '</p>';
    else if (r.state === "error") out = '<p class="gl-sp-err">⚠️ ' + esc(r.msg) + '</p>';
    else if (r.state === "done") {
      var good = r.score >= 75, ok = r.score >= 50;
      out = '<div class="gl-sp-res' + (good ? " is-good" : ok ? " is-ok" : "") + '"><b>' + dev(r.score) + '%</b> ' + esc(good ? T("बहुत सुन्दर 🪷 आपका पाठ श्लोक से अच्छी तरह मिलता है।", "Lovely 🪷 your recitation matches the shloka well.")
        : ok ? T("अच्छा प्रयास — लाल शब्दों को एक बार और पढ़कर फिर बोलें।", "A good try — read the red words once more and recite again.") : T("फिर प्रयास करें — पहले श्लोक सुनें-पढ़ें, फिर बिना देखे बोलें।", "Try again — listen and read first, then recite without looking.")) +
        '<div class="gl-sp-words">' + r.words.map(function (w) { return '<span class="' + (w.ok ? "is-ok" : "is-miss") + '">' + esc(w.w) + '</span>'; }).join(" ") + '</div>' +
        '<small>' + esc(T("सुना गया: ", "Heard: ")) + esc(r.heard) + '</small>' +
        (r.score < 75 ? '<small class="gl-sp-why">' + esc(T("ब्राउज़र की पहचान संस्कृत शब्दों को हिन्दी शब्द बना देती है, इसलिए लाल शब्द हमेशा आपकी भूल नहीं होते — उन्हें श्लोक में देखकर एक बार और बोलें।", "The browser's recogniser turns Sanskrit words into Hindi ones, so a red word is not always your mistake — look at it in the shloka and say it once more.")) + '</small>' : '') + '</div>';
    }
    return '<div class="gl-sp" data-sp="' + esc(key) + '"><button type="button" class="gl-btn gl-ghost gl-sm' + (listening ? " is-live" : "") + '" data-gl="speak" data-arg="' + esc(key) + '">' + (listening ? "■ " + esc(T("रोकें और परिणाम देखें", "Stop and see the result")) : "🎤 " + esc(T("बोलकर जाँचें", "Check by speaking"))) + '</button><div class="gl-sp-out">' + out + '</div></div>';
  }
  function speakNote() {
    if (cloudOK()) {
      return '<p class="gl-note gl-sp-note">' + esc(T("बोलकर जाँच संस्कृत के लिए बनी AI4Bharat की IndicConformer पहचान से होती है। बटन दबाकर पूरा श्लोक बोलें — बीच में रुकने पर भी वह सुनती रहेगी; 5 सेकंड चुप रहने पर परिणाम आ जाएगा। आपकी आवाज़ Kalyan की अपनी आवाज़-जाँच सेवा को भेजी जाती है, जाँच के बाद सहेजी नहीं जाती। यह अभ्यास का सहायक है, उच्चारण का निर्णायक नहीं।", "The speaking check uses AI4Bharat's IndicConformer, a recogniser built for Sanskrit. Press the button and recite the whole shloka — it keeps listening through pauses and gives the result after 5 seconds of silence. Your voice is sent to Kalyan's own speech service and is not kept after the check. It is a practice aid, not a judge of pronunciation.")) + '</p><p class="gl-sp-asr" data-asr-status></p>';
    }
    return SR ? '<label class="gl-sp-lang">' + esc(T("पहचान की भाषा: ", "Recognition language: ")) + '<select data-gl-in="sp-lang">' + SP_LANGS.map(function (l) { return '<option value="' + l[0] + '"' + (spLang() === l[0] ? " selected" : "") + '>' + esc(tt(l[1])) + '</option>'; }).join("") + '</select></label>' +
      '<p class="gl-note gl-sp-note">' + esc(T("बोलकर जाँच ब्राउज़र की स्पीच-पहचान से होती है (हिन्दी)। बटन दबाकर पूरा श्लोक बोलें — बीच में रुकने पर भी वह सुनता रहेगा; 5 सेकंड चुप रहने पर परिणाम आ जाएगा। आपकी आवाज़ ब्राउज़र की स्पीच सेवा तक जा सकती है; Kalyan उसे सहेजता नहीं। संस्कृत शब्द पूरी तरह सटीक नहीं पहचाने जाते — इसे अभ्यास का सहायक समझें।", "The speaking check uses your browser's speech recognition (Hindi). Press the button and recite the whole shloka — it keeps listening through pauses and gives the result after 5 seconds of silence. Your voice may go to the browser's speech service; Kalyan does not store it. Sanskrit words are not recognised perfectly — treat it as a practice aid.")) + '</p>'
      : '<p class="gl-note gl-sp-note">🎤 ' + esc(T("इस ब्राउज़र में बोलकर जाँच उपलब्ध नहीं — Chrome, Edge या Safari में आज़माएँ।", "Speaking check is not available in this browser — try Chrome, Edge or Safari.")) + '</p>';
  }
  function paintSpeak(key) {
    var box = root && root.querySelector('[data-sp="' + key.replace(/"/g, "") + '"]');
    if (box) box.outerHTML = speakHtml(key, spLines[key] || []);
  }
  function speakBlock(key, lines) { spLines[key] = lines; return speakHtml(key, lines); }

  /* ================================================================== the Sanskrit speech service (cloud engine)
     When the site has an ASR_URL (see /api/asr/config) the check runs on AI4Bharat's Sanskrit IndicConformer, hosted as its
     own service (asr-service/), instead of the browser's Hindi recogniser:
       - when a lesson opens the page pings the service's /health so a sleeping host is awake by the time the learner recites
         (and again when the mic button is pressed; at most one ping series every 10 minutes);
       - the browser records the recitation, finds the silence itself (5 s after the last speech, or the longest time
         allowed = standard reading time x 1.5), trims it, makes a 16 kHz mono WAV;
       - the site hands out a short-lived signed token (rate-limited), the WAV goes to the service, the text comes back
         and goes through the same phonetic scoring as before;
       - if the service cannot be reached the next tap uses the browser recogniser for a while. */
  var asr = { cfg: null, cfgP: null, ready: false, readyAt: 0, status: "idle", polling: 0, failedAt: 0 };
  function asrConfig() {
    if (!asr.cfgP) asr.cfgP = fetch("/api/asr/config", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .catch(function () { return { enabled: false }; }).then(function (c) { asr.cfg = c; return c; });
    return asr.cfgP;
  }
  function cloudOK() {
    return !!(asr.cfg && asr.cfg.enabled && asr.cfg.url && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder &&
      (window.AudioContext || window.webkitAudioContext) && Date.now() - asr.failedAt > 5 * 60 * 1000);
  }
  function paintAsrStatus() {
    var words = asr.status === "ready" ? "🟢 " + T("संस्कृत आवाज़-जाँच तैयार", "Sanskrit speech check ready")
      : asr.status === "error" ? "⚠️ " + T("संस्कृत आवाज़-जाँच अभी उपलब्ध नहीं — ब्राउज़र की जाँच प्रयोग होगी।", "Sanskrit speech check unavailable — the browser's check will be used.")
      : "⏳ " + T("संस्कृत आवाज़-जाँच जाग रही है… (पहली बार 1–2 मिनट लग सकते हैं — तब तक श्लोक पढ़ते रहें)", "Sanskrit speech check is waking up… (the first time can take 1–2 minutes — keep reading meanwhile)");
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-asr-status]"), function (el) { el.textContent = asr.status === "idle" ? "" : words; });
  }
  function ping() {
    return fetch(asr.cfg.url + "/health", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (j) {
      if (j && j.ready) { asr.ready = true; asr.readyAt = Date.now(); asr.status = "ready"; }
      else if (j && j.error && !j.loading) asr.status = "error";
      else asr.status = "waking";
      paintAsrStatus();
      return j;
    });
  }
  /* wake the service (if it is asleep) and keep asking until it says it is ready -- gently: every 4 s, for at most 3 minutes */
  function warmUp() {
    asrConfig().then(function (c) {
      if (!c.enabled || !cloudOK() || asr.polling) return;
      if (asr.ready && Date.now() - asr.readyAt < 10 * 60 * 1000) { asr.status = "ready"; paintAsrStatus(); return; }
      asr.ready = false; asr.status = "waking"; paintAsrStatus();
      var tries = 0;
      asr.polling = 1;
      (function loop() {
        ping().then(function (j) {
          if ((j && j.ready) || ++tries > 45 || !(root && root.isConnected)) { asr.polling = 0; if (!(j && j.ready) && tries > 45) { asr.status = "error"; paintAsrStatus(); } return; }
          setTimeout(loop, 4000);
        });
      })();
    });
  }
  function waitReady(ms) {                         // after the recitation: the audio is kept while the service finishes waking
    var t0 = Date.now();
    return new Promise(function (resolve, reject) {
      (function loop() {
        if (asr.ready) { resolve(); return; }
        if (Date.now() - t0 > ms) { reject(new Error("timeout")); return; }
        ping().then(function (j) { if (j && j.ready) resolve(); else setTimeout(loop, 3000); });
      })();
    });
  }

  /* ---- audio: what the page recorded -> mono 16 kHz 16-bit WAV (trimmed around the speech) */
  function toWav16k(blob, fromSec, toSec) {
    var AC = window.AudioContext || window.webkitAudioContext;
    return blob.arrayBuffer().then(function (ab) {
      var ctx = new AC();
      return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }).then(function (buf) {
        try { ctx.close(); } catch (e) {}
        var n = Math.max(1, Math.ceil(buf.duration * 16000));
        var off = new OfflineAudioContext(1, n, 16000), src = off.createBufferSource();
        src.buffer = buf; src.connect(off.destination); src.start();
        return off.startRendering();
      });
    }).then(function (out) {
      var x = out.getChannelData(0), a = Math.max(0, Math.floor(fromSec * 16000)), b = Math.min(x.length, Math.ceil(toSec * 16000));
      if (b - a < 4800) { a = 0; b = x.length; }                                // too short to trim safely: keep it all
      var pcm = new Int16Array(b - a);
      for (var i = a; i < b; i++) { var v = Math.max(-1, Math.min(1, x[i])); pcm[i - a] = v < 0 ? v * 32768 : v * 32767; }
      var hdr = new ArrayBuffer(44), dv = new DataView(hdr);
      function str(o, s) { for (var k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); }
      str(0, "RIFF"); dv.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, pcm.length * 2, true);
      return new Blob([hdr, pcm.buffer], { type: "audio/wav" });
    });
  }

  function startCloud(key, dayN) {
    if (job && job.key === key) { finishCloud(job, "stop"); return; }              // pressed again: stop and check
    stopSpeech();
    var lines = spLines[key] || [], plan = speechPlan(lines);
    var j = { key: key, dayN: dayN, lines: lines, cloud: true, t0: Date.now(), first: 0, last: 0, spoke: false, loud: 0, done: false, chunks: [], tick: null, cleanup: null, floor: 0.01, n0: 0 };
    job = j;
    sp[key] = { state: "listening", engine: "cloud", max: plan.max, left: plan.max, quiet: null, live: "" };
    paintSpeak(key);
    warmUp();
    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      if (j.done) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(), an = ctx.createAnalyser(), buf = new Float32Array(1024);
      an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
      if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(function () {});       // some browsers start it paused
      var rec = new MediaRecorder(stream);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) j.chunks.push(e.data); };
      j.rec = rec;
      j.cleanup = function () { try { if (rec.state !== "inactive") rec.stop(); } catch (e) {} stream.getTracks().forEach(function (t) { t.stop(); }); try { ctx.close(); } catch (e) {} };
      rec.start(250);
      j.t0 = Date.now();
      j.tick = setInterval(function () {
        if (j.done) return;
        an.getFloatTimeDomainData(buf);
        var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        var rms = Math.sqrt(s / buf.length), now = Date.now(), el = (now - j.t0) / 1000;
        if (el < 0.6) { j.floor = Math.max(j.floor * 0.7 + rms * 0.3, 0.003); }                // the room's own noise, from the first moments
        else if (rms < j.floor * 1.5) j.floor = j.floor * 0.98 + rms * 0.02;
        var voiced = rms > Math.max(0.02, j.floor * 3);
        j.loud = voiced ? Math.min(j.loud + 1, 10) : Math.max(j.loud - 1, 0);
        if (j.loud >= 3) { if (!j.spoke) { j.spoke = true; j.first = el; } j.last = now; }
        var r = sp[key];
        if (r && r.state === "listening") {
          r.left = Math.ceil(plan.max - el);
          r.quiet = j.spoke ? Math.max(0, Math.ceil((SP_SILENCE_MS - (now - j.last)) / 1000)) : null;
          r.live = j.loud >= 3 ? "🔊" : "";
          var elx = root && root.querySelector('[data-sp="' + key + '"] .gl-sp-live'); if (elx) elx.innerHTML = liveHtml(r);
        }
        if (j.spoke && now - j.last >= SP_SILENCE_MS) finishCloud(j, "silence");
        else if (el >= plan.max) finishCloud(j, "max");
      }, 100);
    }).catch(function (e) {
      if (j.done) return;
      endJob(j);
      sp[key] = { state: "error", msg: speakErr(e && e.name === "NotFoundError" ? "audio-capture" : "not-allowed") };
      paintSpeak(key);
    });
  }
  function finishCloud(j, why) {
    if (!j || j.done) return;
    var key = j.key, spokeAt = j.first, lastAt = (j.last - j.t0) / 1000;
    var rec = j.rec;
    j.done = true; clearInterval(j.tick);
    if (job === j) job = null;
    if (!rec || !j.spoke) {                                    // nothing was said
      if (j.cleanup) j.cleanup();
      sp[key] = { state: "error", msg: speakErr("no-speech") }; paintSpeak(key); return;
    }
    sp[key] = { state: "checking", note: "recording" }; paintSpeak(key);
    var stopped = new Promise(function (res) { rec.onstop = res; try { if (rec.state !== "inactive") rec.stop(); else res(); } catch (e) { res(); } });
    stopped.then(function () {
      j.cleanup && j.cleanup();
      var blob = new Blob(j.chunks, { type: (rec.mimeType || "audio/webm") });
      return toWav16k(blob, Math.max(0, spokeAt - 0.6), lastAt + 0.9);
    }).then(function (wav) { return sendToService(j, wav); }).catch(function (e) {
      asr.failedAt = e && e.code === "429" ? asr.failedAt : Date.now();
      sp[key] = { state: "error", msg: e && e.userMsg ? e.userMsg : T("संस्कृत आवाज़-जाँच तक पहुँच नहीं हो सकी — अगली बार ब्राउज़र की जाँच प्रयोग होगी; कुछ देर बाद फिर प्रयास करें।", "The Sanskrit speech check could not be reached — the browser's check will be used next time; try again in a moment.") };
      paintSpeak(key);
    });
  }
  function userErr(code, msg) { var e = new Error(msg || code); e.code = code; e.userMsg = msg; return e; }
  function sendToService(j, wav) {
    var key = j.key;
    function token() {
      return fetch("/api/asr/token", { method: "POST", credentials: "same-origin" }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 429) throw userErr("429", d.error || T("इस घण्टे की सीमा पूरी हो गयी — कुछ देर बाद फिर प्रयास करें।", "Hourly limit reached — try again later."));
          if (!r.ok || !d.token) throw userErr("token");
          return d;
        });
      });
    }
    function upload(d, retry) {
      return fetch(d.url + "/transcribe", { method: "POST", headers: { Authorization: "Bearer " + d.token, "Content-Type": "audio/wav" }, body: wav }).then(function (r) {
        if (r.status === 401 && retry) return token().then(function (d2) { return upload(d2, false); });
        if (r.status === 503 || r.status === 502 || r.status === 504) throw userErr("wake");
        if (!r.ok) throw userErr("http" + r.status);
        return r.json();
      });
    }
    sp[key] = { state: "checking", note: asr.ready ? "check" : "wake" }; paintSpeak(key);
    return waitReady(90000).then(function () { sp[key] = { state: "checking", note: "check" }; paintSpeak(key); return token(); }).then(function (d) {
      return upload(d, true).catch(function (e) { if (e.code === "wake") return waitReady(60000).then(function () { return upload(d, true); }); throw e; });
    }).then(function (res) {
      var heard = (res.text || "").replace(/[॑-॔᳐-ᳺ]/g, "").trim();     // the model sometimes writes Vedic accent marks; the shloka text has none
      if (!heard) { sp[key] = { state: "error", msg: speakErr("no-speech") }; paintSpeak(key); return; }
      var best = scoreSpeech(j.lines, heard);
      sp[key] = { state: "done", score: best.score, words: best.words, heard: heard, engine: "cloud" };
      noteResult(key, j.dayN, best.score);
      paintSpeak(key);
    });
  }

  function textOf(j) { return j.base.concat(j.cur.finals, j.cur.interim ? [j.cur.interim] : []).join(" ").replace(/\s+/g, " ").trim(); }
  function finishSpeech(j, why) {
    if (!j || j.done) return;
    var heard = textOf(j), key = j.key;
    endJob(j);
    if (why === "error") return;
    if (!heard) { sp[key] = { state: "error", msg: speakErr("no-speech") }; paintSpeak(key); return; }
    var best = scoreSpeech(j.lines, heard);
    sp[key] = { state: "done", score: best.score, words: best.words, heard: heard };
    noteResult(key, j.dayN, best.score);
    paintSpeak(key);
  }
  function startSpeech(key, dayN) {
    if (cloudOK()) { startCloud(key, dayN); return; }
    if (!SR) return;
    if (job && job.key === key) { finishSpeech(job, "stop"); return; }          // the button was pressed again: stop and show the result
    stopSpeech();
    var lines = spLines[key] || [], plan = speechPlan(lines);
    var j = { key: key, dayN: dayN, lines: lines, base: [], cur: { finals: [], interim: "" }, t0: Date.now(), last: 0, spoke: false, done: false, rec: null, tick: null, restarts: 0 };
    job = j;
    sp[key] = { state: "listening", max: plan.max, left: plan.max, quiet: null, live: "" };
    function elapsed() { return (Date.now() - j.t0) / 1000; }
    function refresh() {
      var r = sp[key]; if (!r || r.state !== "listening") return;
      r.left = Math.ceil(plan.max - elapsed());
      r.quiet = j.spoke ? Math.max(0, Math.ceil((SP_SILENCE_MS - (Date.now() - j.last)) / 1000)) : null;
      r.live = textOf(j);
      var el = root && root.querySelector('[data-sp="' + key + '"] .gl-sp-live');
      if (el) el.innerHTML = liveHtml(r);
    }
    function open() {
      var rec = new SR();
      rec.lang = spLang(); rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 5;
      j.biased = biasRecogniser(rec, lines);
      j.rec = rec; j.cur = { finals: [], interim: "" };
      rec.onresult = function (ev) {
        var fin = [], interim = "";
        for (var i = 0; i < ev.results.length; i++) {
          var res = ev.results[i], t = res[0].transcript;
          if (res.isFinal) {
            var bf = res.length > 1 ? fitness(lines, t) : 0;                       // the reading that fits the shloka best
            for (var a = 1; a < res.length; a++) { var f = fitness(lines, res[a].transcript); if (f > bf) { bf = f; t = res[a].transcript; } }
            fin.push(t);
          } else interim += t;
        }
        j.cur = { finals: fin, interim: interim.trim() };
        if (textOf(j)) { j.spoke = true; j.last = Date.now(); }
        refresh();
      };
      rec.onspeechend = function () { if (j.spoke) j.last = Date.now(); };
      rec.onerror = function (ev) {
        if (j.done) return;
        if (ev.error === "no-speech" || ev.error === "aborted") return;           // keep waiting; onend restarts it
        sp[key] = { state: "error", msg: speakErr(ev.error) }; endJob(j); paintSpeak(key);
      };
      rec.onend = function () {
        if (j.done) return;
        j.base = j.base.concat(j.cur.finals, j.cur.interim ? [j.cur.interim] : []); j.cur = { finals: [], interim: "" };
        if (elapsed() < plan.max && j.restarts < 12) { j.restarts++; try { open(); } catch (e) { finishSpeech(j, "end"); } }   // the browser ended the session early: listen again
        else finishSpeech(j, "end");
      };
      rec.start();
    }
    j.tick = setInterval(function () {
      if (j.done) return;
      if (j.spoke && Date.now() - j.last >= SP_SILENCE_MS) { finishSpeech(j, "silence"); return; }
      if (elapsed() >= plan.max) { finishSpeech(j, "max"); return; }
      refresh();
    }, 400);
    prepareLocal(spLang()).then(function () {                                       // is there an on-device model to bias? (short wait, then listen)
      if (j.done) return;
      try { open(); } catch (e) { sp[key] = { state: "error", msg: speakErr("") }; endJob(j); paintSpeak(key); }
    });
    paintSpeak(key);
  }

  /* once every verse of a lesson has been recited well, the "done" box of the self-check is ticked for the learner */
  function noteResult(key, dayN, score) {
    if (score < SP_PASS || !dayN || !PLAN || !PLAN[dayN - 1] || PLAN[dayN - 1].kind !== "lesson") return;
    var d = PLAN[dayN - 1], all = true;
    for (var v = d.a; v <= d.b; v++) { var r = sp[dayN + ":" + v]; if (!r || r.state !== "done" || r.score < SP_PASS) all = false; }
    if (all) {
      (V.tick[dayN] = V.tick[dayN] || {}).c = true;
      var box = root && root.querySelector('[data-gl-in="tick-c"]'); if (box) box.checked = true;
    }
  }

  /* ================================================================== a day: lesson or revision */
  function versesOf(d) { return getChapter(d.ch).then(function (data) { return data.shlokas.slice(d.a - 1, d.b); }); }
  function playBtn(ch, v) {
    var SA = window.SwadhyayShlokaAudio, key = ch + "_" + v;
    return SA && SA.has(key) ? '<button type="button" class="gl-play" data-gl="audio" data-key="' + key + '" aria-label="' + esc(T("श्लोक सुनें", "Listen")) + '">▶</button>' : '';
  }
  function lessonHtml(d, verses) {
    var ok = isDone(d.n), tk = V.tick[d.n] = V.tick[d.n] || {};
    var rev = d.kind === "revise", back = '<button type="button" class="gl-btn gl-ghost gl-sm" data-gl="back">← ' + esc(T("मेरी प्रगति", "My progress")) + '</button>';
    var head = '<header class="gl-day-h">' + back + '<small>' + esc(T("दिन ", "Day ")) + dev(d.n) + ' / ' + dev(dayCount()) + '</small><h2>' + esc(dayTitle(d)) + '</h2><p>' + esc(chapterOf(d.ch).name) + (ok ? ' · ✓ ' + esc(T("पूरा हुआ ", "done ")) + esc(fmtDate(doneDate(d.n))) : '') + '</p></header>';
    var sec;
    if (!rev) {
      var shl = verses.map(function (e) {
        var rec = playBtn(d.ch, e.v);
        return '<div class="gl-verse">' + (e.s ? '<small class="gl-spk">' + esc(e.s) + '</small>' : '') + '<div class="gl-sans">' + e.t.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + '</div>' + rec +
          '<small class="gl-vno">' + esc(T("श्लोक ", "Shloka ")) + dev(d.ch) + '.' + dev(e.v) + '</small></div>';
      }).join("");
      var mean = verses.map(function (e) { return '<div class="gl-mean"><b>' + dev(d.ch) + '.' + dev(e.v) + '</b><p>' + esc(e.m || T("इस श्लोक का भावार्थ पुस्तक में पढ़ें।", "Read the meaning of this shloka in the book.")) + '</p></div>'; }).join("");
      var hidden = V.shown[d.n];
      sec = step(1, "📖", T("श्लोक सुनें और पढ़ें", "Listen and read"), T("5 मिनट", "5 min"), shl + '<p class="gl-hint">' + esc(T("श्लोक को धीरे-धीरे, सही उच्चारण के साथ दो-तीन बार पढ़ें।", "Read the shloka slowly, two or three times, with right pronunciation.")) + (verses.every(function (e) { return !playBtn(d.ch, e.v); }) ? ' ' + esc(T("(इन श्लोकों की रिकॉर्डिंग अभी उपलब्ध नहीं।)", "(No recording of these shlokas yet.)")) : '') + '</p>', tk.a, "a") +
        step(2, "💡", T("अर्थ और भाव समझें", "Understand the meaning"), T("10 मिनट", "10 min"), mean + '<button type="button" class="gl-link" data-gl="book" data-arg="' + esc(verses[0].id) + '">📚 ' + esc(T("पदच्छेद, अन्वय और विस्तृत टीका पुस्तक में पढ़ें", "Read the word-by-word meaning and full commentary in the book")) + '</button>', tk.b, "b") +
        step(3, "🧠", T("दोहराएँ और स्वयं जाँचें", "Repeat and self-check"), T("5 मिनट", "5 min"),
          '<p class="gl-hint">' + esc(T("श्लोक देखे बिना बोलने का प्रयास करें, फिर मिलाकर देखें।", "Try to say the shloka without looking, then check.")) + '</p>' +
          '<button type="button" class="gl-btn gl-ghost gl-sm" data-gl="reveal" data-arg="' + d.n + '">' + esc(hidden ? T("श्लोक छिपाएँ", "Hide the shloka") : T("श्लोक दिखाएँ", "Show the shloka")) + '</button>' +
          (hidden ? '<div class="gl-sans gl-sans-sm">' + verses.map(function (e) { return e.t.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join(""); }).join("") + '</div>' : '') +
          '<div class="gl-sp-list">' + verses.map(function (e) { return '<div class="gl-sp-row"><b>' + dev(d.ch) + '.' + dev(e.v) + '</b>' + speakBlock(d.n + ":" + e.v, e.t) + '</div>'; }).join("") + '</div>' + speakNote(), tk.c, "c");
    } else {
      var n = verses.length, okc = (V.rv[d.n] || {});
      var cnt = Object.keys(okc).filter(function (k) { return okc[k]; }).length;
      sec = '<div class="gl-step"><div class="gl-step-h"><em>🔁</em><div><b>' + esc(T("इन श्लोकों को दोहराएँ", "Go over these shlokas")) + '</b><small>' + esc(T("हर श्लोक पढ़ें, अर्थ याद करें, फिर “याद है” दबाएँ", "Read each shloka, recall its meaning, then tap “I remember”")) + '</small></div></div><div class="gl-step-b">' +
        '<p class="gl-hint">' + esc(T("याद है: ", "Remembered: ")) + '<b>' + dev(cnt) + '/' + dev(n) + '</b></p>' + speakNote() + verses.map(function (e) {
          var open = V.shown[d.n + ":" + e.v], mk = !!okc[e.v];
          return '<div class="gl-rv' + (mk ? " is-ok" : "") + '"><button type="button" class="gl-rv-h" data-gl="rvopen" data-arg="' + d.n + ":" + e.v + '" aria-expanded="' + !!open + '"><b>' + dev(d.ch) + '.' + dev(e.v) + '</b><span>' + esc(e.t[0]) + '</span><i>' + (open ? "▴" : "▾") + '</i></button>' +
            (open ? '<div class="gl-rv-b"><div class="gl-sans gl-sans-sm">' + e.t.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + '</div>' + playBtn(d.ch, e.v) + '<p class="gl-mean-p">' + esc(e.m || "") + '</p>' + speakBlock(d.n + ":" + e.v, e.t) + '</div>' : '') +
            '<button type="button" class="gl-mk' + (mk ? " is-on" : "") + '" data-gl="rvmark" data-arg="' + d.n + ":" + e.v + '">' + (mk ? "✓ " + esc(T("याद है", "remembered")) : esc(T("याद है", "I remember"))) + '</button></div>';
        }).join("") + '</div></div>';
    }
    var foot = ok ? '<div class="gl-complete is-done"><b>✓ ' + esc(rev ? T("पुनरावृत्ति पूरी हुई", "Revision done") : T("आज का पाठ पूरा हुआ", "Lesson done")) + '</b><button type="button" class="gl-btn gl-ghost gl-sm" data-gl="undo" data-arg="' + d.n + '">' + esc(T("पूर्ण का निशान हटाएँ", "Remove the mark")) + '</button></div>' :
      '<div class="gl-complete"><button type="button" class="gl-btn gl-big" data-gl="done" data-arg="' + d.n + '">✅ ' + esc(rev ? T("पुनरावृत्ति पूरी हुई", "Revision complete") : T("आज का पाठ पूरा हुआ", "Today's lesson is complete")) + '</button><small>' + esc(T("तभी दबाएँ जब सचमुच पाठ कर लिया हो — यह आपकी प्रगति में गिना जाएगा।", "Press it only once you have really done the lesson — it counts towards your progress.")) + '</small></div>';
    return '<div class="gl-day-view">' + head + sec + foot + '</div>';
  }
  function step(n, ic, title, min, inner, on, key) {
    return '<div class="gl-step"><div class="gl-step-h"><em>' + dev(n) + '</em><span class="gl-ic" aria-hidden="true">' + ic + '</span><div><b>' + esc(title) + '</b><small>' + esc(min) + '</small></div>' +
      '<label class="gl-tick"><input type="checkbox" data-gl-in="tick-' + key + '"' + (on ? " checked" : "") + '><span>' + esc(T("हो गया", "done")) + '</span></label></div><div class="gl-step-b">' + inner + '</div></div>';
  }

  function markDone(n) {
    if (isDone(n)) return;
    S.done[n] = { d: today(), t: Date.now() };
    persist(); arm();
    var d = PLAN[n - 1], sk = streakInfo(), next = currentDay(), st = stats();
    var chapterNow = d.kind === "lesson" && PLAN.filter(function (x) { return x.ch === d.ch && x.kind === "lesson"; }).every(function (x) { return isDone(x.n); });
    var msg = '<p>🔥 <b>' + dev(sk.cur) + '</b> ' + esc(T("दिन लगातार", "day streak")) + ' · ' + dev(st.learned) + '/' + dev(totalShlokas()) + ' ' + esc(T("श्लोक सीखे", "shlokas learned")) + '</p>' +
      (chapterNow ? '<p>🏵️ <b>' + esc(T("अध्याय ", "Chapter ")) + dev(d.ch) + ' — ' + esc(chapterOf(d.ch).name) + '</b> ' + esc(T("के सभी पाठ पूरे हुए।", "— all lessons done.")) + '</p>' : '') +
      (next ? '<p>' + esc(T("अगला: दिन ", "Next: day ")) + dev(next.n) + ' — ' + esc(dayTitle(next)) + (next.kind === "revise" ? " 🔁" : "") + '</p>' : '<p>🙏 ' + esc(T("आपने पूरी गीता की यात्रा पूरी की — अभिनन्दन!", "You have walked the whole Gita — congratulations!")) + '</p>');
    modal({ title: "🪷 " + (d.kind === "revise" ? T("पुनरावृत्ति पूरी हुई", "Revision complete") : T("आज का पाठ पूरा हुआ", "Today's lesson complete")), body: msg, yes: T("बहुत अच्छा", "Wonderful"), onYes: function () { V.view = ""; refreshAll(); window.scrollTo(0, 0); } });
    refreshAll();
  }
  function undoDone(n) {
    if (!isDone(n)) return;
    S.done[n] = { d: "", t: Date.now() };
    persist(); arm(); refreshAll();
  }

  /* ================================================================== drawing */
  var drawing = 0;
  function draw() {
    if (!root || !root.isConnected) return;
    var main = root.querySelector("[data-gl-main]");
    if (!main) return;
    var id = ++drawing;
    stopSpeech();
    ready().then(function () {
      if (id !== drawing) return;
      if (!S.joined) {
        if (W.step !== 1) { main.innerHTML = wizardHtml(); return; }
        return firstVerse().then(function (v) { if (id !== drawing) return; main.innerHTML = wizardHtml() + '<section class="gl-card gl-full" aria-label="' + esc(T("इस कोर्स में क्या है", "What is in the course")) + '">' + promoFull(v, true) + '</section>'; });
      }
      if (V.view === "day" && V.day) {
        var d = PLAN[V.day - 1];
        return versesOf(d).then(function (vs) { if (id !== drawing) return; main.innerHTML = lessonHtml(d, vs); if (cloudOK()) { warmUp(); paintAsrStatus(); } });
      }
      main.innerHTML = dashHtml();
    }).catch(function () {
      main.innerHTML = '<p class="gl-note">' + esc(T("अभी यह सामग्री लोड नहीं हो सकी। कुछ देर बाद फिर प्रयास करें।", "This could not be loaded just now. Please try again in a moment.")) + '</p>';
    });
  }
  function redraw() { draw(); }
  function refreshAll() { draw(); renderCard(); }

  /* ================================================================== events */
  function go(path) { var a = app(); if (a) a.navigate(path); }
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-gl]") : null;
    if (!b) return;
    var k = b.getAttribute("data-gl"), arg = b.getAttribute("data-arg");
    if (k === "join") { V.view = ""; W.step = 1; if (S.joined) go("/gita"); else go("/gita?join=1"); }
    else if (k === "open") go("/gita");
    else if (k === "lesson") { var c = PLAN && currentDay(); go("/gita?day=" + (c ? c.n : 1)); }
    else if (k === "next") { if (W.step === 1 && !(W.agree && W.name.trim())) return; W.step = Math.min(4, W.step + 1); draw(); window.scrollTo(0, 0); }
    else if (k === "prev") { W.step = Math.max(1, W.step - 1); draw(); window.scrollTo(0, 0); }
    else if (k === "time") { W.time = arg; draw(); }
    else if (k === "begin") begin();
    else if (k === "day") { V.view = "day"; V.day = +arg; draw(); window.scrollTo(0, 0); }
    else if (k === "back") { V.view = ""; draw(); window.scrollTo(0, 0); }
    else if (k === "chap") { V.open = V.open === +arg ? 0 : +arg; draw(); }
    else if (k === "done") markDone(+arg);
    else if (k === "undo") undoDone(+arg);
    else if (k === "reveal") { V.shown[arg] = !V.shown[arg]; draw(); }
    else if (k === "speak") { startSpeech(arg, +arg.split(":")[0]); }
    else if (k === "rvopen") { V.shown[arg] = !V.shown[arg]; draw(); }
    else if (k === "rvmark") { var p = arg.split(":"), o = V.rv[p[0]] = V.rv[p[0]] || {}; o[p[1]] = !o[p[1]]; draw(); }
    else if (k === "audio") { var SA = window.SwadhyayShlokaAudio; if (SA && b.getAttribute("data-key")) SA.play(b.getAttribute("data-key")); }
    else if (k === "book") { var ap = app(); if (ap && INDEX) ap.openBookAt(INDEX.file, arg ? { id: arg } : null); }
    else if (k === "perm") askPermission();
    else if (k === "ics") downloadIcs();
    else if (k === "pause") { S.paused = !S.paused; persist(); arm(); draw(); }
    else if (k === "reset") {
      modal({ title: T("योजना फिर से आरम्भ करें?", "Restart the course?"), body: '<p>' + esc(T("आपके सभी पूर्ण किये दिन हट जाएँगे और आप नया संकल्प लेंगे।", "All your completed days are cleared and you take a fresh pledge.")) + '</p>', yes: T("हाँ, फिर आरम्भ", "Yes, restart"), no: T("रहने दें", "Keep it"),
        onYes: function () { var keep = S.owner, t = Date.now(); Object.keys(S.done).forEach(function (n) { S.done[n] = { d: "", t: t }; }); S.joined = false; S.pledge = null; S.owner = keep; V.view = ""; W.step = 1; W.agree = false; persist(); clearTimeout(timer); refreshAll(); window.scrollTo(0, 0); } });
    }
  }
  function onInput(e) {
    var el = e.target, f = el.getAttribute && el.getAttribute("data-gl-in");
    if (!f) return;
    var v = el.type === "checkbox" ? el.checked : el.value;
    if (f === "name") { W.name = v; var pEl = root && root.querySelector("[data-gl-pledge]"); if (pEl) pEl.textContent = pledgeText(v); var nb = root && root.querySelector('[data-gl="next"]'); if (nb) nb.disabled = !(W.agree && v.trim()); return; }
    if (f === "agree") { W.agree = v; var nb2 = root && root.querySelector('[data-gl="next"]'); if (nb2) nb2.disabled = !(v && W.name.trim()); return; }
    if (f === "time") { W.time = v || "06:30"; draw(); return; }
    if (f === "start") { W.start = v && v >= today() ? v : today(); draw(); return; }
    if (f === "push") { W.push = v; if (v && typeof Notification !== "undefined" && Notification.permission === "default") askPermission(); draw(); return; }
    if (f === "cal" || f === "wa" || f === "mail") { W[f] = v; draw(); return; }
    if (f === "waNum" || f === "mailAddr") { W[f] = v; return; }
    if (f === "sp-lang") { setSpLang(v); return; }
    if (f === "s-time") { S.time = v || "06:30"; persist(); arm(); return; }
    if (f === "s-push") { S.ch.push = v; persist(); arm(); if (v && typeof Notification !== "undefined" && Notification.permission === "default") askPermission(); draw(); return; }
    if (f.indexOf("tick-") === 0 && V.day) { (V.tick[V.day] = V.tick[V.day] || {})[f.slice(5)] = v; return; }
  }
  document.addEventListener("swadhyay-shloka-audio-state", function (ev) {
    [root, cardEl].forEach(function (r) {
      if (!r || !r.isConnected) return;
      Array.prototype.forEach.call(r.querySelectorAll(".gl-play"), function (b) {
        var on = ev.detail === b.getAttribute("data-key");
        b.classList.toggle("is-playing", on); b.textContent = on ? "❚❚" : "▶";
      });
    });
  });

  /* ================================================================== public */
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    document.addEventListener("visibilitychange", function () { if (!document.hidden && PLAN) { arm(); refreshAll(); } });
  }
  boot();

  /* A shloka line is never broken in two. The lines are set on one line each (white-space: nowrap) and the font shrinks, as far
     as the longest line of a block needs, until it fits the width it has; recomputed when the content, the width or the fonts change. */
  function fitLines() {
    var boxes = document.querySelectorAll(".gl-shloks, .gl-sans, .gl-shl:not(.is-rev)");
    Array.prototype.forEach.call(boxes, function (box) {
      if (box.classList.contains("gl-shl") && box.closest(".gl-shloks")) return;           // fitted with its block
      var lines = box.querySelectorAll(box.classList.contains("gl-sans") ? "p" : ".gl-shl span, span");
      if (!lines.length) return;
      var w = lines[0].clientWidth, sig = w + ":" + box.textContent.length;
      if (!w || box.dataset.fit === sig) return;
      Array.prototype.forEach.call(lines, function (l) { l.style.fontSize = ""; });
      var ratio = 1;
      Array.prototype.forEach.call(lines, function (l) { if (l.scrollWidth > l.clientWidth + 1) ratio = Math.min(ratio, l.clientWidth / l.scrollWidth); });
      if (ratio < 1) {
        var base = parseFloat(getComputedStyle(lines[0]).fontSize) || 16, size = Math.max(9, Math.floor(base * ratio * 0.98 * 10) / 10);
        Array.prototype.forEach.call(lines, function (l) { l.style.fontSize = size + "px"; });
      }
      box.dataset.fit = sig;
    });
  }
  var fitQueued = false;
  function queueFit() { if (fitQueued) return; fitQueued = true; setTimeout(function () { fitQueued = false; fitLines(); }, 30); }
  if (window.MutationObserver && document.body) new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { queueFit(); return; }
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);
  function start() {
    ready().then(function () { arm(); return syncDown(); }).then(function (changed) { if (changed) { arm(); refreshAll(); } }).catch(function () {});
  }
  window.SwadhyayGita = {
    pageHtml: function () {
      return '<section class="gl-root" data-gita>' + pageHero() + '<main class="content-pad gl-wrap" data-gl-main><p class="gl-note">…</p></main></section>';
    },
    mount: function (h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      root = document.querySelector("[data-gita]");
      if (!root) return;
      var q = new URLSearchParams(location.search);
      V.view = ""; V.day = 0;
      if (q.get("join") && !S.joined) W.step = 1;
      root.addEventListener("click", onClick);
      root.addEventListener("change", onInput);
      root.addEventListener("input", function (e) { var f = e.target.getAttribute && e.target.getAttribute("data-gl-in"); if (f === "name" || f === "waNum" || f === "mailAddr") onInput(e); });
      ready().then(function () {
        var n = +q.get("day") || 0;
        if (q.get("go") === "today") { var c = currentDay(); n = c ? c.n : 0; }
        if (n && S.joined && PLAN[n - 1] && (isDone(n) || (currentDay() && currentDay().n >= n))) { V.view = "day"; V.day = n; }
        draw();
      });
      start();
    },
    mountCard: function (el, h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      cardEl = el;
      if (!el) return;
      el.addEventListener("click", onClick);
      renderCard();
      start();
    },
    __test: { plan: function () { return PLAN; }, state: function () { return S; }, merge: mergeRemote, build: buildPlan, speechScore: scoreSpeech, speechNorm: speechNorm, asr: asr, cloudOK: cloudOK, toWav16k: toWav16k, phon: phon, fitness: fitness, setSR: function (c) { SR = c; }, nextFire: nextFire, ics: downloadIcs, stats: function () { return stats(); }, streak: streakInfo, setState: function (v) { S = normalize(v); }, normalize: normalize }
  };
})();

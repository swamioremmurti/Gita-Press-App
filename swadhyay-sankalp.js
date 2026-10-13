/* श्रीरामचरितमानस पाठ-संकल्प -- a guided pathway for undertaking a पाठ of the Ramcharitmanas and finishing it:

     choose the पाठ (मासिक 30 days / नवाह्न 9 days / अखण्ड non-stop)  ->  learn the विधि  ->  set the schedule
     ->  review and take the संकल्प  ->  every day: the day's portion, start and end points, reminder, and a
     confirmation that is only recorded when the devotee says the portion was really read  ->  completion.

   Where it shows
     - the home page card (the Manas slot of swadhyay-daily.js) in two states: before a संकल्प (the three choices)
       and after (today's portion, progress, next reminder);
     - the page /sankalp (wizard, daily screen, अखण्ड session, completion, private history).

   Where the portions come from
     assets/data/v1/manas/plan.json -- the 9 and 30 portions are the ones PRINTED in the Gita Press edition
     (the "नवाह्नपारायण / मासपारायण ... विश्राम" marks), with the size of each portion (tools/build_sankalp_plan.py).
     Each portion starts at an id in the book (manas_navah_N / manas_masa_N); it ends where the next one starts.
     Nothing here invents a division or a ritual: the विधि pages summarise the general practice, send the reader to
     the book's own पारायण-विधि, and say that traditions differ.

   Saved in localStorage (swadhyay_sankalp_v1) -- on this device only: the active संकल्प, which portions were
   confirmed (with the date), schedule changes, and the private history of finished पाठ.

   Reminders (no server): a browser notification while Swadhyay is open, an in-page "today's portion is pending"
   notice, and a calendar file (.ics) with a repeating event that works on any device even when the site is closed.

   Public API: window.SwadhyaySankalp.pageHtml(), .mount({ tx, toast }), .mountCard(el, { tx, toast })        */
(function () {
  "use strict";

  var PLAN_URL = "/assets/data/v1/manas/plan.json";
  var MANAS_FILE = "श्रीरामचरितमानस.html";
  var LS = "swadhyay_sankalp_v1";
  var FIRED = "swadhyay_sankalp_fired_v1";
  var SEC_PER_LINE = 10;                     // an unhurried recitation; shown only as "about"
  var DEV = "०१२३४५६७८९";
  var MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];
  var MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var TYPES = {
    masa:   { n: 30, hi: "मासिक पाठ", en: "Monthly path", dur: ["३० दिन", "30 days"], ic: "🌙",
              tag: ["नियमितता के साथ मानस पाठ", "A steady daily reading of the Manas"],
              pts: [["गाइडेड संकल्प और आरम्भ तिथि", "Guided संकल्प and a start date"], ["पूरा पाठ ३० दैनिक भागों में, छपे विश्राम-चिह्नों के अनुसार", "The whole text in 30 daily portions, at the printed विश्राम marks"], ["आपके चुने समय पर स्मरण", "A reminder at the time you choose"], ["पूर्ण दिन, शेष भाग और कुल प्रगति", "Completed days, pending portions and overall progress"]],
              ideal: ["उनके लिए जो प्रतिदिन टिकाऊ पाठ-नियम चाहते हैं।", "For devotees who want a sustainable daily practice."] },
    navah:  { n: 9, hi: "नवाह्न पाठ", en: "Navah path", dur: ["९ दिन", "9 days"], ic: "🪔",
              tag: ["नौ दिनों में सम्पूर्ण पाठ", "The complete path in nine days"],
              pts: [["पाठ से पहले नौ-दिवसीय विधि की जानकारी", "The nine-day procedure explained first"], ["प्रत्येक दिन का भाग, लक्ष्य और अनुमानित अवधि", "Each day's portion, target and estimated time"], ["निर्धारित स्मरण और प्रतिदिन की पूर्णता का लेखा", "Scheduled reminders and daily completion"], ["पारम्परिक समापन-मार्गदर्शन", "Traditional completion guidance"]],
              ideal: ["नौ दिन के केन्द्रित पाठ के लिए, प्रायः किसी पर्व या अवसर पर।", "For a focused nine-day path, often around an occasion."] },
    akhand: { n: 0, hi: "अखण्ड पाठ", en: "Akhand path", dur: ["निरन्तर", "Non-stop"], ic: "🕉️",
              tag: ["एक ही क्रम में सम्पूर्ण मानस पाठ", "The whole Manas in one unbroken sitting"],
              pts: [["स्थान, आरम्भ समय और अवधि की योजना", "Plan the venue, start time and duration"], ["तैयारी की पूरी सूची", "A full preparation checklist"], ["चलता हुआ समय-मापक और पाठ की स्थिति", "A running timer and progress"], ["परम्परा अनुमति दे तो अनेक पाठक और पाठक-परिवर्तन", "Several readers and handovers, if your tradition allows"]],
              ideal: ["सत्र के रूप में पाठ — यह दैनिक नियम नहीं है।", "A continuous session, not a daily streak."] }
  };

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
  function tn(o, k) { return isEn() ? o.en : o.hi; }
  function tt(pair) { return isEn() ? pair[1] : pair[0]; }

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
    var p = (hhmm || "07:00").split(":"), h = +p[0], m = +p[1] || 0;
    if (isEn()) return (h % 12 || 12) + ":" + pad(m) + (h < 12 ? " AM" : " PM");
    var per = h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 19 ? "शाम" : "रात";
    return per + " " + dev(h % 12 || 12) + ":" + dev(pad(m)) + " बजे";
  }
  function fmtDur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(x);
  }
  function minutesText(lines) {
    var lo = Math.max(5, Math.round(lines * SEC_PER_LINE * 0.8 / 300) * 5), hi = Math.max(10, Math.round(lines * SEC_PER_LINE * 1.2 / 300) * 5);
    function one(m) { return m >= 120 ? (Math.round(m / 6) / 10) : m; }
    if (hi >= 120) return T("लगभग ", "About ") + dev(one(lo)) + "–" + dev(one(hi)) + T(" घण्टे", " hours");
    return T("लगभग ", "About ") + dev(lo) + "–" + dev(hi) + T(" मिनट", " min");
  }
  function hoursText(lines) {
    var h = Math.round(lines * SEC_PER_LINE / 3600);
    return T("लगभग ", "About ") + dev(Math.max(1, h)) + T(" घण्टे", " hours");
  }

  /* ---------------- saved state ---------------- */
  var S = (function () {
    var s = { active: null, history: [] };
    try {
      var v = JSON.parse(localStorage.getItem(LS));
      if (v && typeof v === "object") { s.active = v.active && TYPES[v.active.type] ? v.active : null; s.history = Array.isArray(v.history) ? v.history : []; }
    } catch (e) {}
    return s;
  })();
  function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }

  /* ---------------- the schedule data ---------------- */
  var planP = null, PLAN = null;
  function loadPlan() {
    if (!planP) planP = fetch(PLAN_URL).then(function (r) { if (!r.ok) throw new Error("plan"); return r.json(); }).then(function (p) { PLAN = p; return p; });
    planP.catch(function () { planP = null; });
    return planP;
  }
  function days(a) { return PLAN[a.type]; }
  function totalDays(a) { return TYPES[a.type].n; }
  function totalLines(type) { return PLAN[type].reduce(function (s, d) { return s + d.l; }, 0); }

  /* the day of the plan that "today" is (can be < 1 before the start date, > total after the end) */
  function dayNow(a) { return daysBetween(a.start, today()) + 1 - (a.shift || 0); }
  function dayDate(a, n) { return addDays(a.start, (a.shift || 0) + n - 1); }
  function endDate(a) { return dayDate(a, totalDays(a)); }
  function origEnd(a) { return addDays(a.start, totalDays(a) - 1); }
  function pendingDays(a, upTo) {
    var out = [];
    for (var n = 1; n <= upTo && n <= totalDays(a); n++) if (!a.done[n]) out.push(n);
    return out;
  }
  function missedDays(a) { return pendingDays(a, Math.min(dayNow(a) - 1, totalDays(a))); }
  function allDone(a) { return pendingDays(a, totalDays(a)).length === 0; }
  /* the day shown as "today's portion" */
  function focusDay(a) {
    var dn = dayNow(a), t = totalDays(a);
    if (dn < 1) return 1;
    if (dn > t) { var p = pendingDays(a, t); return p.length ? p[0] : t; }
    return dn;
  }
  function stats(a) {
    var dl = 0, tl = 0, dn = 0;
    days(a).forEach(function (d) { tl += d.l; if (a.done[d.n]) { dl += d.l; dn++; } });
    return { pct: tl ? Math.round(dl / tl * 100) : 0, done: dn };
  }
  function openingLines(d, n) { return (d && d.t ? d.t : []).slice(0, n || 2); }

  /* the next reminder (a Date) and the day it is for */
  function nextReminder(a) {
    if (!a || a.type === "akhand" || !a.remind || a.completedAt) return null;
    var now = new Date(), t = totalDays(a);
    for (var n = 1; n <= t; n++) {
      if (a.done[n]) continue;
      var k = dayDate(a, n), p = (a.time || "07:00").split(":"), at = parseKey(k);
      at.setHours(+p[0], +p[1], 0, 0);
      if (at > now) return { at: at, n: n, key: k };
    }
    return null;
  }
  function reminderWords(r) {
    if (!r) return T("स्मरण बन्द है", "Reminders are off");
    var k = dayKey(r.at), diff = daysBetween(today(), k), tm = fmtTime(pad(r.at.getHours()) + ":" + pad(r.at.getMinutes()));
    if (diff === 0) return T("आज ", "Today ") + tm;
    if (diff === 1) return T("कल ", "Tomorrow ") + tm;
    return fmtDate(k) + ", " + tm;
  }

  /* ---------------- reminders: notifications while the site is open ---------------- */
  var timer = null;
  function firedKey(a, n, kind) { return a.id + ":" + n + ":" + kind + ":" + today(); }
  function wasFired(key) { try { return (JSON.parse(localStorage.getItem(FIRED)) || {})[key]; } catch (e) { return false; } }
  function markFired(key) {
    try { var m = JSON.parse(localStorage.getItem(FIRED)) || {}, keep = {}; Object.keys(m).slice(-30).forEach(function (k) { keep[k] = m[k]; }); keep[key] = 1; localStorage.setItem(FIRED, JSON.stringify(keep)); } catch (e) {}
  }
  function notify(title, body) {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        var n = new Notification(title, { body: body, tag: "swadhyay-sankalp", icon: "/assets/images/quote/logo-mark.svg" });
        n.onclick = function () { try { window.focus(); } catch (e) {} if (app()) app().navigate("/sankalp"); n.close(); };
      }
    } catch (e) {}
    toast("🔔 " + body);
  }
  function arm() {
    clearTimeout(timer);
    var a = S.active;
    if (!a || a.completedAt || !PLAN) return;
    var now = Date.now(), at = null, kind = "main", n = 0;
    if (a.type === "akhand") {
      if (a.remind && !(a.session && a.session.t0) && a.planDate) { var p = (a.planTime || "06:00").split(":"), d = parseKey(a.planDate); d.setHours(+p[0], +p[1], 0, 0); if (d.getTime() > now) { at = d.getTime(); n = 1; } }
    } else {
      var r = nextReminder(a);
      if (r) { at = r.at.getTime(); n = r.n; }
      if (a.remind && a.follow) {                                  // one gentle follow-up an hour after today's reminder, if still pending
        var dn = dayNow(a);
        if (dn >= 1 && dn <= totalDays(a) && !a.done[dn]) {
          var q = (a.time || "07:00").split(":"), f = new Date(); f.setHours(+q[0] + 1, +q[1], 0, 0);
          if (f.getTime() > now && (!at || f.getTime() < at)) { at = f.getTime(); kind = "follow"; n = dn; }
        }
      }
    }
    if (!at || at - now > 2147000000) return;
    timer = setTimeout(function () {
      var key = firedKey(a, n, kind);
      if (!wasFired(key) && S.active === a && !(a.type !== "akhand" && a.done[n])) {
        markFired(key);
        if (a.type === "akhand") notify(T("अखण्ड पाठ", "Akhand path"), T("अखण्ड पाठ के आरम्भ का समय हो गया है।", "It is time to begin the akhand path."));
        else if (kind === "follow") notify(T("पाठ-संकल्प", "Path sankalp"), T("आज का पाठ अभी शेष है — जब सुविधा हो आरम्भ करें 🙏", "Today's portion is still pending — begin when you can 🙏"));
        else notify(T("श्रीरामचरितमानस पाठ", "Ramcharitmanas path"), T("आज के पाठ का समय हो गया है — दिन ", "Time for today's reading — day ") + dev(n) + " 🙏");
        refreshAll();
      }
      arm();
    }, Math.max(1000, at - now));
  }
  function askPermission() {
    if (typeof Notification === "undefined") { toast(T("यह ब्राउज़र सूचनाएँ नहीं देता — कैलेंडर में जोड़ें।", "This browser has no notifications — use the calendar file.")); return; }
    Notification.requestPermission().then(function () { refreshAll(); arm(); }).catch(function () {});
  }
  function permWords() {
    if (typeof Notification === "undefined") return T("इस ब्राउज़र में उपलब्ध नहीं", "Not available in this browser");
    return Notification.permission === "granted" ? T("चालू", "On") : Notification.permission === "denied" ? T("ब्राउज़र में रोकी गयी है", "Blocked in the browser") : T("अनुमति बाकी", "Needs permission");
  }

  /* ---------------- a calendar file with the repeating reminder ---------------- */
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
  function icsStamp(k, hhmm) { var p = hhmm.split(":"); return k.replace(/-/g, "") + "T" + pad(+p[0]) + pad(+p[1]) + "00"; }
  function downloadIcs(a) {
    var link = location.origin + "/sankalp", t = TYPES[a.type], lines, name = (a.type === "akhand" ? "अखण्ड पाठ" : t.hi) + " — श्रीरामचरितमानस";
    var ev = ["BEGIN:VEVENT", "UID:sankalp-" + a.id + "@swadhyay", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")];
    if (a.type === "akhand") {
      var hrs = Math.max(1, Math.round(totalLines("navah") * SEC_PER_LINE / 3600));
      ev.push("DTSTART:" + icsStamp(a.planDate, a.planTime || "06:00"), "DURATION:PT" + hrs + "H");
    } else {
      var first = Math.max(dayNow(a), 1), pend = pendingDays(a, totalDays(a)).filter(function (n) { return n >= first; });
      if (!pend.length) { toast(T("कोई शेष दिन नहीं।", "No days left.")); return; }
      var startKey = dayDate(a, Math.max(first, pend[0]));
      ev.push("DTSTART:" + icsStamp(startKey, a.time || "07:00"), "DURATION:PT" + Math.max(30, Math.round(days(a)[0].l * SEC_PER_LINE / 60)) + "M",
        "RRULE:FREQ=DAILY;COUNT=" + (totalDays(a) - Math.max(first, pend[0]) + 1));
    }
    ev.push("SUMMARY:" + icsEsc(name), "DESCRIPTION:" + icsEsc("आज का पाठ देखें और पूर्णता दर्ज करें: " + link), "URL:" + link,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(name), "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Swadhyay//Sankalp//HI", "CALSCALE:GREGORIAN"].concat(ev, ["END:VCALENDAR"]);
    var blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var u = URL.createObjectURL(blob), el = document.createElement("a");
    el.href = u; el.download = "swadhyay-manas-path.ics"; document.body.appendChild(el); el.click();
    setTimeout(function () { URL.revokeObjectURL(u); el.remove(); }, 500);
    toast(T("कैलेंडर फ़ाइल तैयार — इसे अपने कैलेंडर में खोलें।", "Calendar file ready — open it in your calendar."));
  }

  /* ================================================================== the vidhi (general guidance) */
  var VIDHI_NOTE = ["यह सामान्य मार्गदर्शन है। परम्पराएँ भिन्न हो सकती हैं — प्रामाणिक क्रम के लिए पुस्तक की पारायण-विधि और अपने गुरुजन/कुल-परम्परा को प्रमाण मानें।",
    "This is general guidance. Traditions differ — treat the book's own पारायण-विधि and your guru / family tradition as the authority."];
  function vidhiSections(type) {
    var s = [];
    if (type === "akhand") {
      s.push({ h: ["तैयारी", "Preparation"], p: [
        ["स्थान: स्वच्छ, शान्त और पर्याप्त बड़ा; श्रीरामचरितमानस की प्रति सम्मानपूर्वक स्थापित करें।", "Venue: clean, quiet and spacious; place the Manas with respect."],
        ["पाठकों की सूची, क्रम और बैठने की व्यवस्था पहले से तय करें; जल, प्रकाश और आसन की व्यवस्था रखें।", "Fix the readers, their order and seating beforehand; arrange water, light and seats."],
        ["आरम्भ से पहले पुस्तक की पारायण-विधि के अनुसार आवाहन, पूजन और ध्यान करें।", "Before starting, do the आवाहन, पूजन and ध्यान as given in the book's पारायण-विधि."]] });
      s.push({ h: ["पाठ क्रम", "Order of reading"], p: [
        ["सम्पूर्ण मानस एक ही क्रम में, आदि से अन्त तक, बिना किसी भाग को छोड़े पढ़ा जाता है।", "The whole Manas is read in one order, start to end, with no portion skipped."],
        ["पाठक-परिवर्तन केवल तब करें जब आपकी परम्परा इसकी अनुमति देती हो; परिवर्तन के समय पाठ की निरन्तरता बनी रहे।", "Change readers only if your tradition permits it, keeping the recitation continuous."]] });
      s.push({ h: ["नियम", "Observances"], p: [
        ["सत्र के दौरान शान्ति, शुद्धता और एकाग्रता बनाये रखें; विराम (जैसे जल/विश्राम) की परम्परा अपने बड़ों से पूछ लें।", "Keep calm, purity and focus during the session; ask elders about the custom for breaks."]] });
    } else {
      var t = TYPES[type];
      s.push({ h: ["तैयारी", "Preparation"], p: [
        ["स्नानादि से निवृत्त होकर स्वच्छ, शान्त स्थान पर आसन पर बैठें; प्रति (या यह ऐप) सामने रखें।", "Bathe, sit on a seat in a clean, quiet place; keep the book (or this app) before you."],
        ["पुस्तक की पारायण-विधि में पाठारम्भ से पूर्व श्रीतुलसीदासजी, श्रीवाल्मीकिजी, श्रीशिवजी, श्रीहनुमान्‌जी तथा श्रीसीतारामजी के आवाहन, पूजन और ध्यान का क्रम दिया है — अपनी सुविधा और परम्परा के अनुसार करें।", "The book's पारायण-विधि gives the आवाहन, पूजन and ध्यान before the reading — follow it as your tradition and means allow."]] });
      s.push({ h: ["संकल्प", "The vow"], p: [
        ["पाठ का प्रकार (" + t.hi + "), अवधि और अपना उद्देश्य मन में या बोलकर संकल्प करें; संकल्प-वाक्य की विधि अपने गुरुजन/कुल-परम्परा से जानें।", "Resolve the kind of path (" + t.en + "), its length and your purpose; learn the exact words from your guru or family tradition."]] });
      s.push({ h: ["पाठ क्रम", "Order of reading"], p: [
        [type === "masa" ? "३० दिनों में प्रतिदिन ऐप में दिया निर्धारित भाग पढ़ें। विभाजन गीताप्रेस संस्करण में छपे 'मासपारायण … विश्राम' चिह्नों के अनुसार है।"
                          : "९ दिनों में प्रतिदिन ऐप में दिया निर्धारित भाग पढ़ें। विभाजन गीताप्रेस संस्करण में छपे 'नवाह्नपारायण … विश्राम' चिह्नों के अनुसार है।",
         type === "masa" ? "Read the day's portion on each of the 30 days. The split follows the 'मासपारायण … विश्राम' marks printed in the Gita Press edition."
                          : "Read the day's portion on each of the 9 days. The split follows the 'नवाह्नपारायण … विश्राम' marks printed in the Gita Press edition."],
        ["प्रतिदिन एक ही समय और स्थान रखें; भाग को उसके विश्राम-चिह्न पर ही पूर्ण करें।", "Keep the same time and place daily; end the portion at its printed विश्राम mark."],
        ["शान्त भाव से, स्पष्ट उच्चारण के साथ पढ़ें; अर्थ और भाव पर भी ध्यान दें।", "Read calmly with clear pronunciation, and reflect on the meaning."]] });
      s.push({ h: ["नियम", "Observances"], p: [
        ["पाठ के दिनों में मन, वाणी और आहार की सात्त्विकता रखना सामान्य परम्परा है; विशेष नियम सम्प्रदाय/परिवार में भिन्न हो सकते हैं।", "Keeping mind, speech and food sattvic is the common custom; specific rules vary by sampradaya and family."],
        ["कोई दिन छूट जाए तो ऐप विकल्प दिखाएगा — शेष कार्यक्रम स्वतः नहीं बदलेगा। अटूट क्रम जैसे नियम पर अपने गुरुजन से पूछें।", "If a day is missed the app shows options — nothing changes silently. Ask your guru about rules such as an unbroken sequence."]] });
    }
    s.push({ h: ["समापन", "Completion"], p: [
      ["अन्तिम भाग (उत्तरकाण्ड की समाप्ति) के बाद पुस्तक में दी गयी आरती तथा क्षमा-प्रार्थना करें।", "After the last portion (end of उत्तरकाण्ड), do the आरती and prayer for forgiveness given in the book."],
      ["हवन, प्रसाद-वितरण, भोजन आदि की परम्परा हो तो कुल-परम्परा/गुरुजन के निर्देश से करें।", "If your tradition includes हवन, प्रसाद or a meal, do it as your family tradition or guru directs."],
      ["ऐप केवल पाठ का भाग और तिथि दर्ज करता है; यह किसी अनुष्ठान की पूर्ति प्रमाणित नहीं करता।", "The app only records the portion and date; it does not certify that any ritual was fulfilled."]] });
    return s;
  }
  function vidhiHtml(type) {
    return '<div class="sk-vidhi">' + vidhiSections(type).map(function (sec, i) {
      return '<details class="sk-acc"' + (i === 0 ? " open" : "") + '><summary>' + esc(tt(sec.h)) + '</summary><ul>' +
        sec.p.map(function (x) { return "<li>" + esc(tt(x)) + "</li>"; }).join("") + '</ul></details>';
    }).join("") + '<p class="sk-note">ℹ️ ' + esc(tt(VIDHI_NOTE)) + '</p>' +
      '<button type="button" class="sk-link" data-sk="book-vidhi">📖 ' + esc(T("पुस्तक की पारायण-विधि पढ़ें", "Read the book's पारायण-विधि")) + '</button></div>';
  }
  var AK_CHECK = [["श्रीरामचरितमानस की प्रति और चौकी/आसन", "The Manas and its seat"], ["पूजन-सामग्री: दीप, धूप, जल, पुष्प", "Worship items: lamp, incense, water, flowers"],
    ["पाठकों की सूची और क्रम", "List and order of readers"], ["जल/प्रसाद और बैठने की व्यवस्था", "Water, prasad and seating"],
    ["स्थान की स्वच्छता, प्रकाश और शान्ति", "A clean, lit, quiet venue"], ["समापन की आरती-सामग्री", "Items for the closing आरती"]];

  /* ================================================================== view state */
  var W = { step: 1, type: null, read: false, start: "", time: "07:00", remind: true, follow: false, place: "", readers: "", interval: 0, planDate: "", planTime: "06:00", akRemind: true };
  var V = { view: "", sel: 0 };              // view: "" (auto) | "history" | "vidhi" | "wizard"
  var root = null, cardEl = null, tickT = null;

  function newId() { return "s" + Date.now().toString(36); }
  function refreshAll() { if (root && root.isConnected) render(); if (cardEl && cardEl.isConnected) renderCard(); }

  /* ---------------- small UI pieces ---------------- */
  function modal(o) {
    var m = document.createElement("div");
    m.className = "sk-modal";
    m.innerHTML = '<div class="sk-sheet" role="dialog" aria-modal="true"><h3>' + esc(o.title) + '</h3><div class="sk-sheet-b">' + o.body + '</div><div class="sk-sheet-a">' +
      (o.no ? '<button type="button" class="sk-btn sk-btn-ghost" data-m="no">' + esc(o.no) + '</button>' : '') +
      '<button type="button" class="sk-btn" data-m="yes">' + esc(o.yes) + '</button></div></div>';
    document.body.appendChild(m);
    function close() { m.remove(); }
    m.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-m]") : null;
      if (e.target === m || (b && b.getAttribute("data-m") === "no")) { close(); return; }
      if (b && b.getAttribute("data-m") === "yes") { close(); if (o.onYes) o.onYes(m); }
    });
    var f = m.querySelector('[data-m="yes"]'); if (f) f.focus();
    return m;
  }
  function stepper(cur) {
    var names = [["पाठ चुनें", "Choose"], ["विधि समझें", "Learn the विधि"], ["समय-सारणी", "Schedule"], ["संकल्प", "Review"]];
    return '<ol class="sr-steps sk-steps">' + names.map(function (nm, i) {
      var n = i + 1;
      return '<li class="sr-step' + (n === cur ? " is-cur" : n < cur ? " is-done" : "") + '"><span class="sr-dot">' + (n < cur ? "✓" : dev(n)) + '</span><span>' + esc(tt(nm)) + '</span></li>';
    }).join("") + '</ol>';
  }
  function hero() {
    return '<header class="sk-hero"><div class="sk-hero-in"><small>' + esc(T("स्वाध्याय · विशेष साधना", "Swadhyay · Special sadhana")) + '</small>' +
      '<h1>' + esc(T("श्रीरामचरितमानस पाठ-संकल्प", "Ramcharitmanas Path Sankalp")) + '</h1>' +
      '<p>' + esc(T("मानस पढ़ें, मन को राममय बनाएँ।", "Read the Manas, fill the mind with Ram.")) + '</p></div></header>';
  }

  /* ================================================================== the home card */
  function renderCard() {
    if (!cardEl) return;
    var a = S.active;
    var head = '<header class="dd-head"><small class="sk-eyebrow">' + esc(T("स्वाध्याय · विशेष साधना", "Swadhyay · Special sadhana")) + '</small><h3>' + esc(T("श्रीरामचरितमानस पाठ-संकल्प", "Ramcharitmanas Path Sankalp")) + '</h3><p>' + esc(T("मानस पढ़ें, मन को राममय बनाएँ।", "Read the Manas, fill the mind with Ram.")) + '</p></header>';
    var html;
    if (!a) {
      html = head + '<div class="dd-text is-panel sk-pitch"><p>' + esc(T("अपनी सुविधा और परम्परा के अनुसार पाठ चुनें। हम आपको विधि, समय-स्मरण और प्रगति में सहयोग देंगे।", "Choose a path to suit you and your tradition. We help with the विधि, reminders and progress.")) + '</p>' +
        '<div class="sk-tiles">' + ["masa", "navah", "akhand"].map(function (k) {
          return '<button type="button" class="sk-tile" data-sk="pick" data-arg="' + k + '"><span aria-hidden="true">' + TYPES[k].ic + '</span><b>' + esc(tn(TYPES[k])) + '</b><small>' + esc(tt(TYPES[k].dur)) + '</small></button>';
        }).join("") + '</div></div>' +
        '<button type="button" class="dd-cta" data-sk="open">' + esc(T("अपना पाठ-संकल्प आरम्भ करें", "Begin your path sankalp")) + ' <i aria-hidden="true">→</i></button>';
      cardEl.innerHTML = html; cardEl.classList.remove("is-loading"); return;
    }
    loadPlan().then(function () {
      if (S.active !== a) return;
      cardEl.innerHTML = head + activeCardBody(a);
      cardEl.classList.remove("is-loading");
    }).catch(function () {
      cardEl.innerHTML = head + '<div class="dd-text dd-fail"><p>' + esc(T("अभी यह सामग्री लोड नहीं हो सकी।", "This could not be loaded just now.")) + '</p></div><button type="button" class="dd-cta" data-sk="open">' + esc(T("संकल्प खोलें", "Open the sankalp")) + ' <i>→</i></button>';
      cardEl.classList.remove("is-loading");
    });
  }
  function activeCardBody(a) {
    var T0 = TYPES[a.type], badgeT, badgeS, body, cta, ctaK = "open", ctaArg = "", acts;
    if (a.type === "akhand") {
      var ss = a.session;
      badgeT = tn(T0); badgeS = ss && ss.t0 ? (ss.endedAt ? T("पूर्ण", "Complete") : ss.onBreak ? T("विराम", "On break") : T("पाठ चल रहा है", "In progress")) : T("आरम्भ: ", "Starts ") + fmtDate(a.planDate) + ", " + fmtTime(a.planTime);
      body = '<div class="sk-lead">' + esc(T("अखण्ड पाठ सत्र", "Akhand path session")) + '</div>' +
        (ss && ss.t0 ? '<div class="sk-timer-big" data-sk-timer>' + fmtDur(elapsed(a)) + '</div>' : '<p>' + esc(T("तैयारी की सूची देखें और सत्र आरम्भ करें।", "See the checklist and begin the session.")) + '</p>') +
        '<p class="sk-sm">' + esc(T("पुस्तक में पाठ-स्थिति: ", "Place in the book: ")) + dev(app() ? app().bookProgress(MANAS_FILE) : 0) + '%</p>';
      cta = a.completedAt ? T("पाठ-पूर्ति देखें", "See the completion") : ss && ss.t0 ? T("अखण्ड पाठ जारी रखें", "Continue the akhand path") : T("अखण्ड पाठ की तैयारी", "Prepare the akhand path");
    } else {
      var st = stats(a), f = focusDay(a), d = days(a)[f - 1], dn = dayNow(a), doneToday = !!a.done[f], miss = missedDays(a);
      badgeT = tn(T0) + " · " + T("दिन ", "Day ") + dev(f) + "/" + dev(totalDays(a));
      badgeS = a.completedAt ? T("पूर्ण", "Complete") : dn < 1 ? T("आरम्भ: ", "Starts ") + fmtDate(a.start) : doneToday ? T("आज का पाठ पूर्ण ✓", "Today's portion done ✓") : T("संकल्प जारी", "Sankalp in progress");
      body = '<div class="sk-lead">' + esc(d.label) + '</div><div class="dd-meter"><i style="width:' + Math.max(2, st.pct) + '%"></i></div>' +
        '<p class="sk-sm"><b>' + dev(st.pct) + '%</b> ' + esc(T("सम्पूर्ण पाठ की प्रगति", "of the whole path")) + ' · ' + esc(minutesText(d.l)) + '</p>' +
        '<p class="sk-sm">⏰ ' + esc(T("अगला स्मरण: ", "Next reminder: ")) + esc(reminderWords(nextReminder(a))) + '</p>' +
        (miss.length ? '<p class="sk-warn">' + esc(dev(miss.length) + T(" दिन का पाठ शेष है", miss.length === 1 ? " day pending" : " days pending")) + '</p>' : '');
      if (a.completedAt) { cta = T("पाठ-पूर्ति देखें", "See the completion"); }
      else if (dn < 1 || doneToday) { cta = T("संकल्प देखें", "Open the sankalp"); }
      else { cta = T("आज का पाठ आरम्भ करें", "Begin today's reading"); ctaK = "read-day"; ctaArg = f; }
    }
    acts = [{ k: "open", ic: "🕉️", l: T("संकल्प", "Sankalp") }, { k: "vidhi", ic: "📖", l: T("विधि", "Vidhi") }, { k: "open", ic: "⏰", l: T("स्मरण", "Reminder") }, { k: "history", ic: "🪷", l: T("इतिहास", "History") }];
    return '<div class="dd-badge"><span class="dd-badge-ic" aria-hidden="true">' + T0.ic + '</span><div><b>' + esc(badgeT) + '</b><span>' + esc(badgeS) + '</span></div></div>' +
      '<div class="dd-text is-panel">' + body + '</div>' +
      '<button type="button" class="dd-cta" data-sk="' + ctaK + '"' + (ctaArg !== "" ? ' data-arg="' + ctaArg + '"' : '') + '>' + esc(cta) + ' <i aria-hidden="true">→</i></button>' +
      '<nav class="dd-actions">' + acts.map(function (x) { return '<button type="button" class="dd-act" data-sk="' + x.k + '"><span class="dd-act-ic" aria-hidden="true">' + x.ic + '</span><span>' + esc(x.l) + '</span></button>'; }).join("") + '</nav>';
  }

  /* ================================================================== the page */
  function render() {
    if (!root) return;
    var main = root.querySelector("[data-sk-main]");
    if (!main) return;
    var a = S.active, html;
    if (V.view === "history") html = historyHtml();
    else if (V.view === "vidhi") html = '<section class="sk-card"><h2>' + esc(T("पाठ की विधि", "How the path is done")) + '</h2>' + vidhiHtml(a ? a.type : W.type || "masa") + backBtn() + '</section>';
    else if (a && V.view !== "wizard") {
      if (a.type !== "akhand" && !PLAN) { main.innerHTML = '<p class="sk-loading">…</p>'; loadPlan().then(render).catch(function () { main.innerHTML = '<p class="sk-loading">' + esc(T("सामग्री लोड नहीं हो सकी। पुनः प्रयास करें।", "Could not load. Please try again.")) + '</p>'; }); return; }
      html = a.completedAt ? completeHtml(a) : a.type === "akhand" ? akhandHtml(a) : dashHtml(a);
    } else {
      if (!PLAN) { main.innerHTML = '<p class="sk-loading">…</p>'; loadPlan().then(render).catch(function () {}); return; }
      html = wizardHtml();
    }
    main.innerHTML = html;
    clearInterval(tickT);
    if (main.querySelector("[data-sk-timer]")) tickT = setInterval(tick, 1000);
  }
  function backBtn() { return '<div class="sk-row"><button type="button" class="sk-btn sk-btn-ghost" data-sk="back">← ' + esc(T("वापस", "Back")) + '</button></div>'; }

  /* ---------------- wizard ---------------- */
  function wizardHtml() {
    var st = W.step, h = stepper(st), body = "";
    if (st === 1) body = stepChoose();
    else if (st === 2) body = stepVidhi();
    else if (st === 3) body = stepSchedule();
    else body = stepReview();
    return h + body + (st === 1 && S.history.length ? '<p class="sk-histlink"><button type="button" class="sk-link" data-sk="history">🪷 ' + esc(T("निजी पाठ-इतिहास देखें", "See your private history")) + '</button></p>' : "");
  }
  function stepChoose() {
    var cards = ["masa", "navah", "akhand"].map(function (k) {
      var t = TYPES[k], on = W.type === k;
      var est = k === "akhand" ? hoursText(totalLines("navah")) + T(" (गति के अनुसार)", " (varies with pace)") : T("प्रतिदिन ", "Per day ") + minutesText(totalLines(k) / t.n);
      return '<button type="button" class="sk-type' + (on ? " is-on" : "") + '" data-sk="type" data-arg="' + k + '" aria-pressed="' + on + '">' +
        '<span class="sk-type-ic" aria-hidden="true">' + t.ic + '</span><span class="sk-type-h"><b>' + esc(tn(t)) + '</b><i>' + esc(tt(t.dur)) + '</i></span>' +
        '<em>' + esc(tt(t.tag)) + '</em><ul>' + t.pts.map(function (x) { return "<li>" + esc(tt(x)) + "</li>"; }).join("") + '</ul>' +
        '<small>⏱ ' + esc(est) + '</small><small class="sk-ideal">' + esc(tt(t.ideal)) + '</small></button>';
    }).join("");
    return '<section class="sk-card"><h2>' + esc(T("अपना पाठ चुनें", "Choose your path")) + '</h2><p class="sk-sub">' + esc(T("अवधि, प्रतिबद्धता और संक्षिप्त परिचय देखकर चुनें।", "Choose after seeing the length, commitment and a short description.")) + '</p>' +
      '<div class="sk-types">' + cards + '</div><div class="sk-row sk-row-r"><button type="button" class="sk-btn" data-sk="next"' + (W.type ? "" : " disabled") + '>' + esc(T("आगे: विधि समझें", "Next: understand the विधि")) + ' →</button></div></section>';
  }
  function stepVidhi() {
    return '<section class="sk-card"><h2>' + esc(T("विधि समझें — ", "Understand the विधि — ")) + esc(tn(TYPES[W.type])) + '</h2>' + vidhiHtml(W.type) +
      '<label class="sk-check"><input type="checkbox" data-sk-in="read"' + (W.read ? " checked" : "") + '> <span>' + esc(T("मैंने विधि पढ़ ली है और आगे बढ़ना चाहता/चाहती हूँ।", "I have read the विधि and wish to continue.")) + '</span></label>' +
      '<div class="sk-row"><button type="button" class="sk-btn sk-btn-ghost" data-sk="prev">← ' + esc(T("वापस", "Back")) + '</button><button type="button" class="sk-btn" data-sk="next"' + (W.read ? "" : " disabled") + '>' + esc(T("आगे: समय-सारणी", "Next: schedule")) + ' →</button></div></section>';
  }
  function timePresets(cur, field) {
    return '<div class="sk-presets">' + [["05:00", "सुबह ५:००", "5:00 AM"], ["06:00", "सुबह ६:००", "6:00 AM"], ["07:00", "सुबह ७:००", "7:00 AM"], ["19:00", "शाम ७:००", "7:00 PM"]].map(function (p) {
      return '<button type="button" class="sk-chipbtn' + (cur === p[0] ? " is-on" : "") + '" data-sk="preset" data-arg="' + field + ':' + p[0] + '">' + esc(T(p[1], p[2])) + '</button>';
    }).join("") + '</div>';
  }
  function stepSchedule() {
    var t = TYPES[W.type], body;
    if (!W.start) W.start = today();
    if (!W.planDate) W.planDate = addDays(today(), 1);
    if (W.type === "akhand") {
      body = '<div class="sk-form"><label>' + esc(T("पाठ की तिथि", "Date")) + '<input type="date" data-sk-in="planDate" value="' + W.planDate + '" min="' + today() + '"></label>' +
        '<label>' + esc(T("आरम्भ समय", "Start time")) + '<input type="time" data-sk-in="planTime" value="' + W.planTime + '"></label>' + timePresets(W.planTime, "planTime") +
        '<label>' + esc(T("स्थान (वैकल्पिक)", "Venue (optional)")) + '<input type="text" maxlength="80" data-sk-in="place" value="' + esc(W.place) + '" placeholder="' + esc(T("जैसे: घर का पूजा-कक्ष", "e.g. the home shrine room")) + '"></label>' +
        '<label>' + esc(T("पाठक (वैकल्पिक, अल्पविराम से अलग)", "Readers (optional, comma separated)")) + '<input type="text" maxlength="200" data-sk-in="readers" value="' + esc(W.readers) + '" placeholder="' + esc(T("रामलाल, सीता देवी", "Ramlal, Sita Devi")) + '"></label>' +
        '<label>' + esc(T("पाठक-परिवर्तन का स्मरण (यदि आपकी परम्परा अनुमति दे)", "Handover reminder (only if your tradition permits)")) +
        '<select data-sk-in="interval">' + [[0, "नहीं", "None"], [30, "हर ३० मिनट", "Every 30 min"], [60, "हर १ घण्टा", "Every hour"], [120, "हर २ घण्टे", "Every 2 hours"]].map(function (o) { return '<option value="' + o[0] + '"' + (+W.interval === o[0] ? " selected" : "") + '>' + esc(T(o[1], o[2])) + '</option>'; }).join("") + '</select></label>' +
        '<label class="sk-check"><input type="checkbox" data-sk-in="akRemind"' + (W.akRemind ? " checked" : "") + '> <span>' + esc(T("सत्र आरम्भ का स्मरण दें", "Remind me when the session is due to start")) + '</span></label></div>' +
        '<p class="sk-note">⏱ ' + esc(T("सम्पूर्ण पाठ में ", "The whole text takes ")) + esc(hoursText(totalLines("navah"))) + esc(T(" लगते हैं (गति पर निर्भर)।", " (depends on pace).")) + ' ' + esc(T("अखण्ड पाठ के लिए सामान्य दैनिक स्मरण नहीं भेजे जाते।", "No ordinary daily reminders are used for an akhand path.")) + '</p>';
    } else {
      var endK = addDays(W.start, t.n - 1), d1 = PLAN[W.type][0];
      body = '<div class="sk-form"><label>' + esc(T("आरम्भ तिथि", "Start date")) + '<input type="date" data-sk-in="start" value="' + W.start + '" min="' + today() + '"></label>' +
        '<label>' + esc(T("प्रतिदिन पाठ का समय", "Daily reading time")) + '<input type="time" data-sk-in="time" value="' + W.time + '"></label>' + timePresets(W.time, "time") +
        '<label class="sk-check"><input type="checkbox" data-sk-in="remind"' + (W.remind ? " checked" : "") + '> <span>' + esc(T("इस समय पर स्मरण दें", "Remind me at this time")) + '</span></label>' +
        '<label class="sk-check"><input type="checkbox" data-sk-in="follow"' + (W.follow ? " checked" : "") + '> <span>' + esc(T("यदि आरम्भ न हुआ हो तो एक घण्टे बाद एक बार हल्का स्मरण", "One gentle follow-up an hour later if I have not started")) + '</span></label></div>' +
        '<div class="sk-sum"><div><small>' + esc(T("पहला भाग", "First portion")) + '</small><b>' + esc(d1.label) + '</b></div><div><small>' + esc(T("समाप्ति तिथि", "Ends on")) + '</small><b>' + esc(fmtDate(endK)) + '</b></div><div><small>' + esc(T("दैनिक लक्ष्य", "Daily target")) + '</small><b>' + esc(minutesText(totalLines(W.type) / t.n)) + '</b></div></div>';
    }
    return '<section class="sk-card"><h2>' + esc(T("समय-सारणी बनाएँ — ", "Set your schedule — ")) + esc(tn(t)) + '</h2>' + body +
      '<div class="sk-row"><button type="button" class="sk-btn sk-btn-ghost" data-sk="prev">← ' + esc(T("वापस", "Back")) + '</button><button type="button" class="sk-btn" data-sk="next">' + esc(T("आगे: संकल्प देखें", "Next: review")) + ' →</button></div></section>';
  }
  function stepReview() {
    var t = TYPES[W.type], rows;
    if (W.type === "akhand") {
      rows = [[T("पाठ", "Path"), tn(t)], [T("तिथि", "Date"), fmtDate(W.planDate)], [T("आरम्भ समय", "Start time"), fmtTime(W.planTime)], [T("स्थान", "Venue"), W.place || "—"],
        [T("पाठक", "Readers"), W.readers || "—"], [T("पाठक-परिवर्तन स्मरण", "Handover reminder"), +W.interval ? dev(W.interval) + T(" मिनट", " min") : T("नहीं", "None")], [T("अनुमानित अवधि", "Estimated length"), hoursText(totalLines("navah"))]];
    } else {
      var arr = PLAN[W.type], endK = addDays(W.start, t.n - 1);
      rows = [[T("पाठ", "Path"), tn(t) + " · " + tt(t.dur)], [T("आरम्भ तिथि", "Start date"), fmtDate(W.start)], [T("समाप्ति तिथि", "End date"), fmtDate(endK)],
        [T("दैनिक समय", "Daily time"), fmtTime(W.time)], [T("स्मरण", "Reminder"), W.remind ? T("चालू", "On") + (W.follow ? T(" + एक अनुवर्ती", " + one follow-up") : "") : T("बन्द", "Off")],
        [T("पहला भाग", "First portion"), arr[0].label], [T("अन्तिम भाग", "Last portion"), arr[arr.length - 1].label]];
    }
    return '<section class="sk-card"><h2>' + esc(T("अपना संकल्प देखें", "Review your sankalp")) + '</h2><dl class="sk-dl">' +
      rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join("") + '</dl>' +
      '<p class="sk-note">🙏 ' + esc(T("संकल्प लेना आपका अपना, स्पष्ट निर्णय है। आरम्भ करने के बाद भी आप समय-सारणी बदल सकते हैं या संकल्प छोड़ सकते हैं।", "Taking the sankalp is your own, explicit decision. After you begin you can still change the schedule or set it aside.")) + '</p>' +
      '<div class="sk-row"><button type="button" class="sk-btn sk-btn-ghost" data-sk="prev">← ' + esc(T("वापस", "Back")) + '</button><button type="button" class="sk-btn sk-btn-big" data-sk="begin">🙏 ' + esc(T("संकल्प लें और आरम्भ करें", "Take the sankalp and begin")) + '</button></div></section>';
  }
  function begin() {
    var a = { id: newId(), type: W.type, created: new Date().toISOString(), done: {}, log: [] };
    if (W.type === "akhand") {
      a.planDate = W.planDate || addDays(today(), 1); a.planTime = W.planTime || "06:00"; a.place = (W.place || "").trim();
      a.readers = (W.readers || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 12);
      a.interval = +W.interval || 0; a.remind = !!W.akRemind; a.check = {};
      a.session = { t0: null, breaks: [], onBreak: false, bStart: 0, reader: 0, handovers: [], endedAt: null, alerted: 0 };
    } else {
      a.start = W.start || today(); a.shift = 0; a.time = W.time || "07:00"; a.remind = !!W.remind; a.follow = !!W.follow;
    }
    S.active = a; save();
    W.step = 1; W.read = false; V.view = ""; V.sel = 0;
    toast("🙏 " + T("संकल्प लिया — जय श्रीराम!", "Sankalp taken — Jai Shri Ram!"));
    if (a.remind && typeof Notification !== "undefined" && Notification.permission === "default") askPermission();
    arm(); refreshAll();
    window.scrollTo(0, 0);
  }

  /* ---------------- daily screen (मासिक / नवाह्न) ---------------- */
  function dayState(a, n) {
    var dn = dayNow(a);
    if (a.done[n]) return "done";
    if (n === dn) return "today";
    if (n < dn) return "missed";
    return "future";
  }
  function dashHtml(a) {
    var t = TYPES[a.type], st = stats(a), f = focusDay(a), arr = days(a), d = arr[f - 1], next = arr[f], dn = dayNow(a), doneToday = !!a.done[f], miss = missedDays(a);
    var started = dn >= 1;
    var chip = a.completedAt ? T("पूर्ण", "Complete") : !started ? T("आरम्भ: ", "Starts ") + fmtDate(a.start) : T("संकल्प जारी", "Sankalp in progress");
    var endMark = next ? openingLines(next, 2).join(" / ") : T("उत्तरकाण्ड की समाप्ति पर, पुस्तक के अन्तिम आरती-भाग से पहले", "At the end of उत्तरकाण्ड, before the closing आरती section of the book");
    var h = '<section class="sk-card sk-today"><div class="sk-today-top"><div><small>' + esc(T("आपका आज का मानस पाठ", "Your Manas reading today")) + '</small><h2>' + esc(tn(t)) + ' · ' + esc(T("दिन ", "Day ")) + dev(f) + ' / ' + dev(t.n) + '</h2></div><span class="sk-chip' + (doneToday ? " is-done" : "") + '">' + esc(doneToday ? T("आज का पाठ पूर्ण ✓", "Today's portion done ✓") : chip) + '</span></div>';
    h += '<div class="sk-prog"><div class="sk-ring" style="--p:' + st.pct + '"><b>' + dev(st.pct) + '%</b></div><div><b>' + esc(T("सम्पूर्ण पाठ की प्रगति", "Progress of the whole path")) + '</b><p>' + esc(T("यह आपके द्वारा पुष्टि किये गये पूर्ण भागों से बनती है — केवल पृष्ठ खोलने से नहीं।", "It comes from the portions you confirmed as read — not from merely opening a page.")) + '</p><p>' + dev(st.done) + ' / ' + dev(t.n) + ' ' + esc(T("दिन पूर्ण", "days completed")) + '</p></div></div>';
    h += '<div class="sk-portion"><small>' + esc(T("आज का निर्धारित पाठ", "Today's portion")) + '</small><h3>' + esc(d.label) + '</h3>' +
      '<div class="sk-mark"><span>▶ ' + esc(T("आरम्भ", "Start")) + '</span><p>' + openingLines(d, 2).map(esc).join("<br>") + '</p></div>' +
      '<div class="sk-mark sk-mark-end"><span>■ ' + esc(T("यहाँ पूर्ण करें", "Stop at")) + '</span><p>' + (next ? esc(T("अगले भाग के आरम्भ ( ", "just before the next portion begins ( ")) + endMark + esc(" )") : esc(endMark)) + '</p></div></div>';
    h += '<div class="sk-meta"><div><small>' + esc(T("अनुमानित समय", "Estimated time")) + '</small><b>' + esc(minutesText(d.l)) + '</b><i>' + esc(T("उदाहरण-गति पर आधारित", "based on an easy pace")) + '</i></div>' +
      '<div><small>' + esc(T("अगला स्मरण", "Next reminder")) + '</small><b>' + esc(reminderWords(nextReminder(a))) + '</b><i>' + esc(T("आपके द्वारा चुना गया", "chosen by you")) + '</i></div>' +
      '<div><small>' + esc(T("आज की तिथि का भाग", "Dated")) + '</small><b>' + esc(fmtDate(dayDate(a, f))) + '</b><i>' + esc(T("समाप्ति: ", "ends ")) + esc(fmtDate(endDate(a))) + '</i></div></div>';
    h += '<div class="sk-row sk-row-c"><button type="button" class="sk-btn sk-btn-big" data-sk="read-day" data-arg="' + f + '">📖 ' + esc(T("आज का पाठ आरम्भ करें", "Begin today's reading")) + '</button>' +
      (doneToday ? '<button type="button" class="sk-btn sk-btn-ghost" data-sk="undo" data-arg="' + f + '">' + esc(T("सुधारें (पूर्ण हटाएँ)", "Correct (unmark)")) + '</button>'
                 : '<button type="button" class="sk-btn sk-btn-ok" data-sk="done" data-arg="' + f + '"' + (started ? "" : " disabled") + '>✓ ' + esc(T("पाठ पूर्ण दर्ज करें", "Record this portion as read")) + '</button>') + '</div>';
    h += '<p class="sk-sm sk-center">' + esc(T("पाठ पूरा पढ़ने के बाद ही “पूर्ण” दर्ज करें; खोलना अपने-आप पूर्ण नहीं गिना जाता।", "Record it only after reading it through; opening is never counted as completed.")) + '</p></section>';

    if (miss.length) h += missedHtml(a, miss);
    h += daysGridHtml(a);
    h += settingsHtml(a);
    return h;
  }
  function missedHtml(a, miss) {
    var f = miss[0], shiftBy = dayNow(a) - f, newEnd = addDays(endDate(a), shiftBy);
    return '<section class="sk-card sk-missed"><h2>🕊️ ' + esc(dev(miss.length) + T(" दिन का पाठ शेष है", miss.length === 1 ? " day still pending" : " days still pending")) + '</h2>' +
      '<p>' + esc(T("दिन ", "Day ")) + miss.slice(0, 8).map(dev).join(", ") + (miss.length > 8 ? "…" : "") + '. ' + esc(T("कोई बात नहीं — आप जिस तरह चाहें आगे बढ़ें। कुछ भी अपने-आप नहीं बदला जाएगा।", "No worry — continue as you wish. Nothing is changed automatically.")) + '</p>' +
      '<p class="sk-sm">' + esc(T("मूल समाप्ति तिथि: ", "Original end date: ")) + esc(fmtDate(origEnd(a))) + ' · ' + esc(T("वर्तमान: ", "Current: ")) + esc(fmtDate(endDate(a))) + '</p>' +
      '<div class="sk-opts"><button type="button" class="sk-btn" data-sk="read-day" data-arg="' + f + '">📖 ' + esc(T("छूटा भाग अभी पढ़ें (दिन ", "Read the missed portion now (day ")) + dev(f) + ')</button>' +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="shift" data-arg="' + f + '">📅 ' + esc(T("शेष कार्यक्रम आज से आगे बढ़ाएँ — नई समाप्ति: ", "Move the rest to start today — new end: ")) + esc(fmtDate(newEnd)) + '</button>' +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="restart">↺ ' + esc(T("संकल्प फिर से आरम्भ करें", "Restart the sankalp")) + '</button></div>' +
      '<p class="sk-note">ℹ️ ' + esc(T("समय-सारणी बदलने पर पूर्ण हुए भाग वैसे ही रहते हैं; केवल तिथियाँ बदलती हैं और यह संशोधन अंकित रहता है। किसी परम्परा-विशेष का नियम (जैसे निश्चित तिथि पर समापन) हो तो गुरुजन से पूछें।", "Completed portions stay as they are; only dates move, and the change is noted. If your tradition has a rule (such as finishing on a fixed date), ask your guru.")) + '</p></section>';
  }
  function daysGridHtml(a) {
    var arr = days(a), sel = V.sel, s = "";
    s += '<section class="sk-card"><h2>' + esc(T("पाठ-समय-सारणी", "Schedule")) + '</h2><div class="sk-days">' + arr.map(function (d) {
      var st = dayState(a, d.n);
      return '<button type="button" class="sk-day is-' + st + (sel === d.n ? " is-sel" : "") + '" data-sk="sel" data-arg="' + d.n + '" aria-label="' + esc(T("दिन ", "Day ") + d.n + " " + d.label) + '"><span>' + dev(d.n) + '</span><i>' + (st === "done" ? "✓" : st === "missed" ? "•" : "") + '</i></button>';
    }).join("") + '</div><p class="sk-legend"><span class="is-done">✓ ' + esc(T("पूर्ण", "done")) + '</span><span class="is-today">● ' + esc(T("आज", "today")) + '</span><span class="is-missed">• ' + esc(T("शेष", "pending")) + '</span><span class="is-future">○ ' + esc(T("आगे", "upcoming")) + '</span></p>';
    if (sel) {
      var d = arr[sel - 1], st2 = dayState(a, sel);
      s += '<div class="sk-dayinfo"><b>' + esc(T("दिन ", "Day ")) + dev(sel) + ' · ' + esc(fmtDate(dayDate(a, sel))) + '</b><span>' + esc(d.label) + '</span><p>' + openingLines(d, 2).map(esc).join("<br>") + '</p>' +
        (a.done[sel] ? '<p class="sk-sm">✓ ' + esc(T("दर्ज: ", "Recorded: ")) + esc(fmtDate(dayKey(new Date(a.done[sel].at)))) + '</p>' : '') +
        '<div class="sk-row"><button type="button" class="sk-btn sk-btn-ghost" data-sk="read-day" data-arg="' + sel + '">📖 ' + esc(T("यह भाग खोलें", "Open this portion")) + '</button>' +
        (a.done[sel] ? '<button type="button" class="sk-btn sk-btn-ghost" data-sk="undo" data-arg="' + sel + '">' + esc(T("सुधारें (पूर्ण हटाएँ)", "Correct (unmark)")) + '</button>'
                     : '<button type="button" class="sk-btn sk-btn-ok" data-sk="done" data-arg="' + sel + '"' + (st2 === "future" ? " disabled" : "") + '>✓ ' + esc(T("पूर्ण दर्ज करें", "Record as read")) + '</button>') + '</div></div>';
    }
    if ((a.log || []).length) s += '<p class="sk-sm">' + esc(T("समय-सारणी में ", "The schedule was changed ")) + dev(a.log.filter(function (x) { return x.kind === "shift"; }).length) + esc(T(" बार संशोधन हुआ।", " time(s).")) + '</p>';
    return s + '</section>';
  }
  function settingsHtml(a) {
    return '<section class="sk-card"><h2>' + esc(T("स्मरण और संकल्प", "Reminders and sankalp")) + '</h2><div class="sk-form">' +
      '<label>' + esc(T("प्रतिदिन पाठ का समय", "Daily reading time")) + '<input type="time" data-sk-in="a-time" value="' + (a.time || "07:00") + '"></label>' +
      '<label class="sk-check"><input type="checkbox" data-sk-in="a-remind"' + (a.remind ? " checked" : "") + '> <span>' + esc(T("स्मरण चालू", "Reminders on")) + '</span></label>' +
      '<label class="sk-check"><input type="checkbox" data-sk-in="a-follow"' + (a.follow ? " checked" : "") + '> <span>' + esc(T("एक अनुवर्ती स्मरण", "One follow-up")) + '</span></label></div>' +
      '<p class="sk-sm">🔔 ' + esc(T("ब्राउज़र सूचना: ", "Browser notification: ")) + esc(permWords()) + ' — ' + esc(T("यह तब आती है जब स्वाध्याय आपके ब्राउज़र में खुला हो।", "it works while Swadhyay is open in your browser.")) + '</p>' +
      '<div class="sk-row sk-wrap-row">' + (typeof Notification !== "undefined" && Notification.permission === "default" ? '<button type="button" class="sk-btn sk-btn-ghost" data-sk="perm">🔔 ' + esc(T("सूचना की अनुमति दें", "Allow notifications")) + '</button>' : '') +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="ics">📅 ' + esc(T("कैलेंडर में जोड़ें (हर स्थिति में स्मरण)", "Add to calendar (works even when the site is closed)")) + '</button>' +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="vidhi">📖 ' + esc(T("विधि देखें", "See the विधि")) + '</button>' +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="history">🪷 ' + esc(T("पाठ-इतिहास", "History")) + '</button>' +
      '<button type="button" class="sk-btn sk-btn-danger" data-sk="abandon">' + esc(T("संकल्प रोकें", "Set the sankalp aside")) + '</button></div></section>';
  }
  function markDone(a, n) {
    var d = days(a)[n - 1];
    modal({
      title: T("पाठ पूर्ण दर्ज करें?", "Record this portion as read?"),
      body: '<p>' + esc(T("क्या आपने यह भाग आरम्भ से अन्त तक पढ़ लिया है?", "Have you read this portion from start to end?")) + '</p><p><b>' + esc(T("दिन ", "Day ")) + dev(n) + ' — ' + esc(d.label) + '</b></p>',
      yes: T("हाँ, पूर्ण दर्ज करें", "Yes, record it"), no: T("अभी नहीं", "Not yet"),
      onYes: function () {
        a.done[n] = { at: new Date().toISOString() }; save();
        if (allDone(a)) { a.completedAt = new Date().toISOString(); save(); toast("🪷 " + T("श्रीरामचरितमानस पाठ पूर्ण — जय श्रीराम!", "The Ramcharitmanas path is complete — Jai Shri Ram!")); }
        else toast("🙏 " + T("दर्ज हो गया।", "Recorded."));
        arm(); refreshAll();
      }
    });
  }
  function undoDone(a, n) {
    modal({
      title: T("पूर्ण हटाएँ?", "Remove the completion?"),
      body: '<p>' + esc(T("दिन ", "Day ")) + dev(n) + esc(T(" का भाग फिर “शेष” माना जाएगा। (यदि गलती से पूर्ण दर्ज हुआ हो तो यह ठीक करता है।)", " goes back to “pending”. (Use this if it was marked by mistake.)")) + '</p>',
      yes: T("हाँ, हटाएँ", "Yes, remove"), no: T("रहने दें", "Keep it"),
      onYes: function () { delete a.done[n]; delete a.completedAt; (a.log = a.log || []).push({ at: new Date().toISOString(), kind: "undo", n: n }); save(); arm(); refreshAll(); }
    });
  }

  /* ---------------- completion + history ---------------- */
  function summaryOf(a) {
    var rec = { id: a.id, type: a.type, status: a.completedAt ? "complete" : "stopped", created: a.created, closed: a.completedAt || new Date().toISOString() };
    if (a.type === "akhand") { rec.start = a.session && a.session.t0 ? new Date(a.session.t0).toISOString() : a.planDate; rec.dur = a.session && a.session.t0 ? elapsed(a) : 0; rec.readers = (a.readers || []).length; rec.handovers = a.session ? a.session.handovers.length : 0; }
    else { rec.start = a.start; rec.days = Object.keys(a.done).length; rec.shifts = (a.log || []).filter(function (x) { return x.kind === "shift"; }).length; rec.lines = days(a).reduce(function (s, d) { return s + (a.done[d.n] ? d.l : 0); }, 0); }
    return rec;
  }
  function completeHtml(a) {
    var rec = summaryOf(a), t = TYPES[a.type];
    var rows = a.type === "akhand"
      ? [[T("आरम्भ", "Started"), fmtDate(dayKey(new Date(rec.start))) + ", " + fmtTime(pad(new Date(rec.start).getHours()) + ":" + pad(new Date(rec.start).getMinutes()))], [T("पूर्ण", "Completed"), fmtDate(dayKey(new Date(rec.closed)))], [T("कुल अवधि", "Total duration"), fmtDur(rec.dur)], [T("पाठक-परिवर्तन", "Handovers"), dev(rec.handovers)]]
      : [[T("आरम्भ तिथि", "Started"), fmtDate(a.start)], [T("पूर्णता तिथि", "Completed"), fmtDate(dayKey(new Date(rec.closed)))], [T("पाठ के दिन", "Days of reading"), dev(rec.days) + " / " + dev(t.n)], [T("समय-सारणी संशोधन", "Schedule changes"), dev(rec.shifts)]];
    return '<section class="sk-card sk-complete"><div class="sk-om" aria-hidden="true">🪷</div><h2>' + esc(T("श्रीरामचरितमानस पाठ पूर्ण", "Ramcharitmanas path complete")) + '</h2><p class="sk-center">' + esc(T("जय श्रीराम 🙏 — आपकी साधना को प्रणाम।", "Jai Shri Ram 🙏 — a bow to your sadhana.")) + '</p>' +
      '<p class="sk-center"><b>' + esc(tn(t)) + '</b></p><dl class="sk-dl">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join("") + '</dl>' +
      '<div class="sk-card sk-inner"><b>' + esc(T("समापन विधि का स्मरण", "A reminder of the closing observance")) + '</b><p>' + esc(T("पुस्तक में दी गयी आरती तथा क्षमा-प्रार्थना करें; हवन, प्रसाद आदि की परम्परा हो तो अपने गुरुजन/कुल-परम्परा के अनुसार करें।", "Do the आरती and the prayer for forgiveness given in the book; for हवन, prasad and the like, follow your guru or family tradition.")) + '</p></div>' +
      '<label class="sk-check"><input type="checkbox" data-sk-in="keep" checked> <span>' + esc(T("इस संकल्प का निजी रिकॉर्ड इस उपकरण पर रखें", "Keep a private record of this sankalp on this device")) + '</span></label>' +
      '<div class="sk-row sk-wrap-row"><button type="button" class="sk-btn" data-sk="finish" data-arg="new">' + esc(T("नया पाठ आरम्भ करें", "Begin another path")) + '</button><button type="button" class="sk-btn sk-btn-ghost" data-sk="finish" data-arg="lib">' + esc(T("स्वाध्याय पुस्तकालय में लौटें", "Return to the library")) + '</button></div>' +
      '<p class="sk-sm sk-center">' + esc(T("यह पूर्णता-स्क्रीन प्रमाणपत्र नहीं है; यह केवल आपके द्वारा दर्ज पाठ का सार है और किसी अनुष्ठान की पूर्ति प्रमाणित नहीं करता।", "This screen is not a certificate; it only summarises what you recorded and does not certify any ritual.")) + '</p></section>';
  }
  function finish(keep, dest) {
    var a = S.active; if (!a) return;
    if (keep) S.history.unshift(summaryOf(a));
    S.active = null; save(); W.step = 1; W.type = null; W.read = false; V.view = ""; V.sel = 0; clearTimeout(timer);
    if (dest === "lib" && app()) { app().navigate("/library"); refreshAll(); return; }
    refreshAll(); window.scrollTo(0, 0);
  }
  function historyHtml() {
    var list = S.history;
    return '<section class="sk-card"><h2>🪷 ' + esc(T("निजी पाठ-इतिहास", "Private path history")) + '</h2><p class="sk-sub">' + esc(T("यह केवल इसी उपकरण पर रहता है।", "Kept only on this device.")) + '</p>' +
      (list.length ? '<ul class="sk-hist">' + list.map(function (h, i) {
        var t = TYPES[h.type] || TYPES.masa;
        var detail = h.type === "akhand" ? T("अवधि ", "Duration ") + fmtDur(h.dur || 0) : dev(h.days || 0) + T(" दिन पढ़े", " days read");
        return '<li><div><b>' + esc(tn(t)) + '</b> · ' + esc(h.status === "complete" ? T("पूर्ण", "complete") : T("रोका गया", "set aside")) + '<br><small>' + esc(fmtDate(dayKey(new Date(h.start))) + " → " + fmtDate(dayKey(new Date(h.closed))) + " · " + detail) + '</small></div><button type="button" class="sk-link" data-sk="hist-del" data-arg="' + i + '">' + esc(T("हटाएँ", "Delete")) + '</button></li>';
      }).join("") + '</ul>' : '<p class="sk-center">' + esc(T("अभी कोई रिकॉर्ड नहीं है।", "No records yet.")) + '</p>') + backBtn() + '</section>';
  }

  /* ---------------- अखण्ड session ---------------- */
  function elapsed(a) {
    var s = a.session; if (!s || !s.t0) return 0;
    var end = s.endedAt || Date.now(), br = 0;
    s.breaks.forEach(function (b) { br += (b.to || (s.endedAt || Date.now())) - b.from; });
    return Math.max(0, end - s.t0 - br);
  }
  function currentReader(a) { var r = a.readers || []; return r.length ? r[a.session.reader % r.length] : ""; }
  function akhandHtml(a) {
    var s = a.session, running = s.t0 && !s.endedAt, h = "";
    h += '<section class="sk-card sk-today"><div class="sk-today-top"><div><small>' + esc(T("अखण्ड पाठ सत्र", "Akhand path session")) + '</small><h2>' + esc(running ? (s.onBreak ? T("विराम", "On a break") : T("पाठ चल रहा है", "Reading in progress")) : T("तैयारी", "Preparation")) + '</h2></div>' +
      '<span class="sk-chip' + (running && !s.onBreak ? " is-done" : "") + '">' + esc(running ? T("सत्र सक्रिय", "Session active") : fmtDate(a.planDate) + ", " + fmtTime(a.planTime)) + '</span></div>';
    if (running) {
      var due = a.interval && (a.readers || []).length > 1 && (Date.now() - (s.handovers.length ? s.handovers[s.handovers.length - 1].t : s.t0)) >= a.interval * 60000;
      h += '<div class="sk-timer-big" data-sk-timer>' + fmtDur(elapsed(a)) + '</div><p class="sk-center sk-sm">' + esc(T("कुल पाठ-अवधि (विराम छोड़कर)", "Total reading time (breaks excluded)")) + '</p>';
      h += '<div class="sk-meta"><div><small>' + esc(T("पुस्तक में स्थिति", "Place in the book")) + '</small><b>' + dev(app() ? app().bookProgress(MANAS_FILE) : 0) + '%</b><i>' + esc(T("पाठ-पृष्ठों के अनुसार", "from the pages you opened")) + '</i></div>' +
        '<div><small>' + esc(T("वर्तमान पाठक", "Current reader")) + '</small><b>' + esc(currentReader(a) || "—") + '</b><i>' + esc(T("पाठक-परिवर्तन: ", "handovers: ")) + dev(s.handovers.length) + '</i></div>' +
        '<div><small>' + esc(T("स्थान", "Venue")) + '</small><b>' + esc(a.place || "—") + '</b><i>' + esc(T("आरम्भ: ", "began ")) + esc(fmtTime(pad(new Date(s.t0).getHours()) + ":" + pad(new Date(s.t0).getMinutes()))) + '</i></div></div>';
      if (due) h += '<p class="sk-warn" data-sk-due>🔔 ' + esc(T("पाठक-परिवर्तन का समय हो गया है।", "It is time for a handover.")) + '</p>';
      h += '<div class="sk-row sk-row-c sk-wrap-row"><button type="button" class="sk-btn sk-btn-big" data-sk="ak-read">📖 ' + esc(T("मानस खोलें / जारी रखें", "Open / continue the Manas")) + '</button>' +
        '<button type="button" class="sk-btn sk-btn-ghost" data-sk="ak-break">' + esc(s.onBreak ? T("▶ विराम समाप्त करें", "▶ End the break") : T("⏸ विराम", "⏸ Take a break")) + '</button>' +
        ((a.readers || []).length > 1 ? '<button type="button" class="sk-btn sk-btn-ghost" data-sk="ak-hand">🔁 ' + esc(T("पाठक-परिवर्तन दर्ज करें", "Record a handover")) + '</button>' : '') +
        '<button type="button" class="sk-btn sk-btn-ok" data-sk="ak-end">✓ ' + esc(T("अखण्ड पाठ पूर्ण", "Akhand path complete")) + '</button></div>';
      if (s.handovers.length) h += '<ul class="sk-hist sk-small">' + s.handovers.slice().reverse().slice(0, 6).map(function (x) { return '<li><div>' + esc(fmtTime(pad(new Date(x.t).getHours()) + ":" + pad(new Date(x.t).getMinutes())) + " — " + x.from + " → " + x.to) + '</div></li>'; }).join("") + '</ul>';
    } else {
      h += '<p class="sk-center">' + esc(T("सम्पूर्ण पाठ में ", "The whole text takes ")) + esc(hoursText(totalLines("navah"))) + esc(T(" लगते हैं।", ".")) + '</p>' +
        '<h3 class="sk-h3">' + esc(T("तैयारी की सूची", "Preparation checklist")) + '</h3><ul class="sk-checklist">' + AK_CHECK.map(function (c, i) {
          return '<li><label class="sk-check"><input type="checkbox" data-sk-in="ak-check" data-i="' + i + '"' + (a.check && a.check[i] ? " checked" : "") + '> <span>' + esc(tt(c)) + '</span></label></li>';
        }).join("") + '</ul>';
      if ((a.readers || []).length) h += '<p class="sk-sm">' + esc(T("पाठक: ", "Readers: ")) + esc(a.readers.join(", ")) + '</p>';
      h += '<div class="sk-row sk-row-c sk-wrap-row"><button type="button" class="sk-btn sk-btn-big" data-sk="ak-start">🕉️ ' + esc(T("पाठ-सत्र आरम्भ करें", "Begin the session")) + '</button></div>';
    }
    h += '</section>';
    h += '<section class="sk-card"><h2>' + esc(T("विधि और स्मरण", "Vidhi and reminder")) + '</h2><p class="sk-sm">' + esc(T("अखण्ड पाठ में दैनिक स्मरण नहीं लगते; केवल सत्र-आरम्भ और (यदि चुना हो) पाठक-परिवर्तन के संकेत आते हैं।", "No daily reminders are used; only a session-start alert and (if chosen) handover alerts.")) + '</p>' +
      '<div class="sk-row sk-wrap-row">' + (typeof Notification !== "undefined" && Notification.permission === "default" ? '<button type="button" class="sk-btn sk-btn-ghost" data-sk="perm">🔔 ' + esc(T("सूचना की अनुमति दें", "Allow notifications")) + '</button>' : '') +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="ics">📅 ' + esc(T("कैलेंडर में जोड़ें", "Add to calendar")) + '</button><button type="button" class="sk-btn sk-btn-ghost" data-sk="vidhi">📖 ' + esc(T("विधि देखें", "See the विधि")) + '</button>' +
      '<button type="button" class="sk-btn sk-btn-ghost" data-sk="history">🪷 ' + esc(T("पाठ-इतिहास", "History")) + '</button><button type="button" class="sk-btn sk-btn-danger" data-sk="abandon">' + esc(T("संकल्प रोकें", "Set the sankalp aside")) + '</button></div></section>';
    return h;
  }
  function tick() {
    if (!root || !root.isConnected) { clearInterval(tickT); return; }
    var a = S.active; if (!a || a.type !== "akhand" || !a.session || !a.session.t0 || a.session.endedAt) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-sk-timer]"), function (el) { el.textContent = fmtDur(elapsed(a)); });
    var s = a.session;
    if (a.interval && (a.readers || []).length > 1 && !s.onBreak) {
      var last = s.handovers.length ? s.handovers[s.handovers.length - 1].t : s.t0, k = Math.floor((Date.now() - last) / (a.interval * 60000));
      if (k >= 1 && s.alerted !== last) { s.alerted = last; save(); notify(T("अखण्ड पाठ", "Akhand path"), T("पाठक-परिवर्तन का समय हो गया है।", "It is time for a handover.")); render(); }
    }
  }

  /* ================================================================== events */
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-sk]") : null;
    if (!b) return;
    var k = b.getAttribute("data-sk"), arg = b.getAttribute("data-arg"), a = S.active, ap = app();
    if (k === "pick") { W.type = arg; W.step = 2; W.read = false; V.view = "wizard"; if (ap) ap.navigate("/sankalp"); else refreshAll(); }
    else if (k === "open") { V.view = ""; if (ap) ap.navigate("/sankalp"); }
    else if (k === "history") { V.view = "history"; if (ap && !(root && root.isConnected)) ap.navigate("/sankalp"); else render(); }
    else if (k === "vidhi") { V.view = "vidhi"; if (ap && !(root && root.isConnected)) ap.navigate("/sankalp"); else render(); }
    else if (k === "back") { V.view = a ? "" : "wizard"; render(); }
    else if (k === "type") { W.type = arg; W.read = false; render(); }
    else if (k === "next") { if (W.step === 1 && !W.type) return; if (W.step === 2 && !W.read) return; W.step = Math.min(4, W.step + 1); render(); window.scrollTo(0, 0); }
    else if (k === "prev") { W.step = Math.max(1, W.step - 1); render(); window.scrollTo(0, 0); }
    else if (k === "preset") { var p = arg.split(":"); var f = p[0], v = p.slice(1).join(":"); W[f] = v; render(); }
    else if (k === "begin") begin();
    else if (k === "book-vidhi") { if (ap) ap.openBookAt(MANAS_FILE, { text: "पारायण-विधि" }); }
    else if (k === "read-day") { if (a && ap && PLAN) { var d = days(a)[+arg - 1]; lastRead = { n: +arg, t: Date.now() }; ap.openBookAt(MANAS_FILE, { id: d.id }); } }
    else if (k === "done") { if (a) markDone(a, +arg); }
    else if (k === "undo") { if (a) undoDone(a, +arg); }
    else if (k === "sel") { V.sel = V.sel === +arg ? 0 : +arg; render(); }
    else if (k === "shift") { if (a) shiftSchedule(a, +arg); }
    else if (k === "restart") { if (a) restart(a); }
    else if (k === "abandon") { if (a) abandon(a); }
    else if (k === "perm") askPermission();
    else if (k === "ics") { if (a) downloadIcs(a); }
    else if (k === "finish") { var keepEl = root && root.querySelector('[data-sk-in="keep"]'); finish(keepEl ? keepEl.checked : true, arg); }
    else if (k === "hist-del") { S.history.splice(+arg, 1); save(); render(); }
    else if (k === "ak-start") akStart(a);
    else if (k === "ak-read") { if (ap) ap.navigate(ap.readPath(MANAS_FILE)); }
    else if (k === "ak-break") akBreak(a);
    else if (k === "ak-hand") akHand(a);
    else if (k === "ak-end") akEnd(a);
  }
  function onInput(e) {
    var el = e.target, f = el.getAttribute && el.getAttribute("data-sk-in");
    if (!f) return;
    var a = S.active, v = el.type === "checkbox" ? el.checked : el.value;
    if (f === "read") { W.read = v; render(); return; }
    if (f === "remind" || f === "follow" || f === "akRemind") { W[f] = v; return; }
    if (f === "start" || f === "time" || f === "planDate" || f === "planTime" || f === "place" || f === "readers" || f === "interval") {
      if ((f === "start" || f === "planDate") && v && v < today()) v = today();
      W[f] = v; if (el.type === "date" || el.type === "time" || el.tagName === "SELECT") render(); return;
    }
    if (!a) return;
    if (f === "a-time") { a.time = v || "07:00"; save(); arm(); }
    else if (f === "a-remind") { a.remind = v; save(); arm(); if (v && typeof Notification !== "undefined" && Notification.permission === "default") askPermission(); render(); }
    else if (f === "a-follow") { a.follow = v; save(); arm(); }
    else if (f === "ak-check") { a.check = a.check || {}; a.check[el.getAttribute("data-i")] = v; save(); }
  }
  function shiftSchedule(a, first) {
    var by = dayNow(a) - first;
    if (by <= 0) return;
    var oldEnd = endDate(a), newEnd = addDays(oldEnd, by);
    modal({
      title: T("शेष कार्यक्रम आगे बढ़ाएँ?", "Move the remaining schedule?"),
      body: '<p>' + esc(T("दिन ", "Day ")) + dev(first) + esc(T(" का भाग आज से होगा; पूर्ण हुए भाग वैसे ही रहेंगे।", " becomes today; completed portions stay as they are.")) + '</p><p>' + esc(T("मूल समाप्ति तिथि: ", "Original end date: ")) + '<b>' + esc(fmtDate(origEnd(a))) + '</b><br>' + esc(T("नई समाप्ति तिथि: ", "New end date: ")) + '<b>' + esc(fmtDate(newEnd)) + '</b></p>',
      yes: T("हाँ, आगे बढ़ाएँ", "Yes, move it"), no: T("रहने दें", "Keep as is"),
      onYes: function () { a.shift = (a.shift || 0) + by; (a.log = a.log || []).push({ at: new Date().toISOString(), kind: "shift", by: by }); save(); arm(); refreshAll(); toast(T("समय-सारणी संशोधित हुई।", "Schedule updated.")); }
    });
  }
  function restart(a) {
    modal({
      title: T("संकल्प फिर से आरम्भ करें?", "Restart the sankalp?"),
      body: '<p>' + esc(T("वर्तमान पाठ इतिहास में “रोका गया” के रूप में रखा जाएगा और आप नया संकल्प ले सकेंगे।", "The current path is kept in your history as “set aside” and you can take a fresh sankalp.")) + '</p>',
      yes: T("हाँ, फिर आरम्भ", "Yes, restart"), no: T("रहने दें", "Cancel"),
      onYes: function () { var t = a.type; S.history.unshift(summaryOf(a)); S.active = null; save(); W.type = t; W.step = 2; W.read = false; V.view = "wizard"; clearTimeout(timer); refreshAll(); window.scrollTo(0, 0); }
    });
  }
  function abandon(a) {
    modal({
      title: T("संकल्प रोकें?", "Set the sankalp aside?"),
      body: '<p>' + esc(T("यह संकल्प रुक जाएगा और इतिहास में “रोका गया” के रूप में रखा जाएगा।", "This sankalp stops and is kept in your history as “set aside”.")) + '</p>',
      yes: T("हाँ, रोकें", "Yes, set aside"), no: T("नहीं", "No"),
      onYes: function () { S.history.unshift(summaryOf(a)); S.active = null; save(); V.view = ""; W.step = 1; W.type = null; clearTimeout(timer); refreshAll(); }
    });
  }
  function akStart(a) {
    modal({
      title: T("अखण्ड पाठ-सत्र आरम्भ करें?", "Begin the akhand session?"),
      body: '<p>' + esc(T("समय-मापक अभी से चलने लगेगा। पाठ-सत्र पूर्ण होने तक सक्रिय रहेगा।", "The timer starts now and the session stays active until you complete it.")) + '</p>',
      yes: T("आरम्भ करें", "Begin"), no: T("अभी नहीं", "Not yet"),
      onYes: function () { a.session.t0 = Date.now(); a.session.alerted = 0; save(); refreshAll(); toast("🕉️ " + T("पाठ-सत्र आरम्भ — जय श्रीराम!", "Session begun — Jai Shri Ram!")); }
    });
  }
  function akBreak(a) {
    var s = a.session;
    if (s.onBreak) { var b = s.breaks[s.breaks.length - 1]; if (b && !b.to) b.to = Date.now(); s.onBreak = false; }
    else { s.breaks.push({ from: Date.now(), to: 0 }); s.onBreak = true; }
    save(); render();
  }
  function akHand(a) {
    var s = a.session, r = a.readers, from = currentReader(a);
    s.reader = (s.reader + 1) % r.length;
    s.handovers.push({ t: Date.now(), from: from, to: currentReader(a) });
    save(); render(); toast("🔁 " + from + " → " + currentReader(a));
  }
  function akEnd(a) {
    modal({
      title: T("अखण्ड पाठ पूर्ण दर्ज करें?", "Record the akhand path as complete?"),
      body: '<p>' + esc(T("क्या सम्पूर्ण श्रीरामचरितमानस का पाठ पूर्ण हो गया है?", "Has the whole Ramcharitmanas been read through?")) + '</p>',
      yes: T("हाँ, पूर्ण", "Yes, complete"), no: T("अभी नहीं", "Not yet"),
      onYes: function () {
        var s = a.session; if (s.onBreak) { var b = s.breaks[s.breaks.length - 1]; if (b && !b.to) b.to = Date.now(); s.onBreak = false; }
        s.endedAt = Date.now(); a.completedAt = new Date().toISOString(); save(); clearTimeout(timer); refreshAll(); window.scrollTo(0, 0);
      }
    });
  }

  /* ---------------- a slim strip in the reader while today's portion is being read ---------------- */
  var lastRead = { n: 0, t: 0 };
  function readerBar(file) {
    var old = document.getElementById("skReadBar");
    if (old) old.remove();
    var a = S.active;
    if (file !== MANAS_FILE || !a || a.type === "akhand" || a.completedAt) return;
    loadPlan().then(function () {
      if (S.active !== a || document.getElementById("skReadBar")) return;
      var top = document.querySelector("#readerOverlay .reader-topbar");
      if (!top) return;
      var n = Date.now() - lastRead.t < 20000 && lastRead.n ? lastRead.n : focusDay(a), arr = days(a), d = arr[n - 1], next = arr[n];
      var bar = document.createElement("div");
      bar.id = "skReadBar"; bar.className = "sk-readbar";
      function paint() {
        var done = !!a.done[n];
        bar.innerHTML = '<div class="sk-rb-tx"><b>' + esc(T("आज का पाठ · दिन ", "Today's portion · day ")) + dev(n) + '</b> ' + esc(d.label) +
          '<span>▶ ' + esc(openingLines(d, 1)[0] || "") + '</span><span>■ ' + esc(next ? T("यहाँ तक: ", "up to: ") + (openingLines(next, 1)[0] || "") : T("उत्तरकाण्ड की समाप्ति तक", "to the end of उत्तरकाण्ड")) + '</span></div>' +
          (done ? '<em>✓ ' + esc(T("दर्ज", "recorded")) + '</em>' : '<button type="button" class="sk-rb-ok">✓ ' + esc(T("पूर्ण दर्ज करें", "Record as read")) + '</button>') +
          '<button type="button" class="sk-rb-x" aria-label="' + esc(T("बन्द करें", "Close")) + '">✕</button>';
      }
      paint();
      bar.addEventListener("click", function (e) {
        if (e.target.closest(".sk-rb-x")) { bar.remove(); return; }
        if (e.target.closest(".sk-rb-ok")) {
          var s0 = JSON.stringify(a.done);
          markDone(a, n);
          var chk = setInterval(function () { if (!document.body.contains(bar)) { clearInterval(chk); return; } if (JSON.stringify(a.done) !== s0 && document.querySelector(".sk-modal") === null) { clearInterval(chk); paint(); } }, 400);
        }
      });
      top.insertAdjacentElement("afterend", bar);
    }).catch(function () {});
  }

  /* ---------------- public ---------------- */
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    if (S.active) loadPlan().then(arm).catch(function () {});
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { arm(); if (root && root.isConnected) render(); } });
  }
  boot();

  window.SwadhyaySankalp = {
    pageHtml: function () {
      return '<section class="sk-root" data-sankalp>' + hero() + '<main class="content-pad sk-wrap" data-sk-main><p class="sk-loading">…</p></main></section>';
    },
    mount: function (h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      root = document.querySelector("[data-sankalp]");
      if (!root) return;
      var q = new URLSearchParams(location.search);
      if (q.get("view") === "history") V.view = "history";
      else if (q.get("view") === "vidhi") V.view = "vidhi";
      if (!S.active && q.get("type") && TYPES[q.get("type")] && !W.type) { W.type = q.get("type"); W.step = 2; }
      root.addEventListener("click", onClick);
      root.addEventListener("change", onInput);
      root.addEventListener("input", function (e) { var f = e.target.getAttribute && e.target.getAttribute("data-sk-in"); if (f === "place" || f === "readers") W[f] = e.target.value; });
      render();
    },
    readerBar: readerBar,
    mountCard: function (el, h) {
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      cardEl = el;
      if (!el) return;
      el.addEventListener("click", onClick);
      renderCard();
    }
  };
})();

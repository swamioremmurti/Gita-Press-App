/* New home page: design prototype (local only). Uses real data where it is cheap:
   today's shloka from assets/data/v1/gita, the date, and the newest books from swadhyay-data.js. */
(function () {
  "use strict";
  var DEV = "०१२३४५६७८९";
  var DAYS = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  var MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* date */
  var now = new Date();
  var dateTxt = now.getDate() + " " + MONTHS[now.getMonth()] + " " + now.getFullYear();
  var hd = $("heroDate");
  if (hd) hd.querySelector("b").textContent = DAYS[now.getDay()] + ", " + dateTxt;
  if ($("pvDay")) { $("pvDay").textContent = DAYS[now.getDay()]; $("pvDate").textContent = dateTxt; }

  /* mobile menu */
  var burger = $("hdBurger"), nav = $("hdNav");
  if (burger) burger.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* shloka of the day: a fixed list of well-known verses, one per day, read from the Gita data files */
  var PICKS = [[2, "47"], [2, "20"], [4, "7"], [2, "14"], [3, "35"], [6, "5"], [9, "22"], [12, "13"], [18, "66"], [2, "38"], [4, "18"], [18, "78"], [2, "62"], [6, "35"]];
  var dayNo = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  var pick = PICKS[dayNo % PICKS.length];
  function dev(n) { return String(n).replace(/\d/g, function (d) { return DEV.charAt(+d); }); }
  fetch("/assets/data/v1/gita/ch" + (pick[0] < 10 ? "0" : "") + pick[0] + ".json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    var s = (d.shlokas || []).filter(function (x) { return x.v === pick[1]; })[0];
    if (!s) return;
    $("heroSh").innerHTML = (s.t || []).map(esc).join("<br>");
    $("heroSrc").textContent = "— श्रीमद्भगवद्गीता " + pick[0] + "." + pick[1];
    var m = String(s.m || "").replace(/\s+/g, " ").trim();
    if (m.length > 150) m = m.slice(0, 150).replace(/\s+\S*$/, "") + "…";
    $("heroMean").textContent = "अर्थ: " + m;
    $("heroRead").setAttribute("href", "/gita");
    heroText = (s.t || []).join("\n") + "\n— श्रीमद्भगवद्गीता " + pick[0] + "." + pick[1];
  }).catch(function () {});

  /* share / save (the shloka) */
  var heroText = "";
  var share = $("heroShare");
  if (share) share.addEventListener("click", function () {
    var txt = (heroText || $("heroSh").innerText + "\n" + $("heroSrc").innerText) + "\n";
    if (navigator.share) navigator.share({ title: "आज का श्लोक", text: txt }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { share.lastChild.textContent = "कॉपी हुआ"; });
  });
  var save = $("heroSave"), KEY = "home_v2_saved_" + pick.join("_");
  function paintSave(on) { save.classList.toggle("is-on", on); save.firstChild.textContent = on ? "★" : "☆"; }
  if (save) {
    try { paintSave(localStorage.getItem(KEY) === "1"); } catch (e) {}
    save.addEventListener("click", function () {
      var on = !save.classList.contains("is-on");
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
      paintSave(on);
    });
  }

  /* नवीन सामग्री: the three newest catalogue entries */
  var list = $("newList");
  if (list && window.SWADHYAY_BOOKS_RAW) {
    var TAG = { "Stotra evam Naamavali": ["स्तोत्र", "stotra"], "Upanishad": ["उपनिषद्", "upanishad"], "Vedant": ["वेदान्त", "vedant"], "Ved": ["वेद", "vedas"] };
    list.innerHTML = window.SWADHYAY_BOOKS_RAW.slice(-3).reverse().map(function (b) {
      var t = TAG[b.category] || ["ग्रंथ", "all"];
      var slug = b.file.replace(/\.html$/, "");
      return '<li><a href="/library?q=' + encodeURIComponent(slug) + '"><img src="assets/cat/' + t[1] + '.webp" alt=""><span>' + esc(slug) + '</span><em>' + t[0] + '</em></a></li>';
    }).join("");
  }

  var form = $("newsForm");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); form.querySelector("button").textContent = "प्रारूप में सक्रिय नहीं"; });
})();

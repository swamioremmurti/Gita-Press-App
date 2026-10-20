/* Kalyan — app shell logic. Vanilla JS, hash-router, localStorage-backed. */
(function () {
  "use strict";

  /* Book files come from the site itself, or from a CDN folder when swadhyay-config.js names one. */
  var CDN_BOOKS = (typeof window !== "undefined" && window.SWADHYAY_CDN && window.SWADHYAY_CDN.books) || "";
  if (CDN_BOOKS && CDN_BOOKS.slice(-1) !== "/") CDN_BOOKS += "/";
  var BOOKS_DIR = CDN_BOOKS || "Gita Press Books/Gita Press Books/";

  var CATEGORY_META = [
    { key: "all", hi: "सभी", en: "All", icon: "ॐ" },
    { key: "Vedas", hi: "वेद", en: "Vedas", icon: "ॐ" },
    { key: "Upanishad", hi: "उपनिषद्", en: "Upanishads", icon: "📖" },
    { key: "Vedant", hi: "वेदान्त", en: "Vedanta", icon: "🧘" },
    { key: "Gita", hi: "गीता", en: "Gita", icon: "📗" },
    { key: "Purans", hi: "पुराण", en: "Puranas", icon: "🏛️" },
    { key: "Upa Puran", hi: "उपपुराण", en: "Upapuranas", icon: "⛩️" },
    { key: "Itihasas", hi: "इतिहास", en: "Itihasa (Epics)", icon: "📚" },
    { key: "Stotra evam Naamavali", hi: "स्तोत्र एवं नामावली", en: "Stotras & Namavali", icon: "🙏" },
    { key: "Bajans", hi: "भजन", en: "Bhajans", icon: "🎵" },
    { key: "Pravachan", hi: "प्रवचन", en: "Discourses", icon: "🎤" },
    { key: "Siksha evam Katha", hi: "शिक्षा एवं कथा", en: "Teachings & Stories", icon: "💡" },
    { key: "Balaupayogi", hi: "बालोपयोगी", en: "For Children", icon: "🧒" },
    { key: "Nitya Puja evam Karmakand", hi: "नित्य पुजा एवं कर्मकाण्ड", en: "Daily Worship & Rituals", icon: "🔔" },
    { key: "Swami Sharnanand Sahitya", hi: "स्वामी शरणानन्द जी महाराज साहित्य", en: "Swami Sharnanand Ji Maharaj Literature", icon: "🕉️" },
    { key: "Teerth Sthal", hi: "तीर्थ स्थल", en: "Pilgrimage Places", icon: "🛕" }
  ];
  var CATEGORY_BY_KEY = {};
  CATEGORY_META.forEach(function (c) { CATEGORY_BY_KEY[c.key] = c; });

  var PALETTE = [
    ["#a51512", "#7a0f0d"], ["#c45911", "#8f3d0a"], ["#1066b1", "#0a4a82"],
    ["#7a4b1f", "#4f3013"], ["#9c1f5c", "#6c1540"], ["#2f6b3a", "#1f4a27"],
    ["#6a3fa0", "#472a6d"], ["#b8860b", "#7d5c07"]
  ];

  /* ==================== पंचांग (approximate astronomical panchang) ====================
     Low-precision Sun/Moon position formulas (abbreviated Meeus algorithms, accurate to a
     fraction of a degree -- ample for tithi/nakshatra/yoga/karan display purposes) plus the
     classic NOAA/Almanac sunrise-sunset equation. This is an approximation, not a substitute
     for a published, ephemeris-verified panchang. */
  var PANCHANG_CITIES = [
    { key: "delhi", hi: "दिल्ली", lat: 28.6139, lon: 77.2090, tz: 5.5 },
    { key: "mumbai", hi: "मुंबई", lat: 19.0760, lon: 72.8777, tz: 5.5 },
    { key: "varanasi", hi: "वाराणसी", lat: 25.3176, lon: 82.9739, tz: 5.5 },
    { key: "chennai", hi: "चेन्नई", lat: 13.0827, lon: 80.2707, tz: 5.5 },
    { key: "kolkata", hi: "कोलकाता", lat: 22.5726, lon: 88.3639, tz: 5.5 },
    { key: "bengaluru", hi: "बैंगलोर", lat: 12.9716, lon: 77.5946, tz: 5.5 }
  ];
  var TITHI_NAMES = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"];
  var NAKSHATRA_NAMES = ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी", "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्वाभाद्रपद", "उत्तराभाद्रपद", "रेवती"];
  var YOGA_NAMES = ["विष्कुम्भ", "प्रीति", "आयुष्मान्", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा", "धृति", "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र", "सिद्धि", "व्यतीपात", "वरीयान्", "परिघ", "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल", "ब्रह्म", "ऐन्द्र", "वैधृति"];
  var KARAN_MOVABLE = ["बव", "बालव", "कौलव", "तैतिल", "गरज", "वणिज", "विष्टि"];
  var KARAN_FIXED = ["शकुनि", "चतुष्पाद", "नाग", "किंस्तुघ्न"];
  var WEEKDAY_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  var RAHU_PART = [8, 2, 7, 5, 6, 4, 3]; // segment (1-8, sunrise->sunset split in 8) by getDay()
  var YAMAGANDA_PART = [5, 4, 3, 2, 1, 7, 6];
  var GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];

  function normDeg(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function sinDeg(d) { return Math.sin(d * Math.PI / 180); }
  function cosDeg(d) { return Math.cos(d * Math.PI / 180); }
  function tanDeg(d) { return Math.tan(d * Math.PI / 180); }
  function asinDeg(x) { return Math.asin(x) * 180 / Math.PI; }
  function acosDeg(x) { return Math.acos(Math.max(-1, Math.min(1, x))) * 180 / Math.PI; }
  function atanDeg(x) { return Math.atan(x) * 180 / Math.PI; }

  function toJulianDay(y, m, d, hourUTC) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + hourUTC / 24 + B - 1524.5;
  }

  // Sun's apparent ecliptic longitude (low-precision, Meeus ch.25), degrees.
  function sunLongitudeAt(T) {
    var L0 = normDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M = normDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinDeg(M) +
      (0.019993 - 0.000101 * T) * sinDeg(2 * M) + 0.000289 * sinDeg(3 * M);
    return { longitude: normDeg(L0 + C), meanAnomaly: M };
  }

  // Moon's apparent ecliptic longitude (abbreviated ELP2000 / Meeus ch.47 leading terms), degrees.
  function moonLongitudeAt(T, sunM) {
    var Lp = normDeg(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841);
    var D = normDeg(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868);
    var Mm = normDeg(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699);
    var F = normDeg(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000);
    var corr = 6.289 * sinDeg(Mm) + 1.274 * sinDeg(2 * D - Mm) + 0.658 * sinDeg(2 * D) +
      0.214 * sinDeg(2 * Mm) - 0.186 * sinDeg(sunM) - 0.114 * sinDeg(2 * F);
    return normDeg(Lp + corr);
  }

  function lahiriAyanamsa(dateUTC) {
    var years = (dateUTC.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
    return 23.853 + years * 0.013970;
  }

  function dayOfYearUTC(y, m, d) {
    return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
  }

  // Classic Almanac sunrise/sunset equation -> local decimal hours, or null (polar day/night).
  function sunEventLocalHour(y, m, d, lat, lon, tz, isRise) {
    var N = dayOfYearUTC(y, m, d);
    var lngHour = lon / 15;
    var t = N + ((isRise ? 6 : 18) - lngHour) / 24;
    var M = 0.9856 * t - 3.289;
    var L = normDeg(M + 1.916 * sinDeg(M) + 0.020 * sinDeg(2 * M) + 282.634);
    var RA = normDeg(atanDeg(0.91764 * tanDeg(L)));
    RA += (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90);
    RA /= 15;
    var sinDec = 0.39782 * sinDeg(L);
    var cosDec = Math.cos(Math.asin(sinDec));
    var cosH = (cosDeg(90.833) - sinDec * sinDeg(lat)) / (cosDec * cosDeg(lat));
    if (cosH > 1 || cosH < -1) return null;
    var H = (isRise ? 360 - acosDeg(cosH) : acosDeg(cosH)) / 15;
    var Tt = H + RA - 0.06571 * t - 6.622;
    var UT = ((Tt - lngHour) % 24 + 24) % 24;
    return (UT + tz + 24) % 24;
  }

  function fmtHourMin(h) {
    if (h == null) return "—";
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { mm = 0; hh += 1; }
    hh = ((hh % 24) + 24) % 24;
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }
  function addHours(h, delta) { return ((h + delta) % 24 + 24) % 24; }

  /* The lunar month (चैत्र ... फाल्गुन), named the northern way -- purnimanta, the month ends at the full moon, so the
     कृष्ण पक्ष belongs to the NEXT amanta month. The amanta month is named after the Sun's sidereal sign at the new moon that
     begins it (Meena -> चैत्र, Mesha -> वैशाख ...); a month in which the Sun changes no sign is the extra, अधिक मास. */
  var HINDU_MONTHS = ["चैत्र", "वैशाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "आश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन"];
  function elongationAt(JD) {
    var T = (JD - 2451545.0) / 36525, s = sunLongitudeAt(T);
    return normDeg(moonLongitudeAt(T, s.meanAnomaly) - s.longitude);
  }
  function newMoonNear(jd) {
    for (var i = 0; i < 12; i++) {
      var e = elongationAt(jd);
      if (e > 180) e -= 360;
      jd -= e / 12.19;
      if (Math.abs(e) < 0.001) break;
    }
    return jd;
  }
  function sunRashiAt(JD) {
    var T = (JD - 2451545.0) / 36525;
    var ay = lahiriAyanamsa(new Date((JD - 2440587.5) * 86400000));
    return Math.floor(normDeg(sunLongitudeAt(T).longitude - ay) / 30);
  }
  function lunarMonthAt(JD, elongation) {
    var prevNM = newMoonNear(JD - elongation / 12.19);
    var nextNM = newMoonNear(prevNM + 29.53);
    var r1 = sunRashiAt(prevNM);
    return { amanta: (r1 + 1) % 12, adhika: r1 === sunRashiAt(nextNM) };
  }

  /* Local hour (can pass 24) at which the Moon rises on that date, or null. The Moon is taken on the ecliptic (its latitude,
     up to 5 degrees, is ignored): good to about 20 minutes, which is all the tithi at moonrise needs. */
  function moonriseLocalHour(y, m, d, lat, lon, tz) {
    var jd = toJulianDay(y, m, d, 20 - tz), eps = 23.4393, rate = 360.98564736629;
    for (var i = 0; i < 6; i++) {
      var T = (jd - 2451545.0) / 36525, lam = moonLongitudeAt(T, sunLongitudeAt(T).meanAnomaly);
      var sinDec = sinDeg(eps) * sinDeg(lam), cosDec = Math.sqrt(1 - sinDec * sinDec);
      var ra = normDeg(Math.atan2(cosDeg(eps) * sinDeg(lam), cosDeg(lam)) * 180 / Math.PI);
      var cosH = (sinDeg(0.125) - sinDeg(lat) * sinDec) / (cosDeg(lat) * cosDec);
      if (cosH > 1 || cosH < -1) return null;
      var diff = normDeg(ra - acosDeg(cosH) - (280.46061837 + rate * (jd - 2451545.0) + lon));
      if (diff > 180) diff -= 360;
      jd += diff / rate;
    }
    return (jd - toJulianDay(y, m, d, 0)) * 24 + tz;
  }

  /* paksha, tithi and month at another hour of the same day (local time) -- for vrats observed in the evening or at midnight */
  function lunarStateAt(y, m, d, hourLocal, tz) {
    var jd = toJulianDay(y, m, d, hourLocal - tz), T = (jd - 2451545.0) / 36525, sun = sunLongitudeAt(T);
    var ang = normDeg(moonLongitudeAt(T, sun.meanAnomaly) - sun.longitude), idx = Math.floor(ang / 12);
    var pk = idx < 15 ? "शुक्ल" : "कृष्ण", lm = lunarMonthAt(jd, ang);
    return { paksha: pk, tithiNum: (idx % 15) + 1, adhika: lm.adhika, maas: lm.adhika ? "अधिक" : HINDU_MONTHS[pk === "शुक्ल" ? lm.amanta : (lm.amanta + 1) % 12] };
  }

  function getPanchang(date, city) {
    city = city || PANCHANG_CITIES[0];
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    // Noon local time, converted to UT, as the reference instant for tithi/nakshatra/yoga.
    var hourUTC = 12 - city.tz;
    var JD = toJulianDay(y, m, d, hourUTC);
    var T = (JD - 2451545.0) / 36525;
    var sun = sunLongitudeAt(T);
    var moonLong = moonLongitudeAt(T, sun.meanAnomaly);

    var tithiAngle = normDeg(moonLong - sun.longitude);
    var tithiIdx = Math.floor(tithiAngle / 12); // 0..29
    var paksha = tithiIdx < 15 ? "शुक्ल" : "कृष्ण";
    var tithiInPaksha = (tithiIdx % 15) + 1;
    var tithiName = tithiInPaksha === 15 ? (paksha === "शुक्ल" ? "पूर्णिमा" : "अमावस्या") : TITHI_NAMES[tithiInPaksha - 1];
    var lm = lunarMonthAt(JD, tithiAngle);
    var maas = lm.adhika ? "अधिक" : HINDU_MONTHS[paksha === "शुक्ल" ? lm.amanta : (lm.amanta + 1) % 12];

    var ayanamsa = lahiriAyanamsa(new Date(Date.UTC(y, m - 1, d, hourUTC)));
    var siderealMoon = normDeg(moonLong - ayanamsa);
    var siderealSun = normDeg(sun.longitude - ayanamsa);
    var nakshatraIdx = Math.floor(siderealMoon / (360 / 27));
    var nakshatraPada = Math.floor((siderealMoon % (360 / 27)) / ((360 / 27) / 4)) + 1;

    var yogaAngle = normDeg(siderealSun + siderealMoon);
    var yogaIdx = Math.floor(yogaAngle / (360 / 27));

    var karanIdx = Math.floor(tithiAngle / 6); // 0..59
    var karanName = karanIdx === 0 ? KARAN_FIXED[3] :
      karanIdx <= 56 ? KARAN_MOVABLE[(karanIdx - 1) % 7] :
      KARAN_FIXED[karanIdx - 57];

    var sunriseH = sunEventLocalHour(y, m, d, city.lat, city.lon, city.tz, true);
    var sunsetH = sunEventLocalHour(y, m, d, city.lat, city.lon, city.tz, false);
    var dayLen = (sunriseH != null && sunsetH != null) ? (sunsetH - sunriseH + 24) % 24 : 12;
    if (sunriseH == null) sunriseH = 6;
    if (sunsetH == null) sunsetH = 18;
    var segment = dayLen / 8;
    var weekday = date.getDay();
    var rahuStart = addHours(sunriseH, (RAHU_PART[weekday] - 1) * segment);
    var yamaStart = addHours(sunriseH, (YAMAGANDA_PART[weekday] - 1) * segment);
    var gulikaStart = addHours(sunriseH, (GULIKA_PART[weekday] - 1) * segment);
    var solarNoon = addHours(sunriseH, dayLen / 2);
    var muhurta = dayLen / 15;

    return {
      date: date, city: city,
      weekdayHi: WEEKDAY_HI[weekday],
      paksha: paksha, tithiName: tithiName, paksha: paksha, tithiNum: tithiInPaksha, maas: maas, adhika: lm.adhika,
      nakshatraName: NAKSHATRA_NAMES[nakshatraIdx % 27], nakshatraPada: nakshatraPada,
      yogaName: YOGA_NAMES[yogaIdx % 27],
      karanName: karanName,
      sunrise: fmtHourMin(sunriseH), sunset: fmtHourMin(sunsetH),
      rahukal: { start: fmtHourMin(rahuStart), end: fmtHourMin(addHours(rahuStart, segment)) },
      yamaganda: { start: fmtHourMin(yamaStart), end: fmtHourMin(addHours(yamaStart, segment)) },
      gulikakal: { start: fmtHourMin(gulikaStart), end: fmtHourMin(addHours(gulikaStart, segment)) },
      abhijit: { start: fmtHourMin(addHours(solarNoon, -muhurta / 2)), end: fmtHourMin(addHours(solarNoon, muhurta / 2)) }
    };
  }

  function getPanchangCity() {
    var key = localStorage.getItem(LS.panchangCity);
    for (var i = 0; i < PANCHANG_CITIES.length; i++) if (PANCHANG_CITIES[i].key === key) return PANCHANG_CITIES[i];
    return PANCHANG_CITIES[0];
  }
  function setPanchangCity(key) {
    localStorage.setItem(LS.panchangCity, key);
  }

  var HINDI_DATE_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];
  function formatHindiDate(date) {
    return date.getDate() + " " + HINDI_DATE_MONTHS[date.getMonth()] + " " + date.getFullYear();
  }

  /* SEO-friendly URL slugs: keeps Devanagari (best keyword match for Hindi search
     queries, since this is a Hindi-content site) plus ASCII alphanumerics and hyphens,
     collapsing whitespace/punctuation to a single hyphen. */
  function slugify(str) {
    var s = String(str || "").trim();
    s = s.replace(/\s+/g, "-");
    s = s.replace(/[^0-9A-Za-zऀ-ॿ-]/g, "");
    s = s.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
    return s || "x";
  }

  function titleFromFile(file) {
    var t = file.replace(/\.html$/i, "");
    if (t.indexOf("u_") === 0) t = t.slice(2);
    t = t.replace(/[_\s-]+(?=्)/g, "");                  // a halant (्) is never separated from its letter: "भगवान_् पर" -> "भगवान् पर"
    t = t.replace(/[_-]+/g, " ").trim();
    return t;
  }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  /* ---------------- Devanagari -> Roman search index ----------------
     So English/Roman-script queries ("krishna", "ramayan", "gita") match Devanagari titles.
     Not a display-quality transliteration -- just phonetic enough for substring search. */
  var DEVA_VOWELS = { "अ": "a", "आ": "aa", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri", "ॠ": "ri", "ऌ": "l", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au" };
  var DEVA_MATRAS = { "ा": "aa", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "ॄ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॅ": "e" };
  var DEVA_CONS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v", "ळ": "l",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y"
  };
  var DEVA_DIGITS = { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" };

  function devanagariToRoman(str) {
    var out = "", i = 0, n = str.length;
    while (i < n) {
      var c = str[i], next = str[i + 1];
      if (DEVA_CONS[c]) {
        if (next === "्") { out += DEVA_CONS[c]; i += 2; }
        else if (next && DEVA_MATRAS[next]) { out += DEVA_CONS[c] + DEVA_MATRAS[next]; i += 2; }
        else { out += DEVA_CONS[c] + "a"; i += 1; }
      } else if (DEVA_VOWELS[c]) { out += DEVA_VOWELS[c]; i += 1; }
      else if (c === "ं") { out += "n"; i += 1; }       // anusvara
      else if (c === "ः") { out += "h"; i += 1; }       // visarga
      else if (c === "ँ" || c === "ऽ" || c === "्") { i += 1; } // chandrabindu / avagraha / stray virama
      else if (DEVA_DIGITS[c]) { out += DEVA_DIGITS[c]; i += 1; }
      else if (c === "।" || c === "॥") { out += " "; i += 1; }       // danda / double danda
      else { out += c; i += 1; }
    }
    return out;
  }

  // Collapses consecutive identical letters (e.g. "raamaayana" -> "ramayana", "gitaa" -> "gita")
  // so both the generated transliteration and a casually-typed English query converge on the
  // same normalized form regardless of long/short-vowel spelling choices.
  function normalizeRoman(str) {
    // Non-alnum runs collapse to a single space (not removed outright) so word boundaries are
    // preserved -- otherwise adjacent words can accidentally fuse into a false substring match
    // (e.g. "...dashi" + "vrata..." losing their boundary would wrongly contain "shiv").
    return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/(.)\1+/g, "$1");
  }

  function bookHref(file) {
    return encodeURI(BOOKS_DIR + file);
  }

  function estMinutes(sizeKB) {
    return Math.max(12, Math.round(sizeKB / 3));
  }

  function formatDuration(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    if (h <= 0) return m + "m";
    return h + "h " + (m > 0 ? m + "m" : "");
  }

  var COVER_OVERRIDES = {
    "प्रेमयोग.html": "assets/covers/premyog.jpg",
    "श्रीमद्भगवद्गीता शांकरभाष्य.html": "assets/covers/gita-shankarbhashya.webp",
    "श्रीमद्भगवद्गीता श्रीरामानुज भाष्य.html": "assets/covers/gita-ramanujbhashya.webp",
    "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html": "assets/covers/gita-mahatmya-mote.webp",
    "श्रीमद्भगवद्गीता माहात्म्य की कहानियाँ.html": "assets/covers/gita-mahatmya-kahaniyan.webp",
    "श्रीमद्भगवद्गीता_साधक_संजीवनी.html": "assets/covers/sadhak-sanjeevani.webp",
    "पद-रत्नाकर.html": "assets/covers/pad-ratnakar.jpg",
    "भक्त-चरिताङ्क.html": "assets/covers/bhakt-charitank.jpg",
    "श्रीहनुमान-अङ्क.html": "assets/covers/hanuman-ank.jpg",
    "साधन सुधा निधि.html": "assets/covers/sadhan-sudha-nidhi.jpg",
    "साधन सुधा सिन्धु.html": "assets/covers/sadhan-sudha-sindhu.jpg",
    "अच्छे बनो.html": "assets/covers/achhe-bano.jpg",
    "अध्यात्म-पथ-प्रदर्शक.html": "assets/covers/adhyatma-path-pradarshak.webp",
    "अध्यात्मरामायण.html": "assets/covers/adhyatma-ramayan.jpg",
    "अध्यात्मविषयक पत्र.html": "assets/covers/adhyatma-vishayak-patra.webp",
    "अनन्य भक्तिसे भगवत्प्राप्ति.html": "assets/covers/ananya-bhakti-se-bhagwatprapti.jpg",
    "अनन्यभक्ति कैसे प्राप्त हो.html": "assets/covers/ananyabhakti-kaise-prapt-ho.jpg",
    "अनुराग पदावली.html": "assets/covers/anurag-padavali.jpg",
    "अन्त्यकर्म श्राद्धप्रकाश.html": "assets/covers/antyakarma-shraddhaprakash.jpg",
    "u_बृहदारण्यकोपनिषत्.html": "assets/covers/brihadaranyakopanishat.webp",
    "अमरता की ओर.html": "assets/covers/amarata-ki-or.jpg",
    "अमूल्य वचन.html": "assets/covers/amulya-vachan.jpg",
    "अपात्रको भी भगवत्प्राप्ति.html": "assets/covers/apatra-ko-bhi-bhagwatprapti.webp",
    "ऋग्वेद.html": "assets/covers/rigved.webp",
    "अमूल्य शिक्षा.html": "assets/covers/amulya-shiksha.jpg",
    "एकादशी व्रत का माहात्म्य.html": "assets/covers/ekadashi-vrat-mahatmya.webp",
    "गयाश्राद्धपद्धति_माहात्म्य तथा_गयायात्राविधानसहित.html": "assets/covers/gaya-shraddha-paddhati-mahatmya.webp",
    "गुरु और माता-पिता के भक्त बालक.html": "assets/covers/guru-aur-mata-pita-ke-bhakt-balak.webp",
    "बाल अमृत वचन.html": "assets/covers/baal-amrit-vachan.jpg",
    "बाल प्रश्नोत्तरी.html": "assets/covers/baal-prashnottari.jpg",
    "बालकों की बोलचाल.html": "assets/covers/balakon-ki-bolchaal.jpg",
    "संक्षिप्त शिवपुराण.html": "assets/covers/sankshipt-shivpuran.jpg",
    "संध्योपासनविधि और तर्पण एवं बलिवैश्वदेव विधि.html": "assets/covers/sandhyopasan-vidhi-tarpan-balivaishvadev-vidhi.jpg",
    "शिव-आराधना.html": "assets/covers/shiv-aradhana.webp",
    "यजुर्वेद.html": "assets/covers/yajurved.webp",
    "श्रीविष्णुपुराण.html": "assets/covers/shri-vishnu-puran.webp",
    "संक्षिप्त श्रीगणेशपुराण.html": "assets/covers/sankshipt-shri-ganesh-puran.webp",
    "श्रीगणेशसहस्रनामस्तोत्रम्.html": "assets/covers/shri-ganesh-sahasranama-stotram.webp",
    "शिव स्मरण.html": "assets/covers/shiv-smaran.webp",
    "शिवमहिम्नस्तोत्र.html": "assets/covers/shiv-mahimna-stotra.webp",
    "श्रीशिवचालीसा.html": "assets/covers/shri-shiv-chalisa.webp",
    "श्रीशिवसहस्रनामस्तोत्रम्.html": "assets/covers/shri-shiv-sahasranama-stotram.webp",
    "श्रीमद्देवीभागवतमहापुराण.html": "assets/covers/shrimad-devi-bhagwat-mahapuran.jpg",
    "संक्षिप्त स्कन्दपुराण.html": "assets/covers/sankshipt-skanda-puran.jpg",
    "संक्षिप्त श्रीवराहपुराण.html": "assets/covers/sankshipt-shri-varah-puran.jpg",
    "संक्षिप्त मार्कण्डेयपुराण.html": "assets/covers/sankshipt-markandeya-puran.jpg",
    "संक्षिप्त ब्रह्मवैवर्तपुराण.html": "assets/covers/sankshipt-brahmavaivart-puran.jpg",
    "संक्षिप्त ब्रह्मपुराण.html": "assets/covers/sankshipt-brahma-puran.jpg",
    "संक्षिप्त पद्मपुराण.html": "assets/covers/sankshipt-padma-puran.jpg",
    "संक्षिप्त नारदपुराण.html": "assets/covers/sankshipt-narad-puran.jpg",
    "संक्षिप्त गरुडपुराण.html": "assets/covers/sankshipt-garud-puran.jpg",
    "श्रीहरिवंशपुराण.html": "assets/covers/shri-harivansh-puran.jpg",
    "श्रीवामनपुराण.html": "assets/covers/shri-vaman-puran.jpg",
    "श्रीमद‍्भागवतमहापुराण.html": "assets/covers/shrimad-bhagwat-mahapuran.jpg",
    "मत्स्यमहापुराण.html": "assets/covers/matsya-mahapuran.jpg",
    "श्रीनरसिंहपुराण.html": "assets/covers/shri-narasimha-puran.jpg",
    "श्रीलिङ्ग-महापुराण (केवल हिन्दी).html": "assets/covers/shri-linga-mahapuran.webp",
    "दत्तात्रेय वज्र कवच.html": "assets/covers/dattatreya-vajra-kavach.jpg",
    "सामवेद.html": "assets/covers/samved.jpg",
    "अथर्ववेद.html": "assets/covers/atharvaved.jpg",
    "एक लोटा पानी.html": "assets/covers/ek-lota-pani.jpg",
    "गिता चिंतन.html": "assets/covers/gita-chintan.jpg",
    "देवीस्तोत्ररत्नाकर.html": "assets/covers/devi-stotra-ratnakar.jpg",
    "संक्षिप्त योगवासिष्ठ.html": "assets/covers/sankshipt-yogvasishtha.jpg",
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html": "assets/covers/tattva-vivechani.webp",
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html": "assets/covers/tattva-vivechani.webp",
    "ईशावास्योपनिषद्.html": "assets/covers/ishavasyopanishad.jpg",
    "केनोपनिषद्.html": "assets/covers/kenopanishad.jpg",
    "कठोपनिषद्.html": "assets/covers/kathopanishad.jpg",
    "प्रश्नोपनिषद्.html": "assets/covers/prashnopanishad.jpg",
    "मुण्डकोपनिषद्.html": "assets/covers/mundakopanishad.jpg",
    "माण्डूक्योपनिषद्.html": "assets/covers/mandukyopanishad.jpg",
    "ऐतरेयोपनिषद्.html": "assets/covers/aitareyopanishad.jpg",
    "तैत्तिरीयोपनिषद्.html": "assets/covers/taittiriyopanishad.jpg",
    "श्वेताश्वतरोपनिषद्.html": "assets/covers/shvetashvataropanishad.jpg",
    "ईस्वर अंस जीव अबिनासी.html": "assets/covers/ishwar-ansh-jeev-abinasi.webp",
    "मेरे नाथ! मेरे प्रभो.html": "assets/covers/mere-nath-mere-prabho.webp",
    "अयोध्या-माहात्म्य.html": "assets/covers/ayodhya-mahatmya.jpg",
    "शिव स्तोत्र रत्नाकर.html": "assets/covers/shiv-stotra-ratnakar.jpg",
    "जीवन्मुक्तिके रहस्य.html": "assets/covers/jivanmukti-ke-rahasya.webp",
    "यह कलियुग है!.html": "assets/covers/yah-kaliyug-hai.webp",
    "मानस-मुक्ता.html": "assets/covers/manas-mukta.webp",
    "श्रीहनुमानचालीसा.html": "assets/covers/shri-hanuman-chalisa.webp"
  };

  // Books whose text credits a publisher other than Gita Press (Manav Seva Sangh,
  // Gita Prakashan, Tirumala Tirupati Devasthanam, etc.) — affiliate buy buttons are
  // hidden for these since Gita Press does not sell them.
  var NON_GITA_PRESS_BOOKS = {
    "भक्त नंदनार.html": true,
    "प्रेमयोग.html": true,
    "श्रीकृष्ण चैतन्य.html": true,
    "स्वामी विवेकानन्द संक्षिप्त जीवनी तथा उपदेश.html": true,
    "भक्तियोग.html": true,
    "राजयोग.html": true,
    "मानस-मुक्ता.html": true,
    "यह कलियुग है!.html": true,
    "जीवन्मुक्तिके रहस्य.html": true,
    "मेरे नाथ! मेरे प्रभो.html": true,
    "ईस्वर अंस जीव अबिनासी.html": true,
    "चित शुधि भाग - 1.html": true,
    "चित शुधि भाग - 2.html": true,
    "जीवन पथ.html": true,
    "जीवन-दर्शन भाग 1.html": true,
    "जीवन-दर्शन भाग 2.html": true,
    "तिरुपति-यात्रा.html": true,
    "दर्शन और नीति.html": true,
    "दुःख का प्रभाव.html": true,
    "पथ प्रदीप.html": true,
    "पाथेय - 1.html": true,
    "पाथेय - 2.html": true,
    "प्रबोधनी.html": true,
    "प्रश्नोत्तरी संतवाणी - 1.html": true,
    "प्रश्नोत्तरी संतवाणी - 2.html": true,
    "प्रार्थना तथा पद.html": true,
    "प्रेरणा पथ.html": true,
    "मंगलमय विधान.html": true,
    "मानव की मांग.html": true,
    "मानव सेवा संघ परिचय.html": true,
    "मानवता के मूल सिधान्त.html": true,
    "मानव–दर्शन.html": true,
    "मूक-सत्संग तया नित्य-योग.html": true,
    "मैं की खोज.html": true,
    "रजत जयन्ती स्मारिका.html": true,
    "सत्संग और साधन.html": true,
    "सन्त उद्बोधन.html": true,
    "क्रान्तिकारी सन्तवाणी.html": true,
    "सन्त पत्रावली - 1.html": true,
    "सन्त पत्रावली - 2.html": true,
    "सन्त पत्रावली - 3.html": true,
    "सन्त वाणी भाग -1.html": true,
    "सन्त वाणी भाग -2.html": true,
    "सन्त वाणी भाग -3.html": true,
    "सन्त वाणी भाग -4.html": true,
    "सन्त वाणी भाग -5B.html": true,
    "सन्त वाणी भाग -6.html": true,
    "सन्त वाणी भाग -7.html": true,
    "सन्त वाणी भाग -8.html": true,
    "सन्त वाणी भाग- 5A.html": true,
    "सन्त समागम भाग - 1.html": true,
    "सन्त समागम भाग - 2.html": true,
    "सन्त समागम भाग - 3.html": true,
    "सन्त सौरभ (सन्त वाणी ).html": true,
    "सन्त हृदयोद्गार.html": true,
    "सन्त-जीवन-दर्पण.html": true,
    "साधन-तत्त्व.html": true,
    "साधन-त्रिवेणी.html": true,
    "साधन-निधि.html": true,
  
  };

  // Display-only title overrides — shown in the app, never alters the underlying book file.
  var TITLE_OVERRIDES = {
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html": "श्रीमद्भगवद्गीता तत्त्वविवेचनी",
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी पदच्छेद_अन्वयसहित.html": "श्रीमद्भगवद्गीता तत्त्वविवेचनी (पदच्छेद-अन्वयसहित)",
    "श्रीलिङ्ग-महापुराण (केवल हिन्दी).html": "श्रीलिङ्ग महापुराण",
    "महाभारत (आदिपर्व से स्वर्गारोहणपर्व).html": "महाभारत",
    "भगवान_् पर विश्वास.html": "भगवान् पर विश्वास",
    "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html": "श्रीमद्भगवद्गीता-माहात्म्यसहित",     // same text as the "- माहात्म्यसहित" edition, in large print
  
  };

  /* The data file stores several people in one field separated by "; ". */
  function splitPeople(s) {
    return String(s || "").split(";").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* Books that stay in the library folder and in swadhyay-data.js but are switched off on the site: not listed,
     searched, linked, or put in the sitemap. Remove the line to switch a book back on. */
  /* A book's address normally comes from its file name. These are the exceptions: the address a renamed book should have, and the
     earlier addresses that still lead to it (links shared before the change). */
  var SLUG_OVERRIDES = {
    "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html": "माहात्म्यसहित श्रीमद्भगवद्गीता"
  };
  var SLUG_ALIASES = {
    "श्रीमद्भगवद्गीतामोटेअक्षरोंमें": "श्रीमद्भगवद्गीता_मोटे_अक्षरोंमें.html"
  };
  var HIDDEN_BOOKS = {
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html": true,  // replaced by the पदच्छेद-अन्वयसहित
    "श्रीमद्भगवद्गीता - माहात्म्यसहित.html": true                    // same text as the large-print edition, which now carries this title edition
  };

  /* "TXT, Footnotes*" (the catalogue's arth_hide) -> paragraph selectors for the reader's "hide meaning" mode:
     "Name" = paragraphs with exactly that class, "Name*" = any class containing Name. */
  function arthSelectors(spec) {
    return String(spec || "").split(",").map(function (t) { return t.trim(); })
      .filter(function (t) { return /^[A-Za-z0-9_-]+\*?$/.test(t); })
      .map(function (t) {
        return t.slice(-1) === "*" ? 'p[class*="' + t.slice(0, -1) + '"]' : 'p[class~="' + t + '"]';
      });
  }

  var seenBookSlugs = {};
  var BOOKS = (window.SWADHYAY_BOOKS_RAW || []).map(function (b, i) {
    var arthSel = String(b.swith_arth || "").toLowerCase() === "yes" ? arthSelectors(b.arth_hide) : [];
    var cat = CATEGORY_BY_KEY[b.category] || { key: b.category, hi: b.category, en: b.category, icon: "📖" };
    var title = TITLE_OVERRIDES[b.file] || titleFromFile(b.file);
    var authors = splitPeople(b.author), tikakars = splitPeople(b.tikakar), translators = splitPeople(b.translator);
    var publisher = (b.publisher || "").trim();
    /* `author` is the single display line used on cards/search/blurb: whoever is credited
       first, falling back to the publisher when the book names nobody. */
    var author = authors.join(", ") || tikakars.join(", ") || translators.join(", ") || publisher || "गीता प्रेस, गोरखपुर";
    var everyone = authors.concat(tikakars, translators, publisher ? [publisher] : []).join(" ");
    var baseSlug = slugify(SLUG_OVERRIDES[b.file] || b.file.replace(/\.html$/i, ""));
    var slug = baseSlug, dupeN = 2;
    while (seenBookSlugs[slug]) { slug = baseSlug + "-" + dupeN; dupeN++; }
    seenBookSlugs[slug] = true;
    return {
      id: i,
      slug: slug,
      file: b.file,
      href: bookHref(b.file),
      title: title,
      titleRoman: normalizeRoman(devanagariToRoman(title)),
      author: author,
      authors: authors,
      tikakars: tikakars,
      translators: translators,
      publisher: publisher,
      people: everyone,
      authorRoman: normalizeRoman(devanagariToRoman(everyone)),
      category: b.category,
      categoryMeta: cat,
      /* Multi-category/tags/author-link support: these start as a one-item fallback built
         from the legacy single `category` field above, and get overwritten with the real
         (possibly multi-valued) data once applyBookMetaOverrides() resolves the server's
         /api/book-meta response at boot. Kept as arrays from the start (rather than being
         undefined until the fetch resolves) so every render path can safely assume they
         exist, including a render that happens before/without that fetch succeeding (e.g.
         the server isn't running) -- the app degrades to exactly today's single-category
         behavior in that case. */
      categoryKeys: [b.category],
      categoryMetas: [cat],
      tags: [],
      sizeKB: b.sizeKB || 10,
      minutes: estMinutes(b.sizeKB || 10),
      paletteIdx: hashCode(title) % PALETTE.length,
      initial: title.trim().charAt(0) || "ॐ",
      coverImage: COVER_OVERRIDES[b.file] || null,
      isGitaPress: !NON_GITA_PRESS_BOOKS[b.file],
      swithArth: arthSel.length > 0,    // reader gets a button to hide the meaning/commentary (only shloks stay)
      arthHideSel: arthSel
    };
  }).filter(function (b) { return !HIDDEN_BOOKS[b.file]; });   // ids were fixed by the map above, so hiding a book never renumbers the rest
  var BOOKS_BY_ID = {};
  var BOOKS_BY_FILE = {};
  var BOOKS_BY_SLUG = {};
  BOOKS.forEach(function (b) { BOOKS_BY_ID[b.id] = b; BOOKS_BY_FILE[b.file] = b; BOOKS_BY_SLUG[b.slug] = b; });

  function findByFile(file) {
    return BOOKS_BY_FILE[file] || null;
  }

  /* ---------------- people: built straight from the four book fields ----------------
     Everyone named as author / tikakar / translator / publisher, with the books they
     appear in under each role. The authors page and author pages render from this, so
     there is no server round trip. */
  var PERSON_ROLES = [
    { key: "authors", label: "लेखक", en: "Author" },
    { key: "tikakars", label: "टीकाकार", en: "Commentator" },
    { key: "translators", label: "अनुवादक", en: "Translator" },
    { key: "publishers", label: "प्रकाशक", en: "Publisher" }
  ];
  function roleLabel(role, plural) {
    return tx(role.label, plural ? role.en + "s" : role.en);
  }
  function booksWord(n) { return getTaxLang() === "en" ? (n === 1 ? "book" : "books") : "ग्रंथ"; }
  var PEOPLE = [];
  var PEOPLE_BY_NAME = {};
  var PEOPLE_BY_SLUG = {};
  (function buildPeople() {
    function person(name) {
      if (PEOPLE_BY_NAME[name]) return PEOPLE_BY_NAME[name];
      var base = slugify(name), slug = base, n = 2;
      while (PEOPLE_BY_SLUG[slug]) { slug = base + "-" + n; n++; }
      var p = { name: name, slug: slug, roles: { authors: [], tikakars: [], translators: [], publishers: [] } };
      PEOPLE_BY_NAME[name] = p; PEOPLE_BY_SLUG[slug] = p; PEOPLE.push(p);
      return p;
    }
    BOOKS.forEach(function (book) {
      book.authors.forEach(function (n) { person(n).roles.authors.push(book); });
      book.tikakars.forEach(function (n) { person(n).roles.tikakars.push(book); });
      book.translators.forEach(function (n) { person(n).roles.translators.push(book); });
      if (book.publisher) person(book.publisher).roles.publishers.push(book);
    });
  })();
  function personPath(name) {
    var p = PEOPLE_BY_NAME[name];
    return "/author/" + encodeURIComponent(p ? p.slug : slugify(name));
  }
  function personLink(name) {
    return '<a href="' + personPath(name) + '">' + esc(name) + '</a>';
  }

  /* Resolves a /book/:x or /read/:x URL segment to a book: tries the SEO slug first,
     then falls back to a bare numeric id so old #/book/12-style links (bookmarked or
     shared before this app switched to slugs) keep working. */
  function resolveBookParam(x) {
    if (x === undefined || x === null) return null;
    var decoded;
    try { decoded = decodeURIComponent(x); } catch (e) { decoded = x; }
    return BOOKS_BY_SLUG[decoded] || (SLUG_ALIASES[decoded] && BOOKS_BY_FILE[SLUG_ALIASES[decoded]]) || BOOKS_BY_ID[parseInt(x, 10)] || null;
  }
  function bookPath(book) { return "/book/" + encodeURIComponent(book.slug); }
  function readPath(book, chapterIdx) {
    return "/read/" + encodeURIComponent(book.slug) + (chapterIdx !== undefined && chapterIdx !== null ? "/" + chapterIdx : "");
  }

  /** Overlay the server's per-book categories/tags onto BOOKS in place. (Author, tikakar,
   *  translator and publisher now come from the book data itself, not from the server.) */
  function applyBookMetaOverrides(metaMap) {
    Object.keys(metaMap || {}).forEach(function (file) {
      var book = BOOKS_BY_FILE[file];
      if (!book) return;
      var m = metaMap[file];
      if (m.categories && m.categories.length) {
        book.categoryKeys = m.categories.map(function (c) { return c.key; });
        /* Labels come from CATEGORY_META (it carries the Hindi and proper English names);
           the server's rows are only a fallback for categories the app doesn't know yet. */
        book.categoryMetas = m.categories.map(function (c) { return CATEGORY_BY_KEY[c.key] || c; });
        book.category = book.categoryKeys[0];
        book.categoryMeta = book.categoryMetas[0];
      }
      book.tags = (m.tags || []).map(function (t) { return t.label; });
    });
  }

  /* ---------------- affiliate links ----------------
     No per-book product mapping exists yet, so these build a search-results link on each
     store from the book title. Replace AMAZON_AFFILIATE_TAG with a real Amazon Associates
     tracking id, and swap in exact product URLs per book once that mapping exists. */
  var AMAZON_AFFILIATE_TAG = "swadhyay0d-21";
  function amazonBuyUrl(book) {
    var q = encodeURIComponent(book.title + " Gita Press Gorakhpur");
    return "https://www.amazon.in/s?k=" + q + "&tag=" + encodeURIComponent(AMAZON_AFFILIATE_TAG);
  }
  function gitaPressBuyUrl(book) {
    return "https://www.gitapress.org/result?search=" + encodeURIComponent(book.title) + "&category=";
  }

  /* ---------------- localStorage state ---------------- */
  var LS = {
    fav: "swadhyay_favorites_v1",
    reads: "swadhyay_myreads_v1",
    theme: "swadhyay_theme_v1",
    seeded: "swadhyay_seeded_v1",
    comments: "swadhyay_comments_v1",
    currentUser: "swadhyay_current_user_v1",
    readerTheme: "swadhyay_reader_theme_v1",
    readerFont: "swadhyay_reader_font_v1",
    readerLineHeight: "swadhyay_reader_line_height_v1",
    readerArth: "swadhyay_reader_arth_v1",
    bookmarks: "swadhyay_bookmarks_v1",
    highlights: "swadhyay_highlights_v1",
    readerLayout: "swadhyay_reader_layout_v1",
    panchangCity: "swadhyay_panchang_city_v1",
    feedback: "swadhyay_feedback_v1",
    taxLang: "swadhyay_taxonomy_lang_v1"
  };

  /* Taxonomy language: category names, library filters and author-role labels can be shown
     in Hindi (default) or English. Book titles, author names and content stay as they are. */
  function getTaxLang() {
    // English unless the visitor has explicitly chosen Hindi.
    try { return localStorage.getItem(LS.taxLang) === "hi" ? "hi" : "en"; } catch (e) { return "en"; }
  }
  function setTaxLang(lang) {
    lang = lang === "hi" ? "hi" : "en";
    try { localStorage.setItem(LS.taxLang, lang); } catch (e) {}
    document.documentElement.setAttribute("lang-mode", lang);
    document.querySelectorAll("#sideLangSwitch [data-l]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-l") === lang);
    });
    applyShellLanguage();
  }

  /* The side menu, bottom bar and top-bar buttons are static markup in index.html (Hindi),
     so they are relabelled here whenever the language changes. */
  var SHELL_LABELS = {
    home: ["होम", "Home"], granth: ["ग्रंथ", "Granth"], library: ["ग्रंथालय", "Granthalay"], favorites: ["पसंदीदा", "Favorites"],
    myreads: ["अध्ययन", "My Reading"], authors: ["लेखक", "Lekhak"], chat: ["प्रश्नोत्तर", "Q & A"],
    panchang: ["पंचांग", "Panchang"], admin: ["एडमिन पैनल", "Admin Panel"], settings: ["सेटिंग्स", "Settings"],
    help: ["सहायता", "Help"], feedback: ["विषय सुधार", "Feedback"],
    gita: ["गीता LMS", "Gita LMS"], sankalp: ["पाठ-संकल्प", "Path Sankalp"], vrat: ["व्रत एवं पर्व", "Vrats & Festivals"],
    prashnavali: ["प्रश्नावली", "Prashnavali"], shalaka: ["राम शलाका", "Ram Shalaka"], hanuman: ["हनुमान प्रश्नावली", "Hanuman Prashnavali"]
  };
  var SHELL_TITLES = [
    ["#appDrawerBtn", "मेनू", "Menu"], [".global-search-btn", "खोजें", "Search"], [".theme-switch", "डार्क मोड", "Dark mode"],
    [".logo-link", "होम", "Home"], ["#notifyBtn", "सूचनाएँ", "Notifications"], ["#profileBtn", "प्रोफ़ाइल", "Profile"]
  ];
  function applyShellLanguage() {
    document.querySelectorAll("[data-nav], [data-label-key]").forEach(function (el) {
      var pair = SHELL_LABELS[el.getAttribute("data-nav") || el.getAttribute("data-label-key")];
      var label = el.querySelector("span:not(.ic)");
      if (pair && label) label.textContent = tx(pair[0], pair[1]);
    });
    SHELL_TITLES.forEach(function (t) {
      document.querySelectorAll(t[0]).forEach(function (el) {
        var text = tx(t[1], t[2]);
        el.setAttribute("title", text);
        if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", text);
      });
    });
  }
  function tx(hi, en) { return getTaxLang() === "en" && en ? en : hi; }

  function readJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getFavorites() { return readJSON(LS.fav, []); }
  function setFavorites(arr) { writeJSON(LS.fav, arr); }
  function isFavorite(id) { return getFavorites().indexOf(id) !== -1; }
  function toggleFavorite(id) {
    var arr = getFavorites();
    var idx = arr.indexOf(id);
    if (idx === -1) arr.unshift(id); else arr.splice(idx, 1);
    setFavorites(arr);
    return arr.indexOf(id) !== -1;
  }

  /* ---------------- server API helpers ----------------
     Thin fetch() wrappers for the Node API in server/server.js (auth, admin, comments,
     progress sync). All same-origin, JSON in/out. A non-2xx response rejects with the
     server's {error} message when present. Every call site that matters for the static
     (no-server) experience wraps these in try/catch so the app keeps working -- just
     without login/sync/admin -- if the API isn't reachable (e.g. opened via the plain
     static file server instead of server/server.js). */
  function apiCall(method, path, body) {
    var opts = { method: method, credentials: "same-origin", headers: {} };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        return data;
      });
    });
  }
  function apiGet(path) { return apiCall("GET", path); }
  function apiPost(path, body) { return apiCall("POST", path, body || {}); }
  function apiPatch(path, body) { return apiCall("PATCH", path, body || {}); }
  function apiDelete(path) { return apiCall("DELETE", path); }

  function getReads() { return readJSON(LS.reads, {}); }
  function setReads(obj) { writeJSON(LS.reads, obj); }

  function pushProgress(book, entry) {
    if (!book || !isLoggedIn()) return;
    apiPost("/api/progress", {
      file: book.file,
      progress: entry.progress || 0,
      lastOpenedAt: entry.lastOpenedAt,
      firstOpenedAt: entry.firstOpenedAt
    }).catch(function () {});
  }

  function recordOpen(id) {
    var reads = getReads();
    var entry = reads[id] || { progress: 0 };
    entry.lastOpenedAt = Date.now();
    if (!entry.firstOpenedAt) entry.firstOpenedAt = entry.lastOpenedAt;
    reads[id] = entry;
    setReads(reads);
    pushProgress(BOOKS_BY_ID[id], entry);
  }
  function setProgress(id, pct) {
    var reads = getReads();
    var entry = reads[id] || {};
    entry.progress = pct;
    entry.lastOpenedAt = Date.now();
    if (!entry.firstOpenedAt) entry.firstOpenedAt = entry.lastOpenedAt;
    reads[id] = entry;
    setReads(reads);
    pushProgress(BOOKS_BY_ID[id], entry);
  }
  function clearHistory() { setReads({}); }

  /** Pull this user's server-side progress and merge it into local reads (newer
   *  lastOpenedAt wins per book), keyed by the book's stable `file` on the wire and
   *  the local numeric `id` in localStorage -- see the admin-panel plan for why `file`
   *  is the sync key (array-index ids aren't stable across a changing book list). */
  function syncProgressFromServer() {
    if (!isLoggedIn()) return Promise.resolve();
    return apiGet("/api/progress").then(function (data) {
      var remote = data.progress || {};
      var reads = getReads();
      var changed = false;
      Object.keys(remote).forEach(function (file) {
        var book = BOOKS_BY_FILE[file];
        if (!book) return;
        var r = remote[file];
        var local = reads[book.id];
        if (!local || (r.lastOpenedAt || 0) > (local.lastOpenedAt || 0)) {
          reads[book.id] = {
            progress: r.progress,
            lastOpenedAt: r.lastOpenedAt,
            firstOpenedAt: (local && local.firstOpenedAt) ? Math.min(local.firstOpenedAt, r.firstOpenedAt || r.lastOpenedAt) : (r.firstOpenedAt || r.lastOpenedAt),
            lastChapter: local ? local.lastChapter : undefined,
            totalChapters: local ? local.totalChapters : undefined,
            scrollPct: local ? local.scrollPct : undefined
          };
          changed = true;
        }
      });
      if (changed) setReads(reads);
    }).catch(function () {});
  }

  /* ---------------- auth ----------------
     Real session-cookie auth against server/server.js's /api/auth/* routes. The current
     user is cached in this module-level var (not localStorage -- the HttpOnly cookie is
     the actual source of truth); refreshCurrentUser() populates it at boot and after
     login/signup/logout. */
  var CURRENT_USER = null;
  var GOOGLE_CLIENT_ID = null; // fetched from /api/auth/config at boot; null until a real ID is configured server-side
  function getCurrentUser() { return CURRENT_USER; }
  function isLoggedIn() { return !!CURRENT_USER; }
  function isAdmin() { return !!(CURRENT_USER && CURRENT_USER.role === "admin"); }
  function refreshCurrentUser() {
    return apiGet("/api/auth/me").then(function (data) {
      CURRENT_USER = data.user || null;
      return CURRENT_USER;
    }).catch(function () { CURRENT_USER = null; return null; });
  }

  /* No real subscription/billing system yet (to be built separately). isSubscribed() always
     returns false until a real subscription flow marks the current user's record, so
     "Listen to this book" stays visible to everyone but opens a subscribe prompt on click. */
  function isSubscribed() { var u = getCurrentUser(); return !!(u && u.subscribed); }

  /* ---------------- comments (server-backed, per book `file`) ---------------- */
  function getComments(bookFile) {
    return apiGet("/api/books/" + encodeURIComponent(bookFile) + "/comments").then(function (data) {
      return data.comments || [];
    }).catch(function () { return []; });
  }
  function addComment(bookFile, text) {
    return apiPost("/api/books/" + encodeURIComponent(bookFile) + "/comments", { text: text });
  }

  function timeAgo(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return "अभी";
    var m = Math.round(s / 60); if (m < 60) return m + " मिनट पहले";
    var h = Math.round(m / 60); if (h < 24) return h + " घंटे पहले";
    var d = Math.round(h / 24); if (d < 30) return d + " दिन पहले";
    var mo = Math.round(d / 30); if (mo < 12) return mo + " महीने पहले";
    return Math.round(mo / 12) + " वर्ष पहले";
  }

  function getTheme() { return localStorage.getItem(LS.theme) || "light"; }

  // Mobile gets its own hero art (same breakpoint as the .hero-banner mobile layout in
  // swadhyay.css, 860px) rather than just scaling down the desktop banner.
  function heroBannerUrl(t) {
    var mobile = window.innerWidth <= 860;
    return "assets/hero_banner_" + (mobile ? "mobile_" : "") + (t === "dark" ? "dark" : "light") + ".webp";
  }
  function applyHeroBanner() {
    var hero = document.querySelector(".hero-banner");
    if (hero) hero.style.backgroundImage = "url('" + heroBannerUrl(getTheme()) + "')";
  }

  function setTheme(t) {
    localStorage.setItem(LS.theme, t);
    document.documentElement.setAttribute("data-theme", t);
    applyHeroBanner();
    var themeSwitch = document.getElementById("themeSwitch");
    if (themeSwitch) themeSwitch.checked = (t === "dark");
  }

  function seedDemoData() {
    if (localStorage.getItem(LS.seeded)) return;
    localStorage.setItem(LS.seeded, "1");
    var favSeed = [
      "श्रीमद्भगवद्गीता शांकरभाष्य.html", "श्रीरामगीता.html",
      "प्रेम दर्शन (नारद भक्ति सूत्र की व्याख्या).html", "गीता के परम प्रचारक.html",
      "हंसगीता.html", "गीता संग्रह.html"
    ];
    var favIds = favSeed.map(findByFile).filter(Boolean).map(function (b) { return b.id; });
    if (favIds.length) setFavorites(favIds);

    /* Reading history is intentionally NOT seeded: My Reads starts at zero and
       only reflects what the user actually opens. */
  }

  var NEW_ADDITIONS_FILES = [
    "संक्षिप्त शिवपुराण.html", "श्रीमद्देवीभागवतमहापुराण.html", "संक्षिप्त योगवासिष्ठ.html",
    "श्रीहनुमानचालीसा.html", "नारद भक्ति सूत्र.html",
    "श्रीविष्णुसहस्रनाम (शांकरभाष्य, हिन्दी अनुवाद सहित).html"
  ];

  /* ---------------- home page: पंचांग-आधारित सुझाव / AI / संग्रह data ---------------- */
  var VRAT_BY_TITHI = {
    "एकादशी": { title: "एकादशी व्रत", desc: "आज एकादशी है। भगवान् विष्णुके व्रत और उपासनाका विशेष महत्व है।", keyword: "एकादशी" },
    "चतुर्थी": { title: "संकष्टी चतुर्थी", desc: "आज चतुर्थी है। भगवान् श्रीगणेशके पूजनका विशेष महत्व है।", keyword: "गणेश" },
    "त्रयोदशी": { title: "प्रदोष व्रत", desc: "आज त्रयोदशी है। शिव पूजन और रुद्राभिषेकका विशेष महत्व है।", keyword: "शिव" },
    "पूर्णिमा": { title: "पूर्णिमा व्रत", desc: "आज पूर्णिमा है। सत्यनारायण पूजन और दान-पुण्यका विशेष महत्व है।", keyword: "सत्यनारायण" },
    "अमावस्या": { title: "अमावस्या", desc: "आज अमावस्या है। पितृ-तर्पण और स्नान-दानका विशेष महत्व है।", keyword: "पितर" },
    "अष्टमी": { title: "अष्टमी व्रत", desc: "आज अष्टमी है। देवी भगवतीके पूजनका विशेष महत्व है।", keyword: "देवी" }
  };
  /* ---------- vrat / festival catalogue (from the database, /api/vrats): which vrat falls on a day ----------
     Each vrat carries `rules` -- { maas, tithis, vaar } -- and is observed when ANY rule matches the panchang of the day:
     maas = purnimanta month name ("अधिक" for an adhika month), tithis = "S:10" (शुक्ल दशमी) / "K:4" (कृष्ण चतुर्थी),
     vaar = weekday (0 = रविवार). A rule with only a month covers the whole month. The list is kept in localStorage so
     the home page has it at once on the next visit, and refreshed from the API on every load. */
  var LS_VRATS = "swadhyay_vrats_v1";
  var VRATS = [];
  var VRAT_AUTO = { festival: 1, tithi: 1, weekly: 1 };      // kinds shown by themselves; the others are list / reference entries
  try { var cachedVrats = JSON.parse(localStorage.getItem(LS_VRATS)); if (cachedVrats && Array.isArray(cachedVrats.vrats)) VRATS = cachedVrats.vrats; } catch (e) {}
  function loadVrats() {
    return apiGet("/api/vrats").then(function (data) {
      if (data && Array.isArray(data.vrats) && data.vrats.length) {
        VRATS = data.vrats;
        try { localStorage.setItem(LS_VRATS, JSON.stringify({ vrats: VRATS })); } catch (e) {}
      }
    }).catch(function () {});
  }
  /* month and tithi of a rule against a lunar state { maas, paksha, tithiNum } */
  function vratStateHit(r, q) {
    if (r.maas && r.maas.length && r.maas.indexOf(q.maas) === -1) return false;
    if (r.tithis && r.tithis.length && r.tithis.indexOf((q.paksha === "शुक्ल" ? "S:" : "K:") + q.tithiNum) === -1) return false;
    return true;
  }
  /* the lunar state at the hour an observance goes by: "moonrise" (Sankashti, Karwa Chauth), "pradosh" (a little after
     sunset: Pradosh, Diwali, Holika Dahan) or "night" (about midnight: Mahashivratri, Janmashtami) */
  var VRAT_STATES = {};
  function vratStateAt(kind, date, city) {
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate(), key = kind + "|" + city.key + "|" + y + "-" + m + "-" + d;
    if (VRAT_STATES[key]) return VRAT_STATES[key];
    var h;
    if (kind === "moonrise") h = moonriseLocalHour(y, m, d, city.lat, city.lon, city.tz) || 21;
    else if (kind === "pradosh") { h = sunEventLocalHour(y, m, d, city.lat, city.lon, city.tz, false); h = (h == null ? 18 : h) + 0.75; }
    else if (kind === "sunrise") { h = sunEventLocalHour(y, m, d, city.lat, city.lon, city.tz, true); if (h == null) h = 6; }
    else if (kind === "noon") h = 12;
    else h = 23.9;
    return (VRAT_STATES[key] = lunarStateAt(y, m, d, h, city.tz));
  }
  /* The same for a vrat that goes by the tithi at noon (most of them). It falls on the first day whose noon has the tithi.
     A tithi shorter than a day can slip between two noons -- the Purnima of 25-26 Oct 2026 does -- and must still be
     observed: then it counts on the day it is there in the evening or at night, or, if it is there only in the morning,
     on that day. */
  function vratNoonHitOne(r, p, dedupe) {
    var c = p.city, day = function (n) { return new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate() + n); };
    var noon = function (n) { return vratStateHit(r, n === 0 ? p : vratStateAt("noon", day(n), c)); };
    var at = function (kind, n) { return vratStateHit(r, vratStateAt(kind, day(n), c)); };
    if (noon(0)) return dedupe ? !noon(-1) : true;
    if (noon(1)) return false;
    if (at("pradosh", 0) || at("night", 0)) return true;
    return !noon(-1) && !at("pradosh", -1) && !at("night", -1) && at("sunrise", 0);
  }
  /* Such an observance falls on the day whose moonrise / pradosh / midnight has the tithi. A tithi longer than a day touches
     two of them: the first day counts. A short one that begins after one moonrise and ends before the next touches none: then
     the day it begins at night counts -- so every month has its day. */
  function vratAtHitOne(r, p, dedupe) {
    var day = function (n) { return new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate() + n); };
    var at = function (kind, n) { return vratStateHit(r, vratStateAt(kind, day(n), p.city)); };
    var kind = r.at;
    if (at(kind, 0)) return dedupe ? !at(kind, -1) : true;
    if (kind === "moonrise") return at("night", 0) && !at(kind, 1);
    // pradosh / midnight: a tithi that slips between two of them counts on the day whose daytime has it
    return !at(kind, -1) && (at("sunrise", 0) || at("noon", 0) || (kind === "pradosh" ? at("night", -1) : at("pradosh", 0)));
  }
  /* A rule is tried tithi by tithi. With one tithi the vrat is a single day: the first day that has it. With several (Navratri,
     पितृपक्ष ...) it lasts as long as any of them is there, so every such day counts. */
  function vratEachTithi(fn) {
    return function (r, p) {
      var t = r.tithis || [];
      for (var i = 0; i < t.length; i++) if (fn({ maas: r.maas, tithis: [t[i]], at: r.at }, p, t.length === 1)) return true;
      return false;
    };
  }
  var vratNoonHit = vratEachTithi(vratNoonHitOne), vratAtHit = vratEachTithi(vratAtHitOne);
  function vratRuleHit(r, p, wd) {
    var hasM = r.maas && r.maas.length, hasT = r.tithis && r.tithis.length;
    if (!hasM && !hasT && r.vaar == null) return false;
    if (r.vaar != null && r.vaar !== wd) return false;
    if (!hasT) return vratStateHit(r, p);                    // a weekday, or a whole month
    return r.at ? vratAtHit(r, p) : vratNoonHit(r, p);
  }
  function vratsFor(p) {
    var wd = p.date.getDay();
    return VRATS.filter(function (v) { return VRAT_AUTO[v.kind] && v.rules.some(function (r) { return vratRuleHit(r, p, wd); }); })
      .sort(function (a, b) { return a.priority - b.priority || a.order - b.order; });
  }
  /* When is a vrat next observed? The panchang of every coming day is worked out once (and kept for the day) and each
     vrat's rules are tried against it. A vrat that runs over several days counts from its first day. */
  var VRAT_DAYS = { key: "", list: [] }, VRAT_NEXT = {};
  function vratDay(i) {
    var city = getPanchangCity(), t = new Date(), key = city.key + dayKeyOf(t);
    if (VRAT_DAYS.key !== key) { VRAT_DAYS = { key: key, list: [] }; VRAT_NEXT = {}; }
    return VRAT_DAYS.list[i] || (VRAT_DAYS.list[i] = getPanchang(new Date(t.getFullYear(), t.getMonth(), t.getDate() + i), city));
  }
  function dayKeyOf(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function vratHitOn(v, i) {
    var p = vratDay(i), wd = p.date.getDay();
    return v.rules.some(function (r) { return vratRuleHit(r, p, wd); });
  }
  /* the first days (up to `count`) on which a vrat starts, within `span` days from today: [{ date, days }] */
  function vratOccurrences(v, count, span) {
    vratDay(0);
    var out = [], prev = false;
    for (var i = 0; i < span && out.length < count; i++) {
      var hit = vratHitOn(v, i);
      if (hit && !prev) out.push({ date: vratDay(i).date, days: i });
      prev = hit;
    }
    return out;
  }
  function vratNext(v) {
    vratDay(0);
    if (!(v.slug in VRAT_NEXT)) VRAT_NEXT[v.slug] = VRAT_AUTO[v.kind] ? (vratOccurrences(v, 1, 420)[0] || null) : null;   // the list looks a year ahead; the vrat's own page, further
    return VRAT_NEXT[v.slug];
  }
  /* an adhika-month vrat is not due within the year: look further (an adhika month comes about every three years) */
  function vratNextFar(v) {
    if (!VRAT_AUTO[v.kind] || !(v.rules || []).some(function (r) { return (r.maas || []).indexOf("अधिक") !== -1; })) return null;
    var key = v.slug + "#far";
    if (!(key in VRAT_NEXT)) VRAT_NEXT[key] = vratOccurrences(v, 1, 1250)[0] || null;
    return VRAT_NEXT[key];
  }
  function vratNextText(o) {
    if (!o) return "";
    var ds = o.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    return ds + " · " + (o.days === 0 ? tx("आज", "today") : o.days === 1 ? tx("कल", "tomorrow") : tx(o.days + " दिन में", "in " + o.days + " days"));
  }
  function vratWhen(p) { return (p.adhika ? "अधिक मास" : p.maas) + " " + p.paksha + " पक्ष " + p.tithiName + " · " + p.weekdayHi; }
  function vratPath(v) { return "/vrat/" + encodeURIComponent(v.slug); }
  /* the books shown beside a vrat: the व्रत परिचय book, then books whose title has one of the vrat's keywords */
  function vratBooks(v) {
    var out = [], seen = {};
    function add(b) { if (b && !seen[b.id] && out.length < 4) { seen[b.id] = 1; out.push(b); } }
    add(findByFile("व्रत परिचय.html"));
    (v.keywords || []).forEach(function (kw) { BOOKS.forEach(function (b) { if (b.title.indexOf(kw) !== -1) add(b); }); });
    pickN(BOOKS, 4, 13).forEach(add);
    return out;
  }
  function getTodaysSpecial(panchang) {
    var list = vratsFor(panchang);
    if (list.length) return { vrat: list[0], others: list.slice(1, 6), books: vratBooks(list[0]) };
    // the catalogue has not arrived (offline / first visit with the server down): the small built-in table
    var v = VRAT_BY_TITHI[panchang.tithiName];
    if (!v) return null;
    var matches = BOOKS.filter(function (b) { return b.title.indexOf(v.keyword) !== -1; });
    if (matches.length < 4) matches = matches.concat(pickN(BOOKS, 4 - matches.length, 13));
    return { title: v.title, desc: v.desc, books: matches.slice(0, 4) };
  }

  var AI_TOPIC_CHIPS = [
    { label: "सभी ग्रंथ", icon: "📖" },
    { label: "गीता", icon: "📗" },
    { label: "रामायण", icon: "🏛" },
    { label: "उपनिषद्", icon: "📖" },
    { label: "पुराण", icon: "📜" },
    { label: "शिव पुराण", icon: "🔱" }
  ];

  var SPECIAL_COLLECTIONS = [
    { icon: "🪷", hi: "दैनिक स्तोत्र", en: "Daily Stotras", sub: "सुबह-शाम के लिए", subEn: "For morning & evening", q: "स्तोत्र" },
    { icon: "🪔", hi: "व्रत एवं त्योहार", en: "Fasts & Festivals", sub: "विधि और महत्व", subEn: "Rituals & significance", q: "व्रत" },
    { icon: "🌿", hi: "जीवन मार्गदर्शन", en: "Life Guidance", sub: "आचार, विचार, आचरण", subEn: "Conduct, thought, behaviour", q: "जीवन" },
    { icon: "🪶", hi: "संस्कृत सीखें", en: "Learn Sanskrit", sub: "श्लोक, उच्चारण, व्याकरण", subEn: "Shlokas, pronunciation, grammar", q: "व्याकरण" }
  ];

  var POPULAR_AUTHOR_HINTS = ["हनुमानप्रसाद", "शंकराचार्य", "विवेकानन्द", "तुलसीदास"];
  /* The credited person (as an author, else in any role) whose name contains `hint`. */
  function findAuthorLabel(hint) {
    var best = null;
    PEOPLE.forEach(function (p) {
      if (p.name.indexOf(hint) === -1) return;
      if (!best || p.roles.authors.length > best.roles.authors.length) best = p;
    });
    return best ? best.name : hint;
  }

  /* ---------------- rendering helpers ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function bilingual(hi) {
    return esc(hi);
  }

  function coverEl(book, size) {
    if (book.coverImage) {
      return '<div class="cover cover-' + (size || "md") + ' has-img">' +
        '<img src="' + esc(book.coverImage) + '" alt="' + esc(book.title) + '" loading="lazy">' +
        '</div>';
    }
    var g = PALETTE[book.paletteIdx];
    return '<div class="cover cover-' + (size || "md") + '" style="background:linear-gradient(150deg,' + g[0] + ',' + g[1] + ')">' +
      '<span class="cover-letter">' + esc(book.initial) + '</span>' +
      '<span class="cover-mark">ॐ</span>' +
      '</div>';
  }

  function bookCard(book) {
    var fav = isFavorite(book.id);
    return '<div class="book-card" data-id="' + book.id + '">' +
      '<a class="book-card-link" href="' + bookPath(book) + '">' +
      coverEl(book, "md") +
      '</a>' +
      '<button class="fav-toggle ' + (fav ? "active" : "") + '" data-fav="' + book.id + '" title="पसंदीदा">♥</button>' +
      '<div class="book-card-body">' +
      '<a href="' + bookPath(book) + '" class="book-title">' + esc(book.title) + '</a>' +
      '<div class="book-author">' + esc(book.author) + '</div>' +
      '</div></div>';
  }

  function bookRow(book) {
    var read = getReads()[book.id];
    var pct = read ? (read.progress || 0) : 0;
    return '<div class="book-row-item" data-id="' + book.id + '">' +
      '<a class="book-card-link" href="' + bookPath(book) + '">' + coverEl(book, "sm") + '</a>' +
      '<div class="book-row-body">' +
      '<a href="' + bookPath(book) + '" class="book-title">' + esc(book.title) + '</a>' +
      (read ? '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div><span class="progress-pct">' + pct + '%</span>' :
        '<div class="book-author">' + esc(book.author) + '</div>') +
      '</div></div>';
  }

  /* `sub` is an optional [hindi, english] pair shown after the title. */
  function carousel(titleHi, titleEn, sub, items, viewAllHash, extraClass) {
    if (!items.length) return "";
    var html = '<section class="row-section' + (extraClass ? " " + extraClass : "") + '">' +
      '<div class="row-head"><h2>' + esc(tx(titleHi, titleEn)) + (sub ? ' <span class="row-sub">| ' + esc(tx(sub[0], sub[1])) + '</span>' : '') + '</h2>' +
      '<a class="view-all" href="' + viewAllHash + '">' + esc(tx("सभी देखें", "View All")) + ' →</a></div>' +
      '<div class="row-scroll-wrap">' +
      '<button class="row-nav prev" aria-label="पिछला">‹</button>' +
      '<div class="row-scroll">' + items.map(bookRow).join("") + '</div>' +
      '<button class="row-nav next" aria-label="अगला">›</button>' +
      '</div></section>';
    return html;
  }

  /* Small Hindi/English switch for category, filter and author-role labels. It shows the
     language you would switch TO. */
  function taxLangToggleHtml() {
    var toEn = getTaxLang() !== "en";
    return '<button type="button" class="taxlang-toggle" data-taxlang-toggle title="' + esc(toEn ? "Show categories in English" : "श्रेणियाँ हिन्दी में दिखाएँ") + '">' +
      (toEn ? "EN" : "हिं") + '</button>';
  }

  function categoryTabs(activeKey) {
    return '<div class="cat-tabs-wrap">' +
      '<button class="row-nav prev" aria-label="पिछला">‹</button>' +
      '<nav class="cat-tabs" id="catTabs">' + CATEGORY_META.map(function (c) {
        var count = c.key === "all" ? BOOKS.length : BOOKS.filter(function (b) { return b.categoryKeys.indexOf(c.key) !== -1; }).length;
        return '<a class="cat-tab' + (c.key === activeKey ? " active" : "") + '" href="/library?cat=' + encodeURIComponent(c.key) + '">' +
          esc(tx(c.hi, c.en)) + ' <span class="cnt">(' + count + ')</span></a>';
      }).join("") + '</nav>' +
      '<button class="row-nav next" aria-label="अगला">›</button>' +
      '</div>';
  }

  function categoryGrid() {
    return '<section class="row-section"><div class="row-head"><h2>' + esc(tx("ग्रंथ श्रेणियाँ", "Granth Categories")) +
      '</h2><a class="view-all" href="/library">' + esc(tx("सभी देखें", "View All")) + ' →</a></div>' +
      '<div class="row-scroll-wrap">' +
      '<button class="row-nav prev" aria-label="पिछला">‹</button>' +
      '<div class="row-scroll cat-scroll">' + CATEGORY_META.map(function (c) {
        var count = c.key === "all" ? BOOKS.length : BOOKS.filter(function (b) { return b.categoryKeys.indexOf(c.key) !== -1; }).length;
        return '<a class="cat-tile" href="/library?cat=' + encodeURIComponent(c.key) + '">' +
          '<span class="cat-tile-icon">' + c.icon + '</span>' +
          '<span class="cat-tile-label">' + esc(tx(c.hi, c.en)) + '</span>' +
          '<span class="cat-tile-count">' + count + '</span></a>';
      }).join("") + '</div>' +
      '<button class="row-nav next" aria-label="अगला">›</button>' +
      '</div></section>';
  }

  /* ---------------- home: पंचांग कार्ड ---------------- */
  function panchangCard(p) {
    var cityOpts = PANCHANG_CITIES.map(function (c) {
      return '<option value="' + c.key + '"' + (c.key === p.city.key ? " selected" : "") + '>' + esc(c.hi) + '</option>';
    }).join("");
    return '<div class="panchang-card">' +
      '<div class="pc-head"><span class="pc-head-icon">📅</span><h3>' + bilingual("आज का पंचांग") + '</h3>' +
      '<select class="pc-city" id="panchangCitySelect">' + cityOpts + '</select></div>' +
      '<div class="pc-date">' + esc(p.weekdayHi) + ', ' + esc(formatHindiDate(p.date)) + '</div>' +
      '<div class="pc-tithi-line">' + esc(p.adhika ? "अधिक मास" : p.maas) + ' • ' + esc(p.paksha) + ' पक्ष • ' + esc(p.tithiName) + '</div>' +
      '<div class="pc-grid">' +
      '<div class="pc-col">' +
      '<div class="pc-fact"><span class="pc-ic">🌙</span><span class="pc-fact-data"><b>तिथि</b>' + esc(p.tithiName) + '</span></div>' +
      '<div class="pc-fact"><span class="pc-ic">✦</span><span class="pc-fact-data"><b>नक्षत्र</b>' + esc(p.nakshatraName) + '</span></div>' +
      '<div class="pc-fact"><span class="pc-ic">☯</span><span class="pc-fact-data"><b>योग</b>' + esc(p.yogaName) + '</span></div>' +
      '<div class="pc-fact"><span class="pc-ic">◐</span><span class="pc-fact-data"><b>करण</b>' + esc(p.karanName) + '</span></div>' +
      '</div>' +
      '<div class="pc-col">' +
      '<div class="pc-fact"><span class="pc-ic">🌅</span><span class="pc-fact-data"><b>सूर्योदय</b>' + esc(p.sunrise) + '</span></div>' +
      '<div class="pc-fact"><span class="pc-ic">🌇</span><span class="pc-fact-data"><b>सूर्यास्त</b>' + esc(p.sunset) + '</span></div>' +
      '<div class="pc-fact"><span class="pc-ic">⛔</span><span class="pc-fact-data"><b>राहुकाल</b>' + esc(p.rahukal.start) + ' – ' + esc(p.rahukal.end) + '</span></div>' +
      '<div class="pc-fact"><span class="pc-ic">🕉</span><span class="pc-fact-data"><b>अभिजीत मुहूर्त</b>' + esc(p.abhijit.start) + ' – ' + esc(p.abhijit.end) + '</span></div>' +
      '</div>' +
      '</div>' +
      '<a class="btn-primary pc-full-btn" href="/panchang">' + bilingual("पूर्ण पंचांग देखें") + ' →</a>' +
      '</div>';
  }

  /* ---------------- home: ग्रंथों से पूछें AI कार्ड ---------------- */
  function aiAskCard() {
    return '<div class="ai-ask-card">' +
      '<div class="ai-head"><img class="ai-head-icon-badge" src="assets/om-medallion-s.webp" alt="ॐ"><h3>' + bilingual("ग्रंथों से पूछें") + '</h3><span class="ai-badge">AI</span></div>' +
      '<p class="ai-sub">' + bilingual("कल्याण के ग्रंथों के आधार पर संदर्भ सहित उत्तर प्राप्त करें") + '</p>' +
      '<form class="ai-ask-form" id="homeAiForm">' +
      '<span class="ai-ask-search-ic">🔍</span>' +
      '<input type="text" id="homeAiInput" placeholder="आप क्या जानना चाहते हैं?">' +
      '<button type="submit" class="ai-ask-send" aria-label="भेजें">➤</button>' +
      '</form>' +
      '<div class="ai-chips">' + AI_TOPIC_CHIPS.map(function (t, i) {
        return '<button class="chip ai-topic-chip' + (i === 0 ? " active" : "") + '" data-q="' + esc(t.label) + '">' +
          '<span class="chip-ic">' + t.icon + '</span>' + esc(t.label) + '</button>';
      }).join("") + '</div>' +
      '<div class="ai-footer-note"><span>📖</span>' + bilingual("ग्रंथों में खोजकर संदर्भ सहित उत्तर मिलेगा") + '</div>' +
      '</div>';
  }

  /* ---------------- home: आज के लिए विशेष ---------------- */
  function specialBookTile(book) {
    return '<div class="special-book-tile">' +
      '<a href="' + bookPath(book) + '">' + coverEl(book, "md") + '</a>' +
      '<a href="' + bookPath(book) + '" class="special-book-title">' + esc(book.title) + '</a>' +
      '<div class="special-book-sub">' + esc(tx(book.categoryMetas[0].hi, book.categoryMetas[0].en)) + '</div>' +
      '<a class="special-book-cta" href="' + bookPath(book) + '">' + esc(tx("पढ़ें", "Read")) + ' →</a>' +
      '</div>';
  }

  function todaysSpecialSection(panchang) {
    var special = getTodaysSpecial(panchang);
    if (!special) return "";
    var banner;
    if (special.vrat) {
      var v = special.vrat;
      var more = special.others.length
        ? '<div class="festival-more"><span>' + esc(tx("आज के अन्य व्रत:", "Also today:")) + '</span>' +
          special.others.map(function (o) { return '<a href="' + vratPath(o) + '">' + esc(o.name) + '</a>'; }).join("") + '</div>'
        : "";
      banner = '<div class="festival-banner">' +
        '<div class="festival-icon">' + esc(v.icon || "🔱") + '</div>' +
        '<div class="festival-body"><small class="festival-when">' + esc(vratWhen(panchang)) + '</small><h4>' + esc(v.name) + '</h4><p>' + esc(v.intro) + '</p>' + more +
        '<a class="btn-outline festival-cta" href="' + vratPath(v) + '">' + esc(tx("विस्तार देखें", "View details")) + ' →</a></div>' +
        '</div>';
    } else {
      banner = '<div class="festival-banner">' +
        '<div class="festival-icon">🔱</div>' +
        '<div class="festival-body"><h4>' + esc(special.title) + '</h4><p>' + esc(special.desc) + '</p>' +
        '<a class="btn-outline festival-cta" href="/library?q=' + encodeURIComponent(special.title) + '">' + esc(tx("विस्तार देखें", "View details")) + ' →</a></div>' +
        '</div>';
    }
    return '<section class="row-section"><div class="row-head"><h2>' + esc(tx("आज के लिए विशेष", "Special for Today")) +
      ' <span class="row-sub">| ' + esc(tx("आज के पंचांग के अनुसार अनुशंसित ग्रंथ और पाठ", "Books and readings recommended by today's Panchang")) + '</span></h2>' +
      (VRATS.length ? '<a class="view-all" href="/vrat">' + esc(tx("सभी व्रत एवं पर्व", "All vrats & festivals")) + ' →</a>' : "") + '</div>' +
      '<div class="today-special-grid">' + banner +
      '<div class="special-book-row">' + special.books.map(specialBookTile).join("") + '</div>' +
      '</div></section>';
  }

  /* ---------------- home: आज क्या पढ़ें? CTA ---------------- */
  function suggestedReadBanner() {
    var day = Math.floor(Date.now() / 86400000);
    var book = BOOKS[day % BOOKS.length];
    return '<section class="row-section"><a class="cta-banner" href="' + bookPath(book) + '">' +
      '<div class="cta-banner-body"><h3>' + esc(tx("आज क्या पढ़ें?", "What to read today?")) + '</h3>' +
      '<p>' + esc(tx("आज के दिन के अनुसार उपयुक्त पाठ, स्तोत्र और साधना सुझाव", "Readings, stotras and sadhana suggestions suited to today")) + '</p>' +
      '<span class="btn-primary">' + esc(tx("देखें", "View")) + ' →</span></div>' +
      '</a></section>';
  }

  /* ---------------- home: विशेष संग्रह ---------------- */
  function specialCollectionsSection() {
    return '<section class="row-section"><div class="row-head"><h2>' + esc(tx("विशेष संग्रह", "Special Collections")) +
      '</h2><a class="view-all" href="/library">' + esc(tx("सभी देखें", "View All")) + ' →</a></div>' +
      '<div class="collections-grid">' + SPECIAL_COLLECTIONS.map(function (c) {
        return '<a class="collection-tile" href="/library?q=' + encodeURIComponent(c.q) + '">' +
          '<span class="collection-icon">' + c.icon + '</span>' +
          '<span class="collection-label">' + esc(tx(c.hi, c.en)) + '</span>' +
          '<span class="collection-sub">' + esc(tx(c.sub, c.subEn)) + '</span></a>';
      }).join("") + '</div></section>';
  }

  /* ---------------- home: लोकप्रिय लेखक ---------------- */
  function popularAuthorsSection() {
    return '<section class="row-section"><div class="row-head"><h2>' + esc(tx("लोकप्रिय लेखक", "Popular Authors")) +
      '</h2><a class="view-all" href="/authors">' + esc(tx("सभी देखें", "View All")) + ' →</a></div>' +
      '<div class="authors-row">' + POPULAR_AUTHOR_HINTS.map(function (hint, i) {
        var label = findAuthorLabel(hint);
        var g = PALETTE[i % PALETTE.length];
        return '<a class="author-tile" href="' + (PEOPLE_BY_NAME[label] ? personPath(label) : '/library?q=' + encodeURIComponent(hint)) + '">' +
          (AUTHOR_PHOTOS[label]
            ? '<span class="author-avatar author-avatar-photo" style="background-image:url(\'' + AUTHOR_PHOTOS[label] + '\')"></span>'
            : '<span class="author-avatar" style="background:linear-gradient(150deg,' + g[0] + ',' + g[1] + ')">' + esc(label.charAt(0)) + '</span>') +
          '<span class="author-name">' + esc(label) + '</span></a>';
      }).join("") + '</div></section>';
  }

  /* ---------------- views ---------------- */
  function pickN(arr, n, seedOffset) {
    if (arr.length <= n) return arr.slice();
    var out = [];
    var used = {};
    var seed = seedOffset || 1;
    while (out.length < n) {
      var idx = (hashCode("s" + seed) + seed * 37) % arr.length;
      seed++;
      if (!used[idx]) { used[idx] = true; out.push(arr[idx]); }
      if (seed > arr.length * 3) break;
    }
    return out;
  }

  function viewHome() {
    var reads = getReads();
    var recentIds = Object.keys(reads).sort(function (a, b) { return reads[b].lastOpenedAt - reads[a].lastOpenedAt; }).slice(0, 8);
    var recentBooks = recentIds.map(function (id) { return BOOKS_BY_ID[id]; }).filter(Boolean);

    var newAdd = NEW_ADDITIONS_FILES.map(findByFile).filter(Boolean);
    if (newAdd.length < 6) newAdd = newAdd.concat(pickN(BOOKS, 6 - newAdd.length, 5));

    var favIds = getFavorites();
    var favBooks = favIds.map(function (id) { return BOOKS_BY_ID[id]; }).filter(Boolean).slice(0, 8);

    var panchang = getPanchang(new Date(), getPanchangCity());

    var html = '';
    html += '<section class="hero-banner">' +
      '<div class="hero-overlay">' +
      '<h1 class="hero-title">' + bilingual("स्वाध्यायान्मा प्रमदः") + '</h1>' +
      '<p class="hero-title-src">— तैत्तिरीयोपनिषद्</p>' +
      '<div class="hero-quote" id="heroQuote"><p class="hero-sub">“ज्ञानं परमं बलम्” — ज्ञान ही परम बल है।</p></div>' +
      '</div></section>';

    html += '<main class="content-pad">';
    html += '<div class="home-top-grid">' + panchangCard(panchang) + aiAskCard() + '</div>';
    if (window.SwadhyayDaily) html += window.SwadhyayDaily.homeHtml();      // gita study, manas pathways, daily bhajan
    html += categoryGrid();
    if (recentBooks.length) html += carousel("हाल में पढ़ा", "Recently Read", ["जहाँ से छोड़ा था, वहाँ से आगे पढ़ें", "Pick up where you left off"], recentBooks, "/myreads");
    html += todaysSpecialSection(panchang);
    html += carousel("नये आगमन", "New Additions", "", newAdd, "/library?cat=all&sort=latest", "new-arrivals-row");
    if (favBooks.length) html += carousel("आपके प्रिय ग्रंथ", "Your Favorites", "", favBooks, "/favorites");
    html += '<div class="home-lower-grid">' +
      '<div class="hl-cta">' + suggestedReadBanner() + '</div>' +
      '<div class="hl-coll">' + specialCollectionsSection() + '</div>' +
      '<div class="hl-auth">' + popularAuthorsSection() + '</div>' +
      (window.SwadhyayAudio ? window.SwadhyayAudio.homePanelHtml() : '') +
      '</div>';
    html += '</main>';
    return html;
  }

  /* ---------------- quote of the day (hero card) ----------------
     /api/quote-of-the-day returns one short saying per revered saint, the same for everyone on a
     given day. Each becomes a slide in the white hero card; until they arrive (or if the request
     fails) the card keeps its original "ज्ञानं परमं बलम्" line. */
  var QOTD_KEY = "swadhyay_qotd_v1";
  var qotdTimer = null;

  function quoteSlidesHtml(list) {
    return list.map(function (q, i) {
      var book = q.book && findByFile(q.book.file);
      var person = q.author && PEOPLE_BY_NAME[q.author] ? personLink(q.author).replace(esc(q.author), esc(q.name)) : esc(q.name);
      return '<figure class="qs-slide' + (i === 0 ? " is-active" : "") + '" aria-hidden="' + (i === 0 ? "false" : "true") + '">' +
        '<blockquote class="qs-text">' + esc(q.text) + '</blockquote>' +
        '<figcaption class="qs-by"><span class="qs-name">' + person + '</span>' +
        (q.book ? ' · <span class="qs-book">' + (book ? '<a href="' + bookPath(book) + '">' + esc(q.book.title) + '</a>' : esc(q.book.title)) + '</span>' : '') +
        '</figcaption></figure>';
    }).join("");
  }

  function renderQuoteSlider(box, list) {
    box.innerHTML =
      '<div class="qs" role="region" aria-roledescription="carousel" aria-label="' + esc(tx("आज का सुविचार", "Quote of the day")) + '">' +
      '<div class="qs-label"><span class="qs-mark" aria-hidden="true">“</span>' + esc(tx("आज का सुविचार", "Quote of the day")) + '</div>' +
      '<button type="button" class="qs-share" data-qs="share" aria-label="' + esc(tx("शेयर करें", "Share")) + '" title="' + esc(tx("शेयर करें", "Share")) + '"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.82-4H15a3 3 0 0 0 .1.76L8.9 8.3a3 3 0 1 0 0 7.4l6.2 3.54A3 3 0 0 0 15 20a3 3 0 1 0 .9-2.14L9.7 14.3a3 3 0 0 0 0-4.6l6.2-3.56A3 3 0 0 0 18 8z" fill="currentColor"/></svg></button>' +
      '<div class="qs-track" aria-live="off">' + quoteSlidesHtml(list) + '</div>' +
      (list.length > 1
        ? '<div class="qs-nav"><button type="button" class="qs-arrow" data-qs="prev" aria-label="' + esc(tx("पिछला", "Previous")) + '">‹</button>' +
          '<span class="qs-dots">' + list.map(function (q, i) {
            return '<button type="button" class="qs-dot' + (i === 0 ? " is-active" : "") + '" data-qs="' + i + '" aria-label="' + esc(q.name) + '"></button>';
          }).join("") + '</span>' +
          '<button type="button" class="qs-arrow" data-qs="next" aria-label="' + esc(tx("अगला", "Next")) + '">›</button></div>'
        : '') +
      '</div>';
    wireQuoteSlider(box.querySelector(".qs"), list);
  }

  function wireQuoteSlider(root, list) {
    var n = list.length;
    if (!root) return;
    var idx = 0, paused = false;
    function show(i) {
      idx = (i + n) % n;
      Array.prototype.forEach.call(root.querySelectorAll(".qs-slide"), function (s, k) {
        s.classList.toggle("is-active", k === idx);
        s.setAttribute("aria-hidden", k === idx ? "false" : "true");
      });
      Array.prototype.forEach.call(root.querySelectorAll(".qs-dot"), function (d, k) { d.classList.toggle("is-active", k === idx); });
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-qs]") : null;
      if (!b) return;
      var v = b.getAttribute("data-qs");
      if (v === "share") {
        if (window.SwadhyayQuoteShare) window.SwadhyayQuoteShare.open(list[idx], { tx: tx, toast: toast });
        return;
      }
      show(v === "next" ? idx + 1 : v === "prev" ? idx - 1 : parseInt(v, 10));
    });
    if (n < 2) return;
    root.addEventListener("mouseenter", function () { paused = true; });
    root.addEventListener("mouseleave", function () { paused = false; });
    root.addEventListener("focusin", function () { paused = true; });
    root.addEventListener("focusout", function () { paused = false; });
    var sx = 0, sy = 0;
    root.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
    clearInterval(qotdTimer);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      qotdTimer = setInterval(function () {
        if (!document.body.contains(root)) { clearInterval(qotdTimer); return; }
        if (!paused && !document.hidden) show(idx + 1);
      }, 8000);
    }
  }

  function loadQuoteOfTheDay() {
    var box = document.getElementById("heroQuote");
    if (!box) return;
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(QOTD_KEY)); } catch (e) {}
    if (cached && cached.quotes && cached.quotes.length) renderQuoteSlider(box, cached.quotes);
    fetch("/api/quote-of-the-day").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.quotes || !d.quotes.length) return;
      try { sessionStorage.setItem(QOTD_KEY, JSON.stringify(d)); } catch (e) {}
      var live = document.getElementById("heroQuote");
      if (live && !(cached && cached.date === d.date)) renderQuoteSlider(live, d.quotes);
    }).catch(function () {});
  }

  function matchesQuery(book, q) {
    if (!q) return true;
    var ql = q.toLowerCase();
    if (book.title.toLowerCase().indexOf(ql) !== -1 || book.people.toLowerCase().indexOf(ql) !== -1) return true;
    if (book.tags.some(function (t) { return t.toLowerCase().indexOf(ql) !== -1; })) return true;
    // Roman/English-script fallback (e.g. "krishna" matching "कृष्ण"), and equally useful the
    // other way round for a Devanagari query with slightly different spelling conventions.
    var qRoman = normalizeRoman(devanagariToRoman(q));
    if (!qRoman) return false;
    if (book.titleRoman.indexOf(qRoman) !== -1 || book.authorRoman.indexOf(qRoman) !== -1) return true;
    /* Word-by-word: every typed word must appear somewhere in the title/people index, and a
       word may drop its trailing "a". The index spells Hindi words with their final schwa
       ("pada ratnakara") while people type "pad ratnakar", so a whole-phrase substring test
       misses them even though each word matches on its own. */
    var hay = book.titleRoman + " " + book.authorRoman;
    var haySkel = hay.replace(/a/g, "");
    return qRoman.split(" ").every(function (w) {
      if (hay.indexOf(w) !== -1) return true;
      var bare = w.replace(/a$/, "");
      if (bare.length >= 2 && bare !== w && hay.indexOf(bare) !== -1) return true;
      /* People also drop the schwas inside a word ("ramcharitmanas" for
         "ramacharitamanasa"), so as a last resort compare both with every "a" removed.
         Three or more letters left keeps this from matching on noise. */
      var skel = w.replace(/a/g, "");
      return skel.length >= 3 && haySkel.indexOf(skel) !== -1;
    });
  }

  var PAGE_SIZE = 40;
  var libraryState = { page: 1 };
  var panchangState = { dayOffset: 0 };
  var chatState = { history: [], busy: false, turns: [], pendingInput: "" };

  function viewLibrary(params) {
    var cat = params.get("cat") || "all";
    var q = params.get("q") || "";
    var tag = params.get("tag") || "";
    var sort = params.get("sort") || "default";
    var filter = params.get("filter") || "all";

    var list = BOOKS.filter(function (b) {
      return (cat === "all" || b.categoryKeys.indexOf(cat) !== -1) &&
        (!tag || b.tags.indexOf(tag) !== -1) &&
        matchesQuery(b, q);
    });

    if (filter === "short") list = list.filter(function (b) { return b.sizeKB < 150; });
    if (filter === "popular") list = list.filter(function (b) { return hashCode(b.file) % 3 === 0; });

    if (sort === "latest") list = list.slice().reverse();
    else if (sort === "az") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title, "hi"); });

    var meta = CATEGORY_BY_KEY[cat] || { hi: cat, en: cat };
    var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    var page = Math.min(libraryState.page, totalPages);
    var pageItems = list.slice(0, page * PAGE_SIZE);

    var heading = tag ? "#" + esc(tag) : esc(tx(meta.hi, meta.en));
    var html = '<div class="page-header">' +
      '<h1>' + heading + ' <span class="cnt">(' + list.length + ')</span></h1>' +
      '<div class="lib-search"><input id="librarySearch" type="text" placeholder="' + esc(tx("खोजें…", "Search…")) + '" value="' + esc(q) + '">' +
      taxLangToggleHtml() + '</div>' +
      '</div>';
    html += categoryTabs(cat);
    html += '<div class="filter-tabs">' +
      [["all", "सभी", "All"], ["popular", "लोकप्रिय", "Popular"], ["short", "लघु पाठ", "Short reads"]].map(function (f) {
        var key = f[0];
        return '<a class="filter-tab' + (filter === key ? " active" : "") + '" href="/library?cat=' + encodeURIComponent(cat) + '&filter=' + key + (q ? "&q=" + encodeURIComponent(q) : "") + '">' + esc(tx(f[1], f[2])) + '</a>';
      }).join("") +
      '<a class="filter-tab' + (sort === "latest" ? " active" : "") + '" href="/library?cat=' + encodeURIComponent(cat) + '&sort=latest">' + esc(tx("नवीनतम", "Latest")) + '</a>' +
      '</div>';

    if (!pageItems.length) {
      html += '<div class="empty-state">' + bilingual("कोई पुस्तक नहीं मिली", "No books found") + '</div>';
    } else {
      html += '<div class="book-grid">' + pageItems.map(bookCard).join("") + '</div>';
      if (page < totalPages) html += '<div class="load-more-wrap" id="libraryLoadSentinel"><span class="load-more-spinner"></span></div>';
    }
    return '<main class="content-pad">' + html + '</main>';
  }

  function genBlurb(book) {
    var meta = book.categoryMetas[0];
    var source = book.isGitaPress
      ? "गीता प्रेस की प्रामाणिक शैली में प्रकाशित"
      : "सुधी पाठकों के लिए सुलभ कराया गया";
    return "इस ग्रंथ का विषय — " + meta.hi + " — सनातन धर्म की समृद्ध परम्परा का अंग है। " +
      esc(book.author) + " द्वारा प्रस्तुत, " + source + " यह संस्करण सरल एवं सुगम पठन के लिए तैयार किया गया है।";
  }

  /* ---------------- table of contents ----------------
     The book page's विषय सूची mirrors the reader's own chapter list (buildReaderBook), so
     every entry opens in the in-app reader -- the chapter at /read/<slug>/<n>, and a
     Sub-Heading inside it at /read/<slug>/<n>?a=<anchor> -- instead of the raw .html file.
     The parsed book goes into readerCache, so opening the reader afterwards is instant. */
  /* Pages are flat in reader.chapters; the contents show them grouped by the chapter they were
     cut from -- the chapter's first page is the group header, its Sub-Heading pages are the
     children. Returns [{idx, subIdx:[page indexes]}]. */
  function groupPages(pages) {
    var groups = [];
    pages.forEach(function (pg, i) {
      if (!pg.isSub || !groups.length) groups.push({ idx: i, subIdx: [] });
      else groups[groups.length - 1].subIdx.push(i);
    });
    return groups;
  }

  function tocLink(href, text) {
    return '<a href="' + href + '">' + esc(text) + '</a>';
  }

  function renderTOCList(book, chapters) {
    if (!chapters.length) return '<div class="empty-state small">इस पुस्तक की विषय-सूची उपलब्ध नहीं है।</div>';
    function deeper(pg, i, level) {
      return (pg.subs || []).map(function (sb) {
        return '<li class="toc-item toc-level-' + level + '">' + tocLink(readPath(book, i) + "?a=" + encodeURIComponent(sb.anchorId), sb.text) + '</li>';
      }).join("");
    }
    return '<div class="toc-accordion">' + groupPages(chapters).map(function (g) {
      var head = chapters[g.idx];
      var kids = deeper(head, g.idx, 3) + g.subIdx.map(function (j) {
        return '<li class="toc-item toc-level-2">' + tocLink(readPath(book, j), chapters[j].label) + '</li>' + deeper(chapters[j], j, 3);
      }).join("");
      return '<div class="toc-section">' +
        '<div class="toc-section-header">' +
        (kids ? '<button class="toc-toggle" type="button" aria-label="विस्तार करें">▸</button>' : '<span class="toc-toggle-spacer"></span>') +
        tocLink(readPath(book, g.idx), head.label) +
        '</div>' + (kids ? '<ul class="toc-children">' + kids + '</ul>' : '') + '</div>';
    }).join("") + '</div>';
  }

  function loadTOC(book, panel) {
    if (readerCache[book.id]) { panel.innerHTML = renderTOCList(book, readerCache[book.id].chapters); return; }
    panel.innerHTML = '<div class="empty-state small">विषय-सूची लोड हो रही है…</div>';
    fetch(book.href).then(function (res) {
      if (!res.ok) throw new Error("fetch failed");
      return res.text();
    }).then(function (htmlText) {
      var entry = readerCache[book.id] || buildReaderBook(book.id, htmlText);
      panel.innerHTML = renderTOCList(book, entry.chapters);
    }).catch(function () {
      panel.innerHTML = '<div class="empty-state small">विषय-सूची लोड नहीं हो सकी। पुस्तक खोलकर देखें।</div>';
    });
  }

  /* ---------------- in-app book reader ----------------
     Books are fetched, split into "chapters" at every <hr class="page-break"> (the
     universal chapter-boundary convention used across the whole library), and rendered
     one chapter at a time inside a sandboxed same-origin iframe. The iframe keeps every
     book's own master.css (with its hard-coded per-class colors) fully isolated from the
     app shell's own styles -- master.css resets bare tags like body/div/p/img, which would
     otherwise wreck the app chrome if loaded globally. */
  var READER_THEMES = ["day", "night", "sepia"];
  var readerCache = {};              // bookId -> { headHtml, chapters:[{label, html, subs}] }
  var READER_LINE_HEIGHT_MIN = 0.8, READER_LINE_HEIGHT_MAX = 2.5, READER_LINE_HEIGHT_STEP = 0.1;
  var reader = { open: false, bookId: null, book: null, headHtml: "", chapters: null, idx: 0, theme: "day", fontSize: 19, lineHeight: 1.6, expandedChapters: {}, arthHidden: false };

  /* Per book (swith_arth books only): whether the reader last left the meaning/commentary hidden. */
  function getArthHidden(book) {
    return !!(book && book.swithArth && readJSON(LS.readerArth, {})[book.file]);
  }
  function setArthHidden(book, hidden) {
    var m = readJSON(LS.readerArth, {});
    if (hidden) m[book.file] = true; else delete m[book.file];
    writeJSON(LS.readerArth, m);
  }

  function getReaderTheme() {
    var t = localStorage.getItem(LS.readerTheme);
    return READER_THEMES.indexOf(t) !== -1 ? t : "day";
  }
  function setReaderTheme(t) {
    if (READER_THEMES.indexOf(t) === -1) t = "day";
    try { localStorage.setItem(LS.readerTheme, t); } catch (e) {}
    return t;
  }
  function getReaderFontSize() {
    var n = parseInt(localStorage.getItem(LS.readerFont), 10);
    return (n >= 12 && n <= 32) ? n : 19;
  }
  function setReaderFontSize(n) {
    n = Math.max(12, Math.min(32, n));
    try { localStorage.setItem(LS.readerFont, String(n)); } catch (e) {}
    return n;
  }
  function getReaderLineHeight() {
    var n = parseFloat(localStorage.getItem(LS.readerLineHeight));
    return (n >= READER_LINE_HEIGHT_MIN && n <= READER_LINE_HEIGHT_MAX) ? n : 1.6;
  }
  function setReaderLineHeight(n) {
    n = Math.round(Math.max(READER_LINE_HEIGHT_MIN, Math.min(READER_LINE_HEIGHT_MAX, n)) * 10) / 10;
    try { localStorage.setItem(LS.readerLineHeight, String(n)); } catch (e) {}
    return n;
  }

  /* ---- bookmarks: { [bookId]: [ {chapterIdx, label, ts} ] } ---- */
  function getAllBookmarks() { return readJSON(LS.bookmarks, {}); }
  function getBookmarks(bookId) { return getAllBookmarks()[bookId] || []; }
  function isChapterBookmarked(bookId, chapterIdx) {
    return getBookmarks(bookId).some(function (b) { return b.chapterIdx === chapterIdx; });
  }
  function toggleBookmark(bookId, chapterIdx, label) {
    var all = getAllBookmarks();
    var list = all[bookId] || [];
    var idx = list.findIndex(function (b) { return b.chapterIdx === chapterIdx; });
    if (idx !== -1) { list.splice(idx, 1); }
    else { list.push({ chapterIdx: chapterIdx, label: label, ts: Date.now() }); list.sort(function (a, b) { return a.chapterIdx - b.chapterIdx; }); }
    all[bookId] = list;
    writeJSON(LS.bookmarks, all);
    return idx === -1;
  }

  /* ---- highlights: { [bookId]: { [chapterIdx]: [ {text, ts, color} ] } } ---- */
  function getAllHighlights() { return readJSON(LS.highlights, {}); }
  function getChapterHighlights(bookId, chapterIdx) {
    var byBook = getAllHighlights()[bookId] || {};
    return byBook[chapterIdx] || [];
  }
  function addHighlightEntry(bookId, chapterIdx, text) {
    if (!text || !text.trim()) return;
    var all = getAllHighlights();
    var byBook = all[bookId] || {};
    var list = byBook[chapterIdx] || [];
    list.push({ text: text, ts: Date.now(), color: "#ffe58a" });
    byBook[chapterIdx] = list;
    all[bookId] = byBook;
    writeJSON(LS.highlights, all);
  }
  function removeHighlightEntry(bookId, chapterIdx, text) {
    var all = getAllHighlights();
    var byBook = all[bookId] || {};
    var list = byBook[chapterIdx] || [];
    var idx = list.findIndex(function (h) { return h.text === text; });
    if (idx !== -1) list.splice(idx, 1);
    byBook[chapterIdx] = list;
    all[bookId] = byBook;
    writeJSON(LS.highlights, all);
  }

  // Every book built into this library separates chapters/sections with this exact
  // marker, regardless of whatever wrapper markup (plain <p>s, or <section><div>) sits
  // around it -- so a plain string split is far more robust here than trying to
  // re-group an arbitrarily-nested DOM tree.
  function splitBookChapters(bodyHtml) {
    var raw = bodyHtml.split(/<hr[^>]*\bclass=["']page-break["'][^>]*>/i);
    var chunks = raw.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    return chunks.length ? chunks : [bodyHtml];
  }

  // Only these top-level classes start a new reader "chapter". Sub-Heading (and its
  // variants), verse/meter labels like "Numbers", etc. are section markers *within* a
  // chapter -- they must never split it, however print pagination happened to fall, so
  // they're deliberately left out of this list (see buildReaderBook).
  var CHAPTER_LABEL_CLASSES = ["Title-Page---Book-Name", "Heading", "Chapter-Number"];

  function stripTagsForLabel(s) {
    return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
  }

  // Returns the chunk's own heading/sub-heading text, or null if it has none at all
  // (a page-break with no new section -- just a leftover print-pagination split).
  function findChapterHeading(chunkHtml) {
    for (var i = 0; i < CHAPTER_LABEL_CLASSES.length; i++) {
      // Match the class as a whole token in the attribute (bounded by quote/whitespace),
      // not just a \b-bounded substring -- otherwise a search for "Heading" also matches
      // class="Sub-Heading", since "-" isn't a word character.
      var re = new RegExp('<p[^>]*\\bclass="(?:[^"]*\\s)?' + CHAPTER_LABEL_CLASSES[i] + '(?:\\s[^"]*)?"[^>]*>([\\s\\S]*?)</p>');
      var m = chunkHtml.match(re);
      if (m) {
        var text = stripTagsForLabel(m[1]);
        if (text) return text.length > 60 ? text.slice(0, 57) + "…" : text;
      }
    }
    return null;
  }

  // The reader has its own TOC drawer, so a book's own baked-in "विषय-सूची" page
  // (in any of its hyphen/dash/space spellings) is redundant here and gets dropped.
  function isTocLabel(label) {
    return label.replace(/[\s\-–—]/g, "") === "विषयसूची";
  }

  // Sub-Heading-level markers never split a chapter (see CHAPTER_LABEL_CLASSES above),
  // but they're still real structure worth surfacing in the TOC -- nested under their
  // enclosing chapter rather than as siblings of it.
  var SUB_HEADING_CLASSES = ["Sub-Heading", "Sub-Heading-2", "Sub-Heading-3", "Sub-Heading-4"];

  // Finds every Sub-Heading-class paragraph in a (already chapter-merged) chunk of HTML,
  // gives each one a stable anchor id (reusing an existing id="" if the source already had
  // one, e.g. "Chapter_8_1"), and returns the patched HTML plus the {text, anchorId} list.
  function extractSubHeadings(html, chapterIdx) {
    var subs = [];
    var counter = 0;
    var classRe = new RegExp('\\bclass="(?:[^"]*\\s)?(?:' + SUB_HEADING_CLASSES.join("|") + ')(?:\\s[^"]*)?"');
    var idRe = /\bid="([^"]+)"/;
    var newHtml = html.replace(/<p\s+([^>]*)>([\s\S]*?)<\/p>/g, function (whole, attrs, inner) {
      if (!classRe.test(attrs)) return whole;
      var text = stripTagsForLabel(inner);
      if (!text) return whole;
      counter++;
      var idMatch = attrs.match(idRe);
      var anchorId;
      if (idMatch) {
        anchorId = idMatch[1];
      } else {
        anchorId = "rdr-sub-" + chapterIdx + "-" + counter;
        attrs = 'id="' + anchorId + '" ' + attrs;
      }
      subs.push({ text: text.length > 70 ? text.slice(0, 67) + "…" : text, anchorId: anchorId });
      return '<p ' + attrs + '>' + inner + '</p>';
    });
    return { html: newHtml, subs: subs };
  }

  /* Cuts one chapter's HTML at every <p class="Sub-Heading"> (only that level -- the
     deeper Sub-Heading-2/3/4 stay inside their page, still reachable from the contents).
     A page shorter than READER_MIN_PAGE_CHARS is never closed, so a bare Heading followed
     straight away by a Sub-Heading, or a one-line section, rides along with the next
     section rather than becoming a page of its own.
     Returns [{html, label, len}] -- label is the Sub-Heading text for pages that open with one. */
  var READER_MIN_PAGE_CHARS = 800;
  var READER_LAYOUT = 2;   // 1 = one page per chapter (old), 2 = pages cut at Sub-Headings
  function splitAtSubHeadings(html) {
    var re = /<p\b[^>]*\bclass="(?:[^"]*\s)?Sub-Heading(?:\s[^"]*)?"[^>]*>/g;
    var starts = [], m;
    while ((m = re.exec(html))) starts.push(m.index);
    if (!starts.length) return [{ html: html, label: null, len: stripTagsForLabel(html).length }];
    var segs = [{ html: html.slice(0, starts[0]), label: null }];
    starts.forEach(function (st, k) {
      var seg = html.slice(st, k + 1 < starts.length ? starts[k + 1] : html.length);
      var inner = seg.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      var text = inner ? stripTagsForLabel(inner[1]) : "";
      segs.push({ html: seg, label: text.length > 60 ? text.slice(0, 57) + "…" : text });
    });
    var pages = [];
    var cur = null;
    segs.forEach(function (seg) {
      seg.len = stripTagsForLabel(seg.html).length;
      if (cur && cur.len >= READER_MIN_PAGE_CHARS) { pages.push(cur); cur = null; }
      if (!cur) { cur = { html: seg.html, label: seg.label, len: seg.len }; return; }
      cur.html += seg.html;
      cur.len += seg.len;
      if (!cur.label) cur.label = seg.label;
    });
    if (cur) pages.push(cur);
    // Whatever opened the chapter before its first Sub-Heading is the chapter's own page.
    pages.forEach(function (pg, i) { if (i === 0) pg.label = null; });
    return pages.filter(function (pg) { return pg.len > 0 || pg.html.indexOf("<img") !== -1; });
  }

  /* A book whose headings are not separated by page-break markers (e.g. one long run of
     paragraphs with Heading paragraphs in it) still gets one reader page per Heading: the
     chunk is cut at every Heading / Chapter-Number / Book-Name paragraph. A cut-off piece
     that is only a title (a Heading straight followed by another) rides along with the next
     piece so a two-line title never becomes a page of its own. */
  /* Bhajan books (भजन-संग्रह): every bhajan is a paragraph carrying id="bhajan_<section>_<no>".
     Each bhajan is its own reader page, whatever its length (no minimum-size merging). A
     Sub-Heading sitting just above a bhajan's number ("स्तुति", "नाम" ...) opens that bhajan's
     page rather than closing the previous one. The first bhajan of a chapter stays on the
     chapter's own page, with the section Heading. Returns null when the chapter has none. */
  var BHAJAN_ID_RE = /<p\b[^>]*\bid="bhajan_[^"]*"[^>]*>/g;
  function bhajanLabel(html) {
    var num = html.match(/<p\b[^>]*\bid="bhajan_\d+_(\d+)"[^>]*>/);
    var NUM_DIGITS = "०१२३४५६७८९";
    var no = num ? num[1].replace(/\d/g, function (d) { return NUM_DIGITS.charAt(+d); }) : "";
    var first = html.match(/<p\b[^>]*\bclass="(?:[^"]*\s)?Shlok(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/p>/);
    var line = first ? stripTagsForLabel(first[1]) : "";
    var label = (no ? no + ". " : "") + line;
    return label.length > 60 ? label.slice(0, 57) + "…" : label;
  }
  function splitAtBhajans(html) {
    var starts = [], m;
    BHAJAN_ID_RE.lastIndex = 0;
    while ((m = BHAJAN_ID_RE.exec(html))) starts.push(m.index);
    if (!starts.length) return null;
    var cuts = starts.slice(1).map(function (st) {
      for (;;) {                                  // take in the Sub-Heading(s) right above it
        var before = html.slice(0, st).replace(/\s+$/, "");
        if (before.slice(-4) !== "</p>") return st;
        var ps = before.lastIndexOf("<p");
        if (ps < 0 || !/^<p\b[^>]*\bclass="(?:[^"]*\s)?Sub-Heading/.test(before.slice(ps))) return st;
        st = ps;
      }
    });
    var edges = [0].concat(cuts, [html.length]);
    var pages = [];
    for (var k = 0; k + 1 < edges.length; k++) {
      var seg = html.slice(edges[k], edges[k + 1]);
      pages.push({ html: seg, label: k === 0 ? null : bhajanLabel(seg), len: stripTagsForLabel(seg).length });
    }
    return pages.filter(function (pg) { return pg.len > 0 || pg.html.indexOf("<img") !== -1; });
  }

  var HEADING_START_RE = /<p\b[^>]*\bclass="(?:[^"]*\s)?(?:Title-Page---Book-Name|Heading|Chapter-Number)(?:\s[^"]*)?"[^>]*>/g;
  var TITLE_ONLY_CHARS = 100;
  function splitAtHeadings(html) {
    var starts = [], m;
    HEADING_START_RE.lastIndex = 0;
    while ((m = HEADING_START_RE.exec(html))) starts.push(m.index);
    // Whatever sits between the page break and the chunk's first Heading (an invocation line,
    // verses, a picture) belongs to that Heading, exactly as before -- so the first cut is
    // at the SECOND heading, never at the first.
    if (starts.length < 2) return [html];
    var cuts = [0].concat(starts.slice(1));
    var pieces = cuts.map(function (st, k) { return html.slice(st, k + 1 < cuts.length ? cuts[k + 1] : html.length); });
    var out = [], carry = "";
    pieces.forEach(function (pc, k) {
      pc = carry + pc;
      carry = "";
      var txt = stripTagsForLabel(pc);
      if (k < pieces.length - 1 && txt.length < TITLE_ONLY_CHARS && pc.indexOf("<img") === -1) { carry = pc; return; }
      if (txt.length || pc.indexOf("<img") !== -1) out.push(pc);
    });
    // A title-only leftover at the very end stays on the page before it, as it always did.
    if (carry) { if (out.length) out[out.length - 1] += carry; else out.push(carry); }
    return out.length ? out : [html];
  }

  var SAMBANDH_START_RE = /^\s*<p\s[^>]*\bclass="(?:[^"]*\s)?Sambandh(?:\s[^"]*)?"/;

  // "श्लोक-४" / "श्लोक-४–५" from the Shlok-Number lines of a सम्बन्ध-led page; falls back to
  // the opening words of the सम्बन्ध paragraph itself.
  function sambandhLabel(html) {
    var nums = [], re = /<p\s[^>]*\bclass="(?:[^"]*\s)?Shlok-Number(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/p>/g, m;
    while ((m = re.exec(html))) {
      var t = stripTagsForLabel(m[1]).replace(/^[\(\[\s]+|[\)\]\s]+$/g, "");
      if (t) nums.push(t);
    }
    if (nums.length) {
      var first = nums[0], last = nums[nums.length - 1].split(/[-–]/).pop();
      return nums.length > 1 && last && first.indexOf(last) === -1 ? first + "–" + last : first;
    }
    // Verses numbered inline at the end of their last line ("…सञ्जय॥१") -> "श्लोक-१" / "श्लोक-४–६"
    var vre = /<p\s[^>]*\bclass="(?:[^"]*\s)?(?:Shlok|Etalic)[^"]*"[^>]*>([\s\S]*?)<\/p>/g, vn = [];
    while ((m = vre.exec(html))) {
      var vm = stripTagsForLabel(m[1]).replace(/\*/g, "").match(/॥\s*([०-९]+)$/);
      if (vm) vn.push(vm[1]);
    }
    if (vn.length) return "श्लोक-" + vn[0] + (vn.length > 1 && vn[vn.length - 1] !== vn[0] ? "–" + vn[vn.length - 1] : "");
    var sm = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    var text = sm ? stripTagsForLabel(sm[1]) : "";
    return text.length > 60 ? text.slice(0, 57) + "…" : (text || "सम्बन्ध");
  }

  /* A chapter with no Headings or Sub-Headings inside it (the Ramcharitmanas kandas: one 1.5 MB, 6,000-paragraph,
     400,000 px-tall page) is slow to open and to scroll. Any page longer than READER_LONG_PAGE characters is
     cut into parts of about READER_PAGE_TARGET characters, always between two paragraphs and, when it can, right
     after a numbered unit (a doha: "... ॥ ३६॥"). The parts are named by the numbers they hold ("दोहा ३७–७२"),
     or "भाग N". Returns null when the page is short enough. */
  var READER_LONG_PAGE = 60000, READER_PAGE_TARGET = 40000;
  var UNIT_END_RE = /॥\s*[०-९0-9]+\s*(?:\([^)<]{0,6}\))?\s*॥?\s*(?:<[^>]*>\s*)*$/;
  var UNIT_NUM_RE = /(?:दो०|सो०)[^॥]{0,400}?॥\s*([०-९0-9]+)/g;     // the number that closes a doha / sortha
  function splitLongPage(html) {
    if (html.length <= READER_LONG_PAGE) return null;
    var re = /<\/p>/g, m, cuts = [], last = 0;
    while ((m = re.exec(html))) {
      var end = m.index + 4, acc = end - last;
      if (acc < READER_PAGE_TARGET) continue;
      // (tags stripped first: a doha's number sits in its own <span> now, between the ॥ and the digits)
      if (acc >= READER_LONG_PAGE || UNIT_END_RE.test(html.slice(Math.max(last, end - 400), m.index).replace(/<[^>]+>/g, ""))) { cuts.push(end); last = end; }
    }
    if (!cuts.length) return null;
    if (html.length - cuts[cuts.length - 1] < READER_PAGE_TARGET * 0.3) cuts.pop();      // no tiny last part
    if (!cuts.length) return null;
    var edges = [0].concat(cuts, [html.length]), parts = [];
    for (var k = 0; k + 1 < edges.length; k++) {
      var seg = html.slice(edges[k], edges[k + 1]), text = stripTagsForLabel(seg), nums = [], nm;
      UNIT_NUM_RE.lastIndex = 0;
      while ((nm = UNIT_NUM_RE.exec(text))) nums.push(nm[1]);
      var label = "भाग " + (k + 1);
      if (nums.length) label = "दोहा " + nums[0] + (nums[nums.length - 1] !== nums[0] ? "–" + nums[nums.length - 1] : "");
      parts.push({ html: seg, label: label, len: text.length });
    }
    return parts;
  }

  function buildReaderBook(bookId, htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var headHtml = doc.head ? doc.head.innerHTML : "";
    /* Every book links its stylesheet as ../../master.css, which only resolves to the site root when the book is
       served from the site. From a CDN folder that path would land on the CDN, so point it back at the site. */
    if (CDN_BOOKS) headHtml = headHtml.replace(/(["'])(?:\.\.\/)+master\.css/g, function (m, q) { return q + new URL("master.css", document.baseURI).href; });
    var bodyHtml = doc.body ? doc.body.innerHTML : htmlText;
    var rawChunks = splitBookChapters(bodyHtml);

    /* "Legacy" chapter numbers (one chapter per page-break chunk, before pages were cut at
       Headings / Sub-Headings) are still what an old bookmark, highlight or resume point
       refers to, so every chunk remembers which legacy chapter it came from. */
    var rawLegacy = [], legacyCount = 0, sawLegacyHeading = false;
    rawChunks.forEach(function (html, r) {
      var h = findChapterHeading(html);
      if (h && isTocLabel(h)) { rawLegacy[r] = -1; return; }
      if (h) { legacyCount++; sawLegacyHeading = true; }
      else if (!(sawLegacyHeading && legacyCount)) legacyCount++;
      rawLegacy[r] = legacyCount - 1;
    });

    var chunks = [];
    rawChunks.forEach(function (html, r) {
      if (rawLegacy[r] === -1) return;           // the book's own built-in contents page
      splitAtHeadings(html).forEach(function (piece) { chunks.push({ html: piece, legacy: rawLegacy[r] }); });
    });

    var chapters = [];
    var sawRealHeading = false;
    var lastHeadingLabel = "";
    chunks.forEach(function (chunk) {
      var html = chunk.html;
      var heading = findChapterHeading(html);
      if (heading && isTocLabel(heading)) return;

      if (heading) {
        chapters.push({ html: html, label: heading, legacy: chunk.legacy });
        lastHeadingLabel = heading;
        sawRealHeading = true;
      } else if (sawRealHeading && chapters.length && SAMBANDH_START_RE.test(html)) {
        // A page break placed right before a "सम्बन्ध—" paragraph is a deliberate section
        // start (one per verse group in साधक-संजीवनी), not a print-pagination leftover: it
        // becomes its own page, listed under the chapter above and named after its श्लोक numbers.
        chapters.push({ html: html, label: sambandhLabel(html), parentLabel: lastHeadingLabel, sub: true, legacy: chunk.legacy });
      } else if (sawRealHeading && chapters.length) {
        // No heading here -- just a leftover page-break inside the chapter above
        // (e.g. print-pagination remnants), so fold it into that chapter instead of
        // spawning a spurious, unlabelled "पृष्ठ N" entry of its own.
        chapters[chapters.length - 1].html += html;
      } else {
        // Nothing headed has appeared yet (or this book has no headings anywhere) --
        // keep the old per-page fallback so headless books still paginate sensibly.
        chapters.push({ html: html, label: "पृष्ठ " + (chapters.length + 1), legacy: chunk.legacy });
      }
    });

    /* Each chapter is then cut into reader pages at every Sub-Heading, so a long chapter is
       a run of short pages instead of one endless scroll. The books themselves stay as they
       are -- this only changes how the reader slices them. */
    var pages = [], legacyFirst = [], legacyPieces = [];
    /* l2First / l2Pieces: where each page of the previous layout (cut at Sub-Headings only,
       READER_LAYOUT 2) went, so saved positions in a bhajan book can be carried over. */
    var l2First = [], l2Pieces = [], l2Count = 0, hasBhajans = false, hasLongSplit = false;
    chapters.forEach(function (ch) {
      var bhajanPages = splitAtBhajans(ch.html);
      var l2 = bhajanPages ? splitAtSubHeadings(ch.html) : null, firstNew = pages.length;
      var base = bhajanPages || splitAtSubHeadings(ch.html), list = [];
      base.forEach(function (bp, bi) {                 // very long pages are cut into parts (never bhajan pages)
        var parts = bhajanPages ? null : splitLongPage(bp.html);
        if (!parts) { list.push({ html: bp.html, label: bp.label, len: bp.len, bi: bi, part: 0 }); return; }
        hasLongSplit = true;
        parts.forEach(function (pt, pi) { list.push({ html: pt.html, label: pi === 0 ? bp.label : pt.label, len: pt.len, bi: bi, part: pi }); });
      });
      var l2Map = {};
      list.forEach(function (piece, j) {
        var extracted = extractSubHeadings(piece.html, pages.length);
        var subs = extracted.subs;
        // A sub page opens with its own Sub-Heading, which is already the page's label.
        if (j > 0 && piece.part === 0 && subs.length) subs = subs.slice(1);
        if (bhajanPages) { subs = []; hasBhajans = true; }
        pages.push({
          html: extracted.html,
          label: j === 0 ? ch.label : piece.label,
          parentLabel: ch.parentLabel || ch.label,
          legacy: ch.legacy,
          isSub: j > 0 || !!ch.sub,
          subs: subs
        });
        var L = ch.legacy;
        if (legacyFirst[L] === undefined) legacyFirst[L] = pages.length - 1;
        (legacyPieces[L] = legacyPieces[L] || []).push({ idx: pages.length - 1, len: piece.len });
        if (!bhajanPages) (l2Map[piece.bi] = l2Map[piece.bi] || []).push({ idx: pages.length - 1, len: piece.len });
      });
      if (!bhajanPages) {                              // each layout-2 page -> the page(s) it became
        base.forEach(function (bp, bi) { l2First[l2Count] = l2Map[bi][0].idx; l2Pieces[l2Count] = l2Map[bi]; l2Count++; });
      }
      if (bhajanPages) {
        // old page -> the bhajan pages that overlap it (by running text length)
        var newEnds = [], acc = 0;
        bhajanPages.forEach(function (bp, q) { acc += bp.len; newEnds.push({ idx: firstNew + q, from: acc - bp.len, to: acc }); });
        var oldAcc = 0;
        l2.forEach(function (op) {
          var a = oldAcc, b = oldAcc + op.len, hits = [];
          oldAcc = b;
          newEnds.forEach(function (ne) {
            var ov = Math.min(b, ne.to) - Math.max(a, ne.from);
            if (ov > 0 || (op.len === 0 && ne.from <= a && a < ne.to)) hits.push({ idx: ne.idx, len: Math.max(ov, 0) });
          });
          if (!hits.length) hits.push({ idx: firstNew, len: 0 });
          l2First[l2Count] = hits[0].idx;
          l2Pieces[l2Count] = hits;
          l2Count++;
        });
      }
    });
    var entry = { headHtml: headHtml, chapters: pages, legacyFirst: legacyFirst, legacyPieces: legacyPieces,
      l2First: l2First, l2Pieces: l2Pieces, layout: hasBhajans ? 3 : hasLongSplit ? 4 : READER_LAYOUT };
    readerCache[bookId] = entry;
    return entry;
  }

  /* Saved bookmarks, highlights and the resume point are keyed by page number. Before the
     reader cut chapters at Sub-Headings (layout 1) a "page" was a whole chapter, so those
     numbers are re-pointed once per book at the page that now holds the same spot. */
  function migrateReaderLayout(bookId, entry) {
    var done = readJSON(LS.readerLayout, {});
    var layoutTarget = entry.layout || READER_LAYOUT;      // 3 = one page per bhajan (भजन-संग्रह); 4 = very long pages cut into parts
    if (done[bookId] === layoutTarget) return;
    // saved positions already in layout 2 (cut at Sub-Headings) move from there, older ones from the chapters
    var fromL2 = (layoutTarget === 3 || layoutTarget === 4) && done[bookId] === 2;
    var first = fromL2 ? entry.l2First : entry.legacyFirst, pieces = fromL2 ? entry.l2Pieces : entry.legacyPieces;

    var reads = getReads();
    var r = reads[bookId];
    if (r && typeof r.lastChapter === "number" && pieces[r.lastChapter]) {
      var list = pieces[r.lastChapter];
      var total = list.reduce(function (n, p) { return n + p.len; }, 0) || 1;
      var target = (r.scrollPct || 0) * total, acc = 0, hit = list[list.length - 1], within = 1;
      for (var k = 0; k < list.length; k++) {
        if (target <= acc + list[k].len || k === list.length - 1) { hit = list[k]; within = list[k].len ? Math.min(1, (target - acc) / list[k].len) : 0; break; }
        acc += list[k].len;
      }
      r.lastChapter = hit.idx;
      r.scrollPct = Math.max(0, within);
      setReads(reads);
    }

    var marks = getAllBookmarks();
    if (marks[bookId] && marks[bookId].length) {
      var seen = {};
      marks[bookId] = marks[bookId].map(function (b) {
        return typeof first[b.chapterIdx] === "number" ? { chapterIdx: first[b.chapterIdx], label: b.label, ts: b.ts } : null;
      }).filter(function (b) {
        if (!b || seen[b.chapterIdx]) return false;
        seen[b.chapterIdx] = true;
        return true;
      }).sort(function (a, b) { return a.chapterIdx - b.chapterIdx; });
      writeJSON(LS.bookmarks, marks);
    }

    var hl = getAllHighlights();
    var old = hl[bookId];
    if (old) {
      var moved = {};
      Object.keys(old).forEach(function (key) {
        var plist = pieces[key];
        if (!plist || !plist.length) return;
        (old[key] || []).forEach(function (h) {
          var dest = plist[0].idx;
          for (var k = 0; k < plist.length; k++) {
            if (stripTagsForLabel(entry.chapters[plist[k].idx].html).indexOf(h.text) !== -1) { dest = plist[k].idx; break; }
          }
          (moved[dest] = moved[dest] || []).push(h);
        });
      });
      hl[bookId] = moved;
      writeJSON(LS.highlights, hl);
    }

    done[bookId] = layoutTarget;
    writeJSON(LS.readerLayout, done);
  }

  /* ---------------- search within the open book ----------------
     Each reader page's text is matched forgivingly (case, zero-width joiners and the visarga/colon spelling are
     ignored). A result is (page, nth occurrence on that page); the page's iframe later re-runs the same match on
     its own DOM (__readerFindLocate) to find and mark exactly that occurrence. */
  var FIND_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, BUTTON: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  var FIND_COMBINING_RE = /[ऀ-ःऺ-ॏ॑-ॗॢॣ]/;
  var FIND_BATCH = 200;
  var findTpl = null;

  function findTextEligible(node) {
    for (var p = node.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (FIND_SKIP_TAGS[p.nodeName] || (p.classList && p.classList.contains("rdr-bar"))) return false;
    }
    return true;
  }

  // All the text under root as one string, plus where each text node starts inside it.
  function findCollect(doc, root) {
    var walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
    var segs = [], parts = [], len = 0, n;
    while ((n = walker.nextNode())) {
      if (!findTextEligible(n)) continue;
      var v = n.nodeValue;
      segs.push({ node: n, start: len });
      parts.push(v);
      len += v.length;
    }
    return { raw: parts.join(""), segs: segs };
  }

  // Lower-cases, drops zero-width characters, maps visarga to ":" (the books often spell it "दु:ख"), splits
  // precomposed nukta letters and collapses whitespace. map[i] = index in `str` that normalised char i came from.
  function findNorm(str, wantMap) {
    var out = [], map = wantMap ? [] : null, lastSpace = false;
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i), r;
      if (code === 0xAD || (code >= 0x200B && code <= 0x200D) || code === 0x2060 || code === 0xFEFF) continue;
      if (code === 32 || (code >= 9 && code <= 13) || code === 0xA0) {
        if (lastSpace) continue;
        lastSpace = true; r = " ";
      } else {
        lastSpace = false;
        if (code < 128) r = (code >= 65 && code <= 90) ? String.fromCharCode(code + 32) : str.charAt(i);
        else if (code === 0x0903) r = ":";
        else if (code >= 0x0900 && code <= 0x097F && !(code >= 0x0958 && code <= 0x095F)) r = str.charAt(i);
        else r = str.charAt(i).toLowerCase().normalize("NFD");
      }
      out.push(r);
      if (map) for (var k = 0; k < r.length; k++) map.push(i);
    }
    return { text: out.join(""), map: map };
  }

  // Non-overlapping occurrences of query in raw, as [start, end) offsets into raw.
  function findMatches(raw, query) {
    var nq = findNorm(query).text.trim();
    if (nq.length < 2) return [];
    var nr = findNorm(raw, true), hay = nr.text, map = nr.map, res = [], p = 0;
    while ((p = hay.indexOf(nq, p)) !== -1) {
      var e = map[p + nq.length - 1] + 1;
      // a match that stops before a vowel sign / anusvara / virama would leave it dangling outside the highlight
      while (e < raw.length && FIND_COMBINING_RE.test(raw.charAt(e))) e++;
      res.push({ s: map[p], e: e });
      p += nq.length;
    }
    return res;
  }

  function findChapterRaw(ch) {
    if (typeof ch._raw === "string") return ch._raw;
    if (!findTpl) findTpl = document.createElement("template");
    findTpl.innerHTML = ch.html;
    ch._raw = findCollect(document, findTpl.content).raw;
    findTpl.innerHTML = "";
    return ch._raw;
  }

  // Wraps raw[s, e) in <mark class="rdr-find"> (one per text node it spans); returns the first mark.
  function findMark(doc, segs, s, e) {
    var hit = [], first = null, i;
    for (i = 0; i < segs.length; i++) {
      var a = segs[i].start, b = a + segs[i].node.nodeValue.length;
      if (b <= s) continue;
      if (a >= e) break;
      hit.push({ node: segs[i].node, from: Math.max(s, a) - a, to: Math.min(e, b) - a });
    }
    for (i = hit.length - 1; i >= 0; i--) {     // last first, so splitting never shifts a pending offset
      var t = hit[i], node = t.node;
      if (t.to < node.nodeValue.length) node.splitText(t.to);
      var mid = t.from > 0 ? node.splitText(t.from) : node;
      var mk = doc.createElement("mark");
      mk.className = "rdr-find";
      mid.parentNode.insertBefore(mk, mid);
      mk.appendChild(mid);
      first = mk;
    }
    return first;
  }

  window.__readerFindLocate = function (doc, n) {
    var f = reader.find;
    if (!reader.open || !f || !f.query) return null;
    var col = findCollect(doc, doc.body);
    var hits = findMatches(col.raw, f.query);
    if (!hits.length) return null;
    var h = hits[Math.min(n, hits.length - 1)];
    return findMark(doc, col.segs, h.s, h.e);
  };

  function readerPageLabel(ch) { return ch.isSub ? ch.parentLabel + " › " + ch.label : ch.label; }

  function readerFindSnippet(raw, s, e) {
    var a = Math.max(0, s - 36), b = Math.min(raw.length, e + 70);
    while (a < s && FIND_COMBINING_RE.test(raw.charAt(a))) a++;
    while (b < raw.length && FIND_COMBINING_RE.test(raw.charAt(b))) b++;
    function sp(x) { return esc(x.replace(/\s+/g, " ")); }
    return (a > 0 ? "…" : "") + sp(raw.slice(a, s)) + "<mark>" + sp(raw.slice(s, e)) + "</mark>" + sp(raw.slice(e, b)) + (b < raw.length ? "…" : "");
  }

  function readerFindStatus(st) {
    var el = document.getElementById("readerFindStatus"), more = document.getElementById("readerFindMore");
    if (!el) return;
    var msg, showMore = false;
    if (!st) msg = "किसी शब्द या वाक्यांश को खोजें (कम से कम 2 अक्षर)।";
    else if (st.tooShort) msg = "कम से कम 2 अक्षर लिखें।";
    else if (st.running) msg = "खोज रहे हैं… " + Math.round(100 * st.next / reader.chapters.length) + "%" + (st.results.length ? " · " + st.results.length + " परिणाम" : "");
    else if (!st.results.length) msg = "“" + st.query + "” के लिए कोई परिणाम नहीं मिला।";
    else if (st.next >= reader.chapters.length) msg = st.results.length + " परिणाम";
    else { msg = "पहले " + st.results.length + " परिणाम दिखाए गए हैं।"; showMore = true; }
    el.textContent = msg;
    if (more) more.hidden = !showMore;
  }

  function readerFindRender(st, reset) {
    var ul = document.getElementById("readerFindResults");
    if (!ul) return;
    if (reset) { ul.innerHTML = ""; st.rendered = 0; }
    var html = "", total = reader.chapters.length;
    for (var i = st.rendered; i < st.results.length; i++) {
      var r = st.results[i], ch = reader.chapters[r.idx];
      html += '<li class="reader-find-item" data-i="' + i + '" tabindex="0" role="button">' +
        '<div class="reader-find-meta">' + esc(readerPageLabel(ch)) + ' <span>· ' + (r.idx + 1) + ' / ' + total + '</span></div>' +
        '<div class="reader-find-snippet">' + readerFindSnippet(ch._raw, r.s, r.e) + '</div></li>';
    }
    st.rendered = st.results.length;
    if (html) ul.insertAdjacentHTML("beforeend", html);
    readerFindStatus(st);
  }

  // Scans pages in short time slices (so the UI stays responsive) until the result limit or the end of the book.
  function readerFindScan(st) {
    var chapters = reader.chapters, bookId = reader.bookId, token = ++st.token;
    st.running = true;
    function step() {
      if (token !== st.token || reader.bookId !== bookId) return;
      var t0 = Date.now();
      while (st.next < chapters.length && st.results.length < st.limit && Date.now() - t0 < 40) {
        var i = st.next++, hits = findMatches(findChapterRaw(chapters[i]), st.query);
        for (var k = 0; k < hits.length; k++) st.results.push({ idx: i, n: k, s: hits[k].s, e: hits[k].e });
      }
      var finished = st.next >= chapters.length || st.results.length >= st.limit;
      if (finished) st.running = false;
      readerFindRender(st);
      if (!finished) setTimeout(step, 0);
    }
    step();
  }

  function readerFindSubmit(q) {
    q = (q || "").trim();
    if (reader.find) reader.find.token++;
    var ul = document.getElementById("readerFindResults");
    if (ul) ul.innerHTML = "";
    if (!q) { reader.find = null; readerFindStatus(null); return; }
    var st = { query: q, results: [], next: 0, limit: FIND_BATCH, running: false, token: 0, rendered: 0, tooShort: false };
    reader.find = st;
    if (findNorm(q).text.trim().length < 2) { st.tooShort = true; readerFindStatus(st); return; }
    readerFindScan(st);
  }

  function readerFindGo(i) {
    var st = reader.find, r = st && st.results[i];
    if (!r) return;
    readerFindClose();
    readerGo(r.idx, "find:" + r.n);
  }

  function readerFindClose() {
    var ov = document.getElementById("readerFindOverlay");
    if (ov) ov.remove();
    document.removeEventListener("keydown", readerFindKey);
  }
  function readerFindKey(e) { if (e.key === "Escape") readerFindClose(); }

  function readerFindOpen() {
    if (!reader.chapters || document.getElementById("readerFindOverlay")) return;
    closeDrawerAndSettings();
    var ov = document.createElement("div");
    ov.className = "modal-overlay reader-find-overlay";
    ov.id = "readerFindOverlay";
    ov.innerHTML =
      '<div class="modal-card reader-find-card" role="dialog" aria-modal="true" aria-label="पुस्तक में खोजें">' +
      '<button class="modal-close" id="readerFindClose" aria-label="बंद करें">✕</button>' +
      '<h3>पुस्तक में खोजें</h3>' +
      '<form class="reader-find-form" id="readerFindForm">' +
      '<input type="search" id="readerFindInput" placeholder="शब्द या वाक्यांश लिखें…" autocomplete="off" enterkeyhint="search">' +
      '<button type="submit" class="btn-primary">खोजें</button></form>' +
      '<div class="reader-find-status" id="readerFindStatus"></div>' +
      '<ul class="reader-find-results" id="readerFindResults"></ul>' +
      '<button type="button" class="btn-outline reader-find-more" id="readerFindMore" hidden>और परिणाम दिखाएँ</button>' +
      '</div>';
    document.body.appendChild(ov);

    var input = document.getElementById("readerFindInput"), list = document.getElementById("readerFindResults"), timer = null;
    ov.addEventListener("click", function (e) { if (e.target === ov) readerFindClose(); });
    document.getElementById("readerFindClose").addEventListener("click", readerFindClose);
    document.getElementById("readerFindForm").addEventListener("submit", function (e) {
      e.preventDefault();
      clearTimeout(timer);
      readerFindSubmit(input.value);
    });
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { readerFindSubmit(input.value); }, 350);
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".reader-find-item");
      if (li) readerFindGo(parseInt(li.getAttribute("data-i"), 10));
    });
    list.addEventListener("keydown", function (e) {
      var li = e.target.closest(".reader-find-item");
      if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); readerFindGo(parseInt(li.getAttribute("data-i"), 10)); }
    });
    document.getElementById("readerFindMore").addEventListener("click", function () {
      var st = reader.find;
      if (!st || st.running) return;
      st.limit += FIND_BATCH;
      readerFindScan(st);
    });
    document.addEventListener("keydown", readerFindKey);

    var st = reader.find;
    if (st) { input.value = st.query; readerFindRender(st, true); } else readerFindStatus(null);
    input.focus();
    input.select();
  }

  function readerBaseUrl(book) {
    /* document.baseURI (not location.href) -- this must stay anchored to the site root
       regardless of which real path the reader was opened from (e.g. /read/<slug>/2),
       since book.href is itself root-relative ("Gita Press Books/..."). Resolving against
       location.href here would instead resolve relative to that deep path and break the
       book's own <link href="../../master.css"> once carried into the reader iframe. */
    var abs = new URL(book.href, document.baseURI);
    return abs.href.replace(/[^/]*$/, "");
  }

  function readerThemeCSS() {
    return ".rdr-night{background:#fff;filter:invert(0.93) hue-rotate(180deg);}" +
      ".rdr-sepia{filter:sepia(0.55) saturate(1.15) brightness(0.98);}";
  }

  // Runs inside the sandboxed same-origin iframe: swipe-to-turn-page, scroll-position
  // tracking (for exact last-read-position resume), highlight re-application on load,
  // and a selection popup offering "Highlight" + "Copy". Talks back to the parent shell
  // via window.parent.__reader* (same-origin srcdoc iframes share the app's origin).
  function readerInlineScript(highlightList, restoreScrollPct, anchorId) {
    return '(function(){' +
      'var HL=' + JSON.stringify(highlightList) + ';' +
      'var RESTORE_PCT=' + JSON.stringify(restoreScrollPct || 0) + ';' +
      'var ANCHOR_ID=' + JSON.stringify(anchorId || null) + ';' +
      /* footnotes: the reference mark ("*", "[१]" ...) opens the note in a modal instead of the note sitting under the paragraph
         (swadhyay-footnotes.js). Done first, before the scroll position is restored, since it hides the notes. */
      '(function(){try{if(parent.SwadhyayFootnotes)parent.SwadhyayFootnotes.init(document);}catch(err){}})();' +
      /* Gita shlokas that have a recording get a small play button after the shloka number
         (swadhyay-shloka-audio.js lists them by their anchor id; this is a no-op for every other book) */
      'var SHA=' + JSON.stringify(window.SwadhyayShlokaAudio ? window.SwadhyayShlokaAudio.anchors() : {}) + ';' +
      '(function(){try{var P=parent.SwadhyayShlokaAudio;if(!P)return;var ids=Object.keys(SHA),btns={},any=false;' +
      'var st=document.createElement("style");' +
      'st.textContent=".rdr-sh-play{display:inline-flex;align-items:center;justify-content:center;width:1.9em;height:1.9em;margin-left:.7em;border:0;border-radius:50%;background:#8f1a12;color:#fff;font-size:.6em;line-height:1;vertical-align:middle;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.3)}.rdr-sh-play.on{background:#176b3d}";' +
      'document.head.appendChild(st);' +
      'ids.forEach(function(id){var el=document.getElementById(id);if(!el)return;any=true;' +
      'var b=document.createElement("button");b.type="button";b.className="rdr-sh-play";b.setAttribute("aria-label","श्लोक सुनें");b.textContent="▶";' +
      'b.addEventListener("click",function(ev){ev.stopPropagation();P.play(SHA[id]);});' +
      'b.addEventListener("mousedown",function(ev){ev.stopPropagation();});' +
      'el.appendChild(b);btns[id]=b;});' +
      'if(any)P.onState(function(k){ids.forEach(function(id){var b=btns[id];if(!b)return;var on=SHA[id]===k;b.classList.toggle("on",on);b.textContent=on?"❚❚":"▶";});},"reader");' +
      'if(any)window.addEventListener("pagehide",function(){try{P.onState(function(){},"reader");}catch(e){}});' +
      '}catch(err){}})();' +
      'var sx=0,sy=0,t0=0;' +
      'document.addEventListener("touchstart",function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY;t0=Date.now();},{passive:true});' +
      'document.addEventListener("touchend",function(e){var t=e.changedTouches[0];var dx=t.clientX-sx,dy=t.clientY-sy;' +
      'if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.4 && (Date.now()-t0)<700){' +
      'try{parent.__readerSwipe(dx<0?"next":"prev");}catch(err){}}},{passive:true});' +

      'var scrollTimer=null;' +
      'window.addEventListener("scroll",function(){' +
      'clearTimeout(scrollTimer);' +
      'scrollTimer=setTimeout(function(){' +
      'var max=document.documentElement.scrollHeight-window.innerHeight;' +
      'var pct=max>0?Math.max(0,Math.min(1,window.scrollY/max)):0;' +
      'try{parent.__readerScrollSave(pct);}catch(err){}' +
      '},400);' +
      '},{passive:true});' +
      'if(ANCHOR_ID){setTimeout(function(){' +
      /* "find:<n>": the nth occurrence of the reader's current in-book search. Marked by the parent's matcher, then
         kept centred while fonts/images settle (unless the reader has already scrolled themselves). */
      'if(ANCHOR_ID.indexOf("find:")===0){' +
      'var fm=null;try{fm=parent.__readerFindLocate(document,parseInt(ANCHOR_ID.slice(5),10));}catch(err){}' +
      /* the hit is inside meaning/commentary that is currently hidden -> show it again so it can be seen */
      'if(fm&&!fm.getClientRects().length){var fnOpen=false;try{fnOpen=!!(parent.SwadhyayFootnotes&&parent.SwadhyayFootnotes.revealFor(fm));}catch(err){}' +
      'if(!fnOpen){try{parent.__readerArthReveal();}catch(err){}}}' +
      'if(fm){var moved=false;' +
      'var center=function(){if(!moved)fm.scrollIntoView({block:"center",behavior:"instant"});};' +
      '["wheel","touchmove","keydown","mousedown"].forEach(function(t){window.addEventListener(t,function(){moved=true;},{passive:true,once:true});});' +
      'center();window.addEventListener("load",center);' +
      'if(document.fonts&&document.fonts.ready)document.fonts.ready.then(center);}' +
      'return;}' +
      'var el=null;' +
      'if(ANCHOR_ID.indexOf("txt:")===0){' +      /* "txt:<some words>": the first paragraph containing them */
      'var q=ANCHOR_ID.slice(4),ps=document.querySelectorAll("p");' +
      'for(var i=0;i<ps.length;i++){if(ps[i].textContent.replace(/\\s+/g," ").indexOf(q)!==-1){el=ps[i];break;}}' +
      '}else{el=document.getElementById(ANCHOR_ID);}' +
      /* behavior:"instant" -- the books' own master.css makes the page scroll smoothly, and a smooth scroll over
         thousands of pixels is cut short (the page stayed at the top for a shloka far down the page) */
      'if(el) el.scrollIntoView({block:"start",behavior:"instant"});' +
      '},30);}' +
      'else if(RESTORE_PCT>0){setTimeout(function(){' +
      'var max=document.documentElement.scrollHeight-window.innerHeight;' +
      'if(max>0) window.scrollTo(0,max*RESTORE_PCT);' +
      '},30);}' +

      'function wrapRange(range,color){' +
      'var mark=document.createElement("mark");' +
      'mark.className="rdr-hl";mark.style.background=color||"#ffe58a";mark.style.borderRadius="2px";' +
      'mark.style.cursor="pointer";mark.title="हटाने के लिए टैप करें";' +
      'try{range.surroundContents(mark);}catch(err){' +
      'var frag=range.extractContents();mark.appendChild(frag);range.insertNode(mark);' +
      '}' +
      'mark.addEventListener("click",function(ev){' +
      'ev.stopPropagation();var t=mark.textContent;var p=mark.parentNode;' +
      'while(mark.firstChild) p.insertBefore(mark.firstChild,mark);' +
      'p.removeChild(mark);p.normalize();' +
      'try{parent.__readerRemoveHighlight(t);}catch(err){}' +
      '});' +
      'return mark;' +
      '}' +
      'function reapplyHighlight(text,color){' +
      'if(!text) return;' +
      'var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);' +
      'var node;' +
      'while((node=walker.nextNode())){' +
      'if(node.parentNode && node.parentNode.classList && node.parentNode.classList.contains("rdr-hl")) continue;' +
      'var idx=node.nodeValue.indexOf(text);' +
      'if(idx!==-1){' +
      'var range=document.createRange();' +
      'range.setStart(node,idx);range.setEnd(node,idx+text.length);' +
      'wrapRange(range,color);' +
      'return;' +
      '}' +
      '}' +
      '}' +
      'HL.forEach(function(h){ reapplyHighlight(h.text,h.color); });' +

      'var bar=document.createElement("div");' +
      'bar.className="rdr-bar";' +
      'bar.style.cssText="position:absolute;display:none;z-index:9999;background:#231f20;border-radius:8px;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.35);overflow:hidden;white-space:nowrap;";' +
      'function mkBtn(label){var b=document.createElement("button");b.textContent=label;' +
      'b.style.cssText="border:none;background:transparent;color:#fff;padding:.5rem .8rem;font-size:.82rem;cursor:pointer;font-family:inherit;";' +
      'return b;}' +
      'var hlBtn=mkBtn("✎ हाइलाइट"),cpBtn=mkBtn("⧉ कॉपी");' +
      'bar.appendChild(hlBtn);bar.appendChild(cpBtn);' +
      'document.body.appendChild(bar);' +
      'function hideBar(){bar.style.display="none";}' +
      'var activeSel=null;' +
      'function showBarForSelection(){' +
      'var sel=window.getSelection();' +
      'if(!sel||sel.isCollapsed||!sel.rangeCount){hideBar();return;}' +
      'var text=sel.toString();' +
      'if(!text||!text.trim()){hideBar();return;}' +
      'activeSel=sel;' +
      'var rect=sel.getRangeAt(0).getBoundingClientRect();' +
      'bar.style.left=Math.max(4,rect.left+window.scrollX)+"px";' +
      'bar.style.top=Math.max(4,rect.top+window.scrollY-42)+"px";' +
      'bar.style.display="block";' +
      '}' +
      'hlBtn.addEventListener("mousedown",function(ev){ev.preventDefault();ev.stopPropagation();' +
      'if(!activeSel||!activeSel.rangeCount) return;' +
      'var range=activeSel.getRangeAt(0).cloneRange();var t=activeSel.toString();' +
      'wrapRange(range,"#ffe58a");' +
      'try{parent.__readerHighlightSave(t);}catch(err){}' +
      'window.getSelection().removeAllRanges();hideBar();' +
      '});' +
      'cpBtn.addEventListener("mousedown",function(ev){ev.preventDefault();ev.stopPropagation();' +
      'if(!activeSel) return;var t=activeSel.toString();' +
      'if(navigator.clipboard && navigator.clipboard.writeText){navigator.clipboard.writeText(t).catch(function(){});}' +
      'else{try{document.execCommand("copy");}catch(err){}}' +
      'try{parent.__readerToast("टेक्स्ट कॉपी हो गया");}catch(err){}' +
      'hideBar();' +
      '});' +
      'document.addEventListener("mouseup",function(){setTimeout(showBarForSelection,10);});' +
      'document.addEventListener("touchend",function(){setTimeout(showBarForSelection,10);});' +
      'document.addEventListener("mousedown",function(e){if(e.target!==hlBtn && e.target!==cpBtn) hideBar();});' +
      '})();';
  }

  var READER_PARA_INDENT = "2.2em";
  var READER_INDENT_SELECTORS = "p.Text,p.Sambandh,p.Italik,p.Vayakhya,p.Bhav,p.Bhav-1,p.Bhav-2,p.TXT,p.Prashna,p.Uttar,p.Arth,p.Bhav-3,p.Bhav-4,p.Bhav-5,p.Bhav-6,p.Bhav-7,p.Bhav-8,p.Bhav-9,p.Bhav-10,p.Bhav-11,p.Bhav-12,p.Bhav-13,p.Bhav-14,p.Bhav-15,p.Bhav-16,p.Padchched-1,p.Paradhan-Vishay,p.Normal,p.Gadya,p.Text-2,p.Vyakhya,p.TEXT,p.TEXT-2,p.TEXT-1,p.TXT-Bold,p.Text-,p.TXT-hindi,p.Question,p.Answer";

  // night: the page is a white body that a filter inverts; the canvas around it must match what that gives (#121212)
  function readerBg(theme) { return theme === "sepia" ? "#f4ecd8" : theme === "night" ? "#121212" : "#ffffff"; }
  /* The iframe element itself is the colour you see while a page is being swapped, so it follows the theme too
     (it used to be white, which flashed on every page turn in night view). */
  function readerPaintFrame(iframe, theme) {
    iframe.style.background = readerBg(theme);
    iframe.style.colorScheme = theme === "night" ? "dark" : "light";
  }

  function renderIframeDoc(book, headHtml, chapterHtml, fontSize, lineHeight, theme, highlightList, restoreScrollPct, anchorId, arthHidden) {
    var themeClass = theme === "night" ? "rdr-night" : theme === "sepia" ? "rdr-sepia" : "";
    // "meaning hidden" is a body class (toggled live by readerArthSet), so the rule is always present for swith_arth books
    var arthCss = book.swithArth ? book.arthHideSel.map(function (s) { return "body.rdr-noarth " + s; }).join(",") + "{display:none !important;}" : "";
    if (book.swithArth && arthHidden) themeClass = (themeClass + " rdr-noarth").trim();
    var bg = readerBg(theme);
    // the canvas colour comes first, ahead of the book's own (render-blocking) stylesheet, so nothing paints white while that loads
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="color-scheme" content="' + (theme === "night" ? "dark" : "light") + '">' +
      '<style>html{background:' + bg + ';}</style>' +
      '<base href="' + esc(readerBaseUrl(book)) + '">' +
      headHtml +
      '<style>' +
      'html{background:' + bg + ';}' +
      'body{margin:0;padding:1.1rem 1.2rem 4rem;max-width:900px;margin-left:auto;margin-right:auto;' +
      'font-size:' + fontSize + 'px;box-sizing:border-box;}' +
      /* !important: the book's own master.css sets an explicit (unitless) line-height on
         almost every paragraph class, so a plain body{line-height} rule would be overridden
         by those more specific selectors -- this reading-comfort control needs to win everywhere. */
      'body, body *{line-height:' + lineHeight + 'em !important;}' +
      /* Paragraph indent: master.css indents body text only 12-18px (about 0.5em), which reads as barely
         indented on screen. Prose paragraphs (justified, indented in master.css; not footnotes, verses
         or titles) get a deeper first-line indent that grows with the font size. */
      READER_INDENT_SELECTORS + '{text-indent:' + READER_PARA_INDENT + ' !important;}' +
      '@media (min-width:900px){body{max-width:1100px;padding:1.4rem 2rem 4rem;}}' +
      'mark.rdr-hl{background:#ffe58a;border-radius:2px;}' +
      'mark.rdr-find{background:#ffb74d;color:#1a1a1a;border-radius:3px;box-shadow:0 0 0 2px #ff8f00;animation:rdrFindPulse 1.1s ease-in-out 2;}' +
      '@keyframes rdrFindPulse{0%,100%{box-shadow:0 0 0 2px #ff8f00;}50%{box-shadow:0 0 0 7px rgba(255,143,0,.35);}}' +
      arthCss +
      readerThemeCSS() +
      '</style></head><body class="' + themeClass + '">' + chapterHtml +
      '<script>' + readerInlineScript(highlightList, restoreScrollPct, anchorId) + '</script>' +
      '</body></html>';
  }

  window.__readerSwipe = function (dir) {
    if (!reader.open) return;
    if (dir === "next") readerGo(reader.idx + 1);
    else if (dir === "prev") readerGo(reader.idx - 1);
  };
  window.__readerScrollSave = function (pct) {
    if (!reader.open) return;
    var reads = getReads();
    var entry = reads[reader.bookId] || {};
    entry.scrollPct = pct;
    entry.lastChapter = reader.idx;
    reads[reader.bookId] = entry;
    setReads(reads);
  };
  window.__readerHighlightSave = function (text) {
    if (!reader.open) return;
    addHighlightEntry(reader.bookId, reader.idx, text);
  };
  window.__readerRemoveHighlight = function (text) {
    if (!reader.open) return;
    removeHighlightEntry(reader.bookId, reader.idx, text);
  };
  window.__readerToast = function (msg) { toast(msg); };

  function readerOverlayShell() {
    return '<div class="reader-overlay" id="readerOverlay">' +
      '<header class="reader-topbar">' +
      '<button class="reader-icon-btn" id="readerBackBtn" title="वापस" aria-label="वापस">←</button>' +
      '<button class="reader-icon-btn" id="readerTocToggle" title="विषय-सूची" aria-label="विषय-सूची">☰</button>' +
      '<div class="reader-title" id="readerTitleText"></div>' +
      '<button class="reader-arth-btn" id="readerArthBtn" type="button" hidden aria-pressed="false">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path class="arth-slash" d="M3 3l18 18"/></svg>' +
      '<span class="arth-label">अर्थ</span></button>' +
      '<button class="reader-icon-btn" id="readerSearchBtn" title="पुस्तक में खोजें" aria-label="पुस्तक में खोजें">&#128269;</button>' +
      '<button class="reader-icon-btn" id="readerBookmarkToggle" title="बुकमार्क" aria-label="बुकमार्क">☆</button>' +
      '<button class="reader-icon-btn" id="readerSettingsToggle" title="सेटिंग्स" aria-label="सेटिंग्स">Aa</button>' +
      '</header>' +
      '<div class="reader-body">' +
      '<div class="reader-scrim" id="readerScrim"></div>' +
      '<aside class="reader-drawer" id="readerDrawer">' +
      '<div class="reader-drawer-tabs">' +
      '<button class="reader-drawer-tab active" id="readerDrawerTabToc" data-tab="toc">विषय-सूची</button>' +
      '<button class="reader-drawer-tab" id="readerDrawerTabBm" data-tab="bm">☆ बुकमार्क</button>' +
      '</div>' +
      '<ul class="reader-toc reader-drawer-panel active" id="readerTocList" data-panel="toc"></ul>' +
      '<div class="reader-bookmarks reader-drawer-panel" id="readerBookmarksList" data-panel="bm"></div>' +
      '</aside>' +
      '<div class="reader-settings" id="readerSettings">' +
      '<div class="reader-settings-row"><span>थीम</span>' +
      '<div class="reader-theme-btns">' +
      '<button data-theme="day" class="rdr-theme-btn">☀ दिन</button>' +
      '<button data-theme="sepia" class="rdr-theme-btn">📜 सीपिया</button>' +
      '<button data-theme="night" class="rdr-theme-btn">🌙 रात्रि</button>' +
      '</div></div>' +
      '<div class="reader-settings-row"><span>फ़ॉन्ट आकार</span>' +
      '<div class="reader-font-btns">' +
      '<button id="readerFontDec" aria-label="छोटा करें">A−</button>' +
      '<span id="readerFontVal"></span>' +
      '<button id="readerFontInc" aria-label="बड़ा करें">A+</button>' +
      '</div></div>' +
      '<div class="reader-settings-row"><span>पंक्ति ऊँचाई</span>' +
      '<div class="reader-lineheight-ctl">' +
      '<input type="range" id="readerLineHeightSlider" min="' + READER_LINE_HEIGHT_MIN + '" max="' + READER_LINE_HEIGHT_MAX + '" step="' + READER_LINE_HEIGHT_STEP + '" aria-label="पंक्ति ऊँचाई">' +
      '<span id="readerLineHeightVal"></span>' +
      '</div></div>' +
      '</div>' +
      '<div class="reader-content" id="readerContent">' +
      '<iframe class="reader-iframe" id="readerIframe" title="पुस्तक सामग्री" allow="clipboard-write"></iframe>' +
      '</div>' +
      '</div>' +
      '<nav class="reader-bottomnav">' +
      '<button class="reader-nav-btn" id="readerPrevBtn">‹ पिछला</button>' +
      '<span class="reader-page-ind" id="readerPageInd"></span>' +
      '<button class="reader-nav-btn" id="readerNextBtn">अगला ›</button>' +
      '</nav></div>';
  }

  function readerTocHtml() {
    var marks = getBookmarks(reader.bookId);
    function star(i) { return marks.some(function (b) { return b.chapterIdx === i; }) ? '<span class="reader-toc-star">★</span> ' : ''; }
    function deeper(pg, i) {
      return (pg.subs || []).map(function (sb) {
        return '<li class="reader-toc-subitem" data-idx="' + i + '" data-anchor="' + esc(sb.anchorId) + '">' + esc(sb.text) + '</li>';
      }).join("");
    }
    return groupPages(reader.chapters).map(function (g) {
      var head = reader.chapters[g.idx];
      var kids = deeper(head, g.idx) + g.subIdx.map(function (j) {
        return '<li class="reader-toc-subitem' + (j === reader.idx ? " active" : "") + '" data-idx="' + j + '">' + star(j) + esc(reader.chapters[j].label) + '</li>' + deeper(reader.chapters[j], j);
      }).join("");
      var hasKids = kids !== "";
      var holdsActive = reader.idx === g.idx || g.subIdx.indexOf(reader.idx) !== -1;
      var expanded = hasKids && (holdsActive || reader.expandedChapters[g.idx]);
      return '<li class="reader-toc-group">' +
        '<div class="reader-toc-item' + (reader.idx === g.idx ? " active" : "") + '" data-idx="' + g.idx + '">' +
        (hasKids ? '<button class="reader-toc-expand" data-toggle="' + g.idx + '">' + (expanded ? "▾" : "▸") + '</button>' : '<span class="reader-toc-expand-spacer"></span>') +
        star(g.idx) + esc(head.label) +
        '</div>' + (hasKids ? '<ul class="reader-toc-subs' + (expanded ? " open" : "") + '">' + kids + '</ul>' : '') + '</li>';
    }).join("");
  }

  function readerBookmarksHtml() {
    var marks = getBookmarks(reader.bookId);
    if (!marks.length) {
      return '<div class="empty-state small reader-bm-empty">अभी तक कोई बुकमार्क नहीं है। किसी अध्याय को बुकमार्क करने के लिए ऊपर ☆ दबाएँ।</div>';
    }
    return '<ul class="reader-bookmarks-ul">' +
      marks.map(function (b) {
        return '<li class="reader-bm-item" data-idx="' + b.chapterIdx + '">' +
          '<span class="reader-bm-label">★ ' + esc(b.label) + '</span>' +
          '<button class="reader-bm-remove" data-remove-idx="' + b.chapterIdx + '" title="बुकमार्क हटाएँ" aria-label="बुकमार्क हटाएँ">✕</button>' +
          '</li>';
      }).join("") + '</ul>';
  }

  function closeDrawerAndSettings() {
    var d = document.getElementById("readerDrawer");
    var s = document.getElementById("readerSettings");
    var scrim = document.getElementById("readerScrim");
    if (d) d.classList.remove("open");
    if (s) s.classList.remove("open");
    if (scrim) scrim.classList.remove("show");
  }

  function readerUpdateChrome() {
    var titleEl = document.getElementById("readerTitleText");
    var cur = reader.chapters[reader.idx];
    var curLabel = cur.isSub ? cur.parentLabel + " › " + cur.label : cur.label;
    if (titleEl) titleEl.textContent = reader.book.title + " · " + curLabel;
    setPageMeta(reader.book, curLabel);
    var ind = document.getElementById("readerPageInd");
    if (ind) ind.textContent = (reader.idx + 1) + " / " + reader.chapters.length;
    var prevBtn = document.getElementById("readerPrevBtn");
    var nextBtn = document.getElementById("readerNextBtn");
    if (prevBtn) prevBtn.disabled = reader.idx <= 0;
    if (nextBtn) nextBtn.disabled = reader.idx >= reader.chapters.length - 1;
    var list = document.getElementById("readerTocList");
    if (list) {
      list.innerHTML = readerTocHtml();
      var activeItem = list.querySelector(".active");
      if (activeItem) activeItem.scrollIntoView({ block: "nearest" });
    }
    var bmList = document.getElementById("readerBookmarksList");
    if (bmList) bmList.innerHTML = readerBookmarksHtml();
    var bmTab = document.getElementById("readerDrawerTabBm");
    if (bmTab) {
      var bmCount = getBookmarks(reader.bookId).length;
      bmTab.textContent = "☆ बुकमार्क" + (bmCount ? " (" + bmCount + ")" : "");
    }
    var bmBtn = document.getElementById("readerBookmarkToggle");
    if (bmBtn) {
      var marked = isChapterBookmarked(reader.bookId, reader.idx);
      bmBtn.textContent = marked ? "★" : "☆";
      bmBtn.classList.toggle("active", marked);
    }
    var arthBtn = document.getElementById("readerArthBtn");
    if (arthBtn) {
      var arthOn = !!(reader.book && reader.book.swithArth);
      arthBtn.hidden = !arthOn;
      arthBtn.classList.toggle("off", arthOn && reader.arthHidden);
      arthBtn.setAttribute("aria-pressed", arthOn && reader.arthHidden ? "true" : "false");
      var arthTip = reader.arthHidden ? "अर्थ व टीका दिखाएँ" : "अर्थ व टीका छुपाएँ — केवल श्लोक पढ़ें";
      arthBtn.title = arthTip;
      arthBtn.setAttribute("aria-label", arthTip);
    }
    var fv = document.getElementById("readerFontVal");
    if (fv) fv.textContent = reader.fontSize + "px";
    var lhSlider = document.getElementById("readerLineHeightSlider");
    if (lhSlider) lhSlider.value = reader.lineHeight;
    var lhVal = document.getElementById("readerLineHeightVal");
    if (lhVal) lhVal.textContent = reader.lineHeight.toFixed(1) + "em";
    document.querySelectorAll(".rdr-theme-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-theme") === reader.theme);
    });
  }

  function readerCurrentScrollPct() {
    try {
      var w = document.getElementById("readerIframe").contentWindow;
      var d = w.document.documentElement;
      var max = d.scrollHeight - w.innerHeight;
      return max > 0 ? Math.max(0, Math.min(1, w.scrollY / max)) : 0;
    } catch (e) { return 0; }
  }

  function readerRenderIframe(restoreScrollPct, anchorId) {
    var iframe = document.getElementById("readerIframe");
    if (!iframe) return;
    var chapter = reader.chapters[reader.idx];
    var highlights = getChapterHighlights(reader.bookId, reader.idx);
    readerPaintFrame(iframe, reader.theme);
    iframe.srcdoc = renderIframeDoc(reader.book, reader.headHtml, chapter.html, reader.fontSize, reader.lineHeight, reader.theme, highlights, restoreScrollPct || 0, anchorId, reader.arthHidden);
  }

  /* Show/hide the meaning and commentary of a swith_arth book. Flips a class on the page already on screen (no
     reload), and holds the first paragraph still visible where it was so the reader does not lose their place. */
  function readerArthSet(hidden, persist) {
    if (!reader.book || !reader.book.swithArth) return;
    reader.arthHidden = hidden;
    if (persist) setArthHidden(reader.book, hidden);
    var iframe = document.getElementById("readerIframe"), win = null, doc = null;
    try { win = iframe.contentWindow; doc = win.document; } catch (e) {}
    if (doc && doc.body) {
      var sel = reader.book.arthHideSel.join(","), anchor = null, topBefore = 0, ps = doc.body.querySelectorAll("p");
      for (var i = 0; i < ps.length; i++) {
        if (hidden && ps[i].matches(sel)) continue;          // about to disappear -- cannot be the anchor
        var r = ps[i].getBoundingClientRect();
        if (r.height > 0 && r.bottom > 4) { anchor = ps[i]; topBefore = r.top; break; }
      }
      doc.body.classList.toggle("rdr-noarth", hidden);
      if (anchor) win.scrollBy(0, anchor.getBoundingClientRect().top - topBefore);
    }
    readerUpdateChrome();
  }
  // A search hit lay inside hidden meaning: show the meaning again (this once; the saved preference is untouched).
  window.__readerArthReveal = function () { if (reader.open && reader.arthHidden) readerArthSet(false, false); };

  function readerSaveProgress(scrollPct) {
    var reads = getReads();
    var entry = reads[reader.bookId] || {};
    entry.lastChapter = reader.idx;
    entry.totalChapters = reader.chapters.length;
    entry.progress = Math.round(((reader.idx + 1) / reader.chapters.length) * 100);
    entry.scrollPct = scrollPct || 0;
    entry.lastOpenedAt = Date.now();
    if (!entry.firstOpenedAt) entry.firstOpenedAt = entry.lastOpenedAt;
    reads[reader.bookId] = entry;
    setReads(reads);
  }

  function readerGo(idx, anchorId) {
    if (!reader.chapters) return;
    idx = Math.max(0, Math.min(reader.chapters.length - 1, idx));
    reader.idx = idx;
    readerRenderIframe(0, anchorId);
    readerUpdateChrome();
    readerSaveProgress(0);
    try { history.replaceState(null, "", readPath(reader.book, idx)); } catch (e) {}
    closeDrawerAndSettings();
  }

  function wireReaderChrome() {
    document.getElementById("readerBackBtn").addEventListener("click", function () { history.back(); });
    document.getElementById("readerTocToggle").addEventListener("click", function () {
      document.getElementById("readerSettings").classList.remove("open");
      var d = document.getElementById("readerDrawer");
      d.classList.toggle("open");
      document.getElementById("readerScrim").classList.toggle("show", d.classList.contains("open"));
    });
    document.getElementById("readerSettingsToggle").addEventListener("click", function () {
      document.getElementById("readerDrawer").classList.remove("open");
      var s = document.getElementById("readerSettings");
      s.classList.toggle("open");
      document.getElementById("readerScrim").classList.toggle("show", s.classList.contains("open"));
    });
    document.getElementById("readerScrim").addEventListener("click", closeDrawerAndSettings);
    document.getElementById("readerSearchBtn").addEventListener("click", readerFindOpen);
    document.getElementById("readerArthBtn").addEventListener("click", function () {
      if (reader.chapters) readerArthSet(!reader.arthHidden, true);
    });
    document.getElementById("readerTocList").addEventListener("click", function (e) {
      var toggleBtn = e.target.closest("[data-toggle]");
      if (toggleBtn) {
        var ci = parseInt(toggleBtn.getAttribute("data-toggle"), 10);
        reader.expandedChapters[ci] = !reader.expandedChapters[ci];
        readerUpdateChrome();
        return;
      }
      var subItem = e.target.closest(".reader-toc-subitem");
      if (subItem) {
        readerGo(parseInt(subItem.getAttribute("data-idx"), 10), subItem.getAttribute("data-anchor"));
        return;
      }
      var item = e.target.closest(".reader-toc-item");
      if (item) readerGo(parseInt(item.getAttribute("data-idx"), 10));
    });
    document.getElementById("readerPrevBtn").addEventListener("click", function () { readerGo(reader.idx - 1); });
    document.getElementById("readerNextBtn").addEventListener("click", function () { readerGo(reader.idx + 1); });
    document.querySelectorAll(".rdr-theme-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var pct = readerCurrentScrollPct();
        reader.theme = setReaderTheme(b.getAttribute("data-theme"));
        readerRenderIframe(pct);
        readerUpdateChrome();
      });
    });
    document.getElementById("readerFontDec").addEventListener("click", function () {
      var pct = readerCurrentScrollPct();
      reader.fontSize = setReaderFontSize(reader.fontSize - 1);
      readerRenderIframe(pct);
      readerUpdateChrome();
    });
    document.getElementById("readerFontInc").addEventListener("click", function () {
      var pct = readerCurrentScrollPct();
      reader.fontSize = setReaderFontSize(reader.fontSize + 1);
      readerRenderIframe(pct);
      readerUpdateChrome();
    });
    document.getElementById("readerLineHeightSlider").addEventListener("input", function (e) {
      var pct = readerCurrentScrollPct();
      reader.lineHeight = setReaderLineHeight(parseFloat(e.target.value));
      readerRenderIframe(pct);
      readerUpdateChrome();
    });
    document.getElementById("readerBookmarkToggle").addEventListener("click", function () {
      var nowMarked = toggleBookmark(reader.bookId, reader.idx, reader.chapters[reader.idx].label);
      readerUpdateChrome();
      toast(nowMarked ? "बुकमार्क जोड़ा गया" : "बुकमार्क हटाया गया");
    });
    document.getElementById("readerBookmarksList").addEventListener("click", function (e) {
      var rm = e.target.closest("[data-remove-idx]");
      if (rm) {
        toggleBookmark(reader.bookId, parseInt(rm.getAttribute("data-remove-idx"), 10), "");
        readerUpdateChrome();
        return;
      }
      var li = e.target.closest("[data-idx]");
      if (li) readerGo(parseInt(li.getAttribute("data-idx"), 10));
    });
    document.querySelectorAll(".reader-drawer-tab").forEach(function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        var target = tabBtn.getAttribute("data-tab");
        document.querySelectorAll(".reader-drawer-tab").forEach(function (b) { b.classList.toggle("active", b === tabBtn); });
        document.querySelectorAll(".reader-drawer-panel").forEach(function (p) {
          p.classList.toggle("active", p.getAttribute("data-panel") === target);
        });
      });
    });
    document.addEventListener("keydown", function (e) {
      if (!reader.open || document.getElementById("readerFindOverlay")) return;
      if (e.key === "ArrowRight") readerGo(reader.idx + 1);
      else if (e.key === "ArrowLeft") readerGo(reader.idx - 1);
      else if (e.key === "Escape") closeDrawerAndSettings();
    });
  }

  /* Opens a book in the reader at a given spot -- used by the home page's daily cards.
     where = { id: "<element id>" } (a shloka, a विश्राम ...) or { text: "<words from the opening line>" }.
     It loads the book if needed, finds the reader page that holds the spot, and goes there. */
  function openBookAt(file, where) {
    var book = findByFile(file);
    if (!book) { navigate("/library"); return; }
    function go(entry) {
      var idx = 0, anchor = null;
      if (where && where.id) {
        anchor = where.id;
        for (var i = 0; i < entry.chapters.length; i++) {
          if (entry.chapters[i].html.indexOf('id="' + where.id + '"') !== -1) { idx = i; break; }
        }
      } else if (where && where.text) {
        anchor = "txt:" + where.text;
        for (var k = 0; k < entry.chapters.length; k++) {
          if (stripTagsForLabel(entry.chapters[k].html).indexOf(where.text) !== -1) { idx = k; break; }
        }
      }
      navigate(readPath(book, idx) + (anchor ? "?a=" + encodeURIComponent(anchor) : ""));
    }
    if (readerCache[book.id]) { go(readerCache[book.id]); return; }
    toast("पुस्तक खुल रही है…");
    fetch(book.href).then(function (res) {
      if (!res.ok) throw new Error("fetch failed");
      return res.text();
    }).then(function (text) { go(readerCache[book.id] || buildReaderBook(book.id, text)); })
      .catch(function () { navigate(bookPath(book)); });
  }
  window.__swadhyayApp = {
    openBookAt: openBookAt,
    getPanchang: function (d) { return getPanchang(d || new Date(), getPanchangCity()); },
    vratsFor: function (p) { return vratsFor(p); },
    navigate: function (p) { navigate(p); },
    isLoggedIn: function () { return isLoggedIn(); },
    getUser: function () { return getCurrentUser(); },
    api: function (method, path, body) { return apiCall(method, path, body); },
    bookPath: function (file) { var b = findByFile(file); return b ? bookPath(b) : "/library"; },
    readPath: function (file) { var b = findByFile(file); return b ? readPath(b) : "/library"; },
    bookProgress: function (file) { var b = findByFile(file), r = b && getReads()[b.id]; return r && typeof r.progress === "number" ? r.progress : 0; }
  };

  function openReader(bookId, startIdx, anchorId) {
    var book = BOOKS_BY_ID[bookId];
    if (!book) { navigate("/library"); return; }

    document.body.classList.add("reader-active");
    if (!document.getElementById("readerOverlay")) {
      document.body.insertAdjacentHTML("beforeend", readerOverlayShell());
      wireReaderChrome();
    }
    document.getElementById("readerOverlay").classList.add("show");

    reader.open = true;
    reader.bookId = bookId;
    reader.book = book;
    // opened from the dark site -> the book opens in night view too; otherwise the reader's own saved choice
    reader.arthHidden = getArthHidden(book);
    var arthBtnEl = document.getElementById("readerArthBtn");
    if (arthBtnEl) arthBtnEl.hidden = true;      // shown again by readerUpdateChrome once the book has loaded
    reader.theme = getTheme() === "dark" ? "night" : getReaderTheme();
    reader.fontSize = getReaderFontSize();
    reader.lineHeight = getReaderLineHeight();
    reader.chapters = null;
    reader.expandedChapters = {};
    if (reader.find) reader.find.token++;
    reader.find = null;
    var staleFind = document.getElementById("readerFindOverlay");
    if (staleFind) staleFind.remove();

    var iframe = document.getElementById("readerIframe");
    readerPaintFrame(iframe, reader.theme);
    iframe.srcdoc = '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#888;text-align:center;' + (reader.theme === "night" ? "background:#121212;" : "") + '">लोड हो रहा है…</body></html>';
    document.getElementById("readerTitleText").textContent = book.title;
    if (window.SwadhyaySankalp) window.SwadhyaySankalp.readerBar(book.file);   // today's portion of an active पाठ-संकल्प

    recordOpen(bookId);

    function proceed(entry) {
      reader.headHtml = entry.headHtml;
      reader.chapters = entry.chapters;
      migrateReaderLayout(bookId, entry);
      var saved = getReads()[bookId];
      var isResume = !(startIdx !== null && startIdx !== undefined && !isNaN(startIdx));
      var idx = !isResume ? startIdx : (saved && typeof saved.lastChapter === "number") ? saved.lastChapter : 0;
      reader.idx = Math.max(0, Math.min(entry.chapters.length - 1, idx));
      var restorePct = (isResume && saved && reader.idx === saved.lastChapter) ? (saved.scrollPct || 0) : 0;
      if (anchorId) restorePct = 0;
      readerRenderIframe(restorePct, anchorId || null);
      readerUpdateChrome();
      readerSaveProgress(restorePct);
      try { history.replaceState(null, "", readPath(book, reader.idx)); } catch (e) {}
    }

    if (readerCache[bookId]) {
      proceed(readerCache[bookId]);
    } else {
      fetch(book.href).then(function (res) {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      }).then(function (text) {
        proceed(buildReaderBook(bookId, text));
      }).catch(function () {
        iframe.srcdoc = '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#a51512;text-align:center;">' +
          'पुस्तक लोड नहीं हो सकी। <a href="' + esc(book.href) + '" target="_blank">यहाँ खोलें</a></body></html>';
      });
    }
  }

  function closeReader() {
    if (!reader.open) return;
    reader.open = false;
    readerFindClose();
    document.body.classList.remove("reader-active");
    var skBar = document.getElementById("skReadBar"); if (skBar) skBar.remove();
    var overlay = document.getElementById("readerOverlay");
    if (overlay) overlay.classList.remove("show");
  }

  /* ---------------- comments (server-backed, lazy-loaded like the TOC tab) ---------------- */
  function renderCommentList(list) {
    if (!list.length) return '<div class="empty-state small">अभी तक कोई टिप्पणी नहीं है। सबसे पहली टिप्पणी आप ही करें!</div>';
    return '<div class="comment-list">' + list.map(function (c) {
      return '<div class="comment-item"><div class="comment-head"><b>' + esc(c.author) + '</b>' +
        '<span class="comment-time">' + timeAgo(c.created_at) + '</span></div>' +
        '<p>' + esc(c.text) + '</p></div>';
    }).join("") + '</div>';
  }

  function refreshCommentList(book) {
    var wrap = document.getElementById("commentListWrap");
    return getComments(book.file).then(function (list) {
      wrap = document.getElementById("commentListWrap"); // re-query: the view may have re-rendered while awaiting
      if (wrap) wrap.innerHTML = renderCommentList(list);
      var tabBtn = document.querySelector('.detail-tab[data-tab="comments"]');
      if (tabBtn) tabBtn.textContent = "टिप्पणियाँ" + (list.length ? " (" + list.length + ")" : "");
      return list;
    });
  }

  function renderCommentsTab(book) {
    var user = getCurrentUser();
    var html = '<div class="comments-block">';
    html += user
      ? '<form class="comment-form" id="commentForm" data-book="' + esc(book.file) + '">' +
        '<textarea id="commentText" rows="3" maxlength="1000" placeholder="अपनी टिप्पणी लिखें…" required></textarea>' +
        '<button type="submit" class="btn-primary">टिप्पणी भेजें</button></form>'
      : '<div class="comment-login-gate">🔒 टिप्पणी करने के लिए <a href="/login">साइन इन</a> करना आवश्यक है।</div>';
    html += '<div id="commentListWrap"><div class="empty-state small">लोड हो रहा है…</div></div>';
    html += '</div>';
    return html;
  }

  function viewBook(id) {
    var book = BOOKS_BY_ID[id];
    if (!book) return '<main class="content-pad"><div class="empty-state">पुस्तक नहीं मिली</div></main>';
    var fav = isFavorite(book.id);
    var reads = getReads();
    var read = reads[book.id];
    var pct = read ? (read.progress || 0) : 0;
    var g = PALETTE[book.paletteIdx];

    var html = '<main class="content-pad book-detail">';
    html += '<a href="javascript:history.back()" class="back-link">← वापस</a>';
    html += '<div class="book-detail-grid">';
    html += '<div class="book-detail-cover-col">';
    html += book.coverImage
      ? '<div class="book-detail-cover has-img"><img src="' + esc(book.coverImage) + '" alt="' + esc(book.title) + '"></div>'
      : '<div class="book-detail-cover" style="background:linear-gradient(150deg,' + g[0] + ',' + g[1] + ')">' +
        '<span class="cover-letter">' + esc(book.initial) + '</span><span class="cover-mark">ॐ</span></div>';
    if (book.isGitaPress) {
      html += '<div class="affiliate-buttons">' +
        '<a class="affiliate-btn" href="' + esc(amazonBuyUrl(book)) + '" target="_blank" rel="noopener noreferrer sponsored">' +
        '<img src="assets/affiliate/buy-on-amazon.png" alt="Buy on Amazon"></a>' +
        '<a class="affiliate-btn" href="' + esc(gitaPressBuyUrl(book)) + '" target="_blank" rel="noopener noreferrer sponsored">' +
        '<img src="assets/affiliate/buy-at-gitapress.png" alt="Buy at Gita Press"></a>' +
        '</div>';
    }
    html += '</div>';
    html += '<div class="book-detail-info">';
    html += '<h1>' + esc(book.title) + '</h1>';
    html += '<button class="btn-listen" id="listenBtn"><span class="btn-listen-icon">🎧</span> ' +
      bilingual("इस पुस्तक को सुनें", "Listen to this book") + '</button>';
    [["👤", PERSON_ROLES[0], book.authors], ["📝", PERSON_ROLES[1], book.tikakars], ["🔤", PERSON_ROLES[2], book.translators],
     ["🏛️", PERSON_ROLES[3], book.publisher ? [book.publisher] : []]].forEach(function (row) {
      if (!row[2].length) return;
      html += '<div class="meta-line">' + row[0] + ' <span class="meta-label">' + esc(roleLabel(row[1])) + ':</span> ' +
        row[2].map(personLink).join(", ") + '</div>';
    });
    html += '<div class="meta-line">📖 हिन्दी</div>';
    html += '<div class="meta-line">⏱️ अनुमानित पठन समय ' + formatDuration(book.minutes) + '</div>';
    html += '<div class="tag-row">' + book.categoryMetas.map(function (cm) {
      return '<span class="tag">' + esc(tx(cm.hi, cm.en)) + '</span>';
    }).join("") + '</div>';
    if (book.tags.length) {
      html += '<div class="tag-row tag-row-topics">' + book.tags.map(function (t) {
        return '<a class="tag tag-topic" href="/library?tag=' + encodeURIComponent(t) + '">#' + esc(t) + '</a>';
      }).join("") + '</div>';
    }
    html += '<div class="detail-actions">' +
      '<a class="btn-primary" href="' + readPath(book) + '" id="startReadingBtn">▶ पढ़ना शुरू करें</a>' +
      '<button class="btn-outline ' + (fav ? "active" : "") + '" id="favBtn" data-fav="' + book.id + '">' + (fav ? "♥ पसंदीदा में शामिल" : "♡ पसंदीदा में जोड़ें") + '</button>' +
      '<button class="btn-outline" id="shareBtn">↪ साझा करें</button>' +
      '</div>';
    html += '<div class="progress-block"><label>' + bilingual("आपकी प्रगति") + ': <b id="progressLabel">' + pct + '%</b></label>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%" id="progressFillBar"></div></div></div>';

    html += '<div class="detail-tabs" id="detailTabs" data-book="' + book.id + '">' +
      '<button class="detail-tab active" data-tab="intro">किताब का परिचय</button>' +
      '<button class="detail-tab" data-tab="toc">विषय सूची</button>' +
      '<button class="detail-tab" data-tab="comments">टिप्पणियाँ</button>' +
      '</div>';
    html += '<div class="detail-tab-panel active" data-panel="intro">' +
      '<div class="about-block"><h3>इस पुस्तक के बारे में</h3><p>' + genBlurb(book) + '</p></div></div>';
    html += '<div class="detail-tab-panel" data-panel="toc" id="tocPanel"></div>';
    html += '<div class="detail-tab-panel" data-panel="comments" id="commentsPanel">' + renderCommentsTab(book) + '</div>';

    html += '</div></div></main>';
    return html;
  }

  function viewFavorites() {
    var favBooks = getFavorites().map(function (id) { return BOOKS_BY_ID[id]; }).filter(Boolean);
    var html = '<div class="page-header"><h1>' + bilingual("आपके प्रिय ग्रंथ", "Your Favorites") + ' <span class="cnt">(' + favBooks.length + ')</span></h1></div>';
    if (!favBooks.length) {
      html += '<div class="empty-state">' + bilingual("आपने अभी तक कोई पुस्तक पसंदीदा में नहीं जोड़ी है।", "You haven't added any favorites yet.") +
        '<br><a class="btn-primary" href="/library">' + bilingual("पुस्तकालय देखें", "Browse Library") + '</a></div>';
    } else {
      html += '<div class="book-grid">' + favBooks.map(bookCard).join("") + '</div>';
    }
    return '<main class="content-pad">' + html + '</main>';
  }

  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

  function computeStreak(reads) {
    var days = {};
    Object.keys(reads).forEach(function (id) { days[dayKey(reads[id].lastOpenedAt)] = true; });
    var streak = 0;
    var cursor = Date.now();
    while (true) {
      var k = dayKey(cursor);
      if (days[k]) { streak++; cursor -= 86400000; } else break;
    }
    return streak;
  }

  function viewMyReads() {
    var reads = getReads();
    var ids = Object.keys(reads).sort(function (a, b) { return reads[b].lastOpenedAt - reads[a].lastOpenedAt; });
    var books = ids.map(function (id) { return { book: BOOKS_BY_ID[id], read: reads[id] }; }).filter(function (x) { return x.book; });

    var totalMinutes = books.reduce(function (sum, x) { return sum + Math.round(x.book.minutes * (x.read.progress || 0) / 100); }, 0);
    var streak = computeStreak(reads);

    var html = '<div class="page-header"><h1>' + bilingual("मेरा अध्ययन", "My Reads") + '</h1></div>';
    html += '<div class="stats-row">' +
      '<div class="stat-card"><div class="stat-num">' + books.length + '</div><div class="stat-label">' + bilingual("पुस्तकें पढ़ीं", "Books Read") + '</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + formatDuration(totalMinutes) + '</div><div class="stat-label">' + bilingual("पठन समय", "Reading Time") + '</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + streak + '</div><div class="stat-label">' + bilingual("दिन लगातार", "Day Streak") + '</div></div>' +
      '</div>';

    if (books.length) {
      var top = books[0];
      html += '<div class="continue-card"><div class="continue-label">' + bilingual("पढ़ना जारी रखें", "Continue Reading") + '</div>' +
        '<div class="continue-body">' + coverEl(top.book, "sm") +
        '<div><a class="book-title" href="' + bookPath(top.book) + '">' + esc(top.book.title) + '</a>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + (top.read.progress || 0) + '%"></div></div></div>' +
        '<a class="btn-primary" href="' + readPath(top.book) + '">' + bilingual("जारी रखें", "Continue") + '</a></div></div>';
    }

    html += '<div class="page-header" style="margin-top:2rem"><h2>' + bilingual("पठन इतिहास", "Reading History") + '</h2>' +
      (books.length ? '<button id="clearHistoryBtn" class="btn-outline">' + bilingual("इतिहास साफ़ करें", "Clear History") + '</button>' : '') + '</div>';

    if (!books.length) {
      html += '<div class="empty-state">' + bilingual("अभी तक कोई पठन इतिहास नहीं है।", "No reading history yet.") +
        '<br><a class="btn-primary" href="/library">' + bilingual("पढ़ना शुरू करें", "Start Reading") + '</a></div>';
    } else {
      html += '<div class="history-list">' + books.map(function (x) {
        return '<div class="history-item">' + coverEl(x.book, "sm") +
          '<div class="history-body"><a class="book-title" href="' + bookPath(x.book) + '">' + esc(x.book.title) + '</a>' +
          '<div class="book-author">' + esc(x.book.author) + '</div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + (x.read.progress || 0) + '%"></div></div></div>' +
          '<span class="progress-pct">' + (x.read.progress || 0) + '%</span></div>';
      }).join("") + '</div>';
    }
    return '<main class="content-pad">' + html + '</main>';
  }

  function chatSourceChip(s) {
    var inner = "[" + s.n + "] " + esc(s.title);
    var srcBook = s.bookId != null ? BOOKS_BY_ID[s.bookId] : null;
    return srcBook
      ? '<a class="chat-source-chip" href="' + bookPath(srcBook) + '">' + inner + "</a>"
      : '<span class="chat-source-chip">' + inner + "</span>";
  }

  function chatBubbleInner(t) {
    if (t.error) return '<div class="chat-error">' + esc(t.error) + "</div>";
    if (t.text) return esc(t.text).replace(/\n/g, "<br>");
    return '<span class="chat-typing"><span></span><span></span><span></span></span>';
  }

  function viewChat() {
    var turnsHtml = chatState.turns.map(function (t, i) {
      if (t.role === "user") {
        return '<div class="chat-msg chat-msg-user"><div class="chat-bubble">' + esc(t.text).replace(/\n/g, "<br>") + "</div></div>";
      }
      var citHtml = (t.sources && t.sources.length && !t.pending)
        ? '<div class="chat-sources">' + t.sources.map(chatSourceChip).join("") + "</div>"
        : "";
      return '<div class="chat-msg chat-msg-bot"><div class="chat-bubble" id="chatBubble-' + i + '">' + chatBubbleInner(t) + "</div>" + citHtml + "</div>";
    }).join("");

    var intro = '<div class="chat-msg chat-msg-bot"><div class="chat-bubble">' +
      bilingual("नमस्ते! गीता प्रेस की पुस्तकोंसे जुड़ा कोई भी प्रश्न पूछें — मैं केवल उन्हीं पुस्तकोंके आधारपर उत्तर दूँगा।") + "</div></div>";

    return '<main class="content-pad chat-page"><div class="page-header"><h1>' + bilingual("प्रश्नोत्तर") + "</h1></div>" +
      '<div class="chat-shell"><div class="chat-messages" id="chatMessages">' + (turnsHtml || intro) + "</div>" +
      '<form class="chat-input-row" id="chatForm">' +
      '<input type="text" id="chatInput" placeholder="' + bilingual("अपना प्रश्न लिखें...") + '" autocomplete="off">' +
      '<button type="submit" class="btn-primary" id="chatSendBtn">' + bilingual("भेजें") + "</button>" +
      "</form></div></main>";
  }

  function scrollChatToBottom() {
    var list = document.getElementById("chatMessages");
    if (list) list.scrollTop = list.scrollHeight;
  }

  function wireChatView() {
    scrollChatToBottom();
    focusChatInput();
    var form = document.getElementById("chatForm");
    if (!form || form.dataset.wired) return;
    form.dataset.wired = "1";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (chatState.busy) return;
      var input = document.getElementById("chatInput");
      var q = (input.value || "").trim();
      if (!q) return;
      input.value = "";
      sendChatMessage(q);
    });
  }

  function rerenderChat() {
    var root = document.getElementById("viewRoot");
    if (!root || location.pathname.replace(/^\/+/, "").split("/")[0] !== "chat") return;
    root.innerHTML = viewChat();
    scrollChatToBottom();
    wireChatView();
  }

  async function sendChatMessage(q) {
    chatState.busy = true;
    chatState.turns.push({ role: "user", text: q });
    var botTurn = { role: "bot", text: "", pending: true, sources: [] };
    chatState.turns.push(botTurn);
    rerenderChat();

    var sendBtn = document.getElementById("chatSendBtn");
    if (sendBtn) sendBtn.disabled = true;

    try {
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history: chatState.history })
      });
      if (!res.ok || !res.body) throw new Error("सर्वर त्रुटि (" + res.status + ")");

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = "";
      var bubbleEl = document.getElementById("chatBubble-" + (chatState.turns.length - 1));

      while (true) {
        var r = await reader.read();
        if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });
        var parts = buf.split("\n\n");
        buf = parts.pop();
        for (var i = 0; i < parts.length; i++) {
          var block = parts[i];
          var evtMatch = /^event: (.+)$/m.exec(block);
          var dataMatch = /^data: ([\s\S]+)$/m.exec(block);
          if (!evtMatch || !dataMatch) continue;
          var evt = evtMatch[1];
          var data = JSON.parse(dataMatch[1]);
          if (evt === "sources") {
            botTurn.sources = data.sources || [];
          } else if (evt === "delta") {
            botTurn.text += data.text;
            botTurn.pending = false;
            if (bubbleEl) { bubbleEl.innerHTML = chatBubbleInner(botTurn); scrollChatToBottom(); }
          } else if (evt === "error") {
            botTurn.error = data.message;
            botTurn.pending = false;
          }
        }
      }
    } catch (err) {
      botTurn.error = err.message || "अनुरोध विफल हुआ।";
    }

    botTurn.pending = false;
    chatState.history.push({ role: "user", content: q });
    if (botTurn.text) chatState.history.push({ role: "assistant", content: botTurn.text });
    chatState.busy = false;
    rerenderChat();
    if (sendBtn) sendBtn.disabled = false;
  }

  function viewStub(hi, en) {
    return '<main class="content-pad"><div class="page-header"><h1>' + bilingual(hi, en) + '</h1></div>' +
      '<div class="empty-state">' + bilingual("यह सुविधा जल्द आ रही है।", "This feature is coming soon.") + '</div></main>';
  }

  function viewSearch(params) {
    return viewLibrary(params);
  }

  /* ---------------- पंचांग पेज ---------------- */
  function panchangDetailRow(icon, label, value) {
    return '<div class="pd-row"><span class="pd-ic">' + icon + '</span><span class="pd-label">' + bilingual(label) + '</span><span class="pd-val">' + esc(value) + '</span></div>';
  }
  /* the vrats and festivals of the selected day, each linking to its page */
  function panchangVratBlock(p) {
    var list = vratsFor(p).slice(0, 8);
    if (!list.length) return "";
    return '<div class="pd-section-title">' + bilingual("व्रत एवं पर्व") + '</div><div class="pd-vrats">' +
      list.map(function (v) { return '<a class="pd-vrat" href="' + vratPath(v) + '"><span aria-hidden="true">' + esc(v.icon || "🙏") + '</span>' + esc(v.name) + '</a>'; }).join("") + '</div>';
  }
  function viewPanchang() {
    var city = getPanchangCity();
    var today = new Date();
    var selDate = new Date(today.getTime() + panchangState.dayOffset * 86400000);
    var p = getPanchang(selDate, city);
    var cityOpts = PANCHANG_CITIES.map(function (c) {
      return '<option value="' + c.key + '"' + (c.key === city.key ? " selected" : "") + '>' + esc(c.hi) + '</option>';
    }).join("");

    var MONTH_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"];
    var DAY_RANGE = 30;
    var week = [];
    for (var i = -DAY_RANGE; i <= DAY_RANGE; i++) {
      var dt = new Date(today.getTime() + i * 86400000);
      var pw = getPanchang(dt, city);
      var showMonth = i === -DAY_RANGE || dt.getDate() === 1;
      week.push('<button type="button" class="pw-day' + (i === panchangState.dayOffset ? " active" : "") + (i === 0 ? " is-today" : "") + '" data-offset="' + i + '">' +
        (showMonth ? '<div class="pw-month">' + esc(MONTH_HI[dt.getMonth()]) + '</div>' : '') +
        '<div class="pw-weekday">' + esc(pw.weekdayHi.slice(0, 3)) + '</div>' +
        '<div class="pw-date">' + dt.getDate() + '</div>' +
        '<div class="pw-tithi">' + esc(pw.tithiName) + '</div></button>');
    }

    return '<main class="content-pad">' +
      '<div class="panchang-page">' +
      '<div class="page-header"><h1>' + bilingual("पंचांग") + '</h1>' +
      '<select class="pc-city" id="panchangPageCitySelect">' + cityOpts + '</select></div>' +
      '<div class="panchang-week-wrap">' +
      '<button class="row-nav prev" aria-label="पिछला">‹</button>' +
      '<div class="panchang-week-strip" id="panchangWeekStrip">' + week.join("") + '</div>' +
      '<button class="row-nav next" aria-label="अगला">›</button>' +
      '</div>' +
      '<div class="panchang-detail-card">' +
      '<div class="pd-date-head"><h2>' + esc(p.weekdayHi) + ', ' + esc(formatHindiDate(p.date)) + '</h2>' +
      '<div class="pd-sub">' + esc(p.paksha) + ' पक्ष • ' + esc(p.tithiName) + ' • ' + esc(city.hi) + '</div></div>' +
      '<div class="pd-section-title">' + bilingual("पंचांग विवरण") + '</div>' +
      '<div class="pd-rows">' +
      panchangDetailRow("🌙", "तिथि", p.paksha + " " + p.tithiName) +
      panchangDetailRow("✦", "नक्षत्र", p.nakshatraName + " (चरण " + p.nakshatraPada + ")") +
      panchangDetailRow("☯", "योग", p.yogaName) +
      panchangDetailRow("◐", "करण", p.karanName) +
      panchangDetailRow("📆", "वार", p.weekdayHi) +
      panchangDetailRow("🗓", "मास", p.adhika ? "अधिक मास" : p.maas) +
      '</div>' +
      panchangVratBlock(p) +
      '<div class="pd-section-title">' + bilingual("सूर्य एवं मुहूर्त") + '</div>' +
      '<div class="pd-rows">' +
      panchangDetailRow("🌅", "सूर्योदय", p.sunrise) +
      panchangDetailRow("🌇", "सूर्यास्त", p.sunset) +
      panchangDetailRow("🕉", "अभिजीत मुहूर्त", p.abhijit.start + " – " + p.abhijit.end) +
      '</div>' +
      '<div class="pd-section-title">' + bilingual("अशुभ काल") + '</div>' +
      '<div class="pd-rows">' +
      panchangDetailRow("⛔", "राहुकाल", p.rahukal.start + " – " + p.rahukal.end) +
      panchangDetailRow("⚠", "यमगण्ड", p.yamaganda.start + " – " + p.yamaganda.end) +
      panchangDetailRow("⚠", "गुलिक काल", p.gulikakal.start + " – " + p.gulikakal.end) +
      '</div>' +
      '<p class="pd-disclaimer">' + bilingual("यह पंचांग खगोलीय सन्निकटन (approximation) पर आधारित है और केवल सामान्य जानकारी हेतु है। महत्वपूर्ण मुहूर्तों के लिए कृपया किसी प्रामाणिक पंचांग या विद्वान् से परामर्श करें।") + '</p>' +
      '</div></div></main>';
  }

  /* ---------------- सहायता ---------------- */
  var HELP_FAQS = [
    ["कल्याण क्या है?", "कल्याण गीता प्रेस की पुस्तकों का एक डिजिटल पुस्तकालय है, जहाँ आप सैकड़ों धार्मिक ग्रंथ निःशुल्क पढ़ सकते हैं।"],
    ["क्या मुझे पढ़ने के लिए खाता बनाना ज़रूरी है?", "नहीं, आप बिना खाता बनाये भी सभी ग्रंथ पढ़ सकते हैं। आपकी पठन-प्रगति और पसंदीदा सूची इसी ब्राउज़र में सुरक्षित रहती है।"],
    ["मैं अपनी पठन-स्थिति कैसे जारी रखूँ?", "\"अध्ययन\" अनुभागमें आपको वे सभी ग्रंथ मिलेंगे जो आपने पहले पढ़ने शुरू किये हैं — जहाँसे छोड़ा था, वहींसे आगे पढ़ सकते हैं।"],
    ["पंचांग की जानकारी कितनी सटीक है?", "यहाँ दिखाया गया पंचांग खगोलीय सन्निकटन पर आधारित एक अनुमान है — यह सामान्य जानकारी के लिए उपयोगी है, परन्तु महत्वपूर्ण मुहूर्तों हेतु प्रामाणिक पंचांग से पुष्टि करें।"],
    ["मुझे किसी ग्रंथ में त्रुटि मिली, क्या करूँ?", "कृपया \"विषय सुधार\" पृष्ठ से हमें सूचित करें — हम उसे यथाशीघ्र सुधारने का प्रयास करेंगे।"]
  ];
  /* ---------------- vrats & festivals: /vrat (everything) and /vrat/<slug> (one) ---------------- */
  var VRAT_DETAIL = {};
  var VRAT_PARTS = [
    ["intro", "परिचय", "About"], ["poojaVidhan", "पूजा विधान", "How it is observed"],
    ["vratKatha", "व्रत कथा", "The story"], ["historicImportance", "पौराणिक एवं ऐतिहासिक महत्व", "Scriptural & historical significance"]
  ];
  function vratParas(t) { return String(t || "").split(/\n+/).filter(Boolean).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join(""); }
  function vratParts(o) {
    return VRAT_PARTS.map(function (s) {
      return o[s[0]] ? '<section class="vrat-sec"><h3>' + esc(tx(s[1], s[2])) + '</h3>' + vratParas(o[s[0]]) + '</section>' : "";
    }).join("");
  }
  function vratMonthIndex(v) {
    var r = v.rules && v.rules[0], m = r && r.maas && r.maas[0];
    var i = HINDU_MONTHS.indexOf(m);
    return i !== -1 ? i : m === "अधिक" ? 12 : 13;
  }
  function vratDayKey(v) {                      // within a purnimanta month the कृष्ण पक्ष comes first
    var r = v.rules && v.rules[0], t = r && r.tithis && r.tithis[0];
    if (!t) return 999;
    return (t.charAt(0) === "K" ? 0 : 100) + parseInt(t.slice(2), 10);
  }
  /* ---- the list page: a hero with search, "today", then the months from the running one on ----
     Three card shapes: a wide card for today's vrats, an upright tile for the running month, a row for everything else.
     Every group shows its first few and opens to the rest with "देखें सभी". */
  function vratSearchText(v) { return esc((v.name + " " + (v.aliases || []).join(" ") + " " + v.maas + " " + v.tithi).toLowerCase()); }
  /* English / Roman search: the Hindi text transliterated, the slug (which is already an English name), and the
     other spellings people type for the bigger festivals. */
  var VRAT_EN = {
    diwali: "deepavali dipawali lakshmi puja", dussehra: "dasara vijayadashami dashain", "karva-chauth": "karwa chauth karak chaturthi",
    mahashivratri: "maha shivaratri shiv ratri", janmashtami: "krishna janmashtami gokulashtami", holi: "holika dahan", navratri: "navaratri durga puja sharad navratri",
    "raksha-bandhan": "rakhi", "ram-navami": "rama navami", "ganesh-chaturthi": "vinayak chaturthi ganeshotsav", "vinayaka-chaturthi": "ganesh chaturthi",
    "sankashti-chaturthi": "sankashta sankat chauth sakat", "basant-panchami": "vasant panchami saraswati puja", "akshaya-tritiya": "akshay tritiya akha teej",
    "bhai-dooj": "bhaiya dooj bhau beej yama dwitiya", "guru-purnima": "vyasa purnima", "sharad-purnima": "kojagiri kaumudi", "kartik-purnima": "dev deepawali tripurari",
    "mauni-amavasya": "magh amavasya", "nag-panchami": "naga panchami", "anant-chaturdashi": "anant chaudas", "vat-savitri": "vat purnima savitri",
    "govardhan-puja": "annakut", "ahoi-ashtami": "ahoi mata", "dhanteras": "dhanatrayodashi dhan teras", "haritalika": "hartalika teej", "pradosh-vrat": "pradosham",
    "ekadashi-vrat": "ekadasi", "purnima-vrat": "poornima full moon", "amavasya-vrat": "new moon", "somvar-vrat": "monday", "mangalvar-vrat": "tuesday",
    "budhvar-vrat": "wednesday", "brihaspativar-vrat": "thursday guruvar", "shukravar-vrat": "friday", "shanivar-vrat": "saturday", "ravivar-vrat": "sunday", "solah-somvar": "16 monday",
    "jagannath-rath-yatra": "rath yatra", "tulsi-vivah": "tulsi marriage", "satyanarayan-vrat": "satyanarayana katha"
  };
  var VRAT_EN_MONTH = ["chaitra", "vaishakh", "jyeshtha", "ashadh", "shravan", "bhadrapad", "ashwin", "kartik", "margashirsha agahan", "paush", "magh", "phalgun"];
  function vratRomanIndex(v) {
    var m = HINDU_MONTHS.indexOf(v.maas);
    var s = devanagariToRoman([v.name, (v.aliases || []).join(" "), v.maas, v.tithi].join(" ")) + " " + String(v.slug || "").replace(/-/g, " ") + " " + (VRAT_EN[v.slug] || "") + " " + (m === -1 ? "" : VRAT_EN_MONTH[m]);
    return normalizeRoman(s);
  }
  /* every typed word must appear in the index; trailing "a" and inner "a"s are forgiven (same as the library search) */
  function vratRomanHit(hay, qRoman) {
    var skelHay = hay.replace(/a/g, "");
    return qRoman.split(" ").every(function (w) {
      if (hay.indexOf(w) !== -1) return true;
      var bare = w.replace(/a$/, "");
      if (bare.length >= 2 && bare !== w && hay.indexOf(bare) !== -1) return true;
      var skel = w.replace(/a/g, "");
      return skel.length >= 3 && skelHay.indexOf(skel) !== -1;
    });
  }
  function vratSub(v) { return [v.maas, v.tithi].filter(Boolean).join(" · "); }
  function vratNextHtml(v) {
    var nx = vratNext(v) || vratNextFar(v);
    return nx ? '<small class="vc-next">📅 ' + esc(vratNextText(nx)) + '</small>' : "";
  }
  function vratRow(v) {
    var sub = vratSub(v);
    return '<a class="vrow" href="' + vratPath(v) + '" data-q="' + vratSearchText(v) + '" data-r="' + esc(vratRomanIndex(v)) + '"><span class="vc-ic" aria-hidden="true">' + esc(v.icon || "🙏") + '</span>' +
      '<span class="vc-tx"><b>' + esc(v.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : "") + vratNextHtml(v) + '</span><i class="vc-go" aria-hidden="true">›</i></a>';
  }
  function vratTile(v) {
    var sub = vratSub(v);
    return '<a class="vtile" href="' + vratPath(v) + '" data-q="' + vratSearchText(v) + '" data-r="' + esc(vratRomanIndex(v)) + '"><span class="vc-ic" aria-hidden="true">' + esc(v.icon || "🙏") + '</span>' +
      '<b>' + esc(v.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : "") + vratNextHtml(v) + '<i class="vc-go" aria-hidden="true">›</i></a>';
  }
  function vratTodayCard(v) {
    var sub = vratSub(v);
    return '<a class="vtoday" href="' + vratPath(v) + '" data-q="' + vratSearchText(v) + '" data-r="' + esc(vratRomanIndex(v)) + '"><span class="vt-thumb" aria-hidden="true">' + esc(v.icon || "🙏") + '</span>' +
      '<span class="vt-body"><b>' + esc(v.name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : "") +
      '<span class="vt-btn">' + esc(tx("विवरण देखें", "View details")) + ' →</span></span><i class="vc-go" aria-hidden="true">›</i></a>';
  }
  /* the month a vrat is filed under: of the months it is observed in, the one that comes first from the running month on */
  function vratMonthFrom(v, now) {
    var best = -1, bestD = 99;
    (v.rules || []).forEach(function (r) {
      (r.maas || []).forEach(function (m) {
        var i = HINDU_MONTHS.indexOf(m);
        if (i === -1) return;
        var d = (i - now + 12) % 12;
        if (d < bestD) { bestD = d; best = i; }
      });
    });
    if (best !== -1) return best;
    return (v.rules || []).some(function (r) { return (r.maas || []).indexOf("अधिक") !== -1; }) ? 12 : 13;
  }
  function vratByNext(a, b) {
    var na = vratNext(a), nb = vratNext(b);
    return (na ? na.days : 99999) - (nb ? nb.days : 99999) || vratDayKey(a) - vratDayKey(b) || a.order - b.order;
  }
  /* o = { title, icon, list, shape: "today" | "tile" | "row", limit, cls, aside (html next to the title) } */
  function vratSection(o) {
    if (!o.list.length) return "";
    var card = o.shape === "today" ? vratTodayCard : o.shape === "tile" ? vratTile : vratRow;
    return '<section class="vs vs-' + o.shape + (o.cls ? " " + o.cls : "") + '"><header class="vs-head"><span class="vs-ic" aria-hidden="true">' + o.icon + '</span><h2>' + esc(o.title) + '</h2>' +
      '<span class="vs-pill">' + o.list.length + ' ' + esc(tx("व्रत / पर्व", "vrats / festivals")) + '</span>' + (o.aside || "") +
      (o.list.length > o.limit ? '<button type="button" class="vs-all" data-vs-all>' + esc(tx("देखें सभी", "See all")) + ' <i>›</i></button>' : "") + '</header>' +
      '<div class="vs-grid">' + o.list.map(function (v, i) { return i < o.limit ? card(v) : card(v).replace("<a ", '<a data-extra ') ; }).join("") + '</div></section>';
  }
  var VRAT_POPULAR = [["एकादशी", "एकादशी"], ["नवरात्रि", "नवरात्र"], ["शिवरात्रि", "शिवरात्रि"], ["करवा चौथ", "करवा चौथ"], ["दीपावली", "दीपावली"], ["संकष्टी चतुर्थी", "संकष्ट"]];
  function vratHero() {
    return '<header class="vrat-hero"><div class="vrat-hero-in"><span class="vh-lotus" aria-hidden="true">🪷</span>' +
      '<h1>' + esc(tx("व्रत एवं पर्व", "Vrats & Festivals")) + '</h1>' +
      '<p>' + esc(tx("भारतीय सनातन परम्परा के पवित्र व्रत, पर्व और तिथियों का विस्तृत मार्गदर्शन", "A detailed guide to the sacred vrats, festivals and tithis of the Sanatan tradition")) + '</p>' +
      '<form class="vh-search" role="search" id="vratForm"><span aria-hidden="true">🔍</span><input id="vratSearch" type="search" autocomplete="off" placeholder="' + esc(tx("व्रत, पर्व, मास या तिथि खोजें…", "Search a vrat, festival, month or tithi…")) + '" aria-label="' + esc(tx("खोजें", "Search")) + '">' +
      '<button type="submit">' + esc(tx("खोजें", "Search")) + '</button></form>' +
      '<div class="vh-pop"><span>' + esc(tx("लोकप्रिय खोज:", "Popular:")) + '</span>' + VRAT_POPULAR.map(function (c) {
        return '<button type="button" class="vh-chip" data-vq="' + esc(c[1]) + '">' + esc(c[0]) + '</button>';
      }).join("") + '</div></div></header>';
  }

  function viewVratList() {
    if (!VRATS.length) {
      loadVrats().then(function () { if (parsePath().path.split("/")[0] === "vrat") render(); });
      return '<section class="vrat-page">' + vratHero() + '<main class="content-pad vrat-wrap vrat-sheet"><p class="vrat-loading">' + esc(tx("लोड हो रहा है…", "Loading…")) + '</p></main></section>';
    }
    var p = getPanchang(new Date(), getPanchangCity());
    var todays = vratsFor(p), show = VRATS.filter(function (v) { return v.kind !== "variant"; });
    var html = '<section class="vrat-page">' + vratHero() + '<main class="content-pad vrat-wrap vrat-sheet">';
    html += vratSection({
      title: tx("आज के व्रत एवं पर्व", "Today's vrats & festivals"), icon: "🗓️", list: todays, shape: "today", limit: 4, cls: "is-today",
      aside: '<a class="vs-date" href="/panchang">📅 ' + esc(tx("आज: ", "Today: ")) + esc(p.weekdayHi + ", " + formatHindiDate(p.date)) + ' <i>›</i></a>'
    });
    var festivals = show.filter(function (v) { return v.kind === "festival"; });
    var now = HINDU_MONTHS.indexOf(p.maas), order = [];
    for (var k = 0; k < 12; k++) order.push(((now === -1 ? 0 : now) + k) % 12);
    if (p.adhika) order.unshift(12); else order.push(12);          // in an adhika month that group is the running one
    order.push(13);
    var curNow = now === -1 ? 0 : now, first = true;
    order.forEach(function (mi) {
      var list = festivals.filter(function (v) { return vratMonthFrom(v, curNow) === mi; }).sort(vratByNext);
      var running = mi === (p.adhika ? 12 : now);
      var title = mi < 12 ? HINDU_MONTHS[mi] + tx(" मास", " month") : mi === 12 ? tx("अधिक मास", "Adhika month") : tx("अन्य", "Other");
      html += vratSection({ title: title, icon: running ? "📖" : "🪔", list: list, shape: running ? "tile" : "row", limit: 6, cls: running ? "is-now" : "",
        aside: running ? '<span class="vs-now">' + esc(tx("चल रहा है", "running now")) + '</span>' : "" });
    });
    html += vratSection({ title: tx("प्रत्येक मास की तिथियों के व्रत", "Monthly tithi vrats"), icon: "🌙", shape: "row", limit: 6, list: show.filter(function (v) { return v.kind === "tithi"; }).sort(vratByNext) });
    html += vratSection({ title: tx("साप्ताहिक व्रत", "Weekly vrats"), icon: "🪷", shape: "row", limit: 6, list: show.filter(function (v) { return v.kind === "weekly"; }).sort(vratByNext) });
    html += vratSection({ title: tx("शास्त्रीय सन्दर्भ एवं नियम", "Scriptural references & rules"), icon: "📜", shape: "row", limit: 6, list: show.filter(function (v) { return v.kind === "reference" || v.kind === "other"; }) });
    html += vratSection({ title: tx("शास्त्रों में वर्णित तिथियाँ एवं घटनाएँ", "Dated events in the scriptures"), icon: "🏹", shape: "row", limit: 6, list: show.filter(function (v) { return v.kind === "event"; }) });
    html += '<p class="vrat-empty" hidden>' + esc(tx("कोई प्रविष्टि नहीं मिली।", "Nothing found.")) + '</p>' +
      '<p class="vrat-note">📅 ' + esc(tx("चल रहे मास से आरम्भ करके आगे के मास क्रम से। हर व्रत के नीचे उसकी अगली सम्भावित अंग्रेज़ी तिथि दी गयी है — यह खगोलीय गणना (" + getPanchangCity().hi + ") से निकली अनुमानित तिथि है; पर्व-निर्णय के लिए स्थानीय पंचांग देखें।",
        "Starting from the running month and following the months in order. Under each vrat is its next probable English date, worked out from an astronomical calculation (" + getPanchangCity().key + "); check a local panchang for the final date.")) + '</p>' +
      '</main></section>';
    return html;
  }
  function wireVratList() {
    var page = document.querySelector(".vrat-page"), box = document.getElementById("vratSearch");
    if (!page || !box) return;
    function filter() {
      var q = box.value.trim().toLowerCase(), any = false, qRoman = normalizeRoman(devanagariToRoman(q));
      page.classList.toggle("is-searching", !!q);
      page.querySelectorAll("[data-q]").forEach(function (c) {
        var hit = !q || c.getAttribute("data-q").indexOf(q) !== -1 || (qRoman && vratRomanHit(c.getAttribute("data-r") || "", qRoman));
        c.hidden = !hit; if (hit) any = true;
      });
      page.querySelectorAll(".vs").forEach(function (g) { g.hidden = !g.querySelector("[data-q]:not([hidden])"); });
      var none = page.querySelector(".vrat-empty"); if (none) none.hidden = any;
    }
    box.addEventListener("input", filter);
    var form = document.getElementById("vratForm");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); filter(); var first = page.querySelector("[data-q]:not([hidden])"); if (first && box.value.trim()) first.scrollIntoView({ block: "center", behavior: "smooth" }); });
    page.addEventListener("click", function (e) {
      var chip = e.target.closest ? e.target.closest("[data-vq]") : null;
      if (chip) { box.value = chip.getAttribute("data-vq"); filter(); return; }
      var all = e.target.closest ? e.target.closest("[data-vs-all]") : null;
      if (all) {
        var sec = all.closest(".vs"), open = sec.classList.toggle("is-open");
        all.innerHTML = esc(open ? tx("कम दिखाएँ", "Show less") : tx("देखें सभी", "See all")) + " <i>" + (open ? "‹" : "›") + "</i>";
      }
    });
  }

  function viewVrat(slug) {
    return '<main class="content-pad vrat-wrap"><a class="vrat-back" href="/vrat">← ' + esc(tx("सभी व्रत एवं पर्व", "All vrats & festivals")) + '</a>' +
      '<div id="vratBody" class="vrat-body" data-slug="' + esc(slug) + '"><p class="vrat-loading">' + esc(tx("लोड हो रहा है…", "Loading…")) + '</p></div></main>';
  }
  function vratSourceHtml(s) {
    var head = [s.granth, s.kand, s.adhyay].filter(Boolean).join(" · ");
    var meta = [s.tithi, s.paksh, s.maas, s.nakshatra, s.muhurta].filter(Boolean).join(" · ");
    function row(label, val) { return val ? '<p><b>' + esc(label) + ':</b> ' + esc(val) + '</p>' : ""; }
    return '<article class="vrat-src"><div class="vs-head">' + esc(head) + '</div>' + (meta ? '<div class="vs-meta">' + esc(meta) + '</div>' : "") +
      row(tx("घटना", "Event"), s.ghatna) + (s.vivran ? '<p>' + esc(s.vivran) + '</p>' : "") + row(tx("महत्व", "Significance"), s.mahatva) +
      row(tx("अनुष्ठान", "Observance"), s.anushthan) + row(tx("फल", "Fruit"), s.phal) +
      ((s.tags || []).length ? '<div class="vs-tags">' + s.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</div>' : "") + '</article>';
  }
  function vratNextBlock(v) {
    if (!VRAT_AUTO[v.kind]) return "";
    var list = vratOccurrences(v, v.kind === "festival" ? 2 : 3, 1250);
    if (!list.length) return "";
    return '<p class="vrat-next">📅 <b>' + esc(tx("अगली सम्भावित तिथि: ", "Next probable date: ")) + '</b>' +
      list.map(function (o) { return esc(vratNextText(o)); }).join(' &nbsp;•&nbsp; ') + '</p>';
  }
  function vratDetailHtml(v) {
    var p = getPanchang(new Date(), getPanchangCity());
    var isToday = vratsFor(p).some(function (x) { return x.slug === v.slug; });
    var chips = [v.maas, v.tithi].filter(Boolean).map(function (c) { return '<span class="vrat-chip">' + esc(c) + '</span>'; }).join("");
    var html = '<header class="vrat-head"><span class="vh-ic" aria-hidden="true">' + esc(v.icon || "🙏") + '</span><div><h1>' + esc(v.name) + '</h1>' +
      '<div class="vrat-chips">' + chips + (isToday ? '<span class="vrat-chip is-today">' + esc(tx("आज", "Today")) + '</span>' : "") + '</div>' +
      vratNextBlock(v) +
      ((v.aliases || []).length ? '<p class="vrat-alias">' + esc(tx("अन्य नाम: ", "Also known as: ")) + esc(v.aliases.join(" · ")) + '</p>' : "") + '</div></header>';
    html += vratParts(v);
    (v.extras || []).forEach(function (x) {
      html += '<details class="vrat-more"><summary>' + esc(x.label) + (x.name ? " — " + esc(x.name) : "") + '</summary>' + vratParts(x) + '</details>';
    });
    if ((v.variants || []).length) {
      var monthOf = function (x) { var r = x.rules && x.rules[0], i = r && r.maas ? HINDU_MONTHS.indexOf(r.maas[0]) : -1; return i === -1 ? 99 : i; };
      html += '<section class="vrat-sec"><h3>' + esc(tx("मासानुसार विशेष जानकारी", "Month-wise details")) + '</h3>' + v.variants.slice().sort(function (a, b) { return monthOf(a) - monthOf(b); }).map(function (x) {
        var now = (x.rules || []).some(function (r) { return r.maas && r.maas.indexOf(p.maas) !== -1; });
        return '<details class="vrat-more"' + (now ? " open" : "") + '><summary>' + esc(x.name) + (now ? ' <span class="vrat-chip is-today">' + esc(tx("इस मास", "this month")) + '</span>' : "") + '</summary>' + vratParts(x) + '</details>';
      }).join("") + '</section>';
    }
    if ((v.sources || []).length) {
      html += '<section class="vrat-sec"><h3>' + esc(tx("शास्त्रीय सन्दर्भ", "Scriptural references")) + ' <span class="vrat-count">' + v.sources.length + '</span></h3>' + v.sources.map(vratSourceHtml).join("") + '</section>';
    }
    html += '<section class="row-section"><div class="row-head"><h2>' + esc(tx("सम्बन्धित ग्रंथ", "Related books")) + '</h2></div><div class="special-book-row">' + vratBooks(v).map(specialBookTile).join("") + '</div></section>';
    return html;
  }
  function loadVratDetail(slug) {
    function show(v) {
      var host = document.getElementById("vratBody");
      if (!host || host.getAttribute("data-slug") !== slug) return;
      host.innerHTML = vratDetailHtml(v);
      setMeta(v.name + " — व्रत एवं पर्व | कल्याण", String(v.intro || "").slice(0, 160), vratPath(v));
    }
    if (VRAT_DETAIL[slug]) { show(VRAT_DETAIL[slug]); return; }
    apiGet("/api/vrats/" + encodeURIComponent(slug)).then(function (d) { VRAT_DETAIL[slug] = d.vrat; show(d.vrat); }).catch(function () {
      var host = document.getElementById("vratBody");
      if (host && host.getAttribute("data-slug") === slug) host.innerHTML = '<p class="vrat-loading">' + esc(tx("यह प्रविष्टि नहीं मिली।", "This entry could not be found.")) + ' <a href="/vrat">' + esc(tx("सभी व्रत देखें", "See all")) + '</a></p>';
    });
  }

  function viewHelp() {
    return '<main class="content-pad"><div class="page-header"><h1>' + bilingual("सहायता") + '</h1></div>' +
      '<div class="help-faq-list">' + HELP_FAQS.map(function (f) {
        return '<details class="help-faq-item"><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>';
      }).join("") + '</div>' +
      '<p class="help-contact">' + bilingual("अपना प्रश्न यहाँ नहीं मिला?") + ' <a href="/feedback">' + bilingual("हमें लिखें") + '</a></p>' +
      '</main>';
  }

  /* ---------------- विषय सुधार (content feedback) ---------------- */
  function viewFeedback() {
    return '<main class="content-pad"><div class="page-header"><h1>' + bilingual("विषय सुधार") + '</h1></div>' +
      '<p class="feedback-intro">' + bilingual("किसी ग्रंथ में त्रुटि, अशुद्ध पाठ, या कोई अन्य सुझाव हो तो कृपया नीचे बताएँ। आपका सुझाव इस उपकरण पर सुरक्षित रहता है और हमारी टीम द्वारा देखा जाएगा।") + '</p>' +
      '<form class="feedback-form" id="feedbackForm">' +
      '<label>' + bilingual("ग्रंथ / पृष्ठ का नाम (वैकल्पिक)") + '<input type="text" id="feedbackBook" placeholder="जैसे — श्रीमद्भगवद्गीता साधक संजीवनी"></label>' +
      '<label>' + bilingual("आपका सुझाव") + '<textarea id="feedbackText" rows="5" placeholder="यहाँ लिखें..." required></textarea></label>' +
      '<button type="submit" class="btn-primary">' + bilingual("सुझाव भेजें") + '</button>' +
      '</form>' +
      '<div id="feedbackHistory"></div>' +
      '</main>';
  }
  function getFeedbackList() { return readJSON(LS.feedback, []); }
  function addFeedback(book, text) {
    var list = getFeedbackList();
    list.unshift({ book: book, text: text, ts: Date.now() });
    writeJSON(LS.feedback, list.slice(0, 50));
  }
  function renderFeedbackHistory() {
    var wrap = document.getElementById("feedbackHistory");
    if (!wrap) return;
    var list = getFeedbackList();
    if (!list.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<div class="page-header"><h2>' + bilingual("आपके पूर्व सुझाव") + '</h2></div>' +
      '<div class="comment-list">' + list.map(function (f) {
        return '<div class="comment-item"><div class="comment-head"><b>' + esc(f.book || "सामान्य सुझाव") + '</b>' +
          '<span class="comment-time">' + timeAgo(f.ts) + '</span></div><p>' + esc(f.text) + '</p></div>';
      }).join("") + '</div>';
  }

  /* ---------------- सेटिंग्स / खाता ---------------- */
  function viewSettings() {
    var user = getCurrentUser();
    var html = '<main class="content-pad"><div class="page-header"><h1>' + bilingual("सेटिंग्स", "Settings") + '</h1></div>';
    if (user) {
      html += '<div class="account-card">' +
        '<div class="account-name">' + esc(user.name) + (user.role === "admin" ? ' <span class="admin-role-badge admin">admin</span>' : '') + '</div>' +
        '<div class="account-email">' + esc(user.email) + '</div>' +
        '<button class="btn-outline" id="logoutBtn">लॉगआउट</button>' +
        (user.role === "admin" ? '<a class="btn-primary admin-settings-link" href="/admin">एडमिन पैनल खोलें</a>' : '') +
        '</div>';
    } else {
      html += '<div class="account-card"><p>अपनी पठन-प्रगति सभी उपकरणों पर सुरक्षित रखने और टिप्पणी करने के लिए साइन इन करें।</p>' +
        '<a class="btn-primary" href="/login">साइन इन करें</a> <a class="btn-outline" href="/signup">खाता बनाएं</a></div>';
    }
    var lang = getTaxLang();
    html += '<div class="account-card taxlang-card">' +
      '<div class="account-name">' + esc(tx("वर्गीकरण की भाषा", "Taxonomy language")) + '</div>' +
      '<p class="muted-note">' + esc(tx("श्रेणियों, फ़िल्टर और लेखक-भूमिकाओं (लेखक, टीकाकार, अनुवादक, प्रकाशक) के नाम किस भाषा में दिखें।",
        "Language for category names, filters and author roles (author, commentator, translator, publisher).")) + '</p>' +
      '<div class="taxlang-options">' +
      '<button type="button" class="btn-outline' + (lang === "hi" ? " active" : "") + '" data-taxlang="hi">हिन्दी</button>' +
      '<button type="button" class="btn-outline' + (lang === "en" ? " active" : "") + '" data-taxlang="en">English</button>' +
      '</div></div>';
    html += '</main>';
    return html;
  }

  /* ---------------- auth pages ---------------- */
  function googleButtonBlock() {
    if (!GOOGLE_CLIENT_ID) return "";
    return '<div id="googleSignInBtn" class="google-signin-btn"></div>' +
      '<div class="auth-divider"><span>' + bilingual("या", "or") + '</span></div>';
  }

  function viewLogin() {
    return '<main class="content-pad auth-page">' +
      '<div class="page-header"><h1>' + bilingual("साइन इन करें", "Sign in") + '</h1></div>' +
      '<div class="auth-error" id="authError"></div>' +
      googleButtonBlock() +
      '<form class="auth-form" id="loginForm">' +
      '<label>ईमेल<input type="text" id="loginEmail" autocomplete="username" required></label>' +
      '<label>पासवर्ड<input type="password" id="loginPassword" autocomplete="current-password" required></label>' +
      '<button type="submit" class="btn-primary">साइन इन करें</button>' +
      '</form>' +
      '<p class="auth-switch">खाता नहीं है? <a href="/signup">खाता बनाएं</a></p>' +
      '</main>';
  }

  function viewSignup() {
    return '<main class="content-pad auth-page">' +
      '<div class="page-header"><h1>' + bilingual("खाता बनाएं", "Create account") + '</h1></div>' +
      '<div class="auth-error" id="authError"></div>' +
      googleButtonBlock() +
      '<form class="auth-form" id="signupForm">' +
      '<label>नाम<input type="text" id="signupName" required></label>' +
      '<label>ईमेल<input type="text" id="signupEmail" autocomplete="username" required></label>' +
      '<label>पासवर्ड<input type="password" id="signupPassword" autocomplete="new-password" required minlength="4"></label>' +
      '<button type="submit" class="btn-primary">खाता बनाएं</button>' +
      '</form>' +
      '<p class="auth-switch">पहले से खाता है? <a href="/login">साइन इन करें</a></p>' +
      '</main>';
  }

  /* ---------------- लेखक (authors) ---------------- */
  /* Author portraits, keyed by the exact name used in the book data. */
  var AUTHOR_PHOTOS = {
    "महर्षि वेदव्यास": "assets/authors/ved-vyas.webp",
    "श्रद्धेय श्रीहनुमानप्रसादजी पोद्दार": "assets/authors/hanumanprasad-poddar.webp",
    "श्रद्धेय स्वामी श्रीरामसुखदासजी महाराज": "assets/authors/ramsukhdas.webp",
    "श्रद्धेय श्रीजयदयालजी गोयन्दका": "assets/authors/jaydayal-goyandka.webp",
    "श्रीगोस्वामी तुलसीदासजी": "assets/authors/tulsidas.webp",
    "स्वामी शरणानन्द जी महाराज": "assets/authors/sharananand.webp"
  };

  function authorAvatarEl(author, size) {
    var name = String(author.name || "").trim();
    var photo = author.photoPath || AUTHOR_PHOTOS[name];
    if (photo) {
      return '<div class="cover cover-' + (size || "md") + ' has-img author-photo"><img src="' + esc(photo) + '" alt="' + esc(name) + '" loading="lazy"></div>';
    }
    var g = PALETTE[hashCode(name) % PALETTE.length];
    return '<div class="cover cover-' + (size || "md") + ' author-photo" style="background:linear-gradient(150deg,' + g[0] + ',' + g[1] + ')">' +
      '<span class="cover-letter">' + esc((name || "?").charAt(0)) + '</span></div>';
  }

  /* Rendered synchronously from the four book fields (see PEOPLE) -- no network call. */
  function viewAuthors() {
    var groups = PERSON_ROLES.map(function (role) {
      var list = PEOPLE.filter(function (p) { return p.roles[role.key].length; }).sort(function (a, b) {
        return b.roles[role.key].length - a.roles[role.key].length || a.name.localeCompare(b.name, "hi");
      });
      if (!list.length) return "";
      return '<section class="authors-group"><h2 class="authors-group-title">' + esc(roleLabel(role, true)) +
        ' <span class="cnt">(' + list.length + ')</span></h2><div class="authors-grid">' +
        list.map(function (p) {
          var n = p.roles[role.key].length;
          return '<a class="author-card" href="' + personPath(p.name) + '">' + authorAvatarEl({ name: p.name }, "md") +
            '<div class="author-card-name">' + esc(p.name) + '</div>' +
            '<div class="author-card-count">' + n + ' ' + booksWord(n) + '</div></a>';
        }).join("") + '</div></section>';
    }).join("");
    return '<main class="content-pad"><div class="page-header"><h1>' + esc(tx("लेखक", "Authors")) + '</h1>' + taxLangToggleHtml() + '</div>' +
      (groups || '<div class="empty-state">' + esc(tx("कोई लेखक नहीं मिला", "No authors found")) + '</div>') + '</main>';
  }

  function resolvePerson(x) {
    if (x === undefined || x === null) return null;
    var decoded;
    try { decoded = decodeURIComponent(x); } catch (e) { decoded = x; }
    return PEOPLE_BY_SLUG[decoded] || null;
  }

  function viewAuthor(p) {
    var chips = PERSON_ROLES.filter(function (r) { return p.roles[r.key].length; }).map(function (r) {
      return '<span class="tag">' + esc(roleLabel(r)) + ' · ' + p.roles[r.key].length + ' ' + booksWord(p.roles[r.key].length) + '</span>';
    }).join("");
    var sections = PERSON_ROLES.filter(function (r) { return p.roles[r.key].length; }).map(function (r) {
      return '<div class="page-header"><h2>' + esc(getTaxLang() === "en" ? "As " + r.en.toLowerCase() : r.label + " के रूप में") + ' (' + p.roles[r.key].length + ')</h2></div>' +
        '<div class="book-grid">' + p.roles[r.key].map(bookCard).join("") + '</div>';
    }).join("");
    return '<main class="content-pad author-page">' +
      '<a href="/authors" class="back-link">← ' + esc(tx("सभी लेखक", "All authors")) + '</a>' +
      '<div class="author-detail-head">' + authorAvatarEl({ name: p.name }, "lg") +
      '<div><h1>' + esc(p.name) + '</h1><div class="tag-row">' + chips + '</div></div></div>' +
      sections + '</main>';
  }

  /* ---------------- एडमिन पैनल ---------------- */
  /* ---------------- एडमिन शेल (persistent sidenav + topbar, used by every admin page) --- */
  var ADMIN_NAV_ITEMS = [
    ["", "📊", "डैशबोर्ड", "Dashboard"],
    ["books", "📚", "पुस्तकें", "Books"],
    ["authors", "✍️", "लेखक", "Authors"],
    ["users", "👥", "उपयोगकर्ता", "Users"],
    ["comments", "💬", "टिप्पणियाँ", "Comments"]
  ];
  function adminShell(active, title, actionHtml, bodyHtml) {
    var nav = ADMIN_NAV_ITEMS.map(function (it) {
      var href = "/admin" + (it[0] ? "/" + it[0] : "");
      return '<a class="admin-sidenav-link' + (it[0] === active ? " active" : "") + '" href="' + href + '">' +
        '<span class="admin-sidenav-icon">' + it[1] + '</span><span>' + bilingual(it[2], it[3]) + '</span></a>';
    }).join("");
    return '<div class="admin-shell">' +
      '<aside class="admin-sidenav">' +
      '<div class="admin-sidenav-brand">🛡️ <span>एडमिन पैनल</span></div>' +
      '<nav>' + nav + '</nav>' +
      '<a class="admin-sidenav-link admin-sidenav-exit" href="/">← ' + bilingual("ऐप पर वापस", "Back to app") + '</a>' +
      '</aside>' +
      '<div class="admin-main">' +
      '<div class="admin-topbar"><h1>' + esc(title) + '</h1><div class="admin-topbar-actions">' + (actionHtml || "") + '</div></div>' +
      '<div class="admin-body">' + bodyHtml + '</div>' +
      '</div></div>';
  }

  function viewAdminHome() {
    var stats = '<div class="admin-stat-grid" id="adminStatGrid">' +
      ['books', 'authors', 'users', 'comments'].map(function (k) {
        return '<div class="admin-stat-card" data-stat="' + k + '"><div class="admin-stat-value">–</div><div class="admin-stat-label"></div></div>';
      }).join("") + '</div>';
    var links = '<div class="admin-nav-grid">' +
      ADMIN_NAV_ITEMS.slice(1).map(function (it) {
        return '<a class="admin-nav-card" href="/admin/' + it[0] + '"><span class="admin-nav-icon">' + it[1] + '</span>' +
          '<span class="admin-nav-label">' + bilingual(it[2], it[3]) + '</span></a>';
      }).join("") + '</div>';
    return adminShell("", bilingual("डैशबोर्ड", "Dashboard"), "", stats + links);
  }

  /* ---------------- पुस्तकें: सूची ---------------- */
  var adminBooksState = { page: 1 };
  var ADMIN_PAGE_SIZE = 25;

  function adminBookTableRow(book) {
    return '<tr class="admin-table-row" data-file="' + esc(book.file) + '">' +
      '<td class="admin-td-cover">' + coverEl(book, "sm") + '</td>' +
      '<td><div class="admin-table-title">' + esc(book.title) + '</div>' +
      '<div class="admin-table-sub">' + esc(book.file) + '</div></td>' +
      '<td>' + esc(book.author) + '</td>' +
      '<td class="admin-td-chips">' + book.categoryMetas.map(function (c) { return '<span class="chip-sm">' + esc(c.hi) + '</span>'; }).join("") + '</td>' +
      '<td class="admin-td-chips">' + book.tags.slice(0, 3).map(function (t) { return '<span class="chip-sm chip-sm-tag">#' + esc(t) + '</span>'; }).join("") +
      (book.tags.length > 3 ? '<span class="chip-sm">+' + (book.tags.length - 3) + '</span>' : '') + '</td>' +
      '<td class="admin-td-actions"><a class="btn-outline-sm" href="/admin/books/edit?file=' + encodeURIComponent(book.file) + '">' + bilingual("संपादित करें", "Edit") + '</a></td>' +
      '</tr>';
  }

  function viewAdminBooksList(params) {
    var q = (params && params.get("q")) || "";
    var list = q ? BOOKS.filter(function (b) { return matchesQuery(b, q); }) : BOOKS;
    var totalPages = Math.max(1, Math.ceil(list.length / ADMIN_PAGE_SIZE));
    var page = Math.min(adminBooksState.page, totalPages);
    var pageItems = list.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

    var action = '<a class="btn-primary-sm" href="/admin/books/new">+ ' + bilingual("नई पुस्तक जोड़ें", "Add book") + '</a>';
    var body = '<div class="admin-toolbar"><input id="adminBooksSearch" type="text" class="admin-search-input" placeholder="खोजें…" value="' + esc(q) + '">' +
      '<span class="admin-toolbar-count">' + list.length + ' ' + bilingual("पुस्तकें", "books") + '</span></div>';
    body += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th></th><th>' + bilingual("शीर्षक", "Title") + '</th><th>' + bilingual("लेखक", "Author") + '</th>' +
      '<th>' + bilingual("श्रेणियाँ", "Categories") + '</th><th>' + bilingual("टैग", "Tags") + '</th><th></th>' +
      '</tr></thead><tbody>' + pageItems.map(adminBookTableRow).join("") + '</tbody></table></div>';
    if (totalPages > 1) {
      body += '<div class="admin-pager">' +
        '<button class="btn-outline-sm" id="adminBooksPrev"' + (page <= 1 ? " disabled" : "") + '>‹ ' + bilingual("पिछला", "Prev") + '</button>' +
        '<span>' + page + ' / ' + totalPages + '</span>' +
        '<button class="btn-outline-sm" id="adminBooksNext"' + (page >= totalPages ? " disabled" : "") + '>' + bilingual("अगला", "Next") + ' ›</button>' +
        '</div>';
    }
    return adminShell("books", bilingual("पुस्तकें प्रबंधित करें", "Manage books"), action, body);
  }

  /* ---------------- पुस्तकें: जोड़ें / संपादित करें (shared form) ---------------- */
  function adminCategoryCheckboxes(selectedKeys) {
    return CATEGORY_META.filter(function (c) { return c.key !== "all"; }).map(function (c) {
      var checked = selectedKeys.indexOf(c.key) !== -1 ? " checked" : "";
      return '<label class="admin-cat-chip"><input type="checkbox" name="bookCategory" value="' + esc(c.key) + '"' + checked + '> ' + esc(c.hi) + '</label>';
    }).join("");
  }

  function viewAdminBookForm(file) {
    var book = file ? findByFile(file) : null;
    if (file && !book) {
      return adminShell("books", bilingual("पुस्तक नहीं मिली", "Book not found"), "", '<div class="empty-state">यह पुस्तक नहीं मिली।</div>');
    }
    var isEdit = !!book;
    var title = isEdit ? bilingual("पुस्तक संपादित करें", "Edit book") : bilingual("नई पुस्तक जोड़ें", "Add new book");

    var body = '<form class="admin-form" id="bookForm" data-file="' + (isEdit ? esc(file) : "") + '">';
    body += '<div class="admin-form-section"><h3>' + bilingual("मूल जानकारी", "Basic info") + '</h3>';
    body += '<label class="admin-form-field">' + bilingual("शीर्षक", "Title") + '<input type="text" id="bookTitle" value="' + (isEdit ? esc(book.title) : "") + '" required></label>';
    [["bookAuthor", "लेखक", "Author", "authors"], ["bookTikakar", "टीकाकार", "Tikakar", "tikakars"],
     ["bookTranslator", "अनुवादक", "Translator", "translators"]].forEach(function (f) {
      body += '<label class="admin-form-field">' + bilingual(f[1], f[2]) + ' <small>(' + bilingual("एक से अधिक हों तो ; से अलग करें", "separate several with ;") + ')</small>' +
        '<input type="text" id="' + f[0] + '" value="' + (isEdit ? esc(book[f[3]].join("; ")) : "") + '"></label>';
    });
    body += '<label class="admin-form-field">' + bilingual("प्रकाशक", "Publisher") +
      '<input type="text" id="bookPublisherName" value="' + (isEdit ? esc(book.publisher) : "") + '"></label>';
    if (!isEdit) {
      body += '<div class="admin-form-field"><label><input type="radio" name="bookPublisherKind" value="gitapress" checked> गीता प्रेस प्रकाशन</label> ' +
        '<label><input type="radio" name="bookPublisherKind" value="other"> अन्य प्रकाशक</label></div>';
    } else {
      body += '<label class="admin-form-field"><input type="checkbox" id="bookIsGitaPress"' + (book.isGitaPress ? " checked" : "") + '> ' +
        bilingual("गीता प्रेस प्रकाशन है", "Published by Gita Press") + '</label>';
    }
    body += '</div>';

    body += '<div class="admin-form-section"><h3>' + bilingual("वर्गीकरण", "Categorization") + '</h3>';
    body += '<div class="admin-cat-chips">' + adminCategoryCheckboxes(isEdit ? book.categoryKeys : []) + '</div>';
    body += '<label class="admin-form-field">' + bilingual("टैग (कॉमा से अलग करें)", "Tags (comma-separated)") +
      '<input type="text" id="bookTags" value="' + (isEdit ? esc(book.tags.join(", ")) : "") + '"></label>';
    body += '</div>';

    if (!isEdit) {
      body += '<div class="admin-form-section"><h3>' + bilingual("पुस्तक फ़ाइल", "Book file") + '</h3>' +
        '<p class="muted-note">पहले से तैयार (कल्याण प्रारूप में) पुस्तक की HTML फ़ाइल संलग्न करें। कच्चे .docx से बदलाव हेतु tools/book_converter.py का उपयोग करें।</p>' +
        '<label class="admin-form-field"><input type="file" id="bookHtmlFile" accept=".html,.htm" required></label>' +
        '</div>';
    } else {
      body += '<div class="admin-form-section"><h3>' + bilingual("पुस्तक फ़ाइल", "Book file") + '</h3>' +
        '<p class="muted-note">फ़ाइल: <code>' + esc(book.file) + '</code> — सामग्री संपादित करने हेतु tools/book_converter.py / tools/converter_ui.html का उपयोग करें; यह फ़ॉर्म केवल श्रेणी/टैग/लेखक/शीर्षक बदलता है।</p></div>';
    }

    body += '<div class="admin-error" id="bookFormError"></div>';
    body += '<div class="admin-form-actions">' +
      '<button type="submit" class="btn-primary">' + bilingual("सहेजें", "Save") + '</button>' +
      '<a class="btn-outline" href="/admin/books">' + bilingual("रद्द करें", "Cancel") + '</a>' +
      '</div>';
    body += '</form>';

    return adminShell("books", title, "", body);
  }

  /* ---------------- लेखक ---------------- */
  function adminAuthorTableRow(author) {
    return '<tr class="admin-table-row admin-author-row" data-id="' + author.id + '">' +
      '<td class="admin-td-cover">' + authorAvatarEl(author, "sm") + '</td>' +
      '<td><div class="admin-table-title">' + esc(author.name) + '</div>' +
      '<div class="admin-table-sub">' + (author.bookCount || 0) + ' ग्रंथ</div></td>' +
      '<td class="admin-table-bio-cell">' + esc((author.bio || "").slice(0, 80)) + (author.bio && author.bio.length > 80 ? "…" : "") + '</td>' +
      '<td class="admin-td-actions"><button class="btn-outline-sm admin-author-edit-toggle">' + bilingual("संपादित करें", "Edit") + '</button></td>' +
      '</tr>' +
      '<tr class="admin-author-edit-row is-hidden" data-id="' + author.id + '"><td colspan="4">' +
      '<div class="admin-author-edit-panel">' +
      '<label class="admin-form-field">' + bilingual("नाम", "Name") + '<input type="text" class="admin-author-name" value="' + esc(author.name) + '"></label>' +
      '<label class="admin-form-field">' + bilingual("परिचय", "Bio") + '<textarea class="admin-author-bio" rows="2">' + esc(author.bio || "") + '</textarea></label>' +
      '<label class="admin-form-field">' + bilingual("फोटो", "Photo") + '<input type="file" class="admin-author-photo" accept="image/png,image/jpeg,image/webp"></label>' +
      '<div class="admin-form-actions"><button class="btn-primary-sm admin-save-author-btn">सहेजें</button><span class="admin-save-status"></span></div>' +
      '</div></td></tr>';
  }

  function viewAdminAuthors() {
    var action = '<form class="admin-inline-form" id="adminNewAuthorForm">' +
      '<input type="text" id="adminNewAuthorName" placeholder="नया लेखक नाम…" required>' +
      '<button type="submit" class="btn-primary-sm">+ ' + bilingual("जोड़ें", "Add") + '</button></form>';
    var body = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th></th><th>' + bilingual("नाम", "Name") + '</th><th>' + bilingual("परिचय", "Bio") + '</th><th></th>' +
      '</tr></thead><tbody id="adminAuthorsList"><tr><td colspan="4"><div class="empty-state small">लोड हो रहा है…</div></td></tr></tbody></table></div>';
    return adminShell("authors", bilingual("लेखक प्रबंधित करें", "Manage authors"), action, body);
  }

  /* ---------------- उपयोगकर्ता ---------------- */
  function adminUserTableRow(u, selfId) {
    var isAdminUser = u.role === "admin";
    return '<tr class="admin-table-row" data-id="' + u.id + '">' +
      '<td><div class="admin-table-title">' + esc(u.name) + '</div><div class="admin-table-sub">' + esc(u.email) + '</div></td>' +
      '<td><span class="admin-role-badge' + (isAdminUser ? " admin" : "") + '">' + (isAdminUser ? "admin" : "user") + '</span></td>' +
      '<td class="admin-td-actions">' + (u.id === selfId
        ? '<span class="muted-note">(आप)</span>'
        : '<button class="btn-outline-sm admin-toggle-role-btn" data-role="' + (isAdminUser ? "user" : "admin") + '">' +
          (isAdminUser ? "Admin हटाएं" : "Admin बनाएं") + '</button>') +
      '</td></tr>';
  }

  function viewAdminUsers() {
    var body = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>' + bilingual("उपयोगकर्ता", "User") + '</th><th>' + bilingual("भूमिका", "Role") + '</th><th></th>' +
      '</tr></thead><tbody id="adminUsersList"><tr><td colspan="3"><div class="empty-state small">लोड हो रहा है…</div></td></tr></tbody></table></div>';
    return adminShell("users", bilingual("उपयोगकर्ता", "Users"), "", body);
  }

  /* ---------------- टिप्पणी मॉडरेशन ---------------- */
  function adminCommentRow(c) {
    var book = findByFile(c.book_file);
    return '<div class="admin-comment-row" data-id="' + c.id + '">' +
      '<div class="comment-head"><b>' + esc(c.author) + '</b>' +
      '<span class="comment-time">' + timeAgo(c.created_at) + '</span>' +
      '<span class="admin-role-badge' + (c.status === "hidden" ? "" : " admin") + '">' + esc(c.status) + '</span></div>' +
      '<div class="admin-comment-book">' + (book ? esc(book.title) : esc(c.book_file)) + '</div>' +
      '<p>' + esc(c.text) + '</p>' +
      '<div class="admin-comment-actions">' +
      '<button class="btn-outline-sm admin-comment-toggle-btn" data-next="' + (c.status === "hidden" ? "visible" : "hidden") + '">' +
      (c.status === "hidden" ? "दिखाएं" : "छिपाएं") + '</button>' +
      '<button class="btn-outline-sm admin-comment-delete-btn">हटाएं</button>' +
      '</div></div>';
  }

  function viewAdminComments() {
    var body = '<div id="adminCommentsList" class="admin-comment-list"><div class="empty-state small">लोड हो रहा है…</div></div>';
    return adminShell("comments", bilingual("टिप्पणी मॉडरेशन", "Comment moderation"), "", body);
  }

  /* ---------------- wiring for login/signup/authors/admin ----------------
     Kept as one function, called from the end of wireView(r), rather than scattered
     through wireView, since every piece here gates on an element that only exists on
     its own route (same `if (el) {...}` idiom the rest of wireView already uses) --
     this just keeps the new auth/author/admin code visually grouped in one place. */
  function wireExtraViews(r) {
    var googleBtnEl = document.getElementById("googleSignInBtn");
    if (googleBtnEl && GOOGLE_CLIENT_ID) {
      // The GSI <script> tag is loaded async/defer (index.html), so it may not have
      // finished executing yet when this first runs right after a render -- poll
      // briefly rather than silently rendering an empty button container.
      (function waitForGoogle(attemptsLeft) {
        if (!document.getElementById("googleSignInBtn")) return; // navigated away already
        if (window.google && window.google.accounts && window.google.accounts.id) {
          google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
          google.accounts.id.renderButton(googleBtnEl, { theme: "outline", size: "large", width: 320, locale: "hi" });
        } else if (attemptsLeft > 0) {
          setTimeout(function () { waitForGoogle(attemptsLeft - 1); }, 200);
        }
      })(15);
    }

    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var errEl = document.getElementById("authError");
        errEl.textContent = "";
        apiPost("/api/auth/login", {
          email: document.getElementById("loginEmail").value,
          password: document.getElementById("loginPassword").value
        }).then(function (data) {
          CURRENT_USER = data.user;
          return syncProgressFromServer();
        }).then(function () {
          updateAuthChrome();
          navigate("/");
        }).catch(function (err) { errEl.textContent = err.message; });
      });
    }

    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var errEl = document.getElementById("authError");
        errEl.textContent = "";
        apiPost("/api/auth/signup", {
          name: document.getElementById("signupName").value,
          email: document.getElementById("signupEmail").value,
          password: document.getElementById("signupPassword").value
        }).then(function (data) {
          CURRENT_USER = data.user;
          updateAuthChrome();
          navigate("/");
        }).catch(function (err) { errEl.textContent = err.message; });
      });
    }

    var logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        apiPost("/api/auth/logout", {}).catch(function () {}).then(function () {
          CURRENT_USER = null;
          updateAuthChrome();
          navigate("/");
        });
      });
    }

    /* ---- admin: dashboard stats ---- */
    var adminStatGrid = document.getElementById("adminStatGrid");
    if (adminStatGrid) {
      var statLabels = { books: bilingual("पुस्तकें", "Books"), authors: bilingual("लेखक", "Authors"), users: bilingual("उपयोगकर्ता", "Users"), comments: bilingual("टिप्पणियाँ", "Comments") };
      function setStat(key, value) {
        var card = adminStatGrid.querySelector('[data-stat="' + key + '"]');
        if (!card) return;
        card.querySelector(".admin-stat-value").textContent = value;
        card.querySelector(".admin-stat-label").textContent = statLabels[key];
      }
      setStat("books", BOOKS.length);
      apiGet("/api/authors").then(function (d) { setStat("authors", (d.authors || []).length); }).catch(function () { setStat("authors", "–"); });
      apiGet("/api/admin/users").then(function (d) { setStat("users", (d.users || []).length); }).catch(function () { setStat("users", "–"); });
      apiGet("/api/admin/comments").then(function (d) { setStat("comments", (d.comments || []).length); }).catch(function () { setStat("comments", "–"); });
    }

    /* ---- admin: books list ---- */
    var adminBooksSearch = document.getElementById("adminBooksSearch");
    if (adminBooksSearch) {
      var searchTimer;
      adminBooksSearch.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          adminBooksState.page = 1;
          navigate("/admin/books" + (adminBooksSearch.value ? "?q=" + encodeURIComponent(adminBooksSearch.value) : ""));
        }, 250);
      });
    }
    var adminBooksPrev = document.getElementById("adminBooksPrev");
    if (adminBooksPrev) adminBooksPrev.addEventListener("click", function () { adminBooksState.page--; render(); });
    var adminBooksNext = document.getElementById("adminBooksNext");
    if (adminBooksNext) adminBooksNext.addEventListener("click", function () { adminBooksState.page++; render(); });

    /* ---- admin: add/edit book form ---- */
    var bookForm = document.getElementById("bookForm");
    if (bookForm) {
      var editingFile = bookForm.getAttribute("data-file") || null;

      bookForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var errEl = document.getElementById("bookFormError");
        errEl.textContent = "";
        var submitBtn = bookForm.querySelector("button[type=submit]");
        submitBtn.disabled = true;

        var categories = Array.prototype.slice.call(bookForm.querySelectorAll('input[name="bookCategory"]:checked')).map(function (c) { return c.value; });
        var tags = document.getElementById("bookTags").value.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
        var people = {
          author: document.getElementById("bookAuthor").value,
          tikakar: document.getElementById("bookTikakar").value,
          translator: document.getElementById("bookTranslator").value,
          publisherName: document.getElementById("bookPublisherName").value
        };

        function finish(promise) {
          promise.then(function () {
            history.pushState(null, "", "/admin/books");
            location.reload(); // title/publisher overrides live in static files only reloaded at boot
          }).catch(function (err) {
            errEl.textContent = err.message;
            submitBtn.disabled = false;
          });
        }

        if (!editingFile) {
          var fileInput = document.getElementById("bookHtmlFile");
          var file = fileInput.files && fileInput.files[0];
          if (!file) { errEl.textContent = "पुस्तक की HTML फ़ाइल आवश्यक है"; submitBtn.disabled = false; return; }
          if (!categories.length) { errEl.textContent = "कम से कम एक श्रेणी चुनें"; submitBtn.disabled = false; return; }
          readFileAsDataURL(file).then(function (dataUrl) {
            finish(apiPost("/api/admin/books", {
              title: document.getElementById("bookTitle").value.trim(),
              categories: categories,
              tags: tags,
              author: people.author,
              tikakar: people.tikakar,
              translator: people.translator,
              publisherName: people.publisherName,
              publisherKind: (bookForm.querySelector('input[name="bookPublisherKind"]:checked') || {}).value || "gitapress",
              htmlData: dataUrl
            }));
          });
        } else {
          var isGitaPressEl = document.getElementById("bookIsGitaPress");
          var metaPromise = apiPatch("/api/admin/books/" + encodeURIComponent(editingFile), {
            title: document.getElementById("bookTitle").value.trim(),
            author: people.author,
            tikakar: people.tikakar,
            translator: people.translator,
            publisherName: people.publisherName,
            isGitaPress: isGitaPressEl ? isGitaPressEl.checked : true
          });
          var catPromise = apiPost("/api/admin/books/" + encodeURIComponent(editingFile) + "/categories", { categories: categories });
          var tagPromise = apiPost("/api/admin/books/" + encodeURIComponent(editingFile) + "/tags", { tags: tags });
          finish(Promise.all([metaPromise, catPromise, tagPromise]));
        }
      });
    }

    /* ---- admin: authors ---- */
    var adminNewAuthorForm = document.getElementById("adminNewAuthorForm");
    if (adminNewAuthorForm) {
      adminNewAuthorForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.getElementById("adminNewAuthorName");
        var name = input.value.trim();
        if (!name) return;
        apiPost("/api/admin/authors", { name: name }).then(function () {
          input.value = "";
          loadAdminAuthors();
        }).catch(function (err) { toast(err.message); });
      });
    }
    function loadAdminAuthors() {
      var list = document.getElementById("adminAuthorsList");
      if (!list) return;
      apiGet("/api/authors").then(function (data) {
        list.innerHTML = (data.authors || []).map(adminAuthorTableRow).join("") || '<tr><td colspan="4"><div class="empty-state">कोई लेखक नहीं है</div></td></tr>';
      }).catch(function () { list.innerHTML = '<tr><td colspan="4"><div class="empty-state">लोड करने में त्रुटि</div></td></tr>'; });
    }
    var adminAuthorsList = document.getElementById("adminAuthorsList");
    if (adminAuthorsList) {
      loadAdminAuthors();
      adminAuthorsList.addEventListener("click", function (e) {
        var toggleBtn = e.target.closest(".admin-author-edit-toggle");
        if (toggleBtn) {
          var row = toggleBtn.closest(".admin-author-row");
          var editRow = row.nextElementSibling;
          if (editRow && editRow.classList.contains("admin-author-edit-row")) editRow.classList.toggle("is-hidden");
          return;
        }
        var btn = e.target.closest(".admin-save-author-btn");
        if (!btn) return;
        var editRow = btn.closest(".admin-author-edit-row");
        var id = editRow.getAttribute("data-id");
        var statusEl = editRow.querySelector(".admin-save-status");
        var name = editRow.querySelector(".admin-author-name").value.trim();
        var bio = editRow.querySelector(".admin-author-bio").value.trim();
        var fileInput = editRow.querySelector(".admin-author-photo");
        var file = fileInput.files && fileInput.files[0];
        statusEl.textContent = "सहेज रहे हैं…";
        btn.disabled = true;

        var updatePromise = apiPatch("/api/admin/authors/" + id, { name: name, bio: bio });
        var photoPromise = file ? readFileAsDataURL(file).then(function (dataUrl) {
          return apiPost("/api/admin/authors/" + id + "/photo", { imageData: dataUrl, imageName: file.name });
        }) : Promise.resolve();

        Promise.all([updatePromise, photoPromise]).then(function () {
          statusEl.textContent = "✓ सहेजा गया";
          btn.disabled = false;
          loadAdminAuthors();
        }).catch(function (err) {
          statusEl.textContent = "त्रुटि: " + err.message;
          btn.disabled = false;
        });
      });
    }

    /* ---- admin: users ---- */
    var adminUsersList = document.getElementById("adminUsersList");
    if (adminUsersList) {
      function loadAdminUsers() {
        apiGet("/api/admin/users").then(function (data) {
          var self = getCurrentUser();
          adminUsersList.innerHTML = (data.users || []).map(function (u) { return adminUserTableRow(u, self && self.id); }).join("");
        }).catch(function () { adminUsersList.innerHTML = '<tr><td colspan="3"><div class="empty-state">लोड करने में त्रुटि</div></td></tr>'; });
      }
      loadAdminUsers();
      adminUsersList.addEventListener("click", function (e) {
        var btn = e.target.closest(".admin-toggle-role-btn");
        if (!btn) return;
        var row = btn.closest(".admin-table-row");
        var id = row.getAttribute("data-id");
        var nextRole = btn.getAttribute("data-role");
        btn.disabled = true;
        apiPatch("/api/admin/users/" + id + "/role", { role: nextRole }).then(loadAdminUsers)
          .catch(function (err) { toast(err.message); btn.disabled = false; });
      });
    }

    /* ---- admin: comments ---- */
    var adminCommentsList = document.getElementById("adminCommentsList");
    if (adminCommentsList) {
      function loadAdminComments() {
        apiGet("/api/admin/comments").then(function (data) {
          adminCommentsList.innerHTML = (data.comments || []).map(adminCommentRow).join("") || '<div class="empty-state">कोई टिप्पणी नहीं है</div>';
        }).catch(function () { adminCommentsList.innerHTML = '<div class="empty-state">लोड करने में त्रुटि</div>'; });
      }
      loadAdminComments();
      adminCommentsList.addEventListener("click", function (e) {
        var row = e.target.closest(".admin-comment-row");
        if (!row) return;
        var id = row.getAttribute("data-id");
        var toggleBtn = e.target.closest(".admin-comment-toggle-btn");
        var deleteBtn = e.target.closest(".admin-comment-delete-btn");
        if (toggleBtn) {
          apiPatch("/api/admin/comments/" + id, { status: toggleBtn.getAttribute("data-next") }).then(loadAdminComments).catch(function (err) { toast(err.message); });
        } else if (deleteBtn) {
          if (confirm("क्या आप यह टिप्पणी स्थायी रूप से हटाना चाहते हैं?")) {
            apiDelete("/api/admin/comments/" + id).then(loadAdminComments).catch(function (err) { toast(err.message); });
          }
        }
      });
    }
  }

  /** Google Identity Services callback -- receives a signed Google ID token (JWT) in
   *  response.credential, which the server verifies (server/lib/api.js, handleGoogleAuth)
   *  before creating a session. The token itself is never decoded client-side. */
  function handleGoogleCredential(response) {
    var errEl = document.getElementById("authError");
    apiPost("/api/auth/google", { credential: response.credential }).then(function (data) {
      CURRENT_USER = data.user;
      return syncProgressFromServer();
    }).then(function () {
      updateAuthChrome();
      navigate("/");
    }).catch(function (err) { if (errEl) errEl.textContent = err.message; else toast(err.message); });
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Shows/hides the sidebar's admin-only link and updates the profile button's
   *  destination (#/login when signed out, #/settings when signed in). Called once
   *  at boot and again right after login/signup/logout. */
  function updateAuthChrome() {
    var admin = isAdmin();
    document.querySelectorAll(".admin-only").forEach(function (el) { el.classList.toggle("is-hidden", !admin); });
    var profileBtn = document.getElementById("profileBtn");
    if (profileBtn) profileBtn.setAttribute("data-logged-in", isLoggedIn() ? "1" : "0");
  }

  /* ---------------- router (real paths via the History API -- crawlable/SEO-friendly,
     unlike the old #/... hash routes which all collapsed to one URL for search engines) ---------------- */
  function parsePath() {
    var path = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    var params = new URLSearchParams(location.search);
    return { path: path || "", params: params };
  }

  /* Client-side navigation: pushes the real URL, then re-renders -- the SPA equivalent
     of what a hashchange used to trigger automatically. */
  function navigate(path) {
    history.pushState(null, "", path);
    onNavigate();
  }

  /* Old #/library, #/book/12-style links (bookmarked or shared before this app switched
     from hash routing to real paths) still work: on boot, rewrite the hash straight into
     the equivalent real path before the first render. */
  function migrateLegacyHash() {
    var h = location.hash;
    if (!h || h.charAt(0) !== "#") return;
    var p = h.replace(/^#\/?/, "/");
    try { history.replaceState(null, "", (p || "/") + location.search); } catch (e) {}
  }

  /* Intercepts clicks on same-document, absolute-path links (e.g. href="/library") so
     navigation goes through pushState instead of a full page reload. Links to actual
     files -- book content under "Gita Press Books/..." (a relative href, see bookHref())
     external URLs, mailto:, etc. -- are all left alone since none of them start with "/". */
  function wireLinkInterception() {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      if (a.target && a.target !== "" && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "/") return;
      e.preventDefault();
      if (href !== location.pathname + location.search) navigate(href);
    });
  }

  function setActiveNav(path) {
    var map = { "": "home", "library": "library", "favorites": "favorites", "myreads": "myreads", "notes": "notes", "chat": "chat", "settings": "settings", "panchang": "panchang", "help": "help", "feedback": "feedback", "authors": "authors", "author": "authors", "audio": "audio", "gita": "gita", "sankalp": "home", "vrat": "home", "shalaka": "shalaka", "hanuman": "hanuman", "admin": "admin", "login": "login", "signup": "login" };
    var key = map[path.split("/")[0]] || "";
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-nav") === key);
    });
    // a sidebar group (e.g. प्रश्नावली) opens by itself when the page you are on is inside it
    document.querySelectorAll(".side-group").forEach(function (g) {
      var inside = !!g.querySelector("[data-nav].active");
      g.classList.toggle("has-active", inside);
      if (inside) setSideGroup(g, true);
    });
  }
  function setSideGroup(g, open) {
    g.classList.toggle("is-open", open);
    var b = g.querySelector(".side-group-btn");
    if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* ---------------- per-page <title> / meta ----------------
     The static index.html carries the site-wide title and meta tags; a book page replaces
     them with "Kalyan | कल्याण — <book> | <publisher> | <author>" (publisher/author
     parts are left out when the book doesn't name one) and every other page restores the
     defaults captured on first use. */
  var DEFAULT_META = null;

  function metaNode(sel) { return document.querySelector(sel); }
  function setMetaAttr(sel, attr, value) {
    var el = metaNode(sel);
    if (el && value != null) el.setAttribute(attr, value);
  }

  function captureDefaultMeta() {
    if (DEFAULT_META) return;
    function attr(sel, a) { var el = metaNode(sel); return el ? el.getAttribute(a) : null; }
    DEFAULT_META = {
      title: document.title,
      desc: attr('meta[name="description"]', "content"),
      canonical: attr('link[rel="canonical"]', "href"),
      ogTitle: attr('meta[property="og:title"]', "content"),
      ogDesc: attr('meta[property="og:description"]', "content"),
      ogUrl: attr('meta[property="og:url"]', "content"),
      twTitle: attr('meta[name="twitter:title"]', "content"),
      twDesc: attr('meta[name="twitter:description"]', "content")
    };
  }

  function applyMeta(m) {
    document.title = m.title;
    setMetaAttr('meta[name="description"]', "content", m.desc);
    setMetaAttr('link[rel="canonical"]', "href", m.canonical);
    setMetaAttr('meta[property="og:title"]', "content", m.ogTitle);
    setMetaAttr('meta[property="og:description"]', "content", m.ogDesc);
    setMetaAttr('meta[property="og:url"]', "content", m.ogUrl);
    setMetaAttr('meta[name="twitter:title"]', "content", m.twTitle);
    setMetaAttr('meta[name="twitter:description"]', "content", m.twDesc);
  }

  /* Titles/descriptions come from seo-meta.js (shared with the server-side renderer, so a
     page's <title> is the same whether a crawler got it as HTML or the app set it here). */
  function setMeta(title, desc, canonicalPath) {
    captureDefaultMeta();
    var url = location.origin + canonicalPath;
    applyMeta({ title: title, desc: desc, canonical: url, ogTitle: title, ogDesc: desc, ogUrl: url, twTitle: title, twDesc: desc });
  }

  function setPageMeta(book, chapterLabel) {
    setMeta(SwadhyayMeta.bookTitle(book, chapterLabel), SwadhyayMeta.bookDescription(book, chapterLabel),
      /* A chapter URL is its own page (it has its own text on the server); the bare
         /read/<slug> just resumes the book, so it points at the book page. */
      chapterLabel ? readPath(book, reader.idx) : bookPath(book));
  }

  function resetPageMeta() {
    if (!DEFAULT_META) return;
    applyMeta(DEFAULT_META);
  }

  /* Title/meta for every non-book route: library (+ category), authors, one author, and
     the fixed pages (panchang/help/feedback/chat); anything else gets the site default. */
  function applyRouteMeta(seg, r, pageBook, pagePerson) {
    if (pageBook) { setPageMeta(pageBook); return; }
    if (pagePerson) {
      setMeta(SwadhyayMeta.personTitle(pagePerson), SwadhyayMeta.personDescription(pagePerson), personPath(pagePerson.name));
      return;
    }
    if (seg[0] === "library") {
      var cat = r.params.get("cat");
      var cm = cat && cat !== "all" ? CATEGORY_BY_KEY[cat] : null;
      if (cm) {
        var n = BOOKS.filter(function (b) { return b.categoryKeys.indexOf(cat) !== -1; }).length;
        setMeta(SwadhyayMeta.categoryTitle(cm), SwadhyayMeta.categoryDescription(cm, n), "/library?cat=" + encodeURIComponent(cat));
      } else {
        var lr = SwadhyayMeta.STATIC_ROUTES.library;
        setMeta(lr.title, lr.desc, "/library");
      }
      return;
    }
    var fixed = SwadhyayMeta.STATIC_ROUTES[seg[0]];
    if (fixed && seg.length === 1) { setMeta(fixed.title, fixed.desc, "/" + seg[0]); return; }
    resetPageMeta();
  }
  var lastRenderedPath = null;

  function render() {
    migrateLegacyHash();
    var r = parsePath();
    var root = document.getElementById("viewRoot");
    var body = document.body;
    var top = document.getElementById("subTopbar");

    var seg = r.path.split("/");

    var focusedEl = document.activeElement;
    var focusedId = focusedEl && focusedEl.id && (focusedEl === document.getElementById("librarySearch") || focusedEl === document.getElementById("homeSearch")) ? focusedEl.id : null;
    var focusedSelStart = focusedId ? focusedEl.selectionStart : null;
    var focusedSelEnd = focusedId ? focusedEl.selectionEnd : null;
    var samePath = r.path === lastRenderedPath;

    if (seg[0] === "read" && seg[1] !== undefined) {
      var rBook = resolveBookParam(seg[1]);
      var rCh = seg[2] !== undefined ? parseInt(seg[2], 10) : null;
      if (!rBook) { navigate("/library"); return; }
      setPageMeta(rBook);
      openReader(rBook.id, rCh, r.params.get("a"));
      setActiveNav(r.path);
      return;
    }
    closeReader();

    var html = "";
    var pageBook = null, pagePerson = null;
    body.classList.toggle("is-home", seg[0] === "" || seg[0] === "home");

    if (seg[0] === "" || seg[0] === "home") { html = viewHome(); }
    else if (seg[0] === "library") { html = viewLibrary(r.params); }
    else if (seg[0] === "book" && seg[1] !== undefined) {
      var bBook = resolveBookParam(seg[1]);
      if (!bBook) { html = viewHome(); }
      else {
        /* A legacy #/book/12 link lands here with a numeric id in the URL -- swap it for
           the real slug URL (replace, not push, so it doesn't add a back-button entry). */
        var bSegDecoded; try { bSegDecoded = decodeURIComponent(seg[1]); } catch (e) { bSegDecoded = seg[1]; }
        if (bSegDecoded !== bBook.slug) { try { history.replaceState(null, "", bookPath(bBook) + location.search); } catch (e) {} }
        html = viewBook(bBook.id);
        pageBook = bBook;
      }
    }
    else if (seg[0] === "favorites") { html = viewFavorites(); }
    else if (seg[0] === "myreads") { html = viewMyReads(); }
    else if (seg[0] === "notes") { html = viewStub("मेरे ग्रंथ", "My Scriptures"); }
    else if (seg[0] === "chat") { html = viewChat(); }
    else if (seg[0] === "panchang") { html = viewPanchang(); }
    else if (seg[0] === "help") { html = viewHelp(); }
    else if (seg[0] === "feedback") { html = viewFeedback(); }
    else if (seg[0] === "settings") { html = viewSettings(); }
    else if (seg[0] === "subscribe") { html = viewStub("सदस्यता", "Subscribe"); }
    else if (seg[0] === "login") { if (isLoggedIn()) { navigate("/"); return; } html = viewLogin(); }
    else if (seg[0] === "signup") { if (isLoggedIn()) { navigate("/"); return; } html = viewSignup(); }
    else if (seg[0] === "authors") { html = viewAuthors(); }
    else if (seg[0] === "audio") { html = window.SwadhyayAudio ? window.SwadhyayAudio.pageHtml() : viewHome(); }
    else if (seg[0] === "vrat") { html = seg[1] ? viewVrat(decodeURIComponent(seg[1])) : viewVratList(); }
    else if (seg[0] === "sankalp") { html = window.SwadhyaySankalp ? window.SwadhyaySankalp.pageHtml() : viewHome(); }
    else if (seg[0] === "gita") { html = window.SwadhyayGita ? window.SwadhyayGita.pageHtml() : viewHome(); }
    else if (seg[0] === "shalaka") { html = window.SwadhyayShalaka ? window.SwadhyayShalaka.pageHtml() : viewHome(); }
    else if (seg[0] === "hanuman") { html = window.SwadhyayHanuman ? window.SwadhyayHanuman.pageHtml() : viewHome(); }
    else if (seg[0] === "author" && seg[1] !== undefined) {
      var aPerson = resolvePerson(seg[1]);
      if (aPerson) { html = viewAuthor(aPerson); pagePerson = aPerson; }
      else {
        /* An old /author/<number> link (from before authors were slugged by name) -- or a
           name that no longer exists -- lands on the full authors list instead. */
        try { history.replaceState(null, "", "/authors"); } catch (e) {}
        html = viewAuthors();
      }
    }
    else if (seg[0] === "admin") {
      if (!isAdmin()) { navigate("/login"); return; }
      if (seg[1] === "books" && seg[2] === "new") html = viewAdminBookForm(null);
      else if (seg[1] === "books" && seg[2] === "edit") html = viewAdminBookForm(r.params.get("file"));
      else if (seg[1] === "books") html = viewAdminBooksList(r.params);
      else if (seg[1] === "authors") html = viewAdminAuthors();
      else if (seg[1] === "users") html = viewAdminUsers();
      else if (seg[1] === "comments") html = viewAdminComments();
      else html = viewAdminHome();
    }
    else { html = viewHome(); }

    root.innerHTML = html;
    applyRouteMeta(seg, r, pageBook, pagePerson);
    setActiveNav(r.path);
    if (!samePath) window.scrollTo(0, 0);
    lastRenderedPath = r.path;
    wireView(r);
    applyHeroBanner();
    if (window.SwadhyayAudio) window.SwadhyayAudio.mount({ tx: tx, toast: toast });
    if (window.SwadhyayDaily) window.SwadhyayDaily.mount({ tx: tx, toast: toast });
    if (seg[0] === "vrat") { if (seg[1]) loadVratDetail(decodeURIComponent(seg[1])); else wireVratList(); }
    if (window.SwadhyaySankalp && seg[0] === "sankalp") window.SwadhyaySankalp.mount({ tx: tx, toast: toast });
    if (window.SwadhyayGita && seg[0] === "gita") window.SwadhyayGita.mount({ tx: tx, toast: toast });
    if (window.SwadhyayShalaka && seg[0] === "shalaka") window.SwadhyayShalaka.mount({ tx: tx, toast: toast });
    if (window.SwadhyayHanuman && seg[0] === "hanuman") window.SwadhyayHanuman.mount({ tx: tx, toast: toast });
    loadQuoteOfTheDay();
    if (seg[0] === "chat") wireChatView();

    if (focusedId) {
      var toFocus = document.getElementById(focusedId);
      if (toFocus) {
        toFocus.focus();
        if (typeof focusedSelStart === "number") {
          try { toFocus.setSelectionRange(focusedSelStart, focusedSelEnd); } catch (e) {}
        }
      }
    }
  }

  function wireView(r) {
    document.querySelectorAll("[data-fav]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var id = parseInt(btn.getAttribute("data-fav"), 10);
        var nowFav = toggleFavorite(id);
        btn.classList.toggle("active", nowFav);
        if (btn.id === "favBtn") btn.textContent = nowFav ? "♥ पसंदीदा में शामिल" : "♡ पसंदीदा में जोड़ें";
      });
    });

    document.querySelectorAll(".row-scroll-wrap").forEach(function (wrap) {
      var scroller = wrap.querySelector(".row-scroll");
      var prev = wrap.querySelector(".prev"), next = wrap.querySelector(".next");
      if (prev) prev.addEventListener("click", function () { scroller.scrollBy({ left: -600, behavior: "smooth" }); });
      if (next) next.addEventListener("click", function () { scroller.scrollBy({ left: 600, behavior: "smooth" }); });
    });

    document.querySelectorAll(".cat-tabs-wrap").forEach(function (wrap) {
      var scroller = wrap.querySelector(".cat-tabs");
      var prev = wrap.querySelector(".prev"), next = wrap.querySelector(".next");
      if (prev) prev.addEventListener("click", function () { scroller.scrollBy({ left: -400, behavior: "smooth" }); });
      if (next) next.addEventListener("click", function () { scroller.scrollBy({ left: 400, behavior: "smooth" }); });
    });

    document.querySelectorAll(".hero-chips .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        navigate("/library?cat=all&q=" + encodeURIComponent(chip.getAttribute("data-q")));
      });
    });

    var homeSearch = document.getElementById("homeSearch");
    if (homeSearch) {
      homeSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && homeSearch.value.trim()) {
          navigate("/library?cat=all&q=" + encodeURIComponent(homeSearch.value.trim()));
        }
      });
    }

    var librarySearch = document.getElementById("librarySearch");
    if (librarySearch) {
      var t = null;
      librarySearch.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          var p = parsePath().params;
          var cat = p.get("cat") || "all";
          navigate("/library?cat=" + encodeURIComponent(cat) + (librarySearch.value ? "&q=" + encodeURIComponent(librarySearch.value) : ""));
        }, 250);
      });
    }

    var loadSentinel = document.getElementById("libraryLoadSentinel");
    if (loadSentinel && window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          io.disconnect();
          libraryState.page++;
          render();
        }
      }, { rootMargin: "600px" });
      io.observe(loadSentinel);
    }

    var startBtn = document.getElementById("startReadingBtn");
    if (startBtn) {
      var startBtnBook = resolveBookParam(r.path.split("/")[1]);
      startBtn.addEventListener("click", function () { if (startBtnBook) recordOpen(startBtnBook.id); });
    }
    var shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        var book = resolveBookParam(r.path.split("/")[1]);
        var url = location.href;
        if (navigator.share) navigator.share({ title: book.title, url: url }).catch(function () {});
        else { navigator.clipboard && navigator.clipboard.writeText(url); toast("लिंक कॉपी हो गया"); }
      });
    }
    var listenBtn = document.getElementById("listenBtn");
    if (listenBtn) {
      listenBtn.addEventListener("click", function () {
        if (isSubscribed()) { toast("प्लेबैक जल्द उपलब्ध होगा"); }
        else { showSubscribeModal(); }
      });
    }
    var clearBtn = document.getElementById("clearHistoryBtn");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      if (confirm("क्या आप अपना पठन इतिहास मिटाना चाहते हैं?")) { clearHistory(); render(); }
    });

    var detailTabs = document.getElementById("detailTabs");
    if (detailTabs) {
      var bookId = parseInt(detailTabs.getAttribute("data-book"), 10);
      var book = BOOKS_BY_ID[bookId];
      var panels = document.querySelectorAll(".detail-tab-panel");
      var commentsLoaded = false;
      detailTabs.querySelectorAll(".detail-tab").forEach(function (tabBtn) {
        tabBtn.addEventListener("click", function () {
          var target = tabBtn.getAttribute("data-tab");
          detailTabs.querySelectorAll(".detail-tab").forEach(function (t) { t.classList.toggle("active", t === tabBtn); });
          panels.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-panel") === target); });
          if (target === "toc") {
            var tocPanel = document.getElementById("tocPanel");
            if (tocPanel && !tocPanel.hasChildNodes()) loadTOC(book, tocPanel);
          }
          if (target === "comments" && !commentsLoaded) {
            commentsLoaded = true;
            refreshCommentList(book);
          }
        });
      });

      var tocPanelEl = document.getElementById("tocPanel");
      if (tocPanelEl) {
        tocPanelEl.addEventListener("click", function (e) {
          var toggle = e.target.closest(".toc-toggle");
          if (!toggle) return;
          var section = toggle.closest(".toc-section");
          var wasOpen = section.classList.contains("open");
          tocPanelEl.querySelectorAll(".toc-section.open").forEach(function (s) { s.classList.remove("open"); });
          if (!wasOpen) section.classList.add("open");
        });
      }

      var commentForm = document.getElementById("commentForm");
      if (commentForm) {
        commentForm.addEventListener("submit", function (e) {
          e.preventDefault();
          var textarea = document.getElementById("commentText");
          var submitBtn = commentForm.querySelector("button[type=submit]");
          var text = textarea.value;
          if (!text.trim()) return;
          if (submitBtn) submitBtn.disabled = true;
          addComment(book.file, text).then(function () {
            textarea.value = "";
            commentsLoaded = true;
            return refreshCommentList(book);
          }).catch(function (err) {
            toast(err.message || "टिप्पणी भेजने में त्रुटि हुई");
          }).then(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
        });
      }
    }

    /* ---- पंचांग: शहर चयन (home card + full page) ---- */
    document.querySelectorAll("#panchangCitySelect, #panchangPageCitySelect").forEach(function (sel) {
      sel.addEventListener("change", function () { setPanchangCity(sel.value); render(); });
    });

    document.querySelectorAll("button[data-taxlang]").forEach(function (btn) {
      btn.addEventListener("click", function () { setTaxLang(btn.getAttribute("data-taxlang")); render(); });
    });
    document.querySelectorAll("button[data-taxlang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () { setTaxLang(getTaxLang() === "en" ? "hi" : "en"); render(); });
    });

    document.querySelectorAll(".pw-day").forEach(function (btn) {
      btn.addEventListener("click", function () {
        panchangState.dayOffset = parseInt(btn.getAttribute("data-offset"), 10);
        render();
      });
    });

    var panchangWeekWrap = document.querySelector(".panchang-week-wrap");
    if (panchangWeekWrap) {
      var pwStrip = document.getElementById("panchangWeekStrip");
      var pwPrev = panchangWeekWrap.querySelector(".prev"), pwNext = panchangWeekWrap.querySelector(".next");
      if (pwPrev) pwPrev.addEventListener("click", function () { pwStrip.scrollBy({ left: -300, behavior: "smooth" }); });
      if (pwNext) pwNext.addEventListener("click", function () { pwStrip.scrollBy({ left: 300, behavior: "smooth" }); });
      var pwActive = pwStrip.querySelector(".pw-day.active");
      if (pwActive) pwActive.scrollIntoView({ inline: "center", block: "nearest" });
    }

    /* ---- ग्रंथों से पूछें AI: home card ---- */
    var homeAiForm = document.getElementById("homeAiForm");
    if (homeAiForm) {
      homeAiForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.getElementById("homeAiInput");
        var q = (input.value || "").trim();
        askAI(q);
      });
    }
    document.querySelectorAll(".ai-topic-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".ai-topic-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var t = chip.getAttribute("data-q");
        var input = document.getElementById("homeAiInput");
        if (t !== "सभी ग्रंथ" && input) { input.placeholder = t + " से संबंधित प्रश्न पूछें…"; input.focus(); }
      });
    });
    /* ---- विषय सुधार फ़ॉर्म ---- */
    var feedbackForm = document.getElementById("feedbackForm");
    if (feedbackForm) {
      renderFeedbackHistory();
      feedbackForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var bookInput = document.getElementById("feedbackBook");
        var textInput = document.getElementById("feedbackText");
        var text = (textInput.value || "").trim();
        if (!text) return;
        addFeedback((bookInput.value || "").trim(), text);
        bookInput.value = ""; textInput.value = "";
        renderFeedbackHistory();
        toast("धन्यवाद! आपका सुझाव प्राप्त हुआ");
      });
    }

    wireExtraViews(r);
  }

  /* Sends a question to the प्रश्नोत्तर (chat) page, prefilling the input rather than
     auto-submitting -- lets the visitor review/edit before it actually goes out. */
  function askAI(q) {
    chatState.pendingInput = q || "";
    if (location.pathname === "/chat") { rerenderChat(); focusChatInput(); }
    else navigate("/chat");
  }
  function focusChatInput() {
    var input = document.getElementById("chatInput");
    if (input && chatState.pendingInput) {
      input.value = chatState.pendingInput;
      chatState.pendingInput = "";
      input.focus();
    }
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add("show"); }, 10);
    setTimeout(function () { el.remove(); }, 2200);
  }

  function closeSubscribeModal() {
    var overlay = document.getElementById("subscribeModalOverlay");
    if (overlay) overlay.remove();
    document.removeEventListener("keydown", subscribeModalEsc);
  }
  function subscribeModalEsc(e) { if (e.key === "Escape") closeSubscribeModal(); }

  function showSubscribeModal() {
    if (document.getElementById("subscribeModalOverlay")) return;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "subscribeModalOverlay";
    overlay.innerHTML =
      '<div class="modal-card subscribe-modal">' +
      '<button class="modal-close" id="subscribeModalClose" aria-label="बंद करें">✕</button>' +
      '<div class="subscribe-modal-icon">🎧</div>' +
      '<h3>' + bilingual("यह सुविधा सदस्यों के लिए है", "This feature is for subscribers") + '</h3>' +
      '<p>' + bilingual("पुस्तकें सुनने के लिए कल्याण सदस्यता लें।", "Subscribe to Kalyan to listen to books.") + '</p>' +
      '<a href="/subscribe" class="btn-primary" id="subscribeModalCta">' + bilingual("सदस्यता लें", "Subscribe now") + '</a>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSubscribeModal(); });
    var closeBtn = document.getElementById("subscribeModalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeSubscribeModal);
    var cta = document.getElementById("subscribeModalCta");
    if (cta) cta.addEventListener("click", closeSubscribeModal);
    document.addEventListener("keydown", subscribeModalEsc);
  }

  /* ---------------- global chrome wiring ---------------- */
  function initChrome() {
    setTheme(getTheme());

    var sideLang = document.getElementById("sideLangSwitch");
    if (sideLang) sideLang.addEventListener("click", function () {
      setTaxLang(getTaxLang() === "en" ? "hi" : "en");
      render();
    });

    var heroResizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(heroResizeTimer);
      heroResizeTimer = setTimeout(applyHeroBanner, 200);
    });

    var themeSwitch = document.getElementById("themeSwitch");
    if (themeSwitch) {
      themeSwitch.checked = getTheme() === "dark";
      themeSwitch.addEventListener("change", function () { setTheme(themeSwitch.checked ? "dark" : "light"); });
    }
    document.querySelectorAll(".global-search-btn").forEach(function (b) {
      b.addEventListener("click", function () { navigate("/library"); });
    });

    var profileBtn = document.getElementById("profileBtn");
    if (profileBtn) profileBtn.addEventListener("click", function () { navigate(isLoggedIn() ? "/settings" : "/login"); });

    var bellBtn = document.getElementById("notifyBtn");
    if (bellBtn) bellBtn.addEventListener("click", function () { toast("अभी कोई नई सूचना नहीं है"); });

    var sidebar = document.querySelector(".sidebar");
    var scrim = document.getElementById("sidebarScrim");
    function closeSidebarDrawer() {
      if (sidebar) sidebar.classList.remove("open");
      if (scrim) scrim.classList.remove("show");
    }
    var drawerBtn = document.getElementById("appDrawerBtn");
    if (drawerBtn) {
      drawerBtn.addEventListener("click", function () {
        if (sidebar) sidebar.classList.add("open");
        if (scrim) scrim.classList.add("show");
      });
    }
    if (scrim) scrim.addEventListener("click", closeSidebarDrawer);
    document.querySelectorAll(".sidebar [data-nav]").forEach(function (link) {
      link.addEventListener("click", closeSidebarDrawer);
    });
    document.querySelectorAll(".side-group-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var g = btn.closest(".side-group");
        if (g) setSideGroup(g, !g.classList.contains("is-open"));
      });
    });

    window.addEventListener("scroll", updateTopbarSolidity, { passive: true });
  }

  function updateTopbarSolidity() {
    var topbar = document.querySelector(".topbar");
    if (!topbar) return;
    var solid = !document.body.classList.contains("is-home") || window.scrollY > 50;
    topbar.classList.toggle("scrolled", solid);
  }

  function onNavigate() { libraryState.page = 1; panchangState.dayOffset = 0; render(); updateTopbarSolidity(); }

  window.addEventListener("popstate", onNavigate);
  document.addEventListener("DOMContentLoaded", function () {
    seedDemoData();
    initChrome();
    wireLinkInterception();
    setTaxLang(getTaxLang());
    /* Book-meta (categories/tags/author links) and the current session are both fetched
       from the API before the first render, so the home/library pages open already
       showing the real data instead of flashing the single-category fallback and then
       re-rendering. Both calls swallow their own errors (see applyBookMetaOverrides /
       refreshCurrentUser) so a server that isn't running just means the app behaves
       exactly like it did before any of this existed -- it never blocks startup. */
    /* ...but never for long: on a cold serverless start these calls can take several seconds, and the
       whole page used to sit on the loading screen until they came back. The first render now waits at
       most BOOT_WAIT_MS; if the data arrives later the page is drawn again (unless a book is open). */
    var BOOT_WAIT_MS = 1200, firstDone = false;
    function firstRender() { if (firstDone) return; firstDone = true; onNavigate(); }
    Promise.all([
      apiGet("/api/book-meta").then(function (data) { applyBookMetaOverrides(data.meta || {}); }).catch(function () {}),
      loadVrats(),
      apiGet("/api/auth/config").then(function (data) { GOOGLE_CLIENT_ID = data.googleClientId || null; }).catch(function () {}),
      refreshCurrentUser()
    ]).then(function () {
      updateAuthChrome();
      return syncProgressFromServer();
    }).then(function () {
      if (!firstDone) firstRender();
      else if (!reader.open) { updateAuthChrome(); render(); }
    }, function () { firstRender(); });
    setTimeout(firstRender, BOOT_WAIT_MS);
  });

  /* Server-side hook: server/lib/seo.js defines window.__SWADHYAY_EXPORT__ and runs this
     file in a sandbox to get the catalogue, so the slugs, titles and people the server
     renders are computed by this exact code instead of being re-implemented. A no-op in
     the browser, where the hook doesn't exist. */
  if (typeof window.__SWADHYAY_EXPORT__ === "function") {
    window.__SWADHYAY_EXPORT__({
      BOOKS: BOOKS, PEOPLE: PEOPLE, CATEGORY_META: CATEGORY_META,
      genBlurb: genBlurb, HELP_FAQS: HELP_FAQS, personPath: personPath, bookPath: bookPath, SLUG_ALIASES: SLUG_ALIASES
    });
  }
})();

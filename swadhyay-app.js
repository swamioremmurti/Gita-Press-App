/* Swadhyay — app shell logic. Vanilla JS, hash-router, localStorage-backed. */
(function () {
  "use strict";

  var BOOKS_DIR = "Gita Press Books/Gita Press Books/";

  var CATEGORY_META = [
    { key: "all", hi: "सभी", en: "All", icon: "ॐ" },
    { key: "Vedas", hi: "वेद", en: "Vedas", icon: "ॐ" },
    { key: "Upanishad", hi: "उपनिषद्", en: "Upanishad", icon: "📖" },
    { key: "Vedant", hi: "वेदान्त", en: "Vedant", icon: "🧘" },
    { key: "Gita", hi: "गीता", en: "Gita", icon: "📗" },
    { key: "Purans", hi: "पुराण", en: "Purans", icon: "🏛️" },
    { key: "Upa Puran", hi: "उपपुराण", en: "Upa Puran", icon: "⛩️" },
    { key: "Itihasas", hi: "इतिहास", en: "Itihasas", icon: "📚" },
    { key: "Stotra evam Naamavali", hi: "स्तोत्र एवं नामावली", en: "Stotra evam Naamavali", icon: "🙏" },
    { key: "Bajans", hi: "भजन", en: "Bajans", icon: "🎵" },
    { key: "Pravachan", hi: "प्रवचन", en: "Pravachan", icon: "🎤" },
    { key: "Siksha evam Katha", hi: "शिक्षा एवं कथा", en: "Siksha evam Katha", icon: "💡" },
    { key: "Balaupayogi", hi: "बालोपयोगी", en: "Balaupayogi", icon: "🧒" },
    { key: "Nitya Puja evam Karmakand", hi: "नित्य पुजा एवं कर्मकाण्ड", en: "Nitya Puja evam Karmakand", icon: "🔔" },
    { key: "Swami Sharnanand Sahitya", hi: "स्वामी शरणानन्द जी महाराज साहित्य", en: "Swami Sharnanand Sahitya", icon: "🕉️" },
    { key: "Teerth Sthal", hi: "तीर्थ स्थल", en: "Teerth Sthal", icon: "🛕" }
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
      paksha: paksha, tithiName: tithiName, tithiNum: tithiInPaksha,
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

  function titleFromFile(file) {
    var t = file.replace(/\.html$/i, "");
    if (t.indexOf("u_") === 0) t = t.slice(2);
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
    "श्रीमद्भगवद्गीता_साधक_संजीवनी.html": "assets/covers/sadhak-sanjeevani.png",
    "अच्छे बनो.html": "assets/covers/achhe-bano.jpg",
    "अध्यात्म-पथ-प्रदर्शक.html": "assets/covers/adhyatma-path-pradarshak.png",
    "अध्यात्मरामायण.html": "assets/covers/adhyatma-ramayan.jpg",
    "अध्यात्मविषयक पत्र.html": "assets/covers/adhyatma-vishayak-patra.png",
    "अनन्य भक्तिसे भगवत्प्राप्ति.html": "assets/covers/ananya-bhakti-se-bhagwatprapti.jpg",
    "अनन्यभक्ति कैसे प्राप्त हो.html": "assets/covers/ananyabhakti-kaise-prapt-ho.jpg",
    "अनुराग पदावली.html": "assets/covers/anurag-padavali.jpg",
    "अन्त्यकर्म श्राद्धप्रकाश.html": "assets/covers/antyakarma-shraddhaprakash.jpg",
    "u_बृहदारण्यकोपनिषत्.html": "assets/covers/brihadaranyakopanishat.png",
    "अमरता की ओर.html": "assets/covers/amarata-ki-or.jpg",
    "अमूल्य वचन.html": "assets/covers/amulya-vachan.jpg",
    "अपात्रको भी भगवत्प्राप्ति.html": "assets/covers/apatra-ko-bhi-bhagwatprapti.png",
    "ऋग्वेद.html": "assets/covers/rigved.png",
    "अमूल्य शिक्षा.html": "assets/covers/amulya-shiksha.jpg",
    "एकादशी व्रत का माहात्म्य.html": "assets/covers/ekadashi-vrat-mahatmya.png",
    "गयाश्राद्धपद्धति_माहात्म्य तथा_गयायात्राविधानसहित.html": "assets/covers/gaya-shraddha-paddhati-mahatmya.png",
    "गुरु और माता-पिता के भक्त बालक.html": "assets/covers/guru-aur-mata-pita-ke-bhakt-balak.png",
    "बाल अमृत वचन.html": "assets/covers/baal-amrit-vachan.jpg",
    "बाल प्रश्नोत्तरी.html": "assets/covers/baal-prashnottari.jpg",
    "बालकों की बोलचाल.html": "assets/covers/balakon-ki-bolchaal.jpg",
    "संक्षिप्त शिवपुराण.html": "assets/covers/sankshipt-shivpuran.jpg",
    "संध्योपासनविधि और तर्पण एवं बलिवैश्वदेव विधि.html": "assets/covers/sandhyopasan-vidhi-tarpan-balivaishvadev-vidhi.jpg",
    "शिव-आराधना.html": "assets/covers/shiv-aradhana.png",
    "यजुर्वेद.html": "assets/covers/yajurved.png",
    "श्रीविष्णुपुराण.html": "assets/covers/shri-vishnu-puran.png",
    "शिव स्मरण.html": "assets/covers/shiv-smaran.png",
    "शिवमहिम्नस्तोत्र.html": "assets/covers/shiv-mahimna-stotra.png",
    "श्रीशिवचालीसा.html": "assets/covers/shri-shiv-chalisa.png",
    "श्रीशिवसहस्रनामस्तोत्रम्.html": "assets/covers/shri-shiv-sahasranama-stotram.png",
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
    "श्रीलिङ्ग-महापुराण (केवल हिन्दी).html": "assets/covers/shri-linga-mahapuran.png",
    "दत्तात्रेय वज्र कवच.html": "assets/covers/dattatreya-vajra-kavach.jpg",
    "सामवेद.html": "assets/covers/samved.jpg",
    "अथर्ववेद.html": "assets/covers/atharvaved.jpg",
    "एक लोटा पानी.html": "assets/covers/ek-lota-pani.jpg",
    "गिता चिंतन.html": "assets/covers/gita-chintan.jpg",
    "देवीस्तोत्ररत्नाकर.html": "assets/covers/devi-stotra-ratnakar.jpg",
    "संक्षिप्त योगवासिष्ठ.html": "assets/covers/sankshipt-yogvasishtha.jpg",
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html": "assets/covers/tattva-vivechani.webp",
    "ईशावास्योपनिषद्.html": "assets/covers/ishavasyopanishad.jpg",
    "केनोपनिषद्.html": "assets/covers/kenopanishad.jpg",
    "कठोपनिषद्.html": "assets/covers/kathopanishad.jpg",
    "प्रश्नोपनिषद्.html": "assets/covers/prashnopanishad.jpg",
    "मुण्डकोपनिषद्.html": "assets/covers/mundakopanishad.jpg",
    "माण्डूक्योपनिषद्.html": "assets/covers/mandukyopanishad.jpg",
    "ऐतरेयोपनिषद्.html": "assets/covers/aitareyopanishad.jpg",
    "तैत्तिरीयोपनिषद्.html": "assets/covers/taittiriyopanishad.jpg",
    "श्वेताश्वतरोपनिषद्.html": "assets/covers/shvetashvataropanishad.jpg",
    "ईस्वर अंस जीव अबिनासी.html": "assets/covers/ishwar-ansh-jeev-abinasi.png",
    "मेरे नाथ! मेरे प्रभो.html": "assets/covers/mere-nath-mere-prabho.png",
    "अयोध्या-माहात्म्य.html": "assets/covers/ayodhya-mahatmya.jpg",
    "शिव स्तोत्र रत्नाकर.html": "assets/covers/shiv-stotra-ratnakar.jpg",
    "जीवन्मुक्तिके रहस्य.html": "assets/covers/jivanmukti-ke-rahasya.png",
    "यह कलियुग है!.html": "assets/covers/yah-kaliyug-hai.png",
    "मानस-मुक्ता.html": "assets/covers/manas-mukta.png",
    "श्रीहनुमानचालीसा.html": "assets/covers/shri-hanuman-chalisa.png"
  };

  // Books whose text credits a publisher other than Gita Press (Manav Seva Sangh,
  // Gita Prakashan, Tirumala Tirupati Devasthanam, etc.) — affiliate buy buttons are
  // hidden for these since Gita Press does not sell them.
  var NON_GITA_PRESS_BOOKS = {
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
    "सन्त पत्रावली - 1.html": true,
    "सन्त पत्रावली - 2.html": true,
    "सन्त पत्रावली - 3.html": true,
    "सन्त वाणी   -Cassette Reference.html": true,
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
    "साधन-निधि.html": true
  };

  // Display-only title overrides — shown in the app, never alters the underlying book file.
  var TITLE_OVERRIDES = {
    "श्रीमद्भगवद्गीता_तत्त्वविवेचनी हिन्दी_टीकासहित.html": "श्रीमद्भगवद्गीता तत्त्वविवेचनी",
    "श्रीलिङ्ग-महापुराण (केवल हिन्दी).html": "श्रीलिङ्ग महापुराण",
    "श्रीहनुमानचालीसा (हिन्दी भावार्थसहित).html": "ॐ श्रीहनुमानचालीसा",
    "महाभारत (आदिपर्व से स्वर्गारोहणपर्व).html": "महाभारत"
  };

  var BOOKS = (window.SWADHYAY_BOOKS_RAW || []).map(function (b, i) {
    var cat = CATEGORY_BY_KEY[b.category] || { key: b.category, hi: b.category, en: b.category, icon: "📖" };
    var title = TITLE_OVERRIDES[b.file] || titleFromFile(b.file);
    var author = (b.author && b.author.trim()) ? b.author.trim() : "गीता प्रेस, गोरखपुर";
    return {
      id: i,
      file: b.file,
      href: bookHref(b.file),
      title: title,
      titleRoman: normalizeRoman(devanagariToRoman(title)),
      author: author,
      authorRoman: normalizeRoman(devanagariToRoman(author)),
      category: b.category,
      categoryMeta: cat,
      sizeKB: b.sizeKB || 10,
      minutes: estMinutes(b.sizeKB || 10),
      paletteIdx: hashCode(title) % PALETTE.length,
      initial: title.trim().charAt(0) || "ॐ",
      coverImage: COVER_OVERRIDES[b.file] || null,
      isGitaPress: !NON_GITA_PRESS_BOOKS[b.file]
    };
  });
  var BOOKS_BY_ID = {};
  BOOKS.forEach(function (b) { BOOKS_BY_ID[b.id] = b; });

  function findByFile(file) {
    for (var i = 0; i < BOOKS.length; i++) if (BOOKS[i].file === file) return BOOKS[i];
    return null;
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
    bookmarks: "swadhyay_bookmarks_v1",
    highlights: "swadhyay_highlights_v1",
    panchangCity: "swadhyay_panchang_city_v1",
    feedback: "swadhyay_feedback_v1"
  };

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

  function getReads() { return readJSON(LS.reads, {}); }
  function setReads(obj) { writeJSON(LS.reads, obj); }
  function recordOpen(id) {
    var reads = getReads();
    var entry = reads[id] || { progress: 0 };
    entry.lastOpenedAt = Date.now();
    if (!entry.firstOpenedAt) entry.firstOpenedAt = entry.lastOpenedAt;
    reads[id] = entry;
    setReads(reads);
  }
  function setProgress(id, pct) {
    var reads = getReads();
    var entry = reads[id] || {};
    entry.progress = pct;
    entry.lastOpenedAt = Date.now();
    if (!entry.firstOpenedAt) entry.firstOpenedAt = entry.lastOpenedAt;
    reads[id] = entry;
    setReads(reads);
  }
  function clearHistory() { setReads({}); }

  /* ---------------- auth stub ----------------
     No real login system yet (to be built separately). getCurrentUser() reads a
     "swadhyay_current_user_v1" record ({name:"..."}) from localStorage; until a real
     login flow writes that key, this always returns null, so comment-posting stays gated
     behind "please sign in" everywhere in the UI below. */
  function getCurrentUser() { return readJSON(LS.currentUser, null); }
  function isLoggedIn() { return !!getCurrentUser(); }

  /* No real subscription/billing system yet (to be built separately). isSubscribed() always
     returns false until a real subscription flow marks the current user's record, so
     "Listen to this book" stays visible to everyone but opens a subscribe prompt on click. */
  function isSubscribed() { var u = getCurrentUser(); return !!(u && u.subscribed); }

  /* ---------------- comments (per-book, localStorage-backed) ----------------
     Comments are stored locally in this browser only (there is no backend/server in this
     project), keyed by book id: { [bookId]: [ {id, author, text, ts}, ... ] }. This is a
     placeholder data layer so the UI/UX can be built now; swap for a real API once one exists. */
  function getAllComments() { return readJSON(LS.comments, {}); }
  function getComments(bookId) {
    var list = getAllComments()[bookId] || [];
    return list.slice().sort(function (a, b) { return b.ts - a.ts; });
  }
  function addComment(bookId, text) {
    var user = getCurrentUser();
    if (!user || !text.trim()) return null;
    var all = getAllComments();
    var list = all[bookId] || [];
    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      author: user.name || "अनाम पाठक",
      text: text.trim().slice(0, 1000),
      ts: Date.now()
    };
    list.push(entry);
    all[bookId] = list;
    writeJSON(LS.comments, all);
    return entry;
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
    return "assets/hero_banner_" + (mobile ? "mobile_" : "") + (t === "dark" ? "dark" : "light") + ".png";
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

    var readSeed = [
      ["श्रीमद्भगवद्गीता_साधक_संजीवनी.html", 65, 0],
      ["श्रीरामचरितमानस.html", 32, 2],
      ["श्रीविष्णुसहस्रनामस्तोत्रम्.html", 78, 5],
      ["संक्षिप्त श्रीमद्देवीभागवत.html", 40, 7],
      ["श्रीभक्तमाल.html", 15, 9]
    ];
    var reads = {};
    var now = Date.now();
    readSeed.forEach(function (r) {
      var b = findByFile(r[0]);
      if (!b) return;
      var ts = now - r[2] * 86400000;
      reads[b.id] = { progress: r[1], lastOpenedAt: ts, firstOpenedAt: ts - 3 * 86400000 };
    });
    setReads(reads);
  }

  var NEW_ADDITIONS_FILES = [
    "संक्षिप्त शिवपुराण.html", "श्रीमद्देवीभागवतमहापुराण.html", "संक्षिप्त योगवासिष्ठ.html",
    "श्रीहनुमानचालीसा (हिन्दी भावार्थसहित).html", "नारद भक्ति सूत्र.html",
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
  function getTodaysSpecial(panchang) {
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
    { icon: "🪷", hi: "दैनिक स्तोत्र", sub: "सुबह-शाम के लिए", q: "स्तोत्र" },
    { icon: "🪔", hi: "व्रत एवं त्योहार", sub: "विधि और महत्व", q: "व्रत" },
    { icon: "🌿", hi: "जीवन मार्गदर्शन", sub: "आचार, विचार, आचरण", q: "जीवन" },
    { icon: "🪶", hi: "संस्कृत सीखें", sub: "श्लोक, उच्चारण, व्याकरण", q: "व्याकरण" }
  ];

  var POPULAR_AUTHOR_HINTS = ["हनुमानप्रसाद", "शंकराचार्य", "विवेकानन्द", "तुलसीदास"];
  function findAuthorLabel(hint) {
    for (var i = 0; i < BOOKS.length; i++) {
      if (BOOKS[i].author && BOOKS[i].author.indexOf(hint) !== -1) return BOOKS[i].author;
    }
    return hint;
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
      '<a class="book-card-link" href="#/book/' + book.id + '">' +
      coverEl(book, "md") +
      '</a>' +
      '<button class="fav-toggle ' + (fav ? "active" : "") + '" data-fav="' + book.id + '" title="पसंदीदा">♥</button>' +
      '<div class="book-card-body">' +
      '<a href="#/book/' + book.id + '" class="book-title">' + esc(book.title) + '</a>' +
      '<div class="book-author">' + esc(book.author) + '</div>' +
      '</div></div>';
  }

  function bookRow(book) {
    var read = getReads()[book.id];
    var pct = read ? (read.progress || 0) : 0;
    return '<div class="book-row-item" data-id="' + book.id + '">' +
      '<a class="book-card-link" href="#/book/' + book.id + '">' + coverEl(book, "sm") + '</a>' +
      '<div class="book-row-body">' +
      '<a href="#/book/' + book.id + '" class="book-title">' + esc(book.title) + '</a>' +
      (read ? '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div><span class="progress-pct">' + pct + '%</span>' :
        '<div class="book-author">' + esc(book.author) + '</div>') +
      '</div></div>';
  }

  function carousel(titleHi, titleEn, subHi, items, viewAllHash, extraClass) {
    if (!items.length) return "";
    var html = '<section class="row-section' + (extraClass ? " " + extraClass : "") + '">' +
      '<div class="row-head"><h2>' + bilingual(titleHi, titleEn) + (subHi ? ' <span class="row-sub">| ' + esc(subHi) + '</span>' : '') + '</h2>' +
      '<a class="view-all" href="' + viewAllHash + '">' + bilingual("सभी देखें", "View All") + ' →</a></div>' +
      '<div class="row-scroll-wrap">' +
      '<button class="row-nav prev" aria-label="पिछला">‹</button>' +
      '<div class="row-scroll">' + items.map(bookRow).join("") + '</div>' +
      '<button class="row-nav next" aria-label="अगला">›</button>' +
      '</div></section>';
    return html;
  }

  function categoryTabs(activeKey) {
    return '<nav class="cat-tabs" id="catTabs">' + CATEGORY_META.map(function (c) {
      var count = c.key === "all" ? BOOKS.length : BOOKS.filter(function (b) { return b.category === c.key; }).length;
      return '<a class="cat-tab' + (c.key === activeKey ? " active" : "") + '" href="#/library?cat=' + encodeURIComponent(c.key) + '">' +
        bilingual(c.hi, c.en) + ' <span class="cnt">(' + count + ')</span></a>';
    }).join("") + '</nav>';
  }

  function categoryGrid() {
    return '<section class="row-section"><div class="row-head"><h2>' + bilingual("श्रेणियाँ", "Categories") +
      '</h2><a class="view-all" href="#/library">' + bilingual("सभी देखें", "View All") + ' →</a></div>' +
      '<div class="row-scroll-wrap">' +
      '<button class="row-nav prev" aria-label="पिछला">‹</button>' +
      '<div class="row-scroll cat-scroll">' + CATEGORY_META.map(function (c) {
        var count = c.key === "all" ? BOOKS.length : BOOKS.filter(function (b) { return b.category === c.key; }).length;
        return '<a class="cat-tile" href="#/library?cat=' + encodeURIComponent(c.key) + '">' +
          '<span class="cat-tile-icon">' + c.icon + '</span>' +
          '<span class="cat-tile-label">' + bilingual(c.hi, c.en) + '</span>' +
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
      '<div class="pc-tithi-line">' + esc(p.paksha) + ' पक्ष • ' + esc(p.tithiName) + '</div>' +
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
      '<a class="btn-primary pc-full-btn" href="#/panchang">' + bilingual("पूर्ण पंचांग देखें") + ' →</a>' +
      '</div>';
  }

  /* ---------------- home: ग्रंथों से पूछें AI कार्ड ---------------- */
  function aiAskCard() {
    return '<div class="ai-ask-card">' +
      '<div class="ai-head"><img class="ai-head-icon-badge" src="assets/om-medallion.webp" alt="ॐ"><h3>' + bilingual("ग्रंथों से पूछें") + '</h3><span class="ai-badge">AI</span></div>' +
      '<p class="ai-sub">' + bilingual("स्वाध्याय के ग्रंथों के आधार पर संदर्भ सहित उत्तर प्राप्त करें") + '</p>' +
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
      '<a href="#/book/' + book.id + '">' + coverEl(book, "md") + '</a>' +
      '<a href="#/book/' + book.id + '" class="special-book-title">' + esc(book.title) + '</a>' +
      '<div class="special-book-sub">' + esc(book.categoryMeta.hi) + '</div>' +
      '<a class="special-book-cta" href="#/book/' + book.id + '">' + bilingual("पढ़ें") + ' →</a>' +
      '</div>';
  }

  function todaysSpecialSection(panchang) {
    var special = getTodaysSpecial(panchang);
    if (!special) return "";
    return '<section class="row-section"><div class="row-head"><h2>' + bilingual("आज के लिए विशेष") +
      ' <span class="row-sub">| आज के पंचांग के अनुसार अनुशंसित ग्रंथ और पाठ</span></h2></div>' +
      '<div class="today-special-grid">' +
      '<div class="festival-banner">' +
      '<div class="festival-icon">🔱</div>' +
      '<div class="festival-body"><h4>' + esc(special.title) + '</h4><p>' + esc(special.desc) + '</p>' +
      '<a class="btn-outline festival-cta" href="#/library?q=' + encodeURIComponent(special.title) + '">' + bilingual("विस्तार देखें") + ' →</a></div>' +
      '</div>' +
      '<div class="special-book-row">' + special.books.map(specialBookTile).join("") + '</div>' +
      '</div></section>';
  }

  /* ---------------- home: आज क्या पढ़ें? CTA ---------------- */
  function suggestedReadBanner() {
    var day = Math.floor(Date.now() / 86400000);
    var book = BOOKS[day % BOOKS.length];
    return '<section class="row-section"><a class="cta-banner" href="#/book/' + book.id + '">' +
      '<div class="cta-banner-body"><h3>' + bilingual("आज क्या पढ़ें?") + '</h3>' +
      '<p>' + bilingual("आज के दिन के अनुसार उपयुक्त पाठ, स्तोत्र और साधना सुझाव") + '</p>' +
      '<span class="btn-primary">' + bilingual("देखें") + ' →</span></div>' +
      '</a></section>';
  }

  /* ---------------- home: विशेष संग्रह ---------------- */
  function specialCollectionsSection() {
    return '<section class="row-section"><div class="row-head"><h2>' + bilingual("विशेष संग्रह") +
      '</h2><a class="view-all" href="#/library">' + bilingual("सभी देखें", "View All") + ' →</a></div>' +
      '<div class="collections-grid">' + SPECIAL_COLLECTIONS.map(function (c) {
        return '<a class="collection-tile" href="#/library?q=' + encodeURIComponent(c.q) + '">' +
          '<span class="collection-icon">' + c.icon + '</span>' +
          '<span class="collection-label">' + bilingual(c.hi) + '</span>' +
          '<span class="collection-sub">' + bilingual(c.sub) + '</span></a>';
      }).join("") + '</div></section>';
  }

  /* ---------------- home: लोकप्रिय लेखक ---------------- */
  function popularAuthorsSection() {
    return '<section class="row-section"><div class="row-head"><h2>' + bilingual("लोकप्रिय लेखक") +
      '</h2><a class="view-all" href="#/library">' + bilingual("सभी देखें", "View All") + ' →</a></div>' +
      '<div class="authors-row">' + POPULAR_AUTHOR_HINTS.map(function (hint, i) {
        var label = findAuthorLabel(hint);
        var g = PALETTE[i % PALETTE.length];
        return '<a class="author-tile" href="#/library?q=' + encodeURIComponent(hint) + '">' +
          '<span class="author-avatar" style="background:linear-gradient(150deg,' + g[0] + ',' + g[1] + ')">' + esc(label.charAt(0)) + '</span>' +
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
      '<h1 class="hero-title">' + bilingual("शाश्वत ज्ञान, उज्ज्वल भविष्य के लिए", "Timeless Wisdom for a Brighter Tomorrow") + '</h1>' +
      '<p class="hero-sub">“ज्ञानं परमं बलम्” — ज्ञान ही परम बल है।</p>' +
      '<div class="hero-search"><input id="homeSearch" type="text" placeholder="पुस्तकें, लेखक, विषय खोजें…"></div>' +
      '<div class="hero-chips">' +
      ["गीता", "रामायण", "उपनिषद्", "विवेकानन्द", "स्तोत्र", "बालोपयोगी"].map(function (t) {
        return '<button class="chip" data-q="' + esc(t) + '">' + esc(t) + '</button>';
      }).join("") +
      '</div></div></section>';

    html += '<main class="content-pad">';
    html += '<div class="home-top-grid">' + panchangCard(panchang) + aiAskCard() + '</div>';
    html += categoryGrid();
    if (recentBooks.length) html += carousel("हाल में पढ़ा", "Recently Read", "जहाँ से छोड़ा था, वहाँ से आगे पढ़ें", recentBooks, "#/myreads");
    html += todaysSpecialSection(panchang);
    html += carousel("नये आगमन", "New Additions", "", newAdd, "#/library?cat=all&sort=latest", "new-arrivals-row");
    if (favBooks.length) html += carousel("आपके प्रिय ग्रंथ", "Your Favorites", "", favBooks, "#/favorites");
    html += suggestedReadBanner();
    html += specialCollectionsSection();
    html += popularAuthorsSection();
    html += '</main>';
    return html;
  }

  function matchesQuery(book, q) {
    if (!q) return true;
    var ql = q.toLowerCase();
    if (book.title.toLowerCase().indexOf(ql) !== -1 || book.author.toLowerCase().indexOf(ql) !== -1) return true;
    // Roman/English-script fallback (e.g. "krishna" matching "कृष्ण"), and equally useful the
    // other way round for a Devanagari query with slightly different spelling conventions.
    var qRoman = normalizeRoman(devanagariToRoman(q));
    if (!qRoman) return false;
    return book.titleRoman.indexOf(qRoman) !== -1 || book.authorRoman.indexOf(qRoman) !== -1;
  }

  var PAGE_SIZE = 40;
  var libraryState = { page: 1 };
  var chatState = { history: [], busy: false, turns: [], pendingInput: "" };

  function viewLibrary(params) {
    var cat = params.get("cat") || "all";
    var q = params.get("q") || "";
    var sort = params.get("sort") || "default";
    var filter = params.get("filter") || "all";

    var list = BOOKS.filter(function (b) { return (cat === "all" || b.category === cat) && matchesQuery(b, q); });

    if (filter === "short") list = list.filter(function (b) { return b.sizeKB < 150; });
    if (filter === "popular") list = list.filter(function (b) { return hashCode(b.file) % 3 === 0; });

    if (sort === "latest") list = list.slice().reverse();
    else if (sort === "az") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title, "hi"); });

    var meta = CATEGORY_BY_KEY[cat] || { hi: cat, en: cat };
    var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    var page = Math.min(libraryState.page, totalPages);
    var pageItems = list.slice(0, page * PAGE_SIZE);

    var html = '<div class="page-header">' +
      '<h1>' + bilingual(meta.hi, meta.en) + ' <span class="cnt">(' + list.length + ')</span></h1>' +
      '<div class="lib-search"><input id="librarySearch" type="text" placeholder="खोजें…" value="' + esc(q) + '"></div>' +
      '</div>';
    html += categoryTabs(cat);
    html += '<div class="filter-tabs">' +
      ["all:सभी", "popular:लोकप्रिय", "short:लघु पाठ"].map(function (f) {
        var parts = f.split(":"); var key = parts[0];
        return '<a class="filter-tab' + (filter === key ? " active" : "") + '" href="#/library?cat=' + encodeURIComponent(cat) + '&filter=' + key + (q ? "&q=" + encodeURIComponent(q) : "") + '">' + parts[1] + '</a>';
      }).join("") +
      '<a class="filter-tab' + (sort === "latest" ? " active" : "") + '" href="#/library?cat=' + encodeURIComponent(cat) + '&sort=latest">नवीनतम</a>' +
      '</div>';

    if (!pageItems.length) {
      html += '<div class="empty-state">' + bilingual("कोई पुस्तक नहीं मिली", "No books found") + '</div>';
    } else {
      html += '<div class="book-grid">' + pageItems.map(bookCard).join("") + '</div>';
      if (page < totalPages) html += '<div class="load-more-wrap"><button id="loadMoreBtn" class="btn-outline">' + bilingual("और दिखाएँ", "Load More") + '</button></div>';
    }
    return '<main class="content-pad">' + html + '</main>';
  }

  function genBlurb(book) {
    var meta = book.categoryMeta;
    var source = book.isGitaPress
      ? "गीता प्रेस की प्रामाणिक शैली में प्रकाशित"
      : "सुधी पाठकों के लिए सुलभ कराया गया";
    return "इस ग्रंथ का विषय — " + meta.hi + " — सनातन धर्म की समृद्ध परम्परा का अंग है। " +
      esc(book.author) + " द्वारा प्रस्तुत, " + source + " यह संस्करण सरल एवं सुगम पठन के लिए तैयार किया गया है।";
  }

  /* ---------------- table of contents ----------------
     Every converted book uses a shared heading convention (p.Heading / p.Sub-Heading /
     p.Sub-Heading-2 / p.Sub-Heading-3), each already carrying its own id="toc_marker-N".
     So rather than hand-maintaining a TOC per book (500+ titles), the TOC is extracted live
     from the book's own HTML the first time its tab is opened, and each entry links straight
     to that heading's existing anchor inside the book page. */
  var TOC_LEVEL_CLASS = { "Heading": 1, "Sub-Heading": 2, "Sub-Heading-2": 3, "Sub-Heading-3": 4 };
  var tocCache = {};

  function extractTOC(htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var nodes = doc.querySelectorAll("p.Heading, p.Sub-Heading, p.Sub-Heading-2, p.Sub-Heading-3");
    var out = [];
    nodes.forEach(function (el) {
      var firstClass = (el.className || "").trim().split(/\s+/)[0];
      var level = TOC_LEVEL_CLASS[firstClass] || 2;
      var text = el.textContent.replace(/\s+/g, " ").trim();
      if (!text) return;
      out.push({ level: level, text: text, id: el.id || null });
    });
    return out;
  }

  function tocLink(e, href) {
    var label = esc(e.text);
    return e.id
      ? '<a href="' + href + '#' + e.id + '" target="_blank" rel="noopener">' + label + '</a>'
      : '<span>' + label + '</span>';
  }

  // Groups the flat heading list into sections keyed by the topmost heading level actually
  // used in this book (usually "Heading", but a book that only ever uses Sub-Heading works
  // just as well) -- each section's deeper-level entries become its collapsible children.
  function groupTOC(entries) {
    if (!entries.length) return [];
    var minLevel = Math.min.apply(null, entries.map(function (e) { return e.level; }));
    var sections = [];
    var current = null;
    entries.forEach(function (e) {
      if (e.level === minLevel || !current) {
        current = { header: e, children: [] };
        sections.push(current);
      } else {
        current.children.push(e);
      }
    });
    return sections;
  }

  function renderTOCList(entries, href) {
    if (!entries.length) return '<div class="empty-state small">इस पुस्तक की विषय-सूची उपलब्ध नहीं है।</div>';
    var sections = groupTOC(entries);
    return '<div class="toc-accordion">' + sections.map(function (sec) {
      var hasChildren = sec.children.length > 0;
      var childrenHTML = hasChildren
        ? '<ul class="toc-children">' + sec.children.map(function (e) {
            return '<li class="toc-item toc-level-' + e.level + '">' + tocLink(e, href) + '</li>';
          }).join("") + '</ul>'
        : '';
      return '<div class="toc-section">' +
        '<div class="toc-section-header">' +
        (hasChildren ? '<button class="toc-toggle" type="button" aria-label="विस्तार करें">▸</button>' : '<span class="toc-toggle-spacer"></span>') +
        tocLink(sec.header, href) +
        '</div>' + childrenHTML + '</div>';
    }).join("") + '</div>';
  }

  function loadTOC(book, panel) {
    if (tocCache[book.id]) { panel.innerHTML = renderTOCList(tocCache[book.id], book.href); return; }
    panel.innerHTML = '<div class="empty-state small">विषय-सूची लोड हो रही है…</div>';
    fetch(book.href).then(function (res) {
      if (!res.ok) throw new Error("fetch failed");
      return res.text();
    }).then(function (htmlText) {
      var entries = extractTOC(htmlText);
      tocCache[book.id] = entries;
      panel.innerHTML = renderTOCList(entries, book.href);
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
  var reader = { open: false, bookId: null, book: null, headHtml: "", chapters: null, idx: 0, theme: "day", fontSize: 19, expandedChapters: {} };

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
  // one, e.g. "toc_marker-8-1"), and returns the patched HTML plus the {text, anchorId} list.
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

  function buildReaderBook(bookId, htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, "text/html");
    var headHtml = doc.head ? doc.head.innerHTML : "";
    var bodyHtml = doc.body ? doc.body.innerHTML : htmlText;
    var chunks = splitBookChapters(bodyHtml);
    var chapters = [];
    var sawRealHeading = false;
    chunks.forEach(function (html) {
      var heading = findChapterHeading(html);
      if (heading && isTocLabel(heading)) return; // drop the book's own built-in TOC page

      if (heading) {
        chapters.push({ html: html, label: heading });
        sawRealHeading = true;
      } else if (sawRealHeading && chapters.length) {
        // No heading here -- just a leftover page-break inside the chapter above
        // (e.g. print-pagination remnants), so fold it into that chapter instead of
        // spawning a spurious, unlabelled "पृष्ठ N" entry of its own.
        chapters[chapters.length - 1].html += html;
      } else {
        // Nothing headed has appeared yet (or this book has no headings anywhere) --
        // keep the old per-page fallback so headless books still paginate sensibly.
        chapters.push({ html: html, label: "पृष्ठ " + (chapters.length + 1) });
      }
    });
    chapters.forEach(function (ch, i) {
      var extracted = extractSubHeadings(ch.html, i);
      ch.html = extracted.html;
      ch.subs = extracted.subs;
    });
    var entry = { headHtml: headHtml, chapters: chapters };
    readerCache[bookId] = entry;
    return entry;
  }

  function readerBaseUrl(book) {
    var abs = new URL(book.href, location.href);
    return abs.href.replace(/[^/]*$/, "");
  }

  function readerThemeCSS() {
    return ".rdr-night{filter:invert(0.93) hue-rotate(180deg);}" +
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
      'var el=document.getElementById(ANCHOR_ID);' +
      'if(el) el.scrollIntoView({block:"start"});' +
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

  function renderIframeDoc(book, headHtml, chapterHtml, fontSize, theme, highlightList, restoreScrollPct, anchorId) {
    var themeClass = theme === "night" ? "rdr-night" : theme === "sepia" ? "rdr-sepia" : "";
    var bg = theme === "sepia" ? "#f4ecd8" : "#ffffff";
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<base href="' + esc(readerBaseUrl(book)) + '">' +
      headHtml +
      '<style>' +
      'html{background:' + bg + ';}' +
      'body{margin:0;padding:1.1rem 1.2rem 4rem;max-width:900px;margin-left:auto;margin-right:auto;' +
      'font-size:' + fontSize + 'px;box-sizing:border-box;}' +
      '@media (min-width:900px){body{max-width:1100px;padding:1.4rem 2rem 4rem;}}' +
      'mark.rdr-hl{background:#ffe58a;border-radius:2px;}' +
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
    return reader.chapters.map(function (c, i) {
      var isBm = marks.some(function (b) { return b.chapterIdx === i; });
      var isActive = i === reader.idx;
      var hasSubs = c.subs && c.subs.length > 0;
      var expanded = hasSubs && (isActive || reader.expandedChapters[i]);
      var subsHtml = hasSubs
        ? '<ul class="reader-toc-subs' + (expanded ? " open" : "") + '">' + c.subs.map(function (s) {
            return '<li class="reader-toc-subitem" data-idx="' + i + '" data-anchor="' + esc(s.anchorId) + '">' + esc(s.text) + '</li>';
          }).join("") + '</ul>'
        : '';
      return '<li class="reader-toc-group">' +
        '<div class="reader-toc-item' + (isActive ? " active" : "") + '" data-idx="' + i + '">' +
        (hasSubs ? '<button class="reader-toc-expand" data-toggle="' + i + '">' + (expanded ? "▾" : "▸") + '</button>' : '<span class="reader-toc-expand-spacer"></span>') +
        (isBm ? '<span class="reader-toc-star">★</span> ' : '') + esc(c.label) +
        '</div>' + subsHtml + '</li>';
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
    if (titleEl) titleEl.textContent = reader.book.title + " · " + reader.chapters[reader.idx].label;
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
    var fv = document.getElementById("readerFontVal");
    if (fv) fv.textContent = reader.fontSize + "px";
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
    iframe.srcdoc = renderIframeDoc(reader.book, reader.headHtml, chapter.html, reader.fontSize, reader.theme, highlights, restoreScrollPct || 0, anchorId);
  }

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
    try { history.replaceState(null, "", "#/read/" + reader.bookId + "/" + idx); } catch (e) {}
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
      if (!reader.open) return;
      if (e.key === "ArrowRight") readerGo(reader.idx + 1);
      else if (e.key === "ArrowLeft") readerGo(reader.idx - 1);
      else if (e.key === "Escape") closeDrawerAndSettings();
    });
  }

  function openReader(bookId, startIdx) {
    var book = BOOKS_BY_ID[bookId];
    if (!book) { location.hash = "#/library"; return; }

    document.body.classList.add("reader-active");
    if (!document.getElementById("readerOverlay")) {
      document.body.insertAdjacentHTML("beforeend", readerOverlayShell());
      wireReaderChrome();
    }
    document.getElementById("readerOverlay").classList.add("show");

    reader.open = true;
    reader.bookId = bookId;
    reader.book = book;
    reader.theme = getReaderTheme();
    reader.fontSize = getReaderFontSize();
    reader.chapters = null;
    reader.expandedChapters = {};

    var iframe = document.getElementById("readerIframe");
    iframe.srcdoc = '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#888;text-align:center;">लोड हो रहा है…</body></html>';
    document.getElementById("readerTitleText").textContent = book.title;

    recordOpen(bookId);

    function proceed(entry) {
      reader.headHtml = entry.headHtml;
      reader.chapters = entry.chapters;
      var saved = getReads()[bookId];
      var isResume = !(startIdx !== null && startIdx !== undefined && !isNaN(startIdx));
      var idx = !isResume ? startIdx : (saved && typeof saved.lastChapter === "number") ? saved.lastChapter : 0;
      reader.idx = Math.max(0, Math.min(entry.chapters.length - 1, idx));
      var restorePct = (isResume && saved && reader.idx === saved.lastChapter) ? (saved.scrollPct || 0) : 0;
      readerRenderIframe(restorePct);
      readerUpdateChrome();
      readerSaveProgress(restorePct);
      try { history.replaceState(null, "", "#/read/" + bookId + "/" + reader.idx); } catch (e) {}
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
    document.body.classList.remove("reader-active");
    var overlay = document.getElementById("readerOverlay");
    if (overlay) overlay.classList.remove("show");
  }

  /* ---------------- comments ---------------- */
  function renderCommentList(bookId) {
    var list = getComments(bookId);
    if (!list.length) return '<div class="empty-state small">अभी तक कोई टिप्पणी नहीं है। सबसे पहली टिप्पणी आप ही करें!</div>';
    return '<div class="comment-list">' + list.map(function (c) {
      return '<div class="comment-item"><div class="comment-head"><b>' + esc(c.author) + '</b>' +
        '<span class="comment-time">' + timeAgo(c.ts) + '</span></div>' +
        '<p>' + esc(c.text) + '</p></div>';
    }).join("") + '</div>';
  }

  function renderCommentsTab(book) {
    var user = getCurrentUser();
    var html = '<div class="comments-block">';
    html += user
      ? '<form class="comment-form" id="commentForm" data-book="' + book.id + '">' +
        '<textarea id="commentText" rows="3" maxlength="1000" placeholder="अपनी टिप्पणी लिखें…" required></textarea>' +
        '<button type="submit" class="btn-primary">टिप्पणी भेजें</button></form>'
      : '<div class="comment-login-gate">🔒 टिप्पणी करने के लिए साइन इन करना आवश्यक है। ' +
        '<span class="muted-note">(लॉगिन सुविधा शीघ्र ही जोड़ी जाएगी)</span></div>';
    html += '<div id="commentListWrap">' + renderCommentList(book.id) + '</div>';
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
    html += '<div class="meta-line">👤 ' + esc(book.author) + '</div>';
    html += '<div class="meta-line">📖 हिन्दी</div>';
    html += '<div class="meta-line">⏱️ अनुमानित पठन समय ' + formatDuration(book.minutes) + '</div>';
    html += '<div class="tag-row"><span class="tag">' + esc(book.categoryMeta.hi) + '</span></div>';
    html += '<div class="detail-actions">' +
      '<a class="btn-primary" href="#/read/' + book.id + '" id="startReadingBtn">▶ पढ़ना शुरू करें</a>' +
      '<button class="btn-outline ' + (fav ? "active" : "") + '" id="favBtn" data-fav="' + book.id + '">' + (fav ? "♥ पसंदीदा में शामिल" : "♡ पसंदीदा में जोड़ें") + '</button>' +
      '<button class="btn-outline" id="shareBtn">↪ साझा करें</button>' +
      '</div>';
    html += '<div class="progress-block"><label>' + bilingual("आपकी प्रगति") + ': <b id="progressLabel">' + pct + '%</b></label>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%" id="progressFillBar"></div></div></div>';

    var commentCount = getComments(book.id).length;
    html += '<div class="detail-tabs" id="detailTabs" data-book="' + book.id + '">' +
      '<button class="detail-tab active" data-tab="intro">किताब का परिचय</button>' +
      '<button class="detail-tab" data-tab="toc">विषय सूची</button>' +
      '<button class="detail-tab" data-tab="comments">टिप्पणियाँ' + (commentCount ? ' (' + commentCount + ')' : '') + '</button>' +
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
        '<br><a class="btn-primary" href="#/library">' + bilingual("पुस्तकालय देखें", "Browse Library") + '</a></div>';
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
        '<div><a class="book-title" href="#/book/' + top.book.id + '">' + esc(top.book.title) + '</a>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + (top.read.progress || 0) + '%"></div></div></div>' +
        '<a class="btn-primary" href="#/read/' + top.book.id + '">' + bilingual("जारी रखें", "Continue") + '</a></div></div>';
    }

    html += '<div class="page-header" style="margin-top:2rem"><h2>' + bilingual("पठन इतिहास", "Reading History") + '</h2>' +
      (books.length ? '<button id="clearHistoryBtn" class="btn-outline">' + bilingual("इतिहास साफ़ करें", "Clear History") + '</button>' : '') + '</div>';

    if (!books.length) {
      html += '<div class="empty-state">' + bilingual("अभी तक कोई पठन इतिहास नहीं है।", "No reading history yet.") +
        '<br><a class="btn-primary" href="#/library">' + bilingual("पढ़ना शुरू करें", "Start Reading") + '</a></div>';
    } else {
      html += '<div class="history-list">' + books.map(function (x) {
        return '<div class="history-item">' + coverEl(x.book, "sm") +
          '<div class="history-body"><a class="book-title" href="#/book/' + x.book.id + '">' + esc(x.book.title) + '</a>' +
          '<div class="book-author">' + esc(x.book.author) + '</div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + (x.read.progress || 0) + '%"></div></div></div>' +
          '<span class="progress-pct">' + (x.read.progress || 0) + '%</span></div>';
      }).join("") + '</div>';
    }
    return '<main class="content-pad">' + html + '</main>';
  }

  function chatSourceChip(s) {
    var inner = "[" + s.n + "] " + esc(s.title);
    return s.bookId != null
      ? '<a class="chat-source-chip" href="#/book/' + s.bookId + '">' + inner + "</a>"
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
    if (!root || location.hash.replace(/^#\/?/, "").split("/")[0] !== "chat") return;
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
  function viewPanchang() {
    var city = getPanchangCity();
    var today = new Date();
    var p = getPanchang(today, city);
    var cityOpts = PANCHANG_CITIES.map(function (c) {
      return '<option value="' + c.key + '"' + (c.key === city.key ? " selected" : "") + '>' + esc(c.hi) + '</option>';
    }).join("");

    var week = [];
    for (var i = 0; i < 7; i++) {
      var dt = new Date(today.getTime() + i * 86400000);
      var pw = getPanchang(dt, city);
      week.push('<div class="pw-day' + (i === 0 ? " active" : "") + '">' +
        '<div class="pw-weekday">' + esc(pw.weekdayHi.slice(0, 3)) + '</div>' +
        '<div class="pw-date">' + dt.getDate() + '</div>' +
        '<div class="pw-tithi">' + esc(pw.tithiName) + '</div></div>');
    }

    return '<main class="content-pad">' +
      '<div class="page-header"><h1>' + bilingual("पंचांग") + '</h1>' +
      '<select class="pc-city" id="panchangPageCitySelect">' + cityOpts + '</select></div>' +
      '<div class="panchang-week-strip">' + week.join("") + '</div>' +
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
      '</div>' +
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
      '</div></main>';
  }

  /* ---------------- सहायता ---------------- */
  var HELP_FAQS = [
    ["स्वाध्याय क्या है?", "स्वाध्याय गीता प्रेस की पुस्तकों का एक डिजिटल पुस्तकालय है, जहाँ आप सैकड़ों धार्मिक ग्रंथ निःशुल्क पढ़ सकते हैं।"],
    ["क्या मुझे पढ़ने के लिए खाता बनाना ज़रूरी है?", "नहीं, आप बिना खाता बनाये भी सभी ग्रंथ पढ़ सकते हैं। आपकी पठन-प्रगति और पसंदीदा सूची इसी ब्राउज़र में सुरक्षित रहती है।"],
    ["मैं अपनी पठन-स्थिति कैसे जारी रखूँ?", "\"अध्ययन\" अनुभागमें आपको वे सभी ग्रंथ मिलेंगे जो आपने पहले पढ़ने शुरू किये हैं — जहाँसे छोड़ा था, वहींसे आगे पढ़ सकते हैं।"],
    ["पंचांग की जानकारी कितनी सटीक है?", "यहाँ दिखाया गया पंचांग खगोलीय सन्निकटन पर आधारित एक अनुमान है — यह सामान्य जानकारी के लिए उपयोगी है, परन्तु महत्वपूर्ण मुहूर्तों हेतु प्रामाणिक पंचांग से पुष्टि करें।"],
    ["मुझे किसी ग्रंथ में त्रुटि मिली, क्या करूँ?", "कृपया \"विषय सुधार\" पृष्ठ से हमें सूचित करें — हम उसे यथाशीघ्र सुधारने का प्रयास करेंगे।"]
  ];
  function viewHelp() {
    return '<main class="content-pad"><div class="page-header"><h1>' + bilingual("सहायता") + '</h1></div>' +
      '<div class="help-faq-list">' + HELP_FAQS.map(function (f) {
        return '<details class="help-faq-item"><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>';
      }).join("") + '</div>' +
      '<p class="help-contact">' + bilingual("अपना प्रश्न यहाँ नहीं मिला?") + ' <a href="#/feedback">' + bilingual("हमें लिखें") + '</a></p>' +
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

  /* ---------------- router ---------------- */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var qIdx = h.indexOf("?");
    var path = qIdx === -1 ? h : h.slice(0, qIdx);
    var params = new URLSearchParams(qIdx === -1 ? "" : h.slice(qIdx + 1));
    return { path: path || "", params: params };
  }

  function setActiveNav(path) {
    var map = { "": "home", "library": "library", "favorites": "favorites", "myreads": "myreads", "notes": "notes", "chat": "chat", "settings": "settings", "panchang": "panchang", "help": "help", "feedback": "feedback" };
    var key = map[path.split("/")[0]] || "";
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-nav") === key);
    });
  }

  function render() {
    var r = parseHash();
    var root = document.getElementById("viewRoot");
    var body = document.body;
    var top = document.getElementById("subTopbar");

    var seg = r.path.split("/");

    if (seg[0] === "read" && seg[1] !== undefined) {
      var rId = parseInt(seg[1], 10);
      var rCh = seg[2] !== undefined ? parseInt(seg[2], 10) : null;
      openReader(rId, rCh);
      setActiveNav(r.path);
      return;
    }
    closeReader();

    var html = "";
    body.classList.toggle("is-home", seg[0] === "" || seg[0] === "home");

    if (seg[0] === "" || seg[0] === "home") { html = viewHome(); }
    else if (seg[0] === "library") { html = viewLibrary(r.params); }
    else if (seg[0] === "book" && seg[1] !== undefined) { html = viewBook(parseInt(seg[1], 10)); }
    else if (seg[0] === "favorites") { html = viewFavorites(); }
    else if (seg[0] === "myreads") { html = viewMyReads(); }
    else if (seg[0] === "notes") { html = viewStub("मेरे ग्रंथ", "My Scriptures"); }
    else if (seg[0] === "chat") { html = viewChat(); }
    else if (seg[0] === "panchang") { html = viewPanchang(); }
    else if (seg[0] === "help") { html = viewHelp(); }
    else if (seg[0] === "feedback") { html = viewFeedback(); }
    else if (seg[0] === "settings") { html = viewStub("सेटिंग्स", "Settings"); }
    else if (seg[0] === "subscribe") { html = viewStub("सदस्यता", "Subscribe"); }
    else { html = viewHome(); }

    root.innerHTML = html;
    setActiveNav(r.path);
    window.scrollTo(0, 0);
    wireView(r);
    applyHeroBanner();
    if (seg[0] === "chat") wireChatView();
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

    document.querySelectorAll(".hero-chips .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        location.hash = "#/library?cat=all&q=" + encodeURIComponent(chip.getAttribute("data-q"));
      });
    });

    var homeSearch = document.getElementById("homeSearch");
    if (homeSearch) {
      homeSearch.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && homeSearch.value.trim()) {
          location.hash = "#/library?cat=all&q=" + encodeURIComponent(homeSearch.value.trim());
        }
      });
    }

    var librarySearch = document.getElementById("librarySearch");
    if (librarySearch) {
      var t = null;
      librarySearch.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          var p = parseHash().params;
          var cat = p.get("cat") || "all";
          location.hash = "#/library?cat=" + encodeURIComponent(cat) + (librarySearch.value ? "&q=" + encodeURIComponent(librarySearch.value) : "");
        }, 250);
      });
    }

    var loadMore = document.getElementById("loadMoreBtn");
    if (loadMore) loadMore.addEventListener("click", function () { libraryState.page++; render(); });

    var startBtn = document.getElementById("startReadingBtn");
    if (startBtn) {
      var bId = parseInt(location.hash.split("/book/")[1], 10);
      startBtn.addEventListener("click", function () { recordOpen(bId); });
    }
    var shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        var bId = parseInt(location.hash.split("/book/")[1], 10);
        var book = BOOKS_BY_ID[bId];
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
      detailTabs.querySelectorAll(".detail-tab").forEach(function (tabBtn) {
        tabBtn.addEventListener("click", function () {
          var target = tabBtn.getAttribute("data-tab");
          detailTabs.querySelectorAll(".detail-tab").forEach(function (t) { t.classList.toggle("active", t === tabBtn); });
          panels.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-panel") === target); });
          if (target === "toc") {
            var tocPanel = document.getElementById("tocPanel");
            if (tocPanel && !tocPanel.hasChildNodes()) loadTOC(book, tocPanel);
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
          var entry = addComment(bookId, textarea.value);
          if (!entry) return;
          textarea.value = "";
          document.getElementById("commentListWrap").innerHTML = renderCommentList(bookId);
          var tabBtn = detailTabs.querySelector('[data-tab="comments"]');
          if (tabBtn) tabBtn.textContent = "टिप्पणियाँ (" + getComments(bookId).length + ")";
        });
      }
    }

    /* ---- पंचांग: शहर चयन (home card + full page) ---- */
    document.querySelectorAll("#panchangCitySelect, #panchangPageCitySelect").forEach(function (sel) {
      sel.addEventListener("change", function () { setPanchangCity(sel.value); render(); });
    });

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
  }

  /* Sends a question to the प्रश्नोत्तर (chat) page, prefilling the input rather than
     auto-submitting -- lets the visitor review/edit before it actually goes out. */
  function askAI(q) {
    chatState.pendingInput = q || "";
    if (location.hash === "#/chat") { rerenderChat(); focusChatInput(); }
    else location.hash = "#/chat";
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
      '<p>' + bilingual("पुस्तकें सुनने के लिए स्वाध्याय सदस्यता लें।", "Subscribe to Swadhyay to listen to books.") + '</p>' +
      '<a href="#/subscribe" class="btn-primary" id="subscribeModalCta">' + bilingual("सदस्यता लें", "Subscribe now") + '</a>' +
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
      b.addEventListener("click", function () { location.hash = "#/library"; });
    });

    var profileBtn = document.getElementById("profileBtn");
    if (profileBtn) profileBtn.addEventListener("click", function () { location.hash = "#/settings"; });

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

    window.addEventListener("scroll", updateTopbarSolidity, { passive: true });
  }

  function updateTopbarSolidity() {
    var topbar = document.querySelector(".topbar");
    if (!topbar) return;
    var solid = !document.body.classList.contains("is-home") || window.scrollY > 50;
    topbar.classList.toggle("scrolled", solid);
  }

  function onNavigate() { libraryState.page = 1; render(); updateTopbarSolidity(); }

  window.addEventListener("hashchange", onNavigate);
  document.addEventListener("DOMContentLoaded", function () {
    seedDemoData();
    initChrome();
    onNavigate();
  });
})();

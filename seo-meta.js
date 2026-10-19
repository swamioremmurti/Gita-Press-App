/* Kalyan -- page titles / descriptions, shared by the browser (swadhyay-app.js) and the
   server-side renderer (server/lib/seo.js) so a page's <title> is identical whether it was
   served as HTML to a crawler or set by the app after a client-side navigation.
   Pure functions only: they take plain objects (a book / person with the same field names
   used throughout the app) and return strings. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SwadhyayMeta = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BRAND = "Kalyan | कल्याण";
  var TAGLINE_EN = "Read free online on Kalyan.";
  var TAGLINE_HI = "कल्याण पर निःशुल्क ऑनलाइन पढ़ें।";

  /* Whoever the book credits first: author, else commentator, else translator. */
  function credited(book) {
    if (book.authors && book.authors.length) return book.authors;
    if (book.tikakars && book.tikakars.length) return book.tikakars;
    return book.translators || [];
  }

  /* "Kalyan | कल्याण — <book> | <publisher> | <author> | <chapter>" -- every part after
     the book name is left out when the book (or page) doesn't have one. */
  function bookTitle(book, chapterLabel) {
    var parts = [BRAND + " — " + book.title];
    if (book.publisher) parts.push(book.publisher);
    var who = credited(book);
    if (who.length) parts.push(who.join(", "));
    if (chapterLabel) parts.push(chapterLabel);
    return parts.join(" | ");
  }

  function bookDescription(book, chapterLabel) {
    var who = credited(book);
    var s = (chapterLabel ? chapterLabel + " — " : "") + book.title +
      (who.length ? " — " + who.join(", ") : "") +
      (book.publisher ? " (" + book.publisher + ")" : "") + ". ";
    return s + TAGLINE_HI + " " + TAGLINE_EN;
  }

  function categoryTitle(cat) {
    return BRAND + " — " + cat.hi + " (" + cat.en + ") ग्रंथ | Hindu Scriptures Library";
  }
  function categoryDescription(cat, count) {
    return cat.hi + " (" + cat.en + ") — " + count + " ग्रंथ / " + count + " books. " +
      "गीता प्रेस एवं श्री रामकृष्ण मठ के ग्रंथ निःशुल्क ऑनलाइन पढ़ें। " + TAGLINE_EN;
  }

  var ROLE_HI = { authors: "लेखक", tikakars: "टीकाकार", translators: "अनुवादक", publishers: "प्रकाशक" };
  var ROLE_ORDER = ["authors", "tikakars", "translators", "publishers"];
  function rolesSummary(person) {
    return ROLE_ORDER.filter(function (k) { return person.roles[k] && person.roles[k].length; })
      .map(function (k) { return ROLE_HI[k]; }).join(", ");
  }
  function personBookCount(person) {
    var seen = {}, n = 0;
    ROLE_ORDER.forEach(function (k) {
      (person.roles[k] || []).forEach(function (b) {
        var key = typeof b === "string" ? b : (b.slug || b.file);
        if (!seen[key]) { seen[key] = 1; n++; }
      });
    });
    return n;
  }
  function personTitle(person) {
    return BRAND + " — " + person.name + " | " + rolesSummary(person) + " के ग्रंथ";
  }
  function personDescription(person) {
    return person.name + " (" + rolesSummary(person) + ") — " + personBookCount(person) +
      " ग्रंथ कल्याण पर निःशुल्क पढ़ें। " + TAGLINE_EN;
  }

  /* Pages with a fixed title/description, keyed by their first URL segment. */
  var STATIC_ROUTES = {
    library: {
      title: BRAND + " — पुस्तकालय | Library of Hindu Scriptures",
      desc: "गीता, उपनिषद्, पुराण, वेद, स्तोत्र, भजन एवं प्रवचन — गीता प्रेस के सैकड़ों ग्रंथ एक ही पुस्तकालय में। Browse hundreds of Hindu scriptures: Gita, Upanishads, Puranas, Vedas, Stotras and Bhajans."
    },
    authors: {
      title: BRAND + " — लेखक, टीकाकार एवं अनुवादक | Authors, Commentators & Translators",
      desc: "ग्रंथकार, टीकाकार, अनुवादक एवं प्रकाशक — और उनके ग्रंथ। Authors, commentators, translators and publishers of the scriptures in the Kalyan library."
    },
    panchang: {
      title: BRAND + " — पंचांग | Hindu Panchang, Tithi & Festivals",
      desc: "आज की तिथि, नक्षत्र, योग, करण एवं पर्व-त्योहार। Today's Hindu Panchang: tithi, nakshatra, yoga, karana and festivals."
    },
    help: {
      title: BRAND + " — सहायता | Help",
      desc: "कल्याण पुस्तकालय का उपयोग कैसे करें। How to use the Kalyan digital library."
    },
    feedback: {
      title: BRAND + " — विषय सुधार | Feedback",
      desc: "ग्रंथों में त्रुटि बताएँ या सुझाव दें। Report an error in a text or send feedback."
    },
    audio: {
      title: BRAND + " — ऑडियो | Bhajan, Satsang, Pravachan, Katha & Audio Books",
      desc: "भजन, सत्संग, प्रवचन, कथा एवं ऑडियो बुक — कल्याण में सुनें। Listen to bhajans, satsang, pravachan, katha and audio books on Kalyan."
    },
    hanuman: {
      title: BRAND + " — श्री हनुमान प्रश्नावली यन्त्र | Hanuman Prashnavali",
      desc: "श्री हनुमान प्रश्नावली यन्त्र — ४९ अंकों में प्रश्नों के उत्तर। जप करें, प्रश्न सोचें और अपना अंक पाएँ। Shri Hanuman Prashnavali Yantra: 49 numbered answers as an interactive game."
    },
    vrat: {
      title: BRAND + " — व्रत एवं पर्व | Hindu Vrats, Festivals & Ekadashi",
      desc: "सभी व्रत, पर्व और एकादशी — तिथि, मास, पूजा-विधान, कथा और शास्त्रीय सन्दर्भ। Hindu vrats, festivals and Ekadashis with tithi, rituals, stories and scriptural references."
    },
    sankalp: {
      title: BRAND + " — श्रीरामचरितमानस पाठ-संकल्प | Ramcharitmanas Path Sankalp",
      desc: "मासिक, नवाह्न और अखण्ड श्रीरामचरितमानस पाठ — विधि, समय-सारणी, दैनिक स्मरण और प्रगति। Monthly, nine-day and akhand Ramcharitmanas path: vidhi, schedule, daily reminders and progress."
    },
    gita: {
      title: BRAND + " — गीता LMS: प्रतिदिन 20 मिनट, श्रीमद्भगवद्गीता सीखें | Daily Gita Study",
      desc: "प्रतिदिन 20 मिनट, रोज़ 2 श्लोक, सरल हिंदी अर्थ और हर 20 श्लोक पर पुनरावृत्ति — संकल्प, रिमाइंडर और प्रगति के साथ श्रीमद्भगवद्गीता का पूरा अध्ययन। A 20-minutes-a-day course through the whole Bhagavad Gita: 2 shlokas a day, revision after every 20, with a pledge, reminders and progress."
    },
    shalaka: {
      title: BRAND + " — श्रीरामशलाका-प्रश्नावली | Ram Shalaka Prashnavali",
      desc: "श्रीरामचरितमानस की श्रीरामशलाका-प्रश्नावली — ध्यान करें, कोष्ठक चुनें और चौपाई से उत्तर पाएँ। Shri Ram Shalaka Prashnavali of the Ramcharitmanas as an interactive game."
    },
    chat: {
      title: BRAND + " — प्रश्नोत्तर | Ask the Granths",
      desc: "ग्रंथों के आधार पर प्रश्न पूछें। Ask questions answered from the scriptures in the Kalyan library."
    }
  };

  return {
    BRAND: BRAND, TAGLINE_HI: TAGLINE_HI, TAGLINE_EN: TAGLINE_EN,
    credited: credited, bookTitle: bookTitle, bookDescription: bookDescription,
    categoryTitle: categoryTitle, categoryDescription: categoryDescription,
    rolesSummary: rolesSummary, personBookCount: personBookCount,
    personTitle: personTitle, personDescription: personDescription,
    STATIC_ROUTES: STATIC_ROUTES
  };
});

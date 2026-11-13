/* Stotra format: one stotra <-> the HTML of its library book.

   A stotra is stored as an ordinary book (so the library, reader, search, progress and the admin's chapter editor all
   work on it) whose HTML follows a fixed pattern. This file builds that HTML from a structured stotra and reads it back.
   The stotra viewer (/stotra/<slug>) and the admin's stotra form both use it; it also runs under Node (server, tools).

   A stotra object:
     { title, invocation, subtitle, publisher, audio (path or https address of the recording; kept in a <meta name="stotra-audio">),
       intro:  [ { title, text } ]                         text: paragraphs separated by a blank line / new line
       verses: [ { label (optional), lines: [..], pad: [[word, meaning], ..], bhav: "text" } ]
       closing }

   The book is ONE page: title, introduction, every verse, closing line (no "श्लोक N" headings; a verse may carry a label
   such as फलश्रुति, class stotra-vlabel). Its "Start reading" opens the stotra viewer. Paragraph classes (all <p>, so the reader's अर्थ hide button works on them):
     Shlok  (data-verse="n")        the Sanskrit verse, lines joined with <br>
     stotra-arth-label              "पद-विच्छेद एवं शब्दार्थ:"
     stotra-arth-pad                one word and its meaning:  <b class="stotra-w">word</b> <span class="stotra-br">(a + b)</span> <span class="stotra-eq">=</span> meaning
                                    a verse word (or phrase) with the meaning of its parts joined; the optional word break is in the stotra-br span and
                                    data-t="first-last" gives the index of the verse words it covers (the tap-a-word tooltip of the viewer);
                                    pad rows are [word, meaning, wordBreak, "first-last"], the last two optional
     stotra-arth-bhav               the meaning (bhavartha) of the verse
   The catalogue entry of such a book carries  "swith_arth": "yes", "arth_hide": "stotra-arth*"  (ARTH_HIDE below).      */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SwadhyayStotraFormat = factory();
})(this, function () {
  "use strict";

  var PAD_LABEL = "पद-विच्छेद एवं शब्दार्थ:";
  var ARTH_HIDE = "stotra-arth*";
  var PAGE_BREAK = '<hr class="page-break">';
  var LIBRARY_CATEGORY = "Stotra evam Naamavali";

  /* the built-in stotra categories (the admin can replace the list: Stotras -> Categories) */
  var CATEGORIES = [
    { key: "guru", hi: "गुरु", en: "Guru", icon: "🙏" },
    { key: "ganesha", hi: "गणेश", en: "Ganesha", icon: "🐘" },
    { key: "shiva", hi: "शिव", en: "Shiva", icon: "🔱" },
    { key: "vishnu", hi: "विष्णु", en: "Vishnu", icon: "🪷" },
    { key: "ram", hi: "राम", en: "Ram", icon: "🏹" },
    { key: "krishna", hi: "कृष्ण", en: "Krishna", icon: "🦚" },
    { key: "devi", hi: "देवी", en: "Devi", icon: "🌺" },
    { key: "surya", hi: "सूर्य", en: "Surya", icon: "☀️" },
    { key: "hanuman", hi: "हनुमान", en: "Hanuman", icon: "🚩" },
    { key: "navagraha", hi: "नवग्रह", en: "Navagraha", icon: "🪐" },
    { key: "tirtha", hi: "नदी एवं तीर्थ", en: "Rivers & Tirthas", icon: "🌊" },
    { key: "other", hi: "अन्य", en: "Other", icon: "📿" }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  /* "¦" inside a line of a verse marks where a long compound may be cut on a phone: it becomes a hidden break whose "-" (end of the first
     line, start of the second) only shows below 700 px (swadhyay.css .st-hy); on a wide screen the word stays whole. */
  var HY = '<span class="st-hy"><span class="st-hy-e"></span><span class="st-hy-b"></span><span class="st-hy-s"></span></span>';
  function lineHtml(s) { return esc(s).split("¦").join(HY); }
  function unesc(s) {
    return String(s).replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  }
  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }
  function splitLines(v) {
    var arr = Array.isArray(v) ? v : String(v == null ? "" : v).split(/\r?\n/);
    return arr.map(trim).filter(Boolean);
  }
  function paragraphs(text) { return splitLines(text); }

  /* "word = meaning" lines -> [[word, meaning]]; a line without "=" is a word with no meaning yet */
  function parsePadText(text) {
    return splitLines(text).map(function (ln) {
      var i = ln.indexOf("=");
      return i < 0 ? [trim(ln), ""] : [trim(ln.slice(0, i)), trim(ln.slice(i + 1))];
    }).filter(function (p) { return p[0] || p[1]; });
  }
  function padText(pad) { return (pad || []).map(function (p) { return p[0] + " = " + p[1]; }).join("\n"); }

  /* long one-word titles and where they may be cut ("¦"): the stotra viewer, the book page (cut in two on a phone) and the cards (cut only if the title
     does not fit, with a soft hyphen) all take it from here */
  var SOFT_TITLES = {
    "श्रीदत्तात्रेयापराधक्षमापणस्तोत्रम् २": "श्रीदत्तात्रेयापराध¦क्षमापणस्तोत्रम् २",
    "श्रीगणेशापराधक्षमापणस्तोत्रम्": "श्रीगणेशापराध¦क्षमापणस्तोत्रम्",
    "श्रीगणेशभुजङ्गप्रयातस्तोत्रम्": "श्रीगणेशभुजङ्ग¦प्रयातस्तोत्रम्"
  };
  function hyTitle(t) { return SOFT_TITLES[t] || null; }
  function softTitle(t) { var h = SOFT_TITLES[t]; return h ? esc(h).split("¦").join("&shy;") : esc(t); }

  function digits(n) { return String(n).replace(/\d/g, function (d) { return "०१२३४५६७८९".charAt(+d); }); }

  /* ------------------------------------------------------------------ build */
  function p(cls, inner, attrs) { return '\t\t\t<p' + (attrs || "") + ' class="' + cls + '">' + inner + "</p>\n"; }

  function audioPath(v) { var a = trim(v); return /^(https:\/\/\S+|\/\S+|assets\/\S+)$/.test(a) ? a : ""; }

  /* the whole stotra is ONE page of the book: title, introduction, every verse, the closing line */
  function buildHtml(st) {
    var title = trim(String(st.title || "").split("¦").join("")) || "स्तोत्र";
    /* a "¦" in the title (or the title's titleHy twin, as parseHtml returns it) marks where it may be cut in two on a phone */
    var hy = trim(st.titleHy || st.title || "");
    if (hy.split("¦").join("") !== title) hy = title;
    var h = "";
    if (trim(st.invocation)) h += p("cover-Shri-Hari", esc(trim(st.invocation)));
    h += p("cover-Book-Name", lineHtml(hy));
    if (trim(st.subtitle)) h += p("cover-subtitle", esc(trim(st.subtitle)));
    if (trim(st.publisher)) h += p("cover-Publisher-Note", esc(trim(st.publisher)));

    (st.intro || []).forEach(function (sec) {
      var paras = paragraphs(sec.text);
      if (trim(sec.title)) h += p("Sub-Heading", esc(trim(sec.title)));
      paras.forEach(function (x) { h += p("Normal", esc(x)); });
    });

    var verses = st.verses || [];
    verses.forEach(function (v, i) {
      var lines = splitLines(v.lines != null ? v.lines : v.text);
      if (trim(v.label)) h += p("stotra-vlabel", esc(trim(v.label)));
      /* four lines = two half-verses: the two lines of a half share a row when they fit (styles .st-pr/.st-ln); the newline between them keeps the parse below one line each */
      var shl = lines.length === 4
        ? [0, 2].map(function (k) { return '<span class="st-pr"><span class="st-ln">' + lineHtml(lines[k]) + '</span>\n<span class="st-ln">' + lineHtml(lines[k + 1]) + '</span></span>'; }).join("<br>")
        : lines.map(lineHtml).join("<br>");
      h += p("Shlok", shl, ' data-verse="' + (i + 1) + '"');
      var pad = (v.pad || []).filter(function (x) { return x && (trim(x[0]) || trim(x[1])); });
      if (pad.length) {
        h += p("stotra-arth-label", esc(PAD_LABEL));
        pad.forEach(function (x) {
          var brk = trim(x[2]), span = /^\d+-\d+$/.test(trim(x[3])) ? trim(x[3]) : "";
          h += p("stotra-arth-pad", '<b class="stotra-w">' + esc(trim(x[0])) + '</b>' + (brk ? ' <span class="stotra-br">(' + esc(brk) + ')</span>' : "") +
            ' <span class="stotra-eq">=</span> ' + esc(trim(x[1])), span ? ' data-t="' + span + '"' : "");
        });
      }
      paragraphs(v.bhav).forEach(function (x) { h += p("stotra-arth-bhav", esc(x)); });
    });
    var closing = splitLines(st.closing).map(esc).join("<br>");
    if (closing) h += p("Chapter-End-Text", closing);
    var page = '<section class="epub-page" data-page="1">\n<div class="Basic-Graphics-Frame">\n' + h + "\t\t</div>\n</section>";

    var audio = audioPath(st.audio);
    var prefix = '<!DOCTYPE html>\n<html lang="hi">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' +
      esc(title) + '</title>\n' + (audio ? '<meta name="stotra-audio" content="' + esc(audio) + '">\n' : "") + '<link rel="stylesheet" href="../../master.css">\n</head>\n\n<body>';
    var suffix = "</body>\n</html>";
    return { prefix: prefix, chapters: [page], suffix: suffix, html: prefix + "\n\n" + page + "\n\n" + suffix };
  }

  /* ------------------------------------------------------------------ parse */
  function paraList(chapterHtml) {
    var out = [], re = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi, m;
    while ((m = re.exec(chapterHtml))) {
      var cm = m[1].match(/class=["']([^"']*)["']/i);
      var vm = m[1].match(/data-verse=["'](\d+)["']/i), tm = m[1].match(/data-t=["'](\d+-\d+)["']/i);
      out.push({ cls: cm ? cm[1].split(/\s+/) : [], verse: vm ? +vm[1] : 0, span: tm ? tm[1] : "", inner: m[2] });
    }
    return out;
  }
  function plain(inner) { return trim(unesc(String(inner).replace(/<span class="st-hy">(?:<span[^>]*><\/span>){3}<\/span>/g, "¦").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ")); }
  function has(par, c) { return par.cls.indexOf(c) !== -1; }
  // an older build gave every verse a heading "श्लोक ९ (फलश्रुति)": only a real name ("फलश्रुति") is a label now
  function cleanLabel(t) {
    var m = trim(t).match(/^श्लोक\s*[0-9०-९]*\s*(?:\(([^)]*)\))?$/);
    return m ? trim(m[1] || "") : trim(t);
  }

  /* the stotra the HTML of a book holds (null when it has no title or verse). Tolerant of hand edits in the admin's chapter editor. */
  function parseHtml(html) {
    html = String(html || "");
    var open = html.match(/<body[^>]*>/i);
    var head = open ? html.slice(0, open.index) : "";
    var body = open ? html.slice(open.index + open[0].length) : html;
    var close = body.toLowerCase().lastIndexOf("</body>");
    if (close !== -1) body = body.slice(0, close);
    var st = { title: "", invocation: "", subtitle: "", publisher: "", audio: "", intro: [], verses: [], closing: "" };
    var am = head.match(/<meta\s+name=["']stotra-audio["']\s+content=["']([^"']*)["']/i);
    if (am) st.audio = unesc(am[1]);
    var head1 = null, label = "", sec = null;
    paraList(body).forEach(function (par) {
      var text = plain(par.inner);
      if (has(par, "cover-Shri-Hari")) { st.invocation = text; return; }
      if (has(par, "cover-Book-Name")) { st.title = text.split("¦").join(""); if (text.indexOf("¦") !== -1) st.titleHy = text; return; }
      if (has(par, "cover-subtitle")) { st.subtitle = st.subtitle ? st.subtitle + " — " + text : text; return; }
      if (has(par, "cover-Publisher-Note")) { st.publisher = text; return; }
      if (has(par, "Chapter-End-Text")) { st.closing = text; return; }
      if (has(par, "Page-Break")) return;
      if (has(par, "stotra-vlabel")) { label = text; return; }
      if (has(par, "Heading") || has(par, "Sub-Heading")) { head1 = text; sec = null; return; }
      if (has(par, "Shlok") && par.verse) {
        st.verses.push({ label: label || (head1 ? cleanLabel(head1) : ""), lines: text.split(/\n/).map(trim).filter(Boolean), pad: [], bhav: [] });
        label = ""; head1 = null; sec = null; return;
      }
      var cur = st.verses[st.verses.length - 1];
      if (has(par, "stotra-arth-label")) return;
      if (has(par, "stotra-arth-pad") && cur) {
        var wm = par.inner.match(/<b[^>]*class=["'][^"']*stotra-w[^"']*["'][^>]*>([\s\S]*?)<\/b>\s*(?:<span[^>]*class=["']stotra-br["'][^>]*>\(([^)]*)\)<\/span>)?\s*(?:<span[^>]*>=<\/span>)?\s*([\s\S]*)$/i);
        if (wm) cur.pad.push(par.span ? [plain(wm[1]), plain(wm[3]), plain(wm[2] || ""), par.span] : [plain(wm[1]), plain(wm[3])]);
        else { var i = text.indexOf("="); cur.pad.push(i < 0 ? [text, ""] : [trim(text.slice(0, i)), trim(text.slice(i + 1))]); }
        return;
      }
      if (has(par, "stotra-arth-bhav") && cur) { cur.bhav.push(text); return; }
      if (!st.verses.length && text) {                       // before the first verse: introduction paragraphs
        if (!sec) { sec = { title: head1 || "", paras: [] }; st.intro.push(sec); head1 = null; }
        sec.paras.push(text);
      }
    });
    st.verses.forEach(function (v) { v.bhav = v.bhav.join("\n"); });
    st.intro = st.intro.map(function (s) { return { title: s.title, text: s.paras.join("\n") }; });
    return st.title || st.verses.length ? st : null;
  }

  return { PAD_LABEL: PAD_LABEL, ARTH_HIDE: ARTH_HIDE, LIBRARY_CATEGORY: LIBRARY_CATEGORY, CATEGORIES: CATEGORIES, buildHtml: buildHtml,
    parseHtml: parseHtml, parsePadText: parsePadText, padText: padText, digits: digits, esc: esc, lineHtml: lineHtml, hyTitle: hyTitle, softTitle: softTitle };
});

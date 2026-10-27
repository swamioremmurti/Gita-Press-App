/* Footnotes in the reader: tap the reference mark (the "*", "[१]", "(१)" ...) and the note opens in a modal, instead of sitting
   under the paragraph.

   The reader runs readerInlineScript inside the book's iframe, which calls SwadhyayFootnotes.init(document) on that page. Here:
     1. Footnote paragraphs are the <p> whose class starts Footnote / Footnotes / Foot-note / Futnote / Futnoot (Footnotes-Bold,
        Footnotes-Right ...). Footnote paragraphs that directly follow each other make a block.
     2. A block is cut into notes at every paragraph that starts with a marker -- "*", "**", "[१]", "(१)", "१." or "१)"; a paragraph
        without a marker belongs to the note before it ("स बुद्धिमान्...", "(गीता ४। १८)").
     3. For each note the same mark is looked for in the paragraphs just before it (up to 80 back): a <sup> holding it, or the mark in
        the text. Found: the mark becomes a link (a.fn-ref), the note's paragraphs are hidden. Not found: the note is left as it was.
     4. A tap (or Enter) on a link opens the modal; the backdrop, the close button and Esc close it.
   The modal lives in the iframe's <html> (not <body>: the night and sepia themes put a filter on <body>, which would turn a fixed
   box inside it into one as tall as the page) and follows the reader's theme through a class. */
(function () {
  "use strict";

  var FN_CLASS = /^(?:foot-?note|futnoo?te?|xfootnote)/i;
  var LOOK_BACK = 80;
  var MARK_RE = /^\s*(\*{1,4}|\[\s*([०-९0-9]+)\s*\]|\(\s*([०-९0-9]+)\s*\)|([०-९0-9]+)\s*[.)])/;
  var DEV = "०१२३४५६७८९";

  function num(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) { var k = DEV.indexOf(s.charAt(i)); out += k >= 0 ? String(k) : s.charAt(i); }
    return parseInt(out, 10);
  }

  function isFn(el) {
    if (!el || el.tagName !== "P") return false;
    for (var i = 0; i < el.classList.length; i++) if (FN_CLASS.test(el.classList[i])) return true;
    return false;
  }

  /* the marker a footnote paragraph starts with, as {key, stars|n} -- or null */
  function markerOf(p) {
    var t = (p.textContent || "").replace(/ /g, " ");
    var m = MARK_RE.exec(t);
    if (!m) return null;
    if (m[1].charAt(0) === "*") return { key: m[1], stars: m[1].length, passes: ["star"] };
    var d = m[2] || m[3] || m[4], bracketed = !!(m[2] || m[3]);
    // a note numbered "१." is cited by a raised digit; one numbered "(१)" / "[१]" by that mark in the text -- each falls back to the other
    return { key: "n" + num(d), n: num(d), passes: bracketed ? ["bracket", "digit"] : ["digit", "bracket"] };
  }

  function textNodes(root) {
    var out = [], w = root.ownerDocument.createTreeWalker(root, 4, null, false), n;
    while ((n = w.nextNode())) {
      for (var a = n.parentNode; a && a !== root; a = a.parentNode) if (a.classList && a.classList.contains("fn-ref")) { n = null; break; }
      if (n) out.push(n);
    }
    return out;
  }

  /* find the reference mark for `mk` inside paragraph `p`; returns the element to turn into the link, or null.
     pass "star"    : a run of exactly that many stars ("*", "**")
     pass "digit"   : the note's number as a raised digit -- a <sup>, a styled span holding only the digit, or a bare digit stuck to a
                      word ("बना ले२।", "हैं।१ खाल")
     pass "bracket" : "[१]" or "(१)" in the text (or in a <sup>) */
  var BARE_RE = /(?:([ऀ-ॣ॰-ॿ])([०-९0-9]{1,2})(?![०-९0-9]))|(?:([।॥])([०-९0-9]{1,2})(?![०-९0-9।॥]))/g;
  var BRACKET_RE = /\[\s*([०-९0-9]+)\s*\]|\(\s*([०-९0-9]+)\s*\)/g;

  function supRef(p, mk) {
    var sups = p.querySelectorAll("sup");                         // <sup>[१]</sup>, <sup>१</sup>
    for (var i = 0; i < sups.length; i++) {
      if (sups[i].classList.contains("fn-ref")) continue;
      var st = sups[i].textContent.replace(/[\[\]()\s.]/g, "");
      if (st !== "" && /^[०-९0-9]+$/.test(st) && num(st) === mk.n) return sups[i];
    }
    return null;
  }

  function findRef(doc, p, mk, pass) {
    var i, nodes, m;
    if (pass === "star") {
      nodes = textNodes(p);
      var re = /\*+/g;
      for (i = 0; i < nodes.length; i++) {
        re.lastIndex = 0;
        while ((m = re.exec(nodes[i].nodeValue))) {
          if (m[0].length === mk.stars) return wrap(doc, nodes[i], m.index, m.index + m[0].length);
        }
      }
      return null;
    }
    var sup = supRef(p, mk);
    if (sup) return sup;
    if (pass === "digit") {
      /* a styled span that holds only the number and sits straight after a word: the books' superscript digits are often
         <span class="char-style-override-N">२</span> (the book's own CSS raises them) */
      var spans = p.querySelectorAll("span");
      for (i = 0; i < spans.length; i++) {
        var sp = spans[i];
        if (sp.classList.contains("fn-ref") || sp.children.length) continue;
        var tx = sp.textContent.trim();
        if (!/^[०-९0-9]{1,2}$/.test(tx) || num(tx) !== mk.n) continue;
        /* the word before it may be plain text or a styled span of its own (<span>ऊकालो…प्लुतः</span><span>१</span>) */
        var before = sp.previousSibling;
        var tail = before ? (before.nodeType === 3 ? before.nodeValue : before.nodeType === 1 ? before.textContent : "") : "";
        if (!/[ऀ-ॣ॰-ॿ।॥’”;,:?!)\]]$/.test(tail)) continue;          // (a closing quote or a mark of punctuation may stand between the word and the number: "है;१")
        if (doc.defaultView.getComputedStyle(sp).verticalAlign !== "super") sp.classList.add("fn-sup");
        return sp;
      }
      /* a bare digit: straight after a Devanagari letter or vowel sign, or after a danda when no danda closes it ("।१ खाल");
         "॥ ४२॥" (a space before it) and "।४२।" (a verse number) are never taken for one */
      nodes = textNodes(p);
      for (i = 0; i < nodes.length; i++) {
        BARE_RE.lastIndex = 0;
        while ((m = BARE_RE.exec(nodes[i].nodeValue))) {
          var lead = (m[1] || m[3]).length, digits = m[2] || m[4];
          if (num(digits) !== mk.n) continue;
          var el = wrap(doc, nodes[i], m.index + lead, m.index + lead + digits.length);
          el.classList.add("fn-sup");
          return el;
        }
      }
      return null;
    }
    nodes = textNodes(p);                                         // pass "bracket"
    for (i = 0; i < nodes.length; i++) {
      BRACKET_RE.lastIndex = 0;
      while ((m = BRACKET_RE.exec(nodes[i].nodeValue))) {
        if (num(m[1] || m[2]) === mk.n) return wrap(doc, nodes[i], m.index, m.index + m[0].length);
      }
    }
    return null;
  }

  function wrap(doc, node, from, to) {
    var rg = doc.createRange();
    rg.setStart(node, from);
    rg.setEnd(node, to);
    var a = doc.createElement("a");
    rg.surroundContents(a);
    return a;
  }

  var CSS =
    ".fn-ref{color:#9a1f12;font-weight:bold;cursor:pointer;text-decoration:none;border-bottom:1px dotted currentColor;padding:0 .14em;border-radius:3px;}" +
    ".fn-ref.fn-sup{vertical-align:super;font-size:.78em;border-bottom:0;padding:0 .1em;}" +
    ".fn-ref, .fn-sup{color:darkblue !important;}" +
    ".fn-ref:hover{background:rgba(154,31,18,.1);}.fn-ref:focus-visible{outline:2px solid #c45911;outline-offset:1px;}" +
    ".fn-hidden{display:none !important;}" +
    ".fn-modal{position:fixed;left:0;top:0;right:0;bottom:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:14px;" +
    "background:rgba(25,12,6,.5);}" +
    ".fn-card{position:relative;box-sizing:border-box;width:100%;max-width:640px;max-height:78vh;overflow:auto;overscroll-behavior:contain;" +
    "background:#fffdf6;color:#2b120d;border:1px solid #e0c79d;border-radius:14px;box-shadow:0 18px 44px rgba(0,0,0,.4);padding:2.4rem 1.1rem 1.1rem;}" +
    ".fn-title{position:absolute;left:1.1rem;top:.7rem;font-size:.9rem !important;font-weight:bold;color:#8f1a12;letter-spacing:.02em;}" +
    ".fn-x{position:absolute;right:.5rem;top:.4rem;width:2.2rem;height:2.2rem;border:0;border-radius:50%;background:transparent;color:#5b3a2c;" +
    "font-size:1.15rem !important;line-height:1 !important;cursor:pointer;}.fn-x:hover{background:rgba(0,0,0,.08);}" +
    ".fn-body p{margin:.45rem 0 !important;padding:0 !important;border:0 !important;background:transparent !important;box-shadow:none !important;" +
    "text-indent:0 !important;line-height:1.55 !important;}" +
    ".fn-sepia .fn-card{background:#f4ecd8;border-color:#d9c9a3;}" +
    ".fn-night .fn-card{background:#1f1c19;color:#eadfcc;border-color:#4a4036;}.fn-night .fn-body *,.fn-night .fn-x{color:#eadfcc !important;}" +
    ".fn-night .fn-title{color:#f0b9a8;}";

  function ensureStyle(doc) {
    if (doc.getElementById("fn-css")) return;
    var st = doc.createElement("style");
    st.id = "fn-css";
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  /* ---------------------------------------------------------------- the modal ---- */
  var current = null;                                              // { doc, modal, ref, prevOverflow }

  function close() {
    if (!current) return;
    var c = current;
    current = null;
    try { c.doc.removeEventListener("keydown", c.onKey, true); } catch (e) {}
    if (c.modal.parentNode) c.modal.parentNode.removeChild(c.modal);
    c.doc.documentElement.style.overflow = c.prevOverflow;
    try { if (c.ref) c.ref.focus({ preventScroll: true }); } catch (e) {}
  }

  function open(doc, note, ref) {
    close();
    ensureStyle(doc);
    var theme = doc.body.classList.contains("rdr-night") ? " fn-night" : doc.body.classList.contains("rdr-sepia") ? " fn-sepia" : "";
    var modal = doc.createElement("div");
    modal.className = "fn-modal" + theme;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "टिप्पणी");
    var card = doc.createElement("div");
    card.className = "fn-card";
    card.style.fontSize = doc.defaultView.getComputedStyle(doc.body).fontSize;      // the reader's font size setting, as on the page
    var title = doc.createElement("div");
    title.className = "fn-title";
    title.textContent = "टिप्पणी";
    var x = doc.createElement("button");
    x.type = "button";
    x.className = "fn-x";
    x.setAttribute("aria-label", "बंद करें");
    x.textContent = "✕";
    var body = doc.createElement("div");
    body.className = "fn-body";
    note.paras.forEach(function (p) {
      var c = p.cloneNode(true);
      c.classList.remove("fn-hidden");
      c.removeAttribute("data-fn-note");
      var withId = c.querySelectorAll("[id]");
      for (var i = 0; i < withId.length; i++) withId[i].removeAttribute("id");
      if (c.id) c.removeAttribute("id");
      body.appendChild(c);
    });
    card.appendChild(title);
    card.appendChild(x);
    card.appendChild(body);
    modal.appendChild(card);
    doc.documentElement.appendChild(modal);
    var prev = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = "hidden";
    var onKey = function (e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
    doc.addEventListener("keydown", onKey, true);
    modal.addEventListener("mousedown", function (e) { if (e.target === modal) close(); });
    x.addEventListener("click", close);
    ["touchstart", "touchend", "mouseup"].forEach(function (t) {              // the page behind keeps its swipe / selection handlers
      modal.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
    current = { doc: doc, modal: modal, ref: ref, prevOverflow: prev, onKey: onKey };
    try { x.focus({ preventScroll: true }); } catch (e) {}
  }

  /* look for the reference of note group `g` (a block starting at paras[first]) in the paragraphs before it; make it a link */
  function link(doc, paras, first, g, seqNo) {
    for (var ps = 0; ps < g.mk.passes.length; ps++) {
      for (var j = first - 1, steps = 0; j >= 0 && steps < LOOK_BACK; j--) {
        if (isFn(paras[j])) continue;
        steps++;
        var el = findRef(doc, paras[j], g.mk, g.mk.passes[ps]);
        if (!el) continue;
        var id = "fn" + seqNo;
        el.classList.add("fn-ref");
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", "टिप्पणी देखें");
        el.setAttribute("data-fn", id);
        return id;
      }
    }
    return null;
  }

  /* ----------------------------------------------------------------- the page ---- */
  function init(doc) {
    if (!doc || !doc.body || doc.__fnInit) return;
    doc.__fnInit = true;
    var paras = Array.prototype.slice.call(doc.body.querySelectorAll("p"));
    if (!paras.some(isFn)) return;
    var notes = {}, seq = 0, claimedAny = false;
    var i = 0;
    while (i < paras.length) {
      if (!isFn(paras[i])) { i++; continue; }
      var first = i, block = [paras[i]];                          // a block: footnote paragraphs that directly follow each other
      while (i + 1 < paras.length && isFn(paras[i + 1]) && paras[i].nextElementSibling === paras[i + 1]) { i++; block.push(paras[i]); }
      i++;
      var groups = [];                                            // the notes of the block
      block.forEach(function (p) {
        var mk = markerOf(p);
        if (mk) groups.push({ mk: mk, paras: [p] });
        else if (groups.length) groups[groups.length - 1].paras.push(p);
      });
      var last = null;                                            // the note just matched in this block
      groups.forEach(function (g) {
        var id = link(doc, paras, first, g, ++seq);
        if (id) {
          notes[id] = { paras: g.paras.slice() };
          g.paras.forEach(function (p) { p.classList.add("fn-hidden"); p.setAttribute("data-fn-note", id); });
          last = notes[id];
          last.id = id;
          claimedAny = true;
        } else if (last && g.mk.n >= 2) {
          /* a numbered item ("२.", "३." ...) that nothing in the text points to is a further item of the note before it
             (a footnote that quotes several verses: "* ..." then "२. ..." "३. ..."): it joins that note and opens with it */
          g.paras.forEach(function (p) { last.paras.push(p); p.classList.add("fn-hidden"); p.setAttribute("data-fn-note", last.id); });
        } else {
          last = null;
        }
      });
    }
    if (!claimedAny) return;
    ensureStyle(doc);
    doc.__fnNotes = notes;
    doc.addEventListener("click", function (e) {
      var r = e.target && e.target.closest ? e.target.closest(".fn-ref") : null;
      if (!r || !notes[r.getAttribute("data-fn")]) return;
      e.preventDefault();
      e.stopPropagation();
      open(doc, notes[r.getAttribute("data-fn")], r);
    }, true);
    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var r = e.target && e.target.closest ? e.target.closest(".fn-ref") : null;
      if (!r || !notes[r.getAttribute("data-fn")]) return;
      e.preventDefault();
      open(doc, notes[r.getAttribute("data-fn")], r);
    });
  }

  /* a hit of the reader's in-book search that sits inside a folded note opens that note */
  function revealFor(el) {
    if (!el || !el.closest) return false;
    var holder = el.closest("[data-fn-note]");
    if (!holder) return false;
    var doc = el.ownerDocument, notes = doc.__fnNotes, id = holder.getAttribute("data-fn-note");
    if (!notes || !notes[id]) return false;
    var ref = doc.querySelector('.fn-ref[data-fn="' + id + '"]');
    open(doc, notes[id], ref);
    return true;
  }

  window.SwadhyayFootnotes = { init: init, revealFor: revealFor, close: close };
})();

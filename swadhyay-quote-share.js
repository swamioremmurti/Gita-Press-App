/* Share a quote as a picture: WhatsApp status / Instagram story, Instagram post, or a square.

   The picture is drawn on a <canvas> (no server, no libraries) in the site's fonts and colours,
   then handed to the phone's share sheet (Web Share API with a file) -- WhatsApp, Instagram and
   the rest appear there -- or saved / copied where sharing files is not available (desktop).

   Public API: window.SwadhyayQuoteShare.open(quote, { tx, toast })
   quote = { text, name, key, book: { title } }                                              */
(function () {
  "use strict";

  var FORMATS = [
    { key: "story",  label: "स्टेटस / स्टोरी", en: "Status / Story", ratio: "9:16", w: 1080, h: 1920 },
    { key: "post",   label: "Instagram पोस्ट", en: "Instagram post", ratio: "4:5",  w: 1080, h: 1350 },
    { key: "square", label: "वर्गाकार",        en: "Square",         ratio: "1:1",  w: 1080, h: 1080 }
  ];
  // one colour pair per saint, so each slide has its own look
  var PALETTE = {
    ramsukhdas: ["#d9822b", "#6f130c"],
    goyandka:   ["#2f7fd0", "#10306a"],
    poddar:     ["#8d55c7", "#35175c"],
    sharnanand: ["#2f9b63", "#0f4426"]
  };
  var FONT = '"Tiro Devanagari Sanskrit", "Noto Sans Devanagari", Georgia, serif';
  var LS_FMT = "swadhyay_qshare_fmt_v1";
  var helpers = { tx: null, toast: null };
  var state = null;       // { quote, fmt, canvas, el }

  function T(hi, en) { return helpers.tx ? helpers.tx(hi, en) : hi; }
  function toast(m) { if (helpers.toast) helpers.toast(m); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- drawing ---------------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      var test = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; } else cur = test;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // The background picture (compressed webp). Loaded once; the share picture falls back to a plain
  // warm gradient if it cannot be fetched.
  var BG_SRC = "assets/images/quote/quote-bg.webp", LOGO_SRC = "assets/images/quote/logo-mark.svg";
  var imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) imgCache[src] = new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
    return imgCache[src];
  }
  function loadBg() { return Promise.all([loadImg(BG_SRC), loadImg(LOGO_SRC)]); }

  // where things sit on each format (the arch is at the top, the river scene at the bottom)
  var LAYOUT = {
    story:  { logoY: 290, logoH: 124, label: 530, areaTop: 590, areaBottom: 1300, pillY: 1590 },
    post:   { logoY: 165, logoH: 108, label: 350, areaTop: 395, areaBottom: 1050, pillY: 1240 },
    square: { logoY: 125, logoH: 100, label: 295, areaTop: 335, areaBottom: 880,  pillY: 1000 }
  };
  var INK = "#4a120d", GOLD = "#a8590d";

  function draw(canvas, fmt, q, bg, logo) {
    var W = fmt.w, H = fmt.h, L = LAYOUT[fmt.key] || LAYOUT.post;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    var pal = PALETTE[q.key] || ["#c45911", "#6f130c"];

    if (bg) {                                             // fill the width, keep the top (the arch)
      var sc = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      ctx.drawImage(bg, (W - bg.naturalWidth * sc) / 2, 0, bg.naturalWidth * sc, bg.naturalHeight * sc);
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#fff3d6"); g.addColorStop(1, "#f0b36a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

    if (logo) {                                           // brand logo at the top
      var lw2 = Math.round(L.logoH * 543 / 329);
      ctx.drawImage(logo, (W - lw2) / 2, L.logoY, lw2, L.logoH);
    } else {
      ctx.fillStyle = INK; ctx.font = "bold " + Math.round(W * 0.06) + "px " + FONT;
      ctx.fillText("स्वाध्याय", W / 2, L.logoY + L.logoH * 0.8);
    }

    ctx.fillStyle = GOLD; ctx.font = Math.round(W * 0.036) + "px " + FONT;            // label
    ctx.fillText(T("आज का सुविचार", "Quote of the day"), W / 2, L.label);
    ctx.fillRect(W / 2 - 60, L.label + 26, 120, 3);

    // the saying, as large as fits
    var maxW = W * 0.74, markH = Math.round(W * 0.12), nameH = Math.round(W * 0.18);
    var maxTextH = L.areaBottom - L.areaTop - markH - nameH;
    var size = Math.round(W * 0.075), lines, lh;
    for (; size >= Math.round(W * 0.036); size -= 2) {
      ctx.font = size + "px " + FONT;
      lines = wrap(ctx, q.text, maxW); lh = size * 1.55;
      if (lines.length * lh <= maxTextH) break;
    }
    var textH = lines.length * lh, blockH = markH + textH + nameH;
    var top = L.areaTop + Math.max(0, (L.areaBottom - L.areaTop - blockH) / 2);

    ctx.fillStyle = "#c9822b"; ctx.font = "bold " + Math.round(W * 0.2) + "px Georgia, serif";
    ctx.fillText("“", W / 2, top + markH * 0.95);
    ctx.fillStyle = INK; ctx.font = size + "px " + FONT;
    lines.forEach(function (ln, i) { ctx.fillText(ln, W / 2, top + markH + lh * (i + 0.8)); });

    var y = top + markH + textH + Math.round(W * 0.02);    // who said it
    ctx.fillStyle = "rgba(168,89,13,.7)"; ctx.fillRect(W / 2 - 90, y, 180, 3);
    ctx.fillStyle = pal[1]; ctx.font = Math.round(W * 0.05) + "px " + FONT;
    ctx.fillText("— " + q.name, W / 2, y + Math.round(W * 0.085));
    if (q.book && q.book.title) {
      ctx.fillStyle = "rgba(74,18,13,.78)"; ctx.font = "italic " + Math.round(W * 0.038) + "px " + FONT;
      ctx.fillText(q.book.title, W / 2, y + Math.round(W * 0.14));
    }

    ctx.font = Math.round(W * 0.03) + "px Arial, sans-serif";
    var pw = Math.round(Math.max(W * 0.3, ctx.measureText(location.host).width + W * 0.1)), ph = Math.round(W * 0.085);   // web address on a soft cream pill
    var px = (W - pw) / 2, py = L.pillY - ph / 2;
    ctx.fillStyle = "rgba(255,248,232,.88)"; roundRect(ctx, px, py, pw, ph, ph / 2); ctx.fill();
    ctx.strokeStyle = "rgba(168,89,13,.45)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = INK; ctx.font = Math.round(W * 0.03) + "px Arial, sans-serif";
    ctx.fillText(location.host, W / 2, L.pillY + Math.round(W * 0.011));
  }
  /* ---------------- sharing ---------------- */
  function shareText(q) {
    return "“" + q.text + "”\n— " + q.name + (q.book ? " (" + q.book.title + ")" : "") + "\n\n" + T("स्वाध्याय पर और पढ़ें:", "Read more on Swadhyay:") + " " + location.origin;
  }
  function toFile(cb) {
    state.canvas.toBlob(function (b) {
      cb(b ? new File([b], "swadhyay-suvichar-" + state.fmt.key + ".png", { type: "image/png" }) : null);
    }, "image/png");
  }
  function download(file) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function shareNow() {
    toFile(function (file) {
      var text = shareText(state.quote);
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: T("आज का सुविचार", "Quote of the day"), text: text }).catch(function (e) {
          if (e && e.name !== "AbortError") { download(file); toast(T("इमेज सेव हो गई", "Image saved")); }
        });
      } else if (navigator.share) {
        navigator.share({ title: T("आज का सुविचार", "Quote of the day"), text: text }).catch(function () {});
      } else if (file) {
        download(file);
        toast(T("इमेज सेव हो गई — इसे WhatsApp / Instagram में जोड़ें", "Image saved — add it to WhatsApp / Instagram"));
      }
    });
  }
  /* ---------------- dialog ---------------- */
  function render() {
    var f = state.fmt;
    state.el.innerHTML =
      '<div class="qsh-scrim" data-qsh="close"></div>' +
      '<div class="qsh-card" role="dialog" aria-modal="true" aria-label="' + esc(T("सुविचार शेयर करें", "Share quote")) + '">' +
      '<button type="button" class="qsh-x" data-qsh="close" aria-label="' + esc(T("बंद करें", "Close")) + '">✕</button>' +
      '<h3 class="qsh-h">' + esc(T("सुविचार शेयर करें", "Share this quote")) + '</h3>' +
      '<div class="qsh-tabs" role="tablist">' + FORMATS.map(function (x) {
        return '<button type="button" role="tab" class="qsh-tab' + (x.key === f.key ? " is-active" : "") + '" data-qsh="fmt" data-fmt="' + x.key + '" aria-selected="' + (x.key === f.key) + '">' +
          esc(T(x.label, x.en)) + '<small>' + x.ratio + '</small></button>';
      }).join("") + '</div>' +
      '<div class="qsh-preview ratio-' + f.key + '"></div>' +
      '<div class="qsh-actions">' +
      '<button type="button" class="qsh-primary" data-qsh="share">' + esc(T("शेयर करें", "Share")) + '</button>' +
      '</div>' +
      '</div>';
    state.canvas = document.createElement("canvas");
    state.el.querySelector(".qsh-preview").appendChild(state.canvas);
    var fontsReady = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load("40px 'Tiro Devanagari Sanskrit'", "स्वाध्याय"), document.fonts.load("italic 40px 'Tiro Devanagari Sanskrit'", "स्वाध्याय")]).catch(function () {})
      : Promise.resolve();
    Promise.all([fontsReady, loadBg()]).then(function (r) { if (state && state.canvas) draw(state.canvas, state.fmt, state.quote, r[1][0], r[1][1]); });
  }

  function close() {
    if (!state) return;
    state.el.remove();
    document.body.classList.remove("qsh-open");
    document.removeEventListener("keydown", onKey);
    state = null;
  }
  function onKey(e) { if (e.key === "Escape") close(); }
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-qsh]") : null;
    if (!b || !state) return;
    var a = b.getAttribute("data-qsh");
    if (a === "close") close();
    else if (a === "fmt") {
      state.fmt = FORMATS.filter(function (x) { return x.key === b.getAttribute("data-fmt"); })[0];
      try { localStorage.setItem(LS_FMT, state.fmt.key); } catch (er) {}
      render();
    }
    else if (a === "share") shareNow();
  }

  window.SwadhyayQuoteShare = {
    open: function (quote, h) {
      if (!quote || !quote.text) return;
      if (h) { helpers.tx = h.tx || helpers.tx; helpers.toast = h.toast || helpers.toast; }
      close();
      var saved = null;
      try { saved = localStorage.getItem(LS_FMT); } catch (e) {}
      var fmt = FORMATS.filter(function (x) { return x.key === saved; })[0] || FORMATS[0];
      var el = document.createElement("div");
      el.className = "qsh";
      el.addEventListener("click", onClick);
      document.body.appendChild(el);
      document.body.classList.add("qsh-open");
      document.addEventListener("keydown", onKey);
      state = { quote: quote, fmt: fmt, canvas: null, el: el };
      render();
    }
  };
})();

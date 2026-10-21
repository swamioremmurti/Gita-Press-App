/* Verse lines that never break in two (reader).

   The Ramcharitmanas lays its verses out in columns (master.css: p.Shlok.cp chaupai halves, p.cph chhands, p.vs doha / sortha / shloka
   blocks) and sets every cell on one line (white-space: nowrap). A column is wide enough for 99.5 % of the lines; this makes the rest fit
   too: a line or block whose text is wider than its cell gets its type shrunk by the ratio that makes it fit, the same ratio for all the cells
   of that paragraph so its lines stay alike (the text is wrapped in span.vf with a smaller font-size, which leaves the column widths alone).

   If that would take the type below MIN of its size (a very narrow screen) the shrinking stops there and the paragraph is marked vf-wrap: its
   cells may wrap, and master.css aligns them on their last baseline so the । / ॥ stays beside the last word, not above it.

   The reader calls SwadhyayVerseFit.init(document) from the script it runs inside the book's iframe. It measures again when the window is
   resized and once the fonts have loaded (the widths depend on them). */
(function () {
  "use strict";

  var MIN = 0.6;
  var GROUPS = [
    { block: "p.cp", cells: ".cp-a, .cp-b" },
    { block: "p.cph", cells: ".cph-a, .cph-b" },
    { block: "p.vs", cells: ".vs-t" }
  ];

  function unfit(doc) {
    var spans = doc.querySelectorAll("span.vf");
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i], parent = s.parentNode;
      while (s.firstChild) parent.insertBefore(s.firstChild, s);
      parent.removeChild(s);
      parent.normalize();
    }
    var marked = doc.querySelectorAll("p.vf-wrap");
    for (var j = 0; j < marked.length; j++) marked[j].classList.remove("vf-wrap");
  }

  function fit(doc) {
    unfit(doc);
    var jobs = [];
    GROUPS.forEach(function (g) {                       // read everything first, write afterwards: one layout, not one per line
      var blocks = doc.querySelectorAll(g.block);
      for (var i = 0; i < blocks.length; i++) {
        var cells = blocks[i].querySelectorAll(g.cells), need = 1;
        for (var k = 0; k < cells.length; k++) {
          var w = cells[k].clientWidth;
          if (w > 0 && cells[k].scrollWidth > w + 0.5) need = Math.max(need, cells[k].scrollWidth / w);
        }
        if (need > 1) jobs.push({ p: blocks[i], cells: cells, ratio: 1 / need * 0.985 });
      }
    });
    jobs.forEach(function (j) {
      var ratio = j.ratio;
      if (ratio < MIN) { ratio = MIN; j.p.classList.add("vf-wrap"); }
      for (var k = 0; k < j.cells.length; k++) {
        var cell = j.cells[k], span = doc.createElement("span");
        span.className = "vf";
        span.style.fontSize = (ratio * 100).toFixed(1) + "%";
        while (cell.firstChild) span.appendChild(cell.firstChild);
        cell.appendChild(span);
      }
    });
  }

  function init(doc) {
    if (!doc || !doc.body || doc.__vfInit) return;
    doc.__vfInit = true;
    if (!doc.querySelector("p.cp, p.cph, p.vs")) return;
    var timer = null, again = function () { clearTimeout(timer); timer = setTimeout(function () { fit(doc); }, 120); };
    fit(doc);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fit(doc); });
    doc.defaultView.addEventListener("load", again);
    doc.defaultView.addEventListener("resize", again);
  }

  window.SwadhyayVerseFit = { init: init, fit: fit };
})();

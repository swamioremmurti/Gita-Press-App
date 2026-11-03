/* Proofreading changes: who changed which chapter and when (chapter saves, restores, find & replace). Open to editors and admins. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var LABEL = { 'chapter.save': 'Edited', 'chapter.restore': 'Restored an older version', 'book.replace': 'Find & replace' };

  A.route('/changes', function (q, view) {
    A.setPage('Changes', 'Every proofreading change, with who made it. Open a chapter\u2019s History in the editor to see the text before each change.');
    var st = { page: 1 };
    view.innerHTML = html`<div id="ctable"></div>`.s;
    function load() {
      return A.get('/api/admin/changes' + A.qs({ page: st.page, size: 50 })).then(function (d) {
        A.q('#ctable', view).innerHTML = d.entries.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Book / chapter</th><th>Details</th></tr></thead><tbody>
          ${d.entries.map(function (e) {
            var i = e.target.lastIndexOf(' #');
            var file = i > 0 ? e.target.slice(0, i) : e.target;
            return html`<tr><td class="nowrap" title="${A.fmt.date(e.at)}">${A.fmt.ago(e.at)}</td><td>${e.who || '\u2014'}</td><td><span class="badge">${LABEL[e.action] || e.action}</span></td>
              <td class="hi" style="max-width:300px"><a href="#/editor?file=${encodeURIComponent(file)}">${e.target}</a></td><td class="muted" style="max-width:360px">${e.detail}</td></tr>`;
          })}</tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'changes' })}`.s
          : A.empty('No changes yet', 'Edits made in the chapter editor are listed here.').s;
      });
    }
    A.on(view, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    return load();
  });
})();

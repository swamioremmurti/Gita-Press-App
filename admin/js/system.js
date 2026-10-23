/* Site settings (announcement banner, backup) and the activity log. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;

  A.route('/settings', function (q, view) {
    A.setPage('Site settings', 'Announcement banner, backup and the course switch');
    return A.get('/api/admin/settings').then(function (r) {
      var a = r.settings.announcement;
      view.innerHTML = html`<div class="cols">
        <div class="stack">
          <div class="card"><div class="card-h"><h2>Announcement banner</h2></div><div class="card-b">
            <p class="hint" style="margin-bottom:12px">A line shown at the top of every page of the site. Visitors can close it for their visit. Use it for festivals, maintenance or news.</p>
            <div class="row" style="margin-bottom:14px"><label class="switch"><input type="checkbox" id="aon" ${a.enabled ? 'checked' : ''}><i></i></label><b>Show the banner</b></div>
            <div class="field"><label for="atext">Message</label><textarea id="atext" rows="2" maxlength="300" class="hi">${a.text}</textarea></div>
            <div class="grid3"><div class="field"><label for="alink">Link (optional)</label><input type="text" id="alink" value="${a.link}" placeholder="/gita or https://…"></div>
              <div class="field"><label for="altext">Link text</label><input type="text" id="altext" value="${a.linkText}" placeholder="Learn more"></div>
              <div class="field"><label for="atone">Style</label><select id="atone" style="width:100%">${[['info', 'Notice (yellow)'], ['success', 'Good news (green)'], ['warning', 'Important (red)']].map(function (o) { return html`<option value="${o[0]}" ${o[0] === a.tone ? 'selected' : ''}>${o[1]}</option>`; })}</select></div></div>
            <div class="label" style="margin-bottom:6px">Preview</div><div id="aprev" style="border-radius:8px;overflow:hidden;border:1px solid var(--line)"></div>
            <div style="margin-top:14px"><button class="btn primary" id="asave" type="button">Save banner</button></div>
          </div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h2>Gita course</h2></div><div class="card-b"><p class="small muted">Currently ${r.settings.lms.enabled ? 'open to visitors' : 'switched off'}.</p><a class="btn" style="margin-top:8px" href="#/lms?tab=settings">Course settings</a></div></div>
          <div class="card"><div class="card-h"><h2>Backup</h2></div><div class="card-b"><p class="small muted" style="margin-bottom:10px">Download a JSON copy of everything managed here: book switches and overrides, edited chapter text, categories, tags, media list, course corrections and settings. Uploaded file contents and passwords are not included.</p>
            <a class="btn" href="/api/admin/backup" download>Download backup</a></div></div>
        </div></div>`.s;
      function preview() {
        var text = A.q('#atext', view).value.trim(), tone = A.q('#atone', view).value, link = A.q('#alink', view).value.trim(), lt = A.q('#altext', view).value.trim();
        A.q('#aprev', view).innerHTML = text ? html`<div class="site-notice tone-${tone}" style="position:relative"><span>${text}</span>${link ? html` <a class="site-notice-link" href="#" onclick="return false">${lt || 'Learn more'}</a>` : ''}</div>`.s : '<div class="muted small" style="padding:12px">Nothing to show yet.</div>';
      }
      ['atext', 'alink', 'altext', 'atone'].forEach(function (id) { A.q('#' + id, view).oninput = preview; A.q('#' + id, view).onchange = preview; });
      preview();
      A.q('#asave', view).onclick = function () {
        A.put('/api/admin/settings', { announcement: { enabled: A.q('#aon', view).checked, text: A.q('#atext', view).value, link: A.q('#alink', view).value, linkText: A.q('#altext', view).value, tone: A.q('#atone', view).value } })
          .then(function () { A.toast('Banner saved. The site picks it up within a minute.', 'ok'); }).catch(A.fail);
      };
    });
  });

  A.route('/log', function (q, view) {
    A.setPage('Activity log', 'Every change made in this panel, newest first');
    var st = { q: '', page: 1 };
    view.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="gq" placeholder="Search actions, people, items…"></div><div id="gtable"></div>`.s;
    function load() {
      return A.get('/api/admin/log' + A.qs({ q: st.q, page: st.page, size: 50 })).then(function (d) {
        A.q('#gtable', view).innerHTML = d.entries.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th><th>Details</th></tr></thead><tbody>
          ${d.entries.map(function (e) { return html`<tr><td class="nowrap" title="${A.fmt.date(e.at)}">${A.fmt.ago(e.at)}</td><td>${e.who || '—'}</td><td><span class="badge">${e.action}</span></td><td class="hi" style="max-width:280px">${e.target}</td><td class="muted small hi" style="max-width:320px">${e.detail}</td></tr>`; })}
          </tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'entries' })}`.s : A.empty('No activity yet', 'Changes made in this panel are recorded here.').s;
      });
    }
    A.q('#gq', view).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
    A.on(view, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    return load();
  });
})();

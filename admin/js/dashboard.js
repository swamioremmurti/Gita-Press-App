/* Dashboard: the numbers that matter at a glance, what needs attention, and the latest admin activity. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;

  function bars(series, label) {
    var max = Math.max.apply(null, series.map(function (s) { return s.n; }).concat([1]));
    return html`<div class="bars" role="img" aria-label="${label}">${series.map(function (s) {
      return html`<span class="${s.n ? '' : 'zero'}" style="height:${Math.max(2, Math.round(s.n / max * 100))}%" title="${s.date}: ${s.n}"></span>`;
    })}</div><div class="axis"><span>${series[0].date}</span><span>${series[series.length - 1].date}</span></div>`;
  }
  A.barChart = bars;

  A.route('/', function (q, view) {
    A.setPage('Dashboard', 'How the site is doing right now');
    return A.get('/api/admin/dashboard').then(function (d) {
      var signupsTotal = d.signups.reduce(function (s, x) { return s + x.n; }, 0);
      view.innerHTML = html`
        <div class="stats">
          <a class="stat" href="#/books"><div class="n">${A.fmt.num(d.books.enabled)}</div><div class="l">Books live</div><div class="s">${d.books.disabled} disabled · ${d.books.edited} with edited text · ${d.books.created} created here</div></a>
          <a class="stat" href="#/users"><div class="n">${A.fmt.num(d.users.total)}</div><div class="l">Users</div><div class="s">${d.users.new7} new this week · ${d.users.admins} admin${d.users.admins === 1 ? '' : 's'}${d.users.suspended ? ' · ' + d.users.suspended + ' suspended' : ''}</div></a>
          <a class="stat" href="#/lms"><div class="n">${A.fmt.num(d.lms.learners)}</div><div class="l">Gita course learners</div><div class="s">${d.lms.active7} active in the last 7 days</div></a>
          <a class="stat" href="#/comments"><div class="n">${A.fmt.num(d.comments.total)}</div><div class="l">Comments</div><div class="s">${d.comments.hidden} hidden</div></a>
          <a class="stat" href="#/media"><div class="n">${A.fmt.num(d.media.files)}</div><div class="l">Media files</div><div class="s">${A.fmt.bytes(d.media.bytes)} stored</div></a>
          <a class="stat" href="#/categories"><div class="n">${d.categories}</div><div class="l">Categories</div><div class="s">${d.tags} tags</div></a>
        </div>
        ${d.needsAttention.length ? html`<div class="stack" style="margin-bottom:16px">${d.needsAttention.map(function (n) { return html`<a class="notice warn" style="display:block" href="${n.to}">${n.text} →</a>`; })}</div>` : ''}
        <div class="cols">
          <div class="stack">
            <div class="card"><div class="card-h"><h2>New users, last 30 days</h2><span class="right muted small">${signupsTotal} total</span></div><div class="card-b">${bars(d.signups, 'New users per day, last 30 days')}</div></div>
            <div class="card"><div class="card-h"><h2>Most read books</h2><span class="right muted small">${A.fmt.num(d.reading.readers)} readers tracked</span></div><div class="card-b">
              ${d.topBooks.length ? d.topBooks.map(function (b) {
                var max = d.topBooks[0].readers || 1;
                return html`<div class="hbar" style="grid-template-columns:minmax(120px,240px) 1fr 70px"><a class="hi" href="#/books?q=${encodeURIComponent(b.title)}" title="${b.title}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.title}</a><div class="track"><div class="fill" style="width:${Math.round(b.readers / max * 100)}%"></div></div><span class="muted small">${b.readers} · ${b.avg}%</span></div>`;
              }) : A.empty('No reading data yet')}
              <p class="hint" style="margin-top:6px">Readers who are signed in · average progress.</p>
            </div></div>
          </div>
          <div class="stack">
            <div class="card"><div class="card-h"><h2>Quick actions</h2></div><div class="card-b row">
              <a class="btn primary" href="#/books/new">Add a book</a><a class="btn" href="#/books">Manage books</a><a class="btn" href="#/media">Upload media</a><a class="btn" href="#/settings">Post an announcement</a></div></div>
            <div class="card"><div class="card-h"><h2>Recent admin activity</h2><a class="right small" href="#/log">All activity</a></div><div class="card-b">
              ${d.recent.length ? html`<ul class="list-plain">${d.recent.map(function (r) { return html`<li><div class="grow"><b>${r.action}</b> <span class="muted hi">${r.target}</span><div class="small muted">${r.who || 'system'} · ${A.fmt.ago(r.at)}</div></div></li>`; })}</ul>` : A.empty('Nothing yet', 'Changes made in this panel are listed here.')}
            </div></div>
            <div class="card"><div class="card-h"><h2>Server</h2></div><div class="card-b small muted">Node ${d.server.node} · database: ${d.server.database} · ${d.server.vercel ? 'running on Vercel' : 'running locally'}</div></div>
          </div>
        </div>`.s;
    });
  });
})();

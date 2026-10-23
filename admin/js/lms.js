/* Gita course (LMS): how learners are doing, individual learners, lesson text corrections, and the course switch. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var API = '/api/admin/lms';
  var TABS = [['overview', 'Overview'], ['learners', 'Learners'], ['content', 'Lesson content'], ['settings', 'Settings']];

  A.route('/lms', function (q, view) {
    var tab = TABS.some(function (t) { return t[0] === q.get('tab'); }) ? q.get('tab') : 'overview';
    A.setPage('Gita course', 'The 397-day Bhagavad Gita learning plan at /gita');
    view.innerHTML = html`<div class="tabs">${TABS.map(function (t) { return html`<a class="tab ${t[0] === tab ? 'active' : ''}" href="#/lms?tab=${t[0]}">${t[1]}</a>`; })}</div><div id="lmsbody">${A.loading()}</div>`.s;
    var body = A.q('#lmsbody', view);
    var fn = { overview: overview, learners: learners, content: content, settings: settings }[tab];
    return fn(body, q).catch(function (e) { body.innerHTML = html`<div class="notice bad">${e.message}</div>`.s; });
  });

  /* ------------------------------------------------------------ overview */
  function overview(body) {
    return A.get(API + '/overview').then(function (d) {
      var max = Math.max.apply(null, d.distribution.map(function (x) { return x.n; }).concat([1]));
      body.innerHTML = html`
        ${d.settings.enabled ? '' : html`<div class="notice warn" style="margin-bottom:14px">The course is switched off for visitors. <a href="#/lms?tab=settings">Change in Settings</a></div>`}
        <div class="stats">
          <div class="stat"><div class="n">${d.joined}</div><div class="l">Learners enrolled</div><div class="s">${d.learners} have course data · ${d.paused} paused</div></div>
          <div class="stat"><div class="n">${d.active7}</div><div class="l">Active, last 7 days</div><div class="s">${d.active30} in the last 30 days</div></div>
          <div class="stat"><div class="n">${d.avgDaysDone}</div><div class="l">Average days completed</div><div class="s">of ${d.planDays} (${d.lessonDays} lessons + ${d.revisionDays} revisions)</div></div>
          <div class="stat"><div class="n">${d.finished}</div><div class="l">Finished the course</div><div class="s">longest streak: ${d.longestStreak} days</div></div>
        </div>
        <div class="cols even">
          <div class="card"><div class="card-h"><h2>Days completed per day, last 30 days</h2></div><div class="card-b">${A.barChart(d.completionsPerDay, 'Course days completed per calendar day')}</div></div>
          <div class="card"><div class="card-h"><h2>How far learners have got</h2></div><div class="card-b">
            ${d.distribution.map(function (x) { return html`<div class="hbar"><span>${x.label}</span><div class="track"><div class="fill" style="width:${Math.round(x.n / max * 100)}%"></div></div><span class="muted small">${x.n}</span></div>`; })}
          </div></div>
        </div>`.s;
    });
  }

  /* ------------------------------------------------------------ learners */
  function learners(body, q) {
    var st = { q: '', filter: '', sort: 'recent', page: 1 };
    body.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="lq" placeholder="Search name or email…">
      <select id="lf">${[['', 'All learners'], ['active', 'Active this week'], ['inactive', 'Inactive 2+ weeks'], ['paused', 'Paused'], ['finished', 'Finished'], ['notjoined', 'Not enrolled']].map(function (o) { return html`<option value="${o[0]}">${o[1]}</option>`; })}</select>
      <select id="ls">${[['recent', 'Sort: recent activity'], ['progress', 'Sort: progress'], ['streak', 'Sort: streak'], ['name', 'Sort: name']].map(function (o) { return html`<option value="${o[0]}">${o[1]}</option>`; })}</select></div><div id="ltable"></div>`.s;
    function load() {
      var t = A.q('#ltable', body);
      return A.get(API + '/learners' + A.qs({ q: st.q, filter: st.filter, sort: st.sort, page: st.page, size: 40 })).then(function (d) {
        t.innerHTML = d.learners.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Learner</th><th>Progress</th><th>Streak</th><th>Started</th><th>Last active</th><th>Status</th><th></th></tr></thead><tbody>
          ${d.learners.map(function (l) {
            var pct = l.totalDays ? Math.round(l.daysDone / l.totalDays * 100) : 0;
            return html`<tr><td><div class="t-title">${l.name}</div><div class="t-sub">${l.email}</div></td>
              <td style="min-width:170px"><div class="hbar" style="grid-template-columns:1fr 90px;margin:0"><div class="track"><div class="fill" style="width:${pct}%"></div></div><span class="small muted">${l.daysDone}/${l.totalDays} days</span></div><div class="small muted">${l.shlokas} shlokas learned</div></td>
              <td>${l.streak ? '🔥 ' + l.streak : '—'} <span class="faint small">best ${l.bestStreak}</span></td><td class="nowrap">${l.start || '—'}</td><td class="nowrap">${A.fmt.ago(l.updatedAt)}</td>
              <td>${l.finished ? html`<span class="badge ok">Finished</span>` : l.paused ? html`<span class="badge warn">Paused</span>` : l.joined ? html`<span class="badge info">Learning</span>` : html`<span class="badge">Not enrolled</span>`}${l.suspended ? html` <span class="badge bad">Suspended</span>` : ''}</td>
              <td class="acts"><button class="btn sm" data-learner="${l.userId}">Open</button></td></tr>`;
          })}</tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'learners' })}`.s : A.empty('No learners match', 'Learners appear after they open the Gita course while signed in.').s;
      });
    }
    A.q('#lq', body).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
    A.q('#lf', body).onchange = function (e) { st.filter = e.target.value; st.page = 1; load(); };
    A.q('#ls', body).onchange = function (e) { st.sort = e.target.value; load(); };
    A.on(body, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    A.on(body, 'click', '[data-learner]', function (e, t) { learnerDialog(Number(t.getAttribute('data-learner')), load); });
    return load();
  }

  function learnerDialog(userId, refresh) {
    A.get(API + '/learners/' + userId).then(function (d) {
      var done = {}; d.done.forEach(function (x) { done[x.n] = x; });
      var s = d.summary;
      var ctl = A.modal({
        title: d.user.name, size: 'xl',
        body: html`<p class="muted" style="margin-bottom:12px">${d.user.email} · last synced ${A.fmt.date(d.updatedAt)}</p>
          <div class="stats" style="margin-bottom:12px"><div class="stat"><div class="n">${s.daysDone}<span class="muted" style="font-size:14px"> / ${s.totalDays}</span></div><div class="l">Days completed</div><div class="s">${s.shlokas} shlokas learned</div></div>
          <div class="stat"><div class="n">${s.streak}</div><div class="l">Current streak</div><div class="s">best ${s.bestStreak}</div></div>
          <div class="stat"><div class="n">${s.nextDay || '—'}</div><div class="l">Next day</div><div class="s">${s.start ? 'started ' + s.start : 'no start date'}${s.paused ? ' · paused' : ''}</div></div></div>
          ${d.pledge ? html`<p class="small" style="margin-bottom:10px">Pledge taken by <b class="hi">${d.pledge.name}</b> on ${d.pledge.at}</p>` : ''}
          <div class="label" style="margin-bottom:6px">All days <span class="hint">(green = done, round = revision day, outlined = next). Click a day to change it.</span></div>
          <div class="daygrid" id="dg">${d.plan.map(function (p) {
            return html`<i data-day="${p.n}" class="${done[p.n] ? 'done' : ''} ${p.kind === 'revise' ? 'rev' : ''} ${p.n === s.nextDay ? 'next' : ''}" title="Day ${p.n} · ${p.kind === 'revise' ? 'revision' : 'lesson'} · chapter ${p.ch}, shlokas ${p.a}–${p.b}${done[p.n] ? ' · done ' + done[p.n].date : ''}" style="cursor:pointer"></i>`;
          })}</div>
          <div class="row" style="margin-top:16px;gap:8px">
            <button class="btn sm" id="lpause" type="button">${s.paused ? 'Resume course' : 'Pause course'}</button>
            <button class="btn sm" id="lstart" type="button">Set start date…</button>
            <button class="btn sm danger right" id="lreset" type="button">Reset this learner’s course…</button></div>`,
        footer: [{ label: 'Close' }]
      });
      function act(payload, msg) {
        return A.post(API + '/learners/' + userId + '/action', payload).then(function () { A.toast(msg, 'ok'); ctl.close(); refresh(); learnerDialog(userId, refresh); });
      }
      A.on(ctl.body, 'click', '[data-day]', function (e, t) {
        var n = Number(t.getAttribute('data-day')), isDone = !!done[n];
        A.confirm({ title: isDone ? 'Mark day ' + n + ' as not done?' : 'Mark day ' + n + ' as done?', message: isDone ? 'It will count as unfinished for this learner.' : 'It will count as completed today.', ok: 'Yes, change it' }).then(function (yes) {
          if (yes) act({ action: isDone ? 'undo-day' : 'mark-day', n: n }, 'Day ' + n + ' updated').catch(A.fail);
        });
      });
      A.q('#lpause', ctl.body).onclick = function () { act({ action: s.paused ? 'resume' : 'pause' }, s.paused ? 'Course resumed' : 'Course paused').catch(A.fail); };
      A.q('#lstart', ctl.body).onclick = function () {
        A.prompt({ title: 'Start date', label: 'Date (YYYY-MM-DD)', value: s.start || '' }).then(function (v) { if (v) act({ action: 'set-start', date: v.trim() }, 'Start date set').catch(A.fail); });
      };
      A.q('#lreset', ctl.body).onclick = function () {
        A.confirm({ title: 'Reset the course for ' + d.user.name + '?', message: 'All completed days, the pledge and the start date are cleared. The learner sees the course as new on every device.', ok: 'Reset course', danger: true }).then(function (yes) {
          if (yes) act({ action: 'reset' }, 'Course reset').catch(A.fail);
        });
      };
    }).catch(A.fail);
  }

  /* ------------------------------------------------------------ lesson content */
  function content(body, q) {
    return A.get(API + '/chapters').then(function (d) {
      var ch = Number(q.get('ch')) || 0;
      body.innerHTML = html`<div class="notice info" style="margin-bottom:14px">Correct the text learners see in the Gita course: the speaker, the shloka lines and the Hindi meaning. The original data files are not touched; a correction can be removed at any time to go back to the original. Book text is edited in <a href="#/books">Books</a>.</div>
        <div class="cols" style="grid-template-columns:260px minmax(0,1fr)"><div class="card"><div class="card-h"><h2>Chapters</h2></div><div style="max-height:70vh;overflow:auto">
        ${d.chapters.map(function (c) { return html`<a class="nav-link ${c.ch === ch ? 'active' : ''}" style="border-radius:0" href="#/lms?tab=content&ch=${c.ch}"><span class="ic">${c.ch}</span><span class="hi">${c.name}</span>${c.edited ? html`<span class="count">${c.edited}</span>` : ''}</a>`; })}</div></div>
        <div id="shlokas">${ch ? A.loading() : html`<div class="empty"><b>Choose a chapter</b>to see and correct its shlokas.</div>`}</div></div>`.s;
      if (!ch) return;
      var box = A.q('#shlokas', body), list = [];
      function draw() {
        box.innerHTML = html`<div class="row" style="margin-bottom:10px"><input type="search" id="sf" placeholder="Filter by verse number or words…" style="max-width:320px"><span class="muted small">${list.length} shlokas</span></div>
          <div id="slist">${list.map(function (s, i) { return shlokaRow(s, i); })}</div>`.s;
      }
      function shlokaRow(s, i) {
        var cur = Object.assign({}, s.original, s.patch || {});
        return html`<div class="shloka" data-i="${i}"><div class="v">${s.v}</div><div class="hi"><div class="muted small">${cur.s}</div><div class="tx"><b>${(cur.t || []).join('\n')}</b></div><div class="small muted" style="margin-top:4px">${cur.m}</div>${s.patch ? html`<span class="badge warn">Corrected</span>` : ''}</div>
          <div class="acts"><button class="btn sm" data-edit="${i}">Edit</button>${s.patch ? html`<button class="btn sm ghost" data-revert="${i}">Revert</button>` : ''}</div></div>`;
      }
      return A.get(API + '/chapters/' + ch).then(function (r) {
        list = r.shlokas; draw();
        A.q('#sf', box).oninput = function (e) {
          var t = e.target.value.trim().toLowerCase();
          A.qa('.shloka', box).forEach(function (n) { n.hidden = !!t && n.textContent.toLowerCase().indexOf(t) === -1 && n.querySelector('.v').textContent !== t; });
        };
        A.on(box, 'click', '[data-edit]', function (e, t) {
          var i = Number(t.getAttribute('data-edit')), s = list[i], cur = Object.assign({}, s.original, s.patch || {});
          A.modal({
            title: 'Chapter ' + ch + ', shloka ' + s.v, size: 'wide',
            body: html`<div class="field"><label for="es">Speaker line</label><input type="text" id="es" class="hi" value="${cur.s}"></div>
              <div class="field"><label for="et">Shloka (one line per row)</label><textarea id="et" class="hi" rows="4">${(cur.t || []).join('\n')}</textarea></div>
              <div class="field"><label for="em">Meaning</label><textarea id="em" class="hi" rows="6">${cur.m}</textarea></div>
              ${s.patch ? html`<p class="hint">Original meaning: <span class="hi">${s.original.m}</span></p>` : ''}`,
            footer: [{ label: 'Cancel' }, { label: 'Save correction', kind: 'primary', onClick: function (m) {
              return A.put(API + '/shloka/' + ch + '/' + encodeURIComponent(s.v), { s: A.q('#es', m.body).value, t: A.q('#et', m.body).value, m: A.q('#em', m.body).value }).then(function () {
                A.toast('Correction saved. Learners see it on their next visit.', 'ok'); A.refresh();
              });
            } }]
          });
        });
        A.on(box, 'click', '[data-revert]', function (e, t) {
          var s = list[Number(t.getAttribute('data-revert'))];
          A.confirm({ title: 'Remove the correction?', message: 'Shloka ' + s.v + ' goes back to its original text.', ok: 'Revert', danger: true }).then(function (yes) {
            if (yes) A.del(API + '/shloka/' + ch + '/' + encodeURIComponent(s.v)).then(function () { A.toast('Reverted', 'ok'); A.refresh(); }).catch(A.fail);
          });
        });
      });
    });
  }

  /* ------------------------------------------------------------ settings */
  function settings(body) {
    return A.get('/api/admin/settings').then(function (r) {
      var s = r.settings.lms;
      body.innerHTML = html`<div class="card" style="max-width:640px"><div class="card-h"><h2>Course availability</h2></div><div class="card-b">
        <div class="row" style="margin-bottom:14px"><label class="switch"><input type="checkbox" id="lon" ${s.enabled ? 'checked' : ''}><i></i></label><div><b>The course is open to visitors</b><div class="hint">When off, the Gita card on the home page is hidden and /gita shows the message below. Learners’ progress is kept.</div></div></div>
        <div class="field"><label for="lnote">Message shown while the course is off</label><textarea id="lnote" rows="3" placeholder="The Gita course is paused for now. Please check back soon.">${s.notice}</textarea></div>
        <button class="btn primary" id="lsave" type="button">Save</button></div></div>`.s;
      A.q('#lsave', body).onclick = function () {
        A.put(API + '/settings', { enabled: A.q('#lon', body).checked, notice: A.q('#lnote', body).value }).then(function () { A.toast('Saved', 'ok'); }).catch(A.fail);
      };
    });
  }
})();

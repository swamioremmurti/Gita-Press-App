/* Users and comment moderation. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;

  /* ------------------------------------------------------------ users */
  A.route('/users', function (q, view) {
    A.setPage('Users', 'Everyone who has an account on the site');
    var st = { q: q.get('q') || '', role: '', status: '', page: 1 }, rows = [];
    view.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="uq" placeholder="Search name or email…" value="${st.q}">
      <select id="ur"><option value="">All roles</option><option value="admin">Admins</option><option value="user">Users</option></select>
      <select id="us"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div><div id="utable"></div>`.s;
    function load() {
      var t = A.q('#utable', view);
      return A.get('/api/admin/users' + A.qs({ q: st.q, role: st.role, status: st.status, page: st.page, size: 40 })).then(function (d) {
        rows = d.users;
        t.innerHTML = rows.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Last sign-in</th><th>Activity</th><th></th></tr></thead><tbody>
          ${rows.map(function (u, i) {
            return html`<tr><td><div class="row" style="flex-wrap:nowrap;gap:10px">${u.avatarUrl ? html`<img src="${u.avatarUrl}" alt="" width="32" height="32" style="border-radius:50%;flex:none" referrerpolicy="no-referrer">` : html`<span class="cover" style="width:32px;height:32px;border-radius:50%">${(u.name || '?').charAt(0).toUpperCase()}</span>`}
              <div style="min-width:0"><div class="t-title">${u.name}${u.id === A.user.id ? html` <span class="badge">You</span>` : ''}</div><div class="t-sub">${u.email}${u.google ? ' · Google' : ''}</div></div></div></td>
              <td>${u.role === 'admin' ? html`<span class="badge accent">Admin</span>` : html`<span class="badge">User</span>`} ${u.status === 'suspended' ? html`<span class="badge bad">Suspended</span>` : ''}</td>
              <td class="nowrap">${A.fmt.day(u.createdAt)}</td><td class="nowrap">${u.lastLoginAt ? A.fmt.ago(u.lastLoginAt) : '—'}</td>
              <td class="small muted">${u.reads} book${u.reads === 1 ? '' : 's'} read · ${u.comments} comment${u.comments === 1 ? '' : 's'}${u.lms ? ' · Gita course' : ''}</td>
              <td class="acts"><button class="btn sm" data-open="${i}">Manage</button></td></tr>`;
          })}</tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'users' })}`.s : A.empty('No users match').s;
      });
    }
    A.q('#uq', view).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
    A.q('#ur', view).onchange = function (e) { st.role = e.target.value; st.page = 1; load(); };
    A.q('#us', view).onchange = function (e) { st.status = e.target.value; st.page = 1; load(); };
    A.on(view, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    A.on(view, 'click', '[data-open]', function (e, t) { userDialog(rows[Number(t.getAttribute('data-open'))], load); });
    return load();
  });

  function userDialog(u, refresh) {
    A.get('/api/admin/users/' + u.id).then(function (d) {
      var me = d.user.id === A.user.id;
      var ctl = A.modal({
        title: d.user.name, size: 'wide',
        body: html`<p class="muted" style="margin-bottom:12px">${d.user.email} · joined ${A.fmt.date(d.user.createdAt)} · ${d.activeSessions} active sign-in${d.activeSessions === 1 ? '' : 's'}</p>
          <div class="row" style="margin-bottom:16px;gap:8px">
            <button class="btn sm" id="urole" type="button" ${me ? 'disabled title="You cannot change your own role"' : ''}>${d.user.role === 'admin' ? 'Remove admin access' : 'Make admin'}</button>
            <button class="btn sm" id="ustat" type="button" ${me ? 'disabled' : ''}>${d.user.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}</button>
            <button class="btn sm" id="uout" type="button">Sign out everywhere</button>
            <button class="btn sm" id="uname" type="button">Rename</button>
            <button class="btn sm danger right" id="udel" type="button" ${me ? 'disabled' : ''}>Delete account…</button></div>
          <div class="cols even"><div><h3 style="margin-bottom:6px">Reading</h3>${d.progress.length ? html`<ul class="list-plain">${d.progress.slice(0, 10).map(function (p) { return html`<li><span class="grow hi">${p.title}</span><span class="muted small">${p.pct}% · ${A.fmt.ago(p.at)}</span></li>`; })}</ul>` : html`<p class="muted small">No reading history.</p>`}</div>
          <div><h3 style="margin-bottom:6px">Comments</h3>${d.comments.length ? html`<ul class="list-plain">${d.comments.slice(0, 8).map(function (c) { return html`<li><div class="grow"><div class="hi">${c.text}</div><div class="small muted">${c.title} · ${A.fmt.ago(c.at)} ${c.status === 'hidden' ? '· hidden' : ''}</div></div></li>`; })}</ul>` : html`<p class="muted small">No comments.</p>`}</div></div>`,
        footer: [{ label: 'Close' }]
      });
      function patch(body, msg) { return A.patch('/api/admin/users/' + d.user.id, body).then(function () { A.toast(msg, 'ok'); ctl.close(); refresh(); }).catch(A.fail); }
      A.q('#urole', ctl.body).onclick = function () {
        var toAdmin = d.user.role !== 'admin';
        A.confirm({ title: toAdmin ? 'Make ' + d.user.name + ' an admin?' : 'Remove admin access?', message: toAdmin ? 'Admins can change everything in this panel.' : 'They will no longer be able to open the admin panel.', ok: 'Yes', danger: !toAdmin }).then(function (yes) { if (yes) patch({ role: toAdmin ? 'admin' : 'user' }, 'Role updated'); });
      };
      A.q('#ustat', ctl.body).onclick = function () {
        var sus = d.user.status !== 'suspended';
        A.confirm({ title: sus ? 'Suspend this account?' : 'Reactivate this account?', message: sus ? 'They are signed out and cannot sign in until you reactivate the account. Their data is kept.' : 'They can sign in again.', ok: sus ? 'Suspend' : 'Reactivate', danger: sus }).then(function (yes) { if (yes) patch({ status: sus ? 'suspended' : 'active' }, sus ? 'Account suspended' : 'Account reactivated'); });
      };
      A.q('#uout', ctl.body).onclick = function () { A.post('/api/admin/users/' + d.user.id + '/signout').then(function () { A.toast('Signed out everywhere', 'ok'); ctl.close(); }).catch(A.fail); };
      A.q('#uname', ctl.body).onclick = function () { A.prompt({ title: 'Rename user', label: 'Name', value: d.user.name }).then(function (v) { if (v && v.trim()) patch({ name: v.trim() }, 'Name updated'); }); };
      A.q('#udel', ctl.body).onclick = function () {
        A.confirm({ title: 'Delete ' + d.user.email + '?', message: 'The account, reading history, comments and Gita course progress are removed for good.', ok: 'Delete account', danger: true }).then(function (yes) {
          if (yes) A.del('/api/admin/users/' + d.user.id).then(function () { A.toast('Account deleted', 'ok'); ctl.close(); refresh(); }).catch(A.fail);
        });
      };
    }).catch(A.fail);
  }

  /* ------------------------------------------------------------ comments */
  A.route('/comments', function (q, view) {
    A.setPage('Comments', 'Reader comments on books: hide or delete anything inappropriate');
    var st = { status: q.get('status') || '', q: '', page: 1 }, rows = [], sel = {};
    view.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="cq" placeholder="Search comments, readers or books…">
      <select id="cs"><option value="">All comments</option><option value="visible" ${st.status === 'visible' ? 'selected' : ''}>Visible</option><option value="hidden" ${st.status === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><div id="cbulk"></div><div id="ctable"></div>`.s;
    function bulk() {
      var n = Object.keys(sel).length;
      A.q('#cbulk', view).innerHTML = n ? html`<div class="bulkbar"><b>${n} selected</b><button class="btn sm" data-b="hide">Hide</button><button class="btn sm" data-b="show">Show</button><button class="btn sm danger" data-b="delete">Delete</button></div>`.s : '';
    }
    function load() {
      return A.get('/api/admin/comments' + A.qs({ q: st.q, status: st.status, page: st.page, size: 40 })).then(function (d) {
        rows = d.comments; sel = {}; bulk();
        A.q('#ctable', view).innerHTML = rows.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th style="width:30px"></th><th>Comment</th><th>Reader</th><th>Book</th><th>When</th><th></th></tr></thead><tbody>
          ${rows.map(function (c, i) {
            return html`<tr><td><input type="checkbox" data-sel="${i}" aria-label="Select"></td><td style="max-width:420px" class="hi">${c.text}${c.status === 'hidden' ? html` <span class="badge warn">Hidden</span>` : ''}</td>
              <td>${c.author}<div class="t-sub">${c.email}</div></td><td class="hi" style="max-width:200px">${c.title}</td><td class="nowrap">${A.fmt.ago(c.at)}</td>
              <td class="acts"><button class="btn sm" data-toggle="${i}">${c.status === 'hidden' ? 'Show' : 'Hide'}</button><button class="btn sm danger" data-del="${i}">Delete</button></td></tr>`;
          })}</tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'comments' })}`.s : A.empty('No comments here', 'Nothing to moderate.').s;
        A.get('/api/admin/comments?status=hidden&size=5').then(function (h) { A.counts.comments = h.total || 0; }).catch(function () {});
      });
    }
    A.q('#cq', view).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
    A.q('#cs', view).onchange = function (e) { st.status = e.target.value; st.page = 1; load(); };
    A.on(view, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    A.on(view, 'change', '[data-sel]', function (e, t) { var c = rows[Number(t.getAttribute('data-sel'))]; if (t.checked) sel[c.id] = 1; else delete sel[c.id]; bulk(); });
    A.on(view, 'click', '[data-toggle]', function (e, t) {
      var c = rows[Number(t.getAttribute('data-toggle'))];
      A.patch('/api/admin/comments/' + c.id, { status: c.status === 'hidden' ? 'visible' : 'hidden' }).then(load).catch(A.fail);
    });
    A.on(view, 'click', '[data-del]', function (e, t) {
      var c = rows[Number(t.getAttribute('data-del'))];
      A.confirm({ title: 'Delete this comment?', message: 'This cannot be undone. To keep it for review, hide it instead.', ok: 'Delete', danger: true }).then(function (yes) { if (yes) A.del('/api/admin/comments/' + c.id).then(load).catch(A.fail); });
    });
    A.on(view, 'click', '[data-b]', function (e, t) {
      var action = t.getAttribute('data-b'), ids = Object.keys(sel).map(Number);
      function run() { return A.post('/api/admin/comments/bulk', { ids: ids, action: action }).then(function () { A.toast('Done', 'ok'); load(); }).catch(A.fail); }
      if (action === 'delete') A.confirm({ title: 'Delete ' + ids.length + ' comments?', message: 'This cannot be undone.', ok: 'Delete', danger: true }).then(function (yes) { if (yes) run(); }); else run();
    });
    return load();
  });
})();
